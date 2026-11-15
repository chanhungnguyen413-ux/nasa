// Tạo lưới loại đất ĐBSCL 5 km từ GeoJSON công khai Open Development Mekong (UN FAO Digital Soil Map of the World v3.6).
// Không bịa số đo pH/EC/độ mặn; chỉ gán đúng mã đất FAO tại tâm từng ô 5 km trong ranh giới ĐBSCL.
// Chạy: node scripts/build-mekong-soil.mjs
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { environmentGibsGrid } from './fetch-environment-gibs.mjs'
import { MEKONG_OUTER_RINGS, mekongPointInRing } from '../site/data/mekongBoundaries.js'

const soilRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const soilViPath = join(soilRoot, '.preview', 'odm_soilmap_1.geojson')
const soilEnPath = join(soilRoot, '.preview', 'odm_soilmap_2.geojson')
const soilOutputPath = join(soilRoot, 'site', 'data', 'precomputed', 'mekong_soil_5km.json')

const SOIL_CLASSES = {
  'Je73-3a': { hex: '#2E7D32', labelVi: 'Đất phù sa phì nhiêu (Je73-3a · hạt mịn)', labelEn: 'Eutric Fluvisols (Je73-3a · fine)' },
  'Je72-2a': { hex: '#66BB6A', labelVi: 'Đất phù sa phì nhiêu (Je72-2a · hạt trung bình)', labelEn: 'Eutric Fluvisols (Je72-2a · medium)' },
  'Ge56-3a': { hex: '#1D6FA5', labelVi: 'Đất sét lầy giàu dinh dưỡng (Ge56-3a)', labelEn: 'Eutric Gleysols (Ge56-3a · fine)' },
  'Ge55-3a': { hex: '#4EB3D3', labelVi: 'Đất sét lầy giàu dinh dưỡng (Ge55-3a)', labelEn: 'Eutric Gleysols (Ge55-3a · fine)' },
  'Jt13-3a': { hex: '#D95F0E', labelVi: 'Đất phù sa nước lợ mặn / phèn (Jt13-3a)', labelEn: 'Thionic Fluvisols (Jt13-3a · brackish/acid)' },
  'Jt14-3a': { hex: '#FE9929', labelVi: 'Đất phù sa nước lợ mặn / phèn (Jt14-3a)', labelEn: 'Thionic Fluvisols (Jt14-3a · brackish/acid)' },
  'Od21-a': { hex: '#6A3D9A', labelVi: 'Đất hữu cơ / than bùn (Od21-a)', labelEn: 'Dystric Histosols (Od21-a · organic peat)' },
  'Ag16-2a': { hex: '#A6761D', labelVi: 'Đất xám bạc màu phiến sét (Ag16-2a)', labelEn: 'Gleyic Acrisols (Ag16-2a)' },
  'Af61-1/2ab': { hex: '#C49A45', labelVi: 'Đất xám bạc màu nâu đỏ (Af61-1/2ab)', labelEn: 'Ferric Acrisols (Af61-1/2ab)' },
  'Ao90-2/3c': { hex: '#8C6D46', labelVi: 'Đất xám bạc màu (Ao90-2/3c)', labelEn: 'Orthic Acrisols (Ao90-2/3c)' },
}

function soilPointInPolygonRings(lat, lon, rings) {
  if (!rings.length || !mekongPointInRing(lat, lon, rings[0])) return false
  for (let i = 1; i < rings.length; i++) {
    if (mekongPointInRing(lat, lon, rings[i])) return false
  }
  return true
}

function soilPointInGeometry(lat, lon, geom) {
  if (!geom) return false
  if (geom.type === 'Polygon') {
    return soilPointInPolygonRings(lat, lon, geom.coordinates.map((r) => r.map(([x, y]) => [y, x])))
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some((poly) => soilPointInPolygonRings(lat, lon, poly.map((r) => r.map(([x, y]) => [y, x]))))
  }
  return false
}

const viRaw = readFileSync(soilViPath)
const enRaw = readFileSync(soilEnPath)
const viGeo = JSON.parse(viRaw.toString('utf8'))
const enGeo = JSON.parse(enRaw.toString('utf8'))
const enByGid = new Map(enGeo.features.map((f) => [f.properties?.gid, f.properties]))

// Tính bbox thô trước để tăng tốc kiểm tra điểm-trong-đa-giác.
const features = viGeo.features.map((f) => {
  const latRings = f.geometry.type === 'Polygon'
    ? [f.geometry.coordinates]
    : f.geometry.coordinates
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180
  for (const poly of latRings) {
    for (const ring of poly) {
      for (const [lon, lat] of ring) {
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
      }
    }
  }
  return { f, enProps: enByGid.get(f.properties?.gid) || {}, minLat, maxLat, minLon, maxLon }
})

const g = environmentGibsGrid()
const cells = []
const classCounts = {}
let insideDeltaTotal = 0

for (let i = g.iMin; i <= g.iMax; i++) {
  const lat = (i + 0.5) * g.dLat
  for (let j = g.jMin; j <= g.jMax; j++) {
    const lon = (j + 0.5) * g.dLon
    if (!MEKONG_OUTER_RINGS.some((ring) => mekongPointInRing(lat, lon, ring))) continue
    insideDeltaTotal++
    for (const item of features) {
      if (lat < item.minLat || lat > item.maxLat || lon < item.minLon || lon > item.maxLon) continue
      if (!soilPointInGeometry(lat, lon, item.f.geometry)) continue
      const code = item.f.properties?.faosoil || item.f.properties?.domsoil
      const meta = SOIL_CLASSES[code] || {
        hex: '#78909C',
        labelVi: item.f.properties?.kieu || code,
        labelEn: item.enProps?.Type || code,
      }
      cells.push([i, j, code])
      if (!classCounts[code]) {
        classCounts[code] = {
          code,
          domsoil: item.f.properties?.domsoil || '',
          hex: meta.hex,
          labelVi: meta.labelVi,
          labelEn: meta.labelEn,
          rawVi: item.f.properties?.kieu || '',
          rawEn: item.enProps?.Type || '',
          count: 0,
        }
      }
      classCounts[code].count++
      break
    }
  }
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    id: 'odm-fao-soil-types-vietnam',
    title: 'Soil types in Vietnam (FAO Digital Soil Map of the World v3.6)',
    provider: 'Open Development Mekong · UN FAO',
    url: 'https://data.opendevelopmentmekong.net/dataset/soil-types-in-vietnam',
    viGeojsonSha256: createHash('sha256').update(viRaw).digest('hex'),
    enGeojsonSha256: createHash('sha256').update(enRaw).digest('hex'),
    license: 'CC-BY-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    nativeScale: 'FAO Digital Soil Map of the World 1:5,000,000 (~5–10 km polygons)',
    limitations: [
      'Phản ánh nhóm đất tổng quát FAO (phù sa, gley, phèn/lợ Jt, than bùn Od), KHÔNG phải bản đồ ranh mặn g/L theo mùa.',
      'Ranh mặn động theo mùa khô (ví dụ Zenodo 10.5281/zenodo.15653696 hoặc trạm SIWRR) chưa tích hợp do tệp GeoTIFF gốc nặng 382 MB.',
    ],
  },
  grid: {
    sizeKm: 5,
    dLat: g.dLat,
    dLon: g.dLon,
    referenceLatitude: 10,
    iMin: g.iMin,
    iMax: g.iMax,
    jMin: g.jMin,
    jMax: g.jMax,
    method: 'Point-in-polygon lookup at each 5 km cell center inside MEKONG_OUTER_RINGS; no interpolation or salinity simulation.',
  },
  totalDeltaCells: insideDeltaTotal,
  coveredCells: cells.length,
  classes: Object.values(classCounts).sort((a, b) => b.count - a.count),
  cells,
}

writeFileSync(soilOutputPath, JSON.stringify(output) + '\n')
console.log(JSON.stringify({
  output: soilOutputPath,
  totalDeltaCells: insideDeltaTotal,
  coveredCells: cells.length,
  classCount: output.classes.length,
  classes: output.classes.map((c) => `${c.code}: ${c.count}`),
}, null, 2))
