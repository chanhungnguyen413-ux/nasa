// Chạy thử bộ chấm điểm luân canh với dữ liệu thật của 5 huyện, in kết quả ra màn hình.
//   node scripts/test-rotation.mjs            (trọng số bằng nhau)
//   node scripts/test-rotation.mjs -20        (giả định mưa mùa khô giảm 20%)
import { readFileSync } from 'node:fs'
import { rankRotations } from '../site/logic/rotation.js'
import { districtInputs } from '../site/logic/rotationInputs.js'

const load = (name) => JSON.parse(readFileSync(new URL(`../site/data/precomputed/${name}`, import.meta.url), 'utf8'))
const PRE = {
  climate: load('climate_monthly.json'),
  kmeans: load('calendar_kmeans.json'),
  comparison: load('method_comparison.json'),
}
const dryRainPct = Number(process.argv[2] ?? 0)
const monthsText = (ms) => ms.map((m) => `T${m}`).join(',')

for (const d of PRE.climate.districts) {
  const inputs = districtInputs(PRE, d.id)
  const result = rankRotations({ ...inputs, whatIf: { dryRainPct } })
  console.log(`\n=== ${d.name} ===`)
  if (!result.rankable) {
    console.log(`  Không xếp hạng: ${result.reason.code} (${result.reason.peaks} đỉnh)`)
    continue
  }
  console.log(`  Lịch vụ (tin cậy ${result.calendarConfidence}): ` +
    result.windows.map((w) => `${w.season.toUpperCase()} ${monthsText(w.months)}`).join(' | '))
  console.log('  Kiểu  Tổng  Nước Đất  Thu  Rủi  | tưới thêm  năm khô: thêm nữa | tin cậy  | rủi ro cần xem')
  for (const r of result.rotations) {
    const s = r.scores
    console.log(`  ${r.id}     ${String(r.total).padStart(3)}   ${String(s.water).padStart(3)}  ${String(s.soil).padStart(3)}  ${String(s.income).padStart(3)}  ${String(s.risk).padStart(3)}  | ` +
      `${String(r.measures.extraMm).padStart(5)} mm   ${String(r.measures.dryPenaltyMm).padStart(5)} mm     | ${r.confidence.level.padEnd(7)} | ` +
      (r.reviewRisks.map((x) => `${x.code}(${x.season})`).join(', ') || '-'))
  }
}
