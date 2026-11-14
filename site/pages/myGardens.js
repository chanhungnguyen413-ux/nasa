// Nhóm vườn là nhận diện; chỉ số và cây được lưu riêng trong từng vườn con.
import { GARDEN_TEXT } from '../i18n/gardenText.js'
import { GARDEN_COLORS, GARDEN_GRADES, gmAssessGarden, gmAssessmentKey, gmColor, gmHasBoundary, gmProfileDefaults, gmVisibleGardens } from '../logic/gardenModel.js'
import { GEO_PARAMS, geoAreaM2, geoCentroid, geoNearestPlace } from '../logic/geometry.js'
import { PROVINCES } from '../data/provinces.js'
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { DS, dsDeleteGarden, dsSave, dsSaveGarden, dsSaveGroup, dsSelectGarden } from '../sources/dataStore.js'
import { fiCheck } from '../sources/farmerInput.js'
import { powerClimate, powerReadCache, powerFetchRecord, powerWriteCache } from '../sources/power.js'
import { districtInputs } from '../logic/rotationInputs.js'
import { seasonWindows } from '../logic/rotation.js'
import { fsCalendarSource } from '../logic/fieldStrategies.js'

const MG = { formOpen: false, notice: null, layer: null, pendingPoly: null, selector: null, modal: null, returnFocus: null, climate: new Map(), requests: new Map(), assessments: new Map() }
const mgT = () => GARDEN_TEXT[S.lang]
const mgActiveGarden = () => DS.gardens.find(g => g.id === DS.activeGardenId) ?? null
const mgVisible = () => gmVisibleGardens(DS.gardens, DS.gardenView)
const mgGroup = g => DS.gardenGroups.find(group => group.id === g.groupId)
const mgGroupColor = g => gmColor(mgGroup(g)?.color)
const mgClimateKey = g => `${typeof auStorageKey==='function'?auStorageKey():'local'}:${g.id}:${g.lat}:${g.lon}`

function mgClearCurrent() {
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

function mgSelectGarden(id, { fit = true } = {}) {
  const g = dsSelectGarden(id)
  if (!g) return
  const p = g.profile ?? gmProfileDefaults()
  Object.assign(MF, { irrigation: p.irrigation, season: p.season, sowing: p.sowing, cropQuery: p.cropId ? { text: CROP_LIBRARY[p.cropId].name[S.lang], known: true } : null })
  Object.assign(MFW, { ...WI_DEFAULT })
  MFZ.crop = p.cropId
  mfzClearLayer()
  Object.assign(MW, { evalResult: null, evalInputKey: null, stale: false, cropChange: p.cropChange, currentId: p.currentId ?? 'A' })
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
  const pts = mgVisible().filter(gmHasBoundary).flatMap(g => g.polygon)
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

function mgBuildSnapshot() { return new Map(mgVisible().map(g=>[g.id,mgAssessment(g)])) }

function mgDrawAllGardens(snapshot=mgBuildSnapshot()) {
  if (!MF.map || !window.L) return
  if (MG.layer && !MF.map.hasLayer(MG.layer)) MG.layer = null
  if (!MG.layer) MG.layer = window.L.layerGroup().addTo(MF.map)
  MG.layer.clearLayers()
  // Tab tìm vùng cho cây có lớp bản đồ riêng; không trộn hai loại kết quả.
  if (MW.tab !== 'field') return
  for (const g of mgVisible().filter(gmHasBoundary)) {
    const result = snapshot.get(g.id)
    const active = g.id === DS.activeGardenId
    const color = mgGroupColor(g)
    const click = e => {
      window.L.DomEvent.stopPropagation(e)
      if (mdActive() || MFD.mode) return mfdMapClick(e.latlng)
      mgSelectGarden(g.id, { fit:false })
    }
    const split=Boolean(result.zones && !result.zones.uniform)
    const shape = window.L.polygon(g.polygon, { color, weight:active ? 4 : 2.5, fill:!split, fillColor:GARDEN_GRADES[result.grade], fillOpacity:.55, dashArray:result.grade === 'gray' ? '6 4' : null })
    shape.bindTooltip(`${esc(g.name)} · ${esc(mgT().grades[result.grade])}`).on('click',click).addTo(MG.layer)
    const path=shape.getElement()
    if(path) {
      path.dataset.mapGarden=g.id; path.dataset.grade=result.grade
      path.setAttribute('aria-label',`${g.name} · ${mgT().grades[result.grade]}`)
      path.setAttribute('role','button'); path.setAttribute('tabindex','0')
      path.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); mgSelectGarden(g.id,{fit:false}) } })
    }
    if (split) {
      for (const cell of result.zones.cells) {
        const poly = mgClipCell(g.polygon, cell.cell, result.field.cellM)
        if (poly.length < 3) continue
        const zoneShape=window.L.polygon(poly, { stroke:false, fillColor:GARDEN_GRADES[cell.result.overall], fillOpacity:.55 }).on('click',click).addTo(MG.layer)
        const cellPath=zoneShape.getElement()
        if(cellPath){cellPath.dataset.mapZone=g.id;cellPath.dataset.grade=cell.result.overall}
      }
      window.L.polygon(g.polygon, { color, weight:active ? 4 : 2.5, fill:false, interactive:false }).addTo(MG.layer)
    }
  }
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
  return `<div class="gm-drawing"><strong>${icon('pen-line','size-4')}${T.drawing} · ${esc(mgActiveGarden()?.name ?? '')}</strong><p>${T.drawHint}</p><p id="mg-live-area"></p>${MD.error?`<p role="alert" class="gm-error">${esc(MD.error)}</p>`:''}<div class="gm-action-row"><button type="button" data-md="save" class="gm-primary">${T.saveBoundary}</button><button type="button" data-md="undo" class="gm-secondary" ${MD.history.length?'':'disabled'}>${icon('undo-2','size-4')}${T.undo}</button><button type="button" data-md="cancel" class="gm-secondary">${T.stopDrawing}</button></div></div>`
}

function mgGardensInnerHtml(snapshot=mgBuildSnapshot()) {
  const T=mgT()
  if (!DS.gardenGroups.length) return `<div class="gm-empty"><span class="gm-empty-icon">${icon('folder-plus','size-8')}</span><h2>${T.emptyTitle}</h2><p>${T.emptySub}</p><button type="button" data-mg="addGroup" class="gm-primary">${icon('plus','size-4')}${T.addGroup}</button></div>`
  const visible=mgVisible(), ids=new Set(visible.map(g=>g.groupId))
  const groups=DS.gardenGroups.filter(group=>DS.gardenView.mode==='group'?(DS.gardenView.id==='*'||group.id===DS.gardenView.id):ids.has(group.id))
  return `<div class="gm-heading"><div><h2>${T.title}</h2><p>${T.sub}</p></div><button type="button" data-mg="addGroup" class="gm-icon-button" title="${T.addGroup}" aria-label="${T.addGroup}">${icon('folder-plus','size-5')}</button></div>${mgSelectorHtml()}
    <div class="gm-groups">${groups.map(group=>`<section class="gm-group" style="--group-color:${gmColor(group.color)}"><header><span class="gm-folder">${icon('folder-open','size-5')}</span><div><h3>${esc(group.name)}</h3><small>${T.gardenCount(DS.gardens.filter(g=>g.groupId===group.id).length)}</small></div><button type="button" data-mg="addChild" data-value="${esc(group.id)}" class="gm-icon-button" title="${T.addGarden}" aria-label="${T.addGarden}: ${esc(group.name)}">${icon('plus','size-5')}</button><button type="button" data-mg="editGroup" data-value="${esc(group.id)}" class="gm-icon-button" title="${T.editGroup}" aria-label="${T.editGroup}: ${esc(group.name)}">${icon('settings-2','size-4')}</button></header><div class="gm-children">${visible.filter(g=>g.groupId===group.id).map(g=>{
      const a=snapshot.get(g.id)
      return `<div class="gm-child ${g.id===DS.activeGardenId?'is-active':''}" data-garden-id="${esc(g.id)}"><button type="button" class="gm-child-select" data-mg="select" data-value="${esc(g.id)}" aria-pressed="${g.id===DS.activeGardenId}"><i class="gm-dot"></i><span><strong>${esc(g.name)}</strong><small>${g.profile.cropId?esc(CROP_LIBRARY[g.profile.cropId].name[S.lang]):T.noCrop}${gmHasBoundary(g)?` · ${mfNum(g.areaHa??geoAreaM2(g.polygon)/1e4,2)} ha`:` · ${T.noBoundary}`}</small></span><i class="gm-status-dot" style="background:${GARDEN_GRADES[a.grade]}" title="${T.grades[a.grade]}"></i></button><button type="button" class="gm-icon-button" data-mg="settings" data-value="${esc(g.id)}" aria-label="${T.settings}: ${esc(g.name)}" title="${T.settings}">${icon('settings','size-4')}</button></div>`
    }).join('') || `<p class="gm-group-empty">${T.noChildren}</p>`}</div></section>`).join('')}</div>${mgDrawingHtml()}${MG.notice?`<p role="status" class="gm-save-status ${DS.saved?'':'gm-error'}">${esc(MG.notice)}</p>`:''}<p class="gm-local-note">${icon('hard-drive','size-3.5')}${T.localHint}</p>`
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
  const T=mgT(), g=mgActiveGarden()
  const snapshot=mgBuildSnapshot()
  let html=mgGardensBarHtml(snapshot)
  if (g && mgVisible().some(v=>v.id===g.id)) {
    const a=snapshot.get(g.id)
    html+=`<section class="gm-detail"><p class="gm-eyebrow">${T.activeGarden}</p><div class="gm-detail-title"><h3>${esc(g.name)}</h3><button type="button" data-mg="settings" data-value="${esc(g.id)}" class="gm-icon-button" aria-label="${T.settings}">${icon('settings','size-5')}</button></div><label for="gm-active-crop">${T.crop}</label><select id="gm-active-crop" data-gm-crop="${esc(g.id)}"><option value="">${T.noCrop}</option>${CROP_LIB_IDS.map(c=>`<option value="${c}" ${g.profile.cropId===c?'selected':''}>${esc(CROP_LIBRARY[c].name[S.lang])}</option>`).join('')}</select><div class="gm-assessment" data-grade="${a.grade}" data-reason="${a.reason}"><span class="gm-grade"><i style="background:${GARDEN_GRADES[a.grade]}"></i>${T.grades[a.grade]}</span><p>${T.reasons[a.reason]}</p></div>${mgExplanationHtml(g,a)}<button type="button" data-mg="draw" data-value="${esc(g.id)}" class="gm-secondary gm-wide">${icon(gmHasBoundary(g)?'square-dashed':'pen-line','size-4')}${gmHasBoundary(g)?T.editBoundary:T.draw}</button>${gmHasBoundary(g)?`<p class="gm-source">${T.dataSource}</p>`:''}</section>`
  }
  if (DS.gardenGroups.length) html+=`<div class="gm-legend"><p class="gm-eyebrow">${T.mapLegend}</p><p>${T.boundaryColor}</p><p>${T.fillColor}</p><div>${Object.entries(T.grades).map(([grade,label])=>`<span><i style="background:${GARDEN_GRADES[grade]}"></i>${label}</span>`).join('')}</div><p class="gm-source">${T.sameClimate}</p><p class="gm-source">${T.advisory}</p></div>`
  mgDrawAllGardens(snapshot)
  return html
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
    dialog.innerHTML=`<form id="gm-group-form"><header><h2>${group?T.editGroup:T.addGroup}</h2>${close}</header><div class="gm-dialog-content"><label for="gm-group-name">${T.groupName}</label><input id="gm-group-name" name="name" required maxlength="80" value="${esc(group?.name??'')}" placeholder="${T.groupPlaceholder}" autofocus><label for="gm-group-color">${T.groupColor}</label><div class="gm-color-row"><input id="gm-group-color" name="color" type="color" value="${gmColor(group?.color??GARDEN_COLORS[DS.gardenGroups.length%GARDEN_COLORS.length])}" aria-label="${T.groupColor}">${GARDEN_COLORS.map(c=>`<button type="button" class="gm-swatch" style="background:${c}" data-mg="color" data-value="${c}" aria-label="${c}"></button>`).join('')}</div><p class="gm-help">${T.groupColorHint}</p><p id="gm-form-error" role="alert" class="gm-error"></p></div><footer><button type="button" data-mg="closeDialog" class="gm-secondary">${T.cancel}</button><button type="submit" class="gm-primary">${T.save}</button></footer></form>`
  } else if (kind==='delete' && g) {
    dialog.innerHTML=`<form id="gm-delete-form"><header><h2>${T.deleteTitle}</h2>${close}</header><div class="gm-dialog-content"><strong>${esc(g.name)}</strong><p class="gm-help">${T.deleteText}</p></div><footer><button type="button" data-mg="closeDialog" class="gm-secondary" autofocus>${T.cancel}</button><button type="submit" class="gm-danger">${T.confirmDelete}</button></footer></form>`
  } else if (g) {
    const p=g.profile, F=FIELD_TEXT[S.lang], soil=DATA_TEXT[S.lang].soilForm
    const select=(id,label,opts,value,empty=null)=>`<label for="gm-${id}">${label}</label><select id="gm-${id}" name="${id}">${empty?`<option value="">${empty}</option>`:''}${Object.entries(opts).map(([k,v])=>`<option value="${esc(k)}" ${String(value)===String(k)?'selected':''}>${esc(v)}</option>`).join('')}</select>`
    const input=(id,label,type,value,attrs='')=>`<div><label for="gm-${id}">${label}</label><input id="gm-${id}" name="${id}" type="${type}" value="${esc(value??'')}" ${attrs}></div>`
    dialog.innerHTML=`<form id="gm-settings-form"><header><div><p class="gm-eyebrow">${esc(mgGroup(g)?.name??'')}</p><h2>${T.settings}</h2></div>${close}</header><div class="gm-dialog-content"><label for="gm-name">${T.gardenName}</label><input id="gm-name" name="name" required maxlength="80" value="${esc(g.name)}" autofocus>${select('groupId',T.group,Object.fromEntries(DS.gardenGroups.map(v=>[v.id,v.name])),g.groupId)}${select('cropId',T.crop,Object.fromEntries(CROP_LIB_IDS.map(c=>[c,CROP_LIBRARY[c].name[S.lang]])),p.cropId,T.noCrop)}<div class="gm-form-grid"><div>${select('season',T.season,F.seasons,p.season,T.noSeason)}</div><div>${select('sowing',T.sowing,Object.fromEntries(F.months.map((m,i)=>[i+1,m])),p.sowing,T.noSowing)}</div></div>${select('irrigation',T.irrigation,F.irrigation,p.irrigation,T.unknown)}<hr><h3>${T.soilSection}</h3><p class="gm-help">${T.soilNote}</p><div class="gm-form-grid">${input('ph',T.ph,'number',p.ph,'min="0" max="14" step="any"')}${input('ec',T.ec,'number',p.ec,'min="0" step="any"')}</div>${select('ecType',T.ecType,soil.ecTypes,p.ecType)}<div class="gm-form-grid">${input('om',T.om,'number',p.om,'min="0" max="100" step="any"')}${input('measuredAt',T.measuredAt,'date',p.measuredAt)}</div>${select('soilType',T.soilType,soil.soilTypes,p.soilType)}<p class="gm-help">${T.unusedSoilHint}</p><label for="gm-notes">${T.notes}</label><textarea id="gm-notes" name="notes" rows="3" maxlength="2000" placeholder="${T.notesPlaceholder}">${esc(p.notes)}</textarea><p id="gm-form-error" role="alert" class="gm-error"></p><button type="button" data-mg="delete" data-value="${esc(g.id)}" class="gm-delete-link">${icon('trash-2','size-4')}${T.delete}</button></div><footer><button type="button" data-mg="closeDialog" class="gm-secondary">${T.cancel}</button><button type="submit" class="gm-primary">${T.save}</button></footer></form>`
  }
  dialog.onclose=()=>{ MG.modal=null; MG.returnFocus?.isConnected&&MG.returnFocus.focus() }
  if (!dialog.open) dialog.showModal()
  else dialog.querySelector('[autofocus]')?.focus()
}

function mgCloseNameModal() { $('#mg-dialog')?.close(); MG.pendingPoly=null }
function mgRenderNameModal() { /* Hook cũ: việc đặt tên nay nằm trong cài đặt vườn. */ }
function mgOpenNameModal(poly) { mgCommitBoundary(poly) }

function mgCommitBoundary(poly) {
  const g=mgActiveGarden()
  if (!g) return false
  const [lat,lon]=geoCentroid(poly)
  // Chỉ gán huyện khi vườn nằm trong bán kính lịch vụ: vườn ở xa không được mượn nhầm lịch của huyện gần nhất.
  const near=geoNearestPlace([lat,lon],PROVINCES,GEO_PARAMS.districtRadiusKm)
  const place=PROVINCES.find(p=>p.id===near?.id)
  const entry=dsSaveGarden({ ...g, lat, lon, districtId:place?.id??null, districtName:place?.name??null, polygon:poly.map(p=>[...p]), areaM2:geoAreaM2(poly), areaHa:geoAreaM2(poly)/1e4 })
  mdSetMode('idle')
  MG.notice=DS.saved?mgT().localSave:mgT().saveFailed
  mgSelectGarden(entry.id)
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
    case 'color': $('#gm-group-color').value=id; return
    case 'closeDialog': return mgCloseNameModal()
    case 'selector': MG.selector=MG.selector===id?null:id; return mgRefreshBox()
    case 'view': return mgSelectView(b.dataset.mode,id)
    case 'select': if(mdActive())mdSetMode('idle'); return mgSelectGarden(id,{fit:true})
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
      return mwRenderBody()
    }
    case 'addChild': {
      if (!DS.gardenGroups.some(g=>g.id===id)) return
      let n=1
      while(DS.gardens.some(g=>g.groupId===id && g.name===`${mgT().gardenDefault} ${n}`))n++
      const g=dsSaveGarden({ groupId:id, name:`${mgT().gardenDefault} ${n}`, lat:null, lon:null, polygon:null, profile:gmProfileDefaults() })
      DS.gardenView={mode:'group',id}
      MG.notice=DS.saved?mgT().localSave:mgT().saveFailed
      dsSave(); mgSelectGarden(g.id)
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

document.addEventListener('submit',e=>{
  if (!['gm-group-form','gm-settings-form','gm-delete-form'].includes(e.target.id)) return
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
  const name=String(data.get('name')??'').trim()
  if(!name) return error(T.invalidName)
  if(e.target.id==='gm-group-form') {
    const group=dsSaveGroup({ id:modal.id, name, color:String(data.get('color')) })
    mgCloseNameModal(); MG.notice=DS.saved?T.localSave:T.saveFailed
    return mgSelectView('group',group.id)
  }
  const g=DS.gardens.find(g=>g.id===modal.id)
  if(!g) return mgCloseNameModal()
  const groupId=String(data.get('groupId'))
  if(!DS.gardenGroups.some(group=>group.id===groupId)) return error(T.invalidGroup)
  const ph=fiCheck('ph',data.get('ph')), ec=fiCheck('ec',data.get('ec')), om=fiCheck('om',data.get('om'))
  if([ph,ec,om].includes('out')) return error(T.invalidMeasure)
  const measuredAt=String(data.get('measuredAt')??'')||null
  if([ph,ec,om].some(v=>v!==null)&&!measuredAt) return error(T.invalidDate)
  const profile={ ...g.profile, cropId:String(data.get('cropId'))||null, season:String(data.get('season'))||null, sowing:Number(data.get('sowing'))||null, irrigation:String(data.get('irrigation'))||null, ph,ec,om, measuredAt, ecType:String(data.get('ecType')), soilType:String(data.get('soilType')), notes:String(data.get('notes')??'').trim() }
  dsSaveGarden({ ...g,name,groupId,profile })
  MG.assessments.delete(g.id)
  if(DS.gardenView.mode==='group'&&DS.gardenView.id!=='*') DS.gardenView.id=groupId
  dsSave(); mgCloseNameModal(); MG.notice=DS.saved?T.localSave:T.saveFailed
  mgSelectGarden(g.id,{fit:false})
})
