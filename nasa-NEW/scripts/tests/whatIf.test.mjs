// Test giả định khí hậu (blueprint 4.3) trên số liệu NASA POWER đã tính sẵn của Cờ Đỏ.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evidence } from '../../site/core/evidence.js'
import { et0Months } from '../../site/logic/et0.js'
import { DEFAULT_WHAT_IF, ROTATION_PARAMS, rankRotations } from '../../site/logic/rotation.js'
import { districtInputs } from '../../site/logic/rotationInputs.js'
import { WI_DEFAULT, wiApply, wiDriestYear, wiDryMonths, wiEt0Pair } from '../../site/logic/whatIf.js'
import { powerClimate } from '../../site/sources/power.js'
import { loadPrecomputed } from './cases.mjs'

const power = JSON.parse(readFileSync(new URL('../../site/data/precomputed/power_monthly.json', import.meta.url), 'utf8'))
const cantho = power.districts.find((d) => d.id === 'cantho')
const record = cantho.record
const climate = powerClimate(record, { origin: 'precomputed' })
const lat = evidence({ value: record.lat, unit: '°', kind: 'farmer' })
const elevation = evidence({ value: cantho.elevation.value, unit: 'm', kind: 'satellite' })
const et0Of = (c) => et0Months(c.months, { lat, elevation }).map((m) => m.monthly)

test('ΔT = 0 và mưa 0%: kết quả y hệt số liệu gốc, không có gì bị gắn nhãn mô phỏng', () => {
  const { climate: same } = wiApply(climate, WI_DEFAULT, { record })
  assert.equal(same, climate)
  assert.deepEqual(et0Of(same).map((e) => [e.value, e.kind]), et0Of(climate).map((e) => [e.value, e.kind]))
})

test('ΔT > 0 làm ET0 tăng ở mọi tháng; nhiệt độ và ET0 mang nhãn mô phỏng; ea giữ nguyên số liệu gốc', () => {
  const { climate: hot } = wiApply(climate, { ...WI_DEFAULT, deltaT: 2 }, { record })
  const base = et0Of(climate)
  const warm = et0Of(hot)
  warm.forEach((e, i) => {
    assert.ok(e.value > base[i].value, `tháng ${i + 1}: ET0 phải tăng`)
    assert.equal(e.kind, 'simulated')
  })
  assert.equal(hot.months[0].tmax.kind, 'simulated')
  assert.ok(Math.abs(hot.months[0].tmax.value - climate.months[0].tmax.value - 2) < 1e-9)
  assert.equal(hot.months[0].ea.kind, 'derived', 'ea tính từ số liệu gốc, không phải mô phỏng')
})

test('mưa −20% chỉ tác động lên các tháng mùa khô khi chọn phạm vi mùa khô', () => {
  const dry = wiDryMonths(climate)
  assert.ok(dry.length > 0)
  const { climate: less } = wiApply(climate, { ...WI_DEFAULT, rainPct: -20 }, { record })
  less.months.forEach((m, i) => {
    const before = climate.months[i].rain.value
    if (dry.includes(m.month)) {
      assert.ok(Math.abs(m.rain.value - before * 0.8) < 1e-9)
      assert.equal(m.rain.kind, 'simulated')
    } else assert.equal(m.rain, climate.months[i].rain)
  })
  const { climate: all } = wiApply(climate, { ...WI_DEFAULT, rainPct: -20, rainScope: 'year' }, { record })
  assert.ok(all.months.every((m) => m.rain.kind === 'simulated'))
})

test('năm khô nhất là năm có tổng mưa mùa khô nhỏ nhất (tính lại độc lập)', () => {
  const dry = climate.months.filter((m) => m.rain.value < ROTATION_PARAMS.dryMonthMm).map((m) => m.month)
  const totals = Object.entries(record.monthly.PRECTOTCORR)
    .filter(([, ms]) => dry.every((m) => typeof ms[m - 1] === 'number'))
    .map(([y, ms]) => [Number(y), dry.reduce((s, m) => s + ms[m - 1], 0)])
  const expected = totals.reduce((a, b) => (b[1] < a[1] ? b : a))
  const got = wiDriestYear(record, climate)
  assert.equal(got.year, expected[0])
  assert.ok(Math.abs(got.dryRainMm - expected[1]) < 1e-9)
  // Phát lại năm đó: số liệu thật của năm, không phải mô phỏng.
  const { climate: replay } = wiApply(climate, { ...WI_DEFAULT, replay: true }, { record })
  assert.equal(replay.replayYear, expected[0])
  assert.equal(replay.months[0].rain.kind, 'model')
  assert.equal(replay.months[0].rain.value, record.monthly.PRECTOTCORR[expected[0]][0])
})

test('Luân canh: ΔT = 0 cho đúng kết quả mặc định; ΔT = +2 °C làm nước cần tưới tăng', () => {
  const PRE = loadPrecomputed()
  const inputs = districtInputs(PRE, 'cantho')
  const base = rankRotations({ ...inputs, whatIf: DEFAULT_WHAT_IF })
  const zero = rankRotations({ ...inputs, whatIf: { ...DEFAULT_WHAT_IF, et0: wiEt0Pair({ climate, lat, elevation, deltaT: 0 }) } })
  assert.deepEqual(zero, base)
  const warm = rankRotations({ ...inputs, whatIf: { ...DEFAULT_WHAT_IF, et0: wiEt0Pair({ climate, lat, elevation, deltaT: 2 }) } })
  for (const r of warm.rotations) {
    const b = base.rotations.find((x) => x.id === r.id)
    assert.ok(r.measures.extraMm >= b.measures.extraMm, `${r.id}: nước cần tưới không được giảm khi nóng hơn`)
  }
  assert.ok(warm.rotations.some((r) => r.measures.extraMm > base.rotations.find((x) => x.id === r.id).measures.extraMm))
})
