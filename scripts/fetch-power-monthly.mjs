// Tính sẵn khí hậu tháng NASA POWER + độ cao cho 5 huyện, ghi site/data/precomputed/power_monthly.json.
//   node scripts/fetch-power-monthly.mjs
// Vì sao: build nhúng file này vào index.html, nên demo 5 huyện vẫn chạy khi mất mạng.
// Dùng CHÍNH module site/sources/power.js mà trang web dùng, để hai nơi không bao giờ tính khác nhau.
import { writeFileSync } from 'node:fs'
import { PROVINCES } from '../site/data/demo.js'
import { powerFetchElevation, powerFetchRecord, powerLastFullYear } from '../site/sources/power.js'

const OUT = new URL('../site/data/precomputed/power_monthly.json', import.meta.url)

// Máy chủ miễn phí đôi khi trả lỗi tạm thời (vd. HTTP 503): thử lại tối đa 3 lần, chờ lâu dần.
async function withRetry(what, fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === 3) throw err
      console.log(`   ${what}: ${err.message}; thử lại sau ${attempt * 5} s`)
      await new Promise((r) => setTimeout(r, attempt * 5000))
    }
  }
}
const endYear = powerLastFullYear()
const districts = []
for (const p of PROVINCES) {
  const started = performance.now()
  const record = await withRetry('NASA POWER', () => powerFetchRecord(p.lat, p.lon, { endYear }))
  const elevation = await withRetry('Open-Meteo elevation', () => powerFetchElevation(p.lat, p.lon))
  districts.push({ id: p.id, name: p.name, elevation, record })
  const nulls = Object.values(record.monthly).flatMap((byYear) => Object.values(byYear).flat()).filter((v) => v === null).length
  console.log(`${p.name.padEnd(26)} ${record.years.join('–')} · độ cao ${elevation.value} m · tháng thiếu: ${nulls} · ${((performance.now() - started) / 1000).toFixed(1)} s`)
}
const out = {
  _ghiChu: 'Sinh bởi scripts/fetch-power-monthly.mjs từ NASA POWER daily (gộp thành tháng) và Open-Meteo elevation (Copernicus DEM GLO-90). Không sửa tay.',
  generatedAt: new Date().toISOString(),
  districts,
}
writeFileSync(OUT, `${JSON.stringify(out)}\n`)
console.log(`Đã ghi site/data/precomputed/power_monthly.json (${Math.round(JSON.stringify(out).length / 1024)} KB)`)
