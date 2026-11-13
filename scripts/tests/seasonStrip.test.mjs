// Test hồi quy cho dải mùa vụ 12 tháng: seasonStrip() của 5 huyện phải cho ĐÚNG kết quả đã chụp lại.
//   npm test
// Vì sao cần: Phase 1 sẽ dùng lại seasonStrip để đánh dấu "tháng ruộng trống" và "tháng dễ tổn thương"
// trên biểu đồ mới. Nếu hàm này đổi kết quả thì cả hai nơi cùng sai.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertMatchesGolden, districtIds, loadPrecomputed, readGolden, seasonStripCases } from './cases.mjs'

const PRE = loadPrecomputed()
const golden = readGolden('seasonStrip.json').cases
const actual = seasonStripCases(PRE)
const CHO_LACH = 'bentre'
const riceDistricts = districtIds(PRE).filter((id) => id !== CHO_LACH)

test('ảnh chụp dải mùa vụ có đúng 5 huyện', () => {
  assert.deepEqual(Object.keys(golden).sort(), Object.keys(actual).sort())
  assert.equal(Object.keys(actual).length, 5)
})

for (const [id, strip] of Object.entries(actual)) {
  test(`dải mùa vụ · ${id}: giống ảnh chụp`, () => assertMatchesGolden(assert, strip, golden[id]))

  test(`dải mùa vụ · ${id}: đủ 12 tháng theo thứ tự T1 → T12`, () => {
    assert.deepEqual(strip.map((cell) => cell.month), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
}

test('Chợ Lách: không tháng nào được gán vụ (không có lịch 3 vụ từ NDVI)', () => {
  for (const cell of actual[CHO_LACH]) {
    assert.equal(cell.season, null)
    assert.equal(cell.isPeak, false)
  }
})

test('bốn huyện lúa: tháng nào cũng thuộc một vụ, và có đúng 3 tháng đỉnh (mỗi vụ một đỉnh)', () => {
  for (const id of riceDistricts) {
    const strip = actual[id]
    for (const cell of strip) assert.ok(['dx', 'ht', 'td'].includes(cell.season), `${id} T${cell.month}: vụ = ${cell.season}`)
    const peakSeasons = strip.filter((cell) => cell.isPeak).map((cell) => cell.season).sort()
    assert.deepEqual(peakSeasons, ['dx', 'ht', 'td'])
  }
})

test('tháng "dễ tổn thương" luôn là tháng khô (định nghĩa: vừa khô vừa nóng)', () => {
  for (const [id, strip] of Object.entries(actual)) {
    for (const cell of strip) assert.ok(!cell.isVulnerable || cell.isDry, `${id} T${cell.month}: dễ tổn thương mà không khô`)
  }
})
