// Đưa mọi nguồn về LƯỚI CHUNG của ruộng và BƯỚC THÁNG (mục 5 của docs/blueprint/00-BLUEPRINT.md).
//
// Quy tắc cứng: không bao giờ nội suy nguồn thô thành chi tiết giả. Mỗi lớp ghi rõ cách đưa về lưới:
//   'uniform'   một giá trị vùng gán cho MỌI ô (gắn cờ "một giá trị cho cả ruộng", không dùng để phân vùng)
//   'nearest'   mỗi ô lấy điểm số liệu gần nhất (chỉ khi nguồn mịn hơn kích thước ruộng)
//   'aggregate' nguồn mịn hơn ô lưới: lấy trung bình các điểm rơi vào ô
// File này là hàm thuần: không đụng giao diện, không gọi mạng.
import { evidence, evDerive, evIsMissing, evMissing, evText } from './evidence.js'

// Tham số DO NHÓM CHỌN (không phải hằng số khoa học); giao diện in nguyên văn với nhãn "ngưỡng do nhóm chọn".
export const HARMONIZE_PARAMS = {
  cellM: 30, // cạnh ô lưới mặc định (m), theo blueprint mục 5
  maxCells: 400, // ruộng lớn thì nới cạnh ô để không quá chừng này ô
  minDayShare: 0.9, // số liệu ngày: tháng có ít hơn 90% số ngày thì coi là thiếu (giống NASA POWER ở Phase 1)
  matchDistanceM: 1000, // file có tọa độ: điểm số liệu xa ruộng hơn max(độ phân giải, khoảng này) thì coi là không phủ ruộng
  disagreePct: 25, // hai nguồn cùng biến lệch nhau hơn 25% thì hạ độ tin cậy
}

// Số mét trên một độ: 1 độ vĩ ≈ 111 320 m (chu vi Trái Đất ≈ 40 075 km chia 360). Đủ chính xác cho một thửa ruộng.
const HZ_M_PER_DEG = 111320
const hzMeters = (lat) => ({ lat: HZ_M_PER_DEG, lon: HZ_M_PER_DEG * Math.cos((lat * Math.PI) / 180) })

/** Khoảng cách gần đúng giữa hai điểm [lat, lon] (m), phép chiếu phẳng cục bộ: đủ cho khoảng cách vài km. */
export function hzDistanceM(a, b) {
  const m = hzMeters((a[0] + b[0]) / 2)
  return Math.hypot((a[0] - b[0]) * m.lat, (a[1] - b[1]) * m.lon)
}

/** Điểm [lat, lon] có nằm trong đa giác [[lat, lon], ...] không (thuật toán tia cắt). */
export function hzPointInPolygon([lat, lon], poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]
    const [yj, xj] = poly[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Diện tích đa giác (m²), công thức dây giày trên mặt phẳng cục bộ. */
export function hzAreaM2(poly) {
  const m = hzMeters(poly.reduce((s, p) => s + p[0], 0) / poly.length)
  let sum = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) sum += poly[j][1] * m.lon * (poly[i][0] * m.lat) - poly[i][1] * m.lon * (poly[j][0] * m.lat)
  return Math.abs(sum) / 2
}

const hzBounds = (poly) => ({
  minLat: Math.min(...poly.map((p) => p[0])),
  maxLat: Math.max(...poly.map((p) => p[0])),
  minLon: Math.min(...poly.map((p) => p[1])),
  maxLon: Math.max(...poly.map((p) => p[1])),
})

/**
 * Đơn vị phân tích của ruộng.
 *   Chưa khoanh ruộng: một điểm (1 ô, cạnh 0).
 *   Đã khoanh: các ô vuông có tâm nằm trong đa giác; cạnh ô 30 m, tự nới (bước 5 m) để không quá maxCells ô.
 * Trả về { kind, point (điểm đã chọn), center, extentM (cạnh dài của khung bao), cellM, cells: [{ i, lat, lon }] }.
 */
export function hzField({ point = null, polygon = null, params = HARMONIZE_PARAMS }) {
  if (!polygon || polygon.length < 3) {
    return { kind: 'point', point, center: point, extentM: 0, cellM: 0, cells: point ? [{ i: 0, lat: point[0], lon: point[1] }] : [] }
  }
  const b = hzBounds(polygon)
  const center = [(b.minLat + b.maxLat) / 2, (b.minLon + b.maxLon) / 2]
  const m = hzMeters(center[0])
  const extentM = Math.max((b.maxLat - b.minLat) * m.lat, (b.maxLon - b.minLon) * m.lon)
  let cellM = params.cellM
  for (;;) {
    const cells = []
    const dLat = cellM / m.lat
    const dLon = cellM / m.lon
    // r, c: hàng và cột của ô trong lưới, để biết hai ô có nằm cạnh nhau không (gộp ô thành vùng ở Phase 3).
    let r = 0
    for (let lat = b.minLat + dLat / 2; lat < b.maxLat; lat += dLat, r++) {
      let c = 0
      for (let lon = b.minLon + dLon / 2; lon < b.maxLon; lon += dLon, c++) {
        if (hzPointInPolygon([lat, lon], polygon)) cells.push({ i: cells.length, r, c, lat, lon })
      }
    }
    // Ruộng nhỏ hơn một ô: vẫn có ít nhất một ô ở tâm.
    if (cells.length === 0) cells.push({ i: 0, r: 0, c: 0, lat: center[0], lon: center[1] })
    if (cells.length <= params.maxCells) return { kind: 'polygon', point, center, extentM, cellM, cells, polygon }
    cellM += 5
  }
}

/* ---------------------------------------------------------------
 * Thời gian: chuỗi số liệu → 12 tháng khí hậu
 * --------------------------------------------------------------- */
const hzDaysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const hzMedian = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null
}

/** Bước thời gian gốc của chuỗi (ngày): trung vị khoảng cách giữa các ngày liên tiếp. Ngày dạng 'YYYY-MM' coi là tháng. */
export function hzStepDays(dates) {
  if (dates.some((d) => d.length === 7)) return 30
  const t = [...new Set(dates)].map((d) => Date.parse(`${d}T00:00:00Z`)).sort((a, b) => a - b)
  if (t.length < 2) return null
  return hzMedian(t.slice(1).map((v, i) => (v - t[i]) / 864e5))
}

/**
 * Gộp chuỗi số liệu của MỘT vị trí thành giá trị từng tháng-năm.
 *   records: [{ date: 'YYYY-MM-DD' | 'YYYY-MM', value }]
 *   flow: true nếu biến là "lượng" (mưa, bốc thoát hơi nước): kết quả là tổng mm của tháng.
 *   basis: 'day' (giá trị là mm/ngày) | 'month' (giá trị đã là mm/tháng); chỉ dùng khi flow.
 * Quy tắc thiếu: số liệu ngày mà tháng có ít hơn minDayShare số ngày → tháng đó null.
 * Trả về { step, months: Map('YYYY-MM' → số | null) }.
 */
export function hzMonthValues(records, { flow = false, basis = 'day', params = HARMONIZE_PARAMS } = {}) {
  const step = hzStepDays(records.map((r) => r.date))
  const groups = new Map()
  for (const r of records) {
    const key = r.date.slice(0, 7)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  const months = new Map()
  for (const [key, rows] of groups) {
    const [y, m] = key.split('-').map(Number)
    const days = hzDaysIn(y, m)
    if (step !== null && step <= 1.5) {
      const distinct = new Set(rows.map((r) => r.date)).size
      if (distinct < params.minDayShare * days) {
        months.set(key, null)
        continue
      }
    }
    const mean = rows.reduce((s, r) => s + r.value, 0) / rows.length
    months.set(key, flow && basis === 'day' ? mean * days : mean)
  }
  return { step, months }
}

/**
 * Khí hậu 12 tháng của một chuỗi: trung bình các năm cho từng tháng, kèm số năm. Mỗi tháng là một Evidence.
 *   meta: { kind, source, resolution, unit, label, flow, basis }
 */
export function hzClimatology(records, meta, params = HARMONIZE_PARAMS) {
  const { step, months } = hzMonthValues(records, { flow: meta.flow, basis: meta.basis, params })
  const years = [...months.keys()].map((k) => Number(k.slice(0, 4)))
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—'
  const out = []
  for (let m = 1; m <= 12; m++) {
    const all = [...months.entries()].filter(([k]) => Number(k.slice(5, 7)) === m)
    const values = all.map(([, v]) => v).filter((v) => v !== null)
    if (values.length === 0) {
      const why = all.length
        ? evText(`tháng ${m}: số liệu ngày có ít hơn ${Math.round(params.minDayShare * 100)}% số ngày`, `month ${m}: daily data cover less than ${Math.round(params.minDayShare * 100)}% of days`)
        : evText(`file không có số liệu cho tháng ${m}`, `the file has no data for month ${m}`)
      out.push(evMissing({ reason: why, need: 'upload', unit: meta.unit, label: meta.label, source: meta.source }))
      continue
    }
    out.push(
      evidence({
        value: values.reduce((a, b) => a + b, 0) / values.length,
        unit: meta.unit,
        kind: meta.kind,
        source: meta.source,
        resolution: meta.resolution,
        label: meta.label,
        period: evText(`${span}, trung bình tháng ${m} (${values.length} năm)`, `${span}, mean of month ${m} (${values.length} years)`),
        note: step !== null && step > 1.5 && step < 27 ? evText(`ảnh tổng hợp khoảng ${Math.round(step)} ngày: lấy trung bình các ảnh trong tháng`, `composites of about ${Math.round(step)} days: mean of the images in the month`) : null,
      }),
    )
  }
  return { step, months: out }
}

/* ---------------------------------------------------------------
 * Không gian: chuỗi theo vị trí → giá trị cho các ô của ruộng
 * --------------------------------------------------------------- */
const hzLocKey = (r) => (r.lat === null || r.lat === undefined ? 'none' : `${r.lat.toFixed(5)},${r.lon.toFixed(5)}`)

/** Gom bản ghi theo vị trí: [{ key, lat, lon, records }]. Bản ghi không tọa độ gom vào một nhóm 'none'. */
export function hzGroupByLocation(records) {
  const map = new Map()
  for (const r of records) {
    const key = hzLocKey(r)
    if (!map.has(key)) map.set(key, { key, lat: r.lat ?? null, lon: r.lon ?? null, records: [] })
    map.get(key).records.push(r)
  }
  return [...map.values()]
}

/**
 * Chọn cách đưa một lớp về lưới ruộng và gán chuỗi cho từng ô.
 *   field: hzField() · records: [{ date, value, lat, lon }] · resolutionM: độ phân giải gốc (m) hoặc null nếu không rõ
 * Trả về { method, uniform, covered, nearestM, cells: [{ i, locKeys: [...] }], groups }.
 *   covered = false khi file có tọa độ nhưng không điểm nào đủ gần ruộng.
 */
export function hzLayer({ field, records, resolutionM = null, params = HARMONIZE_PARAMS }) {
  const groups = hzGroupByLocation(records)
  const located = groups.filter((g) => g.key !== 'none')
  const center = field.center
  if (located.length === 0 || !center) {
    // File không có tọa độ: người dùng đã gắn file vào ruộng này, nên đây là MỘT giá trị cho cả ruộng.
    const keys = groups.map((g) => g.key)
    return { method: 'uniform', uniform: true, covered: true, nearestM: null, cells: field.cells.map((c) => ({ i: c.i, locKeys: keys })), groups }
  }
  const dist = (g, p) => hzDistanceM([g.lat, g.lon], p)
  const nearest = located.reduce((best, g) => (dist(g, center) < dist(best, center) ? g : best))
  const nearestM = dist(nearest, center)
  const reach = Math.max(resolutionM ?? 0, params.matchDistanceM)
  if (nearestM > reach + field.extentM / 2) return { method: 'uniform', uniform: true, covered: false, nearestM, cells: [], groups }
  // Nguồn thô hơn (hoặc bằng) kích thước ruộng, hoặc không rõ độ phân giải: một giá trị cho cả ruộng.
  if (resolutionM === null || field.kind === 'point' || resolutionM >= field.extentM) {
    return { method: 'uniform', uniform: true, covered: true, nearestM, cells: field.cells.map((c) => ({ i: c.i, locKeys: [nearest.key] })), groups }
  }
  if (resolutionM <= field.cellM) {
    // Nguồn mịn hơn ô lưới: ô lấy trung bình các điểm rơi trong ô; ô không có điểm nào thì để trống (không nội suy).
    const half = field.cellM / 2
    const cells = field.cells.map((c) => {
      const m = hzMeters(c.lat)
      const inside = located.filter((g) => Math.abs(g.lat - c.lat) * m.lat <= half && Math.abs(g.lon - c.lon) * m.lon <= half)
      return { i: c.i, locKeys: inside.map((g) => g.key) }
    })
    return { method: 'aggregate', uniform: false, covered: true, nearestM, cells, groups }
  }
  // Nguồn mịn hơn ruộng nhưng thô hơn ô: mỗi ô lấy điểm gần nhất, chỉ khi điểm đó cách ô không quá một độ phân giải.
  const cells = field.cells.map((c) => {
    const g = located.reduce((best, x) => (dist(x, [c.lat, c.lon]) < dist(best, [c.lat, c.lon]) ? x : best))
    return { i: c.i, locKeys: dist(g, [c.lat, c.lon]) <= resolutionM ? [g.key] : [] }
  })
  return { method: 'nearest', uniform: false, covered: true, nearestM, cells, groups }
}

/** Chuỗi bản ghi đại diện cho cả ruộng: gộp bản ghi của các vị trí mà các ô dùng tới. */
export function hzFieldRecords(layer) {
  const keys = new Set(layer.cells.flatMap((c) => c.locKeys))
  return layer.groups.filter((g) => keys.has(g.key)).flatMap((g) => g.records)
}

/* ---------------------------------------------------------------
 * Hai nguồn cùng một biến: hiện cả hai và mức lệch, không tự chọn một
 * --------------------------------------------------------------- */
/**
 * a, b: hai mảng 12 Evidence (cùng đơn vị). Trả về 12 tháng { abs, pct, disagree }.
 * Mức lệch % tính trên TRUNG BÌNH của hai nguồn, vì không nguồn nào được coi là "đúng".
 */
export function hzCompare(a, b, params = HARMONIZE_PARAMS) {
  return a.map((ea, i) => {
    const eb = b[i]
    const abs = evDerive({ inputs: { a: ea, b: eb }, compute: (v) => Math.abs(v.a - v.b), unit: ea.unit, formula: evText('|nguồn 1 − nguồn 2|', '|source 1 − source 2|'), label: 'diffAbs' })
    const pct = evDerive({
      inputs: { a: ea, b: eb },
      compute: (v) => (v.a + v.b === 0 ? 0 : (Math.abs(v.a - v.b) / ((v.a + v.b) / 2)) * 100),
      unit: '%',
      formula: evText('|nguồn 1 − nguồn 2| ÷ trung bình hai nguồn × 100', '|source 1 − source 2| ÷ mean of both × 100'),
      label: 'diffPct',
    })
    return { month: i + 1, abs, pct, disagree: !evIsMissing(pct) && pct.value > params.disagreePct }
  })
}
