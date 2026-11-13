// Trang "Dữ liệu" (#/du-lieu), phần Phase 2: kéo thả file → xác nhận cột → hộ chiếu dữ liệu → nhận hoặc bỏ;
// biểu mẫu số đo đất; danh sách dữ liệu đã nạp; bảng hai cột Vệ tinh–Mô hình / Đo tại ruộng–Nông dân báo.
// Phần nguồn dữ liệu và công bố dùng AI cũ (renderSources trong template) nằm ngay bên dưới, giữ nguyên.
// Mọi phép đọc/kiểm tra file là hàm thuần ở site/sources/upload.js (có test). File này chỉ lo giao diện.
import { HARMONIZE_PARAMS } from '../core/harmonize.js'
import { DATA_TEXT } from '../i18n/dataText.js'
import { CATALOG_DYNAMIC } from '../sources/catalog.js'
import { DS, dsAdd, dsNewId, dsPackRecords, dsRemove } from '../sources/dataStore.js'
import { FI_EC_TYPES, FI_SOIL_TYPES, fiBelongs, fiCheck, fiToday } from '../sources/farmerInput.js'
import { fdApplyUpload } from '../logic/fieldData.js'
import { UPLOAD_ORIGINS, UPLOAD_VARIABLES, uploadGuessMapping, uploadParse, uploadValidate } from '../sources/upload.js'

const DH_MAX_MB = 20 // tham số do nhóm chọn: file lớn hơn thì nhờ người dùng cắt bớt (trình duyệt đọc cả file vào bộ nhớ)
const DH = { fileName: null, parsed: null, mapping: null, opts: null, result: null, error: null, message: null, soilMsg: null, soilWhere: 'field', dragging: false }
const dhT = () => DATA_TEXT[S.lang]
const dhSelectCls = 'min-h-12 w-full rounded-2xl border border-line bg-white px-4 text-base font-semibold text-ink outline-none focus:border-moss-700'

function renderDataHub() {
  const R = dhT()
  $('#datahub').innerHTML = `
    <div class="mx-auto max-w-6xl px-5 text-lg sm:px-8">
      <div class="max-w-3xl" data-reveal>
        <h2 class="text-4xl font-extrabold tracking-tight sm:text-5xl">${R.title}</h2>
        <p class="mt-3 text-lg leading-relaxed text-muted">${R.sub}</p>
        <p class="mt-3 flex items-start gap-2 text-base font-semibold text-moss-900">${icon('shield-check', 'mt-0.5 size-5 shrink-0')}${R.privacy}</p>
      </div>
      <div id="dh-field" class="mt-6"></div>
      <div class="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div id="dh-upload"></div>
        <div id="dh-soil"></div>
      </div>
      <div id="dh-table" class="mt-5"></div>
      <div id="dh-stored" class="mt-5"></div>
      <p class="mt-5 text-sm leading-relaxed text-muted">${R.teamParams({ cell: HARMONIZE_PARAMS.cellM, max: HARMONIZE_PARAMS.maxCells, share: `${Math.round((1 - HARMONIZE_PARAMS.minDayShare) * 100)}%`, dist: mfNum(HARMONIZE_PARAMS.matchDistanceM), pct: HARMONIZE_PARAMS.disagreePct })}</p>
      <p class="mt-5 rounded-[28px] border border-line bg-ground p-6 text-lg font-semibold leading-relaxed">${R.reminder}</p>
    </div>`
  dhRenderAll()
}

/** Gọi từ showPage() khi trang Dữ liệu hiện ra: chọn lại ruộng đã lưu để biết dữ liệu thuộc ruộng nào. */
function dataHubOnShow() {
  mfdRestore()
  dhRenderAll()
}

function dhRenderAll() {
  if (!$('#datahub')) return
  $('#dh-field').innerHTML = dhFieldHtml()
  $('#dh-upload').innerHTML = dhUploadHtml()
  $('#dh-soil').innerHTML = dhSoilHtml()
  $('#dh-table').innerHTML = dhTableHtml()
  $('#dh-stored').innerHTML = dhStoredHtml()
}

const dhGoField = () => `<button type="button" data-action="goto" data-value="myfield" class="inline-flex min-h-12 items-center gap-2 rounded-full bg-moss-900 px-5 text-base font-bold text-white hover:bg-moss-800">${icon('map-pin', 'size-5')}${dhT().goField}</button>`

function dhFieldHtml() {
  const R = dhT()
  if (!MF.loc) return `<div class="flex flex-wrap items-center gap-3 rounded-[28px] border border-dashed border-line bg-ground p-5"><p class="text-base text-muted">${R.noField}</p>${dhGoField()}</div>`
  return `<p class="flex items-center gap-2 text-base font-bold">${icon('map-pin', 'size-5 text-moss-700')}${esc(R.fieldNow(MF.loc.name ?? `${MF.loc.lat.toFixed(4)}, ${MF.loc.lon.toFixed(4)}`))}</p>`
}

/* ---------------- Tải file ---------------- */
const dhSelect = (name, options, value, label) => `<label class="block"><span class="text-base font-bold">${label}</span>
  <select data-dh-field="${name}" class="mt-1 ${dhSelectCls}">${options.map(([v, text]) => `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`

function dhUploadHtml() {
  const R = dhT()
  const drop = `<label id="dh-drop" for="dh-file" class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed ${DH.dragging ? 'border-moss-700 bg-lime-100' : 'border-line bg-ground'} px-5 py-8 text-center">
      ${icon('upload', 'size-8 text-moss-700')}
      <span class="text-lg font-extrabold">${R.drop}</span>
      <span class="inline-flex min-h-12 items-center rounded-full bg-moss-900 px-5 text-base font-bold text-white">${R.pick}</span>
      <span class="text-base text-muted">${R.formats}</span>
    </label>
    <input id="dh-file" type="file" accept=".csv,.txt,.json,.geojson" class="sr-only" />
    <p class="mt-2 text-sm text-muted">${R.samples}</p>`
  const msg = DH.error ? `<p class="mt-4 rounded-2xl bg-clay-100 p-4 text-base font-semibold text-clay-700" role="alert">${esc(DH.error)}</p>` : DH.message ? `<p class="mt-4 rounded-2xl bg-lime-100 p-4 text-base font-semibold text-moss-900" aria-live="polite">${esc(DH.message)}</p>` : ''
  return `<div class="rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7">
      <p class="text-xl font-extrabold">${R.step1}</p>
      <div class="mt-3">${drop}</div>
      ${msg}
      ${DH.parsed ? dhMappingHtml() : ''}
      ${DH.result ? dhPassportHtml() : ''}
    </div>`
}

function dhMappingHtml() {
  const R = dhT()
  const p = DH.parsed
  const m = DH.mapping
  const o = DH.opts
  const cols = [['', R.none], ...p.columns.map((c) => [c, c === '__lat' ? `${R.roles.lat} (GeoJSON)` : c === '__lon' ? `${R.roles.lon} (GeoJSON)` : c])]
  const info = UPLOAD_VARIABLES[o.variable]
  const unitOptions = info ? Object.keys(info.units).map((u) => [u, R.unitNames[u]]) : []
  const varValues = m.variableColumn ? [...new Set(p.rows.map((r) => String(r[m.variableColumn])))].slice(0, 50) : []
  const shown = p.columns.slice(0, 8)
  const preview = `<div class="mt-3 overflow-x-auto rounded-2xl border border-line">
      <table class="w-full border-collapse text-sm"><thead><tr>${shown.map((c) => `<th class="bg-ground px-3 py-2 text-left font-bold">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${p.rows.slice(0, 5).map((r) => `<tr class="border-t border-line">${shown.map((c) => `<td class="px-3 py-1.5">${esc(String(r[c] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </div>`
  return `<div class="mt-6 border-t border-line pt-5">
      <p class="text-xl font-extrabold">${R.step2}</p>
      <p class="mt-1 text-base text-muted">${R.step2Hint}</p>
      <p class="mt-3 text-base font-bold">${R.preview} · ${esc(DH.fileName)}</p>
      ${preview}
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        ${dhSelect('variable', [['', R.none], ...Object.keys(UPLOAD_VARIABLES).map((v) => [v, R.variables[v]])], o.variable, R.variable)}
        ${dhSelect('unit', unitOptions.length ? unitOptions : [['', R.none]], o.unit, R.unit)}
        ${dhSelect('value', cols, m.value, R.roles.value)}
        ${dhSelect('date', cols, m.date, R.roles.date)}
        ${dhSelect('lat', cols, m.lat, R.roles.lat)}
        ${dhSelect('lon', cols, m.lon, R.roles.lon)}
        ${dhSelect('variableColumn', cols, m.variableColumn, R.roles.variableColumn)}
        ${m.variableColumn ? dhSelect('variableValue', [['', R.none], ...varValues.map((v) => [v, v])], m.variableValue, R.roles.variableValue) : ''}
        ${dhSelect('origin', [['', R.none], ...Object.keys(UPLOAD_ORIGINS).map((k) => [k, R.origins[k]])], o.origin, R.origin)}
        <label class="block"><span class="text-base font-bold">${R.resolution}</span>
          <input data-dh-field="resolutionM" type="number" min="1" step="any" inputmode="decimal" value="${o.resolutionM ?? ''}" class="mt-1 ${dhSelectCls}" />
          <span class="mt-1 block text-sm text-muted">${R.resolutionHint}</span></label>
      </div>
      <button type="button" data-dh="check" class="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-moss-900 px-6 text-base font-bold text-white hover:bg-moss-800">${icon('file-check', 'size-5')}${R.check}</button>
    </div>`
}

function dhPassportHtml() {
  const R = dhT()
  const P = R.passport
  const pp = DH.result.passport
  const row = (label, value) => `<div class="grid gap-1 border-t border-line py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-3"><dt class="text-base font-bold text-muted">${label}</dt><dd class="text-base">${value}</dd></div>`
  const rej = Object.entries(pp.rejected).filter(([, n]) => n > 0)
  const rejText = rej.length ? `<ul class="list-disc pl-5">${rej.map(([k, n]) => `<li><span class="tabular font-bold">${mfNum(n)}</span> ${P.reasons[k]}</li>`).join('')}</ul>` : P.noneRejected
  const digits = Math.abs(pp.max ?? 0) < 10 ? 3 : 1
  const located = pp.locations > 0
  const points = !located ? P.noCoords : pp.inField === null ? `${P.locations(pp.locations)} · ${P.noPolygon}` : `${P.locations(pp.locations)} · ${P.inOut(pp.inField, pp.outField)}`
  const needField = !located && !MF.loc
  // Chỉ nói "đã đổi đơn vị" khi thật sự có phép đổi (hệ số khác 1 hoặc có độ lệch, vd. K → °C).
  const conv = UPLOAD_VARIABLES[pp.variable].units[pp.unitIn]
  const unitText = conv.f !== 1 || conv.o ? P.unitConv(R.unitNames[pp.unitIn], pp.unit || R.unitNames['']) : R.unitNames[pp.unitIn]
  const canUse = pp.accepted > 0 && !needField
  return `<div class="mt-6 rounded-[24px] border-2 border-moss-900 bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-xl font-extrabold">${P.title}</p><span class="rounded-full px-3 py-1 text-sm font-bold ${MF_KIND_STYLE[pp.kind]}">${mfT().kinds[pp.kind]}</span></div>
      <dl class="mt-3">
        ${row(P.file, `${esc(pp.fileName)} · ${pp.format.toUpperCase()}`)}
        ${row(P.rows(mfNum(pp.accepted), mfNum(pp.rowsTotal)), pp.skippedLines ? P.skipped(pp.skippedLines) : '')}
        ${row(P.rejected, rejText)}
        ${row(P.dates, pp.dateFrom ? `<span class="tabular">${pp.dateFrom} → ${pp.dateTo}</span>` : DH.mapping?.date ? '—' : P.noDates)}
        ${row(P.variable, R.variables[pp.variable])}
        ${row(P.unit, esc(unitText))}
        ${row(P.range, pp.min === null ? '—' : `<span class="tabular">${mfNum(pp.min, digits)} → ${mfNum(pp.max, digits)}</span>`)}
        ${row(P.points, points)}
        ${row(P.kind, `${mfT().kinds[pp.kind]} · ${R.origins[pp.origin]}`)}
        ${row(P.resolution, pp.resolutionM ? `${mfNum(pp.resolutionM)} m` : P.unknownRes)}
      </dl>
      <p class="mt-3 text-sm text-muted">${P.limits}</p>
      ${pp.accepted === 0 ? `<p class="mt-3 rounded-2xl bg-clay-100 p-4 text-base font-semibold text-clay-700" role="alert">${P.nothing}</p>` : ''}
      ${needField && pp.accepted > 0 ? `<div class="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-sun-100 p-4"><p class="text-base font-semibold text-sun-700">${P.needField}</p>${dhGoField()}</div>` : ''}
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" data-dh="use" ${canUse ? '' : 'disabled'} class="inline-flex min-h-12 items-center gap-2 rounded-full bg-moss-900 px-6 text-base font-bold text-white hover:bg-moss-800 disabled:cursor-not-allowed disabled:opacity-40">${icon('check', 'size-5')}${P.use}</button>
        <button type="button" data-dh="discard" class="inline-flex min-h-12 items-center gap-2 rounded-full border border-line px-6 text-base font-bold hover:border-moss-700">${icon('x', 'size-5')}${P.discard}</button>
      </div>
    </div>`
}

async function dhReadFile(file) {
  const R = dhT()
  Object.assign(DH, { fileName: file.name, parsed: null, mapping: null, opts: null, result: null, error: null, message: R.reading(file.name) })
  dhRenderAll()
  if (file.size > DH_MAX_MB * 1024 * 1024) return dhFail(R.parseErrors.tooBig(DH_MAX_MB))
  let text
  try {
    text = await file.text()
  } catch {
    return dhFail(R.parseErrors.read)
  }
  const parsed = uploadParse(text, file.name)
  if (parsed.error) return dhFail(R.parseErrors[parsed.error] ?? R.parseErrors.read)
  const g = uploadGuessMapping(parsed.columns)
  const variable = g.variable ?? ''
  const units = variable ? Object.keys(UPLOAD_VARIABLES[variable].units) : []
  const unit = g.unit !== null && units.includes(g.unit) ? g.unit : units[0] ?? ''
  Object.assign(DH, {
    parsed,
    message: null,
    mapping: { date: g.date, value: g.value, lat: g.lat, lon: g.lon, variableColumn: g.variableColumn, variableValue: null },
    opts: { variable, unit, origin: '', resolutionM: null },
  })
  dhRenderAll()
}

function dhFail(text) {
  Object.assign(DH, { parsed: null, result: null, message: null, error: text })
  dhRenderAll()
}

function dhCheck() {
  const R = dhT()
  const res = uploadValidate(DH.parsed, DH.mapping, { ...DH.opts, fileName: DH.fileName, field: mfdCurrentField() })
  if (res.error) {
    DH.result = null
    DH.error = R.validateErrors[res.error]
  } else {
    DH.result = res
    DH.error = null
  }
  dhRenderAll()
}

function dhUse() {
  const res = DH.result
  if (!res || res.passport.accepted === 0) return
  const located = res.passport.locations > 0
  if (!located && !MF.loc) return
  const id = dsNewId()
  // File không có tọa độ gắn vào ruộng đang xem (anchor); file có tọa độ tự tìm ruộng nào nó phủ.
  dsAdd('uploads', { id, passport: res.passport, records: dsPackRecords(res.records), anchor: !located && MF.loc ? { lat: MF.loc.lat, lon: MF.loc.lon } : null, createdAt: new Date().toISOString() })
  mfdRegisterUpload(DS.uploads.find((u) => u.id === id))
  Object.assign(DH, { fileName: null, parsed: null, mapping: null, opts: null, result: null, error: null, message: dhT().accepted })
  dhAfterChange()
}

/** Dữ liệu đổi: vẽ lại trang Dữ liệu và trang Ruộng của tôi (nếu đã có ruộng). */
function dhAfterChange() {
  dhRenderAll()
  if (MF.loc) mfRenderDynamic()
  mfdDrawLayers()
}

/* ---------------- Số đo đất ---------------- */
function dhSoilHtml() {
  const R = dhT()
  const F = R.soilForm
  if (!MF.loc) {
    return `<div class="rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7"><p class="text-xl font-extrabold">${F.title}</p><p class="mt-2 text-base text-muted">${R.noField}</p><div class="mt-3">${dhGoField()}</div></div>`
  }
  const input = (name, label, attrs = '') => `<label class="block"><span class="text-base font-bold">${label}</span><input name="${name}" ${attrs} class="mt-1 ${dhSelectCls}" /></label>`
  const select = (name, label, options) => `<label class="block"><span class="text-base font-bold">${label}</span><select name="${name}" class="mt-1 ${dhSelectCls}">${options.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>`
  const where = ['field', 'point']
    .map((w) => `<label class="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-4 text-base font-bold ${DH.soilWhere === w ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-white'}"><input type="radio" name="where" value="${w}" ${DH.soilWhere === w ? 'checked' : ''} data-dh="where" class="sr-only" />${w === 'field' ? F.whereField : F.wherePoint}</label>`)
    .join('')
  const point = DH.soilWhere === 'point'
    ? `<div class="grid grid-cols-2 gap-3">${input('lat', F.lat, `type="number" step="any" inputmode="decimal" value="${MF.loc.lat}"`)}${input('lon', F.lon, `type="number" step="any" inputmode="decimal" value="${MF.loc.lon}"`)}</div>`
    : ''
  const msg = DH.soilMsg ? `<p class="rounded-2xl p-4 text-base font-semibold ${DH.soilMsg.ok ? 'bg-lime-100 text-moss-900' : 'bg-clay-100 text-clay-700'}" aria-live="polite">${esc(DH.soilMsg.text)}</p>` : ''
  return `<form data-dh-form="soil" class="grid gap-3 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7">
      <p class="text-xl font-extrabold">${F.title}</p>
      <p class="text-base text-muted">${F.hint}</p>
      <div class="grid grid-cols-2 gap-3">${input('ph', F.ph, 'type="text" inputmode="decimal" autocomplete="off"')}${input('om', F.om, 'type="text" inputmode="decimal" autocomplete="off"')}</div>
      ${input('ec', F.ec, 'type="text" inputmode="decimal" autocomplete="off"')}
      ${select('ecType', F.ecType, FI_EC_TYPES.map((k) => [k, F.ecTypes[k]]))}
      ${select('soilType', F.soilType, FI_SOIL_TYPES.map((k) => [k, F.soilTypes[k]]))}
      ${input('date', F.date, `type="date" value="${fiToday()}"`)}
      <div><p class="text-base font-bold">${F.where}</p><div class="mt-1 flex flex-wrap gap-2">${where}</div></div>
      ${point}
      ${msg}
      <button type="submit" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss-900 px-6 text-base font-bold text-white hover:bg-moss-800">${icon('save', 'size-5')}${F.save}</button>
    </form>`
}

function dhSaveSoil(form) {
  const F = dhT().soilForm
  const fd = new FormData(form)
  const values = {}
  for (const [key, label] of [['ph', F.ph], ['ec', F.ec], ['om', F.om]]) {
    const v = fiCheck(key, fd.get(key))
    if (v === 'out') return dhSoilMessage(false, F.out(label))
    values[key] = v
  }
  const soilType = String(fd.get('soilType'))
  if (values.ph === null && values.ec === null && values.om === null && soilType === 'unknown') return dhSoilMessage(false, F.empty)
  let lat = MF.loc.lat
  let lon = MF.loc.lon
  if (DH.soilWhere === 'point') {
    lat = Number(fd.get('lat'))
    lon = Number(fd.get('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return dhSoilMessage(false, F.badPoint)
  }
  dsAdd('soil', { date: String(fd.get('date') || fiToday()), where: DH.soilWhere, lat, lon, ...values, ecType: values.ec === null ? null : String(fd.get('ecType')), soilType })
  DH.soilMsg = { ok: true, text: F.saved }
  dhAfterChange()
}

function dhSoilMessage(ok, text) {
  DH.soilMsg = { ok, text }
  $('#dh-soil').innerHTML = dhSoilHtml()
}

/* ---------------- Bảng hai cột: nguồn nào đang có ---------------- */
const DH_STATUS_STYLE = {
  live: 'bg-lime-100 text-moss-900',
  cache: 'bg-moss-50 text-moss-800',
  stored: 'bg-moss-50 text-moss-800',
  missing: 'border border-dashed border-line bg-white text-muted',
  unusable: 'bg-clay-100 text-clay-700',
  imageOnly: 'bg-ground text-muted',
  uploadOnly: 'bg-ground text-muted',
}

function dhTableHtml() {
  const R = dhT()
  const T = R.table
  const field = mfdCurrentField()
  const powerStatus = !MF.loc || !MF.record ? 'missing' : MF.origin === 'network' ? 'live' : MF.origin === 'cache' ? 'cache' : 'stored'
  const elevStatus = !MF.elevation ? 'missing' : MF.origin === 'network' ? 'live' : MF.origin === 'cache' ? 'cache' : 'stored'
  const applies = (u) => field && fdApplyUpload({ ...u, records: mfdUploads().find((x) => x.id === u.id).records }, field)
  const remote = [
    [T.power, powerStatus, 'model'],
    [T.ndvi, MF.loc?.id ? 'stored' : 'missing', 'satellite'],
    [T.elevation, elevStatus, 'satellite'],
    [T.gibs, 'imageOnly', 'satellite'],
    ...DS.uploads.filter((u) => u.passport.kind !== 'ground').map((u) => [T.upload(u.passport.fileName), applies(u) ? 'live' : 'missing', u.passport.kind]),
    [T.directSat, 'uploadOnly', 'satellite'],
    [T.openTopo, 'unusable', 'satellite'],
  ]
  const soilN = field ? DS.soil.filter((s) => fiBelongs(s, field)).length : 0
  const marksN = field ? DS.marks.filter((m) => fiBelongs(m, field)).length : 0
  const local = [
    [`${T.soil}${soilN ? ` · ${T.count(soilN)}` : ''}`, soilN ? 'live' : 'missing', 'ground'],
    [`${T.marks}${marksN ? ` · ${T.count(marksN)}` : ''}`, marksN ? 'live' : 'missing', 'farmer'],
    ...DS.uploads.filter((u) => u.passport.kind === 'ground').map((u) => [T.upload(u.passport.fileName), applies(u) ? 'live' : 'missing', 'ground']),
  ]
  const list = (rows) =>
    `<ul class="mt-3 divide-y divide-line">${rows
      .map(
        ([name, status, kind]) => `<li class="flex flex-wrap items-center justify-between gap-2 py-3">
          <span class="flex min-w-0 items-center gap-2 text-base"><span class="shrink-0 rounded-full px-2 text-xs font-bold leading-5 ${MF_KIND_STYLE[kind]}">${mfT().kindTags[kind]}</span>${esc(name)}</span>
          <span class="rounded-full px-3 py-1 text-sm font-bold ${DH_STATUS_STYLE[status]}">${T.status[status]}</span></li>`,
      )
      .join('')}</ul>`
  return `<div class="rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7">
      <p class="text-xl font-extrabold">${T.title}</p>
      <div class="mt-2 grid gap-6 md:grid-cols-2">
        <div><p class="text-base font-extrabold text-muted">${T.remote}</p>${list(remote)}</div>
        <div><p class="text-base font-extrabold text-muted">${T.local}</p>${list(local)}</div>
      </div>
      <p class="mt-3 text-sm text-muted">${T.reasonUnusable}</p>
    </div>`
}

/* ---------------- Dữ liệu đã nạp ---------------- */
function dhStoredHtml() {
  const R = dhT()
  const S_ = R.stored
  const field = mfdCurrentField()
  const removeBtn = (kind, id) => `<button type="button" data-dh="remove" data-kind="${kind}" data-id="${id}" class="inline-flex min-h-12 items-center gap-1 rounded-full border border-line px-4 text-base font-bold hover:border-clay-700 hover:text-clay-700">${icon('trash-2', 'size-4')}${S_.remove}</button>`
  const here = (ok) => `<span class="text-sm font-semibold ${ok ? 'text-moss-900' : 'text-muted'}">${ok ? S_.applies : S_.notHere}</span>`
  const uploads = DS.uploads.map((u) => {
    const ok = field && fdApplyUpload({ ...u, records: mfdUploads().find((x) => x.id === u.id).records }, field)
    return `<li class="flex flex-wrap items-center justify-between gap-3 py-3"><span class="text-base"><strong>${esc(u.passport.fileName)}</strong> · ${R.variables[u.passport.variable]} · ${mfNum(u.passport.accepted)} · ${mfT().kinds[u.passport.kind]}<br />${here(ok)}</span>${removeBtn('uploads', u.id)}</li>`
  })
  const soil = DS.soil.map((s) => {
    const parts = [s.ph !== null && s.ph !== undefined ? `pH ${mfNum(s.ph, 1)}` : null, s.ec !== null && s.ec !== undefined ? `EC ${mfNum(s.ec, 2)} dS/m (${R.soilForm.ecTypes[s.ecType ?? 'unknown']})` : null, s.om !== null && s.om !== undefined ? `${R.soilForm.om} ${mfNum(s.om, 1)}` : null, s.soilType && s.soilType !== 'unknown' ? R.soilForm.soilTypes[s.soilType] : null].filter(Boolean)
    return `<li class="flex flex-wrap items-center justify-between gap-3 py-3"><span class="text-base"><strong>${S_.measured(s.date)}</strong> · ${esc(parts.join(' · '))}<br />${here(field && fiBelongs(s, field))}</span>${removeBtn('soil', s.id)}</li>`
  })
  const marks = DS.marks.map((m) => `<li class="flex flex-wrap items-center justify-between gap-3 py-3"><span class="text-base"><strong>${R.tools.markTypes[m.type]}</strong> · ${m.date} · <span class="tabular">${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}</span><br />${here(field && fiBelongs(m, field))}</span>${removeBtn('marks', m.id)}</li>`)
  const block = (title, items) => `<div><p class="text-base font-extrabold text-muted">${title}</p>${items.length ? `<ul class="divide-y divide-line">${items.join('')}</ul>` : `<p class="py-3 text-base text-muted">${S_.empty}</p>`}</div>`
  return `<div class="rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7">
      <p class="text-xl font-extrabold">${S_.title}</p>
      ${DS.saved ? '' : `<p class="mt-2 rounded-2xl bg-sun-100 p-4 text-base font-semibold text-sun-700">${S_.notSaved}</p>`}
      <div class="mt-3 grid gap-6 lg:grid-cols-3">${block(S_.uploads, uploads)}${block(S_.soil, soil)}${block(S_.marks, marks)}</div>
    </div>`
}

/* ---------------- Sự kiện ---------------- */
document.addEventListener('change', (e) => {
  const el = e.target
  if (el.id === 'dh-file' && el.files?.[0]) return dhReadFile(el.files[0])
  const key = el.dataset?.dhField
  if (key && DH.parsed) {
    const v = el.value === '' ? null : el.value
    if (['variable', 'unit', 'origin'].includes(key)) DH.opts[key] = v ?? ''
    else if (key === 'resolutionM') DH.opts.resolutionM = v === null ? null : Number(v)
    else DH.mapping[key] = v
    if (key === 'variable') DH.opts.unit = v ? Object.keys(UPLOAD_VARIABLES[v].units)[0] : ''
    if (key === 'variableColumn') DH.mapping.variableValue = null
    DH.result = null
    DH.error = null
    $('#dh-upload').innerHTML = dhUploadHtml()
  }
  if (el.dataset?.dh === 'where') {
    DH.soilWhere = el.value
    DH.soilMsg = null
    $('#dh-soil').innerHTML = dhSoilHtml()
  }
})

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dh]')
  if (!b || b.tagName === 'INPUT') return
  switch (b.dataset.dh) {
    case 'check':
      return dhCheck()
    case 'use':
      return dhUse()
    case 'discard':
      Object.assign(DH, { fileName: null, parsed: null, mapping: null, opts: null, result: null, error: null, message: null })
      return dhRenderAll()
    case 'remove':
      dsRemove(b.dataset.kind, b.dataset.id)
      if (b.dataset.kind === 'uploads') CATALOG_DYNAMIC.delete(`upload:${b.dataset.id}`)
      return dhAfterChange()
  }
})

document.addEventListener('submit', (e) => {
  if (e.target.dataset?.dhForm !== 'soil') return
  e.preventDefault()
  dhSaveSoil(e.target)
})

// Kéo thả: bắt ở cấp tài liệu, chỉ xử lý khi thả vào vùng #dh-drop.
for (const type of ['dragenter', 'dragover']) {
  document.addEventListener(type, (e) => {
    if (!e.target.closest?.('#dh-drop')) return
    e.preventDefault()
    if (!DH.dragging) {
      DH.dragging = true
      $('#dh-drop')?.classList.add('border-moss-700', 'bg-lime-100')
    }
  })
}
document.addEventListener('dragleave', (e) => {
  if (!e.target.closest?.('#dh-drop')) return
  DH.dragging = false
  $('#dh-drop')?.classList.remove('border-moss-700', 'bg-lime-100')
})
document.addEventListener('drop', (e) => {
  if (!e.target.closest?.('#dh-drop')) return
  e.preventDefault()
  DH.dragging = false
  const file = e.dataTransfer?.files?.[0]
  if (file) dhReadFile(file)
})
