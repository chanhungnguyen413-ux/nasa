// Phần Phase 3 của trang "Ruộng của tôi": bản đồ vùng trồng trong thửa đã khoanh.
// Phép tính ở site/logic/zones.js (hàm thuần, có test). File này: chọn cây, tô từng ô trên bản đồ theo đèn giao thông,
// và danh sách vùng kèm lời giải thích. Lời giải thích chỉ in số qua showValue(), tức là số có trong sổ bằng chứng.
import { DATA_TEXT } from '../i18n/dataText.js'
import { P3_TEXT } from '../i18n/phase3Text.js'
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { znAssess, znRadius } from '../logic/zones.js'

const MFZ = { crop: null, focus: null, layer: null }
const mfzT = () => P3_TEXT[S.lang].zones
// Màu tô ô: dùng lại 4 trạng thái của trang (không thêm hệ màu mới).
const MFZ_FILL = { green: '#5b8c1a', yellow: '#c58a12', red: '#8f2f14', gray: '#9aa59e' }
const MFZ_M_PER_DEG = 111320

/** Gọi từ mfRenderDynamic() và khi kéo thanh trượt giả định: vẽ lại bảng vùng và lớp tô trên bản đồ. */
function mfzRefresh(data) {
  const el = $('#mf-zones')
  if (!el) return
  const field = mfdCurrentField()
  if (!data || !field || field.kind !== 'polygon') {
    mfzClearLayer()
    el.innerHTML = MF.loc ? `<p class="rounded-[28px] border border-dashed border-line bg-white p-5 text-base text-muted">${mfzT().needPolygon}</p>` : ''
    return
  }
  const X = mfzT()
  const picks = CROP_LIB_IDS.map((id) => mfPill(`data-mfz="crop" data-value="${id}"`, esc(CROP_LIBRARY[id].name[S.lang]), MFZ.crop === id)).join('')
  const off = MFZ.crop ? mfPill('data-mfz="crop" data-value=""', `${icon('eye-off', 'size-4')}${X.off}`) : ''
  let body = ''
  if (MFZ.crop) {
    const card = data.results.find((r) => r.crop === MFZ.crop)
    const z = znAssess({ crop: MFZ.crop, window: card.window, climate: data.climate, irrigation: MF.irrigation, field, soil: DS.soil, marks: DS.marks })
    mfzDrawLayer(field, z)
    body = mfzListHtml(field, z, data)
  } else mfzClearLayer()
  el.innerHTML = `<div class="rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-6">
      <p class="text-lg font-extrabold">${X.title}</p>
      <p class="mt-1 text-base text-muted">${X.pick}</p>
      <div class="mt-3 flex flex-wrap gap-2">${picks}${off}</div>
      ${body}
      <p class="mt-3 text-sm text-muted">${X.radius(znRadius(field))}</p>
    </div>`
}

function mfzListHtml(field, z, data) {
  const X = mfzT()
  const F = mfT()
  const ha = (n) => mfNum((n * field.cellM * field.cellM) / 1e4, 2)
  const explain = (zone) => {
    const r = zone.result
    const names = r.limiting.map((k) => F.criteria[k].toLowerCase()).join(', ')
    // Hạng Xanh: mọi tiêu chí chấm được đều đạt, nên không có yếu tố nào 'hạn chế'.
    const green = r.overall === 'green'
    const head = r.overall === 'gray' ? F.summary.gray(r.gradedCount, r.totalCount) : green || !names ? X.noneLimiting : X.limiting(names)
    // Chỉ giải thích các tiêu chí hạn chế, kèm số qua showValue (có trong sổ bằng chứng).
    const lines = r.criteria
      .filter((c) => !green && r.limiting.includes(c.key))
      .map((c) => {
        const text = (F.reasons[c.reason] ?? P3_TEXT[S.lang].reasons[c.reason])({ normal: mfNum(c.numbers?.deficitNormal ?? 0), dry: mfNum(c.numbers?.deficitDry ?? 0), limit: mfNum(SUIT_PARAMS.limitedIrrigationMm), window: mfNum(c.numbers?.window ?? 0), cycleMin: c.numbers?.cycleMin, cycleMax: c.numbers?.cycleMax, wet: mfNum(c.numbers?.wet ?? 0, 2), flag: mfNum(c.numbers?.flag ?? 0, 2), t: mfNum(c.numbers?.t ?? 0, 1), ph: mfNum(c.numbers?.ph ?? 0, 1), o1: c.numbers?.o1, o2: c.numbers?.o2, a1: c.numbers?.a1, a2: c.numbers?.a2 })
        const evs = c.evidence.slice(0, 2).map((ev) => `<span class="inline-flex items-center gap-1">${esc(mfLabel(ev))}: ${showValue(ev, { digits: mfDigits(ev) })}</span>`).join('')
        return `<li class="mt-1"><span class="font-bold">${F.criteria[c.key]}:</span> ${esc(text)} <span class="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">${evs}</span></li>`
      })
      .join('')
    const local = []
    if (zone.local.floodN > 0) local.push(X.localFlood(zone.local.floodN))
    if (zone.local.point) local.push(X.localPoint(zone.local.point.date))
    return `<p class="mt-1 text-base">${esc(head)}</p>${lines ? `<ul class="text-base">${lines}</ul>` : ''}${!z.uniform && local.length ? `<p class="mt-1 text-sm font-semibold text-moss-900">${X.local} ${esc(local.join('; '))}.</p>` : ''}`
  }
  if (z.uniform) {
    const zone = z.zones[0]
    return `<div class="mt-4 rounded-2xl border border-line bg-ground p-4">
        <div class="flex flex-wrap items-center gap-2"><span class="font-extrabold">${X.uniformTitle}</span>${mfGradeBadge(zone.result.overall, zone.result.overall === 'gray' ? F.overallGray : F.grades[zone.result.overall])}</div>
        ${explain(zone)}
        <p class="mt-3 text-base font-semibold">${DATA_TEXT[S.lang].tools.noDiff}</p>
      </div>`
  }
  const sorted = [...z.zones].sort((a, b) => b.cells.length - a.cells.length)
  return `<p class="mt-3 text-sm font-semibold text-moss-900">${X.onMap}</p>
    <ol class="mt-3 grid gap-3">${sorted
      .map(
        (zone, k) => `<li class="rounded-2xl border ${MFZ.focus === zone.id ? 'border-moss-900 ring-2 ring-moss-900' : 'border-line'} bg-ground p-4">
          <div class="flex flex-wrap items-center justify-between gap-2"><span class="font-extrabold">${X.zone(k + 1, zone.cells.length, ha(zone.cells.length))}</span>${mfGradeBadge(zone.result.overall, zone.result.overall === 'gray' ? F.overallGray : F.grades[zone.result.overall])}</div>
          ${explain(zone)}
        </li>`,
      )
      .join('')}</ol>`
}

function mfzClearLayer() {
  if (MFZ.layer) MFZ.layer.remove()
  MFZ.layer = null
}

function mfzDrawLayer(field, z) {
  const Lf = window.L
  mfzClearLayer()
  if (!MF.map || !Lf) return
  MFZ.layer = Lf.layerGroup().addTo(MF.map)
  const zoneOfCell = new Map(z.zones.flatMap((zone) => zone.cells.map((i) => [i, zone])))
  for (const c of z.cells) {
    const dLat = field.cellM / 2 / MFZ_M_PER_DEG
    const dLon = field.cellM / 2 / (MFZ_M_PER_DEG * Math.cos((c.cell.lat * Math.PI) / 180))
    const grade = c.result.overall
    const zone = zoneOfCell.get(c.cell.i)
    const opac = typeof MW !== 'undefined' ? MW.opacity : 0.6
    const fillOpacity = MFZ.focus === zone.id ? Math.min(0.9, opac + 0.2) : grade === 'gray' ? Math.max(0.35, opac * 0.65) : opac
    Lf.rectangle([[c.cell.lat - dLat, c.cell.lon - dLon], [c.cell.lat + dLat, c.cell.lon + dLon]], {
      color: grade === 'gray' ? '#5a6b61' : MFZ_FILL[grade],
      weight: grade === 'gray' ? 1 : 0,
      dashArray: grade === 'gray' ? '3 3' : null,
      fillColor: MFZ_FILL[grade],
      fillOpacity,
    })
      .on('click', (e) => {
        Lf.DomEvent.stopPropagation(e)
        if ((typeof mdActive === 'function' && mdActive()) || MFD.mode) return mfdMapClick(e.latlng)
        MFZ.focus = zone.id
        mfRenderDynamic()
      })
      .addTo(MFZ.layer)
  }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mfz]')
  if (!b) return
  MFZ.crop = b.dataset.value || null
  MFZ.focus = null
  mfRenderDynamic()
})
