// Bộ sinh phương án luân canh tự do (site/logic/rotationGen.js): đọc câu tự do, chấm lại bằng suitAssess,
// không đề xuất chuỗi có vụ Đỏ, 3 đề xuất khác nhau, kiểm chứng lại đề xuất của AI.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { rgCheckAi, rgGenerate, rgMeasure, rgParseWish, rgSeasonGrid, rgSoilOf, RG_PARAMS } from '../../site/logic/rotationGen.js'
import { powerClimate } from '../../site/sources/power.js'
import { CROP_LIBRARY } from '../../site/data/cropLibrary.js'

const pm = JSON.parse(readFileSync(new URL('../../site/data/precomputed/power_monthly.json', import.meta.url), 'utf8'))
const climate = powerClimate(pm.districts[0].record, { origin: 'precomputed' })
const grid = rgSeasonGrid({ sowingMonth: 12, climate, irrigation: 'yes' })

test('đọc câu tự do: chuỗi cây theo thứ tự, tên ngoài thư viện giữ nguyên, nhận mong muốn "ít tưới"', () => {
  const w = rgParseWish('đang trồng ngô - đậu phộng - lúa, muốn ít tưới')
  assert.deepEqual(w.crops.map((c) => c.id), ['maize', 'groundnut', 'rice'])
  assert.equal(w.emphasis.water, true)
  const c = rgParseWish('Lúa → sầu riêng → lúa')
  assert.deepEqual(c.crops, [{ id: 'rice' }, { id: null, custom: 'sầu riêng' }, { id: 'rice' }])
  assert.deepEqual(rgParseWish('').crops, [])
})

test('lưới vụ chấm đủ 9 cây × 3 vụ bằng suitAssess; nước tưới thêm = nhu cầu FAO − mưa POWER, không âm', () => {
  assert.equal(grid.length, 3)
  for (const g of grid) {
    assert.equal(Object.keys(g.cells).length, 9)
    for (const [crop, cell] of Object.entries(g.cells)) {
      const need = (CROP_LIBRARY[crop].waterMm[0] + CROP_LIBRARY[crop].waterMm[1]) / 2
      assert.equal(cell.needMm, Math.round(need))
      assert.equal(cell.extraMm, Math.max(0, Math.round(need) - cell.rainMm))
    }
  }
  assert.equal(rgSeasonGrid({ climate: null }), null)
})

test('điểm đất cùng luật rotation.js: cây cạn +1, họ đậu +1, rễ sâu hơn lúa +1', () => {
  assert.equal(rgSoilOf('rice').points, 0)
  assert.equal(rgSoilOf('mungbean').points, 2) // cạn + họ đậu (rễ 1.0 m không sâu hơn lúa 1.0 m)
  assert.equal(rgSoilOf('maize').points, 2) // cạn + rễ sâu
  assert.equal(rgSoilOf('khong-co').points, null)
})

test('không đề xuất chuỗi có vụ Đỏ; 3 đề xuất khác nhau ít nhất 2 vụ; "tốt cho đất" không độc canh', () => {
  const g = rgGenerate(grid)
  assert.equal(g.proposals.length, 3)
  for (const p of [...g.proposals, ...g.more]) assert.equal(p.hasRed, false)
  const [a, b, c] = g.proposals
  const diff = (x, y) => x.crops.filter((v, i) => v !== y.crops[i]).length
  assert.ok(diff(a, b) >= 2 && diff(a, c) >= 2 && diff(b, c) >= 2)
  assert.ok(g.proposals.find((p) => p.kind === 'soil').variety >= 2)
  assert.ok(g.more.length <= RG_PARAMS.more)
  // Đề xuất "tiết kiệm nước" có nước tưới thêm thấp nhất trong mọi chuỗi hợp lệ.
  const minExtra = Math.min(...[...g.proposals, ...g.more].map((p) => p.extraMm))
  assert.equal(g.proposals.find((p) => p.kind === 'water').extraMm, minExtra)
})

test('cách đang làm được chấm cùng thang; mong muốn "ít tưới" tăng trọng số nước', () => {
  const g = rgGenerate(grid, { wish: rgParseWish('ngô - đậu phộng - lúa, muốn ít tưới') })
  assert.deepEqual(g.current.crops, ['maize', 'groundnut', 'rice'])
  assert.equal(typeof g.current.score, 'number')
  assert.equal(g.weights.water, RG_PARAMS.weights.water * RG_PARAMS.emphasisFactor)
  const custom = rgGenerate(grid, { wish: rgParseWish('lúa - sầu riêng - lúa') })
  assert.equal(custom.current.complete, false)
  assert.equal(custom.current.score, null) // thiếu tham số FAO → không chấm điểm, nói thiếu
})

test('kiểm chứng đề xuất AI: chấm lại bằng lưới vụ, cây ngoài thư viện báo thiếu, lời giải thích có số lạ bị bỏ', () => {
  const out = rgCheckAi(grid, [{ title: 'Thử', crops: ['dưa hấu', 'đậu xanh', 'lúa'], rationale: 'giảm 999 mm nước', tactics: ['lên liếp'] }], { verify: (t) => !/\d/.test(t) })
  assert.equal(out[0].missingParams, true)
  assert.deepEqual(out[0].crops, [null, 'mungbean', 'rice'])
  assert.equal(out[0].customNames[0], 'dưa hấu')
  assert.equal(out[0].rationale, '')
  assert.equal(out[0].rationaleDropped, true)
  assert.deepEqual(out[0].tactics, ['lên liếp'])
  assert.equal(out[0].seasons[1].grade, rgMeasure(grid, ['rice', 'mungbean', 'rice']).seasons[1].grade)
  assert.deepEqual(rgCheckAi(grid, null), [])
})
