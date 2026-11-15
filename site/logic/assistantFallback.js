// Trả lời mẫu có căn cứ và bộ kiểm tra số liệu cho Trợ lý nông trại (Mùa Vụ Mekong).
// Không dùng dữ liệu 4 thửa mô phỏng cũ: mọi câu trả lời đều bám sổ bằng chứng (Evidence),
// cân bằng nước NASA POWER và kết quả đánh giá 3 chiến lược của mảnh đất đang chọn.
import { evIsMissing } from '../core/evidence.js'
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { suitBand } from './suitability.js'
import { ssRate } from './staticSnapshot.js'

function collectNumericForms(val, set) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return
  for (const digits of [0, 1, 2]) {
    const fixed = Number(val.toFixed(digits))
    const dot = String(fixed)
    const comma = dot.replace('.', ',')
    set.add(dot)
    set.add(comma)
    const absDot = String(Math.abs(fixed))
    set.add(absDot)
    set.add(absDot.replace('.', ','))
  }
}

function walkValues(obj, set, depth = 0) {
  if (obj == null || depth > 8) return
  if (typeof obj === 'number') return collectNumericForms(obj, set)
  if (Array.isArray(obj)) return obj.forEach((v) => walkValues(v, set, depth + 1))
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) walkValues(v, set, depth + 1)
  }
}

/**
 * Tạo bản tóm tắt gọn, có nguồn rõ ràng cho /api/assistant.
 * Chỉ đưa số liệu đang hiển thị trên ruộng/chiến lược hiện tại để Gemini không bịa số.
 */
export function assistantContext(args = {}) {
  const ctx = asstBaseContext(args)
  if (ctx.facts) ctx.twoTier = asstTwoTier(ctx)
  return ctx
}

function asstBaseContext({ loc, data, evalResult, rotDistrict, rotResult, areaM2, polygon, facts = null, crop = null } = {}) {
  const wbSummary = data?.wb
    ? {
        months: data.wb.map((m) => ({
          month: m.month,
          rainMm: evIsMissing(m.rain) ? null : Math.round(m.rain.value),
          et0Mm: evIsMissing(m.et0) ? null : Math.round(m.et0.value),
          balanceMm: evIsMissing(m.balance) ? null : Math.round(m.balance.value),
          deficit: Boolean(m.deficit),
          isDry: Boolean(m.isDry),
        })),
        deficitMonths: data.wb.filter((m) => m.deficit).map((m) => m.month),
      }
    : null

  const strategies = evalResult?.strategies
    ? evalResult.strategies.map((s) => ({
        id: s.strategyId,
        kind: s.kind,
        crops: s.crops,
        eligibility: s.eligibility,
        riskLevel: s.riskLevel,
        rank: s.rank,
        score: s.score,
        missingFields: s.missingFields,
      }))
    : null

  return {
    location: loc
      ? {
          name: loc.name ?? null,
          lat: Number(loc.lat.toFixed(4)),
          lon: Number(loc.lon.toFixed(4)),
        }
      : null,
    boundary: polygon && areaM2
      ? {
          vertices: polygon.length,
          areaM2: Math.round(areaM2),
          areaHa: Number((areaM2 / 10000).toFixed(2)),
        }
      : null,
    waterBalance: wbSummary,
    soil: data?.user?.soil
      ? {
          ec: evIsMissing(data.user.soil.ec) ? null : data.user.soil.ec.value,
          ecType: data.user.soil.ecType ?? null,
          ph: evIsMissing(data.user.soil.ph) ? null : data.user.soil.ph.value,
        }
      : null,
    fieldStrategies: strategies,
    // Dữ liệu thửa kèm LOẠI số liệu (ground/satellite/model) để Tầng 2 kiểm tra minh bạch được.
    facts: Array.isArray(facts) ? facts.map((x) => ({ key: x.key, value: typeof x.value === 'number' ? x.value : null, present: typeof x.value === 'number' || Boolean(x.present), unit: x.unit ?? '', kind: typeof x.value === 'number' || x.present ? x.kind : 'missing', ecType: x.ecType ?? null, source: x.source ?? null, period: x.period ?? null })) : null,
    crop: crop ? { id: crop.id ?? null, name: crop.name ?? null, custom: Boolean(crop.custom) } : null,
    districtRotation: rotResult
      ? {
          district: rotDistrict ?? null,
          ranked: (rotResult.rotations ?? rotResult.ranked)?.map((r) => ({ id: r.id, total: r.total })) ?? null,
        }
      : null,
  }
}

/**
 * Thu thập mọi con số hợp lệ từ ngữ cảnh và sổ bằng chứng (MF_LEDGER).
 * Bất kỳ con số nào AI viết ra ngoài tập này sẽ bị chặn và thay bằng câu trả lời mẫu an toàn.
 */
export function asstLedgerNumbers(ctx, ledger = null) {
  const allowed = new Set()
  walkValues(ctx, allowed)
  if (ledger && typeof ledger.values === 'function') {
    for (const ev of ledger.values()) {
      if (ev && !evIsMissing(ev)) {
        collectNumericForms(ev.value, allowed)
        for (const inp of ev.inputs ?? []) {
          if (inp && !evIsMissing(inp)) collectNumericForms(inp.value, allowed)
        }
      }
    }
  }
  return allowed
}

/**
 * Kiểm tra câu trả lời AI: mọi số xuất hiện trong văn bản phải nằm trong `allowed`.
 * Bỏ qua số thứ tự đầu dòng dạng "1. ", "2. ", "3. " (tối đa 1–3).
 */
export function asstVerifyReply(text, allowed) {
  if (!text || typeof text !== 'string') return { ok: false, unverified: ['empty'] }
  const cleaned = text
    .replace(/^\s*[1-3][.)]\s+/gm, ' ')
    .replace(/\b(Tầng|Tier) [12]\b/g, ' ')
    .replace(/FAO-\d+/g, ' ')
    .replace(/EC ?1:5/gi, ' ')
    .replace(/(\d+(?:[.,]\d+)?)\/100\b/g, '$1')
  const matches = cleaned.match(/\d+(?:[.,]\d+)?/g) ?? []
  const unverified = []
  for (const raw of matches) {
    const norm = raw.replace(',', '.')
    if (!allowed.has(raw) && !allowed.has(norm)) unverified.push(raw)
  }
  return { ok: unverified.length === 0, unverified }
}

/**
 * Câu trả lời mẫu theo luật khi offline, chưa có khoá Gemini, hoặc khi câu trả lời AI có số chưa kiểm chứng.
 */
export function fallbackAnswer(question, ctx = {}, lang = 'vi') {
  const q = String(question || '').toLowerCase()
  const vi = lang === 'vi'
  const disclaimer = vi
    ? 'Lưu ý: đây chỉ là công cụ hỗ trợ quyết định, không thay thế nông dân và cán bộ khuyến nông địa phương.'
    : 'Note: this is a decision-support tool and does not replace farmers or local extension officers.'
  const has = (...words) => words.some((w) => q.includes(w))
  if (asstIsMeasureQuestion(question)) return `${asstMeasureAnswer(question, lang)} ${disclaimer}`
  if (ctx.facts && asstIsTwoTierQuestion(question)) return asstTwoTierText(ctx, lang)

  const locName = ctx.location?.name || (ctx.location ? `${ctx.location.lat}, ${ctx.location.lon}` : null)
  const wb = ctx.waterBalance
  const deficitMonths = wb?.deficitMonths ?? []
  const strats = ctx.fieldStrategies ?? null
  const eligible = strats?.filter((s) => s.eligibility === 'eligible').sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)) ?? []

  if (!ctx.location && !ctx.districtRotation) {
    return vi
      ? `Chưa có thửa ruộng nào được chọn trên bản đồ. Bạn hãy chạm một điểm hoặc khoanh ranh thửa ở trang "Ruộng của tôi" để xem cân bằng nước NASA POWER và 3 chiến lược luân canh. ${disclaimer}`
      : `No field is selected on the map yet. Pick a location or draw your field boundary in "My field" to view the NASA POWER water balance and 3 rotation strategies. ${disclaimer}`
  }

  if (has('mặn', 'phèn', 'đất', 'salin', 'ec', 'ph', 'soil')) {
    const ec = ctx.soil?.ec
    const ph = ctx.soil?.ph
    if (ec == null && ph == null) {
      return vi
        ? `Chưa có số đo độ mặn (ECe) hay pH cho ${locName ?? 'điểm này'}, nên tiêu chí đất đang ở mức "Chưa rõ / Cần đo". Bạn có thể nhập số đo thực tế trong bước 2 ("Điều kiện thực tế") hoặc mang mẫu đất hỏi cán bộ khuyến nông. ${disclaimer}`
        : `There are no field ECe salinity or pH measurements for ${locName ?? 'this location'} yet, so soil criteria remain "Unknown / Measure needed". Enter your measurements in Step 2 or check with your local extension officer. ${disclaimer}`
    }
    return vi
      ? `Số đo hiện có tại ${locName ?? 'ruộng'}: ${ec != null ? `độ mặn ${ec} dS/m` : 'chưa có EC'}${ph != null ? `, pH ${ph}` : ''}. Mức an toàn khác nhau tùy giống cây và giai đoạn sinh trưởng. ${disclaimer}`
      : `Current field readings at ${locName ?? 'this field'}: ${ec != null ? `salinity ${ec} dS/m` : 'no EC yet'}${ph != null ? `, pH ${ph}` : ''}. Safe thresholds vary by variety and growth stage. ${disclaimer}`
  }

  if (has('nước', 'hạn', 'mưa', 'thiếu', 'tưới', 'khô', 'water', 'drought', 'rain', 'et0')) {
    if (wb) {
      const defTxt = deficitMonths.length
        ? deficitMonths.join(', ')
        : vi ? 'không có tháng nào thiếu ròng' : 'none'
      const worst = [...wb.months].sort((a, b) => (a.balanceMm ?? 0) - (b.balanceMm ?? 0))[0]
      return vi
        ? `Tại ${locName}, cân bằng nước khí hậu NASA POWER (P − ET0) cho thấy các tháng thiếu nước là tháng ${defTxt}. Tháng căng nhất là tháng ${worst.month} (${worst.balanceMm} mm; mưa ${worst.rainMm} mm, ET0 ${worst.et0Mm} mm). ${disclaimer}`
        : `At ${locName}, the NASA POWER climate water balance (P − ET0) shows water-short months: ${defTxt}. Tightest month is month ${worst.month} (${worst.balanceMm} mm; rain ${worst.rainMm} mm, ET0 ${worst.et0Mm} mm). ${disclaimer}`
    }
  }

  if (has('luân canh', 'chiến lược', 'cây', 'trồng', 'đậu', 'ngô', 'lúa', 'rotation', 'strategy', 'crop', 'bean', 'maize', 'rice')) {
    if (eligible.length) {
      const top = eligible[0]
      return vi
        ? `Trong 3 chiến lược đánh giá tại ${locName}, phương án ${top.id} (${top.crops.join(' – ')}) đang đứng đầu với ${top.score}/100 điểm, mức rủi ro: ${top.riskLevel}. Việc chọn phương án cuối cùng vẫn cần cân nhắc thị trường và thủy lợi tại chỗ. ${disclaimer}`
        : `Among the 3 strategies evaluated at ${locName}, option ${top.id} (${top.crops.join(' – ')}) leads among eligible options at ${top.score}/100, with risk level: ${top.riskLevel}. Final selection still depends on local market access and water control. ${disclaimer}`
    }
    if (strats?.length) {
      return vi
        ? `Tại ${locName}, một số chiến lược chưa thể xếp hạng hoàn chỉnh do thiếu lịch mùa vụ địa phương hoặc câu trả lời về tưới tiêu/đổi cây. Bạn hãy kiểm tra phần "Thiếu thông tin" trên từng thẻ. ${disclaimer}`
        : `At ${locName}, strategies cannot be fully ranked yet because local crop-calendar data or irrigation/change inputs are missing. Check the "Missing inputs" tag on each card. ${disclaimer}`
    }
  }

  if (has('diện tích', 'ranh', 'khoanh', 'area', 'boundary', 'ha')) {
    if (ctx.boundary) {
      return vi
        ? `Ranh thửa đã khoanh tại ${locName ?? 'ruộng'} gồm ${ctx.boundary.vertices} đỉnh, diện tích ước tính ${ctx.boundary.areaHa} ha (${ctx.boundary.areaM2} m²). Lưu ý dữ liệu khí hậu NASA POWER có độ phân giải ô lưới khoảng 50 km. ${disclaimer}`
        : `The drawn field boundary at ${locName ?? 'your field'} has ${ctx.boundary.vertices} vertices covering ${ctx.boundary.areaHa} ha (${ctx.boundary.areaM2} m²). Note that NASA POWER climate data describes a ~50 km grid cell. ${disclaimer}`
    }
  }

  const areaBit = ctx.boundary
    ? vi
      ? ` Diện tích khoanh: ${ctx.boundary.areaHa} ha (${ctx.boundary.areaM2} m²).`
      : ` Drawn area: ${ctx.boundary.areaHa} ha (${ctx.boundary.areaM2} m²).`
    : ''
  const wbBit = wb && deficitMonths.length
    ? vi
      ? ` Tháng thiếu nước theo P − ET0: ${deficitMonths.join(', ')}.`
      : ` Water-short months (P − ET0): ${deficitMonths.join(', ')}.`
    : ''
  const topBit = eligible[0]
    ? vi
      ? ` Phương án ${eligible[0].id} hiện dẫn đầu (${eligible[0].score}/100).`
      : ` Option ${eligible[0].id} currently ranks first (${eligible[0].score}/100).`
    : ''

  return vi
    ? `Tóm tắt cho ${locName ?? 'vùng ĐBSCL'}:${areaBit}${wbBit}${topBit} Bạn có thể hỏi thêm về tháng thiếu nước, độ mặn/pH hoặc so sánh 3 chiến lược luân canh. ${disclaimer}`
    : `Summary for ${locName ?? 'your Mekong field'}:${areaBit}${wbBit}${topBit} Ask about water-short months, salinity/pH, or comparing the 3 rotation strategies. ${disclaimer}`
}

/* ================================================================
 * AI 2 TẦNG (bản dự phòng chạy offline, cùng luật với server/server.mjs)
 *   Tầng 1 — Đề xuất: lấy phương án đứng đầu từ fsAssessField (đã dùng ngưỡng suitability.js + rotation.js).
 *   Tầng 2 — Kiểm tra minh bạch: đối chiếu ngược đề xuất với dữ liệu gốc của thửa và bảng FAO/ECOCROP,
 *            gắn cờ từng mục: đo thực địa / xấp xỉ (vệ tinh, mô hình tĩnh) / thiếu / mâu thuẫn.
 *   Sai nói sai, thiếu nói thiếu: Tầng 2 không sửa đề xuất, chỉ nói rõ chỗ nào còn yếu.
 * ================================================================ */

// Thông số thửa mà Tầng 2 luôn soát (thiếu thì nói thiếu).
export const ASST_KEY_FACTS = ['crop', 'irrigation', 'ph', 'ec', 'climate', 'calendar']

/** Tầng 1: đề xuất từ kết quả đánh giá chiến lược (không tự tính thêm số mới). */
export function asstTier1Propose(ctx = {}) {
  const strats = ctx.fieldStrategies ?? []
  const top = strats.find((s) => s.rank === 1) ?? null
  if (top) return { status: 'proposal', strategyId: top.id, crops: top.crops, riskLevel: top.riskLevel, score: top.score, eligibility: top.eligibility }
  const lacking = strats.filter((s) => s.eligibility === 'insufficient_data')
  if (lacking.length) return { status: 'needData', missing: [...new Set(lacking.flatMap((s) => s.missingFields ?? []))] }
  if (strats.length) return { status: 'noneEligible' }
  return { status: 'noField' }
}

/**
 * Tầng 2: kiểm tra chéo đề xuất với dữ liệu gốc.
 * Trả về { checks: [{ key, status: 'field'|'approx'|'missing'|'conflict'|'warn', kind, rate, ... }], verdict }.
 * verdict: 'conflict' > 'insufficient' > 'approx' > 'ok'.
 */
export function asstTier2Check(proposal, ctx = {}, { library = CROP_LIBRARY } = {}) {
  const checks = []
  const facts = ctx.facts ?? []
  const byKey = Object.fromEntries(facts.map((x) => [x.key, x]))
  for (const key of ASST_KEY_FACTS) {
    const x = byKey[key]
    if (key === 'crop') {
      if (ctx.crop?.custom) checks.push({ key, status: 'missing', kind: 'ground', rate: 'high', reason: 'customCrop', name: ctx.crop.name })
      else if (!ctx.crop?.id) checks.push({ key, status: 'missing', kind: 'missing', rate: 'none' })
      else checks.push({ key, status: 'field', kind: 'ground', rate: 'high', name: ctx.crop.name })
      continue
    }
    if (!x || !x.present) {
      checks.push({ key, status: 'missing', kind: 'missing', rate: 'none' })
      continue
    }
    const rate = ssRate(x.kind)
    checks.push({ key, status: rate === 'high' ? 'field' : 'approx', kind: x.kind, rate, value: x.value, unit: x.unit, source: x.source, period: x.period })
  }
  // Mâu thuẫn / cảnh báo theo bảng FAO-29 + ECOCROP của từng cây trong đề xuất.
  const crops = proposal?.status === 'proposal' ? [...new Set(proposal.crops)] : []
  const ph = byKey.ph?.value != null ? byKey.ph : null
  const ec = byKey.ec?.value != null ? byKey.ec : null
  if (ec && ec.ecType && ec.ecType !== 'ece') checks.push({ key: 'ecType', status: 'warn', kind: ec.kind, rate: ssRate(ec.kind), reason: 'notEce', ecType: ec.ecType })
  for (const c of crops) {
    const info = library[c]
    if (!info) {
      checks.push({ key: 'cropParams', status: 'missing', crop: c, kind: 'missing', rate: 'none' })
      continue
    }
    if (ph && info.ph) {
      const band = suitBand(ph.value, info.ph)
      if (band === 'red') checks.push({ key: 'phBand', status: 'conflict', crop: c, value: ph.value, band: info.ph, kind: ph.kind, rate: ssRate(ph.kind) })
      else if (band === 'yellow') checks.push({ key: 'phBand', status: 'warn', crop: c, value: ph.value, band: info.ph, kind: ph.kind, rate: ssRate(ph.kind) })
    }
    if (info.salinityEce == null) checks.push({ key: 'salinityThreshold', status: 'missing', crop: c, kind: 'missing', rate: 'none' })
    else if (ec && ec.ecType === 'ece' && ec.value > info.salinityEce) checks.push({ key: 'salinity', status: 'conflict', crop: c, value: ec.value, threshold: info.salinityEce, kind: ec.kind, rate: ssRate(ec.kind) })
  }
  if (proposal?.status === 'needData') for (const m of proposal.missing) checks.push({ key: `need:${m}`, status: 'missing', kind: 'missing', rate: 'none' })
  const has = (st) => checks.some((x) => x.status === st)
  const keyMissing = checks.some((x) => x.status === 'missing' && ['irrigation', 'ph', 'ec', 'crop'].includes(x.key))
  const verdict = has('conflict') ? 'conflict' : keyMissing || proposal?.status !== 'proposal' ? 'insufficient' : has('approx') ? 'approx' : 'ok'
  return { checks, verdict }
}

/** Chạy cả 2 tầng trên cùng một ngữ cảnh. */
export function asstTwoTier(ctx = {}) {
  const proposal = asstTier1Propose(ctx)
  return { proposal, review: asstTier2Check(proposal, ctx) }
}

// Hướng dẫn tự đo tại ruộng. Không có ngưỡng hay tỉ lệ pha nào viết từ trí nhớ: chỉ cách đo, theo hướng dẫn
// của dụng cụ, và cách nhập để nâng Rate lên [Cao].
export const ASST_MEASURE_GUIDE = {
  vi: {
    ec: 'Đo độ mặn bằng bút đo EC cầm tay: hiệu chuẩn bút bằng dung dịch chuẩn đi kèm; lấy đất tầng mặt ở vài chỗ trong ruộng, pha với nước cất đúng tỉ lệ ghi trong hướng dẫn của bút, khuấy, để lắng rồi nhúng bút. Nước tưới thì nhúng thẳng vào mẫu nước lấy ở cống/kênh. Nhập số vào Cài đặt vườn (bánh răng) và chọn đúng loại EC (ECw = nước, EC 1:5 = đất pha nước, ECe = phòng thí nghiệm). Khúc xạ kế đo độ mặn nước theo phần nghìn: ghi vào phần Ghi chú, không tự quy đổi sang dS/m.',
    ph: 'Đo pH nhanh bằng bút pH hoặc bộ thử pH đất: hiệu chuẩn bút bằng dung dịch chuẩn; pha đất với nước cất theo hướng dẫn của bộ thử, chờ lắng rồi đo. Đo vài điểm; đất phèn nên đo cả lớp sâu hơn. Nhập pH và ngày đo vào Cài đặt vườn.',
    flood: 'Kiểm tra ngập/thoát nước: sau mỗi trận mưa lớn hoặc kỳ triều cường, cắm cọc có vạch để xem nước đọng cao bao nhiêu và mấy ngày mới rút; chỗ hay đọng nước thì dùng công cụ "Đánh dấu → Hay ngập" trên bản đồ.',
    upgrade: 'Số bạn tự đo sẽ thay ước tính vệ tinh/mô hình và được gắn Rate [Cao]. Nên nhờ cán bộ khuyến nông xem lại kết quả.',
  },
  en: {
    ec: 'Measure salinity with a handheld EC pen: calibrate it with the supplied standard solution; take topsoil from several spots, mix with distilled water at the ratio given in the pen manual, stir, let settle and dip the pen. For irrigation water, dip it straight into a sample from the canal or sluice. Enter the value in Garden settings (gear icon) and choose the right EC type (ECw = water, EC 1:5 = soil-water mix, ECe = laboratory). A refractometer reads water salinity in parts per thousand: put it in Notes, do not convert it to dS/m yourself.',
    ph: 'Quick pH: use a pH pen or a soil pH test kit; calibrate the pen with the standard solution; mix soil with distilled water as the kit instructs, let settle, then read. Test several spots; on acid-sulfate soil also test a deeper layer. Enter pH and the date in Garden settings.',
    flood: 'Check flooding and drainage: after heavy rain or a high tide, place a marked stake to see how deep water stands and how many days it takes to drain; mark spots that often pond with "Mark → Often flooded" on the map.',
    upgrade: 'Your own measurements replace satellite/model estimates and are rated [High]. Ask an extension officer to double-check them.',
  },
}

const ASST_FACT_NAME = {
  vi: { crop: 'cây trồng', irrigation: 'nguồn tưới', ph: 'pH đất', ec: 'độ mặn', climate: 'khí hậu NASA POWER', calendar: 'lịch vụ MODIS', cropParams: 'tham số FAO của cây', salinityThreshold: 'ngưỡng mặn FAO', ecType: 'loại EC', ndviCalendar: 'lịch vụ MODIS', salinityEce: 'độ mặn ECe' },
  en: { crop: 'crop', irrigation: 'irrigation', ph: 'soil pH', ec: 'salinity', climate: 'NASA POWER climate', calendar: 'MODIS calendar', cropParams: 'FAO crop parameters', salinityThreshold: 'FAO salinity threshold', ecType: 'EC type', ndviCalendar: 'MODIS calendar', salinityEce: 'ECe salinity' },
}
const ASST_RATE_WORD = {
  vi: { high: 'Cao', medium: 'Trung bình', ref: 'Tham khảo', table: 'Bảng FAO', sim: 'Mô phỏng giả định', none: 'Thiếu' },
  en: { high: 'High', medium: 'Medium', ref: 'Reference', table: 'FAO table', sim: 'Simulated assumption', none: 'Missing' },
}

/** Viết kết quả 2 tầng thành lời (mọi số đều lấy từ ngữ cảnh, nên qua được asstVerifyReply). */
export function asstTwoTierText(ctx = {}, lang = 'vi') {
  const vi = lang !== 'en'
  const L = vi ? 'vi' : 'en'
  const N = ASST_FACT_NAME[L]
  const W = ASST_RATE_WORD[L]
  const crop = (id) => CROP_LIBRARY[id]?.name?.[L] ?? id
  const { proposal, review } = asstTwoTier(ctx)
  const name = (k) => N[k] ?? N[k.replace('need:', '')] ?? k.replace('need:', '')
  let t1
  if (proposal.status === 'proposal') t1 = vi ? `Tầng 1 – Đề xuất: phương án ${proposal.strategyId} (${proposal.crops.map(crop).join(' → ')}), ${proposal.score}/100 điểm.` : `Tier 1 – Proposal: option ${proposal.strategyId} (${proposal.crops.map(crop).join(' → ')}), ${proposal.score}/100.`
  else if (proposal.status === 'needData') t1 = vi ? 'Tầng 1 – Chưa đề xuất được: thiếu thông tin để xếp hạng.' : 'Tier 1 – No proposal yet: information is missing for ranking.'
  else if (proposal.status === 'noneEligible') t1 = vi ? 'Tầng 1 – Không phương án nào đạt điều kiện của thửa.' : 'Tier 1 – No option meets this field’s conditions.'
  else t1 = vi ? 'Tầng 1 – Chưa chọn thửa nào.' : 'Tier 1 – No field selected yet.'
  const list = (st) => review.checks.filter((x) => x.status === st)
  const fmt = (x) => `${name(x.key)}${x.crop ? ` (${crop(x.crop)})` : ''}${x.value != null ? ` ${x.value}${x.unit ? ` ${x.unit}` : ''}` : ''} [${W[x.rate] ?? W.none}]`
  const parts = []
  if (list('field').length) parts.push((vi ? '✓ Đo/khai tại ruộng: ' : '✓ Field-measured/reported: ') + list('field').map(fmt).join('; '))
  if (list('approx').length) parts.push((vi ? '≈ Vệ tinh / mô hình tĩnh (xấp xỉ): ' : '≈ Satellite / static model (approximate): ') + list('approx').map(fmt).join('; '))
  if (list('missing').length) parts.push((vi ? '✗ Còn thiếu: ' : '✗ Missing: ') + [...new Set(list('missing').map((x) => `${name(x.key)}${x.crop ? ` (${crop(x.crop)})` : ''}`))].join('; '))
  const conflictText = (x) => {
    if (x.key === 'phBand') return vi ? `pH ${x.value} nằm ngoài khoảng chịu được ${x.band.absolute[0]}–${x.band.absolute[1]} của ${crop(x.crop)} (ECOCROP)` : `pH ${x.value} is outside the tolerated ${x.band.absolute[0]}–${x.band.absolute[1]} of ${crop(x.crop)} (ECOCROP)`
    if (x.key === 'salinity') return vi ? `ECe ${x.value} dS/m cao hơn ngưỡng ${x.threshold} dS/m của ${crop(x.crop)} (FAO-29)` : `ECe ${x.value} dS/m is above the ${x.threshold} dS/m threshold of ${crop(x.crop)} (FAO-29)`
    return name(x.key)
  }
  const warnText = (x) => {
    if (x.key === 'phBand') return vi ? `pH ${x.value} ngoài khoảng tối ưu ${x.band.optimal[0]}–${x.band.optimal[1]} của ${crop(x.crop)}` : `pH ${x.value} is outside the optimal ${x.band.optimal[0]}–${x.band.optimal[1]} of ${crop(x.crop)}`
    if (x.key === 'ecType') return vi ? 'số độ mặn chưa phải ECe nên chưa so được với ngưỡng FAO' : 'the salinity value is not ECe, so it cannot be compared with the FAO threshold'
    return name(x.key)
  }
  if (list('conflict').length) parts.push((vi ? '⚠ Mâu thuẫn: ' : '⚠ Conflict: ') + list('conflict').map(conflictText).join('; '))
  if (list('warn').length) parts.push((vi ? '! Lưu ý: ' : '! Note: ') + list('warn').map(warnText).join('; '))
  const head = vi ? 'Tầng 2 – Kiểm tra minh bạch:' : 'Tier 2 – Transparency check:'
  const G = ASST_MEASURE_GUIDE[L]
  const weak = new Set(review.checks.filter((x) => x.status !== 'field').map((x) => x.key))
  const guide = weak.has('ec') || weak.has('ecType') ? G.ec : weak.has('ph') || weak.has('phBand') ? G.ph : null
  const disclaimer = vi ? 'Đây là công cụ hỗ trợ, hãy kết hợp kinh nghiệm của bà con và cán bộ khuyến nông.' : 'This is a support tool; combine it with farmers’ experience and the local extension officer.'
  return [t1, head, ...parts.map((p) => `- ${p}`), guide ? `${vi ? 'Cách tự đo' : 'How to measure'}: ${guide} ${G.upgrade}` : '', disclaimer].filter(Boolean).join('\n')
}

/** Câu hỏi về cách tự đo tại ruộng → hướng dẫn tương ứng (không số liệu, không ngưỡng). */
export function asstMeasureAnswer(question, lang = 'vi') {
  const q = String(question || '').toLowerCase()
  const G = ASST_MEASURE_GUIDE[lang === 'en' ? 'en' : 'vi']
  // Câu hỏi nhắc tới chủ đề nào thì trả đủ các chủ đề đó (vd. "độ mặn, pH" → cả 2 hướng dẫn).
  const topics = [[/mặn|\bec\b|salin|khúc xạ|refract/, G.ec], [/\bph\b|chua|phèn|acid/, G.ph], [/ngập|thoát|úng|flood|drain/, G.flood]]
  const hit = topics.filter(([re]) => re.test(q)).map(([, text]) => text)
  const pick = hit.length ? hit : [G.ec, G.ph, G.flood]
  return [...pick, G.upgrade].join('\n')
}

// Câu hỏi "cách đo" và câu hỏi "đề xuất / kiểm tra" được nhận diện bằng từ khoá (dùng ở fallbackAnswer).
export const asstIsMeasureQuestion = (q) => /cách đo|tự đo|đo thế nào|đo như nào|bút đo|khúc xạ|how (do i|to) measure|measure my|meter|refractometer/i.test(String(q || ''))
export const asstIsTwoTierQuestion = (q) => /đề xuất|kiểm tra|minh bạch|chiến thuật|luân canh|chiến lược|nên trồng|propos|check|transparen|strategy|rotation|what should i (plant|grow)/i.test(String(q || ''))
