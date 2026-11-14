// Test hồi quy cho trang Luân canh: rankRotations() của 5 huyện phải cho ĐÚNG kết quả đã chụp lại.
//   npm test
// Vì sao cần: các phase sau thêm nhiều code mới. Test này báo ngay nếu vô tình làm đổi điểm,
// thứ hạng, lý do hay mức tin cậy của bốn kiểu luân canh.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_WHAT_IF } from '../../site/logic/rotation.js'
import { SCENARIOS, assertMatchesGolden, caseName, districtIds, loadPrecomputed, readGolden, rotationCases, runRotation } from './cases.mjs'

const PRE = loadPrecomputed()
const golden = readGolden('rotation.json').cases
const actual = rotationCases(PRE)
const CHO_LACH = 'bentre' // Bến Tre · Chợ Lách: NDVI không cho thấy lịch 3 vụ
const riceDistricts = districtIds(PRE).filter((id) => id !== CHO_LACH)

test('ảnh chụp luân canh có đúng 15 ca (5 huyện × 3 kịch bản)', () => {
  assert.equal(Object.keys(actual).length, 15)
  assert.deepEqual(Object.keys(golden).sort(), Object.keys(actual).sort())
})

for (const [name, result] of Object.entries(actual)) {
  test(`luân canh · ${name}: giống ảnh chụp`, () => assertMatchesGolden(assert, result, golden[name]))
}

test('Chợ Lách không được xếp hạng ở mọi kịch bản', () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    const result = actual[caseName(CHO_LACH, scenario)]
    assert.equal(result.rankable, false)
    assert.equal(result.reason.code, 'noThreeSeasons')
  }
})

test('bốn huyện lúa: đủ 4 kiểu A–D, xếp giảm dần theo điểm, điểm nằm trong 0–100, chỉ A là kiểu đang làm', () => {
  for (const id of riceDistricts) {
    for (const scenario of Object.keys(SCENARIOS)) {
      const { rankable, rotations } = actual[caseName(id, scenario)]
      assert.equal(rankable, true)
      assert.deepEqual(rotations.map((r) => r.id).sort(), ['A', 'B', 'C', 'D'])
      assert.deepEqual(rotations.filter((r) => r.baseline).map((r) => r.id), ['A'])
      const totals = rotations.map((r) => r.total)
      assert.deepEqual(totals, [...totals].sort((a, b) => b - a), `${id} | ${scenario}: thẻ phải xếp từ điểm cao xuống thấp`)
      for (const r of rotations) {
        for (const score of [r.total, ...Object.values(r.scores)]) assert.ok(score >= 0 && score <= 100, `${id} ${r.id}: điểm ${score} ngoài 0–100`)
      }
    }
  }
})

test('kéo cả bốn thanh ưu tiên về 0 thì coi như bốn tiêu chí bằng nhau', () => {
  const allZero = { priorities: { water: 0, soil: 0, income: 0, risk: 0 }, whatIf: DEFAULT_WHAT_IF }
  const totalsById = (result) => Object.fromEntries(result.rotations.map((r) => [r.id, r.total]))
  for (const id of riceDistricts) {
    assert.deepEqual(totalsById(runRotation(PRE, id, allZero)), totalsById(actual[caseName(id, 'mac-dinh')]))
  }
})

test('mưa mùa khô giảm 30% thì lượng nước cần tưới không bao giờ giảm', () => {
  for (const id of riceDistricts) {
    const base = actual[caseName(id, 'mac-dinh')].rotations
    const dry = actual[caseName(id, 'mua-kho-giam-30')].rotations
    for (const b of base) {
      const d = dry.find((r) => r.id === b.id)
      assert.ok(d.measures.extraMm >= b.measures.extraMm, `${id} ${b.id}: ${d.measures.extraMm} mm < ${b.measures.extraMm} mm`)
    }
  }
})
