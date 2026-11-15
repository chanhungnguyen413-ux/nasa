// Bản đồ vùng trồng trong thửa (Phase 3, mục 7). Chấm suitAssess cho TỪNG Ô của lưới chung (site/core/harmonize.js),
// chỉ với các lớp THẬT SỰ khác nhau trong ruộng:
//   - đánh dấu của nông dân ("Hay ngập") gần ô;
//   - số đo đất lấy tại MỘT ĐIỂM (pH, độ mặn) gần ô.
// Mọi thứ khác (khí hậu NASA POWER, số đo "cả ruộng") là MỘT giá trị cho cả ruộng, nên giống nhau ở mọi ô.
// Ô có cùng đầu vào thì cùng kết quả; ô liền nhau có cùng đầu vào gộp thành một vùng.
// Không có lớp nào khác nhau → một vùng duy nhất (uniform), trang hiện một màu và câu hướng dẫn ở blueprint mục 5.
import { evidence } from '../core/evidence.js'
import { hzDistanceM, hzPointInPolygon } from '../core/harmonize.js'
import { fiSoilForField } from '../sources/farmerInput.js'
import { suitAssess } from './suitability.js'

// Tham số DO NHÓM CHỌN: một dấu hoặc một điểm đo ảnh hưởng tới các ô có tâm cách nó không quá chừng này mét
// (khoảng 1,5 cạnh ô 30 m: ô chứa điểm và các ô sát bên).
export const ZONE_PARAMS = { radiusM: 45 }

/** Bán kính thật dùng cho một lưới: không nhỏ hơn cạnh ô, vì ruộng lớn có ô nới tới hơn 30 m và một dấu nằm trong ô
 * có thể cách tâm ô tới khoảng 0,71 cạnh ô (nửa đường chéo). */
export const znRadius = (field, params = ZONE_PARAMS) => Math.max(params.radiusM, field.cellM)

/**
 * Đầu vào riêng của từng ô.
 *   field: hzField() kiểu 'polygon' · soil, marks: danh sách trong kho (DS.soil, DS.marks)
 * Trả về [{ cell, floodN, point (số đo điểm gần nhất hoặc null), key }].
 */
export function znCellInputs({ field, soil, marks, params = ZONE_PARAMS }) {
  const radius = znRadius(field, params)
  const inField = (x) => hzPointInPolygon([x.lat, x.lon], field.polygon)
  const floods = marks.filter((m) => m.type === 'flood' && inField(m))
  const points = soil.filter((s) => s.where === 'point' && inField(s))
  return field.cells.map((cell) => {
    const at = [cell.lat, cell.lon]
    const floodN = floods.filter((m) => hzDistanceM([m.lat, m.lon], at) <= radius).length
    const near = points.map((s) => ({ s, d: hzDistanceM([s.lat, s.lon], at) })).filter((x) => x.d <= radius).sort((a, b) => a.d - b.d)
    const point = near[0]?.s ?? null
    return { cell, floodN, point, key: `${floodN}|${point?.id ?? '-'}` }
  })
}

/**
 * Chấm từng ô cho một cây.
 *   base: { crop, window, climate, irrigation } như suitAssess · field, soil, marks như trên
 *   estimates: (tuỳ chọn) kết quả ssAutoFill — CHỈ dùng khi cả ruộng chưa có số đo; Evidence giữ nguyên kind 'model'
 *              nên trang in đúng nhãn "ước tính 5 km · Tham khảo", không bao giờ thành "đo tại ruộng".
 * Trả về { cells: [{ cell, key, result }], uniform, zones: [{ id, key, result, cells: [i], local }] }.
 */
export function znAssess({ crop, window, climate, irrigation = null, field, soil, marks, params = ZONE_PARAMS, estimates = null }) {
  const whole = fiSoilForField(soil.filter((s) => s.where === 'field'), field) // số đo "cả ruộng": như nhau ở mọi ô
  // Thiếu số đo cả ruộng → dùng ước tính lưới 5 km (nếu có). Độ mặn ước tính mang ecType 'unknown' nên KHÔNG được chấm theo ngưỡng ECe.
  if (whole.ph.kind === 'missing' && estimates?.ph?.origin === 'estimate') whole.ph = estimates.ph.ev
  if (whole.ec.kind === 'missing' && estimates?.ec?.origin === 'estimate') {
    whole.ec = estimates.ec.ev
    whole.ecType = 'unknown'
  }
  const inputs = znCellInputs({ field, soil, marks, params })
  const cache = new Map()
  const assess = (inp) => {
    if (cache.has(inp.key)) return cache.get(inp.key)
    const p = inp.point
    const ground = (value, unit, label) => evidence({ value, unit, kind: 'ground', source: 'soilForm', label, period: p.date, note: { vi: `điểm đo (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)})`, en: `measured point (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)})` } })
    const salinity = p && typeof p.ec === 'number' ? ground(p.ec, 'dS/m', 'salinityField') : whole.ec
    const salinityType = p && typeof p.ec === 'number' ? p.ecType : whole.ecType
    const ph = p && typeof p.ph === 'number' ? ground(p.ph, '', 'phField') : whole.ph
    const floodMarks = inp.floodN > 0 ? evidence({ value: inp.floodN, unit: 'điểm', kind: 'farmer', source: 'farmerMark', label: 'mark_flood', note: { vi: `dấu trong vòng ${znRadius(field, params)} m quanh ô`, en: `marks within ${znRadius(field, params)} m of the cell` } }) : null
    const result = suitAssess({ crop, window, climate, irrigation, salinityEce: salinity.kind === 'missing' ? null : salinity, salinityType, ph, floodMarks })
    cache.set(inp.key, result)
    return result
  }
  const cells = inputs.map((inp) => ({ cell: inp.cell, key: inp.key, local: inp, result: assess(inp) }))
  return { cells, uniform: cache.size === 1, zones: znGroup(cells) }
}

/** Gộp các ô liền nhau (chung cạnh) có cùng đầu vào thành vùng. Thuật toán loang theo hàng/cột của lưới. */
export function znGroup(cells) {
  const byRc = new Map(cells.map((c, idx) => [`${c.cell.r},${c.cell.c}`, idx]))
  const zoneOf = new Array(cells.length).fill(-1)
  const zones = []
  cells.forEach((start, s) => {
    if (zoneOf[s] !== -1) return
    const zone = { id: zones.length, key: start.key, result: start.result, local: start.local, cells: [] }
    const stack = [s]
    zoneOf[s] = zone.id
    while (stack.length) {
      const k = stack.pop()
      zone.cells.push(cells[k].cell.i)
      const { r, c } = cells[k].cell
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = byRc.get(`${r + dr},${c + dc}`)
        if (n !== undefined && zoneOf[n] === -1 && cells[n].key === start.key) {
          zoneOf[n] = zone.id
          stack.push(n)
        }
      }
    }
    zones.push(zone)
  })
  return zones
}
