// Quản lý nhiều khu vườn & tóm tắt điều kiện dễ đọc kèm ngày/nguồn (Mục 2 của tổng quan Mekong).
import { MAP_TEXT } from '../i18n/mapText.js'
import { geoAreaM2 } from '../logic/geometry.js'
import { DS, dsDeleteGarden, dsSaveGarden, dsSelectGarden } from '../sources/dataStore.js'

const MG = {
  formOpen: false,
  notice: null,
  layer: null,
}
const mgT = () => MAP_TEXT[S.lang].gardens
const mgSumT = () => MAP_TEXT[S.lang].summary

function mgActiveGarden() {
  if (!DS.activeGardenId) return null
  return DS.gardens.find((g) => g.id === DS.activeGardenId) ?? null
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
      Lf.polygon(g.polygon, { color: '#2c8249', weight: 2, dashArray: '4 4', fillColor: '#eef4ef', fillOpacity: 0.25 })
        .bindTooltip(esc(g.name))
        .on('click', (e) => {
          Lf.DomEvent.stopPropagation(e)
          mgSelectGarden(g.id)
        })
        .addTo(MG.layer)
    } else if (Number.isFinite(g.lat) && Number.isFinite(g.lon)) {
      Lf.circleMarker([g.lat, g.lon], { radius: 6, color: '#2c8249', weight: 2, fillColor: '#eef4ef', fillOpacity: 0.9 })
        .bindTooltip(esc(g.name))
        .on('click', (e) => {
          Lf.DomEvent.stopPropagation(e)
          mgSelectGarden(g.id)
        })
        .addTo(MG.layer)
    }
  }
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
  if (MF.map) {
    if (Array.isArray(g.polygon) && g.polygon.length >= 3) MF.map.fitBounds(g.polygon, { padding: [40, 40], maxZoom: 16 })
    else MF.map.setView([g.lat, g.lon], 13)
  }
  mfSelect({ lat: g.lat, lon: g.lon, id: g.districtId ?? undefined, name: g.districtName ?? g.name })
  mgDrawAllGardens()
}

function mgGardensBarHtml() {
  const T = mgT()
  const active = mgActiveGarden()
  const list = DS.gardens.length
    ? `<div class="mt-2.5 flex flex-wrap gap-1.5">
        ${DS.gardens
          .map((g) => {
            const on = g.id === DS.activeGardenId
            const area = g.areaHa ? ` · ${mfNum(g.areaHa, 2)} ha` : ''
            return `<button type="button" data-mg="select" data-value="${esc(g.id)}" aria-pressed="${on}" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${on ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-ground text-ink hover:border-moss-700'}">${icon('sprout', 'size-3.5')}${esc(g.name)}${esc(area)}</button>`
          })
          .join('')}
      </div>`
    : `<p class="mt-2 text-xs text-muted">${esc(T.empty)}</p>`

  const actions = MF.loc
    ? `<div class="mt-3 flex flex-wrap gap-2">
        <button type="button" data-mg="toggleForm" class="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-moss-900 px-3.5 text-xs font-bold text-white hover:bg-moss-800">${icon('save', 'size-3.5')}${active ? T.updateBtn : T.saveBtn}</button>
        ${active ? `<button type="button" data-mg="delete" data-value="${esc(active.id)}" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-bold text-clay-700 hover:border-clay-700">${icon('trash-2', 'size-3.5')}${T.deleteBtn}</button>` : ''}
      </div>`
    : ''

  let formHtml = ''
  if (MG.formOpen && MF.loc) {
    const defName = active?.name ?? MF.loc.name ?? T.defaultName(DS.gardens.length + 1)
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
          <button type="button" data-mg="closeForm" class="min-h-10 rounded-full border border-line px-4 text-xs font-bold text-ink">${MAP_TEXT[S.lang].draw.cancel}</button>
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

  return `<div class="rounded-3xl border border-line bg-white p-4 shadow-card">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-extrabold text-ink">${T.title}</p>
        <button type="button" data-mg="new" class="inline-flex min-h-9 items-center gap-1 rounded-full border border-moss-900 px-3 text-xs font-bold text-moss-900 hover:bg-moss-50">${icon('plus', 'size-3.5')}${T.addBtn}</button>
      </div>
      ${list}
      ${activeInfo}
      ${actions}
      ${MG.notice ? `<p class="mt-2 rounded-xl bg-lime-100 px-3 py-1.5 text-xs font-bold text-moss-900">${esc(MG.notice)}</p>` : ''}
      ${formHtml}
    </div>`
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
  const b = e.target.closest('[data-mg]')
  if (!b) return
  MG.notice = null
  switch (b.dataset.mg) {
    case 'new':
      DS.activeGardenId = null
      DS.field = null
      MF.loc = null
      MG.formOpen = false
      MG.notice = mgT().newHint
      MW.picking = true
      mfRenderDistrictButtons()
      mwRenderBody()
      mgDrawAllGardens()
      return
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
      if (DS.field) mfSelect({ lat: DS.field.lat, lon: DS.field.lon, id: DS.field.id ?? undefined, name: DS.field.name ?? undefined })
      else {
        MF.loc = null
        mfRenderDistrictButtons()
        mwRenderBody()
      }
      mgDrawAllGardens()
      return
  }
})

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'mg-garden-form') return
  e.preventDefault()
  if (!MF.loc) return
  const fd = new FormData(e.target)
  const poly = mfdPolygon()
  const areaHa = poly ? Math.round((geoAreaM2(poly) / 1e4) * 100) / 100 : null
  const active = mgActiveGarden()
  dsSaveGarden({
    id: active?.id,
    name: String(fd.get('name') ?? '').trim() || mgT().defaultName(DS.gardens.length + 1),
    lat: MF.loc.lat,
    lon: MF.loc.lon,
    districtId: MF.loc.id ?? null,
    districtName: MF.loc.name ?? null,
    polygon: poly ? poly.map((p) => [...p]) : null,
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
