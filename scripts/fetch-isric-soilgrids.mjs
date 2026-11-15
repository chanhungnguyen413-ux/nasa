// Tải 4 lớp đất công khai 250 m từ ISRIC SoilGrids 2.0 WMS cho Đồng bằng sông Cửu Long (lưới ~5 km).
// Không giải mã RGB thành số đo giả định; không nội suy lấp ô thiếu dữ liệu.
// Chạy lại: node scripts/fetch-isric-soilgrids.mjs
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, environmentGibsGrid } from './fetch-environment-gibs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(root, 'site/data/precomputed/mekong_isric_soil_5km.json')
const rawDirectory = join(root, '.preview/environment-isric')

const definitions = [
  {
    key: 'soilPh',
    map: '/map/phh2o.map',
    layer: 'phh2o_0-5cm_mean',
    title: 'Soil pH in H2O (0–5 cm mean, ISRIC SoilGrids 2.0)',
    provider: 'ISRIC SoilGrids 2.0 (maps.isric.org)',
    sourceUrl: 'https://soilgrids.org/',
    units: 'pH × 10',
  },
  {
    key: 'soilSoc',
    map: '/map/soc.map',
    layer: 'soc_0-5cm_mean',
    title: 'Soil Organic Carbon (0–5 cm mean, ISRIC SoilGrids 2.0)',
    provider: 'ISRIC SoilGrids 2.0 (maps.isric.org)',
    sourceUrl: 'https://soilgrids.org/',
    units: 'dg/kg',
  },
  {
    key: 'soilClay',
    map: '/map/clay.map',
    layer: 'clay_0-5cm_mean',
    title: 'Clay Content (0–5 cm mean, ISRIC SoilGrids 2.0)',
    provider: 'ISRIC SoilGrids 2.0 (maps.isric.org)',
    sourceUrl: 'https://soilgrids.org/',
    units: 'g/kg',
  },
  {
    key: 'soilNitrogen',
    map: '/map/nitrogen.map',
    layer: 'nitrogen_0-5cm_mean',
    title: 'Total Nitrogen (0–5 cm mean, ISRIC SoilGrids 2.0)',
    provider: 'ISRIC SoilGrids 2.0 (maps.isric.org)',
    sourceUrl: 'https://soilgrids.org/',
    units: 'cg/kg',
  },
]

function wmsUrl(def, g, req = 'GetMap') {
  const url = new URL('https://maps.isric.org/mapserv')
  if (req === 'GetLegendGraphic') {
    url.search = new URLSearchParams({
      map: def.map,
      version: '1.1.1',
      service: 'WMS',
      request: 'GetLegendGraphic',
      layer: def.layer,
      format: 'image/png',
      STYLE: 'default',
    }).toString()
    return url.href
  }
  url.search = new URLSearchParams({
    map: def.map,
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: def.layer,
    STYLES: '',
    FORMAT: 'image/png',
    TRANSPARENT: 'TRUE',
    SRS: 'EPSG:4326',
    BBOX: [g.rasterBounds.west, g.rasterBounds.south, g.rasterBounds.east, g.rasterBounds.north].join(','),
    WIDTH: String(g.width),
    HEIGHT: String(g.height),
  }).toString()
  return url.href
}

async function downloadLayer(def, g) {
  const url = wmsUrl(def, g, 'GetMap')
  const legendUrl = wmsUrl(def, g, 'GetLegendGraphic')
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'Mekong-Seasons-public-data-audit/1.0' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = response.headers.get('content-type') || ''
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!contentType.includes('image/png')) throw new Error(`Expected PNG, got ${contentType}`)
      const png = decodePng(bytes)
      if (png.width !== g.width || png.height !== g.height) throw new Error('Unexpected PNG size')
      const pngSha256 = createHash('sha256').update(bytes).digest('hex')
      await writeFile(join(rawDirectory, `${def.key}.png`), bytes)

      const cells = []
      let visibleCells = 0
      const colors = new Set()
      for (let i = g.iMin; i <= g.iMax; i++) {
        const lat = (i + 0.5) * g.dLat
        const y = Math.floor((g.rasterBounds.north - lat) / (g.rasterBounds.north - g.rasterBounds.south) * g.height)
        for (let j = g.jMin; j <= g.jMax; j++) {
          const lon = (j + 0.5) * g.dLon
          const x = Math.floor((lon - g.rasterBounds.west) / (g.rasterBounds.east - g.rasterBounds.west) * g.width)
          const rgba = png.rgba(x, y)
          cells.push([i, j, ...rgba])
          if (rgba[3] > 0) {
            visibleCells++
            colors.add(rgba.join(','))
          }
        }
      }
      console.log(`${def.key}: ${cells.length} cells, ${visibleCells} visible, ${colors.size} source colors, PNG ${bytes.length} bytes`)
      return {
        ...def,
        legendUrl,
        requestUrl: url,
        fetchedAt: new Date().toISOString(),
        pngSha256,
        status: visibleCells ? 'available' : 'missing',
        visibleCells,
        distinctVisibleColors: colors.size,
        cells,
      }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

async function main() {
  const g = environmentGibsGrid()
  await mkdir(rawDirectory, { recursive: true })
  const layers = {}
  for (const def of definitions) {
    layers[def.key] = await downloadLayer(def, g)
  }
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    grid: { sizeKm: 5, dLat: g.dLat, dLon: g.dLon, bounds: g.bounds },
    layers,
  }
  await writeFile(outputPath, JSON.stringify(output) + '\n')
  console.log(`Wrote ${outputPath}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main()
