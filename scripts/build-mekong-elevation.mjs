// Tạo lưới cao độ ĐBSCL 5 km từ dữ liệu Topo DEM thật, không dùng màu/số ngẫu nhiên.
// Tái tạo (không thay package.json hoặc package-lock.json của ứng dụng):
// npm install --prefix .preview/geo-tools --no-save --package-lock=false --cache .preview/npm-cache proj4
// node scripts/build-mekong-elevation.mjs [--refresh]
// File nguồn: PANGAEA.902136, CC-BY-4.0; DEM nội suy bản đồ 2014, không phải cao độ hiện thời.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const demRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const demRequire = createRequire(join(demRoot, '.preview/geo-tools/package.json'))
let demProj4
try {
  demProj4 = demRequire('proj4')
} catch {
  throw new Error('Thiếu proj4. Chạy lệnh cài thư viện tạm ghi ở đầu scripts/build-mekong-elevation.mjs.')
}
const demSourceUrl = 'https://store.pangaea.de/Publications/Minderhoud-etal_2019/Topo_DEM_Mekong_delta_excl_rivers_and_bedrock.zip'
const demCachePath = join(demRoot, '.preview/mekong-elevation-source.zip')
const demOutputPath = join(demRoot, 'site/data/precomputed/mekong_elevation_5km.json')
const demDigest = (buffer) => createHash('sha256').update(buffer).digest('hex')
mkdirSync(dirname(demCachePath), { recursive: true })
if (!existsSync(demCachePath) || process.argv.includes('--refresh')) {
  const response = await fetch(demSourceUrl, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Tải PANGAEA thất bại: HTTP ${response.status}`)
  writeFileSync(demCachePath, Buffer.from(await response.arrayBuffer()))
}
const demArchive = readFileSync(demCachePath)

// Chỉ giải nén trong bộ nhớ đúng tệp ASCII được công bố; không giải nén đường dẫn vào ổ đĩa.
function demReadAsciiZip(buffer) {
  let endOffset = -1
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { endOffset = offset; break }
  }
  if (endOffset < 0) throw new Error('Không có thư mục ZIP hợp lệ')
  let offset = buffer.readUInt32LE(endOffset + 16)
  const entries = buffer.readUInt16LE(endOffset + 10)
  for (let index = 0; index < entries; index++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Thư mục ZIP hỏng')
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    if (name === 'Topo_DEM_Mekong_delta_excl_rivers_and_bedrock.asc') {
      const method = buffer.readUInt16LE(offset + 10)
      const compressedSize = buffer.readUInt32LE(offset + 20)
      const expectedSize = buffer.readUInt32LE(offset + 24)
      const localOffset = buffer.readUInt32LE(offset + 42)
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Header ZIP hỏng')
      const dataOffset = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28)
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize)
      const ascii = method === 8 ? inflateRawSync(compressed) : method === 0 ? compressed : null
      if (!ascii || ascii.length !== expectedSize) throw new Error('Không giải nén được ASCII DEM')
      return ascii
    }
    offset += 46 + nameLength + extraLength + commentLength
  }
  throw new Error('Không tìm thấy ASCII DEM gốc trong ZIP')
}

const demAscii = demReadAsciiZip(demArchive)
const demLines = demAscii.toString('utf8').trim().split(/\r?\n/)
const demHeader = Object.fromEntries(demLines.slice(0, 6).map((line) => {
  const [key, value] = line.trim().split(/\s+/)
  return [key.toLowerCase(), Number(value)]
}))
for (const key of ['ncols', 'nrows', 'xllcorner', 'yllcorner', 'cellsize', 'nodata_value']) {
  if (!Number.isFinite(demHeader[key])) throw new Error(`Header DEM thiếu ${key}`)
}
const demValues = demLines.slice(6).join(' ').trim().split(/\s+/).map(Number)
if (demValues.length !== demHeader.ncols * demHeader.nrows) throw new Error('Số pixel không khớp header DEM')
const demToLonLat = demProj4('+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs', 'EPSG:4326')
// Khớp đúng lưới hiện có trong myField.js: gốc tại 0°, kinh độ tham chiếu ở 10° Bắc.
const demDLat = 5 / 111.32
const demDLon = 5 / (111.32 * Math.cos(10 * Math.PI / 180))
const demBuckets = new Map()
let demValidPixels = 0
for (let row = 0; row < demHeader.nrows; row++) {
  const northing = demHeader.yllcorner + (demHeader.nrows - row - 0.5) * demHeader.cellsize
  for (let col = 0; col < demHeader.ncols; col++) {
    const value = demValues[row * demHeader.ncols + col]
    if (!Number.isFinite(value) || value === demHeader.nodata_value) continue
    const easting = demHeader.xllcorner + (col + 0.5) * demHeader.cellsize
    const [lon, lat] = demToLonLat.forward([easting, northing])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Chuyển tọa độ thất bại')
    const i = Math.floor(lat / demDLat)
    const j = Math.floor(lon / demDLon)
    const key = `${i}:${j}`
    let bucket = demBuckets.get(key)
    if (!bucket) { bucket = { i, j, sum: 0, sampleCount: 0 }; demBuckets.set(key, bucket) }
    bucket.sum += value
    bucket.sampleCount++
    demValidPixels++
  }
}
const demRecords = [...demBuckets.values()].sort((a, b) => a.i - b.i || a.j - b.j).map(({ i, j, sum, sampleCount }) => ({
  i, j, elevation: Number((sum / sampleCount).toFixed(3)), sampleCount,
}))
if (!demRecords.length) throw new Error('DEM không có pixel hợp lệ')
const demOutput = {
  schemaVersion: 1,
  source: {
    id: 'pangaea-minderhoud-2019-topo-dem',
    title: 'Digital elevation model of the Vietnamese Mekong delta based on elevation points from a national topographical map',
    authors: 'Minderhoud, Coumou, Erkens, Middelkoop & Stouthamer (2019)',
    doi: '10.1594/PANGAEA.902136',
    url: 'https://doi.pangaea.de/10.1594/PANGAEA.902136',
    downloadUrl: demSourceUrl,
    paperUrl: 'https://doi.org/10.1038/s41467-019-11602-1',
    license: 'CC-BY-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    published: '2019-05-28',
    sourceMapYear: 2014,
    nativeResolutionM: 500,
    nativeCrs: 'EPSG:32648 (WGS 84 / UTM zone 48N)',
    verticalDatum: 'Hon Dau tidal datum, Vietnam',
    retrievedAt: statSync(demCachePath).mtime.toISOString(),
    archiveSha256: demDigest(demArchive),
    asciiSha256: demDigest(demAscii),
    metadataQuote: 'Grid cell size: 500 x 500 m',
    actualAsciiHeader: demHeader,
  },
  grid: { displayCellKm: 5, originLat: 0, originLon: 0, dLat: demDLat, dLon: demDLon, referenceLatitude: 10 },
  method: 'Mean of valid native DEM pixel centers falling inside each existing 5 km display cell; UTM 48N to WGS84 conversion using proj4. Missing pixels are excluded; cells with no valid pixels are omitted.',
  limitations: [
    'An interpolated historical topographic model, not a recent ground survey or live flood measurement.',
    'Rivers and bedrock outcrops are excluded in the published source; no replacement elevations are invented.',
    'Heights refer to the Hon Dau datum; they are not automatically heights above the local sea surface.',
    'Cell means do not represent every point inside a field; subsidence since the source map is not corrected.',
    'Elevation alone does not establish flood depth, flood probability, dike protection, or drainage capacity.',
  ],
  validNativePixels: demValidPixels,
  recordCount: demRecords.length,
  records: demRecords,
}
writeFileSync(demOutputPath, JSON.stringify(demOutput) + '\n')
console.log(JSON.stringify({ output: demOutputPath, records: demRecords.length, validNativePixels: demValidPixels, minElevationM: Math.min(...demRecords.map((r) => r.elevation)), maxElevationM: Math.max(...demRecords.map((r) => r.elevation)), archiveSha256: demOutput.source.archiveSha256 }))
