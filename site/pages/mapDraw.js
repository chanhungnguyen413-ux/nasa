// Công cụ khoanh thửa thế hệ 2 (bước B của kế hoạch):
//   - vẽ đa giác tự do (chạm lại góc đầu tiên đang nhấp nháy để khép thửa)
//   - vẽ nhanh hình chữ nhật từ 2 góc chéo
//   - sửa ranh: kéo góc, kéo trung điểm cạnh để thêm góc, xóa góc, hoàn tác / làm lại
//   - hiện diện tích ngay khi vẽ (m², ha) và bật/tắt chiều dài cạnh (m)
//   - nhập / xuất GeoJSON chuẩn WGS84 [lon, lat]
//   - phím tắt: Enter lưu · Esc hủy · Ctrl+Z hoàn tác
// Hàm hình học thuần nằm ở site/logic/geometry.js (đã có test).
import { MAP_TEXT } from '../i18n/mapText.js'
import { DATA_TEXT } from '../i18n/dataText.js'
import { GARDEN_TEXT } from '../i18n/gardenText.js'
import { GEO_PARAMS, geoAreaM2, geoCentroid, geoEdgeLengthsM, geoFromGeoJSON, geoInsertVertex, geoMidpoints, geoMoveVertex, geoRectangle, geoRemoveVertex, geoToGeoJSON, geoValidate } from '../logic/geometry.js'
import { DS, dsSetField } from '../sources/dataStore.js'

const MD = {
  gardenId: null, // Ranh nháp luôn thuộc đúng vườn đã bắt đầu sửa.
  mode: 'idle', // 'idle' | 'draw_poly' | 'draw_rect' | 'edit'
  closed: false, // true sau khi click điểm bắt đầu để khép hình & xem diện tích trước khi Lưu
  draft: [], // mảng [lat, lon] đang vẽ hoặc sửa
  rectStart: null,
  cursor: null,
  selectedIdx: null,
  showEdges: false,
  history: [],
  redoStack: [],
  error: null,
  info: null,
  layer: null, // nhóm lớp Leaflet cho góc kéo, trung điểm, nhãn cạnh
  previewLayer: null, // đường nối nét đứt theo con trỏ (không phá góc kéo khi di chuột)
}
const mdT = () => MAP_TEXT[S.lang].draw
const mdActive = () => MD.mode !== 'idle'

function mdPushHistory() {
  MD.history.push(MD.draft.map((p) => [...p]))
  if (MD.history.length > 40) MD.history.shift()
  MD.redoStack = []
}

function mdSetMode(mode, { reset = true } = {}) {
  if (typeof mgClosePopup === 'function') mgClosePopup()
  MD.gardenId = mode === 'idle' ? null : DS.activeGardenId
  MD.mode = mode
  MD.closed = false
  MD.error = null
  MD.info = null
  MD.selectedIdx = null
  MD.rectStart = null
  MD.cursor = null
  if (reset) {
    MD.history = []
    MD.redoStack = []
    MD.draft = mode === 'edit' && mfdPolygon() ? mfdPolygon().map((p) => [...p]) : []
  }
  MF.map?.getContainer()?.classList.toggle('mw-crosshair', mode === 'draw_poly' || mode === 'draw_rect')
  if (mode === 'draw_poly' || mode === 'draw_rect') MF.map?.doubleClickZoom?.disable()
  else MF.map?.doubleClickZoom?.enable()
  mdDrawHandles()
  mdUpdateLiveArea()
  if (typeof mgDrawAllGardens === 'function') mgDrawAllGardens()
  if (typeof mgRefreshBox === 'function') mgRefreshBox()
  mfdRenderTools()
  if (typeof mgDrawAllGardens === 'function') mgDrawAllGardens()
}

function mdCloseDrawing() {
  if (MD.draft.length < 3) {
    MD.error = mdT().errTooFew
    if (typeof mgRefreshBox === 'function') mgRefreshBox()
    mfdRenderTools()
    return false
  }
  const v = geoValidate(MD.draft)
  if (!v.ok || v.areaM2 < 1) {
    MD.error =
      !v.ok && v.problem === 'selfIntersect'
        ? mdT().errSelfIntersect
        : !v.ok && v.problem === 'tooBig'
          ? mdT().errTooBig(GEO_PARAMS.maxFieldHa)
          : mdT().errTooFew
    if (typeof mgRefreshBox === 'function') mgRefreshBox()
    mfdRenderTools()
    return false
  }
  MD.closed = true
  MD.cursor = null
  MD.error = null
  MF.map?.getContainer()?.classList.remove('mw-crosshair')
  mdDrawHandles()
  mdUpdateLiveArea()
  if (typeof mgRefreshBox === 'function') mgRefreshBox()
  mfdRenderTools()
  return true
}

function mdCommit(poly, { skipNameModal = false } = {}) {
  if (MD.gardenId && MD.gardenId !== DS.activeGardenId) {
    MD.error = GARDEN_TEXT[S.lang].editWrongGarden
    if (typeof mgRefreshBox === 'function') mgRefreshBox()
    return false
  }
  const v = geoValidate(poly)
  if (!v.ok || v.areaM2 < 1) {
    MD.error =
      !v.ok && v.problem === 'selfIntersect'
        ? mdT().errSelfIntersect
        : !v.ok && v.problem === 'tooBig'
          ? mdT().errTooBig(GEO_PARAMS.maxFieldHa)
          : mdT().errTooFew
    if (typeof mgRefreshBox === 'function') mgRefreshBox()
    mfdRenderTools()
    $('#mf-tools')?.querySelector('[role="alert"]')?.scrollIntoView({ block: 'nearest' })
    return false
  }
  if (typeof mgCommitBoundary === 'function' && mgActiveGarden()) return mgCommitBoundary(poly)
  if (!skipNameModal && typeof mgOpenNameModal === 'function' && MD.mode === 'draw_poly') {
    MD.closed = true
    MD.cursor = null
    mdDrawHandles()
    mgOpenNameModal(poly.map((p) => [...p]))
    return true
  }
  const hadLoc = Boolean(MF.loc)
  const loc = MF.loc ?? (() => {
    const [lat, lon] = geoCentroid(poly)
    return { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 }
  })()
  MF.loc = loc
  const savedPoly = poly.map((p) => [...p])
  if (MD.mode === 'edit' && DS.activeGardenId && typeof dsSaveGarden === 'function') {
    const active = DS.gardens.find((g) => g.id === DS.activeGardenId)
    if (active) {
      const areaHa = Math.round((geoAreaM2(savedPoly) / 1e4) * 100) / 100
      dsSaveGarden({ ...active, polygon: savedPoly, areaHa })
    }
  } else {
    dsSetField({ ...(DS.field ?? {}), lat: loc.lat, lon: loc.lon, id: loc.id ?? null, name: loc.name ?? null, polygon: savedPoly })
  }
  MD.mode = 'idle'
  MD.closed = false
  MD.draft = []
  MD.rectStart = null
  MD.cursor = null
  MD.error = null
  MF.map?.getContainer()?.classList.remove('mw-crosshair')
  MF.map?.doubleClickZoom?.enable()
  mdDrawHandles()
  if (!hadLoc) {
    mfSelect(loc)
  } else {
    mfdDrawLayers()
    mwOnInputsChanged()
    mfRenderDynamic()
  }
  return true
}

function mdHandleMapClick(latlng) {
  if (!mdActive()) return false
  if (MD.mode === 'draw_poly' && MD.closed) return true
  const pt = [Math.round(latlng.lat * 1e6) / 1e6, Math.round(latlng.lng * 1e6) / 1e6]
  MD.error = null
  MD.info = null
  if (MD.mode === 'draw_poly') {
    if (MF.map && MD.draft.length) {
      const clickPx = MF.map.latLngToContainerPoint(latlng)
      if (MD.draft.length >= 3 && clickPx.distanceTo(MF.map.latLngToContainerPoint(MD.draft[0])) < 16) {
        return mdCloseDrawing()
      }
      const last = MD.draft[MD.draft.length - 1]
      if (clickPx.distanceTo(MF.map.latLngToContainerPoint(last)) < 4) return true
    }
    mdPushHistory()
    MD.draft.push(pt)
    mdDrawHandles()
    mdUpdateLiveArea()
    if (typeof mgRefreshBox === 'function') mgRefreshBox()
    mfdRenderTools()
    return true
  }
  if (MD.mode === 'draw_rect') {
    if (!MD.rectStart) {
      MD.rectStart = pt
      mdDrawHandles()
      if (typeof mgRefreshBox === 'function') mgRefreshBox()
      mfdRenderTools()
      return true
    }
    return mdCommit(geoRectangle(MD.rectStart, pt), { skipNameModal: true })
  }
  return true
}

function mdHandleMouseMove(latlng) {
  if ((MD.mode !== 'draw_poly' || MD.closed) && MD.mode !== 'draw_rect') return
  MD.cursor = [Math.round(latlng.lat * 1e6) / 1e6, Math.round(latlng.lng * 1e6) / 1e6]
  mdDrawPreview()
  mdUpdateLiveArea()
}

function mdLiveDraftPoly() {
  if (MD.mode === 'draw_rect' && MD.rectStart && MD.cursor) return geoRectangle(MD.rectStart, MD.cursor)
  if (MD.mode === 'draw_poly') return !MD.closed && MD.cursor ? [...MD.draft, MD.cursor] : MD.draft
  return MD.draft
}

function mdUpdateLiveArea() {
  const pts = mdLiveDraftPoly()
  const targets = [$('#md-live-area'), $('#mg-live-area')].filter(Boolean)
  if (!targets.length) return
  if (pts.length < 3) {
    targets.forEach((el) => {
      el.innerHTML = ''
      el.className = ''
    })
    return
  }
  const m2 = geoAreaM2(pts)
  const ha = m2 / 1e4
  const tooBig = ha > GEO_PARAMS.maxFieldHa
  const raw = mdT().liveArea(mfNum(ha, 2), mfNum(Math.round(m2)))
  const sepIdx = raw.indexOf(' · ')
  const mainPart = sepIdx >= 0 ? raw.slice(0, sepIdx) : raw
  const notePart = sepIdx >= 0 ? raw.slice(sepIdx + 3) : ''
  const warnPart = tooBig ? mdT().liveTooBig(GEO_PARAMS.maxFieldHa) : ''
  targets.forEach((el) => {
    el.className = 'gm-live-area-wrap'
    el.innerHTML = `<span class="gm-area-highlight ${tooBig ? 'is-too-big' : ''}">${esc(mainPart)}${warnPart ? ` <span>${esc(warnPart)}</span>` : ''}</span>${notePart ? `<span class="gm-area-muted">${esc(notePart)}</span>` : ''}`
  })
}

function mdDrawPreview() {
  const Lf = window.L
  if (!MF.map || !Lf) return
  if (MD.previewLayer && !MF.map.hasLayer(MD.previewLayer)) MD.previewLayer = null
  if (!MD.previewLayer) MD.previewLayer = Lf.layerGroup().addTo(MF.map)
  MD.previewLayer.clearLayers()
  if (MD.mode === 'draw_rect' && MD.rectStart && MD.cursor) {
    Lf.polygon(geoRectangle(MD.rectStart, MD.cursor), { color: '#0f3d24', weight: 2, dashArray: '6 6', fillColor: '#b8e55a', fillOpacity: 0.2, interactive: false }).addTo(MD.previewLayer)
  } else if (MD.mode === 'draw_poly' && !MD.closed && MD.draft.length && MD.cursor) {
    const pts = [MD.draft[MD.draft.length - 1], MD.cursor]
    if (MD.draft.length >= 2) pts.push(MD.draft[0])
    Lf.polyline(pts, { color: '#0f3d24', weight: 2, dashArray: '6 5', interactive: false }).addTo(MD.previewLayer)
  }
}

function mdDrawHandles() {
  const Lf = window.L
  if (!MF.map || !Lf) return
  if (MD.layer && !MF.map.hasLayer(MD.layer)) MD.layer = null
  if (!MD.layer) MD.layer = Lf.layerGroup().addTo(MF.map)
  MD.layer.clearLayers()
  mdDrawPreview()

  const activePts = MD.mode === 'draw_rect' && MD.rectStart ? [MD.rectStart] : MD.draft
  const polyToLabel = mdActive() ? (MD.draft.length >= 3 ? MD.draft : null) : mfdPolygon()
  if (MD.showEdges && polyToLabel && polyToLabel.length >= 3) {
    const mids = geoMidpoints(polyToLabel)
    const lens = geoEdgeLengthsM(polyToLabel)
    mids.forEach((m, i) => {
      Lf.marker(m, { interactive: false, icon: Lf.divIcon({ className: '', html: `<span class="md-edge-label">${mfNum(Math.round(lens[i]))} m</span>` }) }).addTo(MD.layer)
    })
  }

  if (!mdActive()) return
  if (MD.draft.length >= 2) {
    const showFilled = MD.mode === 'edit' || (MD.mode === 'draw_poly' && MD.closed)
    const owner = DS.gardens.find(g => g.id === MD.gardenId)
    const draftColor = owner && typeof mgGroupColor === 'function' ? mgGroupColor(owner) : '#0f3d24'
    const cls = showFilled
      ? Lf.polygon(MD.draft, { color: draftColor, weight: 3, fillColor: '#9aa59e', fillOpacity: 0.22, interactive: false })
      : Lf.polyline(MD.draft, { color: '#0f3d24', weight: 2.5, dashArray: '6 5', interactive: false })
    cls.addTo(MD.layer)
  }

  if (MD.mode === 'draw_poly') {
    activePts.forEach((pt, idx) => {
      const closeReady = idx === 0 && activePts.length >= 3 && !MD.closed
      const m = Lf.marker(pt, {
        draggable: false,
        icon: Lf.divIcon({ className: '', html: `<div class="md-handle ${closeReady ? 'md-first-pulse' : ''}" style="width:${closeReady ? 26 : 18}px;height:${closeReady ? 26 : 18}px;margin:-${closeReady ? 13 : 9}px 0 0 -${closeReady ? 13 : 9}px"></div>` }),
      })
      if (closeReady) {
        m.bindTooltip(esc(mdT().closeFirst))
        m.on('click', (e) => {
          Lf.DomEvent.stopPropagation(e)
          mdCloseDrawing()
        })
      }
      m.addTo(MD.layer)
    })
    return
  }

  if (MD.mode === 'draw_rect' && MD.rectStart) {
    Lf.marker(MD.rectStart, { interactive: false, icon: Lf.divIcon({ className: '', html: '<div class="md-handle md-first-pulse"></div>' }) }).addTo(MD.layer)
    return
  }

  if (MD.mode === 'edit') {
    // 1. Trung điểm cạnh: kéo hoặc chạm để chèn thêm góc
    geoMidpoints(MD.draft).forEach((mid, i) => {
      const mm = Lf.marker(mid, { draggable: true, icon: Lf.divIcon({ className: '', html: '<div class="md-mid"></div>' }) })
      mm.on('click', (e) => {
        Lf.DomEvent.stopPropagation(e)
        mdPushHistory()
        MD.draft = geoInsertVertex(MD.draft, i, mid)
        MD.selectedIdx = i + 1
        mdDrawHandles()
        mdUpdateLiveArea()
        if (typeof mgRefreshBox === 'function') mgRefreshBox()
        mfdRenderTools()
      })
      mm.on('dragstart', () => mdPushHistory())
      mm.on('dragend', (e) => {
        const ll = e.target.getLatLng()
        MD.draft = geoInsertVertex(MD.draft, i, [Math.round(ll.lat * 1e6) / 1e6, Math.round(ll.lng * 1e6) / 1e6])
        MD.selectedIdx = i + 1
        mdDrawHandles()
        mdUpdateLiveArea()
        if (typeof mgRefreshBox === 'function') mgRefreshBox()
        mfdRenderTools()
      })
      mm.addTo(MD.layer)
    })

    // 2. Góc chính: kéo để sửa, chạm để chọn xóa
    MD.draft.forEach((pt, idx) => {
      const sel = MD.selectedIdx === idx
      const vm = Lf.marker(pt, { draggable: true, icon: Lf.divIcon({ className: '', html: `<div class="md-handle ${sel ? 'is-selected' : ''}"></div>` }) })
      vm.on('dragstart', () => mdPushHistory())
      vm.on('drag', (e) => {
        const ll = e.target.getLatLng()
        MD.draft = geoMoveVertex(MD.draft, idx, [ll.lat, ll.lng])
        mdUpdateLiveArea()
      })
      vm.on('dragend', (e) => {
        const ll = e.target.getLatLng()
        MD.draft = geoMoveVertex(MD.draft, idx, [Math.round(ll.lat * 1e6) / 1e6, Math.round(ll.lng * 1e6) / 1e6])
        MD.selectedIdx = idx
        mdDrawHandles()
        mdUpdateLiveArea()
        if (typeof mgRefreshBox === 'function') mgRefreshBox()
        mfdRenderTools()
      })
      vm.on('click', (e) => {
        Lf.DomEvent.stopPropagation(e)
        MD.selectedIdx = sel ? null : idx
        mdDrawHandles()
        if (typeof mgRefreshBox === 'function') mgRefreshBox()
        mfdRenderTools()
      })
      vm.addTo(MD.layer)
    })
  }
}

function mdUndo() {
  if (!MD.history.length) return
  MD.redoStack.push(MD.draft.map((p) => [...p]))
  MD.draft = MD.history.pop()
  MD.closed = false
  MD.error = null
  MF.map?.getContainer()?.classList.toggle('mw-crosshair', MD.mode === 'draw_poly' || MD.mode === 'draw_rect')
  mdDrawHandles()
  mdUpdateLiveArea()
  if (typeof mgDrawAllGardens === 'function') mgDrawAllGardens()
  if (typeof mgRefreshBox === 'function') mgRefreshBox()
  mfdRenderTools()
}

function mdRedo() {
  if (!MD.redoStack.length) return
  MD.history.push(MD.draft.map((p) => [...p]))
  MD.draft = MD.redoStack.pop()
  MD.closed = false
  MD.error = null
  MF.map?.getContainer()?.classList.toggle('mw-crosshair', MD.mode === 'draw_poly' || MD.mode === 'draw_rect')
  mdDrawHandles()
  mdUpdateLiveArea()
  if (typeof mgDrawAllGardens === 'function') mgDrawAllGardens()
  if (typeof mgRefreshBox === 'function') mgRefreshBox()
  mfdRenderTools()
}

function mdExportGeoJson() {
  const poly = mfdPolygon()
  if (!poly) return
  const gj = geoToGeoJSON(poly, { name: MF.loc?.name ?? 'Mekong field', areaHa: Math.round((geoAreaM2(poly) / 1e4) * 100) / 100 })
  const blob = new Blob([JSON.stringify(gj, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mekong-field.geojson'
  a.click()
  URL.revokeObjectURL(url)
}

async function mdImportGeoJson(file) {
  const T = mdT()
  try {
    const obj = JSON.parse(await file.text())
    const poly = geoFromGeoJSON(obj)
    if (!poly) {
      MD.error = T.errGeoJson
      return mfdRenderTools()
    }
    if (mdCommit(poly)) {
      MD.info = T.importedOk
      MF.map?.fitBounds(poly, { padding: [40, 40], maxZoom: 16 })
      mfdRenderTools()
    }
  } catch {
    MD.error = T.errGeoJson
    mfdRenderTools()
  }
}

function mdToolsHtml() {
  const T = mdT()
  const DT = DATA_TEXT[S.lang].tools
  const poly = mfdPolygon()
  const field = mfdCurrentField()
  if (MD.mode === 'draw_poly') return ''
  let drawHtml = ''
  if (MD.mode === 'draw_rect' || MD.mode === 'edit') {
    const hint = MD.mode === 'draw_rect' ? T.hintRect : T.hintEdit
    const needZoom = MD.mode === 'draw_rect' && MF.map && MF.map.getZoom() < 14
    drawHtml = `
      <p class="text-[15px] font-semibold leading-snug text-moss-900">${esc(hint)}</p>
      <p id="md-live-area" class="mt-1.5 text-sm font-bold text-moss-800"></p>
      <div class="mt-2.5 flex flex-wrap gap-2">
        ${MD.mode !== 'draw_rect' ? mfPill('data-md="save"', `${icon('check', 'size-4')}${T.save}`, true) : ''}
        ${MD.history.length ? mfPill('data-md="undo"', `${icon('undo-2', 'size-4')}${T.undo}`) : ''}
        ${MD.redoStack.length ? mfPill('data-md="redo"', `${icon('redo-2', 'size-4')}${T.redo}`) : ''}
        ${MD.mode === 'edit' && MD.selectedIdx !== null && MD.draft.length > 3 ? mfPill('data-md="delVertex"', `${icon('trash-2', 'size-4')}${T.delVertex}`) : ''}
        ${needZoom ? mfPill('data-md="zoomField"', `${icon('zoom-in', 'size-4')}${T.zoomField}`) : ''}
        ${mfPill('data-md="cancel"', T.cancel)}
      </div>
      <p class="mt-2 text-xs text-muted">${T.shortcutHint}</p>`
  } else {
    drawHtml = `
      <div class="flex flex-wrap gap-2">
        ${mfPill('data-md="drawRect"', `${icon('square', 'size-4')}${T.rectBtn}`)}
        ${poly ? mfPill('data-md="edit"', `${icon('sliders-horizontal', 'size-4')}${T.editBtn}`) : ''}
        ${poly ? mfPill('data-md="clear"', `${icon('trash-2', 'size-4')}${T.clearBtn}`) : ''}
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <label class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-bold text-ink hover:border-moss-700">
          ${icon('upload', 'size-4')}${T.importBtn}
          <input type="file" accept=".geojson,.json" data-md-file="geojson" class="sr-only" />
        </label>
        ${poly ? mfPill('data-md="export"', `${icon('download', 'size-4')}${T.exportBtn}`, false, '!min-h-11 !px-4 !text-sm') : ''}
      </div>`
  }
  const area =
    poly && field && !mdActive()
      ? `<p class="mt-3 text-sm font-semibold text-moss-900">${esc(T.savedArea(mfNum(geoAreaM2(poly) / 1e4, 2), mfNum(Math.round(geoAreaM2(poly))), field.cells.length, field.cellM))}</p>`
      : ''
  const edgeToggle =
    poly || MD.draft.length >= 3
      ? `<label class="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" data-md-edges ${MD.showEdges ? 'checked' : ''} class="size-4 accent-moss-900" />${T.hintEdges}</label>`
      : ''

  const marks = FI_MARK_TYPES.map((type) => {
    const on = MFD.mode === `mark:${type}`
    return mfPill(`data-mfd="mark" data-value="${type}"`, `<span class="size-3.5 shrink-0 rounded-full ring-2 ring-white" style="background:${MFD_MARK_COLOR[type]}"></span>${DT.markTypes[type]}`, on, '!min-h-11 !px-4 !text-sm')
  }).join('')
  const user = MF.loc ? mfdCollect(null) : null
  const inField = user ? user.marks.list.length : 0

  return `<div id="md-tools" class="min-w-0 rounded-3xl border border-line bg-white p-4 shadow-card sm:p-5">
      <p class="text-base font-extrabold">${T.title}</p>
      <div class="mt-2.5">${drawHtml}${area}${edgeToggle}</div>
      ${MD.error ? `<p class="mt-2 rounded-xl bg-clay-100 px-3 py-2 text-sm font-bold text-clay-700" role="alert">${esc(MD.error)}</p>` : ''}
      ${MD.info ? `<p class="mt-2 rounded-xl bg-lime-100 px-3 py-2 text-sm font-bold text-moss-900">${esc(MD.info)}</p>` : ''}
      <div class="mt-4 border-t border-line pt-4">
        <p class="text-sm font-bold">${DT.marks}</p>
        <p class="mt-0.5 text-xs text-muted">${DT.markHint}</p>
        <div class="mt-2 flex flex-wrap gap-1.5">${marks}</div>
        ${MF.loc ? `<p class="mt-2 text-xs text-muted">${DT.markCount(inField)}${inField ? ` · <button type="button" data-mfd="clearMarks" class="font-semibold text-clay-700 underline underline-offset-2">${DT.clearMarks}</button>` : ''}</p>` : ''}
      </div>
    </div>`
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-md]')
  if (!b) return
  MD.info = null
  switch (b.dataset.md) {
    case 'drawPoly':
      MFD.mode = null
      return mdSetMode('draw_poly')
    case 'drawRect':
      MFD.mode = null
      return mdSetMode('draw_rect')
    case 'edit':
      MFD.mode = null
      return mdSetMode('edit')
    case 'save':
      return mdCommit(MD.draft)
    case 'undo':
      return mdUndo()
    case 'redo':
      return mdRedo()
    case 'delVertex':
      if (MD.selectedIdx !== null && MD.draft.length > 3) {
        mdPushHistory()
        MD.draft = geoRemoveVertex(MD.draft, MD.selectedIdx)
        MD.selectedIdx = null
        mdDrawHandles()
        mdUpdateLiveArea()
        if (typeof mgRefreshBox === 'function') mgRefreshBox()
        mfdRenderTools()
      }
      return
    case 'cancel':
      return mdSetMode('idle')
    case 'clear':
      if (DS.field) dsSetField({ ...DS.field, polygon: null })
      mdSetMode('idle')
      mfdDrawLayers()
      mwOnInputsChanged()
      return mfRenderDynamic()
    case 'export':
      return mdExportGeoJson()
    case 'zoomField':
      if (MF.map) {
        const center = MF.loc ? [MF.loc.lat, MF.loc.lon] : MF.map.getCenter()
        MF.map.setView(center, 15)
        mfdRenderTools()
      }
      return
  }
})

document.addEventListener('change', (e) => {
  if (e.target.hasAttribute('data-md-edges')) {
    MD.showEdges = e.target.checked
    mdDrawHandles()
  }
  if (e.target.dataset?.mdFile === 'geojson' && e.target.files?.[0]) {
    mdImportGeoJson(e.target.files[0])
    e.target.value = ''
  }
})

document.addEventListener('keydown', (e) => {
  if (S.page !== 'myfield') return
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
  if (e.key === 'Escape') {
    if (mdActive()) return mdSetMode('idle')
    if (MW.picking) return mwCancelPicking()
  }
  if (!mdActive()) return
  if (e.key === 'Enter' && (MD.mode === 'draw_poly' || MD.mode === 'edit')) {
    e.preventDefault()
    mdCommit(MD.draft)
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    mdUndo()
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault()
    mdRedo()
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && MD.mode === 'edit' && MD.selectedIdx !== null && MD.draft.length > 3) {
    e.preventDefault()
    mdPushHistory()
    MD.draft = geoRemoveVertex(MD.draft, MD.selectedIdx)
    MD.selectedIdx = null
    mdDrawHandles()
    mdUpdateLiveArea()
    if (typeof mgRefreshBox === 'function') mgRefreshBox()
    mfdRenderTools()
  }
})
