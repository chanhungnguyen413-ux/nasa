// Câu chữ VI/EN cho phần so sánh luân canh. Mỗi mã lý do (code) trong site/logic/rotation.js
// có đúng một câu ở đây, nên hai ngôn ngữ luôn dùng cùng một con số.
import { SOURCES } from '../data/rotationCrops.js'

export const ROT_TEXT = {
  vi: {
    locale: 'vi-VN',
    title: 'Nên luân canh thế nào trong ba vụ tới?',
    sub: 'So sánh bốn kiểu luân canh cho từng huyện, dựa trên lịch vụ suy từ ảnh vệ tinh MODIS, khí hậu 25 năm của NASA POWER và một thí nghiệm 10 năm ở ĐBSCL.',
    districtLabel: 'Chọn huyện',
    termsLabel: 'Bấm để hiểu:',
    calendarLead: 'Lịch vụ suy từ NDVI',
    levels: { high: 'Tin cậy cao', medium: 'Tin cậy trung bình', low: 'Tin cậy thấp' },
    seasons: { dx: 'Đông Xuân', ht: 'Hè Thu', td: 'Thu Đông' },
    crops: { rice: 'lúa', mungbean: 'đậu xanh', maize: 'ngô' },
    criteria: { water: 'Tiết kiệm nước', soil: 'Cải tạo đất', income: 'Thu nhập', risk: 'Ít rủi ro năm khô' },
    months: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    total: 'Điểm tổng',
    rank: (n) => `Hạng ${n}`,
    rankTied: (n) => `Đồng hạng ${n}`,
    baseline: 'Cách đang làm',
    stripTitle: 'Một năm trên ruộng: 12 tháng',
    stripSub: 'Mỗi cột là một tháng. Cột tô vàng là tháng dễ tổn thương: vừa khô vừa nóng.',
    stripRows: { season: 'Vụ (từ NDVI)', ndvi: 'NDVI', rain: 'Mưa (mm)', hot: 'Ngày ≥ 35 °C', wet: 'Ẩm vùng rễ (0–1)' },
    seasonShort: { dx: 'ĐX', ht: 'HT', td: 'TĐ' },
    peakTag: 'đỉnh',
    bareTag: 'trống',
    vulnerableTag: 'Dễ tổn thương',
    rainRange: (p10, p90) => `8 trên 10 năm: ${p10}–${p90} mm`,
    noCalendar: 'chưa rõ',
    stripNoteCalendar: 'Lịch vụ và NDVI: MODIS MOD13Q1, 2021–2025 (trung vị theo tháng của NDVI đã làm mượt). “đỉnh” = tháng NDVI cao nhất của vụ. ĐX = Đông Xuân, HT = Hè Thu, TĐ = Thu Đông.',
    stripNoteBare: (share) => `“trống” = ít nhất ${share}% số ảnh của tháng có NDVI dưới 0,3: ruộng trống, vừa gặt hoặc đang ngập (nước cũng cho NDVI thấp).`,
    stripNoteClimate: 'Khí hậu: NASA POWER 2001–2025, trung bình 25 năm (ước tính mô hình trên ô lưới khoảng nửa độ, không phải số đo tại ruộng). Rê chuột vào ô mưa để xem khoảng dao động.',
    stripNoteVulnerable: (mm, days) => `Dễ tổn thương = tháng mưa trung bình dưới ${mm} mm và có từ ${days} ngày ≥ 35 °C trở lên. Đây là ngưỡng nhóm tự chọn; cần chuyên gia địa phương xác nhận.`,
    prioritiesTitle: 'Điều gì quan trọng nhất với bạn?',
    prioritiesHint: 'Kéo để đổi mức ưu tiên (0 = không quan tâm). Thứ hạng và phần đóng góp “+” cập nhật ngay.',
    resetWeights: 'Đặt lại bằng nhau',
    whatIfTitle: 'Thử giả định',
    dryRainLabel: 'Mưa mùa khô thay đổi',
    dryRainHint: (months) => `Áp dụng cho các tháng mưa trung bình dưới 100 mm ở huyện này: ${months}. Ảnh hưởng đến điểm nước và điểm rủi ro.`,
    resetWhatIf: 'Bỏ giả định',
    whatIfActive: (pct) => `Mưa mùa khô ${pct > 0 ? '+' : ''}${pct}%: các con số mưa và nước bên dưới đã đổi theo.`,
    scoreNote: 'Điểm 0–100 so sánh bốn kiểu trong cùng một huyện, không phải dự báo năng suất. Số “+” là phần đóng góp vào điểm tổng.',
    parts: { why: 'Vì sao đề xuất', evidence: 'Bằng chứng', benefits: 'Lợi ích', gaps: 'Khoảng trống thông tin', risks: 'Rủi ro cần địa phương xem xét' },
    confidence: 'Độ tin cậy',
    sourcesLabel: 'Nguồn',
    footnote: 'Công cụ hỗ trợ, không thay thế nhận định của nông dân và cán bộ khuyến nông. Mỗi con số đều có nguồn hoặc ghi rõ là ước tính.',
    notRankable: (name, peaks) => `${name}: ảnh NDVI không cho thấy lịch ba vụ rõ ràng (chỉ thấy ${peaks} đỉnh mỗi năm). Điểm lấy mẫu có thể không phải ruộng lúa, nên chưa so sánh luân canh ở đây. Cần người địa phương xác nhận.`,

    whyBaseline: 'Đây là cách đang làm (lúa ba vụ), dùng làm mốc để so sánh.',
    whySwap: (x) => `Thay lúa vụ ${x.season} bằng ${x.crop}.`,
    whyDrivers: (x) => `Điểm tổng chủ yếu đến từ: ${x.first} và ${x.second}.`,

    waterSeason: (x) => `Vụ ${x.season} (${x.months}): ${x.crop} cần khoảng ${x.need} mm nước; mưa trung bình ${x.rain} mm → tưới thêm khoảng ${x.extra} mm.`,
    riskDryYear: (x) => `Năm khô (mưa mỗi tháng ở mức thấp nhất 1 trong 10 năm): cần tưới thêm khoảng ${x.dry} mm, nhiều hơn năm bình thường ${x.penalty} mm.`,
    evidenceTrial: () => 'Thí nghiệm 10 năm ở Cai Lậy (Tiền Giang) so sánh đúng bốn kiểu này: luân canh với cây màu làm tăng chất hữu cơ, đạm dễ tiêu và cải thiện độ xốp của đất; năng suất lúa tăng 32–36% so với lúa ba vụ.',
    evidenceBaseline: () => 'Là nghiệm thức đối chứng (cách nông dân đang làm) trong thí nghiệm 10 năm ở Cai Lậy.',

    soilUpland: (x) => `Vụ ${x.season} trồng ${x.crop} (cây màu) cắt chuỗi độc canh lúa, giúp đất tơi xốp hơn.`,
    soilLegume: (x) => `${x.cropCap} là cây họ đậu: cố định đạm nhờ vi khuẩn nốt sần, một phần để lại cho vụ sau.`,
    soilDeepRoot: (x) => `Rễ ${x.crop} sâu tới ${x.root} m, sâu hơn lúa (${x.riceRoot} m).`,
    incomeTrial: (x) => `Trong thí nghiệm, lợi nhuận của nông dân tăng ${x.low}–${x.high} lần so với lúa ba vụ (chưa tách riêng từng kiểu; tính điểm theo mức thấp ${x.low}).`,
    benefitBaseline: () => 'Không phải thay đổi cách canh tác hiện tại.',
    benefitLessWater: (x) => `Ít hơn lúa ba vụ khoảng ${x.mm} mm nước tưới mỗi năm (ước tính).`,

    gapPrices: () => 'Chưa có giá thị trường hiện tại của lúa, đậu xanh, ngô; điểm thu nhập chỉ dựa trên thí nghiệm.',
    gapRainEffective: () => 'Coi toàn bộ mưa là cây dùng được; chưa trừ nước chảy tràn hay thấm sâu.',
    gapRicePaddyWater: () => 'Nhu cầu nước của lúa theo FAO chưa gồm nước làm đất và giữ ngập ruộng.',
    gapOneSite: () => 'Bằng chứng chỉ từ một điểm thí nghiệm trên đất phù sa sét; đất phèn, đất mặn chưa được kiểm chứng.',
    gapMungbeanSalinity: () => 'FAO-29 không có số liệu chịu mặn của đậu xanh.',
    gapDryYear: () => 'Năm khô được tính bằng cách cộng mức mưa thấp của từng tháng, nên khá bi quan.',

    riskCycleFit: (x) => `${x.cropCap} cần ${x.cycleMin}–${x.cycleMax} ngày (FAO) nhưng khung vụ ${x.season} chỉ khoảng ${x.window} ngày: cần giống ngắn ngày phù hợp.`,
    riskWaterlogging: (x) => `Vụ ${x.season}: độ ẩm vùng rễ trung bình ${x.wet} (ngưỡng nhắc ${x.flag}); ${x.crop} là cây màu, cần kiểm tra thoát nước.`,
    riskSalinity: (x) => `${x.cropCap} chịu mặn kém hơn lúa (ngưỡng ${x.ece} so với ${x.riceEce} dS/m): kiểm tra độ mặn đất và nước vụ ${x.season}.`,
    riskMonoculture: () => 'Độc canh lúa lâu năm làm đất chặt và giảm chất lượng đất (theo thí nghiệm ở Cai Lậy).',
    riskMoreWater: (x) => `Cần thêm khoảng ${x.mm} mm nước tưới mỗi năm so với lúa ba vụ.`,
    riskNoneFound: () => 'Chưa phát hiện rủi ro theo các luật hiện có; vẫn cần kiểm tra tại địa phương.',

    confCalendar: (x) => `Lịch vụ của huyện: số vụ/năm dao động ${x.min}–${x.max} khi đổi tham số phân tích.`,
    confOneTrial: () => 'Bằng chứng về đất và thu nhập chỉ từ một thí nghiệm.',
    confMungbeanProxy: () => 'Số liệu nước và thời gian sinh trưởng của đậu xanh mượn từ dòng “Bean” của FAO.',
  },
  en: {
    locale: 'en-GB',
    title: 'Which rotation for the next three seasons?',
    sub: 'Four rotations compared for each district, using a crop calendar read from MODIS satellite images, 25 years of NASA POWER climate and a 10-year trial in the Mekong Delta.',
    districtLabel: 'Choose a district',
    termsLabel: 'Tap to learn:',
    calendarLead: 'Crop calendar from NDVI',
    levels: { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' },
    seasons: { dx: 'Đông Xuân (winter–spring)', ht: 'Hè Thu (summer–autumn)', td: 'Thu Đông (autumn–winter)' },
    crops: { rice: 'rice', mungbean: 'mung bean', maize: 'maize' },
    criteria: { water: 'Saves water', soil: 'Improves soil', income: 'Income', risk: 'Low dry-year risk' },
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    total: 'Total score',
    rank: (n) => `Rank ${n}`,
    rankTied: (n) => `Joint rank ${n}`,
    baseline: 'Current practice',
    stripTitle: 'A year in the field: 12 months',
    stripSub: 'Each column is a month. Amber columns are vulnerable months: both dry and hot.',
    stripRows: { season: 'Season (from NDVI)', ndvi: 'NDVI', rain: 'Rain (mm)', hot: 'Days ≥ 35 °C', wet: 'Root-zone wetness (0–1)' },
    seasonShort: { dx: 'ĐX', ht: 'HT', td: 'TĐ' },
    peakTag: 'peak',
    bareTag: 'bare',
    vulnerableTag: 'Vulnerable',
    rainRange: (p10, p90) => `8 in 10 years: ${p10}–${p90} mm`,
    noCalendar: 'unclear',
    stripNoteCalendar: 'Season and NDVI: MODIS MOD13Q1, 2021–2025 (monthly median of smoothed NDVI). “peak” = the season’s greenest month. ĐX = Đông Xuân (winter–spring), HT = Hè Thu (summer–autumn), TĐ = Thu Đông (autumn–winter).',
    stripNoteBare: (share) => `“bare” = at least ${share}% of that month’s images have NDVI below 0.3: bare, just harvested or flooded (water also gives low NDVI).`,
    stripNoteClimate: 'Climate: NASA POWER 2001–2025, 25-year average (a model estimate on a grid of about half a degree, not a field measurement). Hover a rain cell to see the range.',
    stripNoteVulnerable: (mm, days) => `Vulnerable = average rain below ${mm} mm and at least ${days} days ≥ 35 °C. These thresholds are the team’s choice; local experts should confirm them.`,
    prioritiesTitle: 'What matters most to you?',
    prioritiesHint: 'Drag to change priorities (0 = not important). The ranking and the “+” shares update instantly.',
    resetWeights: 'Reset to equal',
    whatIfTitle: 'What if…?',
    dryRainLabel: 'Change in dry-season rain',
    dryRainHint: (months) => `Applies to months with average rain below 100 mm in this district: ${months}. It changes the water and risk scores.`,
    resetWhatIf: 'Clear what-if',
    whatIfActive: (pct) => `Dry-season rain ${pct > 0 ? '+' : ''}${pct}%: the rain and water numbers below have changed with it.`,
    scoreNote: 'Scores 0–100 compare the four rotations within one district; they are not yield forecasts. “+” is the share added to the total.',
    parts: { why: 'Why it is suggested', evidence: 'Evidence', benefits: 'Benefits', gaps: 'Information gaps', risks: 'Risks needing local review' },
    confidence: 'Confidence',
    sourcesLabel: 'Sources',
    footnote: 'Supports, and never replaces, the judgment of farmers and extension officers. Every number has a source or is marked as an estimate.',
    notRankable: (name, peaks) => `${name}: NDVI shows no clear three-crop calendar (only ${peaks} peak a year). The sampled area may not be rice paddy, so rotations are not compared here. Local confirmation needed.`,

    whyBaseline: 'This is current practice (three rice crops), used as the baseline.',
    whySwap: (x) => `Replace the ${x.season} rice crop with ${x.crop}.`,
    whyDrivers: (x) => `The total comes mainly from: ${x.first} and ${x.second}.`,

    waterSeason: (x) => `${x.season} (${x.months}): ${x.crop} needs about ${x.need} mm of water; average rain ${x.rain} mm → about ${x.extra} mm of irrigation.`,
    riskDryYear: (x) => `Dry year (each month at its 1-in-10 low rain): about ${x.dry} mm of irrigation, ${x.penalty} mm more than a normal year.`,
    evidenceTrial: () => 'A 10-year trial at Cai Lậy (Tiền Giang) compared exactly these four rotations: rotating with upland crops raised organic matter and available nitrogen and improved soil porosity; rice yield rose 32–36% over three rice crops.',
    evidenceBaseline: () => 'It was the control treatment (farmers’ practice) in the 10-year Cai Lậy trial.',

    soilUpland: (x) => `The ${x.season} ${x.crop} crop (upland crop) breaks the rice monoculture and loosens the soil.`,
    soilLegume: (x) => `${x.cropCap} is a legume: it fixes nitrogen through root-nodule bacteria, and part of it carries over to the next crop.`,
    soilDeepRoot: (x) => `${x.cropCap} roots reach ${x.root} m, deeper than rice (${x.riceRoot} m).`,
    incomeTrial: (x) => `In the trial, farmers’ profit rose ${x.low}–${x.high} times over three rice crops (not split by rotation; scored at the low end, ${x.low}).`,
    benefitBaseline: () => 'No change to current farming practice.',
    benefitLessWater: (x) => `About ${x.mm} mm less irrigation a year than three rice crops (estimate).`,

    gapPrices: () => 'No current market prices for rice, mung bean or maize; the income score rests on the trial only.',
    gapRainEffective: () => 'All rain is treated as usable by the crop; runoff and deep drainage are not subtracted.',
    gapRicePaddyWater: () => 'FAO rice water needs exclude water for land preparation and keeping the paddy flooded.',
    gapOneSite: () => 'Evidence comes from one trial site on alluvial clay; acid-sulphate and saline soils are not covered.',
    gapMungbeanSalinity: () => 'FAO-29 has no salinity values for mung bean.',
    gapDryYear: () => 'The dry year adds up each month’s low rain, so it is a pessimistic case.',

    riskCycleFit: (x) => `${x.cropCap} needs ${x.cycleMin}–${x.cycleMax} days (FAO) but the ${x.season} window is only about ${x.window} days: a suitable short-duration variety is needed.`,
    riskWaterlogging: (x) => `${x.season}: mean root-zone wetness ${x.wet} (reminder threshold ${x.flag}); ${x.crop} is an upland crop, so check drainage.`,
    riskSalinity: (x) => `${x.cropCap} tolerates salt less than rice (threshold ${x.ece} vs ${x.riceEce} dS/m): check soil and water salinity in ${x.season}.`,
    riskMonoculture: () => 'Long-term rice monoculture compacts the soil and lowers soil quality (Cai Lậy trial).',
    riskMoreWater: (x) => `Needs about ${x.mm} mm more irrigation a year than three rice crops.`,
    riskNoneFound: () => 'No risk flagged by the current rules; still check locally.',

    confCalendar: (x) => `District calendar: crops per year range ${x.min}–${x.max} when the analysis settings change.`,
    confOneTrial: () => 'Soil and income evidence comes from a single trial.',
    confMungbeanProxy: () => 'Mung bean water need and growing period are borrowed from FAO’s “Bean” row.',
  },
}

/* ---------------------------------------------------------------
 * Biến kết quả của rankRotations() thành 5 phần bắt buộc + độ tin cậy, bằng câu chữ.
 * Mỗi dòng: { text, src: ['faoManual3', ...] } để giao diện in nguồn bên cạnh.
 * --------------------------------------------------------------- */
export function rotationParts(rot, baseline, lang) {
  const R = ROT_TEXT[lang]
  const num = (v, digits = 0) => Number(v).toLocaleString(R.locale, { maximumFractionDigits: digits })
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const season = (s) => R.seasons[s]
  const crop = (c) => R.crops[c]
  const monthsText = (ms) => `${R.months[ms[0] - 1]}–${R.months[ms[ms.length - 1] - 1]}`
  const line = (text, src) => ({ text, src: [].concat(src ?? []) })

  // Vì sao đề xuất
  const why = []
  if (rot.baseline) why.push(line(R.whyBaseline))
  rot.crops.forEach((c, i) => {
    if (c !== 'rice') why.push(line(R.whySwap({ season: season(['dx', 'ht', 'td'][i]), crop: crop(c) })))
  })
  const top = Object.entries(rot.contributions).sort((a, b) => b[1] - a[1])
  why.push(line(R.whyDrivers({ first: R.criteria[top[0][0]].toLowerCase(), second: R.criteria[top[1][0]].toLowerCase() })))

  // Bằng chứng
  const evidence = rot.reasons.water.map((r) =>
    line(R.waterSeason({ season: season(r.season), months: monthsText(r.months), crop: crop(r.crop), need: num(r.needMm), rain: num(r.rainMm), extra: num(r.extraMm) }), r.src),
  )
  const dry = rot.reasons.risk[0]
  evidence.push(line(R.riskDryYear({ dry: num(dry.extraDryMm), penalty: num(dry.penaltyMm) }), dry.src))
  evidence.push(rot.baseline ? line(R.evidenceBaseline(), 'linh2014') : line(R.evidenceTrial(), 'linh2014'))

  // Lợi ích
  const benefits = []
  if (rot.baseline) benefits.push(line(R.benefitBaseline()))
  const waterDiff = baseline.measures.extraMm - rot.measures.extraMm
  if (!rot.baseline && waterDiff > 0) benefits.push(line(R.benefitLessWater({ mm: num(waterDiff) }), ['faoManual3', 'power']))
  for (const r of rot.reasons.soil) {
    if (r.code === 'soilMonoculture') continue
    const x = { season: season(r.season), crop: crop(r.crop), cropCap: cap(crop(r.crop)), root: num(r.rootM?.[1] ?? 0, 1), riceRoot: num(r.riceRootM?.[1] ?? 0, 1) }
    benefits.push(line(R[r.code](x), r.src))
  }
  for (const r of rot.reasons.income) {
    if (r.code === 'incomeTrial') benefits.push(line(R.incomeTrial({ low: num(r.low, 1), high: num(r.high, 1) }), r.src))
  }

  // Khoảng trống thông tin
  const gaps = rot.gaps.map((g) => line(R[g.code](), g.src))
  gaps.push(line(R.gapDryYear()))

  // Rủi ro cần địa phương xem xét
  const risks = []
  if (rot.baseline) risks.push(line(R.riskMonoculture(), 'linh2014'))
  if (!rot.baseline && waterDiff < 0) risks.push(line(R.riskMoreWater({ mm: num(-waterDiff) }), ['faoManual3', 'power']))
  for (const r of rot.reviewRisks) {
    const x = {
      season: season(r.season), crop: crop(r.crop), cropCap: cap(crop(r.crop)),
      cycleMin: r.cycleDays?.[0], cycleMax: r.cycleDays?.[1], window: num(r.windowDays ?? 0),
      wet: num(r.rootWetness ?? 0, 2), flag: num(r.flag ?? 0, 2), ece: num(r.ece ?? 0, 1), riceEce: num(r.riceEce ?? 0, 1),
    }
    risks.push(line(R[r.code](x), r.src))
  }
  if (risks.length === 0) risks.push(line(R.riskNoneFound()))

  // Độ tin cậy
  const confidence = rot.confidence.reasons.map((c) => line(R[c.code]({ min: num(c.min ?? 0, 1), max: num(c.max ?? 0, 1) }), c.src))

  const used = new Set([why, evidence, benefits, gaps, risks, confidence].flat().flatMap((x) => x.src))
  return { why, evidence, benefits, gaps, risks, confidence, sources: [...used].filter((k) => SOURCES[k]) }
}
