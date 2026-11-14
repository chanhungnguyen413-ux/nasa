// Phần Phase 2 của trang "Ruộng của tôi": khoanh thửa, đánh dấu của nông dân, chuỗi số liệu tải lên, so hai nguồn mưa,
// và số đo đất đi vào chấm điểm. File riêng để không phình myField.js; myField.js chỉ gọi các hàm mfd* ở vài điểm nối.
// Dùng chung tiện ích của template ($, esc, icon, S) và của myField.js (MF, showValue, mfNum, mfPill, mfT, mfRenderDynamic…).
import { evIsMissing } from '../core/evidence.js'
import { HARMONIZE_PARAMS, hzAreaM2, hzPointInPolygon } from '../core/harmonize.js'
import { DATA_TEXT } from '../i18n/dataText.js'
import { fdCollect, fdField } from '../logic/fieldData.js'
import { CATALOG_DYNAMIC } from '../sources/catalog.js'
import { DS, dsAdd, dsLoad, dsSave, dsSetField, dsUnpackRecords } from '../sources/dataStore.js'
import { FI_MARK_TYPES, fiBelongs, fiToday } from '../sources/farmerInput.js'

const MFD = {
  mode: null, // null | 'draw' | 'mark:flood' | 'mark:dry' | ...
  draft: [], // các góc đang chạm khi khoanh thửa
  note: null, // thông báo ngắn dưới công cụ
  layers: null, // nhóm lớp Leaflet: ranh thửa + đánh dấu
  unpacked: new Map(), // id file → bản ghi đã giải nén (đỡ giải nén lại mỗi lần vẽ)
}
const mfdT = () => DATA_TEXT[S.lang]
// Màu của 4 loại dấu: dùng lại màu trạng thái sẵn có của trang (nước, nắng, đất sét, xanh lá), không thêm hệ màu mới.
const MFD_MARK_COLOR = { flood: '#2e86c1', dry: '#c58a12', acidSaline: '#8f2f14', good: '#5b8c1a' }

/* ---------------- Kho dữ liệu: nạp lúc mở trang, đăng ký nguồn của từng file ---------------- */
function mfdRegisterUpload(u) {
  const name = (lang) => `${lang === 'vi' ? 'File tải lên' : 'Uploaded file'}: ${u.passport.fileName} (${DATA_TEXT[lang].origins[u.passport.origin]})`
  const res = u.passport.resolutionM
  CATALOG_DYNAMIC.set(`upload:${u.id}`, {
    name: { vi: name('vi'), en: name('en') },
    provider: '—',
    kind: u.passport.kind,
    resolution: res ? { vi: `${res} m`, en: `${res} m` } : { vi: 'không rõ', en: 'unknown' },
    url: null,
    credit: null,
  })
}
dsLoad()
DS.uploads.forEach(mfdRegisterUpload)

function mfdUploads() {
  return DS.uploads.map((u) => {
    if (!MFD.unpacked.has(u.id)) MFD.unpacked.set(u.id, dsUnpackRecords(u.records))
    return { ...u, records: MFD.unpacked.get(u.id) }
  })
}

/* ---------------- Ruộng đang xem ---------------- */
const mfdSameField = (loc) => Boolean(DS.field && loc && Math.abs(DS.field.lat - loc.lat) < 1e-7 && Math.abs(DS.field.lon - loc.lon) < 1e-7)
const mfdPolygon = () => (mfdSameField(MF.loc) ? DS.field.polygon ?? null : null)
/** Đơn vị phân tích của ruộng đang xem (một điểm, hoặc lưới ô nếu đã khoanh). */
const mfdCurrentField = () => fdField(MF.loc, mfdPolygon())

/** Gọi từ mfSelect(): ghi nhớ ruộng đang xem; chọn điểm mới thì ranh thửa cũ không còn áp dụng. */
function mfdOnSelect(loc) {
  if (!mfdSameField(loc)) dsSetField({ lat: loc.lat, lon: loc.lon, id: loc.id ?? null, name: loc.name ?? null, polygon: null })
  MFD.mode = null
  MFD.draft = []
  MFD.note = null
}

/** Gọi khi trang hiện ra: lần đầu mở lại trang thì chọn lại ruộng đã lưu. */
function mfdRestore() {
  if (!MF.loc && DS.field) mfSelect({ lat: DS.field.lat, lon: DS.field.lon, id: DS.field.id ?? undefined, name: DS.field.name ?? undefined })
  else if (MF.loc) {
    mfdDrawLayers()
    const poly = mfdPolygon()
    if (poly && typeof mgFitGardenOnMap === 'function') mgFitGardenOnMap({ lat: MF.loc.lat, lon: MF.loc.lon, polygon: poly })
  }
}

/** Dữ liệu người dùng cho ruộng đang xem (dùng trong mfCompute). */
function mfdCollect(climate) {
  const field = mfdCurrentField()
  return field ? fdCollect({ ds: { soil: DS.soil, marks: DS.marks, uploads: mfdUploads() }, field, climate }) : null
}

/** Đầu vào thêm cho suitAssess từ số đo đất và đánh dấu. */
function mfdSuitInputs(user) {
  if (!user) return {}
  return { salinityEce: evIsMissing(user.soil.ec) ? null : user.soil.ec, salinityType: user.soil.ecType, floodMarks: user.marks.flood, ph: user.soil.ph }
}

/* ---------------- Bản đồ: khoanh thửa và đánh dấu ---------------- */
/** Gọi từ sự kiện chạm bản đồ. Trả về true nếu chế độ khoanh/đánh dấu đã xử lý cú chạm. */
function mfdMapClick(latlng) {
  if (typeof mdHandleMapClick === 'function' && mdHandleMapClick(latlng)) return true
  // Khi không ở chế độ chọn chỗ mới và đã có ruộng rồi: chạm bản đồ KHÔNG làm mất ranh thửa cũ (sửa lỗi STATE.md).
  if (!MFD.mode && MF.loc && typeof MW !== 'undefined' && !MW.picking) return true
  const poly = mfdPolygon()
  if (!MFD.mode && poly && hzPointInPolygon([latlng.lat, latlng.lng], poly)) return true
  if (!MFD.mode) return false
  const p = [Math.round(latlng.lat * 1e6) / 1e6, Math.round(latlng.lng * 1e6) / 1e6]
  if (!MF.loc) {
    MFD.note = mfdT().tools.needPoint
    mfdRenderTools()
    return true
  }
  dsAdd('marks', { type: MFD.mode.slice(5), lat: p[0], lon: p[1], date: fiToday() })
  mfdDrawLayers()
  mwOnInputsChanged()
  mfRenderDynamic()
  return true
}

function mfdDrawLayers() {
  const Lf = window.L
  if (!MF.map || !Lf) return
  if (MFD.layers && !MF.map.hasLayer(MFD.layers)) MFD.layers = null // bản đồ được tạo lại (vd. đổi ngôn ngữ)
  if (!MFD.layers) MFD.layers = Lf.layerGroup().addTo(MF.map)
  MFD.layers.clearLayers()
  const poly = mfdPolygon()
  if (poly) Lf.polygon(poly, { color: '#0f3d24', weight: 3, fillColor: '#b8e55a', fillOpacity: 0.3, interactive: false }).addTo(MFD.layers)
  if (MFD.draft.length) {
    Lf.polyline(MFD.draft, { color: '#0b2e1b', weight: 2, dashArray: '6 6', interactive: false }).addTo(MFD.layers)
    MFD.draft.forEach((pt) => Lf.circleMarker(pt, { radius: 6, color: '#0b2e1b', weight: 2, fillColor: '#ffffff', fillOpacity: 1, interactive: false }).addTo(MFD.layers))
  }
  const R = mfdT()
  for (const m of DS.marks) {
    Lf.circleMarker([m.lat, m.lon], { radius: 8, color: '#ffffff', weight: 2, fillColor: MFD_MARK_COLOR[m.type], fillOpacity: 1 })
      .bindTooltip(esc(`${R.tools.markTypes[m.type]} · ${m.date}`))
      .addTo(MFD.layers)
  }
  if (typeof mdDrawHandles === 'function') mdDrawHandles()
}

function mfdToolsHtml() {
  const R = mfdT()
  const T = R.tools
  const poly = mfdPolygon()
  const field = mfdCurrentField()
  const drawing = MFD.mode === 'draw'
  let draw
  if (drawing) {
    draw = `<p class="text-base font-semibold text-moss-900">${T.drawHint} ${T.corners(MFD.draft.length)}.</p>
      <div class="mt-2 flex flex-wrap gap-2">
        ${mfPill('data-mfd="done"', `${icon('check', 'size-5')}${T.done}`, true)}
        ${MFD.draft.length ? mfPill('data-mfd="undo"', `${icon('undo-2', 'size-5')}${T.undo}`) : ''}
        ${mfPill('data-mfd="cancel"', T.cancel)}
      </div>`
  } else {
    draw = `<div class="flex flex-wrap gap-2">
        ${mfPill('data-mfd="draw"', `${icon('pen-line', 'size-5')}${T.draw}`)}
        ${poly ? mfPill('data-mfd="clear"', `${icon('trash-2', 'size-5')}${T.clear}`) : ''}
      </div>`
  }
  const area = poly && field ? `<p class="mt-2 text-base text-muted">${T.area(mfNum(hzAreaM2(poly) / 1e4, 2), field.cells.length, field.cellM)}</p>` : ''
  const user = MF.loc ? mfdCollect(null) : null
  const inField = user ? user.marks.list.length : 0
  // Blueprint mục 5: khi không lớp nào khác nhau trong thửa thì nói thẳng.
  const differs = user && (inField > 0 || user.uploads.some((u) => !u.layer.uniform) || DS.soil.some((s) => s.where === 'point' && fiBelongs(s, user.field)))
  const noDiff = poly && !differs ? `<p class="mt-3 rounded-2xl border border-dashed border-line bg-ground p-4 text-base">${T.noDiff}</p>` : ''
  const marks = FI_MARK_TYPES.map((type) => {
    const on = MFD.mode === `mark:${type}`
    return mfPill(`data-mfd="mark" data-value="${type}"`, `<span class="size-3.5 shrink-0 rounded-full ring-2 ring-white" style="background:${MFD_MARK_COLOR[type]}"></span>${T.markTypes[type]}`, on)
  }).join('')
  return `<div class="min-w-0 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-6">
      <p class="text-lg font-extrabold">${T.title}</p>
      <div class="mt-3">${draw}${area}${noDiff}</div>
      <p class="mt-5 text-base font-bold">${T.marks}</p>
      <p class="mt-1 text-base text-muted">${T.markHint}</p>
      <div class="mt-2 flex flex-wrap gap-2">${marks}</div>
      ${MF.loc ? `<p class="mt-2 text-base text-muted">${T.markCount(inField)}${inField ? ` · <button type="button" data-mfd="clearMarks" class="font-semibold text-clay-700 underline underline-offset-2">${T.clearMarks}</button>` : ''}</p>` : ''}
      ${MFD.note ? `<p class="mt-2 text-base font-semibold text-clay-700" aria-live="polite">${esc(MFD.note)}</p>` : ''}
    </div>`
}

function mfdRenderTools() {
  const el = $('#mf-tools')
  if (el) el.innerHTML = typeof mdToolsHtml === 'function' ? mdToolsHtml() : mfdToolsHtml()
}

/* ---------------- Bước 2: chuỗi tải lên và so hai nguồn mưa ---------------- */
/** Lớp phủ trên biểu đồ mưa: mưa của file tải lên, đường nét đứt + điểm vuông. Trả về các phần tử SVG. */
function mfdRainOverlay(months, { cx, y }) {
  const pts = months.map((ev, i) => (evIsMissing(ev) ? null : [cx(i), y(ev.value)])).filter(Boolean)
  if (!pts.length) return []
  const parts = []
  if (pts.length > 1) parts.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#10231a" stroke-width="2" stroke-dasharray="6 5"/>`)
  for (const [px, py] of pts) parts.push(`<rect x="${px - 5}" y="${py - 5}" width="10" height="10" fill="#ffffff" stroke="#10231a" stroke-width="2"/>`)
  return parts
}

/** Biểu đồ đường nhỏ cho một chuỗi 12 tháng tải lên (NDVI, độ ẩm đất, …), trục riêng. */
function mfdLineChart(months, unit) {
  const { W, fs, padL, padR } = mfChartFrame()
  const H = W === 520 ? 190 : 150
  const top = 12
  const plotH = H - top - fs * 1.8
  const step = (W - padL - padR) / 12
  const values = months.map((ev) => (evIsMissing(ev) ? null : ev.value))
  const real = values.filter((v) => v !== null)
  if (!real.length) return ''
  let lo = Math.min(...real)
  let hi = Math.max(...real)
  if (hi - lo < 1e-9) (lo -= 1), (hi += 1)
  const pad = (hi - lo) * 0.1
  lo -= pad
  hi += pad
  const y = (v) => top + (1 - (v - lo) / (hi - lo)) * plotH
  const cx = (i) => padL + step * (i + 0.5)
  const digits = Math.abs(hi) < 10 ? 2 : 0
  const parts = [lo, hi].map((v) => `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8e1"/><text x="${padL - 6}" y="${y(v) + fs * 0.35}" font-size="${fs}" fill="#5a6b61" text-anchor="end">${mfNum(v, digits)}</text>`)
  mfT().months.forEach((m, i) => parts.push(`<text x="${cx(i)}" y="${H - 4}" font-size="${fs}" font-weight="700" fill="#10231a" text-anchor="middle">${m}</text>`))
  const pts = values.map((v, i) => (v === null ? null : [cx(i), y(v)])).filter(Boolean)
  if (pts.length > 1) parts.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#10231a" stroke-width="2.5" stroke-dasharray="6 5"/>`)
  for (const [px, py] of pts) parts.push(`<rect x="${px - 5}" y="${py - 5}" width="10" height="10" fill="#ffffff" stroke="#10231a" stroke-width="2"/>`)
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(unit)}" class="block h-auto w-full">${parts.join('')}</svg>`
}

const mfdMonthRow = (label, evs, digits) =>
  `<tr class="border-t border-line"><th scope="row" class="sticky left-0 bg-white py-2 pl-5 pr-2 text-left text-[13px] font-bold text-muted sm:pl-7">${label}</th>${evs
    .map((ev) => `<td class="px-0.5 py-2 text-center">${showValue(ev, { digits, compact: true, unit: false })}</td>`)
    .join('')}</tr>`

const mfdMonthTable = (rows) => `<div class="mt-3 overflow-x-auto pb-2">
    <table class="w-full min-w-[860px] table-fixed border-collapse text-sm">
      <colgroup><col class="w-44" />${mfT().months.map(() => '<col />').join('')}</colgroup>
      <thead><tr><th class="sticky left-0 bg-white"></th>${mfT().months.map((m) => `<th scope="col" class="px-1 pb-2 text-center text-[13px] font-extrabold">${m}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  </div>`

function mfdUploadCard(u, data) {
  const R = mfdT()
  const pp = u.upload.passport
  const head = `<div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-lg font-extrabold">${R.variables[pp.variable]}</p>
      <span class="rounded-full px-3 py-1 text-sm font-bold ${MF_KIND_STYLE[pp.kind]}">${mfT().kinds[pp.kind]}</span>
    </div>
    <p class="mt-1 text-base text-muted">${esc(pp.fileName)} · ${R.origins[pp.origin]} · ${R.series.method[u.layer.method]}</p>
    ${u.layer.uniform ? `<p class="mt-1 text-sm font-semibold text-muted">${R.series.uniformFlag}</p>` : ''}`
  if (!u.months) {
    return `<div class="min-w-0 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-6">${head}<p class="mt-3 text-base">${R.series.fieldValue}: ${showValue(u.value, { digits: 2 })}</p></div>`
  }
  const isRain = pp.variable === 'rain'
  const digits = ['ndvi', 'soilMoisture'].includes(pp.variable) ? 2 : 0
  let compare = ''
  const cmp = isRain ? data.user.rainCompare.find((c) => c.upload.id === u.upload.id) : null
  if (cmp) {
    const bad = cmp.rows.filter((r) => r.disagree).map((r) => mfT().months[r.month - 1])
    compare = `<p class="mt-5 text-base font-extrabold">${R.series.compareTitle}</p>
      <p class="mt-1 text-base text-muted">${R.series.compareSub(HARMONIZE_PARAMS.disagreePct)}</p>
      ${mfdMonthTable([
        mfdMonthRow(R.series.rows.power, data.climate.months.map((m) => m.rain), 0),
        mfdMonthRow(R.series.rows.upload, u.months, 0),
        mfdMonthRow(R.series.rows.abs, cmp.rows.map((r) => r.abs), 0),
        mfdMonthRow(R.series.rows.pct, cmp.rows.map((r) => r.pct), 0),
      ])}
      <p class="mt-2 text-base font-semibold ${bad.length ? 'text-clay-700' : 'text-moss-900'}">${bad.length ? R.series.lowConfidence(bad.join(', ')) : R.series.agree}</p>`
  }
  return `<div class="min-w-0 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-6">
      ${head}
      ${isRain ? '' : `<div class="mt-3">${mfdLineChart(u.months, R.variables[pp.variable])}</div>`}
      ${cmp ? '' : mfdMonthTable([mfdMonthRow(`${R.variables[pp.variable]}${u.months[0].unit ? ` (${mfUnit(u.months[0].unit)})` : ''}`, u.months, digits)])}
      ${compare}
    </div>`
}

/** Khối "Dữ liệu bạn nạp cho ruộng này" dưới biểu đồ bước 2. */
function mfdSeriesHtml(data) {
  const R = mfdT()
  if (!data?.user) return ''
  const goData = `<button type="button" data-action="goto" data-value="sources" class="font-semibold text-moss-700 underline underline-offset-2">${R.series.goData}</button>`
  const cards = data.user.uploads.map((u) => mfdUploadCard(u, data)).join('')
  return `<div class="mt-5">
      <p class="text-lg font-extrabold">${R.series.title}</p>
      ${cards ? `<div class="mt-3 grid min-w-0 gap-4">${cards}</div>` : `<p class="mt-2 rounded-[28px] border border-dashed border-line bg-white p-5 text-base text-muted">${R.series.none} ${goData}</p>`}
    </div>`
}

/* ---------------- Bước 3: số liệu riêng của ruộng ---------------- */
function mfdSoilSummaryHtml(user) {
  if (!user) return ''
  const R = mfdT()
  const s = user.soil
  const items = []
  if (!evIsMissing(s.ph)) items.push(`<span>${esc(mfLabel(s.ph))}: ${showValue(s.ph, { digits: 1 })}</span>`)
  if (!evIsMissing(s.ec)) items.push(`<span>${esc(mfLabel(s.ec))}: ${showValue(s.ec, { digits: 1 })}${s.ecType ? ` <span class="text-sm text-muted">(${R.soilSummary.ecType(R.soilForm.ecTypes[s.ecType])})</span>` : ''}</span>`)
  if (!evIsMissing(s.om)) items.push(`<span>${esc(mfLabel(s.om))}: ${showValue(s.om, { digits: 1 })}</span>`)
  if (s.soilType) items.push(`<span>${R.soilSummary.soilType(R.soilForm.soilTypes[s.soilType])}</span>`)
  for (const type of FI_MARK_TYPES) if (user.marks[type].value > 0) items.push(`<span>${esc(mfLabel(user.marks[type]))}: ${showValue(user.marks[type])}</span>`)
  const edit = `<button type="button" data-action="goto" data-value="sources" class="font-semibold text-moss-700 underline underline-offset-2">${R.soilSummary.edit}</button>`
  return `<div class="mb-5 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-6">
      <p class="text-lg font-extrabold">${R.soilSummary.title}</p>
      ${items.length ? `<div class="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-base">${items.join('')}</div>` : `<p class="mt-1 text-base text-muted">${R.soilSummary.none}</p>`}
      <p class="mt-2 text-base">${edit}</p>
    </div>`
}

/* ---------------- Sự kiện ---------------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mfd]')
  if (!b) return
  const T = mfdT().tools
  MFD.note = null
  switch (b.dataset.mfd) {
    case 'draw':
      if (!MF.loc) MFD.note = T.needPoint
      else Object.assign(MFD, { mode: 'draw', draft: [] })
      break
    case 'undo':
      MFD.draft.pop()
      break
    case 'cancel':
      Object.assign(MFD, { mode: null, draft: [] })
      break
    case 'done':
      if (MFD.draft.length < 3) {
        MFD.note = T.tooFew
        break
      }
      dsSetField({ ...(DS.field ?? {}), lat: MF.loc.lat, lon: MF.loc.lon, id: MF.loc.id ?? null, name: MF.loc.name ?? null, polygon: MFD.draft })
      Object.assign(MFD, { mode: null, draft: [] })
      mfdDrawLayers()
      return mfRenderDynamic()
    case 'clear':
      if (DS.field) dsSetField({ ...DS.field, polygon: null })
      mfdDrawLayers()
      return mfRenderDynamic()
    case 'mark': {
      const mode = `mark:${b.dataset.value}`
      MFD.mode = MFD.mode === mode ? null : mode
      MFD.draft = []
      break
    }
    case 'clearMarks': {
      const field = mfdCurrentField()
      DS.marks = DS.marks.filter((m) => !fiBelongs(m, field))
      dsSave()
      mfdDrawLayers()
      return mfRenderDynamic()
    }
  }
  mfdDrawLayers()
  mfdRenderTools()
})
