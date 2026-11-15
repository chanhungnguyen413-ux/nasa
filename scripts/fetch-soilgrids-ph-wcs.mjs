// pH đất (H2O) dạng SỐ, 0–30 cm, ISRIC SoilGrids 2.0 qua WCS → lưới hiển thị 5 km của ĐBSCL.
// Vì sao cần file này: lớp soilPh cũ (fetch-isric-soilgrids.mjs) chỉ có MÀU ảnh WMS, không giải mã được thành số.
// Ở đây đọc thẳng GeoTIFF số nguyên (pH × 10) nên có thể "tự điền tham khảo" pH cho thửa chưa đo.
// Tái tạo (cần thư viện tạm, không đụng dependencies ứng dụng):
//   npm install --prefix .preview/geo-tools --no-save --package-lock=false --cache .preview/npm-cache proj4 geotiff
//   node scripts/fetch-soilgrids-ph-wcs.mjs [--refresh]
// Giới hạn trung thực: SoilGrids là MÔ HÌNH học máy toàn cầu (không phải mẫu đất tại ruộng); ô 5 km che biến động trong ô.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const sgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const sgRequire = createRequire(join(sgRoot, '.preview/geo-tools/package.json'))
let sgFromArrayBuffer
try {
  ;({ fromArrayBuffer: sgFromArrayBuffer } = await import(pathToFileURL(sgRequire.resolve('geotiff'))))
} catch {
  throw new Error('Thiếu geotiff. Chạy lệnh cài thư viện tạm ghi ở đầu file này.')
}
const SG_BBOX = { west: 103.35, south: 8.3, east: 106.95, north: 11.15 }
// Ba lớp độ sâu chuẩn của SoilGrids; trọng số = bề dày lớp (5, 10, 15 cm) để ra trung bình 0–30 cm.
const SG_DEPTHS = [
  { id: '0-5cm', top: 0, bottom: 5 },
  { id: '5-15cm', top: 5, bottom: 15 },
  { id: '15-30cm', top: 15, bottom: 30 },
]
const sgCacheDir = join(sgRoot, '.preview/soilgrids-wcs')
const sgOut = join(sgRoot, 'site/data/precomputed/mekong_soilgrids_ph_5km.json')
mkdirSync(sgCacheDir, { recursive: true })

const sgUrl = (depth) => {
  const u = new URL('https://maps.isric.org/mapserv')
  u.search = new URLSearchParams({ map: '/map/phh2o.map', SERVICE: 'WCS', VERSION: '2.0.1', REQUEST: 'GetCoverage', COVERAGEID: `phh2o_${depth}_mean`, FORMAT: 'image/tiff', SUBSETTINGCRS: 'http://www.opengis.net/def/crs/EPSG/0/4326', OUTPUTCRS: 'http://www.opengis.net/def/crs/EPSG/0/4326' }).toString()
  return `${u}&SUBSET=long(${SG_BBOX.west},${SG_BBOX.east})&SUBSET=lat(${SG_BBOX.south},${SG_BBOX.north})`
}

const dLat = 5 / 111.32, dLon = 5 / (111.32 * Math.cos(10 * Math.PI / 180))
const perDepth = []
for (const depth of SG_DEPTHS) {
  const cache = join(sgCacheDir, `phh2o_${depth.id}.tif`)
  if (!existsSync(cache) || process.argv.includes('--refresh')) {
    const res = await fetch(sgUrl(depth.id), { signal: AbortSignal.timeout(300000) })
    if (!res.ok || !res.headers.get('content-type')?.includes('tiff')) throw new Error(`WCS ${depth.id}: HTTP ${res.status} ${res.headers.get('content-type')}`)
    writeFileSync(cache, Buffer.from(await res.arrayBuffer()))
    console.log(`Đã tải ${depth.id}`)
  }
  const buf = readFileSync(cache)
  const sha256 = createHash('sha256').update(buf).digest('hex')
  const tiff = await sgFromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const image = await tiff.getImage()
  const [w, h] = [image.getWidth(), image.getHeight()]
  const [ox, oy] = image.getOrigin()
  const [rx, ry] = image.getResolution()
  const [values] = await image.readRasters()
  const cells = new Map()
  let valid = 0, nodata = 0
  for (let row = 0; row < h; row++) {
    const lat = oy + (row + 0.5) * ry
    for (let col = 0; col < w; col++) {
      const v = values[row * w + col]
      // 0 và giá trị âm = không có dữ liệu (nước, đô thị bị che, ngoài vùng). Không lấp.
      if (!(v > 0)) { nodata++; continue }
      const lon = ox + (col + 0.5) * rx
      const key = `${Math.floor(lat / dLat)}:${Math.floor(lon / dLon)}`
      const c = cells.get(key) ?? { sum: 0, n: 0 }
      c.sum += v
      c.n++
      cells.set(key, c)
      valid++
    }
  }
  perDepth.push({ depth, cells, meta: { coverageId: `phh2o_${depth.id}_mean`, url: sgUrl(depth.id), width: w, height: h, resolutionDeg: [rx, ry], validPixels: valid, nodataPixels: nodata, sha256 } })
  console.log(`${depth.id}: ${w}×${h} px · hợp lệ ${valid} · ô 5 km ${cells.size}`)
}

// Chỉ giữ ô có đủ cả 3 lớp độ sâu (không suy diễn lớp thiếu).
const records = []
for (const [key, c0] of perDepth[0].cells) {
  const all = perDepth.map((d) => d.cells.get(key))
  if (all.some((c) => !c)) continue
  const total = SG_DEPTHS.reduce((s, d) => s + (d.bottom - d.top), 0)
  const ph10 = all.reduce((s, c, k) => s + (c.sum / c.n) * (SG_DEPTHS[k].bottom - SG_DEPTHS[k].top), 0) / total
  const [i, j] = key.split(':').map(Number)
  records.push([i, j, Math.round(ph10) / 10, Math.min(...all.map((c) => c.n))])
}
records.sort((a, b) => a[0] - b[0] || a[1] - b[1])
const out = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    id: 'isric-soilgrids-2-phh2o-wcs',
    title: 'SoilGrids 2.0 — Soil pH in H2O, mean prediction',
    provider: 'ISRIC – World Soil Information',
    url: 'https://soilgrids.org/',
    wcs: 'https://maps.isric.org/mapserv?map=/map/phh2o.map',
    paperUrl: 'https://doi.org/10.5194/soil-7-217-2021',
    license: 'CC-BY-4.0',
    kind: 'model',
    nativeUnit: 'pH × 10',
    unit: 'pH',
    nativeResolutionM: 250,
  },
  depth: '0-30 cm (thickness-weighted mean of 0-5, 5-15, 15-30 cm)',
  grid: { displayCellKm: 5, dLat, dLon },
  method: 'Mean of valid (>0) native pixels per 5 km cell for each depth, then weighted by layer thickness 5/10/15 cm; cells lacking any depth are omitted. No interpolation.',
  limitations: [
    'SoilGrids is a global machine-learning model, not a field soil sample.',
    'Acid sulfate soils of the Mekong Delta can be far more acidic in the field than a 250 m model mean; measure pH on the field before relying on it.',
    'A 5 km cell mean hides within-cell variability.',
  ],
  depths: perDepth.map((d) => ({ id: d.depth.id, ...d.meta })),
  recordFields: ['i', 'j', 'ph', 'minSamples'],
  recordCount: records.length,
  records,
}
writeFileSync(sgOut, JSON.stringify(out) + '\n')
console.log(`Đã ghi ${sgOut} · ${records.length} ô · pH ${Math.min(...records.map((r) => r[2]))}–${Math.max(...records.map((r) => r[2]))}`)
