// Nhóm vườn là nhận diện; chỉ số và cây được lưu riêng trong từng vườn con.
import { GARDEN_TEXT } from '../i18n/gardenText.js'
import { GARDEN_COLORS, GARDEN_GRADES, gmAssessGarden, gmAssessmentKey, gmColor, gmHasBoundary, gmMapPresentation, gmMapStyle, gmProfileDefaults, gmVisibleGardens } from '../logic/gardenModel.js'
import { GEO_PARAMS, geoAreaM2, geoCentroid, geoNearestPlace } from '../logic/geometry.js'
import { PROVINCES } from '../data/provinces.js'
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { ROTATIONS } from '../data/rotationCrops.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { STRAT_TEXT } from '../i18n/strategyText.js'
import { FIELD_CHANGE_ANSWERS } from '../logic/fieldStrategies.js'
import { FIELD_TEXT } from '../i18n/fieldText.js'
import { DATA_TEXT } from '../i18n/dataText.js'
import { DS, dsDeleteGarden, dsDeleteGroup, dsSave, dsSaveGarden, dsSaveGroup, dsSelectGarden } from '../sources/dataStore.js'
import { fiCheck } from '../sources/farmerInput.js'
import { powerClimate, powerReadCache, powerFetchRecord, powerWriteCache } from '../sources/power.js'
import { districtInputs } from '../logic/rotationInputs.js'
import { seasonWindows } from '../logic/rotation.js'
import { fsCalendarSource } from '../logic/fieldStrategies.js'

const MG = { formOpen: false, notice: null, layer: null, pendingPoly: null, selector: null, modal: null, returnFocus: null, collapsedGroups: new Set(), popup: null, popupGardenId: null, popupPoint: null, climate: new Map(), requests: new Map(), assessments: new Map() }
const mgT = () => GARDEN_TEXT[S.lang]
const mgActiveGarden = () => DS.gardens.find(g => g.id === DS.activeGardenId) ?? null
const mgVisible = () => gmVisibleGardens(DS.gardens, DS.gardenView)
const mgGroup = g => DS.gardenGroups.find(group => group.id === g.groupId)
const mgGroupColor = g => gmColor(mgGroup(g)?.color)
const mgClimateKey = g => `local:${g.id}:${g.lat}:${g.lon}`

function mgClearCurrent() {
  mgClosePopup()
  ++MF.seq
  Object.assign(MF, { loc: null, record: null, elevation: null, origin: null, status: 'idle', error: null, irrigation: null, season: null, sowing: null, cropQuery: null })
  MF.marker?.remove()
  MF.marker = null
  MFZ.crop = null
  mfzClearLayer()
  MFD.layers?.clearLayers()
  MW.evalResult = null
  MW.stale = false
}

function mgDeselectGarden() {
  if (mdActive()) mdSetMode('idle')
  mgClosePopup()
  DS.activeGardenId = null
  DS.field = null
  mgClearCurrent()
  dsSave()
  mwRenderBody()
  mgDrawAllGardens()
}

function mgSelectGarden(id, { fit = true } = {}) {
  // Đang sửa ranh vườn khác thì dừng sửa trước khi chọn vườn mới (S3).
  if (mdActive() && MD.gardenId !== id) mdSetMode('idle')
  const g = dsSelectGarden(id)
  if (!g) return
  const p = g.profile ?? gmProfileDefaults()
  Object.assign(MF, { irrigation: p.irrigation, season: p.season, sowing: p.sowing, cropQuery: p.cropId ? { text: CROP_LIBRARY[p.cropId].name[S.lang], known: true } : null })
  Object.assign(MFW, { ...WI_DEFAULT })
  MFZ.crop = p.cropId
  mfzClearLayer()
  Object.assign(MW, { evalResult: null, evalInputKey: null, stale: false, cropChange: p.cropChange ?? 'yes', currentId: p.currentId ?? 'A' })
  if (gmHasBoundary(g)) {
    ++MF.seq // Hủy quyền cập nhật của yêu cầu điểm/vườn cũ đang chờ.
    MF.loc={ lat:g.lat, lon:g.lon, id:g.districtId ?? undefined, name:g.name }
    mfdOnSelect(MF.loc)
    mgApplyEnvironment(g)
    mfApplyMarker()
    mfRenderDistrictButtons()
    mfRenderDynamic()
    if (fit) mgFitGardenOnMap(g)
  } else {
    mgClearCurrent()
    // mgClearCurrent chỉ dọn bản đồ; lựa chọn cây vẫn thuộc hồ sơ vườn.
    Object.assign(MF, { irrigation: p.irrigation, season: p.season, sowing: p.sowing })
    MFZ.crop = p.cropId
    mwRenderBody()
  }
  mgDrawAllGardens()
}

function mgSelectView(mode, id) {
  MG.selector = null
  mgClosePopup()
  if (mdActive()) mdSetMode('idle')
  DS.gardenView = { mode, id }
  const visible = mgVisible()
  const active = visible.find(g => g.id === DS.activeGardenId) ?? visible[0]
  DS.activeGardenId = active?.id ?? null
  if (active) mgSelectGarden(active.id, { fit: mode === 'garden' })
  else { DS.field = null; mgClearCurrent() }
  dsSave()
  mwRenderBody()
  mgDrawAllGardens()
  if (mode === 'group') mgFitVisible()
}

function mgFitGardenOnMap(g) {
  if (!MF.map || !gmHasBoundary(g)) return
  requestAnimationFrame(() => { MF.map.invalidateSize(); MF.map.fitBounds(g.polygon, { padding: [40,40], maxZoom: 17 }) })
}

function mgFitVisible() {
  // Mọi vườn có ranh vẫn hiện trên bản đồ nên khung nhìn bao hết chúng (S3).
  const pts = DS.gardens.filter(gmHasBoundary).flatMap(g => g.polygon)
  if (pts.length && MF.map) requestAnimationFrame(() => MF.map.fitBounds(pts, { padding: [40,40], maxZoom: 17 }))
}

function mgGardenClimate(g) {
  const environment=mgEnvironment(g)
  return environment.record ? powerClimate(environment.record,{origin:environment.origin}) : null
}

function mgEnvironment(g) {
  const key=mgClimateKey(g)
  let environment=MG.climate.get(key)
  if(!environment) {
    const cached=powerReadCache(g.lat,g.lon)
    const cal=fsCalendarSource({lat:g.lat,lon:g.lon,id:g.districtId},PROVINCES)
    const stored=cal.districtId ? PRECOMPUTED.power.find(d=>d.id===cal.districtId) : null
    const record=cached ?? stored?.record ?? null
    environment={record,origin:cached?'cache':stored?.record?'precomputed':null,elevation:cached?.elevation??stored?.elevation??null,status:record?'ok':'idle'}
    MG.climate.set(key,environment)
  }
  // Giữ nguyên bộ môi trường của vườn khi lưu settings hoặc đổi lựa chọn xem.
  if(!environment.record && g.profile.cropId && !MG.requests.has(key)) {
    environment.status='loading'
    const refresh=()=>{
      const current=DS.gardens.find(v=>mgClimateKey(v)===key)
      if(!current)return
      MG.assessments.delete(current.id)
      if(DS.activeGardenId===current.id)mgApplyEnvironment(current)
      if(S.page==='myfield')mfRenderDynamic() // Luôn đọc hồ sơ MỚI NHẤT, không giữ hồ sơ lúc bắt đầu request.
    }
    const request=powerFetchRecord(g.lat,g.lon).then(record=>{
      Object.assign(environment,{record,origin:'network',status:'ok'})
      powerWriteCache(record)
      refresh()
    }).catch(()=>{environment.status='failed';refresh()})
    MG.requests.set(key,request)
  }
  return environment
}

function mgApplyEnvironment(g) {
  const env=mgEnvironment(g)
  Object.assign(MF,{record:env.record,elevation:env.elevation,origin:env.origin,status:env.status,error:null})
}

function mgAssessment(g) {
  let windows = null
  if (gmHasBoundary(g)) {
    const cal = fsCalendarSource({ lat:g.lat, lon:g.lon, id:g.districtId }, PROVINCES)
    if (cal.districtId) windows = seasonWindows(districtInputs(PRECOMPUTED, cal.districtId).peakDays)
  }
  const inputs={ garden:g, climate:gmHasBoundary(g) ? mgGardenClimate(g) : null, windows, soil:DS.soil, marks:DS.marks }
  const inputKey=gmAssessmentKey(inputs)
  const cached=MG.assessments.get(g.id)
  if(cached?.inputKey===inputKey)return cached
  const result = {...gmAssessGarden(inputs),inputKey}
  MG.assessments.set(g.id, result)
  return result
}

// Đánh giá cho TOÀN BỘ vườn (không chỉ vườn đang lọc): vườn không chọn vẫn giữ màu mức phù hợp thật của nó.
function mgBuildSnapshot() { return new Map(DS.gardens.map(g=>[g.id,mgAssessment(g)])) }

// Bấm vườn trên bản đồ: chọn vườn nhưng KHÔNG ép chế độ "1 vườn" (để danh sách bên trái giữ các vườn/nhóm khác).
function mgFocusGarden(id,{fit=false}={}) {
  if(mdActive())mdSetMode('idle')
  const g=DS.gardens.find(v=>v.id===id)
  if(!g)return
  if(!mgVisible().some(v=>v.id===g.id)) DS.gardenView={mode:'group',id:'*'}
  mgSelectGarden(g.id,{fit:false})
  if(fit)mgFitGardenOnMap(g)
}

function mgClosePopup() {
  const popup=MG.popup
  MG.popup=null;MG.popupGardenId=null;MG.popupPoint=null
  popup?.remove()
}

function mgPopupHtml(g,point=null) {
  const T=mgT(), a=mgAssessment(g)
  let result=a.result, grade=a.grade, local=false
  if(point && a.zones && !a.zones.uniform) {
    const dlat=a.field.cellM/2/111320
    const dlon=dlat/Math.cos(point.lat*Math.PI/180)
    const cell=a.zones.cells.find(c=>Math.abs(c.cell.lat-point.lat)<=dlat && Math.abs(c.cell.lon-point.lng)<=dlon)
    if(cell){result=cell.result;grade=result.overall;local=true}
  }
  const limits=result?.limiting.map(k=>mfT().criteria[k]).join(', ')
  const reason=grade==='gray'?T.reasons[a.reason==='assessed'?'missingData':a.reason]:grade==='green'?T.popupGreen:limits?T.popupLimits(limits):T.reasons.assessed
  return `<div class="gm-map-summary"><strong>${esc(g.name)}</strong><div class="gm-map-crop">${esc(g.profile.cropId?CROP_LIBRARY[g.profile.cropId].name[S.lang]:T.noCrop)}</div><span class="gm-grade"><i style="background:${GARDEN_GRADES[grade]}"></i>${T.grades[grade]}</span>${local?`<small>${T.popupLocal}</small>`:''}<p>${esc(reason)}</p></div>`
}

function mgOpenPopup(id,point=null) {
  const g=DS.gardens.find(g=>g.id===id)
  if(!g || !gmHasBoundary(g) || !MF.map || mdActive())return
  mgClosePopup()
  if(!mwDesktop()){MW.sheet='peek';mwSyncSheetStyle()}
  const at=point ?? {lat:g.lat,lng:g.lon}
  const panelHeight=!mwDesktop()?$('#mw-panel')?.getBoundingClientRect().height??0:0
  const popup=window.L.popup({className:'gm-map-popup',maxWidth:mwDesktop()?290:230,minWidth:mwDesktop()?210:180,autoPanPaddingTopLeft:[16,110],autoPanPaddingBottomRight:[65,panelHeight+16]})
    .setLatLng(at).setContent(mgPopupHtml(g,at)).openOn(MF.map)
  MG.popup=popup;MG.popupGardenId=id;MG.popupPoint=at
  popup.on('remove',()=>{if(MG.popup===popup){MG.popup=null;MG.popupGardenId=null;MG.popupPoint=null}})
}

function mgMapClick(id,e) {
  window.L.DomEvent.stopPropagation(e)
  if(mdActive() || MFD.mode)return mfdMapClick(e.latlng)
  if(DS.activeGardenId!==id)mgFocusGarden(id)
  mgOpenPopup(id,e.latlng)
}


function mgDrawAllGardens(snapshot=mgBuildSnapshot()) {
  if (!MF.map || !window.L) return
  if (MG.layer && !MF.map.hasLayer(MG.layer)) MG.layer = null
  if (!MG.layer) MG.layer = window.L.layerGroup().addTo(MF.map)
  MG.layer.clearLayers()
  // Tab "Cây phù hợp" và "Chiến thuật" có lớp bản đồ riêng; vườn chỉ vẽ ở Tab 1 và Tab 3 "Chi tiết".
  if (MW.tab !== 'field' && MW.tab !== 'cond') return
  const editingId=mdActive()?MD.gardenId:null
  for (const {garden:g,focused,editing} of gmMapPresentation(DS.gardens,DS.gardenView,editingId)) {
    const color = mgGroupColor(g)
    if(editing) {
      // Bản nháp là lớp duy nhất của vườn đang sửa; khi vẽ lại từ đầu chỉ giữ viền mờ của ranh cũ để tham chiếu.
      if (MD.mode === 'draw_poly') window.L.polygon(g.polygon, { color, weight: 2, dashArray: '4 6', fill: false, interactive: false }).addTo(MG.layer)
      continue
    }
    // Luôn tô theo mức phù hợp THẬT của chính vườn đó; chỉ xám khi chính vườn thiếu cây/khí hậu/mùa vụ.
    const result = snapshot.get(g.id) ?? mgAssessment(g)
    const active = g.id === DS.activeGardenId
    // Vườn đang chọn / đang lọc chỉ khác ở độ dày viền và độ đậm, không bị mất màu (gmMapStyle, có test).
    const { grade, fillColor, weight, fillOpacity, dashArray } = gmMapStyle({ grade: result.grade, active, focused })
    const click=e=>mgMapClick(g.id,e)
    const split=Boolean(result.zones && !result.zones.uniform)
    const shape = window.L.polygon(g.polygon, { color, weight, fill:!split, fillColor, fillOpacity, dashArray })
    shape.bindTooltip(`${esc(g.name)} · ${esc(mgT().grades[grade])}`).on('click',click).addTo(MG.layer)
    const path=shape.getElement()
    if(path) {
      path.dataset.mapGarden=g.id; path.dataset.grade=grade; path.dataset.mapFocus=focused?'detail':'context'
      path.setAttribute('aria-label',`${g.name} · ${mgT().grades[grade]}`)
      path.setAttribute('role','button'); path.setAttribute('tabindex','0')
      path.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); mgFocusGarden(g.id); mgOpenPopup(g.id) } })
    }
    if (split) {
      for (const cell of result.zones.cells) {
        const poly = mgClipCell(g.polygon, cell.cell, result.field.cellM)
        if (poly.length < 3) continue
        const zoneShape=window.L.polygon(poly, { stroke:false, fillColor:GARDEN_GRADES[cell.result.overall], fillOpacity }).on('click',click).addTo(MG.layer)
        const cellPath=zoneShape.getElement()
        if(cellPath){cellPath.dataset.mapZone=g.id;cellPath.dataset.grade=cell.result.overall}
      }
      window.L.polygon(g.polygon, { color, weight, fill:false, interactive:false }).addTo(MG.layer)
    }
    if (active) {
      window.L.marker(geoCentroid(g.polygon), {
        interactive: false,
        icon: window.L.divIcon({
          className: '',
          html: '<div class="md-handle" style="width:16px;height:16px;margin:-8px 0 0 -8px"></div>',
        }),
      }).addTo(MG.layer)
    }
  }
  if(MG.popup && MG.popupGardenId===DS.activeGardenId) {
    const selected=mgActiveGarden()
    if(selected)MG.popup.setContent(mgPopupHtml(selected,MG.popupPoint))
  }
  if(mdActive())MD.layer?.eachLayer(layer=>layer.bringToFront?.())
}

// Cắt ô màu theo đúng đường bao, tránh tô vượt ra ngoài vườn.
function mgClipCell(poly, cell, size) {
  const dlat = size / 2 / 111320
  const dlon = size / 2 / (111320 * Math.cos(cell.lat * Math.PI / 180))
  let out = poly.map(p=>[...p])
  for (const [axis, bound, sign] of [[0,cell.lat-dlat,1],[0,cell.lat+dlat,-1],[1,cell.lon-dlon,1],[1,cell.lon+dlon,-1]]) {
    const input = out; out = []
    for (let i=0; i<input.length; i++) {
      const a=input[i], b=input[(i+1)%input.length]
      const ai=(a[axis]-bound)*sign >= 0, bi=(b[axis]-bound)*sign >= 0
      if (ai) out.push(a)
      if (ai !== bi) { const f=(bound-a[axis])/(b[axis]-a[axis]); out.push([a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]) }
    }
  }
  return out
}

function mgRefreshBox() {
  const el = $('#mg-gardens-box')
  if (el) { el.innerHTML = mgGardensInnerHtml(); mdUpdateLiveArea() }
}

function mgSelectorHtml() {
  const T=mgT(), view=DS.gardenView
  const selector = mode => {
    const groups=mode==='group', selected=groups?DS.gardenGroups.find(g=>g.id===view.id):DS.gardens.find(g=>g.id===view.id)
    const label=groups?T.viewGroups:T.viewGardens
    const name=view.mode===mode?(view.id==='*'?(groups?T.allGroups:T.allGardens):selected?.name):null
    const entries=groups?DS.gardenGroups:DS.gardens
    return `<div class="gm-select-wrap"><button type="button" class="gm-view-button" data-mg="selector" data-value="${mode}" aria-expanded="${MG.selector===mode}" aria-controls="gm-options-${mode}" ${view.mode===mode?'data-active="true"':''}>${icon(groups?'folder':'sprout','size-4')}<span><small>${label}</small><strong>${esc(name ?? (groups?T.pickGroup:T.pickGarden))}</strong></span>${icon('chevron-down','size-4')}</button>${MG.selector===mode?`<div class="gm-options" id="gm-options-${mode}" role="group" aria-label="${label}"><button type="button" data-mg="view" data-mode="${mode}" data-value="*">${groups?T.allGroups:T.allGardens}${view.mode===mode&&view.id==='*'?icon('check','size-4'):''}</button>${entries.map(g=>`<button type="button" data-mg="view" data-mode="${mode}" data-value="${esc(g.id)}"><i class="gm-dot" style="--group-color:${groups?gmColor(g.color):mgGroupColor(g)}"></i><span>${esc(g.name)}</span>${view.mode===mode&&view.id===g.id?icon('check','size-4'):''}</button>`).join('')}${entries.length?'':`<p>${T.noOptions}</p>`}</div>`:''}</div>`
  }
  return `<p class="gm-eyebrow">${T.viewLabel}</p><div class="gm-view-switch">${selector('group')}${selector('garden')}</div>`
}

function mgDrawingHtml() {
  if (!mdActive()) return ''
  const T=mgT()
  const editing = MD.mode === 'edit'
  const hint = editing ? T.editHint : T.drawHint
  return `<div class="gm-drawing"><strong class="gm-drawing-title">${icon('pen-line','size-4')}<span>${editing?T.editing:T.drawing} · ${esc(mgActiveGarden()?.name ?? '')}</span></strong><div class="gm-action-row"><button type="button" data-md="save" class="gm-primary">${T.saveBoundary}</button><button type="button" data-md="undo" class="gm-secondary" ${MD.history.length?'':'disabled'}>${icon('undo-2','size-4')}${T.undo}</button><button type="button" data-md="redo" class="gm-secondary" ${MD.redoStack?.length?'':'disabled'}>${icon('redo-2','size-4')}${T.redo}</button><button type="button" data-md="cancel" class="gm-secondary">${T.stopDrawing}</button>${editing&&MD.selectedIdx!==null&&MD.draft.length>3?`<button type="button" data-md="delVertex" class="gm-secondary">${icon('trash-2','size-4')}${T.deleteVertex}</button>`:''}</div><div id="mg-live-area"></div>${MD.error?`<p role="alert" class="gm-error">${esc(MD.error)}</p>`:''}<p class="gm-drawing-hint">${esc(hint)}</p></div>`
}

function mgGardensInnerHtml(snapshot=mgBuildSnapshot()) {
  const T=mgT()
  if (!DS.gardenGroups.length) return `<div class="gm-empty"><span class="gm-empty-icon">${icon('folder-plus','size-8')}</span><h2>${T.emptyTitle}</h2><p>${T.emptySub}</p><button type="button" data-mg="addGroup" class="gm-primary">${icon('plus','size-4')}${T.addGroup}</button></div>`
  const visible=mgVisible(), ids=new Set(visible.map(g=>g.groupId))
  const groups=DS.gardenGroups.filter(group=>DS.gardenView.mode==='group'?(DS.gardenView.id==='*'||group.id===DS.gardenView.id):ids.has(group.id))
  return `<div class="gm-heading"><div><h2>${T.title}</h2><p>${T.sub}</p></div><button type="button" data-mg="addGroup" class="gm-icon-button" title="${T.addGroup}" aria-label="${T.addGroup}">${icon('folder-plus','size-5')}</button></div>${mgSelectorHtml()}<p class="gm-local-note">${T.contextHint}</p>${mgDrawingHtml()}
    <div class="gm-groups">${groups.map(group=>{
      const collapsed = MG.collapsedGroups.has(group.id)
      const childrenHtml = collapsed ? '' : `<div class="gm-children">${visible.filter(g=>g.groupId===group.id).map(g=>{
        const a=snapshot.get(g.id)
        const isActive=g.id===DS.activeGardenId
        return `<div class="gm-child-wrap ${isActive?'is-active':''}"><div class="gm-child ${isActive?'is-active':''}" data-garden-id="${esc(g.id)}"><button type="button" class="gm-child-select" data-mg="select" data-value="${esc(g.id)}" aria-pressed="${isActive}"><i class="gm-dot"></i><span><strong>${esc(g.name)}</strong><small>${g.profile.cropId?esc(CROP_LIBRARY[g.profile.cropId].name[S.lang]):T.noCrop}${gmHasBoundary(g)?` · ${mfNum(g.areaHa??geoAreaM2(g.polygon)/1e4,2)} ha`:` · ${T.noBoundary}`}</small></span><i class="gm-status-dot" style="background:${GARDEN_GRADES[a.grade]}" title="${T.grades[a.grade]}"></i></button><button type="button" class="gm-icon-button" data-mg="settings" data-value="${esc(g.id)}" aria-label="${T.settings}: ${esc(g.name)}" title="${T.settings}">${icon('settings','size-4')}</button></div>${isActive?`<div class="gm-child-actions"><button type="button" data-mg="draw" data-value="${esc(g.id)}" class="gm-secondary gm-child-draw">${icon(gmHasBoundary(g)?'square-dashed':'pen-line','size-4')}${gmHasBoundary(g)?T.editBoundary:T.draw}</button></div>`:''}</div>`
      }).join('') || `<p class="gm-group-empty">${T.noChildren}</p>`}</div>`
      return `<section class="gm-group ${collapsed?'is-collapsed':''}" style="--group-color:${gmColor(group.color)}"><header><span class="gm-folder">${icon('folder-open','size-5')}</span><div><h3>${esc(group.name)}</h3><small>${T.gardenCount(DS.gardens.filter(g=>g.groupId===group.id).length)}</small></div><button type="button" data-mg="addChild" data-value="${esc(group.id)}" class="gm-icon-button" title="${T.addGarden}" aria-label="${T.addGarden}: ${esc(group.name)}">${icon('plus','size-5')}</button><button type="button" data-mg="editGroup" data-value="${esc(group.id)}" class="gm-icon-button" title="${T.editGroup}" aria-label="${T.editGroup}: ${esc(group.name)}">${icon('settings-2','size-4')}</button><button type="button" data-mg="toggleGroup" data-value="${esc(group.id)}" class="gm-icon-button gm-collapse-btn" aria-expanded="${!collapsed}" title="${T.toggleGroup}" aria-label="${T.toggleGroup}: ${esc(group.name)}">${icon('chevron-down','size-4')}</button></header>${childrenHtml}</section>`
    }).join('')}</div>${MG.notice?`<p role="status" class="gm-save-status ${DS.saved?'':'gm-error'}">${esc(MG.notice)}</p>`:''}<p class="gm-local-note">${icon('hard-drive','size-3.5')}${T.localHint}</p>`
}

function mgGardensBarHtml(snapshot=mgBuildSnapshot()) { return `<div id="mg-gardens-box" class="gm-library">${mgGardensInnerHtml(snapshot)}</div>` }

function mgExplanationHtml(g,a) {
  const T=mgT(), F=mfT()
  const env=gmHasBoundary(g)?mgEnvironment(g):null
  const status=env?.status==='loading'?`<p class="gm-help" role="status">${T.environmentPending}</p>`:env?.status==='failed'?`<button type="button" data-mg="retryEnvironment" data-value="${esc(g.id)}" class="gm-secondary gm-wide">${T.retryEnvironment}</button>`:''
  if(!a.result)return status
  const labels={water:'deficitNormal',cycle:'windowDays',waterlogging:'wetSeason',salinity:'salinityField',temperature:'tempSeason',ph:'phField'}
  return `${status}<details class="gm-explanation"><summary>${T.whyZone}</summary><p>${T.zoneBasis}</p><ul>${a.result.criteria.map(c=>{
    const value=c.evidence.find(v=>v.label===labels[c.key])
    return `<li data-zone-criterion="${c.key}"><div><strong>${F.criteria[c.key]}</strong><span data-criterion-grade="${c.grade}" style="color:${GARDEN_GRADES[c.grade]}">${T.grades[c.grade]}</span></div>${value?`<div class="gm-criterion-value">${showValue(value,{digits:mfDigits(value)})}</div>`:''}</li>`
  }).join('')}</ul><p>${T.stableResult}</p></details>`
}

function mgWorkspaceHtml() {
  const T=mgT()
  const snapshot=mgBuildSnapshot()
  let html=mgGardensBarHtml(snapshot)
  if (DS.gardenGroups.length) html+=`<div class="gm-legend"><p class="gm-eyebrow">${T.mapLegend}</p><p>${T.boundaryColor}</p><p>${T.fillColor}</p><div class="gm-legend-grades">${Object.entries(T.grades).map(([grade,label])=>`<span><i style="background:${GARDEN_GRADES[grade]}"></i>${label}</span>`).join('')}</div><p class="gm-source">${T.sameClimate}</p><p class="gm-source">${T.advisory}</p></div>`
  mgDrawAllGardens(snapshot)
  return html
}

function mgNextGroupName(excludeId = null) {
  const base = mgT().groupDefault
  let n = 1
  while (DS.gardenGroups.some(g => g.id !== excludeId && g.name === `${base} ${n}`)) n++
  return `${base} ${n}`
}

function mgNextGardenName(groupId, excludeId = null) {
  const base = mgT().gardenDefault
  let n = 1
  while (DS.gardens.some(g => g.id !== excludeId && g.groupId === groupId && g.name === `${base} ${n}`)) n++
  return `${base} ${n}`
}

function mgOpenDialog(kind,id=null) {
  MG.returnFocus=document.activeElement
  MG.modal={kind,id}
  MG.selector=null
  let dialog=$('#mg-dialog')
  if (!dialog) { dialog=document.createElement('dialog'); dialog.id='mg-dialog'; dialog.className='gm-dialog'; document.body.appendChild(dialog) }
  const T=mgT(), g=DS.gardens.find(g=>g.id===id), group=DS.gardenGroups.find(g=>g.id===id)
  const close=`<button type="button" data-mg="closeDialog" class="gm-icon-button" aria-label="${T.close}">${icon('x','size-5')}</button>`
  if (kind==='group') {
    const defGroup=mgNextGroupName(group?.id??null)
    dialog.innerHTML=`<form id="gm-group-form"><header><h2>${group?T.editGroup:T.addGroup}</h2>${close}</header><div class="gm-dialog-content"><label for="gm-group-name">${T.groupName}</label><input id="gm-group-name" name="name" maxlength="80" value="${esc(group?.name??defGroup)}" placeholder="${esc(defGroup)}" autofocus><p id="gm-name-error" role="alert" class="gm-field-error"></p><label for="gm-group-color">${T.groupColor}</label><div class="gm-color-row"><input id="gm-group-color" name="color" type="color" value="${gmColor(group?.color??GARDEN_COLORS[DS.gardenGroups.length%GARDEN_COLORS.length])}" aria-label="${T.groupColor}">${GARDEN_COLORS.map(c=>`<button type="button" class="gm-swatch" style="background:${c}" data-mg="color" data-value="${c}" aria-label="${c}"></button>`).join('')}</div><p class="gm-help">${T.groupColorHint}</p><p id="gm-form-error" role="alert" class="gm-error"></p>${group?`<button type="button" data-mg="deleteGroup" data-value="${esc(group.id)}" class="gm-delete-link">${icon('trash-2','size-4')}${T.deleteGroup}</button>`:''}</div><footer><button type="button" data-mg="closeDialog" class="gm-secondary">${T.cancel}</button><button type="submit" class="gm-primary">${T.save}</button></footer></form>`
  } else if (kind==='deleteGroup' && group) {
    dialog.innerHTML=`<form id="gm-delete-group-form"><header><h2>${esc(T.deleteGroupTitle(group.name||mgNextGroupName(group.id)))}</h2>${close}</header><div class="gm-dialog-content"><p class="gm-delete-note">${esc(T.deleteGroupText)}</p></div><footer><button type="button" data-mg="editGroup" data-value="${esc(group.id)}" class="gm-secondary" autofocus>${T.deleteGroupBack}</button><button type="submit" class="gm-danger">${T.deleteGroupConfirm}</button></footer></form>`
  } else if (kind==='delete' && g) {
    dialog.innerHTML=`<form id="gm-delete-form"><header><h2>${esc(T.deleteTitle(g.name||mgNextGardenName(g.groupId,g.id)))}</h2>${close}</header><div class="gm-dialog-content"><p class="gm-delete-note">${esc(T.deleteText)}</p></div><footer><button type="button" data-mg="settings" data-value="${esc(g.id)}" class="gm-secondary" autofocus>${T.deleteGroupBack}</button><button type="submit" class="gm-danger">${T.confirmDelete}</button></footer></form>`
  } else if (g) {
    const p=g.profile, F=FIELD_TEXT[S.lang], soil=DATA_TEXT[S.lang].soilForm
    const defGarden=mgNextGardenName(g.groupId,g.id)
    const select=(id,label,opts,value,empty=null)=>`<label for="gm-${id}">${label}</label><select id="gm-${id}" name="${id}">${empty?`<option value="">${empty}</option>`:''}${Object.entries(opts).map(([k,v])=>`<option value="${esc(k)}" ${String(value)===String(k)?'selected':''}>${esc(v)}</option>`).join('')}</select>`
    const input=(id,label,type,value,attrs='')=>`<div><label for="gm-${id}">${label}</label><input id="gm-${id}" name="${id}" type="${type}" value="${esc(value??'')}" ${attrs}></div>`
    dialog.innerHTML=`<form id="gm-settings-form"><header><div><p class="gm-eyebrow">${esc(mgGroup(g)?.name??'')}</p><h2>${T.settings}</h2></div>${close}</header><div class="gm-dialog-content"><label for="gm-name">${T.gardenName}</label><input id="gm-name" name="name" maxlength="80" value="${esc(g.name||defGarden)}" placeholder="${esc(defGarden)}" autofocus><p id="gm-name-error" role="alert" class="gm-field-error"></p>${select('groupId',T.group,Object.fromEntries(DS.gardenGroups.map(v=>[v.id,v.name])),g.groupId)}${select('cropId',T.crop,Object.fromEntries(CROP_LIB_IDS.map(c=>[c,CROP_LIBRARY[c].name[S.lang]])),p.cropId,T.noCrop)}<div class="gm-form-grid"><div>${select('season',T.season,F.seasons,p.season,T.noSeason)}</div><div>${select('sowing',T.sowing,Object.fromEntries(F.months.map((m,i)=>[i+1,m])),p.sowing,T.noSowing)}</div></div>${select('irrigation',T.irrigation,F.irrigation,p.irrigation,T.unknown)}${select('cropChange',MAP_TEXT[S.lang].cond.cropChangeQ,Object.fromEntries(FIELD_CHANGE_ANSWERS.map(a=>[a,MAP_TEXT[S.lang].cond.cropChange[a]])),p.cropChange,T.unknown)}${select('currentId',STRAT_TEXT[S.lang].currentLabel,Object.fromEntries(ROTATIONS.map(r=>[r.id,`${r.id} · ${r.crops.map(c=>CROP_LIBRARY[c]?.name[S.lang]??c).join(' – ')}`])),p.currentId,T.unknown)}<hr><h3>${T.soilSection}</h3><p class="gm-help">${T.soilNote}</p><div class="gm-form-grid">${input('ph',T.ph,'number',p.ph,'min="0" max="14" step="any"')}${input('ec',T.ec,'number',p.ec,'min="0" step="any"')}</div>${select('ecType',T.ecType,soil.ecTypes,p.ecType)}<div class="gm-form-grid">${input('om',T.om,'number',p.om,'min="0" max="100" step="any"')}${input('measuredAt',T.measuredAt,'date',p.measuredAt)}</div>${select('soilType',T.soilType,soil.soilTypes,p.soilType)}<p class="gm-help">${T.unusedSoilHint}</p><label for="gm-notes">${T.notes}</label><textarea id="gm-notes" name="notes" rows="3" maxlength="2000" placeholder="${T.notesPlaceholder}">${esc(p.notes)}</textarea><p id="gm-form-error" role="alert" class="gm-error"></p><button type="button" data-mg="delete" data-value="${esc(g.id)}" class="gm-delete-link">${icon('trash-2','size-4')}${T.delete}</button></div><footer><button type="button" data-mg="closeDialog" class="gm-secondary">${T.cancel}</button><button type="submit" class="gm-primary">${T.save}</button></footer></form>`
  }
  dialog.onclose=()=>{ MG.modal=null; MG.returnFocus?.isConnected&&MG.returnFocus.focus() }
  if (!dialog.open) dialog.showModal()
  else dialog.querySelector('[autofocus]')?.focus()
}

function mgCloseNameModal() { $('#mg-dialog')?.close(); MG.pendingPoly=null }
function mgRenderNameModal() { /* Hook cũ: việc đặt tên nay nằm trong cài đặt vườn. */ }
function mgOpenNameModal(poly) { mgCommitBoundary(poly) }

function mgCommitBoundary(poly) {
  // Lưu đúng vườn đang sửa (MD.gardenId), không phải vườn vừa được bấm chọn sau đó.
  const g=DS.gardens.find(v=>v.id===(MD.gardenId??DS.activeGardenId)) ?? mgActiveGarden()
  if (!g) return false
  const [lat,lon]=geoCentroid(poly)
  // Chỉ gán huyện khi vườn nằm trong bán kính lịch vụ: vườn ở xa không được mượn nhầm lịch của huyện gần nhất.
  const near=geoNearestPlace([lat,lon],PROVINCES,GEO_PARAMS.districtRadiusKm)
  const place=PROVINCES.find(p=>p.id===near?.id)
  const entry=dsSaveGarden({ ...g, lat, lon, districtId:place?.id??null, districtName:place?.name??null, polygon:poly.map(p=>[...p]), areaM2:geoAreaM2(poly), areaHa:geoAreaM2(poly)/1e4 })
  mdSetMode('idle')
  MG.notice=DS.saved?mgT().localSave:mgT().saveFailed
  mgSelectGarden(entry.id,{fit:false})
  return true
}

function mgConditionSummaryHtml() { return '' }

function mgRestoreSelection() {
  const active=mgActiveGarden()
  if (active && (!MF.loc || !gmHasBoundary(active) || MF.loc.lat!==active.lat || MF.loc.lon!==active.lon)) mgSelectGarden(active.id,{fit:false})
  mgDrawAllGardens()
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-mg]')
  if (!b) { if (MG.selector && !e.target.closest('.gm-select-wrap')) { MG.selector=null; mgRefreshBox() } return }
  const id=b.dataset.value
  switch(b.dataset.mg) {
    case 'addGroup': return mgOpenDialog('group')
    case 'editGroup': return mgOpenDialog('group',id)
    case 'deleteGroup': return mgOpenDialog('deleteGroup',id)
    case 'toggleGroup':
      if (MG.collapsedGroups.has(id)) MG.collapsedGroups.delete(id)
      else MG.collapsedGroups.add(id)
      return mgRefreshBox()
    case 'color': $('#gm-group-color').value=id; return
    case 'closeDialog': return mgCloseNameModal()
    case 'selector': MG.selector=MG.selector===id?null:id; return mgRefreshBox()
    case 'view': return mgSelectView(b.dataset.mode,id)
    case 'select':
      if(mdActive()) mdSetMode('idle')
      if (DS.activeGardenId === id) return mgDeselectGarden()
      mgClosePopup()
      return mgSelectGarden(id,{fit:true})
    case 'settings': return mgOpenDialog('garden',id)
    case 'retryEnvironment': {
      const garden=DS.gardens.find(g=>g.id===id)
      if(!garden)return
      const key=mgClimateKey(garden)
      MG.requests.delete(key);MG.climate.delete(key);MG.assessments.delete(id)
      return mgSelectGarden(id,{fit:false})
    }
    case 'delete': return mgOpenDialog('delete',id)
    case 'draw': {
      if (DS.activeGardenId!==id) mgSelectGarden(id,{fit:false})
      MFD.mode=null; MW.picking=false
      if (!mwDesktop()) MW.sheet='peek'
      mdSetMode(gmHasBoundary(mgActiveGarden())?'edit':'draw_poly')
      mwRenderBody()
      $('#mg-gardens-box .gm-drawing')?.scrollIntoView({ block: 'nearest' })
      return
    }
    case 'addChild': {
      if (!DS.gardenGroups.some(g=>g.id===id)) return
      MG.collapsedGroups.delete(id)
      const g=dsSaveGarden({ groupId:id, name:mgNextGardenName(id), lat:null, lon:null, polygon:null, profile:gmProfileDefaults() })
      if (DS.gardenView.mode!=='group' || (DS.gardenView.id!=='*' && DS.gardenView.id!==id)) DS.gardenView={mode:'group',id}
      MG.notice=DS.saved?mgT().localSave:mgT().saveFailed
      dsSave(); mgSelectGarden(g.id)
      MFD.mode=null; MW.picking=false
      if (!mwDesktop()) MW.sheet='peek'
      mdSetMode('draw_poly')
      mwRenderBody()
      $('#mg-gardens-box .gm-drawing')?.scrollIntoView({ block: 'nearest' })
      return
    }
  }
})

document.addEventListener('change',e=>{
  const id=e.target.dataset.gmCrop
  if (!id) return
  const g=DS.gardens.find(g=>g.id===id)
  if (!g) return
  const cropId=CROP_LIBRARY[e.target.value]?e.target.value:null
  dsSaveGarden({ ...g, profile:{...g.profile,cropId} })
  MG.notice=DS.saved?mgT().localSave:mgT().saveFailed
  mgSelectGarden(id,{fit:false})
})

// Các điều khiển mùa vụ/tưới ở tab Điều kiện cũng cập nhật đúng hồ sơ đang chọn.
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-mf], [data-mw]')
  if(!b) return
  const key=b.dataset.mf ?? b.dataset.mw
  if(!['season','sowing','irrigation','cropChange','currentId'].includes(key)) return
  const g=mgActiveGarden()
  if(!g) return
  const value=key==='sowing'?Number(b.dataset.value):b.dataset.value
  dsSaveGarden({...g,profile:{...g.profile,[key]:value}})
})

document.addEventListener('input',e=>{
  if (e.target.id!=='gm-group-name' && e.target.id!=='gm-name') return
  const errEl=$('#gm-name-error')
  if (!errEl) return
  if (String(e.target.value??'').trim()) {
    errEl.textContent=''
    e.target.dataset.warnedEmpty=''
  } else {
    errEl.textContent=e.target.id==='gm-group-name'?mgT().invalidGroupName:mgT().invalidGardenName
  }
})

document.addEventListener('submit',e=>{
  if (!['gm-group-form','gm-settings-form','gm-delete-form','gm-delete-group-form'].includes(e.target.id)) return
  e.preventDefault()
  const modal=MG.modal
  if (!modal) return
  const T=mgT(), data=new FormData(e.target)
  const error=text=>{ const el=$('#gm-form-error'); if(el){el.textContent=text;el.tabIndex=-1;el.focus();el.scrollIntoView({block:'nearest'})} }
  if (e.target.id==='gm-delete-form') {
    dsDeleteGarden(modal.id); mgCloseNameModal()
    const next=mgVisible()[0]
    if(next) mgSelectGarden(next.id)
    else { DS.activeGardenId=null; DS.field=null; mgClearCurrent(); dsSave(); mwRenderBody(); mgDrawAllGardens() }
    return
  }
  if (e.target.id==='gm-delete-group-form') {
    MG.collapsedGroups.delete(modal.id)
    dsDeleteGroup(modal.id); mgCloseNameModal()
    const next=mgVisible()[0]
    if(next) mgSelectGarden(next.id)
    else { DS.activeGardenId=null; DS.field=null; mgClearCurrent(); dsSave(); mwRenderBody(); mgDrawAllGardens() }
    return
  }
  const rawName=String(data.get('name')??'').trim()
  const nameInput=e.target.querySelector('[name="name"]')
  const nameErrEl=$('#gm-name-error')
  const emptyMsg=e.target.id==='gm-group-form'?T.invalidGroupName:T.invalidGardenName
  if (!rawName && nameInput?.dataset.warnedEmpty!=='1') {
    if (nameInput) { nameInput.dataset.warnedEmpty='1'; nameInput.focus() }
    if (nameErrEl) nameErrEl.textContent=emptyMsg
    return
  }
  if (nameErrEl) nameErrEl.textContent=''
  if(e.target.id==='gm-group-form') {
    const name=rawName||mgNextGroupName(modal.id)
    const group=dsSaveGroup({ id:modal.id, name, color:String(data.get('color')) })
    mgCloseNameModal(); MG.notice=DS.saved?T.localSave:T.saveFailed
    return mgSelectView('group',group.id)
  }
  const g=DS.gardens.find(g=>g.id===modal.id)
  if(!g) return mgCloseNameModal()
  const groupId=String(data.get('groupId'))
  if(!DS.gardenGroups.some(group=>group.id===groupId)) return error(T.invalidGroup)
  const name=rawName||mgNextGardenName(groupId,modal.id)
  const ph=fiCheck('ph',data.get('ph')), ec=fiCheck('ec',data.get('ec')), om=fiCheck('om',data.get('om'))
  if([ph,ec,om].includes('out')) return error(T.invalidMeasure)
  const measuredAt=String(data.get('measuredAt')??'')||null
  if([ph,ec,om].some(v=>v!==null)&&!measuredAt) return error(T.invalidDate)
  const profile={ ...g.profile, cropId:String(data.get('cropId'))||null, season:String(data.get('season'))||null, sowing:Number(data.get('sowing'))||null, irrigation:String(data.get('irrigation'))||null, ph,ec,om, measuredAt, ecType:String(data.get('ecType')), soilType:String(data.get('soilType')), notes:String(data.get('notes')??'').trim(), cropChange:FIELD_CHANGE_ANSWERS.includes(String(data.get('cropChange')))?String(data.get('cropChange')):null, currentId:ROTATIONS.some(r=>r.id===String(data.get('currentId')))?String(data.get('currentId')):null }
  dsSaveGarden({ ...g,name,groupId,profile })
  MG.assessments.delete(g.id)
  if(DS.gardenView.mode==='group'&&DS.gardenView.id!=='*') DS.gardenView.id=groupId
  dsSave(); mgCloseNameModal(); MG.notice=DS.saved?T.localSave:T.saveFailed
  mgSelectGarden(g.id,{fit:false})
})
