// Chỉ lấy màu/số từ các bản dữ liệu có nguồn. Giữ lưới hiển thị 5 km đã có;
// không trộn điểm neo, không thêm nhiễu và không đổi màu RGB thành số đo.
export const ENV_FILTER_CELL_KM = 5
export const ENV_FILTER_DLAT = ENV_FILTER_CELL_KM / 111.32
export const ENV_FILTER_DLON = ENV_FILTER_CELL_KM / (111.32 * Math.cos(10 * Math.PI / 180))
export const ENV_FILTER_KEYS = ['ndvi', 'rain', 'soil', 'lst', 'soilType', 'cold', 'esi', 'grace', 'elev']
export const ENV_FILTER_LEGACY_KEYS = {
  ndvi: '7_ndvi_bare_soil', rain: '4_extreme_rainfall', soil: '5_smap_soil_moisture',
  lst: '2_heat_stress', soilType: '1_soil_type', cold: '3_cold_frost_risk',
  esi: '6_ecostress_esi', grace: '8_grace_groundwater', elev: '9_srtm_elevation',
}

export function envFilterSnap(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  const i = Math.floor(lat / ENV_FILTER_DLAT)
  const j = Math.floor(lon / ENV_FILTER_DLON)
  return {
    i, j, lat: (i + 0.5) * ENV_FILTER_DLAT, lon: (j + 0.5) * ENV_FILTER_DLON,
    lat0: i * ENV_FILTER_DLAT, lat1: (i + 1) * ENV_FILTER_DLAT,
    lon0: j * ENV_FILTER_DLON, lon1: (j + 1) * ENV_FILTER_DLON,
  }
}

function envFilterImageDataset(key, layer) {
  const cells = new Map()
  if (layer?.status === 'available') {
    for (const row of layer.cells || []) {
      const [i, j, r, g, b, a] = row
      if (!Number.isInteger(i) || !Number.isInteger(j) || ![r, g, b, a].every((v) => Number.isInteger(v) && v >= 0 && v <= 255)) continue
      cells.set(`${i}:${j}`, { r, g, b, a })
    }
  }
  const { cells: rawCells, ...metadata } = layer || {}
  return { key, mode: 'image', status: layer?.status || 'missing', ...metadata, cells }
}

function envFilterNumericDataset(key, dataset, valueKey, metadata) {
  const cells = new Map()
  let min = Infinity
  let max = -Infinity
  for (const row of dataset?.records || []) {
    const value = row[valueKey]
    if (!Number.isInteger(row.i) || !Number.isInteger(row.j) || !Number.isFinite(value) || !Number.isInteger(row.sampleCount) || row.sampleCount <= 0) continue
    cells.set(`${row.i}:${row.j}`, { value, sampleCount: row.sampleCount })
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  return { key, mode: 'numeric', status: cells.size ? 'available' : 'missing', ...metadata, cells, min: cells.size ? min : null, max: cells.size ? max : null }
}

export function envFilterCreateStore(data) {
  const store = Object.fromEntries(ENV_FILTER_KEYS.map((key) => [key, envFilterImageDataset(key, data?.gibs?.layers?.[key])]))
  const dem = data?.elevation
  store.elev = envFilterNumericDataset('elev', dem, 'elevation', {
    id: dem?.source?.id, provider: 'Minderhoud et al. · PANGAEA',
    sourceUrl: dem?.source?.url || 'https://doi.pangaea.de/10.1594/PANGAEA.902136',
    title: dem?.source?.title, date: String(dem?.source?.sourceMapYear || ''),
    units: 'm', kind: 'derived', fetchedAt: dem?.source?.retrievedAt,
    resolution: { vi: '500 m (Topo DEM); trung bình các pixel hợp lệ trong ô 5 km', en: '500 m (Topo DEM); mean of valid pixels within each 5 km cell' },
    temporal: { vi: 'Bản đồ nền năm 2014; công bố năm 2019', en: 'Source topography from 2014; published in 2019' },
    credit: dem?.source?.authors, license: dem?.source?.license,
    paperUrl: dem?.source?.paperUrl, dataUseUrl: dem?.source?.licenseUrl,
    requestUrl: dem?.source?.downloadUrl, rawSha256: dem?.source?.archiveSha256,
    method: dem?.method,
  })
  if (data?.esi?.layer) store.esi = envFilterImageDataset('esi', data.esi.layer)
  if (data?.salinity) {
    const salinity = data.salinity
    store.soilType = envFilterNumericDataset('soilType', salinity, 'value', {
      ...salinity.source,
      provider: salinity.source?.provider || 'Wang et al. (2025) · Zenodo',
      sourceUrl: salinity.source?.url || 'https://zenodo.org/records/15653696',
      units: 'dS/m', kind: 'model', date: salinity.source?.date || '2022-11-01/2023-04-30',
      resolution: { vi: '30 m (Landsat); trung bình các pixel hợp lệ trong ô 5 km', en: '30 m (Landsat); mean of valid pixels within each 5 km cell' },
      temporal: { vi: 'Mô hình độ mặn đất mùa khô 2022–2023', en: 'Modeled soil salinity for the 2022–2023 dry season' },
      fetchedAt: salinity.source?.retrievedAt,
    })
  }
  return store
}

// Dải màu liên tục chỉ để trình bày giá trị thấp → cao của tập dữ liệu.
// Các mốc min/max lấy từ dữ liệu, không phải ngưỡng thích hợp cây trồng.
export function envFilterNumericColor(value, min, max) {
  const stops = [[13, 71, 161], [102, 187, 106], [255, 160, 0]]
  const t = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0.5
  const segment = t < 0.5 ? 0 : 1
  const mix = segment === 0 ? t * 2 : (t - 0.5) * 2
  const [r, g, b] = stops[segment].map((v, channel) => Math.round(v + (stops[segment + 1][channel] - v) * mix))
  return { r, g, b, a: 255 }
}

export function envFilterSample(store, key, lat, lon) {
  const chunk = envFilterSnap(lat, lon)
  const source = store?.[key]
  if (!chunk || !source) return null
  const cell = source.cells.get(`${chunk.i}:${chunk.j}`)
  const base = { chunk, source, available: false, value: null, sampleCount: null }
  if (source.status !== 'available' || !cell) return base
  if (source.mode === 'image') {
    if (!cell.a) return base
    const hex = `#${[cell.r, cell.g, cell.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
    return { ...base, ...cell, hex, available: true }
  }
  const rgba = envFilterNumericColor(cell.value, source.min, source.max)
  const hex = `#${[rgba.r, rgba.g, rgba.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  return { ...base, ...cell, ...rgba, hex, available: true }
}
