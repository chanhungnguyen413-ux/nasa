// Bộ snapshot TĨNH của toàn ĐBSCL (đã tính sẵn trong site/data/precomputed/, nhúng vào index.html lúc build).
// Hàm thuần, không đụng giao diện, không gọi mạng: trang KHÔNG tự tải/cập nhật dữ liệu nền lúc chạy.
//
// Ba việc:
//  1. ssNearestClimate: chọn khí hậu NASA POWER tính sẵn gần nhất (5 huyện mẫu → tỉnh chứa điểm → tâm tỉnh gần nhất).
//  2. ssCellEstimate: đọc giá trị ô lưới 5 km (pH SoilGrids, độ mặn Wang et al. 2025) chứa thửa; ô trống thì
//     chỉ mượn ô KỀ (≤ 1 vòng, ~7 km) và ghi rõ là "ô gần nhất", không nội suy.
//  3. ssAutoFill + ssRate: tự điền THAM KHẢO thông số còn thiếu và gắn nhãn Nguồn + Ngày snapshot + Rate độ chính xác.
//     Số đo tại ruộng của nông dân luôn thắng; ước tính không bao giờ ghi đè hồ sơ đã lưu.
import { evidence, evText } from '../core/evidence.js'
import { GEO_PARAMS } from './geometry.js'
import { hzDistanceM } from '../core/harmonize.js'
import { mekongFindProvince } from '../data/mekongBoundaries.js'

// Rate độ chính xác theo LOẠI số liệu (do nhóm chọn, để nông dân hiểu nhanh mức tin cậy; không phải sai số đo được).
// ground/farmer: đo/ghi nhận tại ruộng · satellite: ảnh vệ tinh trên lưới · model: mô hình/tái phân tích tĩnh.
export const SS_RATE_OF_KIND = { ground: 'high', farmer: 'high', satellite: 'medium', model: 'ref', derived: 'ref', reference: 'table', simulated: 'sim', missing: 'none' }
export const ssRate = (kind) => SS_RATE_OF_KIND[kind] ?? 'none'

// Bán kính mượn ô kề: 1 vòng ô 5 km (đường chéo ~7 km). Do nhóm chọn: xa hơn thì nói thiếu.
export const SS_PARAMS = { neighbourRings: 1 }

// Khoảng cách (km) giữa hai điểm { lat, lon }: dùng chung phép tính chiếu phẳng của lưới ô.
const ssKm = (a, b) => hzDistanceM([a.lat, a.lon], [b.lat, b.lon]) / 1000

/**
 * Khí hậu tĩnh gần nhất cho một tọa độ.
 *   power: { districts: [{ id, name, record, elevation, lat?, lon? }], provinces: [{ code, name, lat, lon, record, elevation }] }
 *   districts: PROVINCES (5 huyện mẫu, có tọa độ) · districtRadiusKm: bán kính "cùng huyện"
 * Trả về { record, elevation, scope: 'district'|'province'|'nearestProvince', id, name, distanceKm } hoặc null.
 */
export function ssNearestClimate(power, lat, lon, districts = [], { districtRadiusKm = GEO_PARAMS.districtRadiusKm } = {}) {
  if (!power || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const here = { lat, lon }
  const near = districts
    .map((d) => ({ d, km: ssKm(here, d) }))
    .filter((x) => x.km <= districtRadiusKm)
    .sort((a, b) => a.km - b.km)[0]
  if (near) {
    const rec = (power.districts ?? []).find((x) => x.id === near.d.id)
    if (rec?.record) return { record: rec.record, elevation: rec.elevation ?? null, scope: 'district', id: rec.id, name: rec.name, distanceKm: near.km }
  }
  const provinces = (power.provinces ?? []).filter((p) => p.record)
  if (!provinces.length) return null
  const inside = mekongFindProvince(lat, lon)
  const own = inside ? provinces.find((p) => p.code === inside.code) : null
  if (own) return { record: own.record, elevation: own.elevation ?? null, scope: 'province', id: own.code, name: own.name, distanceKm: ssKm(here, own) }
  const best = provinces.map((p) => ({ p, km: ssKm(here, p) })).sort((a, b) => a.km - b.km)[0]
  return { record: best.p.record, elevation: best.p.elevation ?? null, scope: 'nearestProvince', id: best.p.code, name: best.p.name, distanceKm: best.km }
}

/** Dựng chỉ mục "i:j" → giá trị cho một lớp lưới số (records [[i, j, value, ...]]). */
export function ssIndex(layer) {
  if (!layer?.grid || !Array.isArray(layer.cells)) return null
  return { grid: layer.grid, map: new Map(layer.cells.map(([i, j, v]) => [`${i}:${j}`, v])) }
}

/**
 * Giá trị ô 5 km chứa (lat, lon). Ô trống → tìm ô kề gần nhất trong SS_PARAMS.neighbourRings vòng.
 * Trả về { value, i, j, method: 'cell'|'nearestCell', distanceKm } hoặc null (thiếu thì nói thiếu).
 */
export function ssCellEstimate(index, lat, lon, { rings = SS_PARAMS.neighbourRings } = {}) {
  if (!index || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const { dLat, dLon } = index.grid
  const i0 = Math.floor(lat / dLat)
  const j0 = Math.floor(lon / dLon)
  const own = index.map.get(`${i0}:${j0}`)
  if (typeof own === 'number') return { value: own, i: i0, j: j0, method: 'cell', distanceKm: 0 }
  let best = null
  for (let di = -rings; di <= rings; di++) {
    for (let dj = -rings; dj <= rings; dj++) {
      if (!di && !dj) continue
      const v = index.map.get(`${i0 + di}:${j0 + dj}`)
      if (typeof v !== 'number') continue
      const km = ssKm({ lat, lon }, { lat: (i0 + di + 0.5) * dLat, lon: (j0 + dj + 0.5) * dLon })
      if (!best || km < best.distanceKm) best = { value: v, i: i0 + di, j: j0 + dj, method: 'nearestCell', distanceKm: km }
    }
  }
  return best
}

// Ghi chú nguồn cho từng loại ước tính (đi kèm Evidence để trang in nhãn và dấu vết).
const SS_EST_META = {
  ph: { source: 'soilgridsPh', label: 'phField', unit: '', note: evText('ước tính SoilGrids 2.0, trung bình 0–30 cm của ô 5 km — không phải mẫu đất tại ruộng', 'SoilGrids 2.0 estimate, 0–30 cm mean of the 5 km cell — not a field soil sample') },
  ec: { source: 'wangSalinity', label: 'salinityField', unit: 'dS/m', note: evText('độ mặn đất mô hình Landsat mùa khô 2023 (Wang et al. 2025), trung bình ô 5 km — không phải ECe đo tại ruộng', 'modelled Landsat soil salinity, dry season 2023 (Wang et al. 2025), 5 km cell mean — not a field ECe measurement') },
}

/**
 * Tự điền THAM KHẢO pH và độ mặn còn thiếu của một thửa từ lưới tĩnh 5 km.
 *   profile: hồ sơ thửa (gmProfileDefaults) · grids: { ph: ssIndex, ec: ssIndex } · snapshot: { ph: '…', ec: '…' } (ngày/kỳ dữ liệu)
 * Trả về { ph, ec } — mỗi mục là { origin: 'field'|'estimate'|'missing', ev?: Evidence, rate, method?, distanceKm?, period? }.
 * Không bao giờ sửa profile. Độ mặn ước tính mang ecType 'unknown' để thang FAO (chỉ dành cho ECe) KHÔNG chấm điểm nó.
 */
export function ssAutoFill({ profile = {}, lat, lon, grids = {}, snapshot = {}, enabled = true }) {
  const out = {}
  for (const key of ['ph', 'ec']) {
    const measured = profile?.[key]
    if (typeof measured === 'number' && Number.isFinite(measured)) {
      out[key] = { origin: 'field', rate: ssRate('ground'), value: measured, period: profile.measuredAt ?? null, ecType: key === 'ec' ? profile.ecType ?? 'unknown' : undefined }
      continue
    }
    const est = enabled ? ssCellEstimate(grids[key], lat, lon) : null
    if (!est) {
      out[key] = { origin: 'missing', rate: 'none', reason: enabled ? 'noCell' : 'disabled' }
      continue
    }
    const m = SS_EST_META[key]
    const ev = evidence({ value: est.value, unit: m.unit, kind: 'model', source: m.source, label: m.label, period: snapshot[key] ?? null, resolution: evText('ô lưới 5 km', '5 km grid cell'), note: m.note })
    out[key] = { origin: 'estimate', rate: ssRate('model'), value: est.value, ev, method: est.method, distanceKm: est.distanceKm, period: snapshot[key] ?? null, ecType: key === 'ec' ? 'unknown' : undefined }
  }
  return out
}

/**
 * Nhãn minh bạch cho một Evidence: { kind, rate, source, period }. Dùng để in "Nguồn + Ngày snapshot + Rate".
 * Vệ tinh không bao giờ được gắn rate 'high' (chỉ đo tại ruộng mới 'high').
 */
export function ssLabel(ev) {
  const kind = ev?.kind ?? 'missing'
  return { kind, rate: ssRate(kind), source: ev?.source ?? null, period: ev?.period ?? null }
}

// Chỉ mục lưới dựng một lần cho mỗi bộ PRECOMPUTED (Map 2.000 ô: dựng lại mỗi lần vẽ là phí).
const ssGridMemo = new WeakMap()
/** Lưới số pH/độ mặn từ PRECOMPUTED.snapshot (null nếu bản build không có lớp đó). */
export function ssGrids(precomputed) {
  const snap = precomputed?.snapshot
  if (!snap) return { ph: null, ec: null, meta: {} }
  if (!ssGridMemo.has(snap)) ssGridMemo.set(snap, { ph: ssIndex(snap.ph), ec: ssIndex(snap.ec), meta: { ph: snap.ph?.meta ?? null, ec: snap.ec?.meta ?? null } })
  return ssGridMemo.get(snap)
}

/** Khí hậu tĩnh cho một tọa độ từ PRECOMPUTED (5 huyện mẫu `power` + 13 tỉnh `powerProvinces`). */
export const ssClimateFor = (precomputed, lat, lon, districts = []) =>
  ssNearestClimate({ districts: precomputed?.power ?? [], provinces: precomputed?.powerProvinces ?? [] }, lat, lon, districts)

/** Ước tính tham khảo cho một thửa (tắt được bằng profile.useEstimates = false trong Cài đặt vườn). */
export function ssGardenEstimates(precomputed, garden) {
  const grids = ssGrids(precomputed)
  return ssAutoFill({
    profile: garden?.profile ?? {},
    lat: garden?.lat,
    lon: garden?.lon,
    grids,
    snapshot: { ph: grids.meta.ph?.period ?? null, ec: grids.meta.ec?.period ?? null },
    enabled: garden?.profile?.useEstimates !== false,
  })
}

// Loại số liệu của 22 lớp bản đồ (do nhóm phân loại theo tài liệu từng nguồn): ảnh vệ tinh trực tiếp → 'satellite';
// sản phẩm mô hình/đồng hóa (SMAP L4, SoilGrids, ESI, DEM tổng hợp, bản đồ đất, nguy cơ lũ) → 'model'.
// Không lớp nào được gắn 'ground': bản đồ không bao giờ là số đo tại ruộng.
export const SS_LAYER_KIND = {
  ndvi: 'satellite', evi: 'satellite', lai: 'satellite', fpar: 'satellite', gpp: 'satellite', landCover: 'satellite', biomass: 'satellite',
  rain: 'satellite', lst: 'satellite', cold: 'satellite', flood3d: 'satellite',
  soil: 'model', soilRoot: 'model', soilTemp: 'model', floodHaz: 'model', esi: 'model', elev: 'model', soilType: 'model',
  soilPh: 'model', soilSoc: 'model', soilClay: 'model', soilNitrogen: 'model',
}
export const ssLayerKind = (key) => SS_LAYER_KIND[key] ?? 'model'
