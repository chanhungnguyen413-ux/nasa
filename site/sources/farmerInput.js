// Số đo đất tại ruộng và đánh dấu của nông dân → Evidence ('ground' và 'farmer').
// Hàm thuần: nhận danh sách đã lưu, trả về Evidence cho ruộng đang xem. Việc lưu nằm ở site/sources/dataStore.js.
import { evidence, evMissing, evText } from '../core/evidence.js'
import { HARMONIZE_PARAMS, hzDistanceM, hzPointInPolygon } from '../core/harmonize.js'

export const FI_MARK_TYPES = ['flood', 'dry', 'acidSaline', 'good'] // Hay ngập · Khô nhanh · Đất phèn/mặn · Đất tốt
// 'unknown' đứng ĐẦU để biểu mẫu mặc định là 'Không rõ': công cụ không tự chọn hộ người dùng.
export const FI_SOIL_TYPES = ['unknown', 'alluvial', 'acidSulfate', 'saline', 'clay', 'loam', 'sandy', 'peat']
// Kiểu số đo độ mặn. Chỉ ECe (dịch chiết bão hoà của đất) so được với ngưỡng FAO-29.
export const FI_EC_TYPES = ['unknown', 'ece', 'ecw', 'ec15']
// Giới hạn vật lý của biểu mẫu (giống UPLOAD_VARIABLES): pH 0–14, EC ≥ 0, chất hữu cơ 0–100 %.
/** Ngày hôm nay theo giờ của máy (không phải giờ UTC), dạng YYYY-MM-DD. */
export const fiToday = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const FI_LIMITS = { ph: [0, 14], ec: [0, null], om: [0, 100] }

/** Kiểm tra một số đo của biểu mẫu: trả về số hợp lệ, null nếu bỏ trống, hoặc 'out' nếu ngoài giới hạn vật lý. */
export function fiCheck(key, raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null
  const v = Number(String(raw).replace(',', '.'))
  if (!Number.isFinite(v)) return 'out'
  const [lo, hi] = FI_LIMITS[key]
  return v < lo || (hi !== null && v > hi) ? 'out' : v
}

/**
 * Số đo hoặc đánh dấu có thuộc ruộng đang xem không.
 *   Ruộng đã khoanh: điểm nằm trong đa giác (số đo "cả ruộng" thì so tâm ruộng lúc nhập).
 *   Ruộng là một điểm: cách điểm đó không quá matchDistanceM (ngưỡng do nhóm chọn).
 */
export function fiBelongs(item, field, params = HARMONIZE_PARAMS) {
  if (item.gardenId && item.gardenId !== field?.gardenId) return false
  if (!field?.center) return false
  const p = [item.lat, item.lon]
  // Số đo "cả ruộng" (và file không tọa độ) được gắn với điểm đã chọn của ruộng: vẫn thuộc ruộng đó kể cả khi
  // sau này người dùng khoanh thửa không chứa đúng điểm ấy.
  if (item.where === 'field' && field.point && Math.abs(p[0] - field.point[0]) < 1e-7 && Math.abs(p[1] - field.point[1]) < 1e-7) return true
  if (field.kind === 'polygon' && hzPointInPolygon(p, field.polygon)) return true
  return hzDistanceM(p, field.center) <= params.matchDistanceM + (field.extentM ?? 0) / 2
}

const fiWhere = (m) => (m.where === 'point' ? evText(`một điểm (${m.lat.toFixed(5)}, ${m.lon.toFixed(5)})`, `one point (${m.lat.toFixed(5)}, ${m.lon.toFixed(5)})`) : evText('cả ruộng', 'whole field'))

/**
 * Số đo đất mới nhất của ruộng cho từng chỉ tiêu. measures: [{ id, date, where, lat, lon, ph, ec, ecType, om, soilType }]
 * Trả về { ph, ec, om (Evidence), ecType, soilType, count }. Chỉ tiêu chưa có số đo → missing kèm việc cần làm "đo tại ruộng".
 */
export function fiSoilForField(measures, field) {
  const mine = measures.filter((m) => fiBelongs(m, field)).sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const pick = (key, label, unit) => {
    const m = mine.find((x) => typeof x[key] === 'number')
    if (!m) return evMissing({ reason: evText('chưa có số đo của ruộng này', 'no measurement for this field yet'), need: 'measure', unit, label, source: 'soilForm' })
    return evidence({ value: m[key], unit, kind: 'ground', source: 'soilForm', label, period: m.date, note: fiWhere(m) })
  }
  const latestEc = mine.find((x) => typeof x.ec === 'number')
  return {
    ph: pick('ph', 'phField', ''),
    ec: pick('ec', 'salinityField', 'dS/m'),
    om: pick('om', 'omField', '%'),
    ecType: latestEc?.ecType ?? null,
    soilType: mine.find((x) => x.soilType && x.soilType !== 'unknown')?.soilType ?? null,
    count: mine.length,
  }
}

/** Đếm đánh dấu từng loại trong ruộng. Trả về { flood: Evidence, ... } (giá trị = số điểm), cùng danh sách đánh dấu. */
export function fiMarksForField(marks, field) {
  const mine = marks.filter((m) => fiBelongs(m, field))
  const out = { list: mine }
  for (const type of FI_MARK_TYPES) {
    const n = mine.filter((m) => m.type === type).length
    const last = mine.filter((m) => m.type === type).map((m) => m.date).sort().pop()
    out[type] = evidence({ value: n, unit: 'điểm', kind: 'farmer', source: 'farmerMark', label: `mark_${type}`, period: last ?? null })
  }
  return out
}
