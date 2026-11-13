// Chấm mức phù hợp của một cây theo YẾU TỐ HẠN CHẾ NHẤT (khung đánh giá đất đai FAO; mục 4.4 của blueprint).
// Không cộng điểm có trọng số: kết quả chung = hạng xấu nhất trong các tiêu chí chấm được.
// Chỉ dùng số đã có nguồn trong ROTATION_CROPS (site/data/rotationCrops.js). Thiếu ngưỡng có nguồn → Xám.
import { evDerive, evIsMissing, evMissing, evText, evidence } from '../core/evidence.js'
import { ROTATION_CROPS } from '../data/rotationCrops.js'
import { ROTATION_PARAMS } from './rotation.js'

// Ngưỡng DO NHÓM CHỌN (không phải hằng số khoa học); trang in nguyên văn với nhãn "ngưỡng do nhóm chọn".
export const SUIT_PARAMS = {
  minGradedShare: 0.5, // chấm được ít hơn một nửa số tiêu chí → "Chưa đủ dữ liệu"
  limitedIrrigationMm: 150, // ruộng tưới "hạn chế": bù được tối đa chừng này mm nước mỗi vụ
  cycleToleranceDays: 20, // cửa sổ vụ ngắn hơn chu kỳ ngắn nhất của FAO tới chừng này ngày → Vàng thay vì Đỏ
  wetRootFlag: ROTATION_PARAMS.wetRootFlag, // ẩm vùng rễ trung bình từ mức này trở lên trong vụ: nhắc nguy cơ úng
}
export const SUIT_GRADES = ['green', 'yellow', 'red'] // từ tốt đến xấu; 'gray' = không chấm
export const SUIT_CRITERIA = ['water', 'cycle', 'waterlogging', 'salinity', 'temperature', 'ph']
export const IRRIGATION_ANSWERS = ['yes', 'limited', 'no']

const suitMid = ([a, b]) => (a + b) / 2
const suitRef = (value, unit, src, label, note = null) => evidence({ value, unit, kind: 'reference', source: src, label, note })
const suitSum = (evs, label) => evDerive({ inputs: Object.fromEntries(evs.map((ev, i) => [`m${i}`, ev])), compute: (v) => Object.values(v).reduce((a, b) => a + b, 0), unit: 'mm', formula: evText('cộng các tháng trong cửa sổ vụ', 'sum of the months in the season window'), label })

/** Tìm id cây từ tên người dùng gõ (VI/EN). Không có trong thư viện → null. */
export function suitFindCrop(text) {
  const t = String(text ?? '').trim().toLowerCase().normalize('NFC')
  const names = { rice: ['lúa', 'lua', 'rice', 'lúa nước'], mungbean: ['đậu xanh', 'dau xanh', 'mung bean', 'mungbean', 'green gram'], maize: ['ngô', 'ngo', 'bắp', 'bap', 'maize', 'corn'] }
  return Object.keys(names).find((id) => names[id].includes(t)) ?? null
}

/**
 * Cửa sổ vụ. Với 5 huyện: lấy từ seasonWindows (lịch NDVI). Với toạ độ khác: tháng gieo + độ dài chu kỳ (giữa khoảng FAO).
 * Trả về { months, days, source: 'ndvi' | 'sowing' }.
 */
export function suitWindow({ ndviWindow = null, sowingMonth = null, crop }) {
  if (ndviWindow) return { months: ndviWindow.months, days: Math.round(ndviWindow.months.length * 30.4), source: 'ndvi', season: ndviWindow.season }
  const count = Math.ceil(suitMid(ROTATION_CROPS[crop].cycleDays) / 30.4)
  const months = Array.from({ length: count }, (_, i) => ((sowingMonth - 1 + i) % 12) + 1)
  return { months, days: Math.round(count * 30.4), source: 'sowing' }
}

/* ---------------- Từng tiêu chí: trả về { key, grade, reason, evidence: [Evidence...] } ---------------- */

function suitWater(info, window, climate, irrigation) {
  const need = suitRef(suitMid(info.waterMm), 'mm', info.waterSrc, 'cropNeed', evText(
    `giữa khoảng ${info.waterMm[0]}–${info.waterMm[1]} mm (FAO)${info.proxyWater ? `, mượn dòng "${info.proxyWater}"` : ''}`,
    `middle of the ${info.waterMm[0]}–${info.waterMm[1]} mm range (FAO)${info.proxyWater ? `, borrowed from the "${info.proxyWater}" row` : ''}`,
  ))
  const rows = window.months.map((m) => climate.months[m - 1])
  const rainNormal = suitSum(rows.map((r) => r.rain), 'rainSeason')
  const rainDry = suitSum(rows.map((r) => r.rainDry), 'rainSeasonDry')
  const deficitNormal = evDerive({ inputs: { need, rain: rainNormal }, compute: (v) => Math.max(0, v.need - v.rain), unit: 'mm', formula: evText('max(0, nhu cầu nước vụ − mưa trung bình trong vụ)', 'max(0, crop water need − mean rain in the season)'), label: 'deficitNormal' })
  const deficitDry = evDerive({ inputs: { need, rain: rainDry }, compute: (v) => Math.max(0, v.need - v.rain), unit: 'mm', formula: evText('max(0, nhu cầu nước vụ − mưa năm khô p10 trong vụ)', 'max(0, crop water need − dry-year (p10) rain in the season)'), label: 'deficitDry' })
  const evs = [need, rainNormal, rainDry, deficitNormal, deficitDry]
  if (evIsMissing(deficitNormal) || evIsMissing(deficitDry)) return { key: 'water', grade: 'gray', reason: 'missingClimate', evidence: evs }
  if (!irrigation) return { key: 'water', grade: 'gray', reason: 'needIrrigationAnswer', evidence: evs }
  const [dn, dd] = [deficitNormal.value, deficitDry.value]
  let grade
  if (irrigation === 'yes') grade = 'green'
  else if (irrigation === 'limited') grade = dd <= SUIT_PARAMS.limitedIrrigationMm ? 'green' : dn <= SUIT_PARAMS.limitedIrrigationMm ? 'yellow' : 'red'
  else grade = dd === 0 ? 'green' : dn === 0 ? 'yellow' : 'red'
  return { key: 'water', grade, reason: `water_${irrigation}_${grade}`, evidence: evs, numbers: { need: need.value, deficitNormal: dn, deficitDry: dd } }
}

function suitCycle(info, window) {
  const cycleMin = suitRef(info.cycleDays[0], 'ngày', info.cycleSrc, 'cycleMin', info.proxyCycle ? evText(`mượn dòng "${info.proxyCycle}"`, `borrowed from the "${info.proxyCycle}" row`) : null)
  if (window.source !== 'ndvi') return { key: 'cycle', grade: 'gray', reason: 'cycleNoCalendar', evidence: [cycleMin] }
  const windowDays = evidence({ value: window.days, unit: 'ngày', kind: 'derived', source: 'modis', label: 'windowDays', formula: evText(`${window.months.length} tháng × 30,4 ngày (lịch vụ từ NDVI)`, `${window.months.length} months × 30.4 days (season calendar from NDVI)`) })
  const gap = window.days - info.cycleDays[0]
  const grade = gap >= 0 ? 'green' : gap >= -SUIT_PARAMS.cycleToleranceDays ? 'yellow' : 'red'
  return { key: 'cycle', grade, reason: `cycle_${grade}`, evidence: [cycleMin, windowDays], numbers: { window: window.days, cycleMin: info.cycleDays[0], cycleMax: info.cycleDays[1] } }
}

function suitWaterlogging(info, window, climate) {
  if (!info.upland) {
    // Lúa nước: ruộng ngập là cách trồng bình thường (FAO Manual 3 ghi "Rice (paddy)"), nên tiêu chí này đạt.
    return { key: 'waterlogging', grade: 'green', reason: 'waterlogPaddy', evidence: [] }
  }
  const values = window.months.map((m) => climate.months[m - 1].gwetroot)
  if (values.some(evIsMissing)) return { key: 'waterlogging', grade: 'gray', reason: 'missingClimate', evidence: values.filter(evIsMissing) }
  const wet = evDerive({ inputs: Object.fromEntries(values.map((ev, i) => [`m${i}`, ev])), compute: (v) => Object.values(v).reduce((a, b) => a + b, 0) / values.length, unit: '0–1', formula: evText('trung bình ẩm vùng rễ (GWETROOT) các tháng trong vụ', 'mean root-zone wetness (GWETROOT) over the season months'), label: 'wetSeason' })
  const grade = wet.value >= SUIT_PARAMS.wetRootFlag ? 'yellow' : 'green'
  return { key: 'waterlogging', grade, reason: `waterlog_${grade}`, evidence: [wet], numbers: { wet: wet.value, flag: SUIT_PARAMS.wetRootFlag } }
}

function suitSalinity(info, salinityEce) {
  if (info.salinityEce === null) return { key: 'salinity', grade: 'gray', reason: 'salinityNoThreshold', evidence: [evMissing({ reason: evText('FAO-29 không có dòng cho cây này', 'FAO-29 has no row for this crop'), need: 'source', label: 'salinityThreshold' })] }
  const threshold = suitRef(info.salinityEce, 'dS/m', info.salinitySrc, 'salinityThreshold')
  if (salinityEce === null || salinityEce === undefined) {
    return { key: 'salinity', grade: 'gray', reason: 'salinityNeedMeasure', evidence: [threshold, evMissing({ reason: evText('chưa có số đo độ mặn của ruộng', 'no salinity measurement for this field yet'), need: 'measure', unit: 'dS/m', label: 'salinityField' })] }
  }
  const measured = evidence({ value: salinityEce, unit: 'dS/m', kind: 'ground', label: 'salinityField' })
  // Trên ngưỡng 100% năng suất của FAO-29 thì năng suất bắt đầu giảm: Vàng, cần cán bộ khuyến nông xem.
  const grade = salinityEce <= info.salinityEce ? 'green' : 'yellow'
  return { key: 'salinity', grade, reason: `salinity_${grade}`, evidence: [threshold, measured] }
}

const suitNoTable = (key) => ({ key, grade: 'gray', reason: 'noSourcedTable', evidence: [evMissing({ reason: evText('thiếu bảng chỉ tiêu có nguồn cho tiêu chí này', 'no sourced crop table for this criterion yet'), need: 'source', label: key })] })

/**
 * Chấm một cây. crop: id trong ROTATION_CROPS · window: suitWindow() · climate: powerClimate()
 * irrigation: 'yes' | 'limited' | 'no' | null · salinityEce: số đo (dS/m) hoặc null
 */
export function suitAssess({ crop, window, climate, irrigation = null, salinityEce = null }) {
  const info = ROTATION_CROPS[crop]
  if (!info) return { crop, known: false }
  const criteria = [suitWater(info, window, climate, irrigation), suitCycle(info, window), suitWaterlogging(info, window, climate), suitSalinity(info, salinityEce), suitNoTable('temperature'), suitNoTable('ph')]
  const graded = criteria.filter((c) => c.grade !== 'gray')
  const worst = graded.reduce((acc, c) => (SUIT_GRADES.indexOf(c.grade) > SUIT_GRADES.indexOf(acc) ? c.grade : acc), 'green')
  const enough = graded.length >= SUIT_PARAMS.minGradedShare * criteria.length
  const limiting = graded.filter((c) => c.grade === worst).map((c) => c.key)
  return {
    crop,
    known: true,
    overall: enough ? worst : 'gray', // không đủ tiêu chí thì KHÔNG BAO GIỜ ra Xanh
    worstSeen: graded.length ? worst : null,
    limiting: enough ? limiting : [],
    gradedCount: graded.length,
    totalCount: criteria.length,
    criteria,
    window,
  }
}
