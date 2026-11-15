// Kiểm tra mọi câu chữ của phần luân canh tạo được ở cả VI và EN, cho mọi huyện (không lỗi, không "undefined").
//   node scripts/test-rotation-text.mjs
import { readFileSync } from 'node:fs'
import { rankRotations } from '../site/logic/rotation.js'
import { districtInputs } from '../site/logic/rotationInputs.js'
import { rotationParts } from '../site/i18n/rotationText.js'

const load = (name) => JSON.parse(readFileSync(new URL(`../site/data/precomputed/${name}`, import.meta.url), 'utf8'))
const PRE = { climate: load('climate_monthly.json'), kmeans: load('calendar_kmeans.json'), comparison: load('method_comparison.json') }

let problems = 0
for (const d of PRE.climate.districts) {
  const result = rankRotations(districtInputs(PRE, d.id))
  if (!result.rankable) continue
  const baseline = result.rotations.find((r) => r.baseline)
  for (const lang of ['vi', 'en']) {
    for (const rot of result.rotations) {
      const parts = rotationParts(rot, baseline, lang)
      for (const [part, lines] of Object.entries(parts)) {
        if (part === 'sources') continue
        for (const l of lines) {
          if (/undefined|NaN|\[object/.test(l.text)) {
            problems++
            console.log(`${d.id} ${lang} ${rot.id} ${part}: ${l.text}`)
          }
        }
      }
    }
  }
}
console.log(problems ? `${problems} câu có vấn đề` : 'Mọi câu VI/EN đều tạo được, không có undefined/NaN.')
process.exit(problems ? 1 : 0)
