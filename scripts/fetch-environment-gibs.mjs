// Tải ảnh màu công khai của NASA GIBS và lấy màu tại tâm các ô hiển thị ~5 km.
// Không giải mã RGB thành số đo; không nội suy số liệu, không thêm nhiễu hay màu giả.
// Chạy lại: node scripts/fetch-environment-gibs.mjs
// Ảnh gốc + SHA256 giữ trong .preview/environment-gibs/ để có thể kiểm tra độc lập.
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(root, 'site/data/precomputed/environment_gibs_5km.json')
const rawDirectory = join(root, '.preview/environment-gibs')
const bounds = { west: 103.35, south: 8.3, east: 106.95, north: 11.15 }
const dLat = 5 / 111.32
const dLon = 5 / (111.32 * Math.cos(10 * Math.PI / 180))
const iMin = Math.floor(bounds.south / dLat)
const iMax = Math.floor(bounds.north / dLat)
const jMin = Math.floor(bounds.west / dLon)
const jMax = Math.floor(bounds.east / dLon)
// Nới khung ảnh đúng đến mép các ô biên để tâm ô vẫn nằm trong ảnh nguồn.
const rasterBounds = { west: jMin * dLon, south: iMin * dLat, east: (jMax + 1) * dLon, north: (iMax + 1) * dLat }
const width = 1024
const height = Math.round(width * (rasterBounds.north - rasterBounds.south) / (rasterBounds.east - rasterBounds.west))
const capabilitiesUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml'
const documentationUrl = 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/'
const dataUseUrl = 'https://nasa-gibs.github.io/gibs-api-docs/#data-use-guidance-and-acknowledgements'
const legendBase = 'https://gibs.earthdata.nasa.gov/legends/'

// Ngày ảnh được chép từ Default trong capabilities đã kiểm tra, không gọi đây là thời gian thực.
const definitions = [
  {
    key: 'ndvi', id: 'MODIS_Terra_L3_NDVI_16Day', date: '2026-10-16',
    title: 'Vegetation Index (16-Day, MODIS, Terra)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod13.php', units: 'NDVI (dimensionless)',
    legendUrl: legendBase + 'MODIS_L3_NDVI_H.svg',
    resolution: { vi: '250 m (MOD13Q1); ô hiển thị khoảng 5 km', en: '250 m (MOD13Q1); approximately 5 km display cells' },
    temporal: { vi: 'Ảnh tổng hợp 16 ngày, mốc 16/10/2026', en: '16-day composite, dated 2026-10-16' },
  },
  {
    key: 'rain', id: 'IMERG_Precipitation_Rate', date: '2026-11-13',
    title: 'Precipitation Rate (IMERG)', provider: 'NASA EOSDIS GIBS · NASA GPM / IMERG', kind: 'satellite',
    sourceUrl: 'https://gpm.nasa.gov/data/imerg', units: 'mm/hr',
    legendUrl: legendBase + 'GPM_Precipitation_Rate_H.svg',
    resolution: { vi: '0,1° (khoảng 11 km); ô hiển thị khoảng 5 km', en: '0.1° (approximately 11 km); approximately 5 km display cells' },
    temporal: { vi: 'Lớp cường độ mưa ngày 13/11/2026; không phải tổng mưa năm', en: 'Precipitation-rate imagery dated 2026-11-13; not annual rainfall totals' },
  },
  {
    key: 'soil', id: 'SMAP_L4_Analyzed_Surface_Soil_Moisture', date: '2026-11-10',
    title: 'Surface Soil Moisture (L4, 12z Instantaneous, Model Value-Added, SMAP)', provider: 'NASA EOSDIS GIBS · NASA SMAP / NSIDC DAAC', kind: 'model',
    sourceUrl: 'https://nsidc.org/data/spl4smau/versions/8', units: 'm³/m³',
    legendUrl: legendBase + 'SMAP_Analyzed_Soil_Moisture_H.svg',
    resolution: { vi: '9 km (SMAP L4); ô hiển thị khoảng 5 km', en: '9 km (SMAP L4); approximately 5 km display cells' },
    temporal: { vi: 'Độ ẩm đất mặt mô hình đồng hóa tại 12 UTC ngày 10/11/2026', en: 'Assimilated surface-soil-moisture model at 12 UTC on 2026-11-10' },
  },
  {
    key: 'lst', id: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day', date: '2026-11-01',
    title: 'Land Surface Temperature (8-Day, Day, MODIS, Terra)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod11.php', units: 'K',
    legendUrl: legendBase + 'MODIS_Land_Surface_Temp_H.svg',
    resolution: { vi: '1 km (MOD11A2); ô hiển thị khoảng 5 km', en: '1 km (MOD11A2); approximately 5 km display cells' },
    temporal: { vi: 'Nhiệt bề mặt ban ngày tổng hợp 8 ngày, mốc 01/11/2026', en: '8-day daytime land-surface-temperature composite, dated 2026-11-01' },
  },
  {
    key: 'cold', id: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Night', date: '2026-11-01',
    title: 'Land Surface Temperature (L3, 8-Day, Night, MODIS, Terra)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod11.php', units: 'K',
    legendUrl: legendBase + 'MODIS_Land_Surface_Temp_H.svg',
    resolution: { vi: '1 km (MOD11A2); ô hiển thị khoảng 5 km', en: '1 km (MOD11A2); approximately 5 km display cells' },
    temporal: { vi: 'Nhiệt bề mặt ban đêm tổng hợp 8 ngày, mốc 01/11/2026', en: '8-day nighttime land-surface-temperature composite, dated 2026-11-01' },
  },
  {
    key: 'grace', id: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI', date: '2022-07-01',
    title: 'Liquid Water Equivalent Thickness (Mascon, CRI, GRACE Tellus)', provider: 'NASA EOSDIS GIBS · NASA JPL / GRACE Tellus', kind: 'derived',
    sourceUrl: 'https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/', units: 'cm (total-water-storage anomaly)',
    legendUrl: legendBase + 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI_H.svg',
    resolution: { vi: 'Mascon 3°, biểu diễn trên lưới 0,5°; không có chi tiết 5 km', en: '3° mascons represented on a 0.5° grid; no 5 km native detail' },
    temporal: { vi: 'Ảnh lịch sử tháng 07/2022; không phải nước ngầm hiện tại', en: 'Historical July 2022 imagery; not current groundwater' },
  },
  {
    key: 'soilRoot', id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', date: '2026-11-10',
    title: 'Root Zone Soil Moisture (L4, 12z Instantaneous, Model Value-Added, SMAP)', provider: 'NASA EOSDIS GIBS · NASA SMAP / NSIDC DAAC', kind: 'model',
    sourceUrl: 'https://nsidc.org/data/spl4smau/versions/8', units: 'm³/m³',
    legendUrl: legendBase + 'SMAP_Analyzed_Soil_Moisture_H.svg',
    resolution: { vi: '9 km (SMAP L4 0–100 cm); ô hiển thị khoảng 5 km', en: '9 km (SMAP L4 0–100 cm); approximately 5 km display cells' },
    temporal: { vi: 'Độ ẩm đất vùng rễ 0–100 cm đồng hóa lúc 12 UTC ngày 10/11/2026', en: 'Assimilated 0–100 cm root-zone soil moisture at 12 UTC on 2026-11-10' },
  },
  {
    key: 'evi', id: 'MODIS_Terra_L3_EVI_16Day', date: '2026-10-16',
    title: 'Enhanced Vegetation Index (L3, 16-Day, MODIS, Terra)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod13.php', units: 'EVI (dimensionless)',
    legendUrl: legendBase + 'MODIS_L3_EVI_H.svg',
    resolution: { vi: '250 m (MOD13Q1); ô hiển thị khoảng 5 km', en: '250 m (MOD13Q1); approximately 5 km display cells' },
    temporal: { vi: 'Chỉ số thực vật tăng cường EVI 16 ngày, mốc 16/10/2026', en: '16-day Enhanced Vegetation Index composite, dated 2026-10-16' },
  },
  {
    key: 'lai', id: 'MODIS_Combined_L4_LAI_8Day', date: '2026-10-24',
    title: 'Leaf Area Index (L4, 8-Day, Best Available, MODIS)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod15.php', units: 'm²/m² (LAI)',
    legendUrl: legendBase + 'MODIS_Leaf_Area_Index_H.svg',
    resolution: { vi: '500 m (MCD15A2H); ô hiển thị khoảng 5 km', en: '500 m (MCD15A2H); approximately 5 km display cells' },
    temporal: { vi: 'Chỉ số diện tích lá tổng hợp 8 ngày, mốc 24/10/2026', en: '8-day Leaf Area Index composite, dated 2026-10-24' },
  },
  {
    key: 'fpar', id: 'MODIS_Combined_L4_FPAR_8Day', date: '2026-10-24',
    title: 'Fraction of Photosynthetically Active Radiation (L4, 8-Day, MODIS)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod15.php', units: 'Fraction (0–1)',
    legendUrl: legendBase + 'MODIS_FPAR_H.svg',
    resolution: { vi: '500 m (MCD15A2H); ô hiển thị khoảng 5 km', en: '500 m (MCD15A2H); approximately 5 km display cells' },
    temporal: { vi: 'Tỷ lệ bức xạ quang hợp được tán lá hấp thụ 8 ngày, mốc 24/10/2026', en: '8-day FPAR composite, dated 2026-10-24' },
  },
  {
    key: 'gpp', id: 'MODIS_Terra_L4_Gross_Primary_Productivity_8Day', date: '2026-10-16',
    title: 'Gross Primary Productivity (L4, 8-Day, MODIS, Terra)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod17.php', units: 'kg C/m²/8-day',
    legendUrl: legendBase + 'MODIS_Gross_Primary_Productivity_H.svg',
    resolution: { vi: '500 m (MOD17A2H); ô hiển thị khoảng 5 km', en: '500 m (MOD17A2H); approximately 5 km display cells' },
    temporal: { vi: 'Năng suất sơ cấp gộp quang hợp 8 ngày, mốc 16/10/2026', en: '8-day Gross Primary Productivity composite, dated 2026-10-16' },
  },
  {
    key: 'landCover', id: 'MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual', date: '2024-01-01',
    title: 'Land Cover Type (IGBP, Annual, Best Available, MODIS)', provider: 'NASA EOSDIS GIBS · NASA LP DAAC / MODIS', kind: 'satellite',
    sourceUrl: 'https://modis.gsfc.nasa.gov/data/dataprod/mod12.php', units: 'IGBP 17 classes',
    legendUrl: legendBase + 'MODIS_IGBP_Land_Cover_Type_H.svg',
    resolution: { vi: '500 m (MCD12Q1); ô hiển thị khoảng 5 km', en: '500 m (MCD12Q1); approximately 5 km display cells' },
    temporal: { vi: 'Phân loại lớp phủ mặt đất thường niên IGBP năm 2024', en: 'Annual IGBP land-cover classification for 2024' },
  },
  {
    key: 'biomass', id: 'GEDI_ISS_L4B_Aboveground_Biomass_Density_Mean_201904-202303', date: '2019-04-18',
    title: 'Aboveground Biomass Density Mean (L4B, GEDI, ISS)', provider: 'NASA EOSDIS GIBS · ORNL DAAC / GEDI ISS', kind: 'satellite',
    sourceUrl: 'https://daac.ornl.gov/GEDI/guides/GEDI_L4B_Gridded_Biomass.html', units: 'Mg/ha',
    legendUrl: legendBase + 'GEDI_MU_Color_Index_H.svg',
    resolution: { vi: '1 km (LiDAR GEDI L4B); ô hiển thị khoảng 5 km', en: '1 km (GEDI L4B LiDAR); approximately 5 km display cells' },
    temporal: { vi: 'Mật độ sinh khối thực vật trên mặt đất trung bình 2019–2023', en: 'Mean aboveground biomass density composite (2019–2023)' },
  },
  {
    key: 'flood3d', id: 'MODIS_Combined_Flood_3-Day', date: '2026-10-16',
    title: 'Flood (3-Day Composite, Best Available, MODIS)', provider: 'NASA EOSDIS GIBS · NASA LANCE / MODIS', kind: 'satellite',
    sourceUrl: 'https://lance.modaps.eosdis.nasa.gov/achyuthan/flood/', units: 'Water / Flood / Cloud mask',
    legendUrl: legendBase + 'MODIS_Flood_H.svg',
    resolution: { vi: '250 m (MODIS NRT Flood); ô hiển thị khoảng 5 km', en: '250 m (MODIS NRT Flood); approximately 5 km display cells' },
    temporal: { vi: 'Ảnh phân bố nước mặt và ngập lũ 3 ngày, mốc 16/10/2026', en: '3-day surface-water and flood extent composite, dated 2026-10-16' },
  },
  {
    key: 'floodHaz', id: 'NDH_Flood_Hazard_Frequency_Distribution_1985-2003', date: '',
    title: 'Global Flood Hazard Frequency and Distribution (1985–2003, SEDAC)', provider: 'NASA EOSDIS GIBS · Columbia SEDAC', kind: 'derived',
    sourceUrl: 'https://sedac.ciesin.columbia.edu/data/set/ndh-flood-hazard-frequency-distribution', units: 'Decile frequency (1985–2003)',
    legendUrl: legendBase + 'NDH_Flood_Hazard_Frequency_Distribution_1985-2003_H.svg',
    resolution: { vi: '2,5 phút cung (~4,6 km) khớp gần sát ô hiển thị 5 km', en: '2.5 arc-minutes (~4.6 km), matching the 5 km grid' },
    temporal: { vi: 'Tần suất nguy cơ ngập lịch sử toàn cầu 1985–2003 (lớp tĩnh)', en: 'Historical flood hazard frequency distribution 1985–2003 (static)' },
  },
  {
    key: 'soilTemp', id: 'SMAP_L4_Soil_Temperature_Layer_1', date: '2026-11-10',
    title: 'Soil Temperature Layer 1 (L4, 12z Instantaneous, SMAP)', provider: 'NASA EOSDIS GIBS · NASA SMAP / NSIDC DAAC', kind: 'model',
    sourceUrl: 'https://nsidc.org/data/spl4smau/versions/8', units: 'K / °C (0–10 cm soil layer)',
    legendUrl: legendBase + 'SMAP_Soil_Temperature_Layer_H.svg',
    resolution: { vi: '9 km (SMAP L4 lớp đất 1); ô hiển thị khoảng 5 km', en: '9 km (SMAP L4 layer 1); approximately 5 km display cells' },
    temporal: { vi: 'Nhiệt độ lớp đất mặt đồng hóa lúc 12 UTC ngày 10/11/2026', en: 'Assimilated topsoil temperature at 12 UTC on 2026-11-10' },
  },
]

// Bộ đọc PNG nhỏ, không thêm thư viện vào package.json của dự án.
// Hỗ trợ PNG không interlace, RGB/RGBA/gray 8-bit và palette 1/2/4/8-bit.
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Response is not PNG')
  let pngWidth, pngHeight, depth, type, palette, transparency
  const data = []
  let ended = false
  for (let offset = 8; offset + 12 <= buffer.length;) {
    const length = buffer.readUInt32BE(offset)
    const name = buffer.toString('ascii', offset + 4, offset + 8)
    if (offset + length + 12 > buffer.length) throw new Error('Truncated PNG chunk')
    const chunk = buffer.subarray(offset + 8, offset + 8 + length)
    if (name === 'IHDR') {
      pngWidth = chunk.readUInt32BE(0); pngHeight = chunk.readUInt32BE(4)
      depth = chunk[8]; type = chunk[9]
      if (!pngWidth || !pngHeight || pngWidth > 8192 || pngHeight > 8192 || chunk[10] !== 0 || chunk[11] !== 0 || chunk[12] !== 0) throw new Error('Unsupported PNG dimensions/encoding/interlace')
    } else if (name === 'PLTE') palette = chunk
    else if (name === 'tRNS') transparency = chunk
    else if (name === 'IDAT') data.push(chunk)
    else if (name === 'IEND') { ended = true; break }
    offset += length + 12
  }
  if (!ended || !data.length) throw new Error('Incomplete PNG')
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type]
  if (!channels || (type === 3 ? ![1, 2, 4, 8].includes(depth) : depth !== 8)) throw new Error(`Unsupported PNG color type/depth ${type}/${depth}`)
  if (type === 3 && !palette) throw new Error('Missing PNG palette')
  const rowBytes = Math.ceil(pngWidth * channels * depth / 8)
  const bpp = Math.max(1, Math.ceil(channels * depth / 8))
  const inflated = inflateSync(Buffer.concat(data))
  if (inflated.length !== pngHeight * (rowBytes + 1)) throw new Error('Unexpected PNG decompressed size')
  const pixels = Buffer.alloc(pngHeight * rowBytes)
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  for (let y = 0; y < pngHeight; y++) {
    const input = y * (rowBytes + 1), output = y * rowBytes, filter = inflated[input]
    if (filter > 4) throw new Error(`Unsupported PNG filter ${filter}`)
    for (let x = 0; x < rowBytes; x++) {
      const a = x >= bpp ? pixels[output + x - bpp] : 0
      const b = y > 0 ? pixels[output + x - rowBytes] : 0
      const c = y > 0 && x >= bpp ? pixels[output + x - rowBytes - bpp] : 0
      const prediction = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter]
      pixels[output + x] = (inflated[input + 1 + x] + prediction) & 255
    }
  }
  return {
    width: pngWidth, height: pngHeight, colorType: type, bitDepth: depth,
    rgba(x, y) {
      if (x < 0 || y < 0 || x >= pngWidth || y >= pngHeight) return [0, 0, 0, 0]
      const row = y * rowBytes
      if (type === 3) {
        const bit = x * depth, shift = 8 - depth - bit % 8
        const index = (pixels[row + Math.floor(bit / 8)] >> shift) & ((1 << depth) - 1)
        const start = index * 3
        if (start + 2 >= palette.length) throw new Error('PNG pixel outside palette')
        return [palette[start], palette[start + 1], palette[start + 2], transparency?.[index] ?? 255]
      }
      const start = row + x * channels
      if (type === 6) return [pixels[start], pixels[start + 1], pixels[start + 2], pixels[start + 3]]
      if (type === 2) {
        const rgb = [pixels[start], pixels[start + 1], pixels[start + 2]]
        const transparent = transparency?.length === 6 && rgb.every((v, i) => v === transparency.readUInt16BE(i * 2))
        return [...rgb, transparent ? 0 : 255]
      }
      const gray = pixels[start]
      const alpha = type === 4 ? pixels[start + 1] : transparency?.length === 2 && gray === transparency.readUInt16BE(0) ? 0 : 255
      return [gray, gray, gray, alpha]
    },
  }
}

export function environmentGibsGrid() {
  return { bounds, dLat, dLon, iMin, iMax, jMin, jMax, rasterBounds, width, height }
}

function requestUrl(layer) {
  const url = new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi')
  const params = { SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.1.1', LAYERS: layer.id, STYLES: '', FORMAT: 'image/png', TRANSPARENT: 'TRUE', SRS: 'EPSG:4326', BBOX: [rasterBounds.west, rasterBounds.south, rasterBounds.east, rasterBounds.north].join(','), WIDTH: String(width), HEIGHT: String(height) }
  if (layer.date) params.TIME = layer.date
  url.search = new URLSearchParams(params).toString()
  return url.href
}

const legendCache = new Map()
async function downloadLegend(layer) {
  if (!legendCache.has(layer.legendUrl)) legendCache.set(layer.legendUrl, (async () => {
    const response = await fetch(layer.legendUrl, { signal: AbortSignal.timeout(45000) })
    if (!response.ok) throw new Error(`Legend HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.toString('utf8').includes('<svg')) throw new Error('Legend response is not SVG')
    const legendSha256 = createHash('sha256').update(bytes).digest('hex')
    await writeFile(join(rawDirectory, layer.legendUrl.split('/').at(-1)), bytes)
    return { legendSha256, legendDataUrl: `data:image/svg+xml;base64,${bytes.toString('base64')}` }
  })())
  return legendCache.get(layer.legendUrl)
}

async function download(layer) {
  const url = requestUrl(layer)
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'Mekong-Seasons-public-data-audit/1.0' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = response.headers.get('content-type') || ''
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!contentType.includes('image/png')) throw new Error(`Expected PNG, received ${contentType}: ${bytes.toString('utf8', 0, 160)}`)
      const png = decodePng(bytes)
      if (png.width !== width || png.height !== height) throw new Error('Unexpected response dimensions')
      const pngSha256 = createHash('sha256').update(bytes).digest('hex')
      await writeFile(join(rawDirectory, `${layer.key}-${layer.date || 'static'}.png`), bytes)
      const cells = []
      let visibleCells = 0
      const colors = new Set()
      for (let i = iMin; i <= iMax; i++) {
        const lat = (i + 0.5) * dLat
        const y = Math.floor((rasterBounds.north - lat) / (rasterBounds.north - rasterBounds.south) * height)
        for (let j = jMin; j <= jMax; j++) {
          const lon = (j + 0.5) * dLon
          const x = Math.floor((lon - rasterBounds.west) / (rasterBounds.east - rasterBounds.west) * width)
          const rgba = png.rgba(x, y)
          cells.push([i, j, ...rgba])
          if (rgba[3] > 0) { visibleCells++; colors.add(rgba.join(',')) }
        }
      }
      const legend = await downloadLegend(layer)
      const result = { ...layer, ...legend, documentationUrl, dataUseUrl, credit: 'NASA EOSDIS GIBS', capabilitiesUrl, requestUrl: url, fetchedAt: new Date().toISOString(), pngSha256, raster: { width, height, bounds: rasterBounds, contentType, bytes: bytes.length, colorType: png.colorType, bitDepth: png.bitDepth }, status: visibleCells ? 'available' : 'missing', visibleCells, distinctVisibleColors: colors.size, cells }
      if (!visibleCells) result.missingReason = 'The requested source image has no non-transparent samples in this regional display grid.'
      console.log(`${layer.key}: ${cells.length} cells, ${visibleCells} visible, ${colors.size} source colors, PNG ${bytes.length} bytes`)
      return result
    } catch (error) { lastError = error }
  }
  console.error(`${layer.key}: missing (${lastError.message})`)
  return { ...layer, documentationUrl, dataUseUrl, credit: 'NASA EOSDIS GIBS', capabilitiesUrl, requestUrl: url, status: 'missing', missingReason: lastError.message, cells: [] }
}

async function main() {
await mkdir(rawDirectory, { recursive: true })
const layers = {}
// Hai lượt tải đồng thời, tránh dồn nhiều yêu cầu lên dịch vụ công khai.
for (let start = 0; start < definitions.length; start += 2) {
  const batch = await Promise.all(definitions.slice(start, start + 2).map(download))
  for (const result of batch) layers[result.key] = result
}
const output = {
  schemaVersion: 1, generatedAt: new Date().toISOString(),
  grid: {
    sizeKm: 5, dLat, dLon, referenceLatitude: 10, bounds, iMin, iMax, jMin, jMax,
    method: 'Nearest PNG pixel at each display-cell center in WMS 1.1.1 EPSG:4326 longitude/latitude order. Source RGBA colors are preserved; RGB is not converted to physical measurements. Display-cell size is not native source resolution.',
    noData: 'Transparent source pixels remain transparent. White colors are not reclassified as zero or missing: use the source legend. No invented spatial variation or fallback colors.',
  },
  layers,
}
await writeFile(outputPath, JSON.stringify(output) + '\n')
console.log(`Wrote ${outputPath}`)
if (!Object.values(layers).some(layer => layer.status === 'available')) process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main()
