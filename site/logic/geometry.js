// Hình học của thửa ruộng: hàm thuần, không đụng bản đồ hay giao diện (công cụ khoanh thửa ở site/pages/mapDraw.js).
//
// Quy ước trong toàn project: đa giác là mảng góc [vĩ độ, kinh độ] (giống Leaflet), KHÔNG lặp lại góc đầu ở cuối.
// Riêng GeoJSON dùng [kinh độ, vĩ độ] và vòng khép kín (chuẩn RFC 7946) → chỉ đổi ở geoToGeoJSON/geoFromGeoJSON.
import { hzAreaM2, hzDistanceM } from '../core/harmonize.js'

// Ngưỡng do NHÓM chọn (không phải số nông học): thửa lớn hơn thì hỏi lại cho chắc là không khoanh nhầm cả xã;
// bán kính để một thửa được mượn lịch vụ NDVI của huyện gần nhất (lịch cấp huyện, không phải của riêng thửa).
export const GEO_PARAMS = {
  maxFieldHa: 50, // do nhóm chọn
  districtRadiusKm: 15, // do nhóm chọn
}

/** Diện tích (m²). Dùng đúng một phép tính với lưới ô (hzAreaM2) để số trên màn hình khớp số của lưới. */
export const geoAreaM2 = (poly) => (Array.isArray(poly) && poly.length >= 3 ? hzAreaM2(poly) : 0)

/** Khoảng cách giữa hai điểm (m): dùng chung phép tính của lưới ô (chiếu phẳng cục bộ, đủ cho cạnh ruộng). */
export const geoDistanceM = (a, b) => hzDistanceM(a, b)

/** Chiều dài từng cạnh (m): cạnh i nối góc i với góc i+1 (cạnh cuối nối về góc đầu). */
export const geoEdgeLengthsM = (poly) => poly.map((p, i) => geoDistanceM(p, poly[(i + 1) % poly.length]))

/** Trung điểm từng cạnh (chỗ đặt nút "kéo để thêm góc"). */
export const geoMidpoints = (poly) => poly.map((p, i) => {
  const q = poly[(i + 1) % poly.length]
  return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
})

/** Tâm (trung bình các góc): đủ để đặt nhãn và chọn điểm đại diện cho ruộng nhỏ, lồi. */
export const geoCentroid = (poly) => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length]

// Hai đoạn thẳng có cắt nhau thật sự không (chạm ở đầu mút chung không tính).
const geoCross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
export function geoSegmentsIntersect(p1, p2, q1, q2) {
  const d1 = geoCross(q1, q2, p1)
  const d2 = geoCross(q1, q2, p2)
  const d3 = geoCross(p1, p2, q1)
  const d4 = geoCross(p1, p2, q2)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/** Đa giác có cạnh tự cắt nhau không (hình "nơ bướm"): khi đó diện tích và lưới ô đều sai, nên không cho lưu. */
export function geoSelfIntersects(poly) {
  const n = poly.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Bỏ qua hai cạnh kề nhau (chung một góc), kể cả cạnh cuối với cạnh đầu.
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      if (geoSegmentsIntersect(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return true
    }
  }
  return false
}

/** Kiểm tra thửa trước khi lưu. Trả về { ok, problem?, areaM2 }. problem: 'tooFew' | 'selfIntersect' | 'tooBig'. */
export function geoValidate(poly, { maxHa = GEO_PARAMS.maxFieldHa } = {}) {
  if (!Array.isArray(poly) || poly.length < 3) return { ok: false, problem: 'tooFew', areaM2: 0 }
  if (geoSelfIntersects(poly)) return { ok: false, problem: 'selfIntersect', areaM2: geoAreaM2(poly) }
  const areaM2 = geoAreaM2(poly)
  if (areaM2 / 1e4 > maxHa) return { ok: false, problem: 'tooBig', areaM2 }
  return { ok: true, areaM2 }
}

/* ---------------- Sửa góc (trả về mảng MỚI, không sửa mảng cũ: để hoàn tác được) ---------------- */
export const geoMoveVertex = (poly, i, p) => poly.map((q, k) => (k === i ? p : q))
/** Chèn góc p ngay sau góc i (tức là vào giữa cạnh i). */
export const geoInsertVertex = (poly, i, p) => [...poly.slice(0, i + 1), p, ...poly.slice(i + 1)]
/** Xóa góc i; thửa phải còn ít nhất 3 góc, không thì giữ nguyên. */
export const geoRemoveVertex = (poly, i) => (poly.length <= 3 ? poly : poly.filter((_, k) => k !== i))

/** Hình chữ nhật từ hai góc chéo (theo hướng bắc–nam, đông–tây). Bốn góc theo thứ tự đi vòng. */
export function geoRectangle(a, b) {
  const [s, n] = a[0] < b[0] ? [a[0], b[0]] : [b[0], a[0]]
  const [w, e] = a[1] < b[1] ? [a[1], b[1]] : [b[1], a[1]]
  return [[s, w], [n, w], [n, e], [s, e]]
}

/* ---------------- GeoJSON ---------------- */
/** Thửa → GeoJSON Feature (WGS84, [kinh độ, vĩ độ], vòng khép kín). */
export function geoToGeoJSON(poly, properties = {}) {
  const ring = poly.map(([lat, lon]) => [lon, lat])
  ring.push(ring[0])
  return { type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: [ring] } }
}

/**
 * GeoJSON (Feature, FeatureCollection, Polygon hoặc MultiPolygon) → thửa đầu tiên tìm thấy, dạng [vĩ độ, kinh độ].
 * Chỉ lấy vòng ngoài (bỏ lỗ). Trả về null nếu không có đa giác hợp lệ (tọa độ ngoài giới hạn → null, không đoán).
 */
export function geoFromGeoJSON(obj) {
  const geoms = []
  const walk = (o) => {
    if (!o || typeof o !== 'object') return
    if (o.type === 'FeatureCollection') (o.features ?? []).forEach(walk)
    else if (o.type === 'Feature') walk(o.geometry)
    else if (o.type === 'GeometryCollection') (o.geometries ?? []).forEach(walk)
    else if (o.type === 'Polygon') geoms.push(o.coordinates?.[0])
    else if (o.type === 'MultiPolygon') (o.coordinates ?? []).forEach((p) => geoms.push(p?.[0]))
  }
  walk(obj)
  for (const ring of geoms) {
    if (!Array.isArray(ring)) continue
    const pts = ring.filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    if (pts.length !== ring.length) continue
    if (pts.some(([lon, lat]) => Math.abs(lat) > 90 || Math.abs(lon) > 180)) continue
    const poly = pts.map(([lon, lat]) => [lat, lon])
    const last = poly[poly.length - 1]
    if (poly.length > 1 && last[0] === poly[0][0] && last[1] === poly[0][1]) poly.pop()
    if (poly.length >= 3) return poly
  }
  return null
}

/* ---------------- Nhập tọa độ bằng tay ---------------- */
/**
 * "10.12, 105.6" · "10.12 105.6" · "10,12; 105,6" → { lat, lon }; sai hoặc ngoài giới hạn → null.
 * Dấu phẩy thập phân chỉ được hiểu khi hai số cách nhau bằng dấu chấm phẩy (không thì không biết phẩy nào là gì).
 */
export function geoParseLatLon(text) {
  const s = String(text ?? '').trim()
  if (!s) return null
  let parts
  if (s.includes(';')) parts = s.split(';').map((x) => x.trim().replace(',', '.'))
  else parts = s.split(/[\s,]+/).filter(Boolean)
  if (parts.length !== 2 || !parts.every((x) => /^[-+]?\d+(\.\d+)?$/.test(x))) return null
  const [lat, lon] = parts.map(Number)
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat, lon }
}

/** Huyện có lịch vụ gần nhất trong bán kính (km) → { id, km } hoặc null. places: [{ id, lat, lon }]. */
export function geoNearestPlace(point, places, radiusKm = GEO_PARAMS.districtRadiusKm) {
  let best = null
  for (const p of places) {
    const km = geoDistanceM(point, [p.lat, p.lon]) / 1000
    if (km <= radiusKm && (!best || km < best.km)) best = { id: p.id, km }
  }
  return best
}
