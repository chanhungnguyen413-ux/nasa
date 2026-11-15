// Hệ thống ĐIỀN THÔNG MINH (luôn bật): hàm thuần, không đụng giao diện, không gọi mạng, KHÔNG sửa hồ sơ.
// Mọi nơi trên trang (Tab 3, Cài đặt vườn, màu vườn, Luân canh, PDF, Trợ lý) đọc cùng một kết quả sfFill().
//
// Thứ tự ưu tiên cho MỖI trường: số/ý bà con nhập > suy từ lời bà con > dữ liệu tĩnh có nguồn > để trống.
// Mỗi trường trả về một SfField: { origin: 'field' | 'auto' | 'empty', value, kind, rate, source, period, method, note, reason, need }
//   field = bà con đã nhập (luôn thắng) · auto = tự điền, có nguồn + nhãn độ tin cậy · empty = không có gì đủ tin để điền.
// Không có nguồn chính thống thì để trống (không đoán): nguồn tưới, chất hữu cơ, ý muốn đổi cây.
import { ROTATIONS } from '../data/rotationCrops.js'
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { emCellAt } from './envMapData.js'
import { rgParseWish } from './rotationGen.js'
import { ssCellEstimate, ssRate } from './staticSnapshot.js'
import { fiCheck } from '../sources/farmerInput.js'
import { gmResolveCrop } from './gardenModel.js'

// Trường không bao giờ tự điền (không có dữ liệu chính thống để suy) + việc cần làm để bổ sung.
export const SF_NEVER = { irrigation: 'answer', om: 'measure', cropChange: 'answer' }
const SF_SEASONS = ['dx', 'ht', 'td']

const sfFold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const sfField = (value, extra = {}) => ({ origin: 'field', value, kind: 'ground', rate: ssRate('ground'), ...extra })
const sfEmpty = (reason, need = null, extra = {}) => ({ origin: 'empty', value: null, kind: 'missing', rate: 'none', reason, need, ...extra })
const sfAuto = (value, kind, extra = {}) => ({ origin: 'auto', value, kind, rate: ssRate(kind), ...extra })
const sfHas = (v) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && !Number.isFinite(v))

/**
 * Vụ NDVI đang diễn ra ở tháng `month` (1–12); không vụ nào chứa tháng đó thì lấy vụ SẮP bắt đầu gần nhất.
 * windows: [{ season, months }] theo thứ tự ĐX, HT, TĐ. Không có lịch → null.
 */
export function sfAutoSeason(windows, month) {
  if (!Array.isArray(windows) || !windows.length || !(month >= 1 && month <= 12)) return null
  const idx = windows.findIndex((w) => w?.months?.includes(month))
  if (idx >= 0) return { index: idx, season: windows[idx].season ?? SF_SEASONS[idx], months: windows[idx].months }
  let best = null
  windows.forEach((w, i) => {
    const start = w?.months?.[0]
    if (!start) return
    const wait = (start - month + 12) % 12
    if (!best || wait < best.wait) best = { wait, index: i }
  })
  return best ? { index: best.index, season: windows[best.index].season ?? SF_SEASONS[best.index], months: windows[best.index].months } : null
}

/** Cây của vụ thứ `index` (0–2) trong câu "đang làm" của bà con. Cây ngoài thư viện → { custom }. Không suy được → null. */
export function sfCropForSeason(text, index) {
  const crops = rgParseWish(text ?? '').crops
  const c = crops[index]
  if (!c) return null
  return c.id ? { id: c.id } : c.custom ? { custom: c.custom } : null
}

// Từ khoá nhãn nhóm đất bản đồ FAO (đã bỏ dấu) → lựa chọn "Loại đất" trong Cài đặt vườn.
// Do nhóm chọn; chỉ dùng cụm rõ nghĩa ("sét lầy", không dùng "sét" vì "phiến sét" là đá mẹ, không phải đất sét).
const SF_SOIL_WORDS = { acidSulfate: ['phen'], saline: ['man'], peat: ['than bun'], sandy: ['cat'], alluvial: ['phu sa'], clay: ['set lay'] }

/** Nhãn nhóm đất → khóa loại đất khi khớp ĐÚNG MỘT nhóm; khớp 0 hoặc nhiều nhóm (vd "phù sa nước lợ mặn / phèn") → null. */
export function sfSoilTypeFromLabel(label) {
  const t = ` ${sfFold(label).replace(/[^a-z0-9]+/g, ' ')} `
  const hits = Object.entries(SF_SOIL_WORDS).filter(([, words]) => words.some((w) => t.includes(` ${w} `))).map(([k]) => k)
  return hits.length === 1 ? hits[0] : null
}

/**
 * Điền thông minh cho MỘT thửa.
 *   profile: hồ sơ thửa · lat/lon · grids: { ph, ec } (ssGrids) · envMap: PRECOMPUTED.envMap
 *   windows: lịch vụ NDVI [{ season, months }] hoặc null · month: tháng hiện tại 1–12 · snapshot: { ph, ec } kỳ dữ liệu
 * Trả về { fields: { [key]: SfField }, filled: [...khóa auto], empty: [...khóa empty] }.
 */
export function sfFill({ profile = {}, lat = null, lon = null, grids = {}, envMap = null, windows = null, month = null, snapshot = {} } = {}) {
  const p = profile ?? {}
  const fields = {}

  // pH và độ mặn: số đo tại ruộng > ô lưới 5 km (ô kề ≤ 1 vòng) > trống. Độ mặn tự điền KHÔNG phải ECe.
  for (const [key, source] of [['ph', 'soilgridsPh'], ['ec', 'wangSalinity']]) {
    if (typeof p[key] === 'number' && Number.isFinite(p[key])) {
      fields[key] = sfField(p[key], { period: p.measuredAt ?? null, ecType: key === 'ec' ? p.ecType ?? 'unknown' : undefined })
      continue
    }
    const est = ssCellEstimate(grids?.[key], lat, lon)
    fields[key] = est
      ? sfAuto(est.value, 'model', { source, period: snapshot?.[key] ?? null, method: est.method, distanceKm: est.distanceKm, ecType: key === 'ec' ? 'unknown' : undefined })
      : sfEmpty('noCell', 'measure')
  }

  // Loại đất: bà con chọn > nhóm đất bản đồ FAO tại ô (chỉ khi nhãn rõ một nhóm) > trống (vẫn ghi nhãn gốc).
  if (p.soilType && p.soilType !== 'unknown') fields.soilType = sfField(p.soilType)
  else {
    const cell = envMap && Number.isFinite(lat) && Number.isFinite(lon) ? emCellAt(envMap, 'soilType', lat, lon) : null
    const label = cell?.soilClass ? { vi: cell.soilClass.labelVi, en: cell.soilClass.labelEn } : null
    const mapped = label ? sfSoilTypeFromLabel(label.vi) : null
    fields.soilType = mapped
      ? sfAuto(mapped, 'model', { source: 'faoSoilMap', note: label })
      : sfEmpty(label ? 'ambiguousSoil' : 'noCell', 'answer', { note: label })
  }

  // Mùa vụ + tháng gieo: bà con chọn > vụ NDVI đang diễn ra / sắp tới > trống.
  const auto = sfAutoSeason(windows, month)
  if (sfHas(p.season)) fields.season = sfField(p.season)
  else if (sfHas(p.sowing)) fields.season = sfEmpty('sowingGiven', null)
  else fields.season = auto ? sfAuto(auto.season, 'satellite', { source: 'modis', months: auto.months, index: auto.index }) : sfEmpty('noCalendar', 'answer')
  if (sfHas(p.sowing)) fields.sowing = sfField(p.sowing)
  else fields.sowing = fields.season.origin === 'auto' ? sfAuto(fields.season.months[0], 'satellite', { source: 'modis' }) : sfEmpty('noSeason', 'answer')

  // Cây: bà con chọn (thư viện hoặc tên tự gõ) > cây của đúng vụ đó trong câu "đang làm" > trống.
  if (p.cropId && CROP_LIBRARY[p.cropId]) fields.cropId = sfField(p.cropId)
  else if (p.cropName) fields.cropId = sfField(null, { custom: p.cropName })
  else {
    const idx = fields.season.origin === 'field' ? SF_SEASONS.indexOf(p.season) : fields.season.index ?? null
    const c = idx != null && idx >= 0 ? sfCropForSeason(p.currentText, idx) : null
    fields.cropId = c?.id
      ? sfAuto(c.id, 'farmer', { source: 'currentText' })
      : c?.custom
        ? sfAuto(null, 'farmer', { source: 'currentText', custom: c.custom })
        : sfEmpty(p.currentText ? 'noCropForSeason' : 'noCurrentText', 'answer')
  }

  // Kiểu đang làm (mẫu A–D): bà con chọn > chuỗi trong câu "đang làm" trùng đúng một mẫu > trống.
  if (sfHas(p.currentId)) fields.currentId = sfField(p.currentId)
  else {
    const ids = rgParseWish(p.currentText ?? '').crops.map((c) => c.id)
    const hit = ROTATIONS.find((r) => r.crops.length === ids.length && r.crops.every((c, i) => c === ids[i]))
    fields.currentId = hit ? sfAuto(hit.id, 'farmer', { source: 'currentText' }) : sfEmpty('noMatch', null)
  }

  // Không có nguồn chính thống → không bao giờ tự điền.
  for (const [key, need] of Object.entries(SF_NEVER)) {
    fields[key] = sfHas(p[key]) ? sfField(p[key]) : sfEmpty('notInferable', need)
  }

  const keys = Object.keys(fields)
  return { fields, filled: keys.filter((k) => fields[k].origin === 'auto'), empty: keys.filter((k) => fields[k].origin === 'empty') }
}

// Giá trị hợp lệ của các ô chọn (khớp gmNormalizeGarden trong gardenModel.js).
export const SF_CHOICES = {
  irrigation: ['yes', 'limited', 'no'],
  season: ['dx', 'ht', 'td'],
  soilType: ['alluvial', 'acidSulfate', 'saline', 'clay', 'loam', 'sandy', 'peat'],
  ecType: ['ece', 'ecw', 'ec15', 'unknown'],
}

/**
 * Bà con nhập/sửa MỘT thông số ngay tại dòng (trang Luân canh). Hàm thuần: kiểm giá trị → phần hồ sơ cần ghi.
 *   key: 'cropId' | 'season' | 'irrigation' | 'ph' | 'ec' | 'om' | 'soilType' · raw: chữ/số bà con nhập
 *   extra: { profile, today: 'YYYY-MM-DD', ecType }
 * Trả về { ok: true, patch } hoặc { ok: false, error: 'range' | 'invalid' }.
 * Ô để trống → xóa giá trị đã nhập (thông số quay về tự điền / trống như trước).
 */
export function sfApplyInput(key, raw, { profile = {}, today = null, ecType = 'unknown' } = {}) {
  const text = raw === null || raw === undefined ? '' : String(raw).trim()
  if (key === 'cropId') {
    const c = gmResolveCrop(text)
    return { ok: true, patch: { cropId: c.cropId, cropName: c.cropName } }
  }
  if (key === 'ph' || key === 'ec' || key === 'om') {
    const v = fiCheck(key, text)
    if (v === 'out') return { ok: false, error: 'range' }
    if (v === null) return { ok: true, patch: key === 'ec' ? { ec: null, ecType: 'unknown' } : { [key]: null } }
    // Có số đo thì phải có ngày đo (hồ sơ yêu cầu): giữ ngày cũ, chưa có thì lấy hôm nay.
    const patch = { [key]: v, measuredAt: profile?.measuredAt ?? today }
    if (key === 'ec') patch.ecType = SF_CHOICES.ecType.includes(ecType) ? ecType : 'unknown'
    return { ok: true, patch }
  }
  if (key === 'irrigation' || key === 'season') {
    if (!text) return { ok: true, patch: { [key]: null } }
    return SF_CHOICES[key].includes(text) ? { ok: true, patch: { [key]: text } } : { ok: false, error: 'invalid' }
  }
  if (key === 'soilType') {
    if (!text || text === 'unknown') return { ok: true, patch: { soilType: 'unknown' } }
    return SF_CHOICES.soilType.includes(text) ? { ok: true, patch: { soilType: text } } : { ok: false, error: 'invalid' }
  }
  return { ok: false, error: 'invalid' }
}
