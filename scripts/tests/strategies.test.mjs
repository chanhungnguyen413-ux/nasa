// Test chọn ba chiến lược luân canh (blueprint 4.5).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankRotations } from '../../site/logic/rotation.js'
import { districtInputs } from '../../site/logic/rotationInputs.js'
import { pickStrategies } from '../../site/logic/strategies.js'
import { loadPrecomputed } from './cases.mjs'

const fake = (id, extraMm, dryPenaltyMm, soilPoints, baseline = false) => ({ id, baseline, measures: { extraMm, dryPenaltyMm, soilPoints, profitRatio: 1 } })

test('chọn bằng số đo: ít nước năm khô nhất và nhiều điểm đất nhất, khác kiểu đang làm', () => {
  const result = { rankable: true, rotations: [fake('A', 900, 300, 0, true), fake('B', 600, 200, 3), fake('C', 500, 150, 2), fake('D', 700, 250, 5)] }
  const s = pickStrategies(result, 'A')
  assert.deepEqual(s.map((x) => [x.kind, x.rot.id]), [['base', 'A'], ['water', 'C'], ['soil', 'D']])
  assert.equal(s[1].metric.dryYearMm, 650)
})

test('một ứng viên thắng cả hai: hiện với hai nhãn, ô còn lại lấy ứng viên kế tiếp về đất', () => {
  const result = { rankable: true, rotations: [fake('A', 900, 300, 0, true), fake('B', 400, 100, 6), fake('C', 500, 150, 2), fake('D', 700, 250, 5)] }
  const s = pickStrategies(result, 'A')
  assert.equal(s[1].rot.id, 'B')
  assert.equal(s[1].alsoWins, 'soil')
  assert.equal(s[2].rot.id, 'D')
  assert.equal(s[2].runnerUp, true)
})

test('đổi kiểu đang làm: kiểu đó thành Cơ sở và không còn là ứng viên', () => {
  const result = { rankable: true, rotations: [fake('A', 900, 300, 0, true), fake('B', 600, 200, 3), fake('C', 500, 150, 2), fake('D', 700, 250, 5)] }
  const s = pickStrategies(result, 'C')
  assert.equal(s[0].rot.id, 'C')
  assert.ok(s.slice(1).every((x) => x.rot.id !== 'C'))
})

test('số liệu thật của 4 huyện xếp hạng được: luôn đủ ba thẻ khác nhau; huyện không xếp hạng được → null', () => {
  const PRE = loadPrecomputed()
  for (const id of ['cantho', 'angiang', 'soctrang', 'dongthap']) {
    const s = pickStrategies(rankRotations(districtInputs(PRE, id)), 'A')
    assert.equal(s.length, 3)
    assert.equal(new Set(s.map((x) => x.rot.id)).size, 3, id)
  }
  assert.equal(pickStrategies(rankRotations(districtInputs(PRE, 'bentre'))), null)
})
