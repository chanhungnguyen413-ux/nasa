// Chấm điểm 4 kiểu luân canh cho MỘT huyện. Hàm thuần: nhận số liệu, trả kết quả, không đụng giao diện.
// Mọi lý do trả về dạng { code, ...số liệu, src } để lớp giao diện dịch sang VI/EN sau (bước 4b).
import { PROFIT_RATIO_UPLAND, ROTATIONS, ROTATION_CROPS, SEASONS } from '../data/rotationCrops.js'

/* ---------------------------------------------------------------
 * Phần 1: tham số do nhóm chọn (không phải hằng số khoa học)
 * --------------------------------------------------------------- */
export const ROTATION_PARAMS = {
  dryMonthMm: 100, // tháng có mưa trung bình < 100 mm được coi là tháng mùa khô (thanh "mưa mùa khô" tác động lên các tháng này)
  wetRootFlag: 0.85, // độ ẩm vùng rễ trung bình >= 0.85 trong vụ cây màu: nhắc kiểm tra thoát nước
  calendarHigh: 0.3, // độ nhạy lịch vụ (max-min vụ/năm khi đổi tham số) <= 0.3: tin cậy cao
  calendarMedium: 1.5, // <= 1.5: trung bình; lớn hơn: thấp
}
export const DEFAULT_PRIORITIES = { water: 50, soil: 50, income: 50, risk: 50 }
// et0 (Phase 3, tuỳ chọn): { base: [12], adj: [12] } ET0 tháng gốc và khi tăng nhiệt độ (site/logic/whatIf.js, wiEt0Pair).
// Không có et0 thì nhu cầu nước giữ nguyên: kết quả y hệt trước Phase 3 (test hồi quy không đổi).
export const DEFAULT_WHAT_IF = { dryRainPct: 0 }

const LEVELS = ['low', 'medium', 'high']
const mid = ([a, b]) => (a + b) / 2
const round = (v) => Math.round(v)
const monthOfDay = (doy) => new Date(Date.UTC(2023, 0, doy)).getUTCMonth() + 1 // 2023: năm không nhuận

/* ---------------------------------------------------------------
 * Phần 2: lịch vụ của huyện, suy ra từ 3 đỉnh NDVI (k-means)
 * Một vụ = các tháng từ sau đỉnh trước đến hết tháng có đỉnh của vụ đó.
 * --------------------------------------------------------------- */
export function seasonWindows(peakDays) {
  if (!peakDays || peakDays.length !== 3) return null
  const peaks = peakDays.map(monthOfDay).sort((a, b) => a - b)
  if (new Set(peaks).size !== 3) return null // hai đỉnh cùng tháng: không chia được

  // Vụ Đông Xuân = đỉnh gần tháng 2 nhất (tính vòng tròn). Hai vụ sau theo thứ tự thời gian.
  const gapToFeb = (m) => Math.min(Math.abs(m - 2), 12 - Math.abs(m - 2))
  const dx = peaks.reduce((best, m) => (gapToFeb(m) < gapToFeb(best) ? m : best))
  const start = peaks.indexOf(dx)
  const ordered = [0, 1, 2].map((i) => peaks[(start + i) % 3])

  return SEASONS.map((season, i) => {
    const prevPeak = ordered[(i + 2) % 3]
    const months = []
    for (let m = (prevPeak % 12) + 1; ; m = (m % 12) + 1) {
      months.push(m)
      if (m === ordered[i]) break
    }
    return { season, peakMonth: ordered[i], months }
  })
}

/* ---------------------------------------------------------------
 * Phần 3: nước - nhu cầu của cây (FAO) trừ mưa trong các tháng của vụ (NASA POWER)
 * --------------------------------------------------------------- */
// Các tháng mùa khô của huyện: mưa trung bình < dryMonthMm. Thanh "mưa mùa khô" chỉ đổi mưa của các tháng này.
export function dryMonths(climate) {
  return climate.filter((c) => c.rainMm.mean < ROTATION_PARAMS.dryMonthMm).map((c) => c.month)
}

function seasonRain(months, climate, stat, whatIf) {
  const dry = dryMonths(climate)
  return months.reduce((sum, m) => {
    const factor = dry.includes(m) ? 1 + whatIf.dryRainPct / 100 : 1
    return sum + climate[m - 1].rainMm[stat] * factor
  }, 0)
}

function seasonDetails(rotation, windows, climate, whatIf) {
  return windows.map((w, i) => {
    const crop = rotation.crops[i]
    const info = ROTATION_CROPS[crop]
    // Giả định nhiệt độ: nhu cầu nước vụ × (ET0 mới / ET0 gốc) cộng trên các tháng của vụ (blueprint 4.3).
    const et0Factor = whatIf.et0 ? w.months.reduce((s, m) => s + whatIf.et0.adj[m - 1], 0) / w.months.reduce((s, m) => s + whatIf.et0.base[m - 1], 0) : 1
    const needMm = mid(info.waterMm) * et0Factor
    const rainMm = seasonRain(w.months, climate, 'mean', whatIf)
    const rainDryMm = seasonRain(w.months, climate, 'p10', whatIf) // năm khô: mưa mỗi tháng ở mức p10
    const rootWetness = w.months.reduce((s, m) => s + climate[m - 1].rootWetness.mean, 0) / w.months.length
    const hotDays = w.months.reduce((s, m) => s + climate[m - 1].hotDays.mean, 0)
    return {
      season: w.season,
      crop,
      months: w.months,
      needMm,
      rainMm: round(rainMm),
      rainDryMm: round(rainDryMm),
      extraMm: round(Math.max(0, needMm - rainMm)), // nước cần tưới thêm, năm bình thường
      extraDryMm: round(Math.max(0, needMm - rainDryMm)), // nước cần tưới thêm, năm khô
      windowDays: round(w.months.length * 30.4),
      rootWetness: Math.round(rootWetness * 100) / 100,
      hotDays: Math.round(hotDays * 10) / 10,
    }
  })
}

/* ---------------------------------------------------------------
 * Phần 4: đất và thu nhập - từ thuộc tính cây trồng và thí nghiệm Linh et al.
 * --------------------------------------------------------------- */
function soilPoints(rotation) {
  const reasons = []
  let points = 0
  rotation.crops.forEach((crop, i) => {
    const info = ROTATION_CROPS[crop]
    const season = SEASONS[i]
    if (info.upland) {
      points += 1
      reasons.push({ code: 'soilUpland', season, crop, src: 'linh2014' })
    }
    if (info.legume) {
      points += 1
      reasons.push({ code: 'soilLegume', season, crop, src: info.legumeSrc })
    }
    if (info.rootM[1] > ROTATION_CROPS.rice.rootM[1]) {
      points += 1
      reasons.push({ code: 'soilDeepRoot', season, crop, rootM: info.rootM, riceRootM: ROTATION_CROPS.rice.rootM, src: info.rootSrc })
    }
  })
  if (points === 0) reasons.push({ code: 'soilMonoculture', src: 'linh2014' })
  return { points, reasons }
}

function incomeRatio(rotation) {
  if (rotation.baseline) return { ratio: 1, reasons: [{ code: 'incomeBaseline', src: 'linh2015' }] }
  return {
    ratio: PROFIT_RATIO_UPLAND.low,
    reasons: [{ code: 'incomeTrial', low: PROFIT_RATIO_UPLAND.low, high: PROFIT_RATIO_UPLAND.high, src: PROFIT_RATIO_UPLAND.src }],
  }
}

/* ---------------------------------------------------------------
 * Phần 5: đổi số đo thành điểm 0–100 (so sánh giữa 4 kiểu trong cùng huyện)
 * --------------------------------------------------------------- */
// Càng thấp càng tốt (nước cần tưới): điểm = 100 x (giá trị tốt nhất / giá trị này).
// Không dùng "tốt nhất = 100, kém nhất = 0" vì cách đó biến chênh lệch 6% thành 100 điểm.
function scaleLowerBetter(values) {
  const best = Math.min(...values)
  return values.map((v) => (v === 0 ? 100 : round((100 * best) / v)))
}
// Càng cao càng tốt, tỉ lệ thuận với giá trị cao nhất (đất, thu nhập).
function scaleProportional(values) {
  const max = Math.max(...values)
  return values.map((v) => (max === 0 ? 0 : round((100 * v) / max)))
}

/* ---------------------------------------------------------------
 * Phần 6: độ tin cậy, khoảng trống thông tin, rủi ro cần địa phương xem xét
 * --------------------------------------------------------------- */
export function calendarConfidence(sensitivity) {
  const width = sensitivity.max - sensitivity.min
  if (width <= ROTATION_PARAMS.calendarHigh) return 'high'
  if (width <= ROTATION_PARAMS.calendarMedium) return 'medium'
  return 'low'
}

function confidenceFor(rotation, calendarLevel, sensitivity) {
  let level = LEVELS.indexOf(calendarLevel)
  const reasons = [{ code: 'confCalendar', level: calendarLevel, min: sensitivity.min, max: sensitivity.max }]
  if (!rotation.baseline) {
    level = Math.min(level, 1)
    reasons.push({ code: 'confOneTrial', src: 'linh2014' })
  }
  if (rotation.crops.includes('mungbean')) {
    level = Math.max(0, level - 1)
    reasons.push({ code: 'confMungbeanProxy', src: 'faoManual3' })
  }
  return { level: LEVELS[level], reasons }
}

function gapsFor(rotation) {
  const gaps = [{ code: 'gapPrices' }, { code: 'gapRainEffective' }, { code: 'gapRicePaddyWater' }]
  if (!rotation.baseline) gaps.push({ code: 'gapOneSite', src: 'linh2014' })
  if (rotation.crops.includes('mungbean')) gaps.push({ code: 'gapMungbeanSalinity', src: 'fao29' })
  return gaps
}

function reviewRisksFor(details) {
  const risks = []
  for (const d of details) {
    const info = ROTATION_CROPS[d.crop]
    if (d.windowDays < info.cycleDays[0]) {
      risks.push({ code: 'riskCycleFit', season: d.season, crop: d.crop, windowDays: d.windowDays, cycleDays: info.cycleDays, src: info.cycleSrc })
    }
    if (info.upland && d.rootWetness >= ROTATION_PARAMS.wetRootFlag) {
      risks.push({ code: 'riskWaterlogging', season: d.season, crop: d.crop, rootWetness: d.rootWetness, flag: ROTATION_PARAMS.wetRootFlag })
    }
    if (info.salinityEce !== null && info.salinityEce < ROTATION_CROPS.rice.salinityEce) {
      risks.push({ code: 'riskSalinity', season: d.season, crop: d.crop, ece: info.salinityEce, riceEce: ROTATION_CROPS.rice.salinityEce, src: info.salinitySrc })
    }
  }
  return risks
}

/* ---------------------------------------------------------------
 * Phần 7: hàm chính
 * --------------------------------------------------------------- */
export function rankRotations({ climate, peakDays, sensitivity, priorities = DEFAULT_PRIORITIES, whatIf = DEFAULT_WHAT_IF }) {
  const windows = seasonWindows(peakDays)
  if (!windows) return { rankable: false, reason: { code: 'noThreeSeasons', peaks: peakDays?.length ?? 0 } }
  const calLevel = calendarConfidence(sensitivity)

  // 1. Số đo thô cho từng kiểu luân canh
  const raw = ROTATIONS.map((rotation) => {
    const details = seasonDetails(rotation, windows, climate, whatIf)
    const extra = details.reduce((s, d) => s + d.extraMm, 0)
    const extraDry = details.reduce((s, d) => s + d.extraDryMm, 0)
    return { rotation, details, extra, dryPenalty: extraDry - extra, soil: soilPoints(rotation), income: incomeRatio(rotation) }
  })

  // 2. Đổi sang điểm 0–100
  const water = scaleLowerBetter(raw.map((r) => r.extra))
  const risk = scaleLowerBetter(raw.map((r) => r.dryPenalty))
  const soil = scaleProportional(raw.map((r) => r.soil.points))
  const income = scaleProportional(raw.map((r) => r.income.ratio))

  // 3. Trọng số từ thanh trượt ưu tiên (tất cả = 0 thì coi như bằng nhau)
  const keys = ['water', 'soil', 'income', 'risk']
  const sumW = keys.reduce((s, k) => s + priorities[k], 0)
  const weight = (k) => (sumW === 0 ? 1 / keys.length : priorities[k] / sumW)

  const rotations = raw.map((r, i) => {
    const scores = { water: water[i], soil: soil[i], income: income[i], risk: risk[i] }
    const contributions = Object.fromEntries(keys.map((k) => [k, Math.round(scores[k] * weight(k) * 10) / 10]))
    const total = round(keys.reduce((s, k) => s + scores[k] * weight(k), 0))
    return {
      id: r.rotation.id,
      crops: r.rotation.crops,
      baseline: !!r.rotation.baseline,
      scores,
      total,
      contributions, // điểm tổng = cộng các phần này (trước khi làm tròn)
      measures: { extraMm: r.extra, dryPenaltyMm: r.dryPenalty, soilPoints: r.soil.points, profitRatio: r.income.ratio },
      reasons: {
        water: r.details.map((d) => ({ code: 'waterSeason', ...d, src: ['faoManual3', 'power'] })),
        soil: r.soil.reasons,
        income: r.income.reasons,
        risk: [{ code: 'riskDryYear', extraMm: r.extra, extraDryMm: r.extra + r.dryPenalty, penaltyMm: r.dryPenalty, src: 'power' }],
      },
      confidence: confidenceFor(r.rotation, calLevel, sensitivity),
      gaps: gapsFor(r.rotation),
      reviewRisks: reviewRisksFor(r.details),
    }
  })

  return {
    rankable: true,
    windows,
    calendarConfidence: calLevel,
    rotations: [...rotations].sort((a, b) => b.total - a.total),
  }
}
