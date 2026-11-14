// Đọc file người dùng tải lên NGAY TRONG TRÌNH DUYỆT (không gửi đi đâu): CSV, JSON (mảng bản ghi), GeoJSON.
// Ba bước, đều là hàm thuần để test được:
//   1. uploadParse(text, tên file)      → bảng cột + dòng
//   2. uploadGuessMapping(cột)          → đoán cột ngày / giá trị / vĩ độ / kinh độ / biến / đơn vị (người dùng xác nhận hoặc sửa)
//   3. uploadValidate(bảng, cách ánh xạ) → bản ghi hợp lệ + số dòng bị loại theo từng lý do + "hộ chiếu dữ liệu"
//
// Không có bộ nhận dạng riêng cho định dạng xuất của Giovanni/AppEEARS: chưa có file thật của nhóm để đối chiếu
// (phase-2.md). Bộ ánh xạ cột là đường chính.
import { hzPointInPolygon } from '../core/harmonize.js'

/**
 * Danh mục biến nhận được. Mỗi biến có đơn vị chuẩn, các đơn vị chấp nhận (chỉ những phép đổi THEO ĐỊNH NGHĨA,
 * vd. 1 mS/cm = 1 dS/m, K − 273,15 = °C) và GIỚI HẠN VẬT LÝ (không phải ngưỡng "hợp lý" tự đặt):
 *   NDVI trong [−1, 1] (định nghĩa chỉ số), pH trong [0, 14], lượng mưa/bốc hơi/độ mặn ≥ 0, nhiệt độ ≥ độ không tuyệt đối,
 *   độ ẩm thể tích trong [0, 1], phần trăm chất hữu cơ trong [0, 100]. Xu hướng nước ngầm có thể âm hoặc dương: không chặn.
 *   flow: biến là "lượng" theo thời gian (gộp tháng = tổng). series: biến cần cột ngày.
 */
export const UPLOAD_VARIABLES = {
  soilMoisture: { unit: 'm³/m³', units: { 'm3/m3': { f: 1 }, '%': { f: 0.01 } }, min: 0, max: 1, series: true, flow: false },
  et: { unit: 'mm', units: { 'mm/day': { f: 1, basis: 'day' }, 'mm/month': { f: 1, basis: 'month' } }, min: 0, max: null, series: true, flow: true },
  lst: { unit: '°C', units: { '°c': { f: 1 }, k: { f: 1, o: -273.15 } }, min: -273.15, max: null, series: true, flow: false },
  rain: { unit: 'mm', units: { 'mm/day': { f: 1, basis: 'day' }, 'mm/month': { f: 1, basis: 'month' } }, min: 0, max: null, series: true, flow: true },
  ndvi: { unit: '', units: { '': { f: 1 } }, min: -1, max: 1, series: true, flow: false },
  groundwater: { unit: 'cm', units: { cm: { f: 1 }, mm: { f: 0.1 }, m: { f: 100 } }, min: null, max: null, series: true, flow: false },
  ph: { unit: '', units: { '': { f: 1 } }, min: 0, max: 14, series: false, flow: false },
  ec: { unit: 'dS/m', units: { 'ds/m': { f: 1 }, 'ms/cm': { f: 1 }, 'µs/cm': { f: 0.001 } }, min: 0, max: null, series: false, flow: false },
  organicMatter: { unit: '%', units: { '%': { f: 1 }, 'g/kg': { f: 0.1 } }, min: 0, max: 100, series: false, flow: false },
}

// Nguồn gốc file → loại số liệu (mục 3 của blueprint). Độ phân giải gốc KHÔNG điền sẵn theo sản phẩm:
// người dùng nhập (hoặc để trống = không rõ), vì mỗi sản phẩm có nhiều cấp độ phân giải.
export const UPLOAD_ORIGINS = {
  smap: 'satellite', ecostress: 'satellite', gpm: 'satellite', landsat: 'satellite', modis: 'satellite', grace: 'satellite', otherSat: 'satellite',
  model: 'model', // vd. NASA POWER: mô hình, không phải vệ tinh đo
  ground: 'ground',
}

/* ---------------------------------------------------------------
 * 1. Đọc file
 * --------------------------------------------------------------- */
/** Tách một dòng CSV theo dấu phân cách, có xử lý ngoặc kép ("a,b" là một ô; "" là dấu ngoặc kép). */
export function uploadSplitCsvLine(line, sep) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) out.push(cur.trim()), (cur = '')
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

const UPLOAD_SEPARATORS = [',', ';', '\t', '|']

/** Đoán dấu phân cách: dấu cho nhiều dòng có CÙNG số ô (và > 1 ô) nhất. */
function uploadGuessSeparator(lines) {
  let best = { sep: ',', count: 1, lines: 0 }
  for (const sep of UPLOAD_SEPARATORS) {
    const counts = lines.map((l) => uploadSplitCsvLine(l, sep).length)
    const freq = new Map()
    for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1)
    const [count, n] = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
    if (count > 1 && (n > best.lines || (n === best.lines && count > best.count))) best = { sep, count, lines: n }
  }
  return best
}

function uploadParseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const content = lines.map((l, i) => ({ l, i })).filter((x) => x.l.trim() !== '' && !x.l.trim().startsWith('#'))
  if (content.length < 2) return { error: 'tooShort' }
  // Không dấu nào cho từ 2 ô trở lên: file chỉ có một cột (vd. một cột giá trị), vẫn đọc được.
  const { sep, count } = uploadGuessSeparator(content.slice(-200).map((x) => x.l))
  // Dòng tiêu đề = dòng đầu tiên có đúng số ô của bảng VÀ dòng kế tiếp cũng vậy. Các dòng trước đó là dòng mô tả.
  const n = (x) => uploadSplitCsvLine(x.l, sep).length
  const h = content.findIndex((x, k) => n(x) === count && content[k + 1] && n(content[k + 1]) === count)
  if (h < 0) return { error: 'noHeader' }
  const columns = uploadSplitCsvLine(content[h].l, sep).map((c, i) => c || `col${i + 1}`)
  const rows = []
  let badRows = 0
  for (const x of content.slice(h + 1)) {
    const cells = uploadSplitCsvLine(x.l, sep)
    if (cells.length !== count) {
      badRows++
      continue
    }
    rows.push(Object.fromEntries(columns.map((c, i) => [c, cells[i]])))
  }
  const described = lines.slice(0, content[h].i).filter((l) => l.trim() !== '').length
  return { format: 'csv', separator: sep, columns, rows, skippedLines: described, badRows, decimalComma: sep !== ',' }
}

/** Tâm đơn giản của một vòng tọa độ GeoJSON [[lon, lat], ...] (trung bình các đỉnh, đủ để biết điểm rơi trong/ngoài ruộng). */
const uploadRingCenter = (ring) => [ring.reduce((s, p) => s + p[1], 0) / ring.length, ring.reduce((s, p) => s + p[0], 0) / ring.length]

function uploadParseGeojson(json) {
  const features = json.type === 'FeatureCollection' ? json.features ?? [] : [json]
  const rows = []
  let badRows = 0
  for (const f of features) {
    const g = f?.geometry
    let lat = null
    let lon = null
    if (g?.type === 'Point' && Array.isArray(g.coordinates)) [lon, lat] = g.coordinates
    else if (g?.type === 'Polygon' && Array.isArray(g.coordinates?.[0])) [lat, lon] = uploadRingCenter(g.coordinates[0])
    else if (g?.type === 'MultiPolygon' && Array.isArray(g.coordinates?.[0]?.[0])) [lat, lon] = uploadRingCenter(g.coordinates[0][0])
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      badRows++
      continue
    }
    rows.push({ ...(f.properties ?? {}), __lat: lat, __lon: lon })
  }
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  return { format: 'geojson', columns, rows, skippedLines: 0, badRows, decimalComma: false }
}

/** Đọc nội dung file. Định dạng đoán theo đuôi file, rồi theo nội dung. Trả về { format, columns, rows, ... } hoặc { error }. */
export function uploadParse(text, fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop()
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { error: 'empty' }
  if (ext === 'json' || ext === 'geojson' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let json
    try {
      json = JSON.parse(trimmed)
    } catch {
      return { error: 'badJson' }
    }
    if (json && (json.type === 'FeatureCollection' || json.type === 'Feature')) return uploadParseGeojson(json)
    // JSON: mảng bản ghi, hoặc một đối tượng có đúng một trường là mảng bản ghi.
    const arrays = json && !Array.isArray(json) ? Object.values(json).filter(Array.isArray) : []
    const list = Array.isArray(json) ? json : arrays.length === 1 ? arrays[0] : null
    if (!list || !list.every((r) => r && typeof r === 'object' && !Array.isArray(r))) return { error: 'jsonNotRecords' }
    const columns = [...new Set(list.flatMap((r) => Object.keys(r)))]
    return { format: 'json', columns, rows: list, skippedLines: 0, badRows: 0, decimalComma: false }
  }
  return uploadParseCsv(text)
}

/* ---------------------------------------------------------------
 * 2. Đoán cột từ tên cột (người dùng LUÔN xác nhận hoặc sửa)
 * --------------------------------------------------------------- */
const uploadNorm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim()

const UPLOAD_ROLE_HINTS = {
  date: /^(date|time|datetime|day|ngay|thoi ?gian|calendar_date|yyyymmdd|period|month|thang)$/,
  lat: /^(__lat|lat|latitude|vi ?do|y)$/,
  lon: /^(__lon|lon|lng|long|longitude|kinh ?do|x)$/,
  value: /^(value|val|gia ?tri|mean|data)$/,
  variable: /^(variable|var|bien|parameter|param|band|layer)$/,
  unit: /^(unit|units|don ?vi)$/,
}

// Tên biến hay gặp trong tên cột. Chỉ để ĐOÁN; người dùng chọn lại được.
const UPLOAD_VARIABLE_HINTS = [
  ['ndvi', /ndvi/],
  ['rain', /(rain|precip|prcp|prectot|imerg|\bmua\b|luong mua)/],
  ['soilMoisture', /(soil.?moist|\bsm\b|sm_|smap|do am dat)/],
  ['et', /(^et$|^et_|evapo|ecostress|boc thoat)/],
  ['lst', /(^lst|land.?surface.?temp|nhiet be mat)/],
  ['groundwater', /(grace|groundwater|\btws\b|lwe|nuoc ngam)/],
  ['ph', /(^ph$|^ph_|_ph$|\bph\b)/],
  ['ec', /(^ec$|^ec_|salin|do man)/],
  ['organicMatter', /(organic.?matter|^om$|^om_|huu co)/],
]

/** Đoán biến từ một chuỗi (tên cột hoặc giá trị ở cột "biến"). */
export function uploadGuessVariable(text) {
  const t = uploadNorm(text)
  return UPLOAD_VARIABLE_HINTS.find(([, re]) => re.test(t))?.[0] ?? null
}

/** Chuẩn hoá chuỗi đơn vị về khoá trong UPLOAD_VARIABLES[*].units (vd. "mm d-1" → "mm/day"). Không nhận ra → null. */
export function uploadNormUnit(text) {
  let u = String(text ?? '').trim().toLowerCase().replace(/\s+/g, '')
  // pH và NDVI không có đơn vị: các cách ghi thường gặp đều quy về chuỗi rỗng.
  if (['', '-', 'none', 'unitless', 'khongdonvi', 'ph', 'ndvi', 'ratio', '1'].includes(u)) return ''
  u = u.replace(/m\^?3\/m\^?3|m³\/m³|m3m-3|m³m⁻³/, 'm3/m3').replace(/^(mm\/d|mmd-1|mm\/ngay|mm\/ngày|mm\/24h)$/, 'mm/day').replace(/^(mm\/mo|mm\/thang|mm\/tháng|mmmonth-1)$/, 'mm/month')
  u = u.replace(/^(°c|degc|oc|c|deg_c|celsius)$/, '°c').replace(/^(kelvin)$/, 'k').replace(/^(us\/cm|μs\/cm)$/, 'µs/cm')
  return u
}

/** Đơn vị trong tên cột, dạng "mua (mm/day)" hoặc "ndvi [unitless]". */
const uploadUnitInName = (name) => String(name).match(/[([]([^)\]]+)[)\]]/)?.[1] ?? null

/**
 * Đoán vai trò các cột. Trả về { date, value, lat, lon, variableColumn, unitColumn, variable, unit } (null khi không đoán được).
 * Nếu không có cột "value", lấy cột đầu tiên có tên giống một biến làm cột giá trị.
 */
export function uploadGuessMapping(columns) {
  const find = (role) => columns.find((c) => UPLOAD_ROLE_HINTS[role].test(uploadNorm(c).replace(/[([].*$/, '').trim())) ?? null
  const guess = { date: find('date'), lat: find('lat'), lon: find('lon'), value: find('value'), variableColumn: find('variable'), unitColumn: find('unit'), variable: null, unit: null }
  const taken = new Set(Object.values(guess).filter(Boolean))
  if (!guess.value) guess.value = columns.find((c) => !taken.has(c) && uploadGuessVariable(c.replace(/[([].*$/, ''))) ?? null
  if (guess.value) {
    guess.variable = uploadGuessVariable(guess.value.replace(/[([].*$/, ''))
    const u = uploadUnitInName(guess.value)
    if (u !== null) guess.unit = uploadNormUnit(u)
  }
  return guess
}

/* ---------------------------------------------------------------
 * 3. Kiểm tra từng dòng → bản ghi hợp lệ + hộ chiếu dữ liệu
 * --------------------------------------------------------------- */
const uploadDaysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const uploadPad2 = (n) => String(n).padStart(2, '0')

/**
 * Đọc ngày. Nhận: YYYY-MM-DD (có thể kèm giờ), YYYY/MM/DD, YYYYMMDD, YYYY-MM, YYYYMM, DD/MM/YYYY (kiểu Việt Nam),
 * AYYYYDDD (ngày thứ DDD trong năm, kiểu calendar của MODIS). Trả về 'YYYY-MM-DD' hoặc 'YYYY-MM'; sai → null.
 */
export function uploadParseDate(raw) {
  const s = String(raw ?? '').trim()
  let y
  let m
  let d = null
  let mt
  if ((mt = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ].*)?$/))) [y, m, d] = [mt[1], mt[2], mt[3]].map(Number)
  else if ((mt = s.match(/^(\d{4})(\d{2})(\d{2})$/))) [y, m, d] = [mt[1], mt[2], mt[3]].map(Number)
  else if ((mt = s.match(/^(\d{4})-(\d{1,2})$/)) || (mt = s.match(/^(\d{4})(\d{2})$/))) [y, m] = [mt[1], mt[2]].map(Number)
  else if ((mt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [d, m, y] = [mt[1], mt[2], mt[3]].map(Number)
  else if ((mt = s.match(/^A(\d{4})(\d{3})$/))) {
    const date = new Date(Date.UTC(Number(mt[1]), 0, Number(mt[2])))
    if (date.getUTCFullYear() !== Number(mt[1])) return null
    return date.toISOString().slice(0, 10)
  } else return null
  if (y < 1900 || y > 2100 || m < 1 || m > 12) return null
  if (d === null) return `${y}-${uploadPad2(m)}`
  if (d < 1 || d > uploadDaysIn(y, m)) return null
  return `${y}-${uploadPad2(m)}-${uploadPad2(d)}`
}

/** Đọc số; nhận dấu phẩy thập phân khi file không dùng dấu phẩy để phân cách cột. Không phải số hữu hạn → null. */
export function uploadParseNumber(raw, decimalComma = false) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  let s = String(raw ?? '').trim()
  if (s === '') return null
  if (decimalComma && /^-?\d+,\d+$/.test(s)) s = s.replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null
  return Number(s)
}

/**
 * Kiểm tra từng dòng theo cách ánh xạ đã xác nhận.
 *   parsed: kết quả uploadParse · mapping: { date, value, lat, lon, variableColumn, variableValue }
 *   opts: { variable, unit, origin, product, resolutionM, fileName, field: hzField() | null }
 * Trả về { error } (lỗi cả file, vd. thiếu cột giá trị) hoặc { records, rejected, passport }.
 * Dòng bị loại được ĐẾM theo lý do; không dòng hỏng nào lọt vào bản ghi.
 */
export function uploadValidate(parsed, mapping, opts) {
  const info = UPLOAD_VARIABLES[opts.variable]
  if (!info) return { error: 'noVariable' }
  if (!mapping.value || !parsed.columns.includes(mapping.value)) return { error: 'noValueColumn' }
  const unitKey = uploadNormUnit(opts.unit)
  const conv = unitKey === null ? null : info.units[unitKey]
  if (!conv) return { error: 'badUnit' }
  if (info.series && !mapping.date) return { error: 'needDate' }
  if (Boolean(mapping.lat) !== Boolean(mapping.lon)) return { error: 'needBothCoords' }
  if (!UPLOAD_ORIGINS[opts.origin]) return { error: 'noOrigin' }

  const rejected = { badRow: parsed.badRows ?? 0, otherVariable: 0, badDate: 0, notNumber: 0, outOfRange: 0, badCoords: 0 }
  const records = []
  for (const row of parsed.rows) {
    if (mapping.variableColumn && mapping.variableValue !== undefined && mapping.variableValue !== null && String(row[mapping.variableColumn]) !== String(mapping.variableValue)) {
      rejected.otherVariable++
      continue
    }
    let date = null
    if (mapping.date) {
      date = uploadParseDate(row[mapping.date])
      if (!date) {
        rejected.badDate++
        continue
      }
    }
    const raw = uploadParseNumber(row[mapping.value], parsed.decimalComma)
    if (raw === null) {
      rejected.notNumber++
      continue
    }
    let value = raw * conv.f + (conv.o ?? 0)
    // mm/tháng mà ngày chỉ có tháng → giữ nguyên tổng tháng; giá trị luôn kiểm tra giới hạn SAU khi đổi đơn vị.
    if ((info.min !== null && value < info.min) || (info.max !== null && value > info.max)) {
      rejected.outOfRange++
      continue
    }
    let lat = null
    let lon = null
    if (mapping.lat) {
      lat = uploadParseNumber(row[mapping.lat], parsed.decimalComma)
      lon = uploadParseNumber(row[mapping.lon], parsed.decimalComma)
      if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        rejected.badCoords++
        continue
      }
    }
    value = Math.round(value * 1e6) / 1e6
    records.push({ date, value, lat, lon })
  }

  const field = opts.field ?? null
  const located = records.filter((r) => r.lat !== null)
  const locKeys = new Set(located.map((r) => `${r.lat},${r.lon}`))
  let inField = null
  let outField = null
  if (field?.kind === 'polygon' && located.length) {
    const pts = [...locKeys].map((k) => k.split(',').map(Number))
    inField = pts.filter((p) => hzPointInPolygon(p, field.polygon)).length
    outField = pts.length - inField
  }
  const dates = records.map((r) => r.date).filter(Boolean).sort()
  const values = records.map((r) => r.value)
  const passport = {
    fileName: opts.fileName ?? '',
    format: parsed.format,
    rowsTotal: parsed.rows.length + (parsed.badRows ?? 0),
    skippedLines: parsed.skippedLines ?? 0,
    accepted: records.length,
    rejected,
    rejectedTotal: Object.entries(rejected).filter(([k]) => k !== 'otherVariable').reduce((s, [, n]) => s + n, 0),
    dateFrom: dates[0] ?? null,
    dateTo: dates[dates.length - 1] ?? null,
    variable: opts.variable,
    unitIn: unitKey,
    unit: info.unit,
    basis: conv.basis ?? null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    locations: locKeys.size,
    inField,
    outField,
    origin: opts.origin,
    kind: UPLOAD_ORIGINS[opts.origin],
    product: opts.product ?? null,
    resolutionM: typeof opts.resolutionM === 'number' && opts.resolutionM > 0 ? opts.resolutionM : null,
  }
  return { records, rejected, passport }
}
