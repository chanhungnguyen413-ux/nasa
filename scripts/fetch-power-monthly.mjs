// Tính sẵn khí hậu tháng NASA POWER + độ cao, ghi site/data/precomputed/power_monthly.json.
//   node scripts/fetch-power-monthly.mjs              (5 huyện mẫu + 13 tỉnh/thành ĐBSCL)
//   node scripts/fetch-power-monthly.mjs --provinces  (chỉ chạy lại 13 tỉnh, giữ nguyên 5 huyện đã có)
// Vì sao: build nhúng file này vào index.html, nên trang KHÔNG cần gọi NASA POWER lúc chạy (snapshot tĩnh).
// Dùng CHÍNH module site/sources/power.js mà trang web dùng, để hai nơi không bao giờ tính khác nhau.
// Điểm đại diện của mỗi tỉnh = `center` trong site/data/mekongBoundaries.js (tâm hình học của ranh giới tỉnh),
// KHÔNG phải trạm đo: số liệu là ô lưới MERRA-2/POWER ~0,5° chứa điểm đó.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { PROVINCES } from '../site/data/provinces.js'
import { MEKONG_PROVINCES_GEO } from '../site/data/mekongBoundaries.js'
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

async function fetchPoint(label, lat, lon, endYear) {
  const started = performance.now()
  const record = await withRetry('NASA POWER', () => powerFetchRecord(lat, lon, { endYear }))
  const elevation = await withRetry('Open-Meteo elevation', () => powerFetchElevation(lat, lon))
  const nulls = Object.values(record.monthly).flatMap((byYear) => Object.values(byYear).flat()).filter((v) => v === null).length
  console.log(`${label.padEnd(26)} ${record.years.join('–')} · độ cao ${elevation.value} m · tháng thiếu: ${nulls} · ${((performance.now() - started) / 1000).toFixed(1)} s`)
  return { record, elevation }
}

const endYear = powerLastFullYear()
const onlyProvinces = process.argv.includes('--provinces')
const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null

let districts = old?.districts ?? []
if (!onlyProvinces || !districts.length) {
  districts = []
  for (const p of PROVINCES) {
    const { record, elevation } = await fetchPoint(p.name, p.lat, p.lon, endYear)
    districts.push({ id: p.id, name: p.name, elevation, record })
  }
}

const provinces = []
for (const prov of MEKONG_PROVINCES_GEO) {
  const [lat, lon] = prov.center
  const { record, elevation } = await fetchPoint(prov.vi, lat, lon, endYear)
  provinces.push({ code: prov.code, name: prov.vi, nameEn: prov.en, lat, lon, elevation, record })
}

const out = {
  _ghiChu: 'Sinh bởi scripts/fetch-power-monthly.mjs từ NASA POWER daily (gộp thành tháng) và Open-Meteo elevation (Copernicus DEM GLO-90). Không sửa tay.',
  generatedAt: new Date().toISOString(),
  snapshot: { source: 'NASA POWER daily point API (community=AG)', years: [2001, endYear], pointKind: 'model', note: 'Ô lưới MERRA-2/CERES của POWER, không phải trạm đo tại ruộng.' },
  districts,
  provinces,
}
writeFileSync(OUT, `${JSON.stringify(out)}\n`)
console.log(`Đã ghi site/data/precomputed/power_monthly.json (${Math.round(JSON.stringify(out).length / 1024)} KB) · ${districts.length} huyện + ${provinces.length} tỉnh`)
