// Bộ SINH phương án luân canh tự do (không gò vào 4 mẫu A–D): hàm thuần, không đụng giao diện.
//
// Ý tưởng (minh bạch, chạy offline):
//  1. Chấm 9 cây của thư viện cho TỪNG vụ của thửa bằng đúng suitAssess (ngưỡng FAO/ECOCROP đã khóa, không sửa).
//  2. Ghép mọi chuỗi 3 vụ có thể (tối đa 9³ = 729), BỎ chuỗi có vụ bị Đỏ.
//  3. Mỗi chuỗi có 4 thành phần điểm, đều truy được nguồn:
//     - phù hợp: số vụ Xanh/Vàng (suitAssess);
//     - nước: nước tưới thêm = nhu cầu FAO Manual 3 (giữa khoảng) − mưa NASA POWER của các tháng trong vụ (như rotation.js);
//     - đất: +1 cây cạn (Linh et al. 2014), +1 cây họ đậu (FAO 2016), +1 rễ sâu hơn lúa (FAO-56) — cùng luật rotation.js;
//     - đa dạng: số loại cây khác nhau trong chuỗi (cắt vòng sâu bệnh; trọng số do nhóm chọn).
//  4. Chọn 3 đề xuất khác nhau: cân bằng nhất, tiết kiệm nước nhất, tốt cho đất nhất + danh sách "xem thêm".
// KHÔNG có điểm lợi nhuận: chưa có số liệu lợi nhuận có nguồn cho chuỗi tùy ý (chỉ có Linh et al. 2015 cho lúa–màu chung).
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { suitAssess, suitFindCrop, suitWindow } from './suitability.js'
import { FIELD_STRAT_PARAMS } from './fieldStrategies.js'

// Do nhóm chọn (không phải số nông học): trọng số xếp hạng, tổng 100; số đề xuất chính và số chuỗi "xem thêm".
export const RG_PARAMS = {
  weights: { suit: 40, water: 30, soil: 20, variety: 10 },
  emphasisFactor: 2, // khi mô tả của bà con nhấn một mục (vd "ít tưới"), nhân trọng số mục đó
  keep: 3,
  more: 12,
}
const RG_SEASONS = ['dx', 'ht', 'td']
const RG_GRADE_PTS = { green: 2, yellow: 1, gray: 0 }
const rgMid = ([a, b]) => (a + b) / 2

// Bỏ dấu + chữ thường để dò tên cây trong câu tự do.
const rgFold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

// Từ khoá nhấn mạnh mong muốn trong câu mô tả (dạng đã bỏ dấu).
const RG_EMPHASIS = {
  water: ['it tuoi', 'tiet kiem nuoc', 'thieu nuoc', 'han', 'kho han', 'save water', 'less water', 'drought', 'dry'],
  soil: ['cai tao dat', 'dat bac mau', 'tot cho dat', 'soil', 'phan xanh'],
  variety: ['da dang', 'nhieu loai', 'xoay vong', 'diverse', 'variety'],
}
const RG_SPLIT = /\s*(?:->|=>|→|➔|–|—|-|,|;|\/|\+|\brồi\b|\bsau đó\b|\bthen\b)\s*/i

/**
 * Đọc câu tự do của bà con: chuỗi cây đang trồng (theo thứ tự) + mục được nhấn mạnh.
 *   "đang trồng ngô - đậu phộng - lúa, muốn ít tưới" → crops [maize, groundnut, rice], emphasis { water: true }
 * Đoạn ngắn không khớp thư viện (vd "sầu riêng") giữ nguyên tên: { custom: 'sầu riêng' }.
 */
export function rgParseWish(text) {
  const raw = String(text ?? '').slice(0, 400)
  const folded = rgFold(raw)
  const emphasis = Object.fromEntries(Object.entries(RG_EMPHASIS).map(([k, words]) => [k, words.some((w) => folded.includes(w))]))
  const crops = []
  for (const part of raw.split(RG_SPLIT)) {
    const seg = part.trim()
    if (!seg) continue
    const words = seg.split(/\s+/)
    let found = null
    // Thử cụm dài nhất trước ("đậu phộng" thắng "đậu").
    for (let len = Math.min(3, words.length); len >= 1 && !found; len--) {
      for (let i = 0; i + len <= words.length && !found; i++) found = suitFindCrop(words.slice(i, i + len).join(' '))
    }
    if (found) crops.push({ id: found })
    else if (words.length <= 3 && !Object.values(RG_EMPHASIS).flat().some((w) => rgFold(seg).includes(w))) crops.push({ id: null, custom: seg })
  }
  return { crops: crops.slice(0, 6), emphasis }
}

/**
 * Chấm 9 cây cho từng vụ của thửa (cùng cách fsSeasonAlternatives) nhưng GIỮ đủ tiêu chí + số để giải thích.
 * Trả về [{ season, months, source, cells: { cropId: { assessment, needMm, rainMm, extraMm } } }] × 3, hoặc null khi chưa có khí hậu.
 */
export function rgSeasonGrid({ windows = null, sowingMonth = 1, climate, irrigation = null, salinityEce = null, salinityType = null, floodMarks = null, ph = null }) {
  if (!climate?.months || climate.months.length !== 12) return null
  const useNdvi = Array.isArray(windows) && windows.length === 3
  const rainOf = (m) => climate.months[m - 1]?.rain?.value
  return RG_SEASONS.map((season, i) => {
    const ndviWindow = useNdvi ? windows[i] : null
    const start = ((sowingMonth - 1 + i * FIELD_STRAT_PARAMS.refSeasonGapMonths) % 12) + 1
    const months = useNdvi ? ndviWindow.months : Array.from({ length: FIELD_STRAT_PARAMS.refSeasonGapMonths }, (_, k) => ((start - 1 + k) % 12) + 1)
    const rains = months.map(rainOf)
    const rainMm = rains.every((v) => typeof v === 'number') ? Math.round(rains.reduce((a, b) => a + b, 0)) : null
    const cells = {}
    for (const crop of CROP_LIB_IDS) {
      const window = useNdvi ? suitWindow({ ndviWindow, crop }) : suitWindow({ sowingMonth: start, crop })
      const assessment = suitAssess({ crop, window, climate, irrigation, salinityEce, salinityType, floodMarks, ph })
      const needMm = Math.round(rgMid(CROP_LIBRARY[crop].waterMm))
      cells[crop] = { assessment, needMm, rainMm, extraMm: rainMm == null ? null : Math.max(0, needMm - rainMm) }
    }
    return { season: ndviWindow?.season ?? season, months, source: useNdvi ? 'ndvi' : 'sowing', cells }
  })
}

/** Điểm sức khỏe đất của một cây (cùng luật soilPoints của rotation.js, đọc thuộc tính có nguồn trong CROP_LIBRARY). */
export function rgSoilOf(crop) {
  const info = CROP_LIBRARY[crop]
  if (!info) return { points: null, reasons: [] }
  const reasons = []
  if (info.upland) reasons.push({ code: 'upland', src: 'linh2014' })
  if (info.legume) reasons.push({ code: 'legume', src: 'faoPulses' })
  if (info.rootM[1] > CROP_LIBRARY.rice.rootM[1]) reasons.push({ code: 'deepRoot', rootM: info.rootM, riceRootM: CROP_LIBRARY.rice.rootM, src: info.rootSrc })
  return { points: reasons.length, reasons }
}

/** Số đo thô của MỘT chuỗi cây trên lưới vụ (cây ngoài thư viện → để thiếu, không đoán). */
export function rgMeasure(grid, crops) {
  const seasons = crops.slice(0, 3).map((c, i) => {
    const id = typeof c === 'string' ? c : c?.id
    const cell = id ? grid?.[i]?.cells?.[id] : null
    const soil = rgSoilOf(id)
    return {
      season: grid?.[i]?.season ?? RG_SEASONS[i],
      months: grid?.[i]?.months ?? [],
      crop: id ?? null,
      custom: id ? null : (c?.custom ?? null),
      grade: cell ? cell.assessment.overall : 'gray',
      assessment: cell?.assessment ?? null,
      needMm: cell?.needMm ?? null,
      rainMm: cell?.rainMm ?? null,
      extraMm: cell?.extraMm ?? null,
      soilPoints: soil.points,
      soilReasons: soil.reasons,
    }
  })
  const known = seasons.every((s) => s.crop && s.extraMm != null)
  const ids = seasons.map((s) => s.crop ?? `custom:${s.custom}`)
  return {
    seasons,
    complete: known && seasons.length === 3,
    extraMm: known ? seasons.reduce((a, s) => a + s.extraMm, 0) : null,
    soilPoints: seasons.every((s) => s.soilPoints != null) ? seasons.reduce((a, s) => a + s.soilPoints, 0) : null,
    suitPoints: seasons.reduce((a, s) => a + (RG_GRADE_PTS[s.grade] ?? 0), 0),
    variety: new Set(ids).size,
    hasRed: seasons.some((s) => s.grade === 'red'),
    yellowSeasons: seasons.filter((s) => s.grade === 'yellow').length,
    graySeasons: seasons.filter((s) => s.grade === 'gray').length,
  }
}

/**
 * Sinh và xếp hạng các chuỗi 3 vụ. wish: kết quả rgParseWish (để nhấn trọng số + so với cách đang làm).
 * Trả về { proposals: [3], more: [...], current, weights, total } — mỗi phương án có đủ số để giải thích.
 */
export function rgGenerate(grid, { wish = null, params = RG_PARAMS } = {}) {
  if (!grid) return { proposals: [], more: [], current: null, weights: null, total: 0 }
  const w = { ...params.weights }
  for (const k of Object.keys(w)) if (wish?.emphasis?.[k]) w[k] *= params.emphasisFactor
  const sumW = Object.values(w).reduce((a, b) => a + b, 0)
  const ok = grid.map((g) => CROP_LIB_IDS.filter((c) => g.cells[c].assessment.overall !== 'red'))
  const cands = []
  for (const a of ok[0]) for (const b of ok[1]) for (const c of ok[2]) cands.push({ crops: [a, b, c], ...rgMeasure(grid, [a, b, c]) })
  if (!cands.length) return { proposals: [], more: [], current: wish?.crops?.length ? rgMeasure(grid, wish.crops) : null, weights: w, total: 0 }
  const extras = cands.map((x) => x.extraMm).filter((v) => v != null)
  const minExtra = extras.length ? Math.min(...extras) : null
  const maxSoil = Math.max(...cands.map((x) => x.soilPoints ?? 0), 1)
  const scoreOf = (x) => {
    // Thành phần 0–1. Nước: "tốt nhất ÷ này" (+1 mm để chuỗi 0 mm không chia cho 0) — cùng tinh thần scaleLowerBetter.
    const comps = {
      suit: x.suitPoints / 6,
      water: x.extraMm == null || minExtra == null ? 0 : (minExtra + 1) / (x.extraMm + 1),
      soil: (x.soilPoints ?? 0) / maxSoil,
      variety: (x.variety - 1) / 2,
    }
    return { comps, score: Math.round(Object.keys(w).reduce((s, k) => s + comps[k] * w[k], 0) / sumW * 100) }
  }
  for (const x of cands) {
    Object.assign(x, scoreOf(x))
    x.key = x.crops.join('>')
  }
  cands.sort((p, q) => q.score - p.score || (p.extraMm ?? 1e9) - (q.extraMm ?? 1e9) || p.key.localeCompare(q.key))
  const used = new Set()
  const picked = []
  // Đề xuất sau phải khác các đề xuất trước ở ít nhất 2 vụ (do nhóm chọn), để 3 lựa chọn thật sự khác nhau.
  const differs = (c) => picked.every((p) => p.crops.filter((x, i) => x !== c.crops[i]).length >= 2)
  const take = (kind, list, extra = () => true) => {
    const x = list.find((c) => !used.has(c.key) && differs(c) && extra(c)) ?? list.find((c) => !used.has(c.key))
    if (!x) return null
    used.add(x.key)
    picked.push(x)
    return { ...x, kind }
  }
  const proposals = [
    take('balanced', cands),
    take('water', [...cands].sort((p, q) => (p.extraMm ?? 1e9) - (q.extraMm ?? 1e9) || q.score - p.score)),
    // Tốt cho đất: không nhận chuỗi một loại cây cả 3 vụ (độc canh không phải "luân canh").
    take('soil', [...cands].sort((p, q) => (q.soilPoints ?? 0) - (p.soilPoints ?? 0) || q.score - p.score), (c) => c.variety >= 2),
  ].filter(Boolean).slice(0, params.keep)
  const more = cands.filter((c) => !used.has(c.key)).slice(0, params.more).map((c) => ({ ...c, kind: 'more' }))
  let current = null
  if (wish?.crops?.length) {
    const m = rgMeasure(grid, wish.crops)
    // Cách đang làm được chấm CÙNG thang điểm (nếu đủ 3 cây trong thư viện) để so sánh công bằng.
    current = { ...m, ...(m.complete ? scoreOf(m) : { score: null, comps: null }), crops: wish.crops.map((c) => c.id ?? null), customNames: wish.crops.map((c) => c.custom ?? null), kind: 'current', key: 'current' }
  }
  return { proposals, more, current, weights: w, total: cands.length }
}

/**
 * Kiểm chứng đề xuất của AI (Tầng 2): mỗi chuỗi được chấm LẠI bằng đúng lưới vụ ở trên.
 *   ai: [{ title, crops: ['ngô', 'đậu phộng', 'lúa'], rationale, tactics: [] }]
 * Cây trong thư viện → chấm thật; ngoài thư viện → đánh dấu thiếu tham số FAO. Số lạ trong lời giải thích → bỏ lời giải thích.
 */
export function rgCheckAi(grid, ai, { verify = null } = {}) {
  if (!Array.isArray(ai)) return []
  return ai.slice(0, 6).map((s, idx) => {
    const crops = (Array.isArray(s?.crops) ? s.crops : []).slice(0, 3).map((name) => {
      const id = suitFindCrop(String(name ?? '').trim()) ?? rgParseWish(String(name ?? '')).crops[0]?.id ?? null
      return id ? { id } : { id: null, custom: String(name ?? '').trim().slice(0, 40) }
    })
    const m = rgMeasure(grid, crops)
    const rationale = typeof s?.rationale === 'string' ? s.rationale.slice(0, 600) : ''
    const tactics = (Array.isArray(s?.tactics) ? s.tactics : []).filter((t) => typeof t === 'string').slice(0, 4).map((t) => t.slice(0, 200))
    const okText = (t) => !verify || verify(t)
    return {
      ...m,
      kind: 'ai',
      key: `ai-${idx}`,
      crops: crops.map((c) => c.id),
      customNames: crops.map((c) => c.custom ?? null),
      title: typeof s?.title === 'string' ? s.title.slice(0, 80) : '',
      rationale: okText(rationale) ? rationale : '',
      rationaleDropped: Boolean(rationale) && !okText(rationale),
      tactics: tactics.filter(okText),
      missingParams: crops.some((c) => !c.id),
    }
  })
}
