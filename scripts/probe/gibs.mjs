// Đọc danh mục lớp ảnh của NASA GIBS (file WMTSCapabilities.xml) và tìm các lớp theo từ khoá.
// Quy tắc của phase: KHÔNG dùng tên lớp từ trí nhớ. Mọi định danh, TileMatrixSet, mức zoom, ngày tháng
// bên dưới đều đọc ra từ chính file XML.
//
// Vì sao tự đọc XML bằng biểu thức chính quy: Node không có sẵn bộ đọc XML, mà phase không cho thêm thư viện.
// File này do máy sinh ra, cấu trúc đều, nên cách này đủ tin cậy.

// Địa chỉ lấy từ tài liệu GIBS "Access Basics": https://nasa-gibs.github.io/gibs-api-docs/access-basics/
export const GIBS_CAPABILITIES = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml'

// Mỗi nhóm: lớp phải khớp MỌI từ khoá (so trên định danh + tiêu đề).
export const GIBS_GROUPS = [
  { id: 'ndvi', label: 'Sức khỏe cây: NDVI (MODIS)', all: [/NDVI/i, /MODIS/i] },
  { id: 'rain', label: 'Lượng mưa (IMERG)', all: [/IMERG/i, /Precip/i] },
  { id: 'soil', label: 'Độ ẩm đất (SMAP)', all: [/SMAP/i, /Soil[_ ]?Moisture/i] },
  { id: 'lst', label: 'Nhiệt độ bề mặt đất (MODIS LST)', all: [/MODIS/i, /Land[_ ]?Surface[_ ]?Temp/i] },
]

const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])
const first = (xml, tag) => blocks(xml, tag)[0]?.trim() ?? null
// Thuộc tính trong file này dùng dấu nháy đơn (href='...'); chấp nhận cả nháy đơn lẫn nháy kép.
const attrs = (tagText) => Object.fromEntries([...tagText.matchAll(/([\w:]+)=(['"])(.*?)\2/g)].map((m) => [m[1], m[3]]))
const openTags = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\s[^>]*>`, 'g'))].map((m) => attrs(m[0]))

/** Mức zoom tối đa của từng TileMatrixSet = số thứ tự lớn nhất trong các <TileMatrix> của nó. */
function tileMatrixSets(xml) {
  const sets = {}
  for (const block of blocks(xml, 'TileMatrixSet')) {
    if (!block.includes('<TileMatrix>')) continue // bỏ qua chỗ lớp chỉ NHẮC tên bộ ô
    const levels = blocks(block, 'TileMatrix').map((tm) => Number(first(tm, 'ows:Identifier')))
    sets[first(block.split('<TileMatrix>')[0], 'ows:Identifier')] = Math.max(...levels)
  }
  return sets
}

function parseLayer(block, maxZoomOf) {
  // Bỏ phần <Style> và <Dimension> trước khi lấy định danh, vì hai phần đó cũng có thẻ <ows:Identifier> riêng.
  const own = block.replace(/<Style[\s\S]*?<\/Style>/g, '').replace(/<Dimension>[\s\S]*?<\/Dimension>/g, '')
  const dimension = blocks(block, 'Dimension').find((d) => first(d, 'ows:Identifier') === 'Time') ?? null
  const ranges = dimension ? blocks(dimension, 'Value').map((v) => v.trim().split('/')) : []
  const ends = ranges.map((r) => r[1] ?? r[0]).sort()
  const tileMatrixSet = first(first(block, 'TileMatrixSetLink') ?? '', 'TileMatrixSet')
  const legends = openTags(block, 'LegendURL')
  const legend = legends.find((l) => l.format === 'image/svg+xml' && /horizontal/.test(l['xlink:role'] ?? '')) ?? legends[0] ?? null
  // Mỗi lớp có vài mẫu địa chỉ ô ảnh; ưu tiên mẫu có chỗ điền ngày {Time}.
  const tileResources = openTags(block, 'ResourceURL').filter((r) => r.resourceType === 'tile')
  const tileResource = tileResources.find((r) => r.template?.includes('{Time}')) ?? tileResources[0] ?? null
  return {
    id: first(own, 'ows:Identifier'),
    title: first(own, 'ows:Title'),
    formats: blocks(own, 'Format').map((f) => f.trim()),
    tileMatrixSet,
    maxZoom: maxZoomOf[tileMatrixSet] ?? null,
    hasTime: Boolean(dimension),
    defaultDate: dimension ? first(dimension, 'Default') : null,
    firstDate: ranges.length ? ranges.map((r) => r[0]).sort()[0] : null,
    latestDate: ends.length ? ends[ends.length - 1] : null,
    period: ranges.length ? (ranges[ranges.length - 1][2] ?? null) : null,
    legendUrl: legend?.['xlink:href'] ?? null,
    tileTemplate: tileResource?.template ?? null,
    tileFormat: tileResource?.format ?? null,
  }
}

export function parseCapabilities(xml) {
  const maxZoomOf = tileMatrixSets(xml)
  const layers = blocks(xml, 'Layer').map((b) => parseLayer(b, maxZoomOf)).filter((l) => l.id)
  return { layers, tileMatrixSetCount: Object.keys(maxZoomOf).length }
}

/** Các lớp của một nhóm. Thứ tự: lớp theo ngày/tháng trước lớp theo giờ, rồi ảnh mới nhất trước. */
export function findLayers(layers, group) {
  const subDaily = (l) => (String(l.period ?? '').startsWith('PT') ? 1 : 0)
  return layers
    .filter((l) => group.all.every((re) => re.test(`${l.id} ${l.title}`)))
    .sort((a, b) => subDaily(a) - subDaily(b) || String(b.latestDate ?? '').localeCompare(String(a.latestDate ?? '')) || a.id.localeCompare(b.id))
}

/** Toạ độ ô ảnh (cột x, hàng y) chứa một điểm ở mức zoom z, theo lưới Web Mercator chuẩn. */
export function tileOf(lat, lon, z) {
  const n = 2 ** z
  const rad = (lat * Math.PI) / 180
  const x = Math.floor(((lon + 180) / 360) * n)
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)
  return { x, y }
}

/** Địa chỉ một ô ảnh của lớp, dựng từ CHÍNH mẫu địa chỉ ghi trong capabilities. */
export function tileUrl(layer, lat, lon, zoom = 6) {
  if (!layer.tileTemplate) return null
  const z = Math.min(zoom, layer.maxZoom ?? zoom)
  const { x, y } = tileOf(lat, lon, z)
  return layer.tileTemplate
    .replace('{Time}', layer.defaultDate ?? 'default')
    .replace('{TileMatrixSet}', layer.tileMatrixSet)
    .replace('{TileMatrix}', z)
    .replace('{TileRow}', y)
    .replace('{TileCol}', x)
}
