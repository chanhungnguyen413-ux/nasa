// Gộp đúng band Salinity của raster nghiên cứu ĐBSCL mùa khô 2023 vào lưới hiển thị 5 km.
// Đây là mô hình lịch sử từ Landsat, KHÔNG phải ECe đo trong vườn hoặc độ mặn nước hiện tại.
// Tái tạo, không sửa dependencies ứng dụng:
// npm install --prefix .preview/geo-tools --no-save --package-lock=false --cache .preview/npm-cache proj4 geotiff
// node scripts/build-mekong-salinity.mjs [--refresh]
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const salRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const salRequire = createRequire(join(salRoot, '.preview/geo-tools/package.json'))
let salProj4, salFromFile
try {
  salProj4 = salRequire('proj4')
  ;({ fromFile: salFromFile } = await import(pathToFileURL(salRequire.resolve('geotiff'))))
} catch {
  throw new Error('Thiếu proj4/geotiff. Chạy lệnh cài thư viện tạm ghi ở đầu file này.')
}
const salUrl = 'https://zenodo.org/api/records/15653696/files/2023_MD_dry_NDWIchen_Salinity.tif/content'
const salCache = join(salRoot, '.preview/2023_MD_dry_NDWIchen_Salinity.tif')
const salOutputPath = join(salRoot, 'site/data/precomputed/mekong_salinity_5km.json')
const salExpectedMd5 = 'e0ed20e6f57c23c95cc2de6124026090'
const salExpectedBytes = 401164274
mkdirSync(dirname(salCache), { recursive: true })
if (!existsSync(salCache) || process.argv.includes('--refresh')) {
  const response = await fetch(salUrl, { headers: { 'User-Agent': 'MekongFilterAudit/1.0 (public environmental dataset processing)' }, signal: AbortSignal.timeout(600000) })
  if (!response.ok) throw new Error(`Tải Zenodo thất bại: HTTP ${response.status}`)
  if (!response.headers.get('content-type')?.includes('tiff')) throw new Error('Zenodo không trả về GeoTIFF')
  await pipeline(Readable.fromWeb(response.body), createWriteStream(salCache + '.part'))
  if (statSync(salCache + '.part').size !== salExpectedBytes) throw new Error('GeoTIFF tải chưa đầy đủ')
  renameSync(salCache + '.part', salCache)
  console.log('Đã tải GeoTIFF gốc mùa khô 2023')
}
const salMd5 = createHash('md5'), salSha256 = createHash('sha256')
for await (const chunk of createReadStream(salCache)) { salMd5.update(chunk); salSha256.update(chunk) }
if (salMd5.digest('hex') !== salExpectedMd5) throw new Error('MD5 GeoTIFF không khớp bản công bố trên Zenodo')
const salRasterHash = salSha256.digest('hex')
const salTiff = await salFromFile(salCache)
try {
  const image = await salTiff.getImage(0)
  const width = image.getWidth(), height = image.getHeight()
  const origin = image.getOrigin(), resolution = image.getResolution()
  const geoKeys = image.getGeoKeys()
  if (geoKeys.ProjectedCSTypeGeoKey !== 32648 || image.getSamplesPerPixel() !== 2) throw new Error('GeoTIFF khác CRS hoặc số band đã xác minh')
  const toLonLat = salProj4('EPSG:32648', 'EPSG:4326')
  const dLat = 5 / 111.32, dLon = 5 / (111.32 * Math.cos(10 * Math.PI / 180))
  const buckets = new Map()
  let validPixels = 0, missingPixels = 0, negativePixels = 0, minNative = Infinity, maxNative = -Infinity
  // Đọc các dải khớp tile để không giữ toàn bộ raster 2 band trong RAM.
  for (let rowStart = 0; rowStart < height; rowStart += 256) {
    const rowEnd = Math.min(height, rowStart + 256)
    // README nguồn xuất NDWIchen.addBands(Salinity): Salinity là band thứ hai, index 1.
    const rasters = await image.readRasters({ window: [0, rowStart, width, rowEnd], samples: [1] })
    const values = rasters[0]
    for (let row = rowStart; row < rowEnd; row++) {
      const northing = origin[1] + (row + 0.5) * resolution[1]
      for (let col = 0; col < width; col++) {
        const value = values[(row - rowStart) * width + col]
        if (!Number.isFinite(value)) { missingPixels++; continue }
        if (value < 0) { negativePixels++; continue }
        const easting = origin[0] + (col + 0.5) * resolution[0]
        const [lon, lat] = toLonLat.forward([easting, northing])
        const i = Math.floor(lat / dLat), j = Math.floor(lon / dLon), key = `${i}:${j}`
        let bucket = buckets.get(key)
        if (!bucket) { bucket = { i, j, sum: 0, sampleCount: 0 }; buckets.set(key, bucket) }
        bucket.sum += value
        bucket.sampleCount++
        validPixels++
        if (value < minNative) minNative = value
        if (value > maxNative) maxNative = value
      }
    }
    if (rowStart % 2048 === 0) console.log(`Đã xử lý ${rowEnd}/${height} dòng raster`)
  }
  const records = [...buckets.values()].sort((a, b) => a.i - b.i || a.j - b.j).map(({ i, j, sum, sampleCount }) => ({ i, j, value: Number((sum / sampleCount).toFixed(4)), sampleCount }))
  if (!records.length) throw new Error('Không có pixel độ mặn hợp lệ')
  const output = {
    schemaVersion: 1,
    source: {
      id: 'zenodo-wang-2025-soil-salinity-2023',
      title: "The dataset of soil salinity and NDWI index for Vietnam's Mekong Delta (2000–2023)",
      provider: 'Wang et al. (2025) · Zenodo',
      authors: 'Wang, Yang, Zhu, Peng, Chen, Su & Sun',
      doi: '10.5281/zenodo.15653696',
      url: 'https://zenodo.org/records/15653696',
      downloadUrl: salUrl,
      paperUrl: 'https://doi.org/10.1038/s43247-025-02490-z',
      readmeUrl: 'https://zenodo.org/records/15653696/files/READMEzenodo15653696.md?download=1',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      published: '2025-06-13',
      kind: 'model',
      unit: 'dS/m',
      nativeResolutionM: 30,
      nativeCrs: 'EPSG:32648 (WGS 84 / UTM zone 48N)',
      retrievedAt: statSync(salCache).mtime.toISOString(),
      sourceBytes: salExpectedBytes,
      sourceMd5: salExpectedMd5,
      sourceSha256: salRasterHash,
      band: { index: 1, name: 'Salinity', type: 'float' },
      modelFormula: '28.013 * exp(-13.39 * NIR surface reflectance)',
      validationRmseDsM: 1.5,
      calibration: '41 soil samples from Tra Vinh, February 2017; transferred across the Vietnamese Mekong Delta and historical Landsat composites by the published study.',
      nativeRaster: { width, height, origin, resolution, noData: 'NaN', geoKeys },
    },
    period: { start: '2022-11-01', end: '2023-04-30', endExclusive: true, label: 'Dry season 2023 (November 2022–April 2023)' },
    grid: { displayCellKm: 5, originLat: 0, originLon: 0, dLat, dLon, referenceLatitude: 10 },
    method: 'Arithmetic mean of all finite, nonnegative Salinity-band native pixel centers within each existing 5 km display cell; no interpolation of absent pixels or cells. Coordinates transformed using proj4.',
    limitations: [
      'A historical empirical Landsat/NIR model for the dry season 2023; not live soil salinity, a field laboratory result, or surface-water salinity.',
      'The source model was calibrated with limited Tra Vinh 2017 observations and transferred across the delta; reported full-data validation RMSE is about 1.5 dS/m.',
      'The reported modeled conductivity must not be silently treated as a farmer-measured ECe value or converted to water salinity in PSU or g/L.',
      'The source excludes offshore islands. NaN cloud-masked/out-of-study pixels are omitted; missing cells are not filled.',
      'The published raster is aggregated without an additional land-use mask; mixed land/water pixels can affect coastal or river-adjacent cell means.',
      'Five-kilometre cell means hide within-cell variability and cannot establish the condition of an individual garden or crop suitability.',
    ],
    validNativePixels: validPixels,
    missingNativePixels: missingPixels,
    negativePixelsExcluded: negativePixels,
    nativeRange: { min: minNative, max: maxNative },
    recordCount: records.length,
    records,
  }
  writeFileSync(salOutputPath, JSON.stringify(output) + '\n')
  console.log(JSON.stringify({ output: salOutputPath, records: records.length, validNativePixels: validPixels, missingNativePixels: missingPixels, negativePixelsExcluded: negativePixels, nativeRange: output.nativeRange, minCell: Math.min(...records.map((r) => r.value)), maxCell: Math.max(...records.map((r) => r.value)) }))
} finally {
  await salTiff.close()
}
