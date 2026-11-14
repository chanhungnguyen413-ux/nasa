// Test chuẩn hoá lưới và thời gian (mục 5 của blueprint).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HARMONIZE_PARAMS, hzAreaM2, hzClimatology, hzCompare, hzField, hzFieldRecords, hzLayer, hzMonthValues } from '../../site/core/harmonize.js'
import { evidence, evMissing } from '../../site/core/evidence.js'

// Một thửa khoảng 220 m × 220 m ở Cờ Đỏ.
const POLY = [[10.1, 105.43], [10.1, 105.432], [10.102, 105.432], [10.102, 105.43]]

test('lưới: ô 30 m nằm trong đa giác; ruộng lớn tự nới ô để không quá 400 ô', () => {
  const f = hzField({ polygon: POLY })
  assert.equal(f.kind, 'polygon')
  assert.equal(f.cellM, 30)
  assert.ok(f.cells.length > 30 && f.cells.length <= HARMONIZE_PARAMS.maxCells)
  const big = hzField({ polygon: [[10, 105], [10, 105.02], [10.02, 105.02], [10.02, 105]] }) // khoảng 2,2 km × 2,2 km
  assert.ok(big.cells.length <= HARMONIZE_PARAMS.maxCells)
  assert.ok(big.cellM > 30)
  assert.ok(Math.abs(hzAreaM2(POLY) - 222.6 * 219.2) / (222.6 * 219.2) < 0.02)
  assert.equal(hzField({ point: [10.1, 105.43] }).cells.length, 1)
})

test('nguồn 55 km không bao giờ sinh ra khác biệt giữa các ô (phương pháp uniform, có cờ)', () => {
  const field = hzField({ polygon: POLY })
  const records = [
    { date: '2025-01-01', value: 10, lat: 10.0, lon: 105.5 },
    { date: '2025-01-01', value: 99, lat: 10.5, lon: 105.5 },
    { date: '2025-01-01', value: 3, lat: 10.25, lon: 105.25 },
  ]
  const layer = hzLayer({ field, records, resolutionM: 55000 })
  assert.equal(layer.method, 'uniform')
  assert.equal(layer.uniform, true)
  const sets = new Set(layer.cells.map((c) => c.locKeys.join('|')))
  assert.equal(sets.size, 1, 'mọi ô phải nhận đúng cùng một chuỗi')
  // Độ phân giải không rõ cũng phải là uniform.
  assert.equal(hzLayer({ field, records, resolutionM: null }).method, 'uniform')
})

test('nguồn mịn hơn ruộng: mỗi ô lấy điểm gần nhất trong một độ phân giải, không nội suy', () => {
  const field = hzField({ polygon: POLY })
  const records = [
    { date: '2025-01-01', value: 1, lat: 10.1005, lon: 105.4305 },
    { date: '2025-01-01', value: 2, lat: 10.1015, lon: 105.4315 },
  ]
  const layer = hzLayer({ field, records, resolutionM: 100 })
  assert.equal(layer.method, 'nearest')
  assert.ok(new Set(layer.cells.map((c) => c.locKeys.join('|'))).size > 1)
  assert.ok(layer.cells.some((c) => c.locKeys.length === 0), 'ô xa mọi điểm quá một độ phân giải thì để trống')
})

test('file có tọa độ nhưng ở xa ruộng: không phủ ruộng', () => {
  const field = hzField({ point: [10.1, 105.43] })
  const layer = hzLayer({ field, records: [{ date: '2025-01-01', value: 1, lat: 11.5, lon: 106.5 }], resolutionM: 250 })
  assert.equal(layer.covered, false)
  assert.equal(hzFieldRecords(layer).length, 0)
})

test('thời gian: số liệu ngày thiếu quá 10% số ngày của tháng → tháng đó thiếu; mưa mm/ngày cộng thành mm/tháng', () => {
  const days = (y, m, n, v) => Array.from({ length: n }, (_, i) => ({ date: `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, value: v }))
  const records = [...days(2025, 1, 31, 2), ...days(2025, 2, 20, 1)] // tháng 2 chỉ 20/28 ngày
  const { step, months } = hzMonthValues(records, { flow: true, basis: 'day' })
  assert.equal(step, 1)
  assert.equal(months.get('2025-01'), 62)
  assert.equal(months.get('2025-02'), null)
  const clim = hzClimatology(records, { kind: 'satellite', source: 'upload:x', resolution: null, unit: 'mm', label: 'rain', flow: true, basis: 'day' })
  assert.equal(clim.months[0].value, 62)
  assert.equal(clim.months[1].kind, 'missing')
  assert.equal(clim.months[2].kind, 'missing')
})

test('thời gian: ảnh tổng hợp 16 ngày lấy trung bình trong tháng; số liệu tháng giữ nguyên', () => {
  const ndvi = [{ date: '2025-01-01', value: 0.6 }, { date: '2025-01-17', value: 0.8 }, { date: '2025-02-02', value: 0.4 }]
  const { step, months } = hzMonthValues(ndvi)
  assert.equal(step, 16)
  assert.ok(Math.abs(months.get('2025-01') - 0.7) < 1e-9)
  const rainMonthly = hzMonthValues([{ date: '2024-03', value: 40 }, { date: '2025-03', value: 60 }], { flow: true, basis: 'month' })
  assert.equal(rainMonthly.months.get('2024-03'), 40)
  const clim = hzClimatology([{ date: '2024-03', value: 40 }, { date: '2025-03', value: 60 }], { kind: 'model', source: 'upload:y', unit: 'mm', label: 'rain', flow: true, basis: 'month' })
  assert.equal(clim.months[2].value, 50)
})

test('hai nguồn cùng biến: mức lệch tuyệt đối và %, cờ khi vượt ngưỡng do nhóm chọn; thiếu thì thiếu', () => {
  const ev = (v) => evidence({ value: v, unit: 'mm', kind: 'model' })
  const a = [ev(100), ev(100), evMissing({ reason: 'x' }), ...Array(9).fill(ev(10))]
  const b = [ev(110), ev(200), ev(5), ...Array(9).fill(ev(10))]
  const c = hzCompare(a, b)
  assert.equal(c[0].abs.value, 10)
  assert.ok(Math.abs(c[0].pct.value - (10 / 105) * 100) < 1e-9)
  assert.equal(c[0].disagree, false)
  assert.equal(c[1].disagree, true)
  assert.equal(c[2].pct.kind, 'missing')
  assert.equal(c[2].disagree, false)
})
