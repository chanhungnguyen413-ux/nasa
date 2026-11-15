// Trang Luân canh theo TỪNG THỬA (DS.gardens), 2 tầng như YouTube:
//   Tầng 1 (RF.mode 'grid')   — lưới thẻ ảnh vệ tinh, mỗi thẻ một thửa (hoặc một huyện để khám phá nhanh).
//   Tầng 2 (RF.mode 'detail') — một thửa: dữ liệu đã có/còn thiếu, 4 nút mục tiêu, 3 câu hỏi đời thường.
// Cùng file này có thẻ "cầu nối" cho Tab 4. Chiến thuật ở Ruộng của tôi (rfBridgeHtml, rfOpenGardenStrategy).
// Vì sao một file: mọi con số đều đi qua fsAssessField() ở đây, nên trang Luân canh và Tab 4 luôn nói cùng một kết quả.
// Dùng tiện ích của template ($, esc, icon, S, whatIfTag, PRECOMPUTED, pageHref, revealNow…) vì build gộp mọi module.
// Mọi top-level đều có tiền tố rf / RF_ để không trùng tên trong phạm vi gộp chung.
import { evidence } from '../core/evidence.js'
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { PROVINCES } from '../data/provinces.js'
import { PROFIT_RATIO_UPLAND, ROTATIONS, SOURCES } from '../data/rotationCrops.js'
import { RG_PARAMS, rgCheckAi, rgGenerate, rgMeasure, rgParseWish, rgSeasonGrid } from '../logic/rotationGen.js'
import { asstLedgerNumbers, asstVerifyReply } from '../logic/assistantFallback.js'
import { ROT_TEXT } from '../i18n/rotationText.js'
import { STRAT_TEXT } from '../i18n/strategyText.js'
import { fsAssessField, fsCalendarSource } from '../logic/fieldStrategies.js'
import { gmColor, gmCropLabel } from '../logic/gardenModel.js'
import { WB_FAO_PE, wbEffectiveRain } from '../logic/waterBalance.js'
import { CATALOG } from '../sources/catalog.js'
import { ssClimateFor, ssGardenEstimates, ssGrids, ssLayerKind, ssRate } from '../logic/staticSnapshot.js'
import { EM_FILTER_META, emCellAt, emDescribeCell, emSynthesizeGardenStack } from '../logic/envMapData.js'
import { DS, dsSave, dsSaveGarden, dsSelectGarden } from '../sources/dataStore.js'
import { powerClimate, powerReadCache } from '../sources/power.js'

// Trạng thái riêng của khối này.
//   mode: 'grid' | 'detail' · view: id thửa | 'district' · pick: phương án đang xem ở tầng 2 (null = phương án đứng đầu)
//   wish: câu tự do chưa lưu theo thửa · ai: kết quả AI brainstorm theo thửa · genPick: key phương án tự do đang xem
const RF = { mode: 'grid', view: null, pick: null, irrigation: null, ph: null, ece: null, wish: {}, ai: {}, genPick: null }

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
  // Ngoài 5 huyện mẫu: khí hậu tĩnh của tỉnh chứa thửa (13 tỉnh tính sẵn), không tải mạng.
  const snap = ssClimateFor(PRECOMPUTED, g.lat, g.lon, PROVINCES)
  if (snap?.record) return { climate: powerClimate(snap.record, { origin: 'precomputed' }), origin: 'province', place: snap.name, distanceKm: snap.distanceKm }
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
  const calendar = fsCalendarSource(loc, PROVINCES, undefined, PRECOMPUTED.provinceCal)
  const { climate, origin, place, distanceKm } = rfGardenClimate(g, calendar)
  const flood = rfFloodMarksEvidence(DS.marks, g.id)
  const est = ssGardenEstimates(PRECOMPUTED, g)
  const estPh = est.ph?.origin === 'estimate' ? est.ph.ev : null
  const estEc = est.ec?.origin === 'estimate' ? est.ec.ev : null
  const inputs = {
    climate,
    irrigation: rfIrrigationValue(p.irrigation),
    ph: rfPhEvidence(p.ph) ?? estPh,
    salinityEce: rfEceEvidence(p.ec) ?? estEc,
    // Độ mặn ước tính không phải ECe đo tại ruộng → 'unknown' để không bị chấm theo ngưỡng FAO.
    salinityType: p.ec != null ? (p.ecType ?? 'unknown') : estEc ? 'unknown' : null,
    floodMarks: flood.ev,
  }
  const res = fsAssessField({
    loc,
    provinces: PROVINCES,
    precomputed: PRECOMPUTED,
    ...inputs,
    cropChange: p.cropChange ?? 'yes',
    currentId: p.currentId ?? 'A',
    priorities: S.rotPriorities,
    ...rfWhatIf(calendar.districtId),
  })
  res.gen = rfBuildGen({ res, ...inputs, sowing: p.sowing, wishText: RF.wish[g.id] ?? rfCurrentText(p) })
  return { res, garden: g, climate, climateOrigin: origin, climatePlace: place ?? null, climateKm: distanceKm ?? null, calendar, floodCount: flood.count, est }
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
  res.gen = rfBuildGen({ res, climate, irrigation: RF.irrigation, ph: rfPhEvidence(RF.ph), salinityEce: rfEceEvidence(RF.ece), salinityType: RF.ece != null ? 'ece' : null, floodMarks: null, sowing: null, wishText: RF.wish.district ?? (ROTATIONS.find((r) => r.id === S.rotCurrent)?.crops ?? []).map(rfCropName).join(' - ') })
  return { res, garden: null, district: loc, climate, climateOrigin: climate ? 'district' : null, calendar: res.calendar, floodCount: null }
}

/* ---------------- Dữ kiện thửa cho Trợ lý AI 2 tầng (#fab) ---------------- */

/** Dữ kiện của thửa kèm LOẠI số liệu: đo tại ruộng (ground) thắng ước tính lưới 5 km (model). */
function rfAssistantFacts(ev) {
  const p = ev.garden?.profile ?? {}
  const est = ev.est ?? {}
  const pick = (key, unit) => {
    if (typeof p[key] === 'number') return { key, value: p[key], unit, kind: 'ground', ecType: key === 'ec' ? p.ecType ?? 'unknown' : null, source: 'soilForm', period: p.measuredAt ?? null }
    const e = est[key]
    if (e?.origin === 'estimate') return { key, value: e.value, unit, kind: 'model', ecType: key === 'ec' ? 'unknown' : null, source: e.ev?.source ?? null, period: e.period ?? null }
    return { key, value: null, unit }
  }
  return [
    { key: 'irrigation', present: Boolean(rfIrrigationValue(p.irrigation)), kind: 'farmer', source: 'soilForm' },
    pick('ph', ''),
    pick('ec', 'dS/m'),
    { key: 'climate', present: Boolean(ev.climateOrigin), kind: 'model', source: 'powerDaily' },
    { key: 'calendar', present: Boolean(ev.res?.baseRankable), kind: 'satellite', source: 'modis' },
  ]
}

/** Cây của thửa cho trợ lý: id thư viện, hoặc tên tự nhập (custom). */
function rfAssistantCrop(g) {
  const c = gmCropLabel(g.profile, S.lang)
  return c ? { id: g.profile.cropId ?? null, name: c.name, custom: c.custom } : null
}

/* ---------------- Tóm tắt kết quả: trạng thái, câu kết luận ---------------- */

// good: có phương án đứng đầu, rủi ro thấp · caution: đứng đầu nhưng cần chú ý · missing: thiếu dữ liệu · none: mọi phương án bị loại.
function rfStatus(res) {
  // Có bộ sinh tự do: thẻ phản ánh đề xuất đứng đầu của nó (không còn gò vào 4 mẫu A–D).
  if (res?.gen?.grid) {
    const top = res.gen.proposals[0]
    if (!top) return { key: 'none', best: null }
    return { key: top.yellowSeasons || top.graySeasons ? 'caution' : 'good', best: { crops: top.crops, windows: null, strategyId: '', gen: true } }
  }
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
  if (best?.gen) return F.cardTop(best.crops.map(rfCropName).join(' – '))
  if (res?.gen?.grid && !best) return F.genNone
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
  return `<article class="rf-card rounded-[24px] border border-[#dce3d5] bg-[#fafbf6] overflow-hidden shadow-card cursor-pointer">
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
  return `<a href="${pageHref('myfield')}" class="rf-card flex min-h-56 flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-[#6d9b37] bg-[#f7f8f2] p-6 text-center hover:bg-[#edf1e4]">
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

// Chip "độ tin cậy": Cao (đo tại ruộng) / Trung bình (vệ tinh) / Tham khảo (mô hình) / Thiếu.
// Có `tip` → chip thành nút nhỏ có dấu ⓘ: rà chuột, focus bàn phím hoặc chạm trên điện thoại sẽ mở bảng nguồn minh bạch.
const RF_RATE_TONE = { high: 'bg-[#6d9b37] text-white', medium: 'bg-[#d9ebb8] text-[#254f35]', ref: 'bg-[#edf1e4] text-[#4f5f50]', table: 'bg-[#edf1e4] text-[#4f5f50]', sim: 'bg-sun-100 text-sun-700', none: 'bg-clay-100 text-clay-700' }
let rfTipSeq = 0
function rfRateChip(rate, tip = null) {
  const F = rfF()
  const tone = RF_RATE_TONE[rate] ?? RF_RATE_TONE.none
  const label = esc(F.rate[rate] ?? rate)
  if (!tip) return `<span class="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tone}">${label}</span>`
  const id = `rf-tip-${++rfTipSeq}`
  const T = F.tip
  // Chỉ in dòng nào có nội dung: thiếu thông tin nguồn thì không bịa chữ thay vào.
  const lines = [['source', tip.source], ['date', tip.date], ['res', tip.res], ['method', tip.method], ['error', tip.error], ['fix', tip.fix], ['why', F.whyRate[rate]]]
    .filter(([, v]) => v)
    .map(([k, v]) => `<div class="rf-tip-row"><dt>${esc(T[k])}</dt><dd>${esc(v)}</dd></div>`)
    .join('')
  return `<span class="rf-rate">
      <button type="button" class="rf-rate-btn inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tone}" aria-describedby="${id}" aria-expanded="false">${label}<span class="rf-rate-i" aria-hidden="true">ⓘ</span></button>
      <span role="tooltip" id="${id}" class="rf-tip"><dl>${lines}</dl>${tip.url ? `<span class="rf-tip-url">${esc(tip.url)}</span>` : ''}</span>
    </span>`
}

// Nguồn minh bạch cho từng loại dòng — chỉ đọc dữ liệu runtime đã nhúng (PRECOMPUTED, ssGrids, EM_FILTER_META, CATALOG, SOURCES).
function rfTips() {
  const F = rfF()
  const T = F.tipText
  const L = S.lang
  const years = PRECOMPUTED.powerSnapshot?.years ? PRECOMPUTED.powerSnapshot.years.join('–') : null
  const grids = ssGrids(PRECOMPUTED)
  const ndvi = PRECOMPUTED.ndvi ?? {}
  return {
    field: (date) => ({ source: T.fieldSrc, date: date || T.fieldNoDate, res: T.fieldRes, method: T.fieldMethod }),
    power: (place) => ({ source: CATALOG.powerDaily?.name?.[L] ?? 'NASA POWER', date: years ? T.powerDate(years, PRECOMPUTED.powerSnapshot?.generatedAt || null) : null, res: CATALOG.powerDaily?.resolution?.[L] ?? null, method: T.powerMethod(place), error: T.powerErr, url: CATALOG.powerDaily?.url ?? null }),
    modis: (provCal) => ({ source: T.modisSrc, date: provCal ? T.modisProvDate(provCal.calendarYear, PRECOMPUTED.provinceCalMeta?.fetchedAt || null) : ndvi.first && ndvi.last ? T.modisDate(ndvi.first, ndvi.last) : null, res: T.modisRes, method: T.modisMethod, error: T.modisErr }),
    ph: (e) => {
      const m = grids.meta.ph ?? {}
      return { source: [m.provider, m.title].filter(Boolean).join(' · ') || null, date: m.period ?? null, res: T.sgRes(m.depth ?? ''), method: e?.method === 'nearestCell' ? T.nearMethod(rfNum(e.distanceKm, 0)) : T.cellMethod, error: T.sgErr, url: m.url ?? null }
    },
    ec: (e) => {
      const m = grids.meta.ec ?? {}
      return { source: [m.provider, m.doi].filter(Boolean).join(' · ') || null, date: m.period ?? null, res: T.wangRes, method: e?.method === 'nearestCell' ? T.nearMethod(rfNum(e.distanceKm, 0)) : T.cellMethod, error: m.rmse != null ? T.wangErr(rfNum(m.rmse, 1)) : null, url: m.url ?? null }
    },
    pe: () => ({ source: T.peSrc, date: years ? T.peDate(years) : null, res: T.peRes, method: T.peMethod(WB_FAO_PE.high.a, WB_FAO_PE.high.b, WB_FAO_PE.low.a, WB_FAO_PE.low.b, WB_FAO_PE.breakMm), error: T.peErr, url: WB_FAO_PE.url }),
    wet: () => ({ source: T.wetSrc, date: years ? T.peDate(years) : null, res: CATALOG.powerDaily?.resolution?.[L] ?? null, method: T.wetMethod, error: T.powerErr, url: CATALOG.powerDaily?.url ?? null }),
    none: (fix) => ({ fix }),
    layer: (meta) => ({ source: [meta.shortOrg?.[L], meta.datasetName].filter(Boolean).join(' · ') || null, date: meta.dateLabel?.[L] ?? null, res: meta.nativeRes?.[L] ?? null, method: T.layerMethod, error: meta.caveat?.[L] ?? null, url: meta.url ?? null }),
  }
}

/**
 * Dữ liệu thửa dạng LIỆT KÊ (không còn bảng 4 cột): 3 nhóm, mỗi dòng = Tên · Giá trị · nhãn độ tin cậy.
 * Nguồn chi tiết nằm trong tooltip của nhãn (rfRateChip) để dòng gọn, dễ quét mắt.
 * Liệt kê ĐỦ thông số của thửa: chưa có thì ghi "chưa đo" kèm nút nhập, không ẩn dòng.
 */
function rfDataTableHtml(ev) {
  const F = rfF()
  const g = ev.garden
  const p = g?.profile ?? {}
  const est = ev.est ?? {}
  const tips = rfTips()
  const SF = typeof DATA_TEXT !== 'undefined' ? DATA_TEXT[S.lang].soilForm : null
  const fix = g
    ? `<button type="button" data-rf="editField" data-value="${esc(g.id)}" class="rf-fix">${esc(F.tagFix)}</button>`
    : `<button type="button" data-rf="focusQuick" class="rf-fix">${esc(F.tagFix)}</button>`
  const missing = (canFix = true) => `<span class="font-semibold text-clay-700">${esc(F.dtNotMeasured)}</span>${canFix ? fix : ''}`
  const note = (text, tone = 'text-muted') => `<span class="mt-0.5 block text-[11px] font-semibold ${tone}">${esc(text)}</span>`
  const M = F.missTip
  const item = (label, value, rate, tip = null) => `<li class="rf-dl-row">
      <div class="min-w-0"><p class="text-[12px] font-bold text-muted">${esc(label)}</p><div class="text-[15px] font-extrabold tabular-nums text-[#173d2b]">${value}</div></div>
      ${rate ? rfRateChip(rate, tip ?? (rate === 'none' ? tips.none(M.settings) : null)) : ''}
    </li>`
  const fieldDate = p.measuredAt ?? null
  // Nhóm 1: đo tại ruộng / bà con khai — liệt kê đủ cả khi chưa có số.
  const field = []
  const cropLbl = g ? gmCropLabel(p, S.lang) : null
  if (g) field.push(item(F.dtItems.crop, cropLbl ? esc(cropLbl.name) + (cropLbl.custom ? note(F.customCropNote, 'text-sun-700') : '') : missing(), cropLbl ? 'high' : 'none', cropLbl ? tips.field(null) : null))
  const irr = g ? rfIrrigationValue(p.irrigation) : RF.irrigation
  field.push(item(F.dtItems.irrigation, irr ? esc(F.irrigation[irr]) : missing(), irr ? 'high' : 'none', irr ? tips.field(null) : null))
  const ph = g ? p.ph : RF.ph
  field.push(item(F.dtItems.ph, typeof ph === 'number' ? esc(rfNum(ph, 1)) : missing(), typeof ph === 'number' ? 'high' : 'none', typeof ph === 'number' ? tips.field(fieldDate) : tips.none(M.ph)))
  const ec = g ? p.ec : RF.ece
  const ecType = g ? (p.ecType ?? 'unknown') : 'ece'
  field.push(item(F.dtItems.ec, typeof ec === 'number' ? esc(F.condEc(rfNum(ec, 1), ecType)) + (ecType !== 'ece' ? note(F.dtNotEce, 'text-sun-700') : '') : missing(), typeof ec === 'number' ? 'high' : 'none', typeof ec === 'number' ? tips.field(fieldDate) : tips.none(M.ec)))
  if (g) {
    field.push(item(F.dtItems.om, typeof p.om === 'number' ? esc(`${rfNum(p.om, 1)} %`) : missing(), typeof p.om === 'number' ? 'high' : 'none', typeof p.om === 'number' ? tips.field(fieldDate) : null))
    const soilOk = p.soilType && p.soilType !== 'unknown'
    field.push(item(F.dtItems.soilType, soilOk ? esc(SF?.soilTypes?.[p.soilType] ?? p.soilType) : missing(), soilOk ? 'high' : 'none', soilOk ? tips.field(null) : null))
    field.push(item(F.dtItems.flood, esc(ev.floodCount ? F.floodCount(rfNum(ev.floodCount)) : F.floodNone), 'high', tips.field(null)))
  }
  // Nhóm 2 & 3: lớp bản đồ đang bật xếp theo đúng loại số liệu của lớp (vệ tinh hay mô hình).
  const sat = []
  const model = []
  const lat = g?.lat ?? ev.district?.lat
  const lon = g?.lon ?? ev.district?.lon
  const layerKey = typeof MF !== 'undefined' ? MF.layer : null
  if (layerKey && EM_FILTER_META[layerKey] && Number.isFinite(lat)) {
    const meta = EM_FILTER_META[layerKey]
    const name = (typeof mfT === 'function' ? mfT().layers?.[layerKey] : null) ?? layerKey
    const desc = emDescribeCell(layerKey, emCellAt(PRECOMPUTED.envMap, layerKey, lat, lon))
    const kind = ssLayerKind(layerKey)
    const value = desc
      ? `<span class="flex items-start gap-2"><span class="mt-1 inline-block size-4 shrink-0 rounded border border-black/15" style="background:${desc.hex}" aria-hidden="true"></span><span>${esc(desc.title?.[S.lang] ?? '')}</span></span>`
      : `<span class="font-semibold text-muted">${esc(F.dtLayerNoCell)}</span>`
    ;(kind === 'satellite' ? sat : model).push(item(`${F.dtItems.layer}: ${name}`, value, desc ? ssRate(kind) : 'none', desc ? tips.layer(meta) : { ...tips.layer(meta), fix: M.cell }))
  } else {
    sat.push(item(F.dtItems.layer, `<span class="text-[13px] font-semibold text-muted">${esc(F.dtLayerNone)}</span>`, null))
  }
  const cal = ev.calendar
  const calOk = Boolean(ev.res.baseRankable)
  const calText = cal.mode === 'province' ? F.dataCalProvince(cal.provinceName, rfNum(cal.distanceKm, 0)) : cal.mode === 'borrowed' ? F.dataCalBorrowed(rfNum(cal.distanceKm, 1)) : F.dataCalDirect
  const provCal = cal.mode === 'province' ? PRECOMPUTED.provinceCal?.find((x) => x.id === cal.districtId) : null
  sat.push(item(F.dtItems.calendar, calOk ? esc(calText) : `<span class="font-semibold text-clay-700">${esc(F.tagNoCalendar)}</span>`, calOk ? 'medium' : 'none', calOk ? tips.modis(provCal) : tips.none(M.calendar)))
  // Nhóm 3: mô hình tĩnh — khí hậu POWER, mưa hiệu quả FAO, ẩm vùng rễ NASA, ước tính pH/độ mặn ô 5 km.
  const climName = ev.climateOrigin === 'province' ? ev.climatePlace : ev.climateOrigin === 'district' ? (PROVINCES.find((d) => d.id === cal.districtId)?.name ?? '—') : ev.climateOrigin === 'own' ? F.dataClimateOwn : (ev.district?.name ?? '—')
  const climDetail = ev.climateOrigin === 'own' ? F.dataClimateOwn : ev.climateOrigin === 'district' || (!g && ev.climateOrigin) ? F.dataClimateDistrict : ev.climateOrigin === 'province' ? F.dataClimateProvince : null
  model.push(item(F.dtItems.climate, climDetail ? `${esc(climDetail)}${note(climName)}` : missing(false), ev.climateOrigin ? 'ref' : 'none', ev.climateOrigin ? tips.power(climName) : tips.none(M.climate)))
  const pe = ev.climate ? wbEffectiveRain(ev.climate) : null
  model.push(item(F.effRain, pe?.totalEffMm != null ? esc(F.effRainValue(rfNum(pe.totalEffMm), rfNum(pe.totalRainMm))) : missing(false), pe?.totalEffMm != null ? 'ref' : 'none', pe?.totalEffMm != null ? tips.pe() : tips.none(M.needClimate)))
  const wet = (ev.climate?.months ?? []).map((m) => ({ month: m.month, v: m.gwetroot?.value })).filter((x) => typeof x.v === 'number')
  if (wet.length === 12) {
    const lo = wet.reduce((a, b) => (b.v < a.v ? b : a))
    const hi = wet.reduce((a, b) => (b.v > a.v ? b : a))
    model.push(item(F.rootWet, esc(F.rootWetValue(rfNum(lo.v, 2), lo.month, rfNum(hi.v, 2), hi.month)), 'ref', tips.wet()))
  } else model.push(item(F.rootWet, missing(false), 'none', tips.none(M.needClimate)))
  if (typeof ph !== 'number') {
    const e = est.ph
    model.push(e?.origin === 'estimate'
      ? item(F.dtItems.phEst, esc(rfNum(e.value, 1)) + (e.method === 'nearestCell' ? note(F.dtNearest(rfNum(e.distanceKm, 0))) : ''), 'ref', tips.ph(e))
      : item(F.dtItems.phEst, missing(false), 'none', tips.none(M.cell)))
  }
  if (typeof ec !== 'number') {
    const e = est.ec
    model.push(e?.origin === 'estimate'
      ? item(F.dtItems.ecEst, esc(`${rfNum(e.value, 1)} dS/m`) + note(F.dtNotEce, 'text-sun-700'), 'ref', tips.ec(e))
      : item(F.dtItems.ecEst, missing(false), 'none', tips.none(M.cell)))
  }
  const group = (title, rows) => (rows.length ? `<section class="rf-dl-group"><h5 class="rf-dl-title">${esc(title)}</h5><ul class="rf-dl-list">${rows.join('')}</ul></section>` : '')
  return `<div>
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-xs font-extrabold uppercase tracking-wide text-[#6d9b37]">${esc(F.dtTitle)}</p>
        <p class="text-[11px] text-muted">${esc(F.dtHintHover)}</p>
      </div>
      <div class="rf-dl-grid mt-3">${group(F.dtGroups.field, field)}<div class="rf-dl-stack">${group(F.dtGroups.sat, sat)}${group(F.dtGroups.model, model)}</div></div>
      <p class="mt-2 text-[11px] leading-relaxed text-muted">${esc(F.rateHint)}</p>
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
  return `<div class="grid overflow-hidden rounded-[28px] border border-[#dce3d5] bg-[#fafbf6] shadow-card lg:grid-cols-[minmax(0,420px)_1fr]">
      <div class="min-w-0">${thumb}</div>
      <div class="min-w-0 p-5">
        <h3 class="text-2xl font-extrabold tracking-tight text-[#173d2b]">${esc(title)}</h3>
        <p class="mt-0.5 text-sm font-bold text-muted">${esc(sub)}</p>
        ${S.rotWhatIf.dryRainPct !== 0 || S.rotWhatIf.deltaT !== 0 ? `<div class="mt-2">${whatIfTag()}</div>` : ''}
      </div>
    </div>`
}

/* ---------------- Kế hoạch 3 vụ: 3 ô số tóm tắt + 1 bảng ít chữ ---------------- */

// Lý do "Xám" của tiêu chí → từ khoá siêu ngắn của thẻ "Thiếu …"; needFix: bà con tự đo/khai được ngay.
const RF_GRAY_TAG = {
  phNeedMeasure: { key: 'ph', needFix: true },
  salinityNeedMeasure: { key: 'ece', needFix: true },
  salinityNotEce: { key: 'ece', needFix: true },
  needIrrigationAnswer: { key: 'irrigation', needFix: true },
  missingClimate: { key: 'climate', needFix: false },
  cycleNoCalendar: { key: 'calendar', needFix: false },
  salinityNoThreshold: { key: 'salThreshold', needFix: false },
  noSourcedTable: { key: 'table', needFix: false },
}

// Thẻ việc cần làm / còn thiếu cho MỘT vụ (dữ liệu thô, chưa thành HTML): { text, tone, fix }.
function rfSeasonTagList(s, i, ev) {
  const F = rfF()
  const tags = []
  const crit = s.assessments[i]?.criteria ?? []
  const irr = ev.garden ? rfIrrigationValue(ev.garden.profile?.irrigation) : RF.irrigation
  if (!s.windows?.[i]) tags.push({ text: F.tagNoCalendar, tone: 'warn', fix: false })
  if (irr !== 'yes' && crit.some((c) => c.key === 'water' && (c.grade === 'yellow' || c.grade === 'red'))) tags.push({ text: F.tagCheckCanal, tone: 'act', fix: false })
  for (const w of new Set(crit.filter((c) => c.grade === 'red' || c.grade === 'yellow').map((c) => F.reasonWord[c.key] ?? c.key))) tags.push({ text: w, tone: 'risk', fix: false })
  const gray = crit.filter((c) => c.grade === 'gray').map((c) => RF_GRAY_TAG[c.reason]).filter(Boolean)
  const lack = [...new Set(gray.filter((x) => x.key !== 'calendar' || s.windows?.[i]).map((x) => F.missShort[x.key]))]
  if (lack.length) tags.push({ text: F.tagMissing(lack.join(', ')), tone: 'warn', fix: gray.some((x) => x.needFix) })
  return tags
}

const rfTagHtml = (t) => `<span class="rf-tag rf-tag-${t.tone}">${esc(t.text)}</span>`
function rfFixButton(ev) {
  const F = rfF()
  return ev.garden
    ? `<button type="button" data-rf="editField" data-value="${esc(ev.garden.id)}" class="rf-fix">${esc(F.tagFix)}</button>`
    : `<button type="button" data-rf="focusQuick" class="rf-fix">${esc(F.tagFix)}</button>`
}

/**
 * Bảng Kế hoạch 3 vụ: Vụ & thời gian | Cây nên trồng & mức hợp | Thay được bằng | Việc cần làm / thiếu gì.
 * Thẻ giống hệt nhau ở CẢ 3 vụ (thiếu lịch MODIS, thiếu pH/ECe…) gom 1 lần lên thanh phía trên, kèm đúng 1 nút "Nhập ngay".
 */
function rfPlanTableHtml(s, res, ev) {
  const F = rfF()
  const R = ROT_TEXT[S.lang]
  const lists = s.crops.map((_, i) => rfSeasonTagList(s, i, ev))
  const common = lists[0].filter((t) => lists.every((l) => l.some((x) => x.text === t.text)))
  const isCommon = (t) => common.some((c) => c.text === t.text)
  const commonBar = common.length
    ? `<div class="rf-plan-common"><span class="text-xs font-extrabold text-ink">${esc(F.planCommon)}</span>${common.map(rfTagHtml).join('')}${common.some((t) => t.fix) ? rfFixButton(ev) : ''}</div>`
    : ''
  const rows = s.crops.map((crop, i) => {
    const w = s.windows?.[i] ?? null
    const grade = s.assessments[i]?.overall ?? 'gray'
    const greens = (res.seasonAlternatives?.[i]?.greenCrops ?? []).filter((c) => c.crop !== crop).map((c) => rfCropName(c.crop))
    const own = lists[i].filter((t) => !isCommon(t))
    const todo = own.length
      ? own.map(rfTagHtml).join('') + (own.some((t) => t.fix) ? rfFixButton(ev) : '')
      : common.length ? '<span class="text-sm font-semibold text-muted">—</span>' : rfTagHtml({ text: F.tagOk, tone: 'ok' })
    return `<div class="rf-plan-row" role="row">
        <div role="cell"><span class="rf-plan-label">${esc(F.planCols.season)}</span><p class="font-extrabold text-[#173d2b]">${esc(R.seasons[w?.season ?? RF_SEASONS[i]])}</p><p class="text-xs font-semibold text-muted">${esc(w ? rfMonthRange(w.months) : F.noMonths)}</p></div>
        <div role="cell"><span class="rf-plan-label">${esc(F.planCols.crop)}</span><p class="text-lg font-extrabold text-[#173d2b]">${esc(rfCropName(crop))}</p><p class="flex items-center gap-1.5 text-xs font-extrabold text-ink"><span class="inline-block size-3 rounded-full ${RF_DOT[grade]}" aria-hidden="true"></span>${esc(F.gradeShort[grade])}</p></div>
        <div role="cell"><span class="rf-plan-label">${esc(F.planCols.swap)}</span><p class="text-sm font-semibold text-ink">${esc(res.seasonAlternatives && greens.length ? greens.join(', ') : '—')}</p></div>
        <div role="cell"><span class="rf-plan-label">${esc(F.planCols.todo)}</span><div class="flex flex-wrap items-center gap-1.5">${todo}</div></div>
      </div>`
  })
  const avoid = s.eligibility === 'ineligible' ? `<p class="rf-tag rf-tag-risk mb-3 inline-flex">${esc(F.tagAvoid(s.unmetConstraints.map((u) => F.unmet[u] ?? u).join(', ')))}</p>` : ''
  return `${avoid}${commonBar}<div class="rf-plan" role="table" aria-label="${esc(F.planTitle)}">
      <div class="rf-plan-head" role="row"><span role="columnheader">${esc(F.planCols.season)}</span><span role="columnheader">${esc(F.planCols.crop)}</span><span role="columnheader">${esc(F.planCols.swap)}</span><span role="columnheader">${esc(F.planCols.todo)}</span></div>
      ${rows.join('')}
    </div>`
}

function rfDetailHtml(ev) {
  const F = rfF()
  const res = ev.res
  const all = rfGenAll(ev)
  const pick = all.find((p) => p.key === RF.genPick) ?? res.gen?.proposals?.[0] ?? res.gen?.current ?? null
  const plan = pick
    ? `<section class="rf-answers mt-5 rounded-[28px] border border-line bg-white p-5 shadow-card">
      <h4 class="text-xl font-extrabold tracking-tight text-[#173d2b]">${esc(F.planTitle)} · ${esc(rfGenCrops(pick).join(' → '))}</h4>
      <div class="mt-3">${rfGenSummaryHtml(pick, res.gen)}</div>
      <div class="mt-4">${rfPlanTableHtml(rfGenAsStrategy(pick, res.gen), rfGenAlts(res.gen), ev)}</div>
      <p class="mt-3 text-[11px] leading-relaxed text-muted">${esc(F.step3)}</p>
    </section>`
    : ''
  return `${rfDetailNavHtml()}
    <div class="mt-5">${rfBannerHtml(ev)}</div>
    <!-- Dữ liệu thửa dạng liệt kê 3 nhóm; nguồn chi tiết nằm trong tooltip của nhãn độ tin cậy. -->
    <section class="mt-5 rounded-[28px] border border-line bg-white p-5 shadow-card">${rfDataTableHtml(ev)}</section>
    ${ev.garden ? '' : `<div class="mt-5">${rfQuickHtml()}</div>`}
    <!-- Đề xuất tự do: bà con mô tả bằng lời, bộ sinh chấm mọi chuỗi 3 vụ + AI brainstorm thêm (đều kiểm chứng lại). -->
    <div class="mt-5">${rfGenHtml(ev, pick)}</div>
    <!-- Kế hoạch 3 vụ của phương án đang chọn: 3 ô số + 1 bảng ít chữ. -->
    ${plan}`
}

/* ---------------- Đề xuất luân canh TỰ DO (rotationGen.js) + AI brainstorm ---------------- */

// Lưới vụ + 3 đề xuất + "xem thêm" cho một thửa. wishText: câu tự do của bà con (đang làm gì, muốn gì).
function rfBuildGen({ res, climate, irrigation, ph, salinityEce, salinityType, floodMarks, sowing, wishText }) {
  const windows = res.rotResult?.rankable ? res.rotResult.windows : null
  const grid = rgSeasonGrid({ windows, sowingMonth: sowing ?? 1, climate, irrigation, salinityEce, salinityType, floodMarks, ph })
  const wish = rgParseWish(wishText ?? '')
  return { ...rgGenerate(grid, { wish }), grid, wish, wishText: wishText ?? '' }
}

// Câu "đang làm" mặc định khi bà con chưa gõ: lấy từ mẫu A–D cũ (nếu có) cho khỏi trống.
const rfCurrentText = (p) => p?.currentText ?? (p?.currentId ? (ROTATIONS.find((r) => r.id === p.currentId)?.crops ?? []).map(rfCropName).join(' - ') : '')
const rfGenKey = (ev) => ev.garden?.id ?? 'district'

// Tên một chuỗi: cây thư viện theo ngôn ngữ, cây tự nhập giữ nguyên chữ.
const rfGenCrops = (p) => p.crops.map((c, i) => (c ? rfCropName(c) : p.customNames?.[i] ?? '—'))

// Mọi phương án đang có (cách đang làm + 3 đề xuất + AI + xem thêm), để chọn theo key.
function rfGenAll(ev) {
  const gen = ev.res.gen
  if (!gen) return []
  const ai = rfAiChecked(ev)
  return [gen.current, ...gen.proposals, ...ai, ...gen.more].filter(Boolean)
}

/** Kết quả AI đã KIỂM CHỨNG lại (chấm bằng lưới vụ, lời giải thích có số lạ bị ẩn). */
function rfAiChecked(ev) {
  const st = RF.ai[rfGenKey(ev)]
  if (st?.status !== 'done' || !ev.res.gen?.grid) return []
  return rgCheckAi(ev.res.gen.grid, st.list, { verify: (t) => asstVerifyReply(t, st.allowed).ok })
}

// Ngữ cảnh gửi AI: dữ kiện có LOẠI số liệu + tín hiệu lớp bản đồ + các chuỗi đã chấm (đều là số đã có trong trang).
function rfAiContext(ev) {
  const gen = ev.res.gen
  const pack = (p) => ({ crops: rfGenCrops(p), score: p.score ?? null, extraIrrigationMm: p.extraMm, soilPoints: p.soilPoints, seasonGrades: p.seasons.map((s) => s.grade) })
  const lat = ev.garden?.lat ?? ev.district?.lat
  const lon = ev.garden?.lon ?? ev.district?.lon
  const layers = Number.isFinite(lat) ? (emSynthesizeGardenStack(PRECOMPUTED.envMap, lat, lon, ev.garden, ev.floodCount ?? 0, S.lang)?.domains ?? []).map((d) => ({ title: d.title, summary: d.summary })) : []
  return {
    facts: ev.garden ? rfAssistantFacts(ev) : [],
    crop: ev.garden ? rfAssistantCrop(ev.garden) : null,
    seasons: gen.grid?.map((g) => ({ season: g.season, months: g.months, calendar: g.source })) ?? [],
    mapSignals: layers,
    current: gen.current ? pack(gen.current) : null,
    graded: [...gen.proposals, ...gen.more].map(pack),
    libraryCrops: CROP_LIB_IDS.map((c) => CROP_LIBRARY[c].name[S.lang]),
  }
}

async function rfAskAi(ev) {
  const key = rfGenKey(ev)
  const context = rfAiContext(ev)
  RF.ai[key] = { status: 'loading', list: [], allowed: asstLedgerNumbers(context) }
  rfRender()
  try {
    if (typeof served !== 'undefined' && !served) throw Object.assign(new Error('offline'), { off: true })
    const r = await fetch('/api/strategies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: S.lang, description: ev.res.gen.wishText, context }) })
    if (r.status === 204 || r.status === 404) throw Object.assign(new Error('no key'), { off: true })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    RF.ai[key] = { ...RF.ai[key], status: 'done', list: data.strategies ?? [], model: data.model ?? 'Gemini' }
  } catch (err) {
    RF.ai[key] = { ...RF.ai[key], status: err.off ? 'off' : 'error' }
  }
  rfRender()
}

// Chấm màu 3 vụ (Xanh/Vàng/Đỏ/Xám) của một chuỗi.
const rfGenDots = (p) => `<span class="inline-flex items-center gap-1">${p.seasons.map((s) => `<span class="inline-block size-3 rounded-full ${RF_DOT[s.grade] ?? RF_DOT.gray}" title="${esc(rfF().gradeShort[s.grade] ?? '')}"></span>`).join('')}</span>`

/** Lí giải đầy đủ khi bấm "Vì sao?": từng vụ (tiêu chí + nước), đất, cách tính điểm, tín hiệu bản đồ, AI, nguồn. */
function rfGenWhyHtml(p, ev) {
  const F = rfF()
  const R = ROT_TEXT[S.lang]
  const C = typeof mfT === 'function' ? mfT().criteria ?? {} : {}
  const gen = ev.res.gen
  const seasons = p.seasons.map((s, i) => {
    const name = s.crop ? rfCropName(s.crop) : p.customNames?.[i] ?? '—'
    const crit = s.assessment?.criteria ?? []
    const critHtml = crit.length
      ? crit.map((c) => `<span class="rf-why-crit"><span class="inline-block size-2.5 rounded-full ${RF_DOT[c.grade] ?? RF_DOT.gray}"></span>${esc(C[c.key] ?? c.key)}: ${esc(F.gradeShort[c.grade] ?? c.grade)}</span>`).join('')
      : `<span class="text-xs font-semibold text-sun-700">${esc(F.genCustomMissing(name))}</span>`
    const water = s.extraMm != null ? `<p class="mt-1 text-xs text-muted">${esc(F.genWhyWater(rfNum(s.needMm), rfNum(s.rainMm), rfNum(s.extraMm)))}</p>` : ''
    const soil = s.soilReasons?.length ? `<p class="mt-0.5 text-xs text-muted">${esc(F.genWhySoil(s.soilReasons.map((r) => F.genSoilWord[r.code]).join(', ')))}</p>` : ''
    return `<li class="rf-why-season"><p class="text-xs font-extrabold uppercase tracking-wide text-[#6d9b37]">${esc(R.seasons[s.season] ?? s.season)} · ${esc(rfMonthRange(s.months))}</p><p class="font-extrabold text-[#173d2b]">${esc(name)} <span class="text-xs font-bold text-muted">(${esc(F.gradeShort[s.grade])})</span></p><div class="mt-1 flex flex-wrap gap-1.5">${critHtml}</div>${water}${soil}</li>`
  }).join('')
  const w = gen.weights ?? {}
  const score = p.comps
    ? `<p class="text-xs text-ink">${esc(F.genWhyScore(rfNum(p.score), rfNum(p.suitPoints), rfNum(p.extraMm ?? 0), rfNum(p.soilPoints ?? 0), rfNum(p.variety), w))}</p>`
    : `<p class="text-xs font-semibold text-sun-700">${esc(F.genNoScore)}</p>`
  const est = ev.est?.ec?.origin === 'estimate' ? `<li>${esc(F.genWhyEc(rfNum(ev.est.ec.value, 1)))}</li>` : ''
  const layerKey = typeof MF !== 'undefined' ? MF.layer : null
  const lat = ev.garden?.lat ?? ev.district?.lat
  const lon = ev.garden?.lon ?? ev.district?.lon
  const desc = layerKey && EM_FILTER_META[layerKey] && Number.isFinite(lat) ? emDescribeCell(layerKey, emCellAt(PRECOMPUTED.envMap, layerKey, lat, lon)) : null
  const layer = desc ? `<li>${esc(F.genWhyLayer((typeof mfT === 'function' ? mfT().layers?.[layerKey] : null) ?? layerKey, desc.title?.[S.lang] ?? ''))}</li>` : ''
  const ai = p.kind === 'ai'
    ? `<div class="rf-why-ai"><p class="text-xs font-extrabold text-[#1d4f73]">${esc(F.genWhyAi)}</p>${p.rationale ? `<p class="mt-1 text-sm text-ink">${esc(p.rationale)}</p>` : ''}${p.rationaleDropped ? `<p class="mt-1 text-xs font-semibold text-sun-700">${esc(F.genAiDropped)}</p>` : ''}${p.tactics?.length ? `<ul class="mt-1 list-disc pl-5 text-sm text-ink">${p.tactics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>`
    : ''
  return `<div class="rf-why">
      ${ai}
      <ol class="rf-why-seasons">${seasons}</ol>
      <div class="mt-2">${score}</div>
      ${est || layer ? `<ul class="mt-2 list-disc pl-5 text-xs text-muted">${est}${layer}</ul>` : ''}
      <p class="mt-2 text-[11px] text-muted">${esc(F.genWhySources)}</p>
    </div>`
}

/** Bảng đề xuất: ô mô tả tự do + (cách đang làm, 3 đề xuất, AI) + "xem thêm". Bấm dòng để chọn; "Vì sao?" để xem lí giải. */
function rfGenHtml(ev, selected) {
  const F = rfF()
  const gen = ev.res.gen
  const key = rfGenKey(ev)
  const ai = RF.ai[key]
  const aiList = rfAiChecked(ev)
  const wishBox = `<div class="rf-wish">
      <label for="rf-wish" class="text-sm font-extrabold text-[#173d2b]">${esc(F.wishLabel)}</label>
      <textarea id="rf-wish" rows="2" maxlength="400" placeholder="${esc(F.wishPlaceholder)}">${esc(gen.wishText)}</textarea>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-rf="genRun" class="rf-press min-h-11 rounded-full bg-[#173d2b] px-4 text-sm font-extrabold text-white">${esc(F.genRun)}</button>
        <button type="button" data-rf="genAi" class="rf-press min-h-11 rounded-full border border-[#173d2b] px-4 text-sm font-extrabold text-[#173d2b]" ${ai?.status === 'loading' ? 'disabled' : ''}>${icon('sparkles', 'size-4 inline -mt-0.5')} ${esc(ai?.status === 'loading' ? F.aiLoading : F.genAi)}</button>
      </div>
      <p class="text-[11px] text-muted">${esc(F.genEngine(rfNum(gen.total)))}${ai?.status === 'off' ? ` · ${esc(F.aiOff)}` : ai?.status === 'error' ? ` · ${esc(F.aiError)}` : ai?.status === 'done' ? ` · ${esc(F.aiDone(ai.model))}` : ''}</p>
    </div>`
  if (!gen.grid) return `<section class="rf-gen-card">${wishBox}<p class="rf-plan-note mt-3">${esc(F.genNoClimate)}</p></section>`
  const row = (p) => {
    const on = selected?.key === p.key
    const label = p.kind === 'ai' && p.title ? `${F.genKind.ai}: ${p.title}` : F.genKind[p.kind]
    const water = p.extraMm != null ? esc(F.unitMm(rfNum(p.extraMm))) : `<span class="text-xs text-muted">${esc(F.cmpNoCalc)}</span>`
    const soil = p.soilPoints != null ? esc(F.unitPts(rfNum(p.soilPoints))) : '—'
    return `<div class="rf-gen-row ${on ? 'is-on' : ''} ${p.kind === 'current' ? 'is-current' : ''}">
        <button type="button" class="rf-gen-pick" data-rf="genPick" data-value="${esc(p.key)}" aria-pressed="${on}">
          <span class="rf-gen-kind">${esc(label)}</span>
          <span class="block text-base font-extrabold text-[#173d2b]">${esc(rfGenCrops(p).join(' → '))}</span>
          ${p.missingParams || p.customNames?.some(Boolean) ? `<span class="block text-[11px] font-semibold text-sun-700">${esc(F.genCustomShort)}</span>` : ''}
        </button>
        <div class="rf-gen-cell"><span class="rf-plan-label">${esc(F.genCols.fit)}</span>${rfGenDots(p)}</div>
        <div class="rf-gen-cell"><span class="rf-plan-label">${esc(F.genCols.water)}</span><span class="text-sm font-bold tabular-nums">${water}</span></div>
        <div class="rf-gen-cell"><span class="rf-plan-label">${esc(F.genCols.soil)}</span><span class="text-sm font-bold tabular-nums">${soil}</span></div>
        <div class="rf-gen-cell"><span class="rf-plan-label">${esc(F.genCols.score)}</span><span class="text-sm font-extrabold tabular-nums">${p.score != null ? esc(rfNum(p.score)) : '—'}</span></div>
        <details class="rf-gen-why"><summary>${esc(F.genWhy)}</summary>${rfGenWhyHtml(p, ev)}</details>
      </div>`
  }
  const rows = [gen.current, ...gen.proposals, ...aiList].filter(Boolean).map(row).join('')
  const more = gen.more.length
    ? `<details class="rf-gen-more"><summary>${esc(F.genMore(gen.more.length))}</summary><div class="mt-2 flex flex-wrap gap-2">${gen.more.map((p) => `<button type="button" data-rf="genPick" data-value="${esc(p.key)}" class="rf-gen-chip ${selected?.key === p.key ? 'is-on' : ''}">${esc(rfGenCrops(p).join(' → '))} · ${esc(rfNum(p.score))}</button>`).join('')}</div></details>`
    : ''
  return `<section class="rf-gen-card">
      <h4 class="text-xl font-extrabold tracking-tight text-[#173d2b]">${esc(F.genTitle)}</h4>
      <p class="mt-1 text-sm text-muted">${esc(F.genSub)}</p>
      <div class="mt-3">${wishBox}</div>
      ${gen.proposals.length ? '' : `<p class="rf-plan-note mt-3">${esc(F.genNone)}</p>`}
      <div class="rf-gen mt-3" role="list">
        <div class="rf-gen-head"><span>${esc(F.genCols.plan)}</span><span>${esc(F.genCols.fit)}</span><span>${esc(F.genCols.water)}</span><span>${esc(F.genCols.soil)}</span><span>${esc(F.genCols.score)}</span></div>
        ${rows}
      </div>
      ${more}
      <p class="mt-2 text-[11px] text-muted">${esc(F.genFoot(RG_PARAMS.weights))}</p>
    </section>`
}

/** Phương án đang chọn → dạng mà bảng Kế hoạch 3 vụ (rfPlanTableHtml) đọc được. */
function rfGenAsStrategy(p, gen) {
  const ndvi = gen.grid?.[0]?.source === 'ndvi'
  const reds = [...new Set(p.seasons.flatMap((s) => (s.assessment?.criteria ?? []).filter((c) => c.grade === 'red').map((c) => c.key)))]
  return {
    strategyId: rfF().genKind[p.kind] ?? '',
    crops: p.crops.map((c, i) => c ?? p.customNames?.[i] ?? '—'),
    windows: ndvi ? gen.grid.map((g) => ({ season: g.season, months: g.months })) : null,
    assessments: p.seasons.map((s) => s.assessment),
    eligibility: p.hasRed ? 'ineligible' : 'eligible',
    unmetConstraints: reds.map((k) => rfF().reasonWord[k] ?? k),
  }
}

// Cây thay được cho từng vụ = các cây Xanh của lưới vụ (cùng cách chấm).
const rfGenAlts = (gen) => ({ seasonAlternatives: gen.grid?.map((g) => ({ greenCrops: CROP_LIB_IDS.filter((c) => g.cells[c].assessment.overall === 'green').map((crop) => ({ crop })) })) ?? null })

/** 3 ô tóm tắt của phương án đang chọn so với cách đang làm (đủ dữ liệu) hoặc 3 vụ lúa. */
function rfGenSummaryHtml(p, gen) {
  const F = rfF()
  const base = gen.current?.complete && gen.current.key !== p.key ? gen.current : rgMeasure(gen.grid, ['rice', 'rice', 'rice'])
  const baseLabel = gen.current?.complete && gen.current.key !== p.key ? F.vsCurrent : F.vsRice
  if (p.extraMm == null || base.extraMm == null) return `<p class="rf-plan-note">${esc(F.genNoScore)}</p>`
  const dW = base.extraMm - p.extraMm
  const dS = (p.soilPoints ?? 0) - (base.soilPoints ?? 0)
  const greens = p.seasons.filter((s) => s.grade === 'green').length
  const pair = (a, b, cls) => {
    const max = Math.max(a, b, 1e-9)
    const w = (v) => (v > 0 ? Math.max(0.04, Math.min(1, v / max)) : 0).toFixed(3)
    return `<span class="rf-pair" aria-hidden="true"><span class="rf-pair-track"><span class="rf-bar rf-pair-rice" style="--rf-w:${w(a)}"></span></span><span class="rf-pair-track"><span class="rf-bar ${cls}" style="--rf-w:${w(b)}"></span></span></span>`
  }
  const tile = (title, big, bars) => `<div class="rf-sum-tile"><p class="rf-sum-title">${esc(title)}</p><p class="rf-sum-big">${esc(big)}</p>${bars}</div>`
  return `<div class="rf-sum">
      ${tile(F.sumWater, Math.abs(dW) < 1 ? F.genSame : dW > 0 ? F.genLess(rfNum(dW)) : F.genMore2(rfNum(-dW)), pair(base.extraMm, p.extraMm, 'bg-water-500'))}
      ${tile(F.sumSoil, F.genSoilDelta(`${dS > 0 ? '+' : ''}${rfNum(dS)}`), pair(base.soilPoints ?? 0, p.soilPoints ?? 0, 'bg-[#6d9b37]'))}
      ${tile(F.sumFit, F.sumFitVal(rfNum(greens)), '')}
    </div>
    <p class="mt-1.5 text-[11px] text-muted"><span class="rf-legend-rice"></span>${esc(baseLabel)} · <span class="rf-legend-this"></span>${esc(F.legendThis)} · ${esc(F.genNoIncome)}</p>`
}

/** Dạng "chiến lược" cho Trợ lý AI 2 tầng: dùng 3 đề xuất sinh tự do thay cho 4 mẫu A–D. */
function rfAssistantEval(ev) {
  const gen = ev.res.gen
  if (!gen?.proposals?.length) return ev.res
  return {
    ...ev.res,
    strategies: gen.proposals.map((p, i) => ({ strategyId: rfGenCrops(p).join('-'), kind: p.kind, crops: p.crops, eligibility: 'eligible', riskLevel: p.yellowSeasons || p.graySeasons ? 'conditional' : 'lower', rank: i + 1, score: p.score, missingFields: [] })),
  }
}

/* ---------------- Phần dùng chung còn lại ---------------- */

/** Bảng đầy đủ: 9 cây × 3 vụ, dạng bảng so sánh (hàng = cây, cột = vụ), kèm lý do bằng lời nông dân. */
export function rfAltTableHtml(res, { open = true } = {}) {
  const F = rfF()
  const R = ROT_TEXT[S.lang]
  const alts = res?.seasonAlternatives
  if (!alts) return ''
  const gradeOf = (a, crop) => {
    for (const tone of ['green', 'yellow', 'red', 'gray']) {
      const hit = a[`${tone}Crops`]?.find((c) => c.crop === crop)
      if (hit) return { tone, hit }
    }
    return null
  }
  const crops = [...new Set(alts.flatMap((a) => ['green', 'yellow', 'red', 'gray'].flatMap((t) => (a[`${t}Crops`] ?? []).map((c) => c.crop))))]
  const cell = (a, crop) => {
    const g = gradeOf(a, crop)
    if (!g) return '<td class="py-2 pr-3 text-xs text-muted">—</td>'
    const why = g.tone === 'red' || g.tone === 'yellow' ? [...new Set(g.hit.reasons.filter((r) => r.grade === g.tone).map((r) => F.reasonWord[r.key] ?? r.key))] : []
    return `<td class="py-2 pr-3 align-top"><span class="inline-flex items-center gap-1.5 text-xs font-bold text-ink"><span class="inline-block size-3 shrink-0 rounded-full ${RF_DOT[g.tone]}" aria-hidden="true"></span>${esc(F.grade[g.tone])}</span>${why.length ? `<span class="block text-[11px] text-muted">${esc(why.join(', '))}</span>` : ''}</td>`
  }
  const head = alts.map((a) => `<th scope="col" class="py-2 pr-3 text-left">${esc(R.seasons[a.season])}<span class="block font-semibold normal-case tracking-normal text-muted">${esc(rfMonthRange(a.months))}</span></th>`).join('')
  const body = crops.map((c) => `<tr class="border-t border-[#e6ebe0]"><th scope="row" class="py-2 pl-4 pr-3 text-left text-sm font-extrabold text-[#173d2b]">${esc(rfCropName(c))}</th>${alts.map((a) => cell(a, c)).join('')}</tr>`).join('')
  return `<details class="mt-5 rounded-[28px] border border-line bg-white p-5 shadow-card" ${open ? 'open' : ''}>
      <summary class="cursor-pointer text-base font-extrabold text-moss-900">${esc(F.altTitle)}</summary>
      <p class="mt-1 text-sm text-muted">${esc(F.altSub)}</p>
      ${alts[0]?.source === 'sowing' ? `<p class="mt-1 text-sm font-semibold text-sun-700">${esc(F.altSowing)}</p>` : ''}
      <div class="mt-3 overflow-x-auto rounded-2xl border border-[#dce3d5]">
        <table class="w-full min-w-[520px] border-collapse">
          <thead><tr class="bg-[#f7f8f2] text-[11px] font-extrabold uppercase tracking-wide text-[#6d9b37]"><th scope="col" class="py-2 pl-4 pr-3 text-left">${esc(F.altCols.crop)}</th>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </details>`
}

function rfAreaHa(g) {
  return Number.isFinite(g.areaM2) && g.areaM2 > 0 ? rfNum(g.areaM2 / 10000, 2) : rfF().areaUnknown
}

function rfQuickHtml() {
  const F = rfF()
  const irrOn = (v) => (v === 'unknown' ? RF.irrigation === null : RF.irrigation === v)
  const pill = (attr, value, label, on) =>
    `<button type="button" data-rf="${attr}" data-value="${value}" aria-pressed="${on}" class="rf-press min-h-12 rounded-full border px-4 text-sm font-extrabold ${on ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-white text-ink hover:border-moss-700'}">${esc(label)}</button>`
  const field = (id, label, value, step) =>
    `<label class="grid gap-1 text-sm font-bold text-ink">${esc(label)}<input id="${id}" type="number" inputmode="decimal" step="${step}" min="0" value="${value ?? ''}" class="min-h-12 rounded-2xl border border-line bg-white px-3 text-base font-bold" /></label>`
  return `<div id="rf-quick" class="rounded-[28px] border border-line bg-white p-5 shadow-card" tabindex="-1">
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
  const res = evalResult ?? ev?.res
  const { key, best } = rfStatus(res)
  const shown = best ?? res?.strategies?.[0] ?? null
  const lat = g?.lat ?? loc?.lat
  const lon = g?.lon ?? loc?.lon
  const liveTags = []
  if (evalResult) {
    if ((typeof MF !== 'undefined' && MF.record) || ev?.climateOrigin) liveTags.push('NASA POWER')
    if (res?.baseRankable) liveTags.push('MODIS')
  }
  const tags = evalResult ? liveTags : (ev ? rfSourceTags(ev) : [])
  const corner = g ? rfGardenCorner(g, ev ?? { calendar: res?.calendar ?? {} }) : (loc?.name ?? null)
  const thumb = Number.isFinite(lat) && Number.isFinite(lon)
    ? rfThumbHtml({ lat, lon, polygon: g?.polygon ?? null, stroke: g ? rfGroupColor(g) : '#ffffff', status: res ? key : null, label: g?.name ?? loc?.name ?? '', tags, chain: shown ? rfSeasonChain(shown) : null, corner })
    : ''
  const name = g?.name || loc?.name || F.bridgeNoGarden
  return `<div class="overflow-hidden rounded-[24px] border border-[#dce3d5] bg-[#fafbf6] shadow-card">
      ${thumb}
      <div class="p-4">
        <p class="text-xs font-extrabold uppercase tracking-wide text-[#6d9b37]">${esc(F.bridgeEyebrow)}</p>
        <p class="mt-1 text-xl font-extrabold tracking-tight text-[#173d2b]">${esc(name)}</p>
        ${g ? `<p class="text-sm font-bold text-muted">${esc(corner)}</p>` : ''}
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
  revealNow('#rotations [data-reveal]')
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
        revealNow('#rotations [data-reveal]')
        return rfScrollTo('rot-farm')
      case 'backToGrid':
        RF.mode = 'grid'
        rfSwap(rfRender)
        return rfScrollTo('rot-farm')
      case 'genRun': {
        const text = document.getElementById('rf-wish')?.value?.trim() ?? ''
        const g = (DS.gardens ?? []).find((x) => x.id === RF.view)
        if (g) {
          // Lưu câu tự do vào hồ sơ thửa (cùng ô "Bạn đang làm kiểu nào?" trong Cài đặt vườn).
          dsSaveGarden({ ...g, profile: { ...g.profile, currentText: text || null } })
          dsSave()
          delete RF.wish[g.id]
        } else RF.wish.district = text
        RF.genPick = null
        return rfRender()
      }
      case 'genAi': {
        const g = (DS.gardens ?? []).find((x) => x.id === RF.view)
        const typed = document.getElementById('rf-wish')?.value?.trim()
        if (typed != null) RF.wish[g ? g.id : 'district'] = typed
        return rfAskAi(g ? rfEvaluateGarden(g) : rfEvaluateDistrict())
      }
      case 'genPick':
        RF.genPick = v
        rfRender()
        return document.querySelector('#rot-farm .rf-answers')?.classList.add('rf-answers-in')
      case 'pick':
        RF.pick = v
        rfRender()
        // Đổi phương án A/B/C: 3 khối trả lời hiện lại lần lượt (CSS .rf-answers-in, tắt khi giảm chuyển động).
        return document.querySelector('#rot-farm .rf-answers')?.classList.add('rf-answers-in')
      case 'openFromMap':
        return rfOpenGardenStrategy(v || null)
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

// Dòng của bảng so sánh là <tr> bấm được: hỗ trợ phím Enter / Space cho người dùng bàn phím.
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    const row = e.target.closest?.('tr[data-rf="pick"]')
    if (!row || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    row.click()
  })
}

// Nhãn độ tin cậy có nguồn (rfRateChip): chạm trên điện thoại mở/đóng tooltip; chạm ra ngoài hoặc Esc thì đóng.
if (typeof document !== 'undefined') {
  const rfCloseTips = (except = null) => {
    for (const el of document.querySelectorAll('#rot-farm .rf-rate.is-open')) {
      if (el === except) continue
      el.classList.remove('is-open')
      el.querySelector('.rf-rate-btn')?.setAttribute('aria-expanded', 'false')
    }
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('#rot-farm .rf-rate-btn')
    if (!btn) {
      if (e.target.closest?.('#rot-farm .rf-rate')) return // bấm trong tooltip: đọc/chọn chữ, không đóng
      return rfCloseTips()
    }
    const wrap = btn.parentElement
    rfCloseTips(wrap)
    const open = !wrap.classList.contains('is-open')
    wrap.classList.toggle('is-open', open)
    btn.setAttribute('aria-expanded', String(open))
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') rfCloseTips()
  })
}
