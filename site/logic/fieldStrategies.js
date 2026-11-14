// Đánh giá và xếp hạng BA chiến lược luân canh gắn trực tiếp với MẢNH ĐẤT đang xem (Guide §4, §6.1, §8.2, §9.2).
// Hàm thuần, nơi tính toán duy nhất cho trang workspace: tái dùng rankRotations, pickStrategies, suitAssess,
// KHÔNG chép lại hay nhân đôi quy tắc nông học.
import { evIsMissing } from '../core/evidence.js'
import { geoNearestPlace, GEO_PARAMS } from './geometry.js'
import { DEFAULT_PRIORITIES, rankRotations, ROTATION_PARAMS, seasonWindows } from './rotation.js'
import { districtInputs } from './rotationInputs.js'
import { pickStrategies } from './strategies.js'
import { suitAssess, suitWindow } from './suitability.js'
import { ROTATIONS } from '../data/rotationCrops.js'

export const FIELD_CHANGE_ANSWERS = ['yes', 'partial', 'no']

// Ngưỡng DO NHÓM CHỌN: chênh lệch điểm tổng <= mức này giữa hai phương án đạt điều kiện thì gắn cờ "gần nhau / đánh đổi".
export const FIELD_STRAT_PARAMS = {
  closeTotalGap: 5, // do nhóm chọn
  districtRadiusKm: GEO_PARAMS.districtRadiusKm, // do nhóm chọn
}

const GRADE_TO_RISK = { red: 'high', yellow: 'conditional', green: 'lower', gray: 'unknown' }
const RISK_ORDER = ['lower', 'conditional', 'high']

function fsClimateForRotations(climate) {
  if (!climate?.months || climate.months.length !== 12) return null
  if (climate.months.some((m) => evIsMissing(m.rain) || evIsMissing(m.rainDry) || evIsMissing(m.gwetroot))) return null
  return climate.months.map((m) => ({
    month: m.month,
    rainMm: { mean: m.rain.value, p10: m.rainDry.value },
    rootWetness: { mean: m.gwetroot.value },
    hotDays: { mean: 0 },
  }))
}

function fsRiskFromAssessments(assessments) {
  let worst = null
  const missingFields = new Set()
  const localRisks = []
  for (const a of assessments) {
    if (!a?.known) continue
    if (a.overall !== 'gray') {
      const r = GRADE_TO_RISK[a.overall]
      if (!worst || RISK_ORDER.indexOf(r) > RISK_ORDER.indexOf(worst)) worst = r
    }
    for (const c of a.criteria) {
      if (c.grade === 'gray') {
        if (c.reason === 'needIrrigationAnswer') missingFields.add('irrigation')
        else if (c.reason === 'missingClimate') missingFields.add('climate')
        else if (c.reason === 'salinityNeedMeasure' || c.reason === 'salinityNotEce') missingFields.add('salinityEce')
        else if (c.reason === 'phNeedMeasure') missingFields.add('ph')
        else if (c.reason === 'cycleNoCalendar') missingFields.add('ndviCalendar')
      } else if (c.grade === 'yellow' || c.grade === 'red') {
        localRisks.push({ crop: a.crop, season: a.window?.season ?? null, criterion: c.key, grade: c.grade, reason: c.reason })
      }
    }
  }
  return { riskLevel: worst ?? 'unknown', missingFields: [...missingFields], localRisks }
}

/**
 * Xác định huyện lịch vụ cho tọa độ đang chọn:
 *   - chọn trực tiếp 1 trong 5 huyện → 'direct'
 *   - nằm trong bán kính districtRadiusKm của 1 huyện → 'borrowed' (ghi rõ là lịch cấp huyện)
 *   - ngoài vùng → 'none'
 */
export function fsCalendarSource(loc, provinces, radiusKm = FIELD_STRAT_PARAMS.districtRadiusKm) {
  if (!loc) return { mode: 'none', districtId: null, distanceKm: null }
  if (loc.id) return { mode: 'direct', districtId: loc.id, distanceKm: 0 }
  const near = geoNearestPlace([loc.lat, loc.lon], provinces, radiusKm)
  if (!near) return { mode: 'none', districtId: null, distanceKm: null }
  return { mode: 'borrowed', districtId: near.id, distanceKm: Math.round(near.km * 10) / 10 }
}

/**
 * Đánh giá 3 chiến lược cho mảnh đất:
 *   { loc, provinces, precomputed, climate, irrigation, soil, floodMarks, ph, salinityEce, salinityType,
 *     cropChange, currentId, priorities, whatIf, et0Pair }
 * Trả về { evaluated, evaluationId, calendar, baseRankable, strategies: [StrategyAssessment × 3], nearTie, noteCodes }.
 */
export function fsAssessField({
  loc,
  provinces = [],
  precomputed,
  climate = null,
  irrigation = null,
  salinityEce = null,
  salinityType = null,
  floodMarks = null,
  ph = null,
  cropChange = 'yes',
  currentId = 'A',
  priorities = DEFAULT_PRIORITIES,
  whatIf = { rainPct: 0 },
  et0Pair = null,
  evaluationId = null,
}) {
  if (!loc) return { evaluated: false, reason: 'noLocation', strategies: [] }
  const calendar = fsCalendarSource(loc, provinces)
  const inputs = calendar.districtId && precomputed ? districtInputs(precomputed, calendar.districtId) : null
  const rotClimate = fsClimateForRotations(climate) ?? inputs?.climate ?? null
  const rotResult = inputs && rotClimate
    ? rankRotations({
        climate: rotClimate,
        peakDays: inputs.peakDays,
        sensitivity: inputs.sensitivity,
        priorities,
        whatIf: { dryRainPct: whatIf.rainPct ?? 0, et0: et0Pair ?? undefined },
      })
    : null

  // Trường hợp 1: có lịch 3 vụ NDVI hợp lệ → dùng đúng rankRotations + pickStrategies rồi nối đánh giá từng cây tại ruộng.
  if (rotResult?.rankable) {
    const picks = pickStrategies(rotResult, currentId)
    const windows = rotResult.windows
    const strategies = picks.map((p) => {
      const isBaseline = p.rot.id === currentId
      const assessments = climate
        ? p.rot.crops.map((crop, i) =>
            suitAssess({
              crop,
              window: suitWindow({ ndviWindow: windows[i], crop }),
              climate,
              irrigation,
              salinityEce,
              salinityType,
              floodMarks,
              ph,
            }),
          )
        : []
      const { riskLevel, missingFields, localRisks } = fsRiskFromAssessments(assessments)
      const unmetConstraints = []
      let eligibility = 'eligible'
      if (!isBaseline && cropChange === 'no') {
        eligibility = 'ineligible'
        unmetConstraints.push('noCropChange')
      } else if (!climate || !irrigation) {
        eligibility = 'insufficient_data'
        if (!climate && !missingFields.includes('climate')) missingFields.push('climate')
        if (!irrigation && !missingFields.includes('irrigation')) missingFields.push('irrigation')
      }
      return {
        strategyId: p.rot.id,
        kind: p.kind,
        alsoWins: p.alsoWins ?? null,
        runnerUp: Boolean(p.runnerUp),
        isBaseline,
        crops: p.rot.crops,
        windows,
        eligibility,
        riskLevel,
        rank: null,
        score: eligibility === 'eligible' ? p.rot.total : null,
        metric: p.metric,
        rot: p.rot,
        assessments,
        unmetConstraints,
        missingFields,
        localRisks,
      }
    })

    // Xếp hạng CHỈ trong các phương án 'eligible'; phương án 'ineligible' / 'insufficient_data' giữ rank: null (Guide §8.2).
    const eligible = strategies.filter((s) => s.eligibility === 'eligible').sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    eligible.forEach((s, idx) => { s.rank = idx + 1 })
    const nearTie = eligible.length >= 2 && Math.abs((eligible[0].score ?? 0) - (eligible[1].score ?? 0)) <= FIELD_STRAT_PARAMS.closeTotalGap

    return {
      evaluated: true,
      evaluationId,
      calendar,
      baseRankable: true,
      strategies,
      rotResult,
      nearTie,
    }
  }

  // Trường hợp 2: Ngoài 5 huyện hoặc huyện không có lịch 3 vụ (như Chợ Lách) → vẫn hiện đủ 3 chiến lược minh họa,
  // đánh giá những tiêu chí khí hậu/đất/úng hiện có, gắn insufficient_data và rank: null (Guide §4 & §8.2).
  const fallbackIds = [currentId, ...['B', 'C', 'D'].filter((id) => id !== currentId)].slice(0, 3)
  const fallbackKinds = ['base', 'water', 'soil']
  const strategies = fallbackIds.map((id, idx) => {
    const rot = ROTATIONS.find((r) => r.id === id) ?? ROTATIONS[idx]
    const isBaseline = rot.id === currentId
    const assessments = climate
      ? rot.crops.map((crop) =>
          suitAssess({
            crop,
            window: suitWindow({ sowingMonth: 1, crop }),
            climate,
            irrigation,
            salinityEce,
            salinityType,
            floodMarks,
            ph,
          }),
        )
      : []
    const { riskLevel, missingFields, localRisks } = fsRiskFromAssessments(assessments)
    if (!missingFields.includes('ndviCalendar')) missingFields.unshift('ndviCalendar')
    const unmetConstraints = !isBaseline && cropChange === 'no' ? ['noCropChange'] : []
    return {
      strategyId: rot.id,
      kind: fallbackKinds[idx],
      alsoWins: null,
      runnerUp: false,
      isBaseline,
      crops: rot.crops,
      windows: null,
      eligibility: unmetConstraints.length ? 'ineligible' : 'insufficient_data',
      riskLevel,
      rank: null,
      score: null,
      metric: null,
      rot: null,
      assessments,
      unmetConstraints,
      missingFields,
      localRisks,
    }
  })

  return {
    evaluated: true,
    evaluationId,
    calendar,
    baseRankable: false,
    strategies,
    rotResult,
    nearTie: false,
  }
}

/** Khóa đầu vào chuẩn để phát hiện kết quả cũ khi người dùng đổi thông tin ruộng/điều kiện (Guide §11). */
export function fsInputKey({ loc, polygon, season, sowing, irrigation, cropChange, currentId, priorities, whatIf, soilCount = 0, markCount = 0 }) {
  return JSON.stringify([
    loc ? [Math.round(loc.lat * 1e4), Math.round(loc.lon * 1e4), loc.id ?? ''] : null,
    polygon ? polygon.map(([a, b]) => [Math.round(a * 1e5), Math.round(b * 1e5)]) : null,
    season,
    sowing,
    irrigation,
    cropChange,
    currentId,
    priorities,
    whatIf,
    soilCount,
    markCount,
  ])
}
