// Trang Luân canh theo TỪNG THỬA (DS.gardens), 2 tầng như YouTube:
//   Tầng 1 (RF.mode 'grid')   — lưới thẻ ảnh vệ tinh, mỗi thẻ một thửa (hoặc một huyện để khám phá nhanh).
//   Tầng 2 (RF.mode 'detail') — một thửa: dữ liệu đã có/còn thiếu, 4 nút mục tiêu, 3 câu hỏi đời thường.
// Cùng file này có thẻ "cầu nối" cho Tab 4. Chiến thuật ở Ruộng của tôi (rfBridgeHtml, rfOpenGardenStrategy).
// Vì sao một file: mọi con số đều đi qua fsAssessField() ở đây, nên trang Luân canh và Tab 4 luôn nói cùng một kết quả.
// Dùng tiện ích của template ($, esc, icon, S, whatIfTag, PRECOMPUTED, pageHref, revealNow…) vì build gộp mọi module.
// Mọi top-level đều có tiền tố rf / RF_ để không trùng tên trong phạm vi gộp chung.
import { evidence } from '../core/evidence.js'
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { PROVINCES } from '../data/provinces.js'
import { PROFIT_RATIO_UPLAND, SOURCES } from '../data/rotationCrops.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { ROT_TEXT } from '../i18n/rotationText.js'
import { STRAT_TEXT } from '../i18n/strategyText.js'
import { fsAssessField, fsCalendarSource } from '../logic/fieldStrategies.js'
import { gmColor } from '../logic/gardenModel.js'
import { GEO_PARAMS } from '../logic/geometry.js'
import { DS, dsSelectGarden } from '../sources/dataStore.js'
import { powerClimate, powerReadCache } from '../sources/power.js'

// Trạng thái riêng của khối này.
//   mode: 'grid' | 'detail' · view: id thửa | 'district' · pick: phương án đang xem ở tầng 2 (null = phương án đứng đầu)
const RF = { mode: 'grid', view: null, pick: null, irrigation: null, ph: null, ece: null }

// 4 nút mục tiêu 1 chạm: chỉ là bộ trọng số đặt sẵn cho thanh ưu tiên (do nhóm chọn), không phải số đo.
const RF_GOALS = {
  balanced: { water: 50, soil: 50, income: 50, risk: 50 },
  water: { water: 90, risk: 80, soil: 40, income: 40 },
  soil: { soil: 90, income: 85, water: 40, risk: 40 },
  safe: { risk: 95, water: 85, soil: 50, income: 40 },
}
const RF_IRRIGATION = ['yes', 'limited', 'no', 'unknown']
const RF_SEASONS = ['dx', 'ht', 'td']
const RF_DOT = { green: 'bg-moss-700', yellow: 'bg-sun-400', red: 'bg-clay-700', gray: 'bg-line' }
// Màu ranh thửa trên ảnh vệ tinh theo trạng thái (sáng để nổi trên nền tối).
const RF_STATUS_FILL = { good: '#b8e55a', caution: '#f2b134', missing: '#ffffff', none: '#f6ddd2' }
const RF_STATUS_TONE = {
  good: 'bg-[#6d9b37] text-white',
  caution: 'bg-sun-400 text-moss-950',
  missing: 'bg-white/90 text-moss-950',
  none: 'bg-clay-100 text-clay-700',
}
const RF_TILE = 256 // ô ảnh Web Mercator chuẩn 256 px
const RF_THUMB = { w: 320, h: 180, fit: 0.6, zMax: 17, zMin: 12 } // khung 16:9; ranh thửa chiếm tối đa 60% khung
const RF_ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile'

const rfF = () => STRAT_TEXT[S.lang].farm
const rfCap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const rfCropName = (c) => rfCap(CROP_LIBRARY[c]?.name[S.lang] ?? ROT_TEXT[S.lang].crops[c] ?? c)
// Hàm DUY NHẤT in số trong khối này (định dạng theo ngôn ngữ đang chọn).
const rfNum = (v, d = 0) => Number(v).toLocaleString(ROT_TEXT[S.lang].locale, { minimumFractionDigits: 0, maximumFractionDigits: d })
const rfMonthRange = (months) => {
  const R = ROT_TEXT[S.lang]
  return months?.length ? `${R.months[months[0] - 1]}–${R.months[months[months.length - 1] - 1]}` : rfF().noMonths
}
const rfDistrictShort = (id) => PROVINCES.find((p) => p.id === id)?.name.split(' · ')[0] ?? null

/* ---------------- Đầu vào của một thửa / của chế độ huyện ---------------- */

// Khí hậu cho thửa: ưu tiên số NASA POWER đã tải đúng tọa độ thửa; không có thì dùng số tính sẵn của huyện lịch vụ.
function rfGardenClimate(g, cal) {
  const cached = Number.isFinite(g.lat) && Number.isFinite(g.lon) ? powerReadCache(g.lat, g.lon) : null
  if (cached) return { climate: powerClimate(cached, { origin: 'cache' }), origin: 'own' }
  const stored = cal.districtId ? PRECOMPUTED.power.find((d) => d.id === cal.districtId) : null
  if (stored?.record) return { climate: powerClimate(stored.record, { origin: 'precomputed' }), origin: 'district' }
  return { climate: null, origin: null }
}

const rfPhEvidence = (v) => (typeof v === 'number' && Number.isFinite(v) ? evidence({ value: v, unit: '', kind: 'ground', label: 'phField' }) : null)
const rfEceEvidence = (v) => (typeof v === 'number' && Number.isFinite(v) ? evidence({ value: v, unit: 'dS/m', kind: 'ground', label: 'salinityField' }) : null)
const rfIrrigationValue = (v) => (['yes', 'limited', 'no'].includes(v) ? v : null)

/**
 * Đánh dấu "Hay ngập" của nông dân cho MỘT thửa → Evidence 'farmer' (giá trị = số điểm đánh dấu), như myFieldData.js.
 * Chỉ đếm dấu có gardenId đúng thửa: dấu của thửa bên cạnh không được làm thửa này "hay ngập".
 * Loại dấu là 'flood' — đúng tên mà bản đồ lưu (FI_MARK_TYPES trong farmerInput.js, nút "Hay ngập" ở myFieldData.js).
 * Vì sao ghi rõ: bản trước đếm 'waterlogged' (tên đoán theo prompt) nên dấu thật luôn ra 0.
 */
export function rfFloodMarksEvidence(marks, gardenId) {
  const count = (marks ?? []).filter((m) => m.gardenId === gardenId && m.type === 'flood').length
  return { count, ev: count > 0 ? evidence({ value: count, unit: 'marks', kind: 'farmer', label: 'floodMarks' }) : null }
}

// Giả định của trang Luân canh (mưa mùa khô, nhiệt độ) áp cho đúng huyện lịch vụ của thửa.
function rfWhatIf(districtId) {
  const et0Pair = S.rotWhatIf.deltaT && districtId ? rxEt0Pair(districtId, S.rotWhatIf.deltaT) : null
  return { whatIf: { rainPct: S.rotWhatIf.dryRainPct }, et0Pair }
}

/** Chạy fsAssessField cho một thửa trong DS.gardens. Trả về { res, garden, climateOrigin, calendar, floodCount }. */
function rfEvaluateGarden(g) {
  const p = g.profile ?? {}
  const loc = { lat: g.lat, lon: g.lon, id: g.districtId ?? null, name: g.name }
  const calendar = fsCalendarSource(loc, PROVINCES)
  const { climate, origin } = rfGardenClimate(g, calendar)
  const flood = rfFloodMarksEvidence(DS.marks, g.id)
  const res = fsAssessField({
    loc,
    provinces: PROVINCES,
    precomputed: PRECOMPUTED,
    climate,
    irrigation: rfIrrigationValue(p.irrigation),
    ph: rfPhEvidence(p.ph),
    salinityEce: rfEceEvidence(p.ec),
    salinityType: p.ec != null ? (p.ecType ?? 'unknown') : null,
    floodMarks: flood.ev,
    cropChange: p.cropChange ?? 'yes',
    currentId: p.currentId ?? 'A',
    priorities: S.rotPriorities,
    ...rfWhatIf(calendar.districtId),
  })
  return { res, garden: g, climateOrigin: origin, calendar, floodCount: flood.count }
}

/** Tính theo tâm một huyện với các câu trả lời nhanh trên trang (nguồn nước, kiểu đang trồng, pH/ECe). */
function rfEvaluateDistrict(id = S.rotDistrict) {
  const loc = PROVINCES.find((p) => p.id === id)
  const stored = PRECOMPUTED.power.find((d) => d.id === loc.id)
  const climate = stored?.record ? powerClimate(stored.record, { origin: 'precomputed' }) : null
  const res = fsAssessField({
    loc,
    provinces: PROVINCES,
    precomputed: PRECOMPUTED,
    climate,
    irrigation: RF.irrigation,
    ph: rfPhEvidence(RF.ph),
    salinityEce: rfEceEvidence(RF.ece),
    salinityType: RF.ece != null ? 'ece' : null,
    cropChange: 'yes',
    currentId: S.rotCurrent,
    priorities: S.rotPriorities,
    ...rfWhatIf(loc.id),
  })
  return { res, garden: null, district: loc, climateOrigin: climate ? 'district' : null, calendar: res.calendar, floodCount: null }
}

/* ---------------- Tóm tắt kết quả: trạng thái, câu kết luận ---------------- */

// good: có phương án đứng đầu, rủi ro thấp · caution: đứng đầu nhưng cần chú ý · missing: thiếu dữ liệu · none: mọi phương án bị loại.
function rfStatus(res) {
  const best = res?.strategies?.find((s) => s.rank === 1) ?? null
  if (best) return { key: best.riskLevel === 'lower' ? 'good' : 'caution', best }
  if (res?.strategies?.some((s) => s.eligibility === 'insufficient_data')) return { key: 'missing', best: null }
  return { key: 'none', best: null }
}

// Nước tưới thêm/năm của phương án so với 3 vụ lúa (dương = ít hơn lúa). Không có lịch 3 vụ → null.
function rfWaterSaving(s, res) {
  const base = res.rotResult?.rotations?.find((r) => r.baseline)
  return base && s?.rot ? base.measures.extraMm - s.rot.measures.extraMm : null
}

const rfPickMissing = (fields) => ['irrigation', 'climate', 'ndviCalendar', 'ph', 'salinityEce'].find((f) => fields.includes(f)) ?? fields[0]

/** Một câu kết luận siêu ngắn cho thẻ thửa (dưới ảnh). */
function rfCardSentence(res) {
  const F = rfF()
  const { key, best } = rfStatus(res)
  if (best) {
    const crops = best.crops.map(rfCropName).join(' – ')
    if (best.isBaseline && best.strategyId === 'A') return F.cardTopBase(crops)
    const saving = rfWaterSaving(best, res)
    return saving != null && saving >= 1 ? F.cardTopWater(crops, rfNum(saving)) : F.cardTop(crops)
  }
  if (key === 'missing') {
    const s = res.strategies.find((x) => x.eligibility === 'insufficient_data')
    const first = rfPickMissing(s.missingFields)
    return first === 'irrigation' ? F.cardNeedIrr : F.cardNeed(F.missing[first] ?? first)
  }
  const reasons = [...new Set(res.strategies.flatMap((s) => s.unmetConstraints))].map((u) => F.unmet[u] ?? u)
  return F.cardNone(reasons.join('; '))
}

// Chuỗi 3 vụ ngắn: "ĐX: Lúa ➔ HT: Đậu xanh ➔ TĐ: Lúa".
function rfSeasonChain(s) {
  const R = ROT_TEXT[S.lang]
  return s.crops.map((c, i) => `${R.seasonShort[s.windows?.[i]?.season ?? RF_SEASONS[i]]}: ${rfCropName(c)}`).join(' ➔ ')
}

/* ---------------- Ảnh vệ tinh thật (Esri World Imagery) + ranh thửa ---------------- */

// Tọa độ điểm ảnh toàn cầu Web Mercator ở mức zoom z (công thức chuẩn của ô ảnh 256 px).
export function rfMercPx(lat, lon, z) {
  const n = RF_TILE * 2 ** z
  const s = Math.sin((lat * Math.PI) / 180)
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}

// Ranh thửa lưu theo [vĩ độ, kinh độ]; phòng hờ bản ghi đảo thứ tự (vĩ độ không thể > 90).
const rfLatLon = (pt) => (Math.abs(pt[0]) > 90 ? [pt[1], pt[0]] : pt)

/**
 * Khung ảnh 16:9 (viewBox 320×180 điểm ảnh) quanh một thửa: ghép các ô ảnh thật phủ khung, vẽ ranh thửa
 * chiếu cùng hệ tọa độ nên ranh nằm ĐÚNG chỗ trên ảnh. Chọn zoom lớn nhất mà ranh còn vừa 60% khung.
 * Trả về { z, x0, y0, tiles: [{ z, x, y, left, top, url }], points: [[x, y]...] | null, center: [x, y] }.
 */
export function rfThumbFrame({ lat, lon, polygon = null, z = null }) {
  const pts = Array.isArray(polygon) && polygon.length >= 3 ? polygon.map(rfLatLon) : null
  const { w, h } = RF_THUMB
  let zoom = z ?? 16
  if (pts && z == null) {
    zoom = RF_THUMB.zMin
    for (let k = RF_THUMB.zMax; k >= RF_THUMB.zMin; k--) {
      const px = pts.map(([a, b]) => rfMercPx(a, b, k))
      const bw = Math.max(...px.map((p) => p[0])) - Math.min(...px.map((p) => p[0]))
      const bh = Math.max(...px.map((p) => p[1])) - Math.min(...px.map((p) => p[1]))
      if (bw <= w * RF_THUMB.fit && bh <= h * RF_THUMB.fit) { zoom = k; break }
    }
  }
  let cx, cy
  if (pts) {
    const px = pts.map(([a, b]) => rfMercPx(a, b, zoom))
    cx = (Math.max(...px.map((p) => p[0])) + Math.min(...px.map((p) => p[0]))) / 2
    cy = (Math.max(...px.map((p) => p[1])) + Math.min(...px.map((p) => p[1]))) / 2
  } else {
    ;[cx, cy] = rfMercPx(lat, lon, zoom)
  }
  const x0 = cx - w / 2
  const y0 = cy - h / 2
  const tiles = []
  for (let tx = Math.floor(x0 / RF_TILE); tx <= Math.floor((x0 + w) / RF_TILE); tx++) {
    for (let ty = Math.floor(y0 / RF_TILE); ty <= Math.floor((y0 + h) / RF_TILE); ty++) {
      tiles.push({ z: zoom, x: tx, y: ty, left: tx * RF_TILE - x0, top: ty * RF_TILE - y0, url: `${RF_ESRI}/${zoom}/${ty}/${tx}` })
    }
  }
  const points = pts ? pts.map(([a, b]) => { const [x, y] = rfMercPx(a, b, zoom); return [x - x0, y - y0] }) : null
  return { z: zoom, x0, y0, tiles, points, center: [w / 2, h / 2] }
}

// Nền dự phòng khi mất mạng: lưới tọa độ trên nền xanh rừng tràm.
const RF_GRID_BG = 'background-color:#173d2b;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:16px 16px'

/** Ảnh 16:9 kiểu thumbnail YouTube. opts: { lat, lon, polygon, z, stroke, status, label, tags, chain, corner }. */
function rfThumbHtml(opts) {
  const F = rfF()
  const frame = rfThumbFrame(opts)
  const fill = RF_STATUS_FILL[opts.status] ?? '#ffffff'
  const stroke = opts.stroke ?? '#ffffff'
  const shape = frame.points
    ? `<polygon points="${frame.points.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" fill-opacity="0.28" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round" opacity="0.9"/>
       <polygon points="${frame.points.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"${opts.trace ? ' pathLength="1" class="rf-trace"' : ''}/>`
    : `<circle cx="${frame.center[0]}" cy="${frame.center[1]}" r="5" fill="${fill}" stroke="#ffffff" stroke-width="2"/>`
  const svg = `<svg viewBox="0 0 ${RF_THUMB.w} ${RF_THUMB.h}" preserveAspectRatio="xMidYMid slice" class="absolute inset-0 size-full" role="img" aria-label="${esc(F.thumbAlt(opts.label ?? ''))}">
      ${frame.tiles.map((t) => `<image href="${t.url}" x="${t.left}" y="${t.top}" width="${RF_TILE}" height="${RF_TILE}" preserveAspectRatio="none"/>`).join('')}
      ${shape}
    </svg>`
  const badge = opts.status ? `<span class="absolute left-2.5 top-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-full px-2.5 py-1 text-xs font-extrabold shadow-card ${RF_STATUS_TONE[opts.status]}">${esc(F.badge[opts.status])}</span>` : ''
  const tags = opts.tags?.length ? `<span class="absolute ${opts.status ? 'top-10' : 'top-2.5'} right-2.5 rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">${esc(opts.tags.join(' · '))}</span>` : ''
  const chain = opts.chain ? `<span class="absolute bottom-9 left-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-md bg-[#173d2b]/85 px-2 py-1 text-[11px] font-bold text-white">${esc(opts.chain)}</span>` : ''
  const corner = opts.corner ? `<span class="absolute bottom-2.5 right-2.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">${esc(opts.corner)}</span>` : ''
  // hero: ảnh này là "cùng một tấm" giữa thẻ lưới và banner chi tiết → View Transition nối hai màn hình.
  const hero = opts.hero ? ';view-transition-name:rf-hero' : ''
  return `<div class="rf-thumb relative aspect-video overflow-hidden" style="${RF_GRID_BG}${hero}">
      ${svg}
      <div class="pointer-events-none absolute inset-0" style="background:linear-gradient(180deg,rgba(23,61,43,0.25) 0%,rgba(17,45,39,0.82) 100%)"></div>
      ${badge}${tags}${chain}${corner}
    </div>`
}

// Nhãn nguồn dữ liệu THỰC SỰ dùng cho thửa (không gắn khi không có).
function rfSourceTags(ev) {
  const tags = []
  if (ev.climateOrigin) tags.push('NASA POWER')
  if (ev.res?.baseRankable) tags.push('MODIS')
  return tags
}

const rfGroupColor = (g) => gmColor(DS.gardenGroups?.find((gr) => gr.id === g.groupId)?.color)

function rfGardenCorner(g, ev) {
  const d = rfDistrictShort(ev.calendar.districtId)
  return [`${rfAreaHa(g)} ha`, d].filter(Boolean).join(' · ')
}

/* ---------------- Tầng 1: lưới thẻ ---------------- */

function rfGardenCard(ev) {
  const g = ev.garden
  const { key, best } = rfStatus(ev.res)
  const shown = best ?? ev.res.strategies[0]
  return `<article class="rf-card rounded-[24px] border border-[#dce3d5] bg-[#fafbf6] overflow-hidden shadow-card cursor-pointer" data-reveal="rf-card-${esc(g.id)}">
      <button type="button" data-rf="openDetail" data-value="${esc(g.id)}" class="block w-full text-left">
        ${rfThumbHtml({ lat: g.lat, lon: g.lon, polygon: g.polygon, stroke: rfGroupColor(g), status: key, label: g.name, tags: rfSourceTags(ev), chain: shown ? rfSeasonChain(shown) : null, corner: rfGardenCorner(g, ev), hero: RF.view === g.id })}
        <div class="p-4">
          <p class="flex items-center gap-2 text-lg font-extrabold text-[#173d2b]"><span class="inline-block size-3 shrink-0 rounded-full" style="background:${rfGroupColor(g)}" aria-hidden="true"></span><span class="truncate">${esc(g.name || '—')}</span></p>
          <p class="mt-1 text-sm leading-relaxed text-ink">${esc(rfCardSentence(ev.res))}</p>
        </div>
      </button>
    </article>`
}

function rfDrawCard() {
  const F = rfF()
  return `<a href="${pageHref('myfield')}" class="rf-card flex min-h-56 flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-[#6d9b37] bg-[#f7f8f2] p-6 text-center hover:bg-[#edf1e4]" data-reveal="rf-draw">
      <span class="grid size-14 place-items-center rounded-full bg-[#173d2b] text-3xl font-extrabold text-white" aria-hidden="true">+</span>
      <span class="text-lg font-extrabold text-[#173d2b]">${esc(F.drawCardTitle)}</span>
      <span class="text-sm text-muted">${esc(F.drawCardSub)}</span>
    </a>`
}

function rfGridHtml() {
  const F = rfF()
  const gardens = DS.gardens ?? []
  const evals = gardens.map(rfEvaluateGarden)
  // Chỉ còn lưới thẻ thửa + thẻ "+ Vẽ thửa" (prompt 03): bảng tổng hợp và 5 huyện mẫu đã bỏ để trang không rối mắt.
  const cards = gardens.length
    ? `<p class="mt-1 text-[15px] text-muted">${esc(F.gridSub)}</p>
       <div class="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${evals.map(rfGardenCard).join('')}${rfDrawCard()}</div>`
    : `<p class="mt-1 text-[15px] text-muted">${esc(F.noFields)}</p>
       <div class="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${rfDrawCard()}</div>`
  // Dòng ghi công ảnh Esri giữ lại (rất nhỏ) vì điều khoản dùng ảnh nền bắt buộc ghi nguồn.
  return `<h3 class="text-2xl font-extrabold tracking-tight text-[#173d2b]">${esc(F.gridTitle)}</h3>
    ${cards}
    ${gardens.length ? `<p class="mt-3 text-xs text-muted">${esc(F.imageryCredit)}</p>` : ''}`
}

/* ---------------- Tầng 2: chi tiết một thửa ---------------- */

// Hình ranh thửa nhỏ (chỉ hình dạng, không phải ảnh) cho chip đổi nhanh thửa.
function rfMiniShape(g) {
  const pts = Array.isArray(g.polygon) && g.polygon.length >= 3 ? g.polygon.map(rfLatLon).map(([a, b]) => rfMercPx(a, b, 18)) : null
  if (!pts) return `<span class="inline-block size-3 rounded-full" style="background:${rfGroupColor(g)}" aria-hidden="true"></span>`
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [mx, my] = [Math.min(...xs), Math.min(...ys)]
  const scale = 20 / Math.max(Math.max(...xs) - mx, Math.max(...ys) - my, 1e-6)
  const points = pts.map(([x, y]) => `${((x - mx) * scale + 2).toFixed(1)},${((y - my) * scale + 2).toFixed(1)}`).join(' ')
  return `<svg viewBox="0 0 24 24" class="size-6 shrink-0 rounded bg-[#173d2b]" aria-hidden="true"><polygon points="${points}" fill="${rfGroupColor(g)}" fill-opacity="0.5" stroke="#ffffff" stroke-width="1.2"/></svg>`
}

function rfDetailNavHtml() {
  const F = rfF()
  const chip = (attr, value, inner, on) =>
    `<button type="button" data-rf="${attr}" data-value="${esc(value)}" aria-pressed="${on}" class="rf-press inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-bold ${on ? 'border-[#173d2b] bg-[#173d2b] text-white' : 'border-line bg-white text-ink hover:border-moss-700'}">${inner}</button>`
  const gardens = DS.gardens ?? []
  const chips = gardens.map((g) => chip('openDetail', g.id, `${rfMiniShape(g)}<span>${esc(g.name || '—')}</span>`, RF.view === g.id))
  // Đã có thửa riêng thì ẩn chip "theo huyện" cho gọn; chưa có thửa nào thì đó là lối xem duy nhất.
  if (!gardens.length) chips.push(chip('openDistrict', S.rotDistrict, `<span>${esc(F.byDistrict)}</span>`, RF.view === 'district'))
  return `<div class="flex flex-wrap items-center gap-3">
      <button type="button" data-rf="backToGrid" class="rf-press min-h-12 rounded-full bg-[#173d2b] px-5 text-base font-extrabold text-white shadow-card hover:bg-[#254f35]">${esc(F.backToGrid)}</button>
      <span class="text-sm font-bold text-muted">${esc(F.otherFields)}</span>
      <div class="flex flex-wrap gap-2">${chips.join('')}</div>
    </div>`
}

// Thanh minh bạch dữ liệu: cái gì đã có (✓) và cái gì còn thiếu (kèm nút bổ sung ngay).
function rfTransparencyHtml(ev) {
  const F = rfF()
  const g = ev.garden
  const p = g?.profile ?? {}
  const fix = g
    ? `<button type="button" data-rf="editField" data-value="${esc(g.id)}" class="ml-1 rounded-full bg-[#173d2b] px-2.5 py-0.5 text-xs font-extrabold text-white">${esc(F.dataAdd)}</button>`
    : `<button type="button" data-rf="focusQuick" class="ml-1 rounded-full bg-[#173d2b] px-2.5 py-0.5 text-xs font-extrabold text-white">${esc(F.dataAdd)}</button>`
  const row = (ok, label, detail, canFix = true) =>
    `<li class="flex flex-wrap items-center gap-1.5 text-sm"><span class="grid size-5 place-items-center rounded-full text-xs font-extrabold ${ok ? 'bg-[#6d9b37] text-white' : 'bg-sun-100 text-sun-700'}" aria-hidden="true">${ok ? '✓' : '!'}</span><span class="font-bold text-ink">${esc(label)}</span><span class="text-muted">${esc(detail)}</span>${!ok && canFix ? fix : ''}</li>`
  const cal = ev.calendar
  const calOk = Boolean(ev.res.baseRankable)
  const calDetail = !calOk ? F.dataMissing : cal.mode === 'borrowed' ? F.dataCalBorrowed(rfNum(cal.distanceKm, 1)) : F.dataCalDirect
  const climateDetail = ev.climateOrigin === 'own' ? F.dataClimateOwn : ev.climateOrigin === 'district' ? F.dataClimateDistrict : F.dataMissing
  const have = [
    g ? row(Array.isArray(g.polygon) && g.polygon.length >= 3, F.dataItems.boundary, Array.isArray(g.polygon) && g.polygon.length >= 3 ? F.dataBoundaryOk : F.dataPointOnly) : row(true, F.dataItems.boundary, F.dataDistrictCenter, false),
    row(Boolean(ev.climateOrigin), F.dataItems.climate, climateDetail),
    row(calOk, F.dataItems.calendar, calDetail, false),
  ]
  const irr = g ? rfIrrigationValue(p.irrigation) : RF.irrigation
  const ph = g ? p.ph : RF.ph
  const ec = g ? p.ec : RF.ece
  const ecType = g ? (p.ecType ?? 'unknown') : 'ece'
  const farm = [
    row(Boolean(irr), F.dataItems.irrigation, irr ? F.irrigation[irr] : F.dataMissing),
    row(typeof ph === 'number', F.dataItems.ph, typeof ph === 'number' ? rfNum(ph, 1) : F.dataMissing),
    row(typeof ec === 'number' && ecType === 'ece', F.dataItems.ece, typeof ec === 'number' ? F.condEc(rfNum(ec, 1), ecType) : F.dataMissing),
    g
      ? row(true, F.dataItems.flood, ev.floodCount ? F.floodCount(rfNum(ev.floodCount)) : F.floodNone, false)
      : row(true, F.dataItems.flood, F.floodDistrict, false),
  ]
  return `<div class="grid gap-4 sm:grid-cols-2">
      <div><p class="text-xs font-extrabold uppercase tracking-wide text-[#6d9b37]">${esc(F.dataHaveTitle)}</p><ul class="mt-2 grid gap-1.5">${have.join('')}</ul></div>
      <div><p class="text-xs font-extrabold uppercase tracking-wide text-[#6d9b37]">${esc(F.dataFarmTitle)}</p><ul class="mt-2 grid gap-1.5">${farm.join('')}</ul></div>
    </div>`
}

function rfBannerHtml(ev) {
  const F = rfF()
  const g = ev.garden
  const { key, best } = rfStatus(ev.res)
  const shown = best ?? ev.res.strategies[0]
  const thumb = g
    ? rfThumbHtml({ lat: g.lat, lon: g.lon, polygon: g.polygon, stroke: rfGroupColor(g), status: key, label: g.name, tags: rfSourceTags(ev), chain: shown ? rfSeasonChain(shown) : null, corner: rfGardenCorner(g, ev), hero: true, trace: true })
    : rfThumbHtml({ lat: ev.district.lat, lon: ev.district.lon, z: 13, status: key, label: ev.district.name, tags: rfSourceTags(ev), chain: shown ? rfSeasonChain(shown) : null, corner: ev.district.name, hero: true })
  const title = g ? g.name || '—' : F.districtHeading(ev.district.name)
  const sub = g ? rfGardenCorner(g, ev) : F.districtSub
  return `<div class="grid overflow-hidden rounded-[28px] border border-[#dce3d5] bg-[#fafbf6] shadow-card lg:grid-cols-[minmax(0,420px)_1fr]" data-reveal="rf-banner-${esc(g ? g.id : 'district')}">
      <div class="min-w-0">${thumb}</div>
      <div class="min-w-0 p-5">
        <h3 class="text-2xl font-extrabold tracking-tight text-[#173d2b]">${esc(title)}</h3>
        <p class="mt-0.5 text-sm font-bold text-muted">${esc(sub)}</p>
        <div class="mt-2">${rfClimateNoteHtml(ev)}</div>
        <div class="mt-4">${rfTransparencyHtml(ev)}</div>
      </div>
    </div>`
}

function rfPickHtml(res, selected) {
  const F = rfF()
  const pill = (s) => {
    const on = s.strategyId === selected.strategyId
    const key = s.rank === 1 ? 'top' : s.eligibility
    return `<button type="button" data-rf="pick" data-value="${s.strategyId}" aria-pressed="${on}" class="rf-press min-h-14 rounded-2xl border-2 px-4 py-2 text-left ${on ? 'border-[#173d2b] bg-[#173d2b] text-white' : 'border-line bg-white text-ink hover:border-moss-700'}">
        <span class="block text-base font-extrabold">${esc(s.strategyId)}. ${esc(s.crops.map(rfCropName).join(' – '))}</span>
        <span class="block text-xs font-bold ${on ? 'text-white/85' : 'text-muted'}">${esc(F.verdict[key])}</span>
      </button>`
  }
  return `<div data-reveal="rf-pick-${esc(RF.view || 'd')}"><p class="text-sm font-extrabold text-muted">${esc(F.pickTitle)}</p><div class="mt-2 grid gap-2 sm:grid-cols-3">${res.strategies.map(pill).join('')}</div></div>`
}

// Câu 1: 3 ô vụ lớn nối bằng mũi tên, kèm đèn màu và cây có thể thay.
function rfQ1Html(s, res) {
  const F = rfF()
  const R = ROT_TEXT[S.lang]
  const cells = s.crops.map((crop, i) => {
    const w = s.windows?.[i] ?? null
    const grade = s.assessments[i]?.overall ?? 'gray'
    const greens = (res.seasonAlternatives?.[i]?.greenCrops ?? []).filter((c) => c.crop !== crop).map((c) => rfCropName(c.crop))
    return `<li class="min-w-0 flex-1 rounded-2xl border border-[#dce3d5] bg-white p-4">
        <p class="text-xs font-extrabold uppercase tracking-wide text-[#6d9b37]">${esc(R.seasons[w?.season ?? RF_SEASONS[i]])}</p>
        <p class="text-sm font-bold text-muted">${esc(w ? rfMonthRange(w.months) : F.noMonths)}</p>
        <p class="mt-2 text-2xl font-extrabold text-[#173d2b]">${esc(rfCropName(crop))}</p>
        <p class="mt-2 flex items-center gap-2 text-sm font-bold text-ink"><span class="inline-block size-3.5 rounded-full ${RF_DOT[grade]}" aria-hidden="true"></span>${esc(F.grade[grade])}</p>
        ${res.seasonAlternatives ? `<p class="mt-2 text-xs leading-relaxed text-muted"><span class="font-bold">${esc(F.swapLead)}</span> ${esc(greens.length ? greens.join(', ') : F.swapNone)}</p>` : ''}
      </li>`
  })
  return `<ol class="mt-3 flex flex-col items-stretch gap-2 md:flex-row" aria-label="${esc(F.q1)}">${cells.join('<li aria-hidden="true" class="self-center text-2xl font-extrabold text-[#6d9b37] md:rotate-0 rotate-90">➔</li>')}</ol>`
}

// Một thanh so sánh: nhãn, số, và vạch dài theo tỉ lệ với giá trị lớn nhất trong nhóm.
function rfBar(label, value, max, tone, valueText) {
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0
  return `<div><div class="flex justify-between gap-2 text-xs font-bold text-ink"><span>${esc(label)}</span><span class="tabular-nums">${esc(valueText)}</span></div>
      <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-[#edf1e4]"><div class="rf-bar h-full rounded-full ${tone}" style="--rf-w:${(pct / 100).toFixed(3)}"></div></div></div>`
}

// Câu 2: 3 thanh so sánh bằng mắt (nước, đất, hiệu quả), số đều lấy từ rankRotations; bị loại thì khung đất nung.
function rfQ2Html(s, res) {
  const F = rfF()
  const blocked = s.eligibility === 'ineligible'
    ? `<p class="rounded-2xl border-2 border-clay-700 bg-clay-100 px-4 py-3 text-base font-extrabold text-clay-700">${esc(F.notAdvised(s.unmetConstraints.map((u) => F.unmet[u] ?? u).join('; ')))}</p>`
    : ''
  const base = res.rotResult?.rotations?.find((r) => r.baseline)
  if (!s.rot || !base) return `${blocked}<p class="mt-3 text-sm text-ink">${esc(F.whyNoCalc)}</p>`
  const mm = (v) => F.unitMm(rfNum(v))
  const dryBase = base.measures.extraMm + base.measures.dryPenaltyMm
  const drySel = s.rot.measures.extraMm + s.rot.measures.dryPenaltyMm
  const wMax = Math.max(base.measures.extraMm, s.rot.measures.extraMm, dryBase, drySel)
  const saving = rfWaterSaving(s, res)
  const waterLine = Math.abs(saving) < 1 ? F.whyWaterSame : saving > 0 ? F.whyWaterLess(rfNum(saving)) : F.whyWaterMore(rfNum(-saving))
  const soilMax = Math.max(...res.rotResult.rotations.map((r) => r.measures.soilPoints), 1)
  const ratio = s.rot.measures.profitRatio
  const card = (title, inner, src) => `<div class="rounded-2xl border border-[#dce3d5] bg-white p-4"><p class="text-base font-extrabold text-[#173d2b]">${esc(title)}</p><div class="mt-3 grid gap-2.5">${inner}</div>${src ? `<p class="mt-2 text-[11px] text-muted">${esc(src)}</p>` : ''}</div>`
  const water = card(
    F.barWater,
    [
      rfBar(`${F.barRice} · ${F.barNormal}`, base.measures.extraMm, wMax, 'bg-[#9aa79a]', mm(base.measures.extraMm)),
      rfBar(`${F.barThis} · ${F.barNormal}`, s.rot.measures.extraMm, wMax, 'bg-water-500', mm(s.rot.measures.extraMm)),
      rfBar(`${F.barRice} · ${F.barDry}`, dryBase, wMax, 'bg-[#9aa79a]', mm(dryBase)),
      rfBar(`${F.barThis} · ${F.barDry}`, drySel, wMax, 'bg-water-500', mm(drySel)),
      `<p class="text-sm leading-relaxed text-ink">${esc(waterLine)}</p>`,
    ].join(''),
    `${SOURCES.faoManual3.short} · ${SOURCES.power.short}`,
  )
  const legume = s.crops.some((c) => CROP_LIBRARY[c]?.legume)
  const soil = card(
    F.barSoil,
    [
      rfBar(F.barRice, base.measures.soilPoints, soilMax, 'bg-[#9aa79a]', F.unitPts(rfNum(base.measures.soilPoints))),
      rfBar(F.barThis, s.rot.measures.soilPoints, soilMax, 'bg-[#6d9b37]', F.unitPts(rfNum(s.rot.measures.soilPoints))),
      `<p class="text-sm leading-relaxed text-ink">${esc(F.barSoilNote)}${legume ? ` ${esc(F.whyLegume)}` : ''}</p>`,
    ].join(''),
    null,
  )
  const income = card(
    F.barIncome,
    [
      rfBar(F.barRice, 1, PROFIT_RATIO_UPLAND.high, 'bg-[#9aa79a]', F.unitTimes(rfNum(1))),
      rfBar(F.barThis, ratio, PROFIT_RATIO_UPLAND.high, 'bg-sun-400', F.unitTimes(rfNum(ratio, 1))),
      `<p class="text-sm leading-relaxed text-ink">${esc(ratio > 1 ? F.barIncomeNote(rfNum(PROFIT_RATIO_UPLAND.low, 1), rfNum(PROFIT_RATIO_UPLAND.high, 1)) : F.barIncomeBase)}</p>`,
    ].join(''),
    SOURCES.linh2015.short,
  )
  return `${blocked}<div class="mt-3 grid gap-3 lg:grid-cols-3">${water}${soil}${income}</div>`
}

// Câu 3: 3 bước chuẩn bị, dựa đúng vào chỗ nước còn yếu và thông tin còn thiếu của phương án đang xem.
function rfQ3Html(s, ev) {
  const F = rfF()
  const R = ROT_TEXT[S.lang]
  const irr = ev.garden ? rfIrrigationValue(ev.garden.profile?.irrigation) : RF.irrigation
  const weakIdx = s.assessments.findIndex((a) => a?.criteria?.some((c) => c.key === 'water' && (c.grade === 'yellow' || c.grade === 'red')))
  const step1 = irr !== 'yes' && weakIdx >= 0 ? F.step1Water(R.seasons[s.windows?.[weakIdx]?.season ?? RF_SEASONS[weakIdx]]) : F.step1Ok
  const missing = s.missingFields.map((m) => F.missing[m] ?? m)
  for (const c of new Set(s.crops)) if (CROP_LIBRARY[c] && CROP_LIBRARY[c].salinityEce == null) missing.push(F.noSalThreshold(rfCropName(c)))
  const step2 = missing.length ? F.step2Missing(missing.join('; ')) : F.step2Ok
  const steps = [step1, step2, F.step3]
  return `<ol class="mt-3 grid gap-2">${steps
    .map((t, i) => `<li class="flex items-start gap-3 rounded-2xl border border-[#dce3d5] bg-white p-3.5"><span class="grid size-8 shrink-0 place-items-center rounded-full bg-[#173d2b] text-sm font-extrabold text-white">${i + 1}</span><span class="pt-1 text-[15px] leading-relaxed text-ink">${esc(t)}</span></li>`)
    .join('')}</ol>`
}

function rfQuestionHtml(n, title, inner) {
  return `<section class="rounded-[28px] border border-[#dce3d5] bg-[#f7f8f2] p-5 shadow-card" data-reveal="rf-q-${esc(RF.view || 'd')}-${n}">
      <h4 class="flex items-center gap-3 text-xl font-extrabold tracking-tight text-[#173d2b]"><span class="grid size-9 shrink-0 place-items-center rounded-full bg-[#6d9b37] text-base text-white">${n}</span>${esc(title)}</h4>
      ${inner}
    </section>`
}

function rfDetailHtml(ev) {
  const F = rfF()
  const res = ev.res
  const selected = res.strategies.find((s) => s.strategyId === RF.pick) ?? res.strategies.find((s) => s.rank === 1) ?? res.strategies[0]
  return `${rfDetailNavHtml()}
    <div class="mt-5">${rfBannerHtml(ev)}</div>
    ${ev.garden ? '' : `<div class="mt-5">${rfQuickHtml()}</div>`}
    <div class="mt-5">${rfGoalsHtml()}</div>
    <div class="mt-5">${rfPickHtml(res, selected)}</div>
    <div class="mt-5 grid gap-5">
      ${rfQuestionHtml(1, F.q1, rfQ1Html(selected, res))}
      ${rfQuestionHtml(2, F.q2, rfQ2Html(selected, res))}
      ${rfQuestionHtml(3, F.q3, rfQ3Html(selected, ev))}
    </div>
    ${rfAltTableHtml(res)}`
}

/* ---------------- Phần dùng chung còn lại ---------------- */

/** Bảng đầy đủ: 9 cây × 3 vụ, chia Xanh / Vàng / Đỏ (kèm lý do bằng lời nông dân). */
export function rfAltTableHtml(res, { open = true } = {}) {
  const F = rfF()
  const R = ROT_TEXT[S.lang]
  const alts = res?.seasonAlternatives
  if (!alts) return ''
  const chip = (c, tone) => {
    // Cây Đỏ: nêu tiêu chí Đỏ; cây Vàng: nêu tiêu chí Vàng. Cây Xanh / Xám không cần lý do.
    const why = tone === 'red' || tone === 'yellow' ? [...new Set(c.reasons.filter((r) => r.grade === tone).map((r) => F.reasonWord[r.key] ?? r.key))] : []
    return `<li class="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink">${esc(rfCropName(c.crop))}${why.length ? ` <span class="font-semibold text-muted">(${esc(why.join(', '))})</span>` : ''}</li>`
  }
  const group = (list, tone) => (list.length ? `<p class="mt-2 text-xs font-extrabold text-ink">${esc(F.altGroups[tone])}</p><ul class="mt-1 flex flex-wrap gap-1.5">${list.map((c) => chip(c, tone)).join('')}</ul>` : '')
  const cols = alts.map(
    (a) => `<div class="min-w-0 rounded-2xl border border-line bg-ground p-3">
        <p class="text-sm font-extrabold text-moss-900">${esc(R.seasons[a.season])} · <span class="font-semibold text-muted">${esc(rfMonthRange(a.months))}</span></p>
        ${group(a.greenCrops, 'green')}${group(a.yellowCrops, 'yellow')}${group(a.redCrops, 'red')}${group(a.grayCrops, 'gray')}
      </div>`,
  )
  return `<details class="mt-5 rounded-3xl border border-line bg-white p-4 shadow-card" ${open ? 'open' : ''} data-reveal="rf-alt-${esc(RF.view || 'd')}">
      <summary class="cursor-pointer text-base font-extrabold text-moss-900">${esc(F.altTitle)}</summary>
      <p class="mt-1 text-sm text-muted">${esc(F.altSub)}</p>
      ${alts[0]?.source === 'sowing' ? `<p class="mt-1 text-sm font-semibold text-sun-700">${esc(F.altSowing)}</p>` : ''}
      <div class="mt-3 grid gap-3 lg:grid-cols-3">${cols.join('')}</div>
    </details>`
}

function rfAreaHa(g) {
  return Number.isFinite(g.areaM2) && g.areaM2 > 0 ? rfNum(g.areaM2 / 10000, 2) : rfF().areaUnknown
}

const rfSameWeights = (a, b) => ['water', 'soil', 'income', 'risk'].every((k) => Number(a?.[k]) === Number(b?.[k]))

function rfGoalsHtml() {
  const F = rfF()
  const btn = (id) => {
    const on = rfSameWeights(S.rotPriorities, RF_GOALS[id])
    return `<button type="button" data-rf="goal" data-value="${id}" aria-pressed="${on}" class="rf-press min-h-14 rounded-2xl border-2 px-4 text-left text-base font-extrabold ${on ? 'border-[#173d2b] bg-[#173d2b] text-white' : 'border-line bg-white text-ink hover:border-moss-700'}">${esc(F.goals[id])}</button>`
  }
  return `<div class="rounded-[28px] border border-line bg-white p-5 shadow-card" data-reveal="rf-goals">
      <p class="text-lg font-extrabold">${esc(F.goalsTitle)}</p>
      <p class="mt-1 text-sm text-muted">${esc(F.goalsHint)}</p>
      <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">${Object.keys(RF_GOALS).map(btn).join('')}</div>
    </div>`
}

function rfQuickHtml() {
  const F = rfF()
  const irrOn = (v) => (v === 'unknown' ? RF.irrigation === null : RF.irrigation === v)
  const pill = (attr, value, label, on) =>
    `<button type="button" data-rf="${attr}" data-value="${value}" aria-pressed="${on}" class="rf-press min-h-12 rounded-full border px-4 text-sm font-extrabold ${on ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-white text-ink hover:border-moss-700'}">${esc(label)}</button>`
  const field = (id, label, value, step) =>
    `<label class="grid gap-1 text-sm font-bold text-ink">${esc(label)}<input id="${id}" type="number" inputmode="decimal" step="${step}" min="0" value="${value ?? ''}" class="min-h-12 rounded-2xl border border-line bg-white px-3 text-base font-bold" /></label>`
  return `<div id="rf-quick" class="rounded-[28px] border border-line bg-white p-5 shadow-card" tabindex="-1" data-reveal="rf-quick">
      <p class="text-lg font-extrabold">${esc(F.quickTitle)}</p>
      <p class="mt-3 text-sm font-bold text-muted">${esc(F.irrigationQ)}</p>
      <div class="mt-2 flex flex-wrap gap-2">${RF_IRRIGATION.map((v) => pill('irr', v, F.irrigation[v], irrOn(v))).join('')}</div>
      <p class="mt-4 text-sm font-bold text-muted">${esc(F.currentQ)}</p>
      <div class="mt-2 flex flex-wrap gap-2">${['A', 'B', 'C', 'D'].map((id) => pill('current', id, id, S.rotCurrent === id)).join('')}</div>
      <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        ${field('rf-ph', F.phLabel, RF.ph, '0.1')}${field('rf-ece', F.eceLabel, RF.ece, '0.1')}
        <div class="flex flex-wrap gap-2">
          <button type="button" data-rf="applyMeasure" class="min-h-12 rounded-full bg-moss-900 px-4 text-sm font-extrabold text-white">${esc(F.measureBtn)}</button>
          ${RF.ph != null || RF.ece != null ? `<button type="button" data-rf="clearMeasure" class="min-h-12 rounded-full border border-line px-4 text-sm font-bold">${esc(F.clearBtn)}</button>` : ''}
        </div>
      </div>
    </div>`
}

function rfClimateNoteHtml(ev) {
  const F = rfF()
  const T = MAP_TEXT[S.lang]
  const calName = ev.calendar.districtId ? PROVINCES.find((p) => p.id === ev.calendar.districtId)?.name : null
  const notes = []
  if (ev.calendar.mode === 'borrowed') notes.push(T.cond.borrowedCal(calName, rfNum(ev.calendar.distanceKm, 1), GEO_PARAMS.districtRadiusKm))
  else if (ev.calendar.mode === 'none' || !ev.res.baseRankable) notes.push(T.cond.outsideCal(GEO_PARAMS.districtRadiusKm))
  notes.push(ev.climateOrigin === 'own' ? F.climateOwn : ev.climateOrigin === 'district' ? F.climateDistrict(calName ?? '—') : F.climateNone)
  const sim = S.rotWhatIf.dryRainPct !== 0 || S.rotWhatIf.deltaT !== 0
  return `<div class="flex flex-wrap items-center gap-2 text-sm text-muted">${sim ? whatIfTag() : ''}${notes.map((n) => `<span class="block">${esc(n)}</span>`).join('')}</div>`
}

/* ---------------- Cầu nối từ Tab 4. Chiến thuật (Ruộng của tôi) ---------------- */

/**
 * Thẻ cầu nối trong panel Tab 4: thửa đang chọn, phương án đứng đầu, nút mở trang Luân canh.
 * Có thửa đang chọn → tính đúng như trang Luân canh (hồ sơ đã lưu); chỉ có điểm trên bản đồ → dùng evalResult của Tab 4.
 * planButton: nút "xem nhanh kế hoạch" do mapWorkspace dựng (vì nó biết MW.evalResult).
 */
export function rfBridgeHtml({ evalResult = null, loc = null, planButton = '' } = {}) {
  const F = rfF()
  const g = (DS.gardens ?? []).find((x) => x.id === DS.activeGardenId) ?? null
  const ev = g ? rfEvaluateGarden(g) : null
  const res = ev?.res ?? evalResult
  const { key, best } = rfStatus(res)
  const shown = best ?? res?.strategies?.[0] ?? null
  const lat = g?.lat ?? loc?.lat
  const lon = g?.lon ?? loc?.lon
  const thumb = Number.isFinite(lat) && Number.isFinite(lon)
    ? rfThumbHtml({ lat, lon, polygon: g?.polygon ?? null, stroke: g ? rfGroupColor(g) : '#ffffff', status: res ? key : null, label: g?.name ?? loc?.name ?? '', tags: ev ? rfSourceTags(ev) : [], chain: shown ? rfSeasonChain(shown) : null, corner: g ? rfGardenCorner(g, ev) : (loc?.name ?? null) })
    : ''
  const name = g?.name || loc?.name || F.bridgeNoGarden
  return `<div class="overflow-hidden rounded-[24px] border border-[#dce3d5] bg-[#fafbf6] shadow-card" data-reveal="rf-bridge-${esc(g ? g.id : 'loc')}">
      ${thumb}
      <div class="p-4">
        <p class="text-xs font-extrabold uppercase tracking-wide text-[#6d9b37]">${esc(F.bridgeEyebrow)}</p>
        <p class="mt-1 text-xl font-extrabold tracking-tight text-[#173d2b]">${esc(name)}</p>
        ${g ? `<p class="text-sm font-bold text-muted">${esc(rfGardenCorner(g, ev))}</p>` : ''}
        <div class="mt-3 rounded-2xl bg-white p-3">
          <p class="text-xs font-extrabold text-muted">${esc(best ? F.bridgeTop : F.bridgeNone)}</p>
          ${shown ? `<p class="mt-1 text-base font-extrabold text-ink">${esc(shown.crops.map(rfCropName).join(' ➔ '))}</p>` : ''}
          ${res ? `<p class="mt-1 text-sm text-ink">${esc(rfCardSentence(res))}</p>` : ''}
        </div>
        <p class="mt-2 text-xs text-muted">${esc(g ? F.bridgeBasis : F.bridgeBasisPoint)}</p>
        <button type="button" data-rf="openFromMap" data-value="${esc(g?.id ?? '')}" class="rf-press rf-cta mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#173d2b] px-5 text-base font-extrabold text-white shadow-card hover:bg-[#254f35]">${esc(F.bridgeCta)}</button>
        ${planButton}
        <p class="mt-3 text-xs leading-relaxed text-muted">${esc(F.bridgeHint)}</p>
      </div>
    </div>`
}

// Cuộn mượt tới một phần tử, chừa chỗ cho thanh menu cố định ở đầu trang.
function rfScrollTo(id) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 88
  window.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

// Đổi màn hình lưới ⇄ chi tiết bằng View Transition: ảnh vệ tinh của thửa "bay" thành banner (và ngược lại),
// để nông dân thấy mình vẫn đang ở đúng thửa đó. Trình duyệt chưa hỗ trợ hoặc bật giảm chuyển động → đổi ngay.
function rfSwap(update) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  // Trang đang ẩn (tab nền) thì trình duyệt hủy View Transition → đổi ngay, kẻo màn hình đứng yên.
  if (reduce || document.hidden || typeof document.startViewTransition !== 'function') return update()
  // Chỉ cho update chạy đúng một lần, dù là do View Transition hay do lưới an toàn bên dưới.
  let done = false
  const run = () => {
    if (done) return
    done = true
    update()
  }
  try {
    const vt = document.startViewTransition(run)
    // Bị bỏ qua (bấm nhanh liên tiếp) là chuyện bình thường: nuốt lỗi promise để console sạch.
    for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) p?.catch?.(() => {})
    // Lưới an toàn: trình duyệt không vẽ khung hình (cửa sổ bị che…) thì update không bao giờ chạy → tự đổi sau 300 ms.
    setTimeout(() => {
      if (done) return
      vt.skipTransition?.()
      run()
    }, 300)
  } catch {
    run()
  }
}

// Đặt tên "rf-hero" lên ảnh của thẻ vừa bấm (trạng thái cũ) — mỗi lúc chỉ một phần tử mang tên này.
function rfMarkHero(btn) {
  for (const el of document.querySelectorAll('#rot-farm .rf-thumb')) el.style.viewTransitionName = ''
  const t = btn?.querySelector('.rf-thumb')
  if (t) t.style.viewTransitionName = 'rf-hero'
}

/** Mở thẳng màn hình chi tiết chiến thuật của một thửa trên trang #/luan-canh. */
export function rfOpenGardenStrategy(gardenId = null) {
  RF.view = gardenId || DS.activeGardenId || (DS.gardens?.[0]?.id ?? 'district')
  RF.mode = 'detail'
  RF.pick = null
  const target = pageHref('rotations')
  if (location.hash !== target) location.hash = target // route() → showPage('rotations') vẽ lại trang
  renderRotations()
  setTimeout(() => rfScrollTo('rotations'), 80)
}

/** Vẽ khối #rot-farm. renderRotations() gọi trực tiếp; renderRotationResults() cũng gọi lại khi ưu tiên/giả định đổi. */
export function rfRender() {
  const box = typeof document !== 'undefined' ? document.getElementById('rot-farm') : null
  if (!box) return
  const gardens = DS.gardens ?? []
  if (RF.view !== 'district' && !gardens.some((g) => g.id === RF.view)) RF.view = gardens[0]?.id ?? 'district'
  const body = RF.mode === 'detail'
    ? rfDetailHtml(RF.view === 'district' ? rfEvaluateDistrict() : rfEvaluateGarden(gardens.find((g) => g.id === RF.view)))
    : rfGridHtml()
  // Câu nhắc "kết hợp kinh nghiệm bà con & cán bộ khuyến nông" nay nằm ở đầu trang (renderRotations), không lặp ở đây.
  box.innerHTML = body
  if (typeof wireMotion === 'function') wireMotion()
}

// Đọc số đo nhập nhanh: rỗng → null; ngoài khoảng hợp lý (pH 0–14, ECe ≥ 0) → bỏ qua, không đoán.
function rfReadNumber(id, max) {
  const raw = document.getElementById(id)?.value?.trim().replace(',', '.') ?? ''
  if (raw === '') return null
  const v = Number(raw)
  return Number.isFinite(v) && v >= 0 && v <= max ? v : null
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rf]')
    if (!b) return
    const v = b.dataset.value
    switch (b.dataset.rf) {
      case 'openDetail':
        if (RF.mode === 'grid') rfMarkHero(b)
        RF.view = v
        RF.mode = 'detail'
        RF.pick = null
        rfSwap(rfRender)
        return rfScrollTo('rot-farm')
      case 'openDistrict':
        // Đổi huyện làm đổi cả bảng 12 tháng và các thẻ điểm chi tiết, nên vẽ lại cả trang.
        S.rotDistrict = v
        if (typeof persist === 'function') persist()
        RF.view = 'district'
        RF.mode = 'detail'
        RF.pick = null
        renderRotations()
        return rfScrollTo('rot-farm')
      case 'backToGrid':
        RF.mode = 'grid'
        rfSwap(rfRender)
        return rfScrollTo('rot-farm')
      case 'pick':
        RF.pick = v
        return rfRender()
      case 'openFromMap':
        return rfOpenGardenStrategy(v || null)
      case 'goal':
        S.rotPriorities = { ...RF_GOALS[v] }
        if (typeof persist === 'function') persist()
        renderRotationControls()
        return renderRotationResults() // vẽ lại cả bảng chi tiết, rồi gọi rfRender()
      case 'irr':
        RF.irrigation = v === 'unknown' ? null : v
        return rfRender()
      case 'current':
        S.rotCurrent = v
        return renderRotationResults()
      case 'applyMeasure':
        RF.ph = rfReadNumber('rf-ph', 14)
        RF.ece = rfReadNumber('rf-ece', 100)
        return rfRender()
      case 'clearMeasure':
        RF.ph = null
        RF.ece = null
        return rfRender()
      case 'editField':
        dsSelectGarden(v)
        location.hash = pageHref('myfield')
        return
      case 'focusQuick':
        return document.getElementById('rf-quick')?.focus()
    }
  })
}
