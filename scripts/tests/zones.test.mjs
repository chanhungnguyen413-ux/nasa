// Test bản đồ vùng trồng (Phase 3) và ưu tiên của nông dân.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evidence } from '../../site/core/evidence.js'
import { hzField } from '../../site/core/harmonize.js'
import { cpSoilPoints, cpSort } from '../../site/logic/cropPriority.js'
import { suitAssess, suitWindow } from '../../site/logic/suitability.js'
import { znAssess } from '../../site/logic/zones.js'

const ev = (value, unit = 'mm') => evidence({ value, unit, kind: 'model', source: 'powerDaily' })
const climate = { months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rain: ev(220), rainDry: ev(180), gwetroot: ev(0.5, '0–1'), tmax: ev(31, '°C'), tmin: ev(23, '°C') })) }
const POLY = [[10.1, 105.43], [10.1, 105.432], [10.102, 105.432], [10.102, 105.43]]
const field = hzField({ point: [10.101, 105.431], polygon: POLY })
const base = { crop: 'maize', window: { months: [9, 10, 11, 12, 1], days: 152, source: 'ndvi' }, climate, irrigation: 'yes', field }

test('đánh dấu "Hay ngập" ở một góc: chỉ các ô quanh góc đó đổi hạng, lời giải thích nêu đánh dấu của nông dân', () => {
  const marks = [{ id: 'm1', type: 'flood', lat: 10.1002, lon: 105.4302, date: '2026-11-14' }]
  const z = znAssess({ ...base, soil: [], marks })
  assert.equal(z.uniform, false)
  assert.ok(z.zones.length >= 2)
  const corner = z.zones.find((zone) => zone.local.floodN > 0)
  const rest = z.zones.find((zone) => zone.local.floodN === 0)
  const wl = (zone) => zone.result.criteria.find((c) => c.key === 'waterlogging')
  assert.equal(wl(corner).reason, 'waterlog_farmer')
  assert.ok(wl(corner).evidence.some((e) => e.kind === 'farmer'))
  assert.equal(wl(rest).grade, 'green')
  assert.ok(corner.cells.length < rest.cells.length, 'vùng quanh góc nhỏ hơn phần còn lại')
})

test('không có lớp nào khác nhau trong thửa: một vùng duy nhất (uniform)', () => {
  const z = znAssess({ ...base, soil: [], marks: [] })
  assert.equal(z.uniform, true)
  assert.equal(z.zones.length, 1)
  assert.equal(z.zones[0].cells.length, field.cells.length)
  // Số đo "cả ruộng" cũng không tạo khác biệt giữa các ô.
  const whole = znAssess({ ...base, soil: [{ id: 's1', where: 'field', lat: 10.101, lon: 105.431, ec: 4, ecType: 'ece', date: '2026-11-14' }], marks: [] })
  assert.equal(whole.uniform, true)
})

test('số đo đất tại một điểm làm đổi các ô quanh điểm đó', () => {
  const soil = [{ id: 's2', where: 'point', lat: 10.1018, lon: 105.4318, ec: 6, ecType: 'ece', date: '2026-11-14' }]
  const z = znAssess({ ...base, soil, marks: [] })
  assert.equal(z.uniform, false)
  const salty = z.zones.find((zone) => zone.local.point)
  assert.equal(salty.result.criteria.find((c) => c.key === 'salinity').grade, 'yellow')
})

test('ưu tiên chỉ sắp thứ tự TRONG cùng hạng; "dễ bán" không đổi thứ tự', () => {
  const w = (crop) => suitWindow({ ndviWindow: { months: [9, 10, 11, 12, 1] }, crop })
  const results = ['rice', 'maize', 'soybean', 'cabbage', 'mungbean'].map((crop) => suitAssess({ crop, window: w(crop), climate, irrigation: 'limited' }))
  const grades = ['green', 'yellow', 'red', 'gray']
  for (const p of [null, 'water', 'soil', 'market']) {
    const sorted = cpSort(results, p)
    const idx = sorted.map((r) => grades.indexOf(r.overall))
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `ưu tiên ${p}: hạng phải không giảm dần`)
  }
  assert.deepEqual(cpSort(results, 'market').map((r) => r.crop), cpSort(results, null).map((r) => r.crop))
  assert.equal(cpSoilPoints('rice'), 0)
  assert.equal(cpSoilPoints('mungbean'), 2) // cây màu + họ đậu; rễ 1,0 m không sâu hơn lúa 1,0 m
  assert.equal(cpSoilPoints('soybean'), 3)
})

test('ruộng lớn (ô nới rộng hơn 45 m): một dấu vẫn đổi được ô chứa nó', () => {
  const big = hzField({ point: [10.01, 105.01], polygon: [[10, 105], [10, 105.03], [10.03, 105.03], [10.03, 105]] })
  assert.ok(big.cellM > 45)
  const z = znAssess({ ...base, field: big, soil: [], marks: [{ id: 'm', type: 'flood', lat: 10.0013, lon: 105.0013, date: '2026-11-14' }] })
  assert.equal(z.uniform, false)
})
