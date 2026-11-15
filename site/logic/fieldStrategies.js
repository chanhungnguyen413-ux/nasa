// Đánh giá và xếp hạng BA chiến lược luân canh gắn trực tiếp với MẢNH ĐẤT đang xem (Guide §4, §6.1, §8.2, §9.2).
// Hàm thuần, nơi tính toán duy nhất cho trang workspace: tái dùng rankRotations, pickStrategies, suitAssess,
// KHÔNG chép lại hay nhân đôi quy tắc nông học.
import { evIsMissing } from '../core/evidence.js'
import { geoNearestPlace, GEO_PARAMS } from './geometry.js'
import { mekongFindProvince } from '../data/mekongBoundaries.js'
import { hzDistanceM } from '../core/harmonize.js'
import { DEFAULT_PRIORITIES, rankRotations, ROTATION_PARAMS, seasonWindows } from './rotation.js'
import { districtInputs } from './rotationInputs.js'
import { pickStrategies } from './strategies.js'
import { suitAssess, suitWindow } from './suitability.js'
import { ROTATIONS } from '../data/rotationCrops.js'
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'

export const FIELD_CHANGE_ANSWERS = ['yes', 'partial', 'no']

// Ngưỡng DO NHÓM CHỌN: chênh lệch điểm tổng <= mức này giữa hai phương án đạt điều kiện thì gắn cờ "gần nhau / đánh đổi".
export const FIELD_STRAT_PARAMS = {
  closeTotalGap: 5, // do nhóm chọn
  districtRadiusKm: GEO_PARAMS.districtRadiusKm, // do nhóm chọn
  // Do nhóm chọn (KHÔNG phải số của FAO): ECe đo tại ruộng gấp hơn 2 lần ngưỡng 100% năng suất FAO-29 thì loại phương án.
  // Vì sao: suitability.js chỉ cho mặn tối đa mức Vàng; ở mức gấp đôi ngưỡng, bảng FAO-29 đã cho thấy năng suất giảm mạnh.
  severeSalinityFactor: 2.0,
  // Do nhóm chọn: mỗi vụ bị Vàng (cần lưu ý tại thửa) trừ chừng này điểm ưu tiên, để phương án hợp đất/nước hơn lên trên.
  yellowSeasonPenalty: 6,
  // Do nhóm chọn: khi không có lịch NDVI, 3 vụ tham chiếu bắt đầu cách nhau chừng này tháng (chỉ để gợi ý cây thay thế).
  refSeasonGapMonths: 4,
}

// Tiêu chí bị Đỏ → mã ràng buộc chặn cứng (phương án không trồng được trên thửa này).
const FS_RED_TO_CONSTRAINT = { water: 'waterRed', ph: 'phRed', temperature: 'tempRed', cycle: 'cycleRed' }
const FS_SEASON_IDS = ['dx', 'ht', 'td']

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

// Lấy số ECe (dS/m) từ số thường hoặc Evidence; chưa đo / không phải kiểu ECe → null (không quy đổi, không đoán).
function fsEceValue(salinityEce, salinityType) {
  if (salinityType && salinityType !== 'ece') return null
  if (salinityEce == null) return null
  if (typeof salinityEce === 'object') return evIsMissing(salinityEce) ? null : salinityEce.value
  return salinityEce
}

/**
 * Các yếu tố chặn cứng tại thửa: tiêu chí Đỏ (nước, pH, nhiệt, độ dài vụ) và mặn nặng (ECe > ngưỡng FAO-29 × hệ số).
 * Trả về { constraints: [mã...], severeSalinity: boolean }.
 */
function fsHardConstraints(crops, assessments, salinityEce, salinityType) {
  const constraints = []
  for (const a of assessments) {
    if (!a?.known) continue
    for (const c of a.criteria) {
      const code = c.grade === 'red' ? FS_RED_TO_CONSTRAINT[c.key] : null
      if (code && !constraints.includes(code)) constraints.push(code)
    }
  }
  const ece = fsEceValue(salinityEce, salinityType)
  const severeSalinity = ece != null && crops.some((crop) => {
    const limit = CROP_LIBRARY[crop]?.salinityEce
    return limit != null && ece > limit * FIELD_STRAT_PARAMS.severeSalinityFactor
  })
  if (severeSalinity) constraints.push('salinityRed')
  return { constraints, severeSalinity }
}

// Số vụ cần lưu ý (có tiêu chí Vàng) — dùng để trừ điểm ưu tiên cho sát điều kiện thửa.
const fsYellowCount = (assessments) => assessments.filter((a) => a?.known && (a.overall === 'yellow' || a.criteria.some((c) => c.grade === 'yellow'))).length

/**
 * Gợi ý nhiều cây thay thế cho từng vụ: chấm cả 9 cây của thư viện bằng suitAssess trên đúng thửa này.
 * windows: lịch NDVI (3 vụ) nếu có; không có thì dùng 3 vụ tham chiếu từ sowingMonth (cửa sổ theo chu kỳ FAO của cây).
 * Trả về [{ season, months, source, greenCrops, yellowCrops, redCrops, grayCrops }] × 3, hoặc null khi chưa có khí hậu.
 */
export function fsSeasonAlternatives({ windows = null, sowingMonth = 1, climate, irrigation = null, salinityEce = null, salinityType = null, floodMarks = null, ph = null }) {
  if (!climate?.months || climate.months.length !== 12) return null
  const useNdvi = Array.isArray(windows) && windows.length === 3
  return FS_SEASON_IDS.map((season, i) => {
    const ndviWindow = useNdvi ? windows[i] : null
    const start = ((sowingMonth - 1 + i * FIELD_STRAT_PARAMS.refSeasonGapMonths) % 12) + 1
    const months = useNdvi ? ndviWindow.months : Array.from({ length: FIELD_STRAT_PARAMS.refSeasonGapMonths }, (_, k) => ((start - 1 + k) % 12) + 1)
    const out = { season: ndviWindow?.season ?? season, months, source: useNdvi ? 'ndvi' : 'sowing', greenCrops: [], yellowCrops: [], redCrops: [], grayCrops: [] }
    for (const crop of CROP_LIB_IDS) {
      const window = useNdvi ? suitWindow({ ndviWindow, crop }) : suitWindow({ sowingMonth: start, crop })
      const a = suitAssess({ crop, window, climate, irrigation, salinityEce, salinityType, floodMarks, ph })
      const item = {
        crop,
        limiting: a.limiting ?? [],
        reasons: (a.criteria ?? []).filter((c) => c.grade === 'red' || c.grade === 'yellow').map((c) => ({ key: c.key, grade: c.grade, reason: c.reason })),
      }
      if (a.overall === 'green') out.greenCrops.push(item)
      else if (a.overall === 'yellow') out.yellowCrops.push(item)
      else if (a.overall === 'red') out.redCrops.push(item)
      else out.grayCrops.push(item)
    }
    return out
  })
}

/**
 * Xác định huyện lịch vụ cho tọa độ đang chọn:
 *   - chọn trực tiếp 1 trong 5 huyện → 'direct'
 *   - nằm trong bán kính districtRadiusKm của 1 huyện → 'borrowed' (ghi rõ là lịch cấp huyện)
 *   - ngoài vùng → 'none'
 */
export function fsCalendarSource(loc, provinces, radiusKm = FIELD_STRAT_PARAMS.districtRadiusKm, provinceCal = null) {
  if (!loc) return { mode: 'none', districtId: null, distanceKm: null }
  if (loc.id) {
    // Vườn vẽ trên bản đồ có thể mang sẵn id huyện gần nhất dù ở rất xa: chỉ tin id khi tọa độ trùng tâm huyện
    // (hoặc id không có trong danh sách để so); còn lại đo khoảng cách thật như mọi tọa độ khác.
    const match = provinces.find((p) => p.id === loc.id)
    if (!match || (Math.abs(match.lat - loc.lat) < 1e-3 && Math.abs(match.lon - loc.lon) < 1e-3)) {
      return { mode: 'direct', districtId: loc.id, distanceKm: 0 }
    }
  }
  const near = geoNearestPlace([loc.lat, loc.lon], provinces, radiusKm)
  if (!near) {
    // Lịch vụ cấp tỉnh: chỉ khi thửa nằm TRONG ranh một tỉnh có lịch hợp lệ (không mượn tỉnh bên cạnh).
    const inside = provinceCal ? mekongFindProvince(loc.lat, loc.lon) : null
    const prov = inside ? provinceCal.find((p) => p.code === inside.code) : null
    if (prov) return { mode: 'province', districtId: prov.id, distanceKm: Math.round(hzDistanceM([loc.lat, loc.lon], [prov.lat, prov.lon]) / 100) / 10, provinceName: prov.name }
    return { mode: 'none', districtId: null, distanceKm: null }
  }
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
  const calendar = fsCalendarSource(loc, provinces, undefined, precomputed?.provinceCal ?? null)
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
      const risk = fsRiskFromAssessments(assessments)
      const { missingFields, localRisks } = risk
      let { riskLevel } = risk
      const unmetConstraints = []
      if (!isBaseline && cropChange === 'no') unmetConstraints.push('noCropChange')
      // Chỉ xét chặn cứng khi đã có khí hậu và câu trả lời nước tưới (thiếu thì là "thiếu dữ liệu", không phải "không hợp").
      if (climate && irrigation) {
        const hard = fsHardConstraints(p.rot.crops, assessments, salinityEce, salinityType)
        unmetConstraints.push(...hard.constraints)
        if (hard.severeSalinity) riskLevel = 'high'
      }
      let eligibility = 'eligible'
      if (unmetConstraints.length) eligibility = 'ineligible'
      else if (!climate || !irrigation) {
        eligibility = 'insufficient_data'
        if (!climate && !missingFields.includes('climate')) missingFields.push('climate')
        if (!irrigation && !missingFields.includes('irrigation')) missingFields.push('irrigation')
      }
      // Điểm ưu tiên sát thửa: điểm tổng của trang Luân canh trừ phạt mỗi vụ cần lưu ý (Vàng) trên thửa này.
      const score = eligibility === 'eligible'
        ? Math.max(0, Math.round(p.rot.total - fsYellowCount(assessments) * FIELD_STRAT_PARAMS.yellowSeasonPenalty))
        : null
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
        score,
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
      seasonAlternatives: fsSeasonAlternatives({ windows, climate, irrigation, salinityEce, salinityType, floodMarks, ph }),
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
    const risk = fsRiskFromAssessments(assessments)
    const { missingFields, localRisks } = risk
    let { riskLevel } = risk
    if (!missingFields.includes('ndviCalendar')) missingFields.unshift('ndviCalendar')
    const unmetConstraints = !isBaseline && cropChange === 'no' ? ['noCropChange'] : []
    // Không có lịch NDVI thì độ dài vụ luôn Xám, nhưng pH/nhiệt/nước/mặn nặng vẫn đủ để biết "không hợp thửa này".
    if (climate && irrigation) {
      const hard = fsHardConstraints(rot.crops, assessments, salinityEce, salinityType)
      unmetConstraints.push(...hard.constraints)
      if (hard.severeSalinity) riskLevel = 'high'
    }
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
    seasonAlternatives: fsSeasonAlternatives({ sowingMonth: 1, climate, irrigation, salinityEce, salinityType, floodMarks, ph }),
  }
}

/** Khóa đầu vào chuẩn để phát hiện kết quả cũ khi người dùng đổi thông tin ruộng/điều kiện (Guide §11). */
export function fsInputKey({ loc, polygon, season, sowing, irrigation, cropChange, currentId, priorities, whatIf, soilCount = 0, markCount = 0, gardenId = '', ec = null, ecType = null, ph = null, soilType = null, climateKey = '' }) {
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
    gardenId,
    ec,
    ecType,
    ph,
    soilType,
    climateKey,
  ])
}
