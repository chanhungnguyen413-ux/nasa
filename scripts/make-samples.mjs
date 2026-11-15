// Sinh file mẫu THẬT trong samples/ từ dữ liệu đã có trong repo (không tạo số mới, không tạo file SMAP/GPM giả).
// Chạy: node scripts/make-samples.mjs
// Dùng cho demo kéo thả ở trang Dữ liệu và cho test.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pre = (name) => JSON.parse(readFileSync(join(root, 'site/data/precomputed', name), 'utf8'))
const out = join(root, 'samples')
mkdirSync(out, { recursive: true })

const ndvi = pre('ndvi_raw.json')
const power = pre('power_monthly.json')
const cantho = ndvi.districts.find((d) => d.id === 'cantho')

// 1. CSV: chuỗi NDVI MODIS của Cờ Đỏ (mỗi ảnh 16 ngày), có tọa độ điểm lấy mẫu.
const csv = [
  `# Nguồn: ${ndvi.source}`,
  `# Cách lấy: ${ndvi.method}`,
  `# Lấy lúc: ${ndvi.fetchedAt} (chép từ site/data/precomputed/ndvi_raw.json)`,
  `# Huyện: Cần Thơ - Cờ Đỏ. Độ phân giải: ô 250 m, giá trị là trung vị khối khoảng 2 km x 2 km.`,
  'date,lat,lon,ndvi',
  ...cantho.series.filter((s) => typeof s.ndvi === 'number').map((s) => `${s.date},${cantho.lat},${cantho.lon},${s.ndvi}`),
].join('\n')
writeFileSync(join(out, 'ndvi_modis_co-do.csv'), `${csv}\n`, 'utf8')

// 2. GeoJSON: ảnh NDVI mới nhất của 5 huyện, mỗi huyện một điểm.
const geo = {
  type: 'FeatureCollection',
  _nguon: `${ndvi.source}. Lấy lúc ${ndvi.fetchedAt} (chép từ site/data/precomputed/ndvi_raw.json).`,
  features: ndvi.districts.map((d) => {
    const last = d.series.filter((s) => typeof s.ndvi === 'number').at(-1)
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [d.lon, d.lat] }, properties: { district: d.id, date: last.date, ndvi: last.ndvi } }
  }),
}
writeFileSync(join(out, 'ndvi_modis_5_huyen_anh_moi_nhat.geojson'), `${JSON.stringify(geo, null, 1)}\n`, 'utf8')

// 3. JSON: mưa tháng NASA POWER của Cờ Đỏ (mô hình, không phải vệ tinh đo), mm/tháng, cộng từ số liệu ngày.
const pd = power.districts.find((d) => d.id === 'cantho')
const rain = pd.record.monthly.PRECTOTCORR
const records = Object.entries(rain).flatMap(([year, months]) =>
  months.map((v, i) => (v === null ? null : { date: `${year}-${String(i + 1).padStart(2, '0')}`, 'rain (mm/month)': v })).filter(Boolean),
)
const json = {
  _nguon: 'NASA POWER Daily API (community AG), PRECTOTCORR, cộng theo tháng (mm/tháng). Mô hình ước tính trên ô lưới khoảng nửa độ, không phải số đo vệ tinh hay trạm.',
  _layLuc: `${pd.record.fetchedAt} (chép từ site/data/precomputed/power_monthly.json)`,
  _viTri: { lat: pd.record.lat, lon: pd.record.lon, huyen: 'Cần Thơ - Cờ Đỏ' },
  records,
}
writeFileSync(join(out, 'mua_nasa_power_co-do_theo_thang.json'), `${JSON.stringify(json, null, 1)}\n`, 'utf8')

// 4. File HỎNG CỐ Ý để thử thông báo lỗi: số vô lý và ngày sai. Không phải số liệu, ghi rõ ở dòng đầu.
const broken = [
  '# FILE HONG CO Y de thu thong bao loi cua trang Du lieu. KHONG phai so lieu that.',
  'ngay;ndvi',
  '2025-01-01;5',
  '2025-13-40;0,4',
  'hom qua;0,5',
  '2025-02-02;-7',
  '2025-02-18;khong biet',
].join('\n')
writeFileSync(join(out, 'file_hong_de_thu.csv'), `${broken}\n`, 'utf8')

console.log(`samples/: ${csv.split('\n').length - 5} ảnh NDVI, ${geo.features.length} điểm GeoJSON, ${records.length} tháng mưa, 1 file hỏng cố ý`)
