// In dải mùa vụ 12 tháng của 5 huyện để kiểm tra bằng mắt.
//   node scripts/test-season-strip.mjs
import { readFileSync } from 'node:fs'
import { seasonWindows } from '../site/logic/rotation.js'
import { districtInputs } from '../site/logic/rotationInputs.js'
import { seasonStrip } from '../site/logic/seasonStrip.js'

const load = (name) => JSON.parse(readFileSync(new URL(`../site/data/precomputed/${name}`, import.meta.url), 'utf8'))
const PRE = { climate: load('climate_monthly.json'), kmeans: load('calendar_kmeans.json'), comparison: load('method_comparison.json'), rule: load('calendar_rule.json') }
const cell = (v) => String(v).padStart(5)

for (const d of PRE.climate.districts) {
  const inputs = districtInputs(PRE, d.id)
  const strip = seasonStrip({ climate: inputs.climate, monthly: PRE.rule.districts.find((x) => x.id === d.id).monthly, windows: seasonWindows(inputs.peakDays) })
  console.log(`\n=== ${d.name} ===`)
  console.log('tháng   ' + strip.map((s) => cell(`T${s.month}`)).join(''))
  console.log('vụ      ' + strip.map((s) => cell((s.season ?? '-') + (s.isPeak ? '*' : ''))).join(''))
  console.log('NDVI    ' + strip.map((s) => cell(s.ndvi.toFixed(2))).join(''))
  console.log('trống   ' + strip.map((s) => cell(s.isBare ? 'X' : '.')).join(''))
  console.log('mưa mm  ' + strip.map((s) => cell(Math.round(s.rainMm))).join(''))
  console.log('ngày≥35 ' + strip.map((s) => cell(s.hotDays.toFixed(1))).join(''))
  console.log('ẩm rễ   ' + strip.map((s) => cell(s.rootWetness.toFixed(2))).join(''))
  console.log('dễ TT   ' + strip.map((s) => cell(s.isVulnerable ? '!' : '.')).join(''))
}
