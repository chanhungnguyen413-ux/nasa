// Quản lý nhiều khu vườn, luồng vẽ nối điểm "Thêm khu vườn của bạn" & tóm tắt điều kiện (Mục 2 tổng quan Mekong).
import { MAP_TEXT } from '../i18n/mapText.js'
import { geoAreaM2, geoCentroid, geoNearestPlace } from '../logic/geometry.js'
import { PROVINCES } from '../data/provinces.js'
import { DS, dsDeleteGarden, dsSaveGarden, dsSelectGarden } from '../sources/dataStore.js'

const MG = {
  formOpen: false,
  notice: null,
  layer: null,
  pendingPoly: null, // đa giác chờ đặt tên trong cửa sổ "Lưu vườn"
}
const mgT = () => MAP_TEXT[S.lang].gardens
const mgSumT = () => MAP_TEXT[S.lang].summary

function mgActiveGarden() {
  if (!DS.activeGardenId) return null
  return DS.gardens.find((g) => g.id === DS.activeGardenId) ?? null
}

function mgNextGardenNumber() {
  let maxN = DS.gardens.length
  for (const g of DS.gardens) {
    const m = String(g.name ?? '').match(/(\d+)\s*$/)
    if (m) maxN = Math.max(maxN, Number(m[1]))
  }
  return maxN + 1
}

function mgRefreshBox() {
  const el = $('#mg-gardens-box')
  if (el) {
    el.innerHTML = mgGardensInnerHtml()
    if (typeof mdUpdateLiveArea === 'function') mdUpdateLiveArea()
  }
}

function mgDrawAllGardens() {
  const Lf = window.L
  if (!MF.map || !Lf) return
  if (MG.layer && !MF.map.hasLayer(MG.layer)) MG.layer = null
  if (!MG.layer) MG.layer = Lf.layerGroup().addTo(MF.map)
  MG.layer.clearLayers()
  for (const g of DS.gardens) {
    if (g.id === DS.activeGardenId) continue
    if (Array.isArray(g.polygon) && g.polygon.length >= 3) {
      Lf.polygon(g.polygon, { color: '#2c8249', weight: 2, dashArray: '4 4', fillColor: '#b8e55a', fillOpacity: 0.16 })
        .bindTooltip(esc(g.name))
        .on('click', (e) => {
          if (typeof mdActive === 'function' && mdActive()) return
          Lf.DomEvent.stopPropagation(e)
          mgSelectGarden(g.id)
        })
        .addTo(MG.layer)
    } else if (Number.isFinite(g.lat) && Number.isFinite(g.lon)) {
      Lf.circleMarker([g.lat, g.lon], { radius: 6, color: '#2c8249', weight: 2, fillColor: '#eef4ef', fillOpacity: 0.9 })
        .bindTooltip(esc(g.name))
        .on('click', (e) => {
          if (typeof mdActive === 'function' && mdActive()) return
          Lf.DomEvent.stopPropagation(e)
          mgSelectGarden(g.id)
        })
        .addTo(MG.layer)
    }
  }
}

function mgFitGardenOnMap(g) {
  const Lf = window.L
  if (!MF.map || !Lf || !g) return
  const fit = () => {
    if (!MF.map) return
    MF.map.invalidateSize()
    if (Array.isArray(g.polygon) && g.polygon.length >= 3) {
      MF.map.fitBounds(Lf.latLngBounds(g.polygon), { padding: [48, 48], maxZoom: 17 })
    } else if (Number.isFinite(g.lat) && Number.isFinite(g.lon)) {
      MF.map.setView([g.lat, g.lon], 14)
    }
  }
  requestAnimationFrame(fit)
}

function mgSelectGarden(id) {
  const g = dsSelectGarden(id)
  if (!g) return
  MG.formOpen = false
  MG.notice = null
  if (g.season) MF.season = g.season
  if (g.sowing) MF.sowing = g.sowing
  if (g.irrigation) MF.irrigation = g.irrigation
  if (g.cropChange) MW.cropChange = g.cropChange
  if (g.currentId) MW.currentId = g.currentId
  mfSelect({ lat: g.lat, lon: g.lon, id: g.districtId ?? undefined, name: g.districtName ?? g.name })
  mgFitGardenOnMap(g)
  mgDrawAllGardens()
}

function mgOpenNameModal(poly) {
  MG.pendingPoly = poly.map((p) => [...p])
  mgRenderNameModal()
}

function mgCloseNameModal() {
  MG.pendingPoly = null
  mgRenderNameModal()
}

function mgRenderNameModal() {
  if (typeof document === 'undefined') return
  let root = document.getElementById('mg-name-modal-root')
  if (!MG.pendingPoly) {
    if (root) root.innerHTML = ''
    return
  }
  if (!root) {
    root = document.createElement('div')
    root.id = 'mg-name-modal-root'
    document.body.appendChild(root)
  }
  const T = mgT()
  const DT = MAP_TEXT[S.lang].draw
  const defName = T.defaultName(mgNextGardenNumber())
  const m2 = geoAreaM2(MG.pendingPoly)
  const ha = m2 / 1e4
  root.innerHTML = `
    <div class="scrim-in fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-moss-950/60 p-4" data-mg="closeNameModal">
      <div role="dialog" aria-modal="true" aria-labelledby="mg-name-modal-title" class="panel-in w-full max-w-md rounded-[28px] bg-white p-6 shadow-lift">
        <div class="flex items-center justify-between gap-3">
          <h2 id="mg-name-modal-title" class="text-xl font-extrabold text-ink">${T.nameModalTitle}</h2>
          <button type="button" data-mg="closeNameModalBtn" aria-label="Close" class="rounded-full p-2 text-muted hover:bg-ground hover:text-ink">${icon('x', 'size-5')}</button>
        </div>
        <p class="mt-2 text-sm text-muted">${esc(T.nameModalHint)}</p>
        <p class="mt-2 rounded-xl bg-lime-100 px-3 py-2 text-xs font-bold text-moss-900">${esc(DT.liveArea(mfNum(ha, 2), mfNum(Math.round(m2))))}</p>
        <form id="mg-name-form" class="mt-4 space-y-4">
          <div>
            <label for="mg-modal-name-input" class="block text-xs font-bold text-ink">${T.nameLabel}</label>
            <input id="mg-modal-name-input" name="name" type="text" required value="${esc(defName)}" class="mt-1 min-h-11 w-full rounded-xl border border-line bg-ground px-3.5 text-sm font-bold text-ink outline-none focus:border-moss-900" />
          </div>
          <div class="flex gap-2">
            <button type="submit" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-moss-900 px-4 text-sm font-extrabold text-white hover:bg-moss-800">${icon('check', 'size-4')}${T.nameModalConfirm}</button>
            <button type="button" data-mg="closeNameModalBtn" class="min-h-11 rounded-full border border-line px-4 text-sm font-bold text-ink hover:bg-ground">${DT.stopDrawing}</button>
          </div>
        </form>
      </div>
    </div>`
  const inp = $('#mg-modal-name-input')
  if (inp) {
    inp.focus()
    inp.select()
  }
}

function mgGardensInnerHtml() {
  const T = mgT()
  const DT = MAP_TEXT[S.lang].draw
  const isDrawingPoly = typeof MD !== 'undefined' && MD.mode === 'draw_poly'

  if (isDrawingPoly) {
    const statusText = MD.closed ? DT.closedReady : `${DT.hintDrawGarden} (${DT.corners(MD.draft.length)})`
    const needZoom = !MD.closed && MF.map && MF.map.getZoom() < 14
    return `
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-extrabold text-ink">${T.addBtn}</p>
      </div>
      <p class="mt-2 text-xs font-semibold leading-relaxed text-moss-900">${esc(statusText)}</p>
      <p id="mg-live-area" class="mt-1.5 text-sm font-bold text-moss-800"></p>
      ${MD.error ? `<p class="mt-2 rounded-xl bg-clay-100 px-3 py-2 text-xs font-bold text-clay-700" role="alert">${esc(MD.error)}</p>` : ''}
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" data-md="save" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-moss-900 px-4 text-sm font-extrabold text-white hover:bg-moss-800">${icon('check', 'size-4')}${DT.saveGarden}</button>
        <button type="button" data-md="cancel" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-extrabold text-ink hover:border-clay-700 hover:text-clay-700">${icon('x', 'size-4')}${DT.stopDrawing}</button>
      </div>
      ${needZoom ? `<button type="button" data-md="zoomField" class="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-moss-900/30 bg-moss-50 px-3 text-xs font-bold text-moss-900 hover:bg-moss-100">${icon('zoom-in', 'size-3.5')}${DT.zoomField}</button>` : ''}`
  }

  const active = mgActiveGarden()
  const loggedIn = typeof AU !== 'undefined' && Boolean(AU.user)
  const list = DS.gardens.length
    ? `<div class="mt-3 flex flex-wrap gap-1.5">
        ${DS.gardens
          .map((g) => {
            const on = g.id === DS.activeGardenId
            const area = g.areaHa ? ` · ${mfNum(g.areaHa, 2)} ha` : ''
            return `<button type="button" data-mg="select" data-value="${esc(g.id)}" aria-pressed="${on}" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${on ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-ground text-ink hover:border-moss-700'}">${icon('sprout', 'size-3.5')}${esc(g.name)}${esc(area)}</button>`
          })
          .join('')}
      </div>`
    : `<p class="mt-2.5 text-xs text-muted">${esc(T.empty)}</p>`

  const actions = MF.loc
    ? `<div class="mt-3 flex flex-wrap gap-2">
        <button type="button" data-mg="toggleForm" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-moss-900 bg-white px-3.5 text-xs font-bold text-moss-900 hover:bg-moss-50">${icon('save', 'size-3.5')}${active ? T.updateBtn : T.saveBtn}</button>
        ${active ? `<button type="button" data-mg="delete" data-value="${esc(active.id)}" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-bold text-clay-700 hover:border-clay-700">${icon('trash-2', 'size-3.5')}${T.deleteBtn}</button>` : ''}
      </div>`
    : ''

  let formHtml = ''
  if (MG.formOpen && MF.loc) {
    const defName = active?.name ?? MF.loc.name ?? T.defaultName(mgNextGardenNumber())
    const soilVal = active?.soilNote ?? 'unknown'
    const waterVal = active?.waterNote ?? 'unknown'
    formHtml = `
      <form id="mg-garden-form" class="mt-3 space-y-2.5 border-t border-line pt-3">
        <div>
          <label for="mg-name" class="block text-xs font-bold text-ink">${T.nameLabel}</label>
          <input id="mg-name" name="name" type="text" required value="${esc(defName)}" placeholder="${esc(T.namePh)}" class="mt-1 min-h-10 w-full rounded-xl border border-line bg-ground px-3 text-sm font-semibold text-ink outline-none focus:border-moss-900" />
        </div>
        <div>
          <label for="mg-crop" class="block text-xs font-bold text-ink">${T.cropLabel}</label>
          <input id="mg-crop" name="currentCrop" type="text" value="${esc(active?.currentCrop ?? '')}" placeholder="${esc(T.cropPh)}" class="mt-1 min-h-10 w-full rounded-xl border border-line bg-ground px-3 text-sm font-semibold text-ink outline-none focus:border-moss-900" />
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <div>
            <label for="mg-soil" class="block text-xs font-bold text-ink">${T.soilLabel}</label>
            <select id="mg-soil" name="soilNote" class="mt-1 min-h-10 w-full rounded-xl border border-line bg-ground px-2.5 text-xs font-semibold text-ink outline-none focus:border-moss-900">
              <option value="unknown" ${soilVal === 'unknown' ? 'selected' : ''}>${T.soilOptUnknown}</option>
              <option value="alluvial" ${soilVal === 'alluvial' ? 'selected' : ''}>${T.soilOptAlluvial}</option>
              <option value="acid" ${soilVal === 'acid' ? 'selected' : ''}>${T.soilOptAcid}</option>
              <option value="saline" ${soilVal === 'saline' ? 'selected' : ''}>${T.soilOptSaline}</option>
            </select>
          </div>
          <div>
            <label for="mg-water" class="block text-xs font-bold text-ink">${T.waterLabel}</label>
            <select id="mg-water" name="waterNote" class="mt-1 min-h-10 w-full rounded-xl border border-line bg-ground px-2.5 text-xs font-semibold text-ink outline-none focus:border-moss-900">
              <option value="unknown" ${waterVal === 'unknown' ? 'selected' : ''}>${T.waterOptUnknown}</option>
              <option value="canal" ${waterVal === 'canal' ? 'selected' : ''}>${T.waterOptCanal}</option>
              <option value="pond" ${waterVal === 'pond' ? 'selected' : ''}>${T.waterOptPond}</option>
              <option value="rain" ${waterVal === 'rain' ? 'selected' : ''}>${T.waterOptRain}</option>
            </select>
          </div>
        </div>
        <div>
          <label for="mg-notes" class="block text-xs font-bold text-ink">${T.notesLabel}</label>
          <textarea id="mg-notes" name="notes" rows="2" placeholder="${esc(T.notesPh)}" class="mt-1 w-full rounded-xl border border-line bg-ground p-2.5 text-xs font-semibold text-ink outline-none focus:border-moss-900">${esc(active?.notes ?? '')}</textarea>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="min-h-10 flex-1 rounded-full bg-moss-900 px-4 text-xs font-bold text-white hover:bg-moss-800">${active ? T.updateBtn : T.saveBtn}</button>
          <button type="button" data-mg="closeForm" class="min-h-10 rounded-full border border-line px-4 text-xs font-bold text-ink">${DT.stopDrawing}</button>
        </div>
      </form>`
  }

  const activeInfo =
    active && !MG.formOpen
      ? `<div class="mt-2.5 rounded-2xl border border-line bg-ground p-3 text-xs text-ink">
          ${active.currentCrop ? `<p><span class="font-bold">${T.cropLabel}:</span> ${esc(active.currentCrop)}</p>` : ''}
          ${active.notes ? `<p class="mt-1 text-muted">${esc(active.notes)}</p>` : ''}
        </div>`
      : ''

  return `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-extrabold text-ink">${T.title}</p>
      </div>
      <button type="button" data-mg="startAdd" class="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-moss-900 px-4 text-sm font-extrabold text-white shadow-card hover:bg-moss-800">${icon('plus', 'size-4')}${T.addBtn}</button>
      ${!loggedIn ? `<p class="mt-2 text-[11px] leading-snug text-muted">${esc(T.needLoginNote)} <button type="button" data-au="openModal" class="font-bold text-moss-900 underline underline-offset-2">${MAP_TEXT[S.lang].auth.loginBtn}</button></p>` : ''}
      ${list}
      ${activeInfo}
      ${actions}
      ${MG.notice ? `<p class="mt-2 rounded-xl bg-lime-100 px-3 py-1.5 text-xs font-bold text-moss-900">${esc(MG.notice)}</p>` : ''}
      ${formHtml}`
}

function mgGardensBarHtml() {
  return `<div id="mg-gardens-box" class="rounded-3xl border border-line bg-white p-4 shadow-card">${mgGardensInnerHtml()}</div>`
}

function mgConditionSummaryHtml(data) {
  if (!data?.climate?.months?.length) return ''
  const T = mgSumT()
  const months = data.climate.months
  const targetMonths = data.window?.months?.length ? data.window.months : [1, 2, 3, 4]
  const sel = targetMonths.map((m) => months[m - 1]).filter(Boolean)
  const rains = sel.map((m) => m.rain?.value).filter(Number.isFinite)
  const temps = sel.map((m) => (Number.isFinite(m.tmax?.value) && Number.isFinite(m.tmin?.value) ? (m.tmax.value + m.tmin.value) / 2 : null)).filter(Number.isFinite)
  if (!rains.length) return ''
  const avgRain = rains.reduce((a, b) => a + b, 0) / rains.length
  const rainText = avgRain < 60 ? T.rainLow(mfNum(avgRain, 0)) : avgRain < 160 ? T.rainMid(mfNum(avgRain, 0)) : T.rainHigh(mfNum(avgRain, 0))
  const tempText = temps.length ? ` · ${T.tempSummary(mfNum(temps.reduce((a, b) => a + b, 0) / temps.length, 1))}` : ''
  const periodLabel = data.window?.months?.length ? mfMonthsText(data.window.months) : '2001–2025'
  return `<div class="mt-4 rounded-3xl border border-line bg-white p-4 shadow-card">
      <p class="text-sm font-extrabold text-ink">${T.title}</p>
      <p class="mt-1.5 text-sm font-bold text-moss-900">${esc(rainText + tempText)}</p>
      <p class="mt-1 text-xs text-muted">${esc(T.sourceNote(periodLabel))}</p>
      <p class="mt-1 text-[11px] text-muted">${esc(T.layerNote)}</p>
    </div>`
}

document.addEventListener('click', (e) => {
  if (e.target.matches('[data-mg="closeNameModal"]')) {
    return mgCloseNameModal()
  }
  const b = e.target.closest('[data-mg]')
  if (!b) return
  MG.notice = null
  switch (b.dataset.mg) {
    case 'startAdd':
      MFD.mode = null
      MG.formOpen = false
      MW.picking = false
      MW.confirmGeo = false
      mdSetMode('draw_poly', { reset: true })
      return
    case 'closeNameModalBtn':
      return mgCloseNameModal()
    case 'select':
      return mgSelectGarden(b.dataset.value)
    case 'toggleForm':
      MG.formOpen = !MG.formOpen
      return mwRenderBody()
    case 'closeForm':
      MG.formOpen = false
      return mwRenderBody()
    case 'delete':
      dsDeleteGarden(b.dataset.value)
      MG.formOpen = false
      if (DS.field) {
        mfSelect({ lat: DS.field.lat, lon: DS.field.lon, id: DS.field.id ?? undefined, name: DS.field.name ?? undefined })
        const nextG = mgActiveGarden()
        if (nextG) mgFitGardenOnMap(nextG)
      } else {
        MF.loc = null
        MF.marker?.remove()
        MF.marker = null
        mfdDrawLayers()
        mfRenderDistrictButtons()
        mwRenderBody()
      }
      mgDrawAllGardens()
      return
  }
})

document.addEventListener('submit', (e) => {
  if (e.target.id === 'mg-name-form') {
    e.preventDefault()
    const poly = MG.pendingPoly
    if (!poly || poly.length < 3) return mgCloseNameModal()
    const fd = new FormData(e.target)
    const name = String(fd.get('name') ?? '').trim() || mgT().defaultName(mgNextGardenNumber())
    const [clat, clon] = geoCentroid(poly)
    const lat = Math.round(clat * 1e6) / 1e6
    const lon = Math.round(clon * 1e6) / 1e6
    const near = geoNearestPlace([lat, lon], PROVINCES)
    const nearProv = near ? PROVINCES.find((p) => p.id === near.id) : null
    const areaM2 = Math.round(geoAreaM2(poly))
    const areaHa = Math.round((areaM2 / 1e4) * 100) / 100
    const savedPoly = poly.map((p) => [...p])

    const entry = dsSaveGarden({
      name,
      lat,
      lon,
      districtId: nearProv?.id ?? null,
      districtName: nearProv?.name ?? null,
      polygon: savedPoly,
      areaM2,
      areaHa,
      season: MF.season,
      sowing: MF.sowing,
      irrigation: MF.irrigation,
      cropChange: MW.cropChange,
      currentId: MW.currentId,
    })

    MG.pendingPoly = null
    MG.notice = mgT().savedMsg
    mgRenderNameModal()
    MD.mode = 'idle'
    MD.closed = false
    MD.draft = []
    MD.rectStart = null
    MD.cursor = null
    MD.error = null
    MF.map?.getContainer()?.classList.remove('mw-crosshair')
    MF.map?.doubleClickZoom?.enable()
    mdDrawHandles()
    mfSelect({ lat: entry.lat, lon: entry.lon, id: entry.districtId ?? undefined, name: entry.name })
    mgFitGardenOnMap(entry)
    mgDrawAllGardens()
    return
  }

  if (e.target.id !== 'mg-garden-form') return
  e.preventDefault()
  if (!MF.loc) return
  const fd = new FormData(e.target)
  const poly = mfdPolygon()
  const areaM2 = poly ? Math.round(geoAreaM2(poly)) : null
  const areaHa = poly ? Math.round((areaM2 / 1e4) * 100) / 100 : null
  const active = mgActiveGarden()
  dsSaveGarden({
    id: active?.id,
    name: String(fd.get('name') ?? '').trim() || mgT().defaultName(mgNextGardenNumber()),
    lat: MF.loc.lat,
    lon: MF.loc.lon,
    districtId: MF.loc.id ?? null,
    districtName: MF.loc.name ?? null,
    polygon: poly ? poly.map((p) => [...p]) : null,
    areaM2,
    areaHa,
    currentCrop: String(fd.get('currentCrop') ?? '').trim(),
    soilNote: String(fd.get('soilNote') ?? 'unknown'),
    waterNote: String(fd.get('waterNote') ?? 'unknown'),
    notes: String(fd.get('notes') ?? '').trim(),
    season: MF.season,
    sowing: MF.sowing,
    irrigation: MF.irrigation,
    cropChange: MW.cropChange,
    currentId: MW.currentId,
  })
  MG.formOpen = false
  MG.notice = mgT().savedMsg
  mgDrawAllGardens()
  mwRenderBody()
})
