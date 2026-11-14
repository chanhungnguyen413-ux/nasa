// Danh mục nguồn dữ liệu: tên hiển thị VI/EN, nhà cung cấp, loại số liệu, độ phân giải GỐC, URL, ghi công.
// Các nguồn tra bảng (FAO, Linh et al.) đã có trong SOURCES của site/data/rotationCrops.js: ở đây chỉ tham chiếu sang,
// không chép lại. Mọi dữ kiện về API lấy từ docs/API_STATUS.md (dò ngày 13/11/2026).
import { SOURCES } from '../data/rotationCrops.js'
import { CROP_SOURCES } from '../data/cropLibrary.js'

export const CATALOG = {
  powerDaily: {
    name: { vi: 'NASA POWER (số liệu ngày, gộp thành tháng)', en: 'NASA POWER (daily data, aggregated to months)' },
    provider: 'NASA Langley Research Center',
    kind: 'model',
    resolution: { vi: 'ô lưới khoảng nửa độ (cỡ 50 km)', en: 'grid of about half a degree (≈ 50 km)' },
    url: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/',
    credit: 'NASA POWER',
    // Vì sao dùng số liệu NGÀY thay cho điểm cuối tháng: docs/API_STATUS.md ghi T2M_MAX/T2M_MIN của điểm cuối tháng là
    // cực trị của cả tháng, còn FAO-56 cần nhiệt độ cao nhất/thấp nhất TRUNG BÌNH của tháng.
  },
  copernicusDem: {
    name: { vi: 'Độ cao Copernicus DEM GLO-90 (qua Open-Meteo)', en: 'Copernicus DEM GLO-90 elevation (via Open-Meteo)' },
    provider: 'ESA Copernicus, phục vụ bởi Open-Meteo',
    kind: 'satellite',
    resolution: { vi: '90 m', en: '90 m' },
    url: 'https://open-meteo.com/en/docs/elevation-api',
    credit: 'Copernicus DEM GLO-90 (ESA) · Open-Meteo',
  },
  openMeteoForecast: {
    name: { vi: 'Dự báo Open-Meteo (không phải NASA)', en: 'Open-Meteo forecast (not NASA)' },
    provider: 'Open-Meteo',
    kind: 'model',
    resolution: { vi: 'theo mô hình dự báo của Open-Meteo', en: 'set by Open-Meteo forecast models' },
    url: 'https://open-meteo.com/en/docs',
    credit: 'Open-Meteo',
  },
  location: {
    name: { vi: 'Vị trí ruộng (người dùng chọn)', en: 'Field location (chosen by the user)' },
    provider: '—',
    kind: 'farmer',
    resolution: { vi: 'một điểm', en: 'one point' },
    url: null,
    credit: null,
  },
  gibs: {
    name: { vi: 'Ảnh NASA GIBS (chỉ để nhìn)', en: 'NASA GIBS imagery (for viewing only)' },
    provider: 'NASA EOSDIS GIBS',
    kind: 'satellite',
    resolution: { vi: 'tuỳ lớp ảnh', en: 'depends on the layer' },
    url: 'https://nasa-gibs.github.io/gibs-api-docs/',
    credit: 'NASA EOSDIS GIBS',
  },
  openTopoMap: {
    name: { vi: 'Bản đồ nền OpenTopoMap (dự phòng)', en: 'OpenTopoMap base map (fallback)' },
    provider: 'OpenTopoMap, dữ liệu OpenStreetMap và SRTM',
    kind: 'reference',
    resolution: null,
    url: 'https://opentopomap.org/about',
    credit: '© OpenStreetMap contributors, SRTM · © OpenTopoMap (CC-BY-SA)',
  },
  osm: {
    name: { vi: 'Bản đồ nền OpenStreetMap', en: 'OpenStreetMap base map' },
    provider: 'OpenStreetMap contributors',
    kind: 'reference',
    resolution: null,
    url: 'https://www.openstreetmap.org/copyright',
    credit: '© OpenStreetMap contributors',
  },
  esriImagery: {
    name: { vi: 'Nền ảnh vệ tinh Esri World Imagery (để nhìn bờ ruộng)', en: 'Esri World Imagery satellite basemap (to see field bunds)' },
    provider: 'Esri, Maxar, Earthstar Geographics, GIS User Community',
    kind: 'satellite',
    resolution: { vi: 'dưới 1 m ở nhiều vùng (chỉ để nhìn bờ thửa)', en: 'sub-metre in many areas (visual reference for field bunds)' },
    url: 'https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9',
    credit: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
  soilForm: {
    name: { vi: 'Số đo đất bạn nhập (trang Dữ liệu)', en: 'Soil measurement you entered (Data page)' },
    provider: '—',
    kind: 'ground',
    resolution: { vi: 'một điểm hoặc cả ruộng, theo lúc nhập', en: 'one point or the whole field, as entered' },
    url: null,
    credit: null,
  },
  farmerMark: {
    name: { vi: 'Đánh dấu của nông dân trên bản đồ', en: 'Farmer marks on the map' },
    provider: '—',
    kind: 'farmer',
    resolution: { vi: 'một điểm chạm trên bản đồ', en: 'one tapped point on the map' },
    url: null,
    credit: null,
  },
}

// Nguồn sinh ra lúc chạy (mỗi file tải lên là một nguồn, id dạng 'upload:<id>'). Trang Dữ liệu đăng ký vào đây.
export const CATALOG_DYNAMIC = new Map()

// Lớp ảnh GIBS cho bốn nút. Định danh, bộ ô, mức zoom, ngày ảnh và chú giải chép NGUYÊN VĂN từ docs/API_STATUS.md.
// Ngày là ngày mới nhất lúc dò; dùng ngày cố định để nhãn "ngày ảnh" trên trang luôn đúng.
export const GIBS_LAYERS = [
  {
    key: 'ndvi', kind: 'satellite', id: 'MODIS_Terra_L3_NDVI_16Day', tileMatrixSet: 'GoogleMapsCompatible_Level9', maxZoom: 9, date: '2026-10-16',
    title: 'Vegetation Index (16-Day, MODIS, Terra)', legend: 'https://gibs.earthdata.nasa.gov/legends/MODIS_L3_NDVI_H.svg',
  },
  {
    key: 'rain', kind: 'satellite', id: 'IMERG_Precipitation_Rate', tileMatrixSet: 'GoogleMapsCompatible_Level6', maxZoom: 6, date: '2026-11-12',
    title: 'Precipitation Rate (IMERG)', legend: 'https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg',
  },
  {
    // Tiêu đề trong capabilities ghi "Model Value-Added": đây là sản phẩm mô hình đồng hoá từ SMAP, nên nhãn là "mô hình".
    key: 'soil', kind: 'model', id: 'SMAP_L4_Analyzed_Surface_Soil_Moisture', tileMatrixSet: 'GoogleMapsCompatible_Level6', maxZoom: 6, date: '2026-11-10',
    title: 'Surface Soil Moisture (L4, 12z Instantaneous, Model Value-Added, SMAP)', legend: 'https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg',
  },
  {
    key: 'lst', kind: 'satellite', id: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day', tileMatrixSet: 'GoogleMapsCompatible_Level7', maxZoom: 7, date: '2026-11-01',
    title: 'Land Surface Temperature (8-Day, Day, MODIS, Terra)', legend: 'https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg',
  },
]

/** Địa chỉ mẫu ô ảnh cho Leaflet, theo mẫu ResourceURL trong capabilities của GIBS. */
export const gibsTileTemplate = (layer) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.id}/default/${layer.date}/${layer.tileMatrixSet}/{z}/{y}/{x}.png`

/** Tìm một nguồn theo id: trong CATALOG trước, rồi trong SOURCES (nguồn tra bảng). */
export function catalogSource(id) {
  if (CATALOG[id]) return CATALOG[id]
  if (CATALOG_DYNAMIC.has(id)) return CATALOG_DYNAMIC.get(id)
  // Nguồn tra bảng: SOURCES của trang Luân canh, rồi CROP_SOURCES của thư viện cây (vd. ECOCROP).
  const s = SOURCES[id] ?? CROP_SOURCES[id]
  if (!s) return null
  return { name: { vi: s.short, en: s.short }, provider: s.short, kind: 'reference', resolution: null, url: s.url, credit: s.short, cite: s.cite }
}
