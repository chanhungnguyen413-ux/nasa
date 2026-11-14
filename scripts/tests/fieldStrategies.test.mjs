// Test đánh giá 3 chiến lược gắn với mảnh đất (Guide §4, §6.1, §8.2, §9.2).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evidence } from '../../site/core/evidence.js'
import { PROVINCES } from '../../site/data/provinces.js'
import { fsAssessField, fsCalendarSource, fsInputKey } from '../../site/logic/fieldStrategies.js'
import { loadPrecomputed } from './cases.mjs'

const PRE = loadPrecomputed()
const ev = (value, unit = 'mm') => evidence({ value, unit, kind: 'model', source: 'powerDaily' })
const goodClimate = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    rain: ev(220),
    rainDry: ev(180),
    gwetroot: ev(0.5, '0–1'),
    tmax: ev(31, '°C'),
    tmin: ev(24, '°C'),
  })),
}
const codo = PROVINCES.find((p) => p.id === 'cantho')
const cholach = PROVINCES.find((p) => p.id === 'bentre')

test('lịch vụ: điểm trực tiếp của huyện → direct; điểm trong bán kính → borrowed; ngoài vùng → none', () => {
  assert.equal(fsCalendarSource(codo, PROVINCES).mode, 'direct')
  assert.equal(fsCalendarSource({ lat: codo.lat + 0.02, lon: codo.lon }, PROVINCES).mode, 'borrowed')
  assert.equal(fsCalendarSource({ lat: 11.5, lon: 105.6 }, PROVINCES).mode, 'none')
  const legacy=fsCalendarSource({id:'old-district-id',lat:codo.lat,lon:codo.lon},PROVINCES)
  assert.equal(legacy.mode,'borrowed')
  assert.equal(legacy.districtId,codo.id)
})

test('hộ "Không đổi cây" → hai phương án thay thế thành ineligible có lý do, KHÔNG bị ép thành riskLevel high; A vẫn được chấm', () => {
  const res = fsAssessField({
    loc: codo,
    provinces: PROVINCES,
    precomputed: PRE,
    climate: goodClimate,
    irrigation: 'yes',
    cropChange: 'no',
    currentId: 'A',
  })
  assert.equal(res.evaluated, true)
  assert.equal(res.strategies.length, 3)
  const base = res.strategies.find((s) => s.isBaseline)
  const others = res.strategies.filter((s) => !s.isBaseline)
  assert.equal(base.eligibility, 'eligible')
  assert.equal(base.rank, 1)
  for (const s of others) {
    assert.equal(s.eligibility, 'ineligible')
    assert.equal(s.rank, null)
    assert.ok(s.unmetConstraints.includes('noCropChange'))
    assert.notEqual(s.riskLevel, 'unknown')
  }
})

test('thiếu trả lời nước tưới hoặc thiếu khí hậu → insufficient_data và rank: null', () => {
  const noIrr = fsAssessField({ loc: codo, provinces: PROVINCES, precomputed: PRE, climate: goodClimate, irrigation: null })
  for (const s of noIrr.strategies) {
    assert.equal(s.eligibility, 'insufficient_data')
    assert.equal(s.rank, null)
    assert.ok(s.missingFields.includes('irrigation'))
  }
  const noClim = fsAssessField({ loc: codo, provinces: PROVINCES, precomputed: PRE, climate: null, irrigation: 'yes' })
  for (const s of noClim.strategies) {
    assert.equal(s.eligibility, 'insufficient_data')
    assert.equal(s.rank, null)
    assert.ok(s.missingFields.includes('climate'))
  }
})

test('ngoài 5 huyện hoặc Chợ Lách: vẫn hiện đủ 3 chiến lược với insufficient_data và rank: null', () => {
  for (const loc of [{ lat: 11.5, lon: 105.6 }, cholach]) {
    const res = fsAssessField({ loc, provinces: PROVINCES, precomputed: PRE, climate: goodClimate, irrigation: 'yes' })
    assert.equal(res.baseRankable, false)
    assert.equal(res.strategies.length, 3)
    for (const s of res.strategies) {
      assert.equal(s.eligibility, 'insufficient_data')
      assert.equal(s.rank, null)
      assert.ok(s.missingFields.includes('ndviCalendar'))
    }
  }
})

test('cùng đầu vào → cùng kết quả; đổi đầu vào làm đổi fsInputKey', () => {
  const opts = { loc: codo, provinces: PROVINCES, precomputed: PRE, climate: goodClimate, irrigation: 'limited', cropChange: 'yes', currentId: 'A' }
  const r1 = fsAssessField(opts)
  const r2 = fsAssessField(opts)
  assert.deepEqual(r1.strategies.map((s) => [s.strategyId, s.eligibility, s.riskLevel, s.rank, s.score]), r2.strategies.map((s) => [s.strategyId, s.eligibility, s.riskLevel, s.rank, s.score]))

  const k1 = fsInputKey({ loc: codo, polygon: null, season: 'ht', sowing: 5, irrigation: 'limited', cropChange: 'yes', currentId: 'A', priorities: {}, whatIf: {} })
  const k2 = fsInputKey({ loc: codo, polygon: null, season: 'ht', sowing: 5, irrigation: 'yes', cropChange: 'yes', currentId: 'A', priorities: {}, whatIf: {} })
  assert.notEqual(k1, k2)
})
