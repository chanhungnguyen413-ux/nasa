// Trả lời mẫu có căn cứ và bộ kiểm tra số liệu cho Trợ lý nông trại (Mùa Vụ Mekong).
// Không dùng dữ liệu 4 thửa mô phỏng cũ: mọi câu trả lời đều bám sổ bằng chứng (Evidence),
// cân bằng nước NASA POWER và kết quả đánh giá 3 chiến lược của mảnh đất đang chọn.
import { evIsMissing } from '../core/evidence.js'

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
export function assistantContext({ loc, data, evalResult, rotDistrict, rotResult, areaM2, polygon } = {}) {
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
    districtRotation: rotResult
      ? {
          district: rotDistrict ?? null,
          ranked: rotResult.ranked?.map((r) => ({ id: r.id, total: r.total })) ?? null,
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
