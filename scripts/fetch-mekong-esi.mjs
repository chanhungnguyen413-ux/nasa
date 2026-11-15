// Tải ảnh ESI 4 tuần THỰC của SERVIR, chọn đúng lát thời gian rồi lấy màu ở tâm ô 5 km.
// ESI này là chỉ số bất thường ET so với bình thường, KHÔNG phải tỷ lệ ECOSTRESS 0–1.
// Chạy: node scripts/fetch-mekong-esi.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, environmentGibsGrid } from './fetch-environment-gibs.mjs'

const esiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const esiRawDirectory = join(esiRoot, '.preview', 'environment-esi')
const esiOutputPath = join(esiRoot, 'site', 'data', 'precomputed', 'mekong_esi_5km.json')
const esiServiceUrl = 'https://gis1.servirglobal.net/arcgis/rest/services/Global/ESI_4WK/MapServer'
const esiDocumentationUrl = 'https://www.drought.gov/data-maps-tools/evaporative-stress-index-esi'

async function esiJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  const value = await response.json()
  if (value.error) throw new Error(JSON.stringify(value.error))
  return value
}

function esiEscape(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch])
}

async function esiMain() {
  const g = environmentGibsGrid()
  await mkdir(esiRawDirectory, { recursive: true })
  const dateArgIdx = process.argv.indexOf('--date')
  const requestedDate = dateArgIdx >= 0 ? process.argv[dateArgIdx + 1] : null
  const where = requestedDate
    ? `dateObtained >= timestamp '${requestedDate} 00:00:00' AND dateObtained <= timestamp '${requestedDate} 23:59:59'`
    : '1=1'
  const latestUrl = new URL(`${esiServiceUrl}/2/query`)
  latestUrl.search = new URLSearchParams({ where, outFields: 'OBJECTID,Name,dateStarted,dateObtained', orderByFields: 'dateObtained DESC', resultRecordCount: '1', returnGeometry: 'false', f: 'json' }).toString()
  const latest = await esiJson(latestUrl)
  const record = latest.features?.[0]?.attributes
  if (!Number.isFinite(record?.dateObtained) || !/^DFPPM_AQUA_4WK_\d{7}$/.test(record?.Name ?? '')) throw new Error('No verified dated ESI raster record')
  const date = new Date(record.dateObtained).toISOString().slice(0, 10)
  await writeFile(join(esiRawDirectory, 'latest-raster-record.json'), JSON.stringify({ url: latestUrl.href, record }, null, 2))
  const exportUrl = new URL(`${esiServiceUrl}/export`)
  exportUrl.search = new URLSearchParams({
    bbox: [g.rasterBounds.west, g.rasterBounds.south, g.rasterBounds.east, g.rasterBounds.north].join(','),
    bboxSR: '4326', imageSR: '4326', size: `${g.width},${g.height}`, dpi: '96',
    format: 'png32', transparent: 'true', layers: 'show:3',
    time: `${record.dateObtained},${record.dateObtained}`,
    layerTimeOptions: JSON.stringify({ 3: { useTime: true, timeDataCumulative: false } }), f: 'json',
  }).toString()
  const exported = await esiJson(exportUrl)
  if (!exported.href || !exported.extent || exported.width !== g.width || exported.height !== g.height) throw new Error('Invalid ESI export metadata')
  const actualBounds = { west: exported.extent.xmin, south: exported.extent.ymin, east: exported.extent.xmax, north: exported.extent.ymax }
  await writeFile(join(esiRawDirectory, 'export-metadata.json'), JSON.stringify({ requestUrl: exportUrl.href, ...exported }, null, 2))
  const response = await fetch(exported.href, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`ESI image HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('image/png')) throw new Error(`ESI image expected PNG, received ${contentType}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const png = decodePng(bytes)
  await writeFile(join(esiRawDirectory, `esi-${date}.png`), bytes)
  const legendUrl = `${esiServiceUrl}/legend?f=pjson`
  const legend = await esiJson(legendUrl)
  await writeFile(join(esiRawDirectory, 'source-legend.json'), JSON.stringify(legend, null, 2))
  const sourceLegend = legend.layers?.find(layer => layer.layerId === 3)?.legend
  if (!sourceLegend?.length) throw new Error('ESI source legend missing')
  // Giữ nguyên nhãn và hình ô màu của dịch vụ; không tự đặt ngưỡng khô hạn.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="${sourceLegend.length * 26 + 36}" viewBox="0 0 240 ${sourceLegend.length * 26 + 36}"><rect width="100%" height="100%" fill="white"/><text x="8" y="18" font-size="13" font-family="sans-serif" fill="#25342a">SERVIR · ESI 4 weeks</text>${sourceLegend.map((item, n) => `<image x="8" y="${30 + n * 26}" width="20" height="20" href="data:${esiEscape(item.contentType)};base64,${item.imageData}"/><text x="38" y="${45 + n * 26}" font-size="12" font-family="sans-serif" fill="#25342a">${esiEscape(item.label)}</text>`).join('')}</svg>`
  const cells = []
  let visibleCells = 0
  const colors = new Set()
  for (let i = g.iMin; i <= g.iMax; i++) {
    const lat = (i + 0.5) * g.dLat
    const y = Math.floor((actualBounds.north - lat) / (actualBounds.north - actualBounds.south) * png.height)
    for (let j = g.jMin; j <= g.jMax; j++) {
      const lon = (j + 0.5) * g.dLon
      const x = Math.floor((lon - actualBounds.west) / (actualBounds.east - actualBounds.west) * png.width)
      const rgba = png.rgba(x, y)
      cells.push([i, j, ...rgba])
      if (rgba[3] > 0) { visibleCells++; colors.add(rgba.join(',')) }
    }
  }
  const fetchedAt = new Date().toISOString()
  const layer = {
    key: 'esi', id: 'SERVIR_Global_ESI_4WK', date,
    title: 'Global Evaporative Stress Index (4-week composite)',
    provider: 'NASA / USDA Agricultural Research Service · SERVIR Global',
    sourceUrl: esiServiceUrl, documentationUrl: esiDocumentationUrl, dataUseUrl: esiDocumentationUrl,
    rawDataUrl: `https://gis1.servirglobal.net/data/esi/4WK/${date.slice(0, 4)}/${record.Name}.tif`,
    credit: 'Christopher Hain (NASA), Martha Anderson (USDA ARS) · SERVIR Global',
    legendUrl, legendDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    legendSha256: createHash('sha256').update(JSON.stringify(sourceLegend)).digest('hex'),
    resolution: { vi: '5 km (0,05°)', en: '5 km (0.05°)' }, kind: 'derived', units: 'ESI anomaly index',
    temporal: { vi: `Chỉ số bất thường ET tích hợp 4 tuần, kết thúc ${date}; không phải tỷ lệ ESI ECOSTRESS 0–1.`, en: `Four-week ET anomaly composite ending ${date}; not the ECOSTRESS 0–1 ESI ratio.` },
    requestUrl: exportUrl.href, rasterRecordUrl: latestUrl.href, rasterName: record.Name, fetchedAt,
    pngSha256: createHash('sha256').update(bytes).digest('hex'),
    raster: { width: png.width, height: png.height, bounds: actualBounds, contentType, bytes: bytes.length, colorType: png.colorType, bitDepth: png.bitDepth },
    status: visibleCells ? 'available' : 'missing', visibleCells, distinctVisibleColors: colors.size, cells,
  }
  if (!visibleCells) layer.missingReason = 'No non-transparent ESI source pixels in the requested dated Mekong image.'
  const output = {
    schemaVersion: 1, generatedAt: fetchedAt,
    grid: { sizeKm: 5, dLat: g.dLat, dLon: g.dLon, referenceLatitude: 10, bounds: g.bounds, iMin: g.iMin, iMax: g.iMax, jMin: g.jMin, jMax: g.jMax,
      method: 'Nearest source-rendered PNG pixel at each display-cell center in the dated SERVIR map export. Original source RGBA and legend preserved; no conversion from RGB to numerical ESI measurements.',
      noData: 'Source transparent pixels remain transparent; no invented fallback colors.' },
    layer,
  }
  await writeFile(esiOutputPath, JSON.stringify(output) + '\n')
  console.log(`ESI ${date}: ${cells.length} cells, ${visibleCells} visible, ${colors.size} source colors; ${bytes.length} PNG bytes`)
  console.log(`Wrote ${esiOutputPath}`)
  if (!visibleCells) process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await esiMain()
