// Dữ liệu thực và metadata kiểm chứng cho bộ 22 lớp bản đồ ĐBSCL (lưới ~5 km) và nhãn GRACE thiếu chi tiết.
// Tiền tố công khai: EM_ / em* (để tránh trùng tên khi build-site.mjs gộp các module).

export const EM_AVAILABLE_KEYS = [
  'elev', 'soilType', 'soilPh', 'soilSoc', 'soilClay', 'soilNitrogen',
  'soil', 'soilRoot', 'esi', 'rain', 'flood3d', 'floodHaz',
  'ndvi', 'evi', 'lai', 'fpar', 'gpp', 'landCover', 'biomass', 'lst', 'cold', 'soilTemp',
]

export const EM_FILTER_GROUPS = [
  { id: 'soilTerrain', keys: ['elev', 'soilType', 'soilPh', 'soilSoc', 'soilClay', 'soilNitrogen'] },
  { id: 'waterFlood', keys: ['soil', 'soilRoot', 'esi', 'rain', 'flood3d', 'floodHaz'] },
  { id: 'vegClimate', keys: ['ndvi', 'evi', 'lai', 'fpar', 'gpp', 'landCover', 'biomass', 'lst', 'cold', 'soilTemp'] },
]

export const EM_ELEV_BUCKETS = [
  { max: 0.5, hex: '#1565C0', label: { vi: '< 0,5 m (vùng trũng thấp)', en: '< 0.5 m (very low basin)' } },
  { max: 1.0, hex: '#42A5F5', label: { vi: '0,5 – 1,0 m (đồng bằng thấp)', en: '0.5 – 1.0 m (low floodplain)' } },
  { max: 1.5, hex: '#66BB6A', label: { vi: '1,0 – 1,5 m (đồng bằng trung bình)', en: '1.0 – 1.5 m (mid plain)' } },
  { max: 2.5, hex: '#FDD835', label: { vi: '1,5 – 2,5 m (thềm / phù sa cao)', en: '1.5 – 2.5 m (elevated alluvial)' } },
  { max: Infinity, hex: '#EF6C00', label: { vi: '≥ 2,5 m (giồng cát / gò cao)', en: '≥ 2.5 m (beach ridges / high ground)' } },
]

export function emElevTier(elevM) {
  if (!Number.isFinite(elevM)) return null
  return EM_ELEV_BUCKETS.find((b) => elevM < b.max) || EM_ELEV_BUCKETS[EM_ELEV_BUCKETS.length - 1]
}

export const EM_FILTER_META = {
  ndvi: {
    key: 'ndvi',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS (gibs.earthdata.nasa.gov)', en: 'NASA MODIS (gibs.earthdata.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · MODIS', en: 'NASA EOSDIS GIBS · MODIS' },
    datasetName: 'MODIS_Terra_L3_NDVI_16Day (MOD13Q1)',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod13.php',
    nativeRes: { vi: '250 m (gốc MOD13Q1) → ô lưới 5 km', en: '250 m (MOD13Q1) → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 16 ngày · mốc 16/10/2026', en: '16-day composite · 2026-10-16' },
    units: { vi: 'Bảng màu NDVI gốc GIBS (không quy đổi số)', en: 'Native GIBS NDVI color scale (no RGB-to-number inversion)' },
    caveat: {
      vi: 'Ô trong suốt là vùng mây che hoặc mặt nước bị che trong kỳ 16 ngày; không nội suy lấp chỗ trống.',
      en: 'Transparent cells indicate clouds or masked water in the 16-day composite; missing cells are left uninterpolated.',
    },
  },
  rain: {
    key: 'rain',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA GPM IMERG (gpm.nasa.gov)', en: 'NASA GPM IMERG (gpm.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · GPM IMERG', en: 'NASA EOSDIS GIBS · GPM IMERG' },
    datasetName: 'IMERG_Precipitation_Rate (vệ tinh GPM)',
    url: 'https://gpm.nasa.gov/data/imerg',
    nativeRes: { vi: '0,1° (~11 km) → ô lưới 5 km', en: '0.1° (~11 km) → 5 km grid' },
    dateLabel: { vi: 'Ảnh cường độ mưa ngày 13/11/2026', en: 'Precipitation rate snapshot · 2026-11-13' },
    units: { vi: 'Mức màu GPM GIBS (không quy đổi RGB thành mm/giờ)', en: 'GPM GIBS color tiers (no RGB-to-mm/hr inversion)' },
    caveat: {
      vi: 'Đây là ảnh cường độ mưa 1 ngày (13/11/2026), KHÔNG phải tổng lượng mưa năm hay mưa cực đoan nhiều năm. Ô trống = không phát hiện mưa lúc chụp; chỉ phân nhóm theo màu GIBS gốc.',
      en: 'Single-day snapshot (2026-11-13), NOT multi-year annual/extreme rainfall. Blank cells = no rain detected; colored tiers are ordinal GIBS groupings only.',
    },
  },
  soil: {
    key: 'soil',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA SMAP L4 (nsidc.org)', en: 'NASA SMAP L4 (nsidc.org)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · SMAP L4 / NSIDC', en: 'NASA EOSDIS GIBS · SMAP L4 / NSIDC' },
    datasetName: 'SMAP_L4_Analyzed_Surface_Soil_Moisture (SPL4SMAU)',
    url: 'https://nsidc.org/data/spl4smau/versions/8',
    nativeRes: { vi: '9 km (mô hình đồng hóa) → ô lưới 5 km', en: '9 km (assimilated model) → 5 km grid' },
    dateLabel: { vi: 'Mốc 12:00 UTC ngày 10/11/2026', en: '12:00 UTC · 2026-11-10' },
    units: { vi: 'Mức màu SMAP GIBS lớp mặt 0–5 cm (không quy đổi số RGB)', en: 'SMAP GIBS 0–5 cm surface color tiers (no RGB numeric inversion)' },
    caveat: {
      vi: 'Sản phẩm đồng hóa mô hình 9 km lớp đất mặt (0–5 cm) phân nhóm tương đối theo màu GIBS gốc, không thay thế đo ẩm tầng rễ tại từng thửa ruộng.',
      en: '9 km assimilated surface-layer model (0–5 cm) grouped into relative GIBS color tiers; does not replace field-scale root-zone sensors.',
    },
  },
  lst: {
    key: 'lst',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS LST Ngày (modis.gsfc.nasa.gov)', en: 'NASA MODIS Day LST (modis.gsfc.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · MODIS MOD11A2 Day', en: 'NASA EOSDIS GIBS · MODIS MOD11A2 Day' },
    datasetName: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod11.php',
    nativeRes: { vi: '1 km → ô lưới 5 km', en: '1 km → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 8 ngày · mốc 01/11/2026', en: '8-day daytime composite · 2026-11-01' },
    units: { vi: 'Mức màu nhiệt bề mặt ban ngày GIBS (không quy đổi °C/K)', en: 'GIBS daytime LST color tiers (no RGB-to-temp inversion)' },
    caveat: {
      vi: 'Là nhiệt độ bề mặt đất (LST) nhìn từ vệ tinh lúc trời quang (khác nhiệt độ không khí 2 m); ô trống là nơi bị mây che suốt 8 ngày.',
      en: 'Measures clear-sky land skin temperature (LST), not 2 m air temperature; blank cells were cloud-obscured during the 8-day window.',
    },
  },
  cold: {
    key: 'cold',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS LST Đêm (modis.gsfc.nasa.gov)', en: 'NASA MODIS Night LST (modis.gsfc.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · MODIS MOD11A2 Night', en: 'NASA EOSDIS GIBS · MODIS MOD11A2 Night' },
    datasetName: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Night',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod11.php',
    nativeRes: { vi: '1 km → ô lưới 5 km', en: '1 km → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 8 ngày ban đêm · mốc 01/11/2026', en: '8-day nighttime composite · 2026-11-01' },
    units: { vi: 'Mức màu nhiệt bề mặt ban đêm GIBS (không quy đổi °C/K)', en: 'GIBS nighttime LST color tiers (no RGB-to-temp inversion)' },
    caveat: {
      vi: 'Chỉ đo nhiệt độ bề mặt đất ban đêm từ MODIS (LST_Night), KHÔNG đo trực tiếp sương mù hay sương muối tại đồng ruộng.',
      en: 'Measures MODIS nighttime skin temperature (LST_Night) only — NOT direct fog or ground-frost observations.',
    },
  },
  esi: {
    key: 'esi',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA / USDA SERVIR (gis1.servirglobal.net)', en: 'NASA / USDA SERVIR (gis1.servirglobal.net)' },
    shortOrg: { vi: 'NASA · USDA ARS · SERVIR Global', en: 'NASA · USDA ARS · SERVIR Global' },
    datasetName: 'SERVIR_Global_ESI_4WK (DFPPM_AQUA_4WK_2026120)',
    url: 'https://www.drought.gov/data-maps-tools/evaporative-stress-index-esi',
    nativeRes: { vi: '5 km (0,05°) khớp chuẩn ô hiển thị', en: '5 km (0.05°) native grid' },
    dateLabel: { vi: 'Cuối mùa khô 4 tuần · 30/04/2026', en: '4-week dry-season composite · 2026-04-30' },
    units: { vi: 'Chỉ số bất thường bốc thoát hơi (ESI anomaly)', en: 'ET anomaly index (SERVIR 4-week ESI)' },
    caveat: {
      vi: 'Dùng lát cắt cuối mùa khô 30/04/2026 (86,6% ĐBSCL ít mây thay vì ảnh tháng 7 nhiều mây). Không phải tỷ lệ ECOSTRESS 0–1.',
      en: 'Uses late dry-season 2026-04-30 composite (86.6% clear over MD instead of cloudy July pass). Not the ECOSTRESS 0–1 ratio.',
    },
  },
  soilType: {
    key: 'soilType',
    status: 'available',
    scope: 'dbscl',
    badge: { vi: 'Open Dev. Mekong · UN FAO (ĐBSCL)', en: 'Open Dev. Mekong · UN FAO (MD)' },
    shortOrg: { vi: 'Open Development Mekong · UN FAO DSMW v3.6', en: 'Open Development Mekong · UN FAO DSMW v3.6' },
    datasetName: 'Soil types in Vietnam (CC-BY-SA-4.0)',
    url: 'https://data.opendevelopmentmekong.net/dataset/soil-types-in-vietnam',
    nativeRes: { vi: 'Bản đồ vùng đất FAO 1:5.000.000 → ô 5 km', en: 'FAO polygon map 1:5,000,000 → 5 km grid' },
    dateLabel: { vi: 'UN FAO DSMW v3.6 (bộ dữ liệu mở VN)', en: 'UN FAO DSMW v3.6 (Vietnam open dataset)' },
    units: { vi: 'Mã nhóm đất FAO (phù sa, gley, phèn/lợ Jt, than bùn)', en: 'FAO soil unit codes (Fluvisols, Gleysols, Thionic, Histosols)' },
    caveat: {
      vi: 'Phản ánh nhóm đất tổng quát toàn ĐBSCL; ranh mặn động g/L theo từng mùa khô (SIWRR / Zenodo 382 MB) CHƯA vẽ trên lưới 5 km.',
      en: 'Shows static FAO soil groups across MD; dynamic dry-season g/L salinity intrusion lines (SIWRR / Zenodo) are NOT plotted on this 5 km grid.',
    },
  },
  elev: {
    key: 'elev',
    status: 'available',
    scope: 'dbscl',
    badge: { vi: 'PANGAEA · Minderhoud 2019 (ĐBSCL)', en: 'PANGAEA · Minderhoud 2019 (MD)' },
    shortOrg: { vi: 'PANGAEA · Minderhoud et al. 2019 (ĐBSCL)', en: 'PANGAEA · Minderhoud et al. 2019 (MD)' },
    datasetName: 'Mekong Delta Topo DEM 500 m (CC-BY-4.0)',
    url: 'https://doi.pangaea.de/10.1594/PANGAEA.902136',
    nativeRes: { vi: '500 m (gốc DEM quốc gia) → trung bình mỗi ô 5 km', en: '500 m national DEM → 5 km cell mean' },
    dateLabel: { vi: 'Bản đồ địa hình 2014 · công bố PANGAEA 2019', en: '2014 topo map · published PANGAEA 2019' },
    units: { vi: 'Mét so với mốc chuẩn Hòn Dấu (m)', en: 'Meters above Hon Dau tidal datum (m)' },
    caveat: {
      vi: 'DEM nội suy bản đồ địa hình 2014 (trừ lòng sông/núi đá); chưa cộng sụt lún mới sau 2014 và không phải độ sâu ngập hiện thời.',
      en: 'Interpolated 2014 topo DEM (rivers/bedrock excluded); post-2014 subsidence is uncorrected and height alone is not flood depth.',
    },
  },
  grace: {
    key: 'grace',
    status: 'insufficient',
    scope: 'nasa',
    badge: { vi: 'Thiếu dữ liệu 5 km · NASA GRACE', en: 'Insufficient for 5 km · NASA GRACE' },
    shortOrg: { vi: 'NASA JPL · GRACE Tellus Mascon CRI', en: 'NASA JPL · GRACE Tellus Mascon CRI' },
    datasetName: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI',
    url: 'https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/',
    nativeRes: { vi: 'Mascon 3° (~330 km) trên lưới 0,5° — KHÔNG đủ cho lưới 5 km', en: '3° mascon (~330 km) on 0.5° grid — too coarse for 5 km' },
    dateLabel: { vi: 'Dữ liệu lịch sử đóng băng mốc 01/07/2022', en: 'Frozen historical snapshot · 2022-07-01' },
    units: { vi: 'Không vẽ lưới 5 km để tránh sai sự thật', en: 'Not plotted at 5 km to avoid false precision' },
    caveat: {
      vi: 'Toàn bộ 1.624 ô ĐBSCL chỉ rơi vào 3 khối màu lớn của GRACE (3° ~330 km), không thể phân tách túi nước ngọt từng vùng hay từng xã. Cần số liệu quan trắc giếng khoan DWRPIS / NAWAPI.',
      en: 'All 1,624 Mekong Delta cells fall into just 3 coarse GRACE blocks (3° ~330 km) — cannot represent local aquifers. Requires DWRPIS/NAWAPI borehole data.',
    },
  },
}

const emIndexCache = new WeakMap()

function emGetEnvMap(envMap) {
  if (envMap) return envMap
  return typeof PRECOMPUTED !== 'undefined' ? PRECOMPUTED?.envMap : null
}

export function emEnsureIndex(envMap) {
  const src = emGetEnvMap(envMap)
  if (!src) return null
  if (emIndexCache.has(src)) return emIndexCache.get(src)
  const layers = {}
  for (const [key, layer] of Object.entries(src.layers || {})) {
    const map = new Map()
    if (layer.kind === 'elev') {
      for (const [i, j, elevM, sampleCount] of layer.cells || []) {
        const tier = emElevTier(elevM)
        map.set(`${i}:${j}`, { hex: tier.hex, rawHex: tier.hex, elevM, sampleCount, tier })
      }
    } else if (layer.kind === 'soilType') {
      const classes = layer.classes || []
      const bands = EM_LAYER_BANDS.soilType || []
      for (const [i, j, idx] of layer.cells || []) {
        const cls = classes[idx]
        if (!cls) continue
        const bi = emSoilTypeBandIndex(cls.code)
        const dispHex = bands[bi]?.hex || cls.hex
        map.set(`${i}:${j}`, { hex: dispHex, rawHex: cls.hex, cls, bandIndex: bi })
      }
    } else if (layer.kind === 'raster') {
      const palette = layer.palette || []
      const bands = EM_LAYER_BANDS[key] || []
      for (const [i, j, idx] of layer.cells || []) {
        const rawHex = palette[idx]
        if (!rawHex) continue
        const bi = emClassifyRasterHex(key, rawHex)
        const dispHex = (bi != null && bands[bi]?.hex) ? bands[bi].hex : rawHex
        map.set(`${i}:${j}`, { hex: dispHex, rawHex, bandIndex: bi })
      }
    }
    layers[key] = map
  }
  const entry = { grid: src.grid, layers }
  emIndexCache.set(src, entry)
  return entry
}

export function emSnapIndex(grid, lat, lon) {
  if (!grid || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const i = Math.floor(lat / grid.dLat)
  const j = Math.floor(lon / grid.dLon)
  return { i, j }
}

export function emCellAt(envMap, layerKey, lat, lon) {
  const meta = EM_FILTER_META[layerKey]
  if (!meta) return { status: 'missing', missing: true, hex: null }
  if (meta.status === 'insufficient') {
    return { status: 'insufficient', missing: true, hex: null, meta }
  }
  const src = emGetEnvMap(envMap)
  const idx = emEnsureIndex(src)
  const snapped = emSnapIndex(idx?.grid, lat, lon)
  if (!snapped) return { status: 'available', missing: true, hex: null, meta }
  const cell = idx?.layers?.[layerKey]?.get(`${snapped.i}:${snapped.j}`)
  if (!cell) {
    return { status: 'available', missing: true, hex: null, i: snapped.i, j: snapped.j, meta }
  }
  return {
    status: 'available',
    missing: false,
    i: snapped.i,
    j: snapped.j,
    hex: cell.hex,
    rawHex: cell.rawHex || cell.hex,
    bandIndex: cell.bandIndex,
    elevM: cell.elevM,
    sampleCount: cell.sampleCount,
    tier: cell.tier,
    soilClass: cell.cls,
    meta,
  }
}

export function emLayerStats(envMap, layerKey) {
  const src = emGetEnvMap(envMap)
  const meta = EM_FILTER_META[layerKey]
  const raw = src?.layers?.[layerKey]
  const totalDeltaCells = src?.grid?.totalDeltaCells ?? 1624
  if (!meta) return null
  return {
    key: layerKey,
    meta,
    totalDeltaCells,
    coveredCells: raw?.coveredCells ?? 0,
    missingCells: Math.max(0, totalDeltaCells - (raw?.coveredCells ?? 0)),
    distinctColors: raw?.distinctColors ?? 0,
    legendUrl: raw?.legendUrl ?? null,
    legendDataUrl: raw?.legendDataUrl ?? null,
    classes: raw?.classes ?? null,
    minElevM: raw?.minElevM ?? null,
    maxElevM: raw?.maxElevM ?? null,
  }
}

export const EM_LAYER_BANDS = {
  elev: EM_ELEV_BUCKETS.map((b) => ({
    hex: b.hex,
    label: b.label,
    desc: { vi: 'Cao độ trung bình 500 m quy chuẩn mực nước Hòn Dấu.', en: '500 m national DEM mean referenced to Hon Dau tidal datum.' },
  })),
  soilType: [
    { hex: '#1D6FA5', label: { vi: 'Xanh dương đậm (Ge56-3a) · Đất sét lầy giàu dinh dưỡng', en: 'Deep blue (Ge56-3a) · Nutrient-rich Eutric Gleysols' }, desc: { vi: 'Đất sét giữ nước rất tốt thuộc nhóm Gleysols phổ biến ở đồng bằng.', en: 'Water-retentive clay plains belonging to FAO Eutric Gleysols.' } },
    { hex: '#38B2AC', label: { vi: 'Xanh ngọc (Ge55-3a) · Đất sét lầy điển hình', en: 'Teal (Ge55-3a) · Typical Eutric Gleysols' }, desc: { vi: 'Đất sét đồng bằng vùng trũng, hợp lúa nước hoặc lên liếp thoát nước.', en: 'Lowland clay plains suited to paddy or ridged orchards.' } },
    { hex: '#D9480F', label: { vi: 'Đỏ cam đậm (Jt13-3a) · Đất phèn / mặn tiềm tàng nặng', en: 'Deep orange-red (Jt13-3a) · Heavy Thionic Fluvisols' }, desc: { vi: 'Nhóm đất phèn/lợ mặn nặng theo bản đồ FAO; bắt buộc kiểm tra pH và ECe tại ruộng.', en: 'Strong potential acid sulfate / brackish unit; check local pH and ECe.' } },
    { hex: '#F59F00', label: { vi: 'Vàng hổ phách (Jt14-3a) · Đất phèn / lợ nhẹ', en: 'Amber (Jt14-3a) · Moderate Thionic Fluvisols' }, desc: { vi: 'Đất phèn/mặn nhẹ vùng chuyển tiếp; chú ý rửa phèn đầu vụ.', en: 'Moderate brackish/acid-sulfate unit; flush salts/acid before sowing.' } },
    { hex: '#74C69D', label: { vi: 'Xanh lá non (Je72-2a) · Đất phù sa ngọt hạt trung bình', en: 'Mint green (Je72-2a) · Medium-textured Eutric Fluvisols' }, desc: { vi: 'Đất phù sa ven sông thoáng khí và phì nhiêu, rất hợp cây ăn trái và màu.', en: 'Well-aerated fertile riverine alluvium ideal for orchards and upland crops.' } },
    { hex: '#1B7F37', label: { vi: 'Xanh lục đậm (Je73-3a) · Đất phù sa ngọt hạt mịn', en: 'Forest green (Je73-3a) · Fine-textured Eutric Fluvisols' }, desc: { vi: 'Đất phù sa mịn giàu dinh dưỡng, giữ ẩm bền cho lúa và cây công nghiệp.', en: 'Fine-textured fertile alluvium supporting intensive rice and fruit crops.' } },
    { hex: '#7B2CBF', label: { vi: 'Tím sẫm (Od21-a) · Đất hữu cơ / than bùn', en: 'Deep purple (Od21-a) · Organic peat Dystric Histosols' }, desc: { vi: 'Đất giàu mùn hữu cơ / than bùn (khu vực U Minh).', en: 'Peaty, organic-rich soils typical of U Minh wetlands.' } },
    { hex: '#A6761D', label: { vi: 'Nâu vàng (Ag / Ao / Af) · Đất xám bạc màu vùng rìa', en: 'Ochre-brown (Ag / Ao / Af) · Grey Acrisols' }, desc: { vi: 'Đất xám vùng chuyển tiếp cao hơn ở rìa bắc/tây bắc ĐBSCL.', en: 'More weathered upland-margin grey soils along northern Mekong Delta.' } },
  ],
  soilPh: [
    { hex: '#D62828', label: { vi: 'Đỏ cam · Dải rất chua / phèn mạnh (mức màu 1/6)', en: 'Crimson · Strongly acidic tier (band 1/6)' }, desc: { vi: 'Dải màu biểu thị độ chua rất mạnh trên bản đồ gốc; vùng nghi có phèn/nhôm cần kiểm tra pH thực tế, bón vôi và rửa phèn.', en: 'WMS color tier indicating strong acidity; verify field pH, flush acidity, and lime where acid-sulfate soils occur.' } },
    { hex: '#F77F00', label: { vi: 'Cam đậm · Dải đất chua (mức màu 2/6)', en: 'Orange · Acidic topsoil tier (band 2/6)' }, desc: { vi: 'Dải màu biểu thị đất chua rõ rệt; cân nhắc bón lót vôi và lân trước khi xuống giống rau màu/đậu.', en: 'Color tier indicating marked acidity; consider basal lime and phosphorus before vegetables/legumes.' } },
    { hex: '#FCBF49', label: { vi: 'Vàng nghệ · Dải chua vừa (mức màu 3/6)', en: 'Amber-gold · Moderately acidic tier (band 3/6)' }, desc: { vi: 'Dải chua vừa phổ biến vùng phù sa nhiễm phèn nhẹ; hợp lúa, khóm, mía hoặc bổ sung vôi nhẹ cho rau màu.', en: 'Moderately acidic color tier; fits rice and pineapple, or light liming for melons and orchards.' } },
    { hex: '#80B918', label: { vi: 'Xanh cốm · Dải ít chua (mức màu 4/6)', en: 'Lime green · Slightly acidic tier (band 4/6)' }, desc: { vi: 'Dải màu biểu thị lớp đất mặt ít chua, tương đối thuận lợi cho đa số cây trồng ĐBSCL.', en: 'Color tier indicating slight acidity, generally favorable for most Mekong Delta crops.' } },
    { hex: '#2A9D8F', label: { vi: 'Xanh lục ngọc · Dải gần trung tính (mức màu 5/6)', en: 'Teal · Near-neutral tier (band 5/6)' }, desc: { vi: 'Dải gần trung tính, thuận lợi cho cây ăn trái, họ đậu, bắp và rau màu.', en: 'Near-neutral color tier favorable for orchards, legumes, maize, and vegetables.' } },
    { hex: '#1D6FA5', label: { vi: 'Xanh lam · Dải trung tính–kiềm nhẹ (mức màu 6/6)', en: 'Blue · Neutral to slightly alkaline tier (band 6/6)' }, desc: { vi: 'Dải màu pH cao nhất trong 6 mức hiển thị của lớp SoilGrids; đo pH đất thực tế để chỉnh liều phân.', en: 'Highest pH color tier in the 6-band display; confirm actual soil pH for fertilizer planning.' } },
  ],
  soilSoc: [
    { hex: '#F3D58D', label: { vi: 'Vàng kem · Dải hữu cơ nền thấp (mức màu 1/5)', en: 'Warm cream · Low organic carbon tier (band 1/5)' }, desc: { vi: 'Nền mùn thấp theo phân tầng màu WMS; cần vùi rơm hoai, phân hữu cơ hoặc trồng xen họ đậu.', en: 'WMS color tier indicating low background humus; incorporate compost or legume cover crops.' } },
    { hex: '#E09F3E', label: { vi: 'Cam đất · Dải hữu cơ trung bình (mức màu 2/5)', en: 'Ochre · Moderate organic carbon tier (band 2/5)' }, desc: { vi: 'Hữu cơ ở mức trung bình theo bản đồ SoilGrids; giữ chế độ trả rơm lại đồng để ổn định đất.', en: 'Moderate background SOC color tier; retain crop residues to maintain tilth.' } },
    { hex: '#C86D51', label: { vi: 'Đồng đỏ · Dải hữu cơ khá (mức màu 3/5)', en: 'Terracotta · Fairly rich SOC tier (band 3/5)' }, desc: { vi: 'Dải màu biểu thị nền hữu cơ khá, hỗ trợ giữ ẩm và giữ phân cho lúa lẫn cây ăn trái.', en: 'Fairly rich SOC color tier supporting moisture retention and nutrient holding.' } },
    { hex: '#7F4F24', label: { vi: 'Nâu sẫm · Dải giàu hữu cơ (mức màu 4/5)', en: 'Deep brown · Rich organic carbon tier (band 4/5)' }, desc: { vi: 'Đất giàu mùn hữu cơ theo bản đồ vùng; chú ý thoát nước mùa mưa và cân đối phân.', en: 'Humus-rich color tier; keep drainage channels open in rainy months.' } },
    { hex: '#4A148C', label: { vi: 'Tím than · Dải rất giàu mùn / than bùn (mức màu 5/5)', en: 'Deep violet · Peaty / very high SOC tier (band 5/5)' }, desc: { vi: 'Dải màu cao nhất của lớp SOC (điển hình vùng than bùn U Minh/trũng sâu); tránh ngập yếm khí kéo dài.', en: 'Highest SOC color tier (typical of humic wetlands); avoid prolonged root anoxia.' } },
  ],
  soilClay: [
    { hex: '#F4D35E', label: { vi: 'Vàng cát · Dải thịt pha sét nhẹ (mức màu 1/5)', en: 'Sandy gold · Lighter clay fraction tier (band 1/5)' }, desc: { vi: 'Dải màu tỷ lệ sét thấp nhất vùng trên SoilGrids, thường tơi thoáng hơn cho rau màu và cây ăn trái.', en: 'Lowest clay-fraction color tier in the delta, generally better drained for vegetables and orchards.' } },
    { hex: '#EE964B', label: { vi: 'Cam hổ phách · Dải sét trung bình (mức màu 2/5)', en: 'Amber-orange · Medium clay tier (band 2/5)' }, desc: { vi: 'Dải màu trung gian giữa giữ ẩm và thoát nước; hợp luân canh lúa – màu.', en: 'Intermediate clay color tier suited to rice–upland rotation.' } },
    { hex: '#C85A32', label: { vi: 'Đỏ gạch · Dải sét khá nặng (mức màu 3/5)', en: 'Brick red · Clay-rich tier (band 3/5)' }, desc: { vi: 'Dải sét khá nặng, giữ nước tốt; lên mô/liếp cao hơn mặt mương khi trồng cây ăn trái.', en: 'Water-retentive clay tier; use raised orchard mounds with drainage ditches.' } },
    { hex: '#7F2B1D', label: { vi: 'Nâu đỏ đậm · Dải đất sét nặng (mức màu 4/5)', en: 'Maroon · Heavy clay tier (band 4/5)' }, desc: { vi: 'Thoát nước chậm khi mưa dầm; cần mương thoát nước sâu nếu chuyển sang cây cạn.', en: 'Slow drainage under heavy rain; cut deep furrows for upland sowing.' } },
    { hex: '#3D1E3A', label: { vi: 'Tím nâu sẫm · Dải sét rất nặng (mức màu 5/5)', en: 'Dark plum · Very heavy clay tier (band 5/5)' }, desc: { vi: 'Dải màu hàm lượng sét cao nhất bản đồ; giữ nước mặt tốt cho lúa, dễ nứt nẻ mùa khô nếu thiếu phủ rơm.', en: 'Highest clay color tier; holds paddy water well, mulch in dry season to curb cracking.' } },
  ],
  soilNitrogen: [
    { hex: '#E9D8A6', label: { vi: 'Vàng nhạt · Dải đạm tổng nền thấp (mức màu 1/5)', en: 'Sand · Low background N tier (band 1/5)' }, desc: { vi: 'Dải màu đạm hữu cơ nền thấp trên SoilGrids; ưu tiên luân canh họ đậu cố định đạm (lấy mẫu đất nếu cần định lượng).', en: 'Low background N color tier; include nitrogen-fixing legumes in rotation.' } },
    { hex: '#94D2BD', label: { vi: 'Xanh cốm · Dải đạm nền trung bình (mức màu 2/5)', en: 'Soft mint · Moderate background N tier (band 2/5)' }, desc: { vi: 'Nền đạm ở mức vừa theo phân tầng màu; chia nhỏ đợt bón thúc theo giai đoạn sinh trưởng.', en: 'Moderate background N color tier; apply split top-dressings by growth stage.' } },
    { hex: '#2A9D8F', label: { vi: 'Xanh ngọc · Dải đạm nền khá (mức màu 3/5)', en: 'Teal · Fairly rich N tier (band 3/5)' }, desc: { vi: 'Cân đối đạm nền khá theo bản đồ vùng; theo dõi màu lá thực tế khi bón thúc.', en: 'Solid background N color tier; confirm crop leaf status before top-dressing.' } },
    { hex: '#1D6FA5', label: { vi: 'Xanh lam · Dải giàu đạm nền (mức màu 4/5)', en: 'Blue · Rich background N tier (band 4/5)' }, desc: { vi: 'Dải màu giàu đạm hữu cơ nền; tiết chế urê đầu vụ để hạn chế sâu bệnh và lốp đổ.', en: 'Rich background N color tier; moderate early urea to avoid lodging and pests.' } },
    { hex: '#1D3557', label: { vi: 'Chàm đậm · Dải rất giàu đạm hữu cơ (mức màu 5/5)', en: 'Indigo · Very rich organic N tier (band 5/5)' }, desc: { vi: 'Dải cao nhất (thường đi cùng vùng giàu mùn/than bùn); chú ý tỷ lệ đạm dễ tiêu thực tế và cân bằng K–Ca.', en: 'Highest organic-N color tier (often humic zones); balance potassium and calcium.' } },
  ],
  soil: [
    { hex: '#E9C46A', label: { vi: 'Vàng cam · Dải đất mặt ráo / ẩm nhẹ (mức màu 1/5)', en: 'Warm gold · Lightly moist surface tier (band 1/5)' }, desc: { vi: 'Dải màu GIBS SMAP L4 biểu thị lớp đất mặt 0–5 cm tương đối ráo hơn vùng xung quanh (không quy đổi thẳng ra m³/m³).', en: 'GIBS SMAP L4 color tier indicating relatively drier 0–5 cm surface soil (ordinal tier, not m³/m³).' } },
    { hex: '#4CC9F0', label: { vi: 'Xanh ngọc · Dải đất mặt ẩm vừa (mức màu 2/5)', en: 'Aqua cyan · Moderately moist surface tier (band 2/5)' }, desc: { vi: 'Dải màu biểu thị độ ẩm bề mặt 0–5 cm ở mức trung bình khá.', en: 'Color tier indicating moderately moist 0–5 cm topsoil.' } },
    { hex: '#1D4ED8', label: { vi: 'Xanh dương đậm · Dải đất mặt rất ẩm (mức màu 3/5)', en: 'Deep blue · High surface moisture tier (band 3/5)' }, desc: { vi: 'Đất mặt 0–5 cm rất ẩm theo phân tầng màu GIBS (thường gặp ở vùng giữ nước hoặc ruộng trũng).', en: 'High surface soil moisture color tier (0–5 cm), typical of wet paddy or lowlands.' } },
    { hex: '#1E1B4B', label: { vi: 'Chàm thẫm · Dải đất mặt đặc biệt ẩm (mức màu 4/5)', en: 'Midnight indigo · Very wet surface tier (band 4/5)' }, desc: { vi: 'Tầng đất mặt rất ướt theo phân tầng màu GIBS; hạn chế làm đất cơ giới nặng hoặc gieo cây cạn trực tiếp.', en: 'Very wet topsoil color tier; avoid heavy machinery or un-ridged upland sowing.' } },
    { hex: '#7B2CBF', label: { vi: 'Tím sẫm · Dải bão hòa / sát mặt ruộng (mức màu 5/5)', en: 'Deep purple · Saturated surface tier (band 5/5)' }, desc: { vi: 'Dải màu cao nhất của SMAP L4 đất mặt 0–5 cm, biểu thị nền đất rất ẩm hoặc sát bão hòa.', en: 'Highest 0–5 cm SMAP L4 color tier, indicating near-saturated surface conditions.' } },
  ],
  soilRoot: [
    { hex: '#52B788', label: { vi: 'Xanh lá · Dải ẩm tầng rễ vừa (mức màu 1/5)', en: 'Green · Balanced root moisture tier (band 1/5)' }, desc: { vi: 'Dải màu GIBS SMAP L4 biểu thị tầng rễ 0–100 cm thông thoáng hơn (không quy đổi thẳng ra m³/m³).', en: 'GIBS SMAP L4 color tier indicating relatively aerated 0–100 cm root zone (ordinal tier).' } },
    { hex: '#0096C7', label: { vi: 'Xanh da trời · Dải ẩm tầng rễ khá (mức màu 2/5)', en: 'Sky blue · Moist root zone tier (band 2/5)' }, desc: { vi: 'Dải màu biểu thị dự trữ ẩm sâu ở mức khá, chưa có dấu hiệu úng ngập rõ trên lớp GIBS.', en: 'Color tier indicating healthy deep moisture reserve without overt saturation.' } },
    { hex: '#1D4ED8', label: { vi: 'Xanh dương đậm · Dải tầng rễ ẩm cao (mức màu 3/5)', en: 'Royal blue · Wet root zone tier (band 3/5)' }, desc: { vi: 'Tầng rễ ẩm cao theo phân tầng màu GIBS; hợp lúa nước hoặc vườn có mương tiêu nước chủ động.', en: 'Wet subsoil color tier favoring paddy or orchards with drainage ditches.' } },
    { hex: '#311B92', label: { vi: 'Chàm tím · Dải tầng rễ rất ẩm (mức màu 4/5)', en: 'Deep violet · Very wet subsoil tier (band 4/5)' }, desc: { vi: 'Dải màu biểu thị tầng 0–100 cm rất ẩm; kiểm tra mực nước mương trước khi cây ra hoa.', en: 'Very wet subsoil color tier; check orchard ditch water levels before flowering.' } },
    { hex: '#6A040F', label: { vi: 'Đỏ rượu · Dải bão hòa / ngập úng tầng rễ (mức màu 5/5)', en: 'Burgundy · Saturated root zone tier (band 5/5)' }, desc: { vi: 'Dải màu cao nhất của SMAP L4 tầng rễ 0–100 cm; hợp lúa nước, sen, thủy sản hoặc đầm lầy.', en: 'Highest 0–100 cm SMAP L4 saturation color tier; suited to aquatic or paddy systems.' } },
  ],
  esi: [
    { hex: '#C1121F', label: { vi: 'Đỏ đậm · Thiếu hụt bốc thoát hơi nặng (ESI < -2)', en: 'Crimson · Severe evaporative stress (ESI < -2)' }, desc: { vi: 'Cây trồng thiếu ẩm bốc thoát hơi rõ rệt so với mức trung bình nhiều năm.', en: 'Strong negative evapotranspiration anomaly indicating moisture stress.' } },
    { hex: '#F77F00', label: { vi: 'Cam đậm · Khô hạn / thiếu ẩm vừa (-2 đến -1)', en: 'Orange · Moderate evaporative stress (-2 to -1)' }, desc: { vi: 'Lượng bốc thoát hơi thấp hơn trung bình, bắt đầu có dấu hiệu thiếu nước.', en: 'Below-normal evapotranspiration suggesting moderate drying stress.' } },
    { hex: '#FCBF49', label: { vi: 'Vàng nghệ · Hơi khô hơn trung bình (-1 đến 0)', en: 'Amber · Slightly drier than normal (-1 to 0)' }, desc: { vi: 'Bốc thoát hơi giảm nhẹ vào cuối mùa khô 30/04/2026.', en: 'Mildly below-normal evaporative flux at the end of dry season (2026-04-30).' } },
    { hex: '#A7C957', label: { vi: 'Xanh cốm · Bốc thoát hơi cân bằng (0 đến +1)', en: 'Light green · Near-normal moisture (0 to +1)' }, desc: { vi: 'Cân bằng bốc thoát hơi ổn định, không bất thường khô hạn.', en: 'Near-normal evapotranspiration balance without drought anomaly.' } },
    { hex: '#2A9D8F', label: { vi: 'Xanh ngọc · Đủ ẩm tốt hơn trung bình (+1 đến +2)', en: 'Teal · Moister than normal (+1 to +2)' }, desc: { vi: 'Tán cây thoát hơi thuận lợi, nguồn ẩm dồi dào hơn trung bình.', en: 'Favorable canopy evapotranspiration, wetter than multi-year norm.' } },
    { hex: '#1D4ED8', label: { vi: 'Xanh dương · Độ ẩm thực vật rất dồi dào (> +2)', en: 'Royal blue · Abundant canopy moisture (> +2)' }, desc: { vi: 'Chỉ số ESI dương cao, bề mặt thực vật đủ nước rất tốt.', en: 'High positive ESI indicating abundant surface and canopy moisture.' } },
  ],
  rain: [
    { hex: '#74C69D', label: { vi: 'Xanh ngọc nhạt · Dải mưa rất nhỏ (mức màu 1/5)', en: 'Pale mint · Very light rain tier (band 1/5)' }, desc: { vi: 'Phân tầng màu thấp nhất trong ảnh quét GPM ngày 13/11/2026 (không quy đổi thẳng ra mm/giờ).', en: 'Lowest rainfall color tier in the 2026-11-13 GPM snapshot (ordinal RGB tier).' } },
    { hex: '#2D6A4F', label: { vi: 'Xanh lá · Dải mưa nhỏ rải rác (mức màu 2/5)', en: 'Forest green · Light rain tier (band 2/5)' }, desc: { vi: 'Dải màu mưa nhẹ, giúp mát tán lá nhưng chưa đủ thay thế tưới khi đất khô.', en: 'Light shower color tier cooling leaves without substantial soil recharge.' } },
    { hex: '#0096C7', label: { vi: 'Xanh lam · Dải mưa vừa (mức màu 3/5)', en: 'Cyan blue · Moderate rain tier (band 3/5)' }, desc: { vi: 'Dải màu mưa trung bình trong ảnh chụp nhanh IMERG; dùng lượng mưa ngày NASA POWER để tính cán cân nước.', en: 'Moderate IMERG snapshot color tier; rely on NASA POWER daily rain for water budgets.' } },
    { hex: '#F77F00', label: { vi: 'Cam đậm · Dải mưa khá lớn (mức màu 4/5)', en: 'Orange · Moderately heavy rain tier (band 4/5)' }, desc: { vi: 'Dải mưa khá đậm tại giờ vệ tinh quét; kiểm tra cống thoát nước ruộng màu/liếp.', en: 'Brisk rain color tier at overpass; verify drainage outlets on upland beds.' } },
    { hex: '#D62828', label: { vi: 'Đỏ tươi · Dải mưa lớn cục bộ (mức màu 5/5)', en: 'Crimson · Heavy localized rain tier (band 5/5)' }, desc: { vi: 'Dải mưa cao nhất trong khung ảnh quét; lưu ý ngập úng cục bộ hoặc rửa trôi phân vừa bón.', en: 'Peak storm color tier in overpass; watch for runoff and fertilizer leaching.' } },
  ],
  flood3d: [
    { hex: '#94A3B8', label: { vi: 'Xám đá · Mây che / thiếu ảnh quang học', en: 'Slate grey · Cloud cover / insufficient optical data' }, desc: { vi: 'MODIS không xuyên được mây trong 3 ngày này — không phải xác nhận khô ráo.', en: 'Optical MODIS blocked by clouds in this 3-day window — cannot confirm dry ground.' } },
    { hex: '#00B4D8', label: { vi: 'Xanh ngọc sáng · Mặt nước sông kênh thường xuyên', en: 'Cyan · Permanent surface water' }, desc: { vi: 'Dòng sông lớn, kênh rạch hoặc ao nuôi thủy sản cố định trong ô 5 km.', en: 'Main river channels, canals, or permanent aquaculture water.' } },
    { hex: '#F59E0B', label: { vi: 'Vàng hổ phách · Vùng ngập lặp lại theo mùa lũ', en: 'Amber · Recurring seasonal floodwater' }, desc: { vi: 'Vùng ghi nhận nước ngập lặp lại vào mùa nổi; ưu tiên mô hình thích nghi lũ.', en: 'Area showing recurring flood signatures; favor flood-adapted crops or dyked plots.' } },
    { hex: '#DC2626', label: { vi: 'Đỏ tươi · Ngập lũ phát hiện trong 3 ngày', en: 'Red · Active 3-day floodwater detected' }, desc: { vi: 'Tín hiệu nước dâng trên nền đất canh tác trong chu kỳ 3 ngày.', en: 'Active floodwater footprint over agricultural land in the 3-day window.' } },
  ],
  floodHaz: [
    { hex: '#66BB6A', label: { vi: 'Xanh lá · Tần suất ngập lịch sử thấp (mức màu 1/4)', en: 'Green · Low historical flood tier (band 1/4)' }, desc: { vi: 'Ít sự kiện lũ lớn lịch sử (1985–2003) ở cấp vùng; vẫn cần xem mực triều cường và đê bao hiện tại.', en: 'Lower 1985–2003 regional flood recurrence tier; still check local tidal gates and dykes.' } },
    { hex: '#FDD835', label: { vi: 'Vàng · Tần suất lịch sử trung bình thấp (mức màu 2/4)', en: 'Yellow · Low-moderate historical tier (band 2/4)' }, desc: { vi: 'Có xuất hiện ngập theo đợt đỉnh lũ hoặc mưa cực đoan trong bộ dữ liệu lịch sử 1985–2003.', en: 'Occasional flooding during peak river surges in the static 1985–2003 dataset.' } },
    { hex: '#F77F00', label: { vi: 'Cam · Tần suất ngập lịch sử đáng kể (mức màu 3/4)', en: 'Orange · Notable historical flood tier (band 3/4)' }, desc: { vi: 'Vùng từng ngập mùa nổi khá đều (1985–2003); kiểm tra đê bao hiện hữu hoặc xuống giống né đỉnh lũ.', en: 'Notable historical flood zone (1985–2003); verify current dykes or avoid flood peak.' } },
    { hex: '#9B2226', label: { vi: 'Đỏ rượu · Tần suất ngập lịch sử cao (mức màu 4/4)', en: 'Dark crimson · High historical flood tier (band 4/4)' }, desc: { vi: 'Dải cao nhất trong nền rủi ro lũ tĩnh 1985–2003; kiểm tra cao trình đê bao địa phương trước khi lên vườn.', en: 'Highest tier in the static 1985–2003 hazard map; confirm local dyke elevation before planting.' } },
  ],
  ndvi: [
    { hex: '#C69C6D', label: { vi: 'Nâu cát · Đất trống, mặt nước hoặc mới cày xới', en: 'Tan · Bare soil, water, or freshly tilled' }, desc: { vi: 'Ít hoặc không có tán lá xanh tại thời điểm chụp 16 ngày.', en: 'Little or no green canopy during the 16-day window.' } },
    { hex: '#D9ED92', label: { vi: 'Vàng xanh · Cây mới lên hoặc tán thưa', en: 'Yellow-green · Emerging crop or sparse cover' }, desc: { vi: 'Độ phủ cây xanh đầu vụ hoặc đất ruộng mới bén rễ.', en: 'Low vegetation density (early growth or sparse canopy).' } },
    { hex: '#52B788', label: { vi: 'Xanh lá sáng · Cây trồng đang phát triển khá', en: 'Fresh green · Developing active crop canopy' }, desc: { vi: 'Thảm thực vật khép tán trung bình khá và sinh trưởng ổn định.', en: 'Moderately closed canopy with active vegetative growth.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Tán xanh dày khỏe mạnh', en: 'Emerald · Dense vigorous crop canopy' }, desc: { vi: 'Mật độ tán lá dày, quang hợp mạnh (lúa đang đòng/trổ hoặc vườn xanh tốt).', en: 'Dense green canopy in peak growth or well-kept orchard.' } },
    { hex: '#083D27', label: { vi: 'Lục thẫm · Thảm thực vật tối đa / rừng & vườn lâu năm', en: 'Deep pine · Peak lush biomass / forest or mature orchard' }, desc: { vi: 'Độ xanh và che phủ cao nhất đồng bằng; chú ý thông thoáng phòng nấm bệnh mùa ẩm.', en: 'Highest greenness density across the delta; prune for airflow in wet weather.' } },
  ],
  evi: [
    { hex: '#C69C6D', label: { vi: 'Nâu cát · Thực vật rất thưa / mặt nước (mức màu 1/5)', en: 'Tan · Bare soil / water tier (band 1/5)' }, desc: { vi: 'Độ phủ lá xanh rất ít theo phân tầng màu GIBS; thuận tiện làm đất hoặc gieo sạ chuẩn bị vụ mới.', en: 'Minimal green canopy color tier; open window for soil prep or seedbed establishment.' } },
    { hex: '#D4E09B', label: { vi: 'Vàng mạ · Tán non / thưa (mức màu 2/5)', en: 'Chartreuse · Sparse developing tier (band 2/5)' }, desc: { vi: 'Cây trồng đầu vụ đang vươn tán; giai đoạn cần giữ ẩm và trừ cỏ sớm.', en: 'Early vegetative cover color tier requiring moisture and weed control.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá sáng · Tán khá khỏe (mức màu 3/5)', en: 'Fresh green · Healthy canopy tier (band 3/5)' }, desc: { vi: 'Tán khép tương đối đều, sinh trưởng ổn định ở mức trung bình khá trên ảnh 16 ngày.', en: 'Evenly closed canopy color tier in the 16-day composite.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Sinh khối tán dày (mức màu 4/5)', en: 'Emerald · Thick canopy tier (band 4/5)' }, desc: { vi: 'Tán vườn cây ăn trái hoặc đồng ruộng sung sức cao.', en: 'Vigorous orchard or peak-stage field canopy color tier.' } },
    { hex: '#083D27', label: { vi: 'Lục thẫm · Sinh khối tán cực dày (mức màu 5/5)', en: 'Deep pine · Ultra-dense canopy tier (band 5/5)' }, desc: { vi: 'Dải EVI cao nhất trên bản đồ màu GIBS; chú ý tỉa cành hạ ẩm độ dưới tán.', en: 'Highest GIBS EVI color tier; prune interior branches for ventilation.' } },
  ],
  lai: [
    { hex: '#F9DC5C', label: { vi: 'Vàng tươi · Diện tích lá rất thấp (mức màu 1/5)', en: 'Bright yellow · Very sparse foliage tier (band 1/5)' }, desc: { vi: 'Tầng lá che phủ đất rất ít theo phân tầng màu LAI; nên phủ rơm giữ ẩm chống bốc hơi.', en: 'Exposed topsoil color tier; mulch to reduce evaporation.' } },
    { hex: '#B5E48C', label: { vi: 'Xanh non · Tán thưa vừa (mức màu 2/5)', en: 'Sprout green · Sparse-moderate tier (band 2/5)' }, desc: { vi: 'Độ dày tán vừa phải theo phân tầng màu GIBS, hợp xen canh cây họ đậu ngắn ngày giữa hàng.', en: 'Moderate leaf cover color tier allowing legume intercropping between rows.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá · Tán dày khá đều (mức màu 3/5)', en: 'Medium green · Developed canopy tier (band 3/5)' }, desc: { vi: 'Che phủ đất tốt giúp giảm cỏ dại và ổn định nhiệt ẩm tầng mặt.', en: 'Good cover color tier suppressing weeds and moderating topsoil heat.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Tán rất dày (mức màu 4/5)', en: 'Emerald · Dense multi-layer tier (band 4/5)' }, desc: { vi: 'Tán rậm che bóng mạnh; chọn cây chịu rợp bán phần nếu trồng xen.', en: 'Thick shade color tier; choose shade-tolerant understory crops.' } },
    { hex: '#0B3C49', label: { vi: 'Xanh thẫm · Tán rừng / vườn kín hoàn toàn (mức màu 5/5)', en: 'Deep teal · Closed canopy tier (band 5/5)' }, desc: { vi: 'Dải LAI cao nhất trên lớp màu GIBS; cần tỉa tán thông thoáng để hạn chế nấm bệnh.', en: 'Highest LAI color tier; prune to maintain airflow.' } },
  ],
  fpar: [
    { hex: '#FDE68A', label: { vi: 'Vàng nhạt · Hấp thụ bức xạ thấp (mức màu 1/5)', en: 'Pale gold · Low light capture tier (band 1/5)' }, desc: { vi: 'Đất trống, mặt nước hoặc ruộng mới gieo sạ theo phân tầng màu fPAR.', en: 'Lowest fPAR color tier (fallow, open water, or newly sown paddies).' } },
    { hex: '#F59E0B', label: { vi: 'Vàng cam · Hấp thụ trung bình (mức màu 2/5)', en: 'Amber · Moderate light capture tier (band 2/5)' }, desc: { vi: 'Tán cây thu nhận ánh sáng quang hợp ở mức trung bình trong ảnh 8 ngày.', en: 'Moderate PAR capture color tier in the 8-day composite.' } },
    { hex: '#84CC16', label: { vi: 'Xanh chanh · Hấp thụ khá cao (mức màu 3/5)', en: 'Lime · Good light capture tier (band 3/5)' }, desc: { vi: 'Cây trồng phát triển nhanh, tán đang mở rộng.', en: 'Actively expanding crop canopy color tier.' } },
    { hex: '#10B981', label: { vi: 'Xanh ngọc · Hấp thụ cao (mức màu 4/5)', en: 'Emerald · High light capture tier (band 4/5)' }, desc: { vi: 'Tán sử dụng bức xạ mặt trời hiệu quả trong giai đoạn tạo năng suất.', en: 'Efficient solar PAR capture color tier during yield formation.' } },
    { hex: '#065F46', label: { vi: 'Lục đậm · Quang hợp tối đa (mức màu 5/5)', en: 'Deep green · Peak PAR capture tier (band 5/5)' }, desc: { vi: 'Dải hấp thụ bức xạ quang hợp cao nhất trên lớp màu GIBS.', en: 'Highest GIBS fPAR capture color tier.' } },
  ],
  gpp: [
    { hex: '#E63946', label: { vi: 'Đỏ · Quang hợp 8 ngày thấp (mức màu 1/5)', en: 'Red · Low 8-day productivity tier (band 1/5)' }, desc: { vi: 'Đất chuyển vụ, mặt nước hoặc cây đang chịu stress khô nóng/mây nhiều (theo phân tầng màu GIBS).', en: 'Lowest GPP color tier (fallow transition or stressed vegetation).' } },
    { hex: '#F4A261', label: { vi: 'Cam · Quang hợp yếu–trung bình (mức màu 2/5)', en: 'Orange · Low-moderate productivity tier (band 2/5)' }, desc: { vi: 'Cây mới bén rễ đầu vụ, tích lũy sinh khối còn chậm.', en: 'Early-stage crop color tier with modest dry-matter gain.' } },
    { hex: '#E9C46A', label: { vi: 'Vàng · Quang hợp trung bình khá (mức màu 3/5)', en: 'Yellow · Moderate productivity tier (band 3/5)' }, desc: { vi: 'Tốc độ quang hợp ổn định tại vùng trồng xen hoặc giữa vụ.', en: 'Steady assimilation color tier in mixed or mid-season plots.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá · Quang hợp mạnh (mức màu 4/5)', en: 'Green · Strong productivity tier (band 4/5)' }, desc: { vi: 'Cây sinh trưởng sung sức, tích lũy sinh khối nhanh trong chu kỳ 8 ngày.', en: 'Rapid biomass buildup color tier.' } },
    { hex: '#1B4332', label: { vi: 'Lục thẫm · Quang hợp cực đại (mức màu 5/5)', en: 'Deep pine · Peak productivity tier (band 5/5)' }, desc: { vi: 'Dải quang hợp cao nhất ĐBSCL trên bản đồ màu GIBS chu kỳ 8 ngày.', en: 'Peak carbon-uptake color tier across the Mekong Delta.' } },
  ],
  landCover: [
    { hex: '#F4D35E', label: { vi: 'Vàng rơm · Đất canh tác nông nghiệp (IGBP 12)', en: 'Straw yellow · Croplands (IGBP 12)' }, desc: { vi: 'Vùng chuyên canh nông nghiệp rõ nét (chủ yếu lúa, hoa màu theo mùa).', en: 'Dedicated seasonal agricultural cropland (paddy and annual rotations).' } },
    { hex: '#90BE6D', label: { vi: 'Xanh ô liu sáng · Khảm cây trồng & tự nhiên (IGBP 14)', en: 'Olive green · Cropland / Natural Mosaic (IGBP 14)' }, desc: { vi: 'Cấu trúc miệt vườn xen ruộng hoặc nông – lâm kết hợp đặc trưng vùng cù lao.', en: 'Mixed orchard, homegarden, and small-plot agroforestry mosaic.' } },
    { hex: '#EE964B', label: { vi: 'Cam vàng · Trảng cây bụi / vườn thưa (IGBP 9)', en: 'Amber · Savanna / open tree canopy (IGBP 9)' }, desc: { vi: 'Cây bụi/cây ăn trái phân tán kết hợp thảm cỏ.', en: 'Scattered orchard or woody canopy mixed with herbaceous cover.' } },
    { hex: '#1B4332', label: { vi: 'Lục đậm · Rừng / vườn cây thường xanh (IGBP 2)', en: 'Deep pine · Evergreen broadleaf forest/orchards (IGBP 2)' }, desc: { vi: 'Mảng rừng ngập mặn, rừng tràm hoặc vùng cây ăn trái dày liên tục.', en: 'Dense mangrove/melaleuca forest or continuous perennial tree canopy.' } },
    { hex: '#C86D51', label: { vi: 'Nâu đất · Đồng cỏ / thảm thực vật thấp (IGBP 10)', en: 'Terracotta · Grasslands / low cover (IGBP 10)' }, desc: { vi: 'Thảm thực vật thân thảo hoặc vùng chuyển tiếp đồng cỏ.', en: 'Herbaceous grass or transitional wet-meadow areas.' } },
    { hex: '#277DA1', label: { vi: 'Xanh biển · Đất ngập nước vĩnh viễn (IGBP 11)', en: 'Ocean blue · Permanent wetlands (IGBP 11)' }, desc: { vi: 'Vùng ngập nước kéo dài hoặc hệ sinh thái lúa – tôm / thủy sản.', en: 'Persistently flooded wetlands or brackish/fresh aquaculture complexes.' } },
    { hex: '#4CC9F0', label: { vi: 'Xanh da trời · Mặt nước sông hồ (IGBP 17)', en: 'Sky cyan · Water bodies (IGBP 17)' }, desc: { vi: 'Sông Tiền, sông Hậu, cửa biển hoặc hồ thủy lợi lớn.', en: 'Major Mekong distributaries, estuaries, or reservoirs.' } },
    { hex: '#D62828', label: { vi: 'Đỏ · Đô thị / khu dân cư (IGBP 13)', en: 'Red · Urban & built-up (IGBP 13)' }, desc: { vi: 'Khu vực đô thị hóa dày đặc, hạ tầng giao thông và khu công nghiệp.', en: 'Urban settlements, town centers, and built infrastructure.' } },
    { hex: '#6C757D', label: { vi: 'Xám đậm · Đất trống ít thực vật (IGBP 16)', en: 'Slate · Barren / sparsely vegetated (IGBP 16)' }, desc: { vi: 'Bãi bồi, sân phơi, đất trống hoặc bờ đắp mới chưa phủ xanh.', en: 'Bare soil, exposed flats, or non-vegetated ground.' } },
  ],
  biomass: [
    { hex: '#E9D8A6', label: { vi: 'Vàng cát · Dải sinh khối gỗ rất thấp (mức màu 1/5)', en: 'Sand · Very low woody biomass tier (band 1/5)' }, desc: { vi: 'Đặc trưng của đồng ruộng lúa/màu trống tán gỗ hoặc đồng trống trên bản đồ GEDI.', en: 'Lowest GEDI woody-biomass color tier (treeless paddies and seasonal crops).' } },
    { hex: '#A7C957', label: { vi: 'Xanh cốm · Dải sinh khối thấp (mức màu 2/5)', en: 'Light green · Low woody biomass tier (band 2/5)' }, desc: { vi: 'Có dải cây ven bờ, cây bụi hoặc vườn cây ăn trái mới trồng.', en: 'Scattered bund trees, shrubs, or young orchards color tier.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá · Dải sinh khối trung bình (mức màu 3/5)', en: 'Green · Moderate woody biomass tier (band 3/5)' }, desc: { vi: 'Vùng nông – lâm kết hợp hoặc vườn cây ăn trái tán vừa.', en: 'Mixed homegardens or medium-stature orchards color tier.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Dải sinh khối khá cao (mức màu 4/5)', en: 'Emerald · High orchard biomass tier (band 4/5)' }, desc: { vi: 'Vườn cây ăn trái trưởng thành dày tán hoặc tràm/đước trung bình.', en: 'Mature dense fruit orchards or mid-biomass woodlands color tier.' } },
    { hex: '#083D27', label: { vi: 'Lục thẫm · Dải sinh khối gỗ cao nhất (mức màu 5/5)', en: 'Deep pine · Dense forest biomass tier (band 5/5)' }, desc: { vi: 'Dải màu GEDI cao nhất đồng bằng (thường trùng rừng tràm / rừng ngập mặn).', en: 'Highest GEDI woody biomass color tier across the delta.' } },
  ],
  lst: [
    { hex: '#2A9D8F', label: { vi: 'Xanh ngọc · Bề mặt mát nhất ban ngày', en: 'Teal · Coolest daytime surface' }, desc: { vi: 'Khu vực có tán cây dày hoặc sông rạch làm mát rõ rệt vào ban ngày.', en: 'Shaded canopy or river-cooled daytime surface.' } },
    { hex: '#80B918', label: { vi: 'Xanh cốm · Bề mặt dịu mát ban ngày', en: 'Lime · Mild-cool daytime surface' }, desc: { vi: 'Nhiệt độ bề mặt ban ngày thấp hơn mặt bằng chung đồng bằng.', en: 'Cooler than delta-wide daytime land temperature.' } },
    { hex: '#F4D35E', label: { vi: 'Vàng · Bề mặt ấm trung bình ban ngày', en: 'Yellow · Moderate daytime surface warmth' }, desc: { vi: 'Mức nhiệt bề mặt ban ngày phổ biến tại vùng canh tác.', en: 'Typical daytime skin temperature over agricultural plains.' } },
    { hex: '#F77F00', label: { vi: 'Cam · Bề mặt nóng ban ngày', en: 'Orange · Warm daytime surface' }, desc: { vi: 'Tích nhiệt cao hơn vào buổi trưa (ruộng mới gặt, đất trống hoặc ít tán che).', en: 'Elevated noon heat on open, harvested, or lightly shaded land.' } },
    { hex: '#D62828', label: { vi: 'Đỏ · Đảo nhiệt / bề mặt nóng nhất ban ngày', en: 'Crimson · Hottest daytime surface / heat island' }, desc: { vi: 'Khu vực đất trần hoặc đô thị nóng nhất vùng; nên phủ rơm và tưới sớm cho cây non.', en: 'Peak daytime heat on bare soil/urban areas; mulch and irrigate seedlings early.' } },
  ],
  cold: [
    { hex: '#1D6FA5', label: { vi: 'Xanh lam · Bề mặt đêm mát nhất', en: 'Blue · Coolest nighttime surface' }, desc: { vi: 'Nhiệt độ bề mặt ban đêm hạ thấp rõ rệt so với vùng xung quanh.', en: 'Noticeably cooler nighttime surface temperature.' } },
    { hex: '#2A9D8F', label: { vi: 'Xanh ngọc · Đêm dịu mát', en: 'Teal · Mild-cool nighttime surface' }, desc: { vi: 'Chênh lệch nhiệt ngày–đêm thông thoáng cho quá trình tích lũy đường/tinh bột.', en: 'Good day–night cooling aiding fruit/grain quality.' } },
    { hex: '#90BE6D', label: { vi: 'Xanh lá · Nhiệt độ đêm trung bình', en: 'Green · Moderate nighttime surface' }, desc: { vi: 'Mức nhiệt ban đêm cân bằng trong kỳ tổng hợp 8 ngày.', en: 'Balanced nighttime temperature in the 8-day composite.' } },
    { hex: '#F4D35E', label: { vi: 'Vàng · Đêm hơi ấm', en: 'Yellow · Mildly warm nighttime surface' }, desc: { vi: 'Bề mặt giữ nhiệt ấm nhẹ về đêm (vùng nhiều ẩm/sông rạch).', en: 'Slightly warmer night surface near water/moist plains.' } },
    { hex: '#EE964B', label: { vi: 'Cam · Đêm giữ nhiệt ấm nhất', en: 'Orange · Warmest heat-retaining night surface' }, desc: { vi: 'Vùng giữ nhiệt cao nhất về đêm (vùng nước lớn hoặc khu dân cư dày).', en: 'Warmest overnight surface near wide rivers or dense towns.' } },
  ],
  soilTemp: [
    { hex: '#2A9D8F', label: { vi: 'Xanh ngọc · Dải đất mặt mát nhất (mức màu 1/5)', en: 'Teal · Coolest topsoil tier (band 1/5)' }, desc: { vi: 'Nhiệt độ đất tầng 0–10 cm dịu nhất trong phân tầng màu GIBS SMAP L4, thuận lợi cho nảy mầm và rễ tơ.', en: 'Coolest 0–10 cm topsoil GIBS SMAP L4 color tier, ideal for germination and feeder roots.' } },
    { hex: '#8AB17D', label: { vi: 'Xanh lá dịu · Dải đất mặt mát–ấm (mức màu 2/5)', en: 'Sage · Mild topsoil tier (band 2/5)' }, desc: { vi: 'Nền nhiệt tầng đất mặt ở mức dịu trên bản đồ màu SMAP L4.', en: 'Mild topsoil temperature color tier on GIBS SMAP L4.' } },
    { hex: '#E9C46A', label: { vi: 'Vàng · Dải đất mặt ấm vừa (mức màu 3/5)', en: 'Yellow · Moderately warm topsoil tier (band 3/5)' }, desc: { vi: 'Đất mặt bắt đầu ấm hơn vào ban ngày; giữ phủ gốc nếu đất trồng màu còn trống.', en: 'Moderately warm topsoil color tier; keep mulch over bare vegetable beds.' } },
    { hex: '#F4A261', label: { vi: 'Cam · Dải đất mặt khá nóng (mức màu 4/5)', en: 'Orange · Warm-hot topsoil tier (band 4/5)' }, desc: { vi: 'Cường độ nhiệt cao ở tầng 0–10 cm theo phân tầng màu GIBS; nên tủ rơm và tưới giữ ẩm sáng sớm.', en: 'Warm-hot topsoil color tier; apply straw mulch and morning irrigation.' } },
    { hex: '#C1121F', label: { vi: 'Đỏ đậm · Dải đất mặt nóng nhất (mức màu 5/5)', en: 'Crimson · Hottest topsoil tier (band 5/5)' }, desc: { vi: 'Dải màu nóng nhất của SMAP L4 tầng đất mặt tại ĐBSCL; cần che phủ rơm rạ tránh sốc nhiệt rễ.', en: 'Hottest GIBS SMAP L4 topsoil color tier; mulch heavily to protect seedlings and roots.' } },
  ],
}

export function emSpectrumBands(layerKey) {
  return EM_LAYER_BANDS[layerKey] || []
}

function emParseHex(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length !== 6) return null
  const n = parseInt(h, 16)
  if (!Number.isFinite(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function emSoilTypeBandIndex(code) {
  if (!code) return 7
  if (code.startsWith('Ge56')) return 0
  if (code.startsWith('Ge55') || code.startsWith('Ge')) return 1
  if (code.startsWith('Jt13')) return 2
  if (code.startsWith('Jt14') || code.startsWith('Jt')) return 3
  if (code.startsWith('Je72')) return 4
  if (code.startsWith('Je73') || code.startsWith('Je')) return 5
  if (code.startsWith('Od')) return 6
  return 7
}

function emNearestIndex(r, g, b, hexList) {
  let bestIdx = 0
  let bestD = Infinity
  for (let i = 0; i < hexList.length; i++) {
    const cRgb = emParseHex(hexList[i])
    if (!cRgb) continue
    const d = (r - cRgb[0]) ** 2 + (g - cRgb[1]) ** 2 + (b - cRgb[2]) ** 2
    if (d < bestD) { bestD = d; bestIdx = i }
  }
  return bestIdx
}

const EM_RAW_LANDCOVER = ['#faef73', '#999356', '#ffd500', '#31cc31', '#f0b967', '#4783b5', '#86cae3', '#ff0000', '#bfbfbd']
const EM_RAW_FLOOD3D = ['#afafaf', '#32d2f5', '#ffff00', '#fa1e24']
const EM_RAW_FLOODHAZ = ['#e1e4e5', '#d7dbeb', '#bdc9e1', '#b2c4de']
const EM_RAW_ESI = ['#de3f2e', '#f98e52', '#fed481', '#ffffbf', '#ccea83', '#86cb67']

function emClassifyRasterHex(layerKey, hex) {
  const bands = EM_LAYER_BANDS[layerKey]
  if (!bands || !hex) return null
  const upper = String(hex).toUpperCase()
  const directIdx = bands.findIndex((b) => String(b.hex).toUpperCase() === upper)
  if (directIdx >= 0) return directIdx
  const rgb = emParseHex(hex)
  if (!rgb) return null
  const [r, g, b] = rgb
  if (layerKey === 'soilPh') {
    if (r >= 230) return 0
    if (r >= 190) return 1
    if (r >= 140) return 2
    if (r >= 120) return 3
    if (r >= 95) return 4
    return 5
  }
  if (layerKey === 'soilSoc') {
    if (r >= 186) return 0
    if (r >= 178) return 1
    if (r >= 170) return 2
    if (r >= 160) return 3
    return 4
  }
  if (layerKey === 'soilClay') {
    if (r >= 196) return 0
    if (r >= 190) return 1
    if (r >= 186) return 2
    if (r >= 181) return 3
    return 4
  }
  if (layerKey === 'soilNitrogen') {
    if (r >= 214) return 0
    if (r >= 205) return 1
    if (r >= 195) return 2
    if (r >= 175) return 3
    return 4
  }
  if (layerKey === 'soil') {
    if (g > b || (g >= 140 && b >= 200)) return 0
    if (g >= 50 && g < 140 && b >= 220) return 1
    if (g >= 18 && g < 50 && b >= 220) return 2
    if (r <= 15 && g < 18 && b >= 220) return 3
    return 4
  }
  if (layerKey === 'soilRoot') {
    if (r >= 40) return 4
    if (g >= 40 && b >= 200) return 0
    if (g >= 6 && b >= 240) return 1
    if (b >= 233) return 2
    return 3
  }
  if (layerKey === 'esi') {
    if (r < 90 && g > 140) return 5
    return emNearestIndex(r, g, b, EM_RAW_ESI)
  }
  if (layerKey === 'rain') {
    if (r === 0 && b >= 35) return 0
    if (r <= 30 && b < 35) return 1
    if (r <= 115) return 2
    if (r <= 185) return 3
    return 4
  }
  if (layerKey === 'flood3d') return emNearestIndex(r, g, b, EM_RAW_FLOOD3D)
  if (layerKey === 'floodHaz') return emNearestIndex(r, g, b, EM_RAW_FLOODHAZ)
  if (layerKey === 'landCover') return emNearestIndex(r, g, b, EM_RAW_LANDCOVER)
  if (layerKey === 'ndvi' || layerKey === 'evi') {
    if (r >= g - 2) return 0
    if (b >= 50 || r >= 150) return 1
    if (r >= 85) return 2
    if (r >= 32) return 3
    return 4
  }
  if (layerKey === 'lai') {
    if (r >= 240 && g >= 225) return 0
    if (r >= 155 && g >= 200) return 1
    if (r >= 60 && g >= 165) return 2
    if (g >= 145) return 3
    return 4
  }
  if (layerKey === 'fpar') {
    if (r >= 245 && g >= 240 && b >= 30) return 0
    if (r >= 235 && g < 240 && b <= 35) return 1
    if (r >= 160) return 2
    if (r >= 70) return 3
    return 4
  }
  if (layerKey === 'gpp') {
    if ((b > g && b > 80) || (r >= 200 && g < 95)) return 0
    if (r >= 240 && g < 185) return 1
    if (r >= 225) return 2
    if (r >= 120) return 3
    return 4
  }
  if (layerKey === 'biomass') {
    if (r <= 1 && b <= 60) return 0
    if (b < 115) return 1
    if (g <= 20) return 2
    if (g <= 75) return 3
    return 4
  }
  if (layerKey === 'lst') {
    if (r <= 248) return 0
    if (r < 255) return 1
    if (g >= 254) return 2
    if (g >= 251) return 3
    return 4
  }
  if (layerKey === 'cold') {
    if (r <= 240) return 0
    if (r <= 248) return 1
    if (r < 255) return 2
    if (g >= 251) return 3
    return 4
  }
  if (layerKey === 'soilTemp') {
    if (g >= 122) return 0
    if (g >= 117) return 1
    if (g >= 111) return 2
    if (g >= 103) return 3
    return 4
  }
  return 0
}

export function emDescribeCell(layerKey, cell) {
  if (!cell || cell.missing || !cell.hex) return null
  const bands = emSpectrumBands(layerKey)
  if (layerKey === 'elev') {
    const bandIndex = Math.max(
      0,
      EM_ELEV_BUCKETS.findIndex((b) => (cell.tier ? b.min === cell.tier.min && b.max === cell.tier.max : cell.elevM >= b.min && cell.elevM < b.max)),
    )
    return {
      hex: bands[bandIndex]?.hex || cell.hex,
      rawHex: cell.rawHex || cell.hex,
      bandIndex,
      totalBands: bands.length,
      title: {
        vi: `${cell.elevM.toFixed(2)} m · ${cell.tier?.label?.vi || ''}`,
        en: `${cell.elevM.toFixed(2)} m · ${cell.tier?.label?.en || ''}`,
      },
      detail: {
        vi: `Trung bình từ ${cell.sampleCount} pixel DEM 500 m (chuẩn Hòn Dấu) trong ô 5 km này.`,
        en: `Mean of ${cell.sampleCount} 500 m DEM pixels (Hon Dau datum) in this 5 km cell.`,
      },
    }
  }
  if (layerKey === 'soilType' && cell.soilClass) {
    const bandIndex = emSoilTypeBandIndex(cell.soilClass.code)
    const band = bands[bandIndex]
    return {
      hex: band?.hex || cell.hex,
      rawHex: cell.rawHex || cell.soilClass.hex || cell.hex,
      bandIndex,
      totalBands: bands.length,
      title: {
        vi: `${cell.soilClass.code} · ${cell.soilClass.labelVi}`,
        en: `${cell.soilClass.code} · ${cell.soilClass.labelEn}`,
      },
      detail: band?.desc || { vi: cell.soilClass.labelVi, en: cell.soilClass.labelEn },
    }
  }
  const srcHex = cell.rawHex || cell.hex
  const bandIndex = typeof cell.bandIndex === 'number' && cell.bandIndex >= 0 && cell.bandIndex < bands.length
    ? cell.bandIndex
    : emClassifyRasterHex(layerKey, srcHex)
  if (bandIndex == null || !bands[bandIndex]) return null
  const band = bands[bandIndex]
  return {
    hex: band.hex,
    rawHex: srcHex,
    bandIndex,
    totalBands: bands.length,
    title: band.label,
    detail: band.desc,
  }
}

Object.assign(EM_FILTER_META, {
  soilPh: {
    key: 'soilPh',
    status: 'available',
    scope: 'isric',
    badge: { vi: 'ISRIC SoilGrids 2.0 (soilgrids.org)', en: 'ISRIC SoilGrids 2.0 (soilgrids.org)' },
    shortOrg: { vi: 'ISRIC WDC-Soils · SoilGrids 2.0', en: 'ISRIC WDC-Soils · SoilGrids 2.0' },
    datasetName: 'phh2o_0-5cm_mean (SoilGrids v2.0)',
    url: 'https://soilgrids.org/',
    nativeRes: { vi: '250 m toàn cầu → ô lưới 5 km', en: '250 m global → 5 km grid' },
    dateLabel: { vi: 'Mô hình đất tầng 0–5 cm (SoilGrids 2.0)', en: '0–5 cm soil layer model (SoilGrids 2.0)' },
    units: { vi: 'Phân tầng màu WMS SoilGrids pH (H₂O) 0–5 cm (không quy đổi số đo từ RGB)', en: 'WMS color tiers for SoilGrids 0–5 cm pH (no RGB numeric inversion)' },
    caveat: {
      vi: 'Ước lượng địa thống kê 250 m biểu thị theo mức màu; cần ưu tiên pH tự đo tại ruộng khi bón vôi hạ phèn.',
      en: '250 m geostatistical 0–5 cm color tiers; prioritize on-farm pH testing before liming.',
    },
  },
  soilSoc: {
    key: 'soilSoc',
    status: 'available',
    scope: 'isric',
    badge: { vi: 'ISRIC SoilGrids 2.0 (soilgrids.org)', en: 'ISRIC SoilGrids 2.0 (soilgrids.org)' },
    shortOrg: { vi: 'ISRIC WDC-Soils · SoilGrids 2.0', en: 'ISRIC WDC-Soils · SoilGrids 2.0' },
    datasetName: 'soc_0-5cm_mean (SoilGrids v2.0)',
    url: 'https://soilgrids.org/',
    nativeRes: { vi: '250 m toàn cầu → ô lưới 5 km', en: '250 m global → 5 km grid' },
    dateLabel: { vi: 'Carbon hữu cơ đất 0–5 cm (SoilGrids 2.0)', en: '0–5 cm Soil Organic Carbon (SoilGrids 2.0)' },
    units: { vi: 'Phân tầng màu WMS g C / kg đất (không quy đổi số đo từ RGB)', en: 'WMS color tiers for 0–5 cm SOC (no RGB numeric inversion)' },
    caveat: {
      vi: 'Phản ánh tương đối nền mùn hữu cơ theo vùng, chưa phản ánh phân chuồng vừa bón.',
      en: 'Reflects relative regional soil organic carbon; recent plot compost additions belong in your farm profile.',
    },
  },
  soilClay: {
    key: 'soilClay',
    status: 'available',
    scope: 'isric',
    badge: { vi: 'ISRIC SoilGrids 2.0 (soilgrids.org)', en: 'ISRIC SoilGrids 2.0 (soilgrids.org)' },
    shortOrg: { vi: 'ISRIC WDC-Soils · SoilGrids 2.0', en: 'ISRIC WDC-Soils · SoilGrids 2.0' },
    datasetName: 'clay_0-5cm_mean (SoilGrids v2.0)',
    url: 'https://soilgrids.org/',
    nativeRes: { vi: '250 m toàn cầu → ô lưới 5 km', en: '250 m global → 5 km grid' },
    dateLabel: { vi: 'Thành phần cấp hạt sét 0–5 cm (SoilGrids 2.0)', en: '0–5 cm clay fraction (SoilGrids 2.0)' },
    units: { vi: 'Phân tầng màu WMS tỷ lệ hạt sét 0–5 cm (không quy đổi % từ RGB)', en: 'WMS color tiers for 0–5 cm clay fraction (no RGB numeric inversion)' },
    caveat: {
      vi: 'Tỷ lệ sét cao giữ ẩm lâu nhưng thoát nước chậm vào mùa mưa, cần đánh rãnh thoát nước khi trồng cây ăn trái/màu.',
      en: 'High clay retains water well but drains slowly in monsoon rains; add drainage furrows for upland crops.',
    },
  },
  soilNitrogen: {
    key: 'soilNitrogen',
    status: 'available',
    scope: 'isric',
    badge: { vi: 'ISRIC SoilGrids 2.0 (soilgrids.org)', en: 'ISRIC SoilGrids 2.0 (soilgrids.org)' },
    shortOrg: { vi: 'ISRIC WDC-Soils · SoilGrids 2.0', en: 'ISRIC WDC-Soils · SoilGrids 2.0' },
    datasetName: 'nitrogen_0-5cm_mean (SoilGrids v2.0)',
    url: 'https://soilgrids.org/',
    nativeRes: { vi: '250 m toàn cầu → ô lưới 5 km', en: '250 m global → 5 km grid' },
    dateLabel: { vi: 'Tổng đạm đất 0–5 cm (SoilGrids 2.0)', en: '0–5 cm Total Nitrogen (SoilGrids 2.0)' },
    units: { vi: 'Phân tầng màu WMS tổng đạm nền (không quy đổi g/kg từ RGB)', en: 'WMS color tiers for background total N (no RGB numeric inversion)' },
    caveat: {
      vi: 'Đây là đạm tổng nền trong đất theo phân tầng màu chứ không phải đạm dễ tiêu tức thời (NH₄⁺/NO₃⁻) sau khi bón ure.',
      en: 'Shows relative background total soil nitrogen rather than plant-available mineral N right after fertilization.',
    },
  },
  soilRoot: {
    key: 'soilRoot',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA SMAP L4 (nsidc.org)', en: 'NASA SMAP L4 (nsidc.org)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · SMAP L4 / NSIDC', en: 'NASA EOSDIS GIBS · SMAP L4 / NSIDC' },
    datasetName: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    url: 'https://nsidc.org/data/spl4smau/versions/8',
    nativeRes: { vi: '9 km (SMAP L4 0–100 cm) → ô lưới 5 km', en: '9 km (SMAP L4 0–100 cm) → 5 km grid' },
    dateLabel: { vi: 'Mốc 12:00 UTC ngày 10/11/2026', en: '12:00 UTC · 2026-11-10' },
    units: { vi: 'Phân tầng màu GIBS độ ẩm tầng rễ 0–100 cm (không quy đổi m³/m³)', en: 'GIBS color tiers for 0–100 cm root moisture (no RGB numeric inversion)' },
    caveat: {
      vi: 'Phản ánh trữ ẩm sâu 0–100 cm tốt hơn lớp mặt, nhưng độ phân giải mô hình 9 km chưa thấy từng con mương nội đồng.',
      en: 'Captures 0–100 cm root-zone moisture better than surface scans, though 9 km resolution averages field ditches.',
    },
  },
  flood3d: {
    key: 'flood3d',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA LANCE NRT (modaps.eosdis.nasa.gov)', en: 'NASA LANCE NRT (modaps.eosdis.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · LANCE MODIS Flood', en: 'NASA EOSDIS GIBS · LANCE MODIS Flood' },
    datasetName: 'MODIS_Combined_Flood_3-Day',
    url: 'https://lance.modaps.eosdis.nasa.gov/achyuthan/flood/',
    nativeRes: { vi: '250 m quang học → ô lưới 5 km', en: '250 m optical → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 3 ngày · mốc 16/10/2026', en: '3-day composite · 2026-10-16' },
    units: { vi: 'Phân loại ngập quang học (nước / ngập / mây)', en: 'Optical flood mask (water / flood / cloud)' },
    caveat: {
      vi: 'Ô màu xám (#AFAFAF) là vùng bị mây che thiếu ảnh quang học — không thể kết luận có ngập hay không tại ô xám.',
      en: 'Grey cells (#AFAFAF) indicate cloud/insufficient optical data — never interpret grey as zero flood.',
    },
  },
  floodHaz: {
    key: 'floodHaz',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'Columbia SEDAC · NASA EOSDIS', en: 'Columbia SEDAC · NASA EOSDIS' },
    shortOrg: { vi: 'NASA SEDAC / CIESIN · NDH Flood Hazard', en: 'NASA SEDAC / CIESIN · NDH Flood Hazard' },
    datasetName: 'NDH_Flood_Hazard_Frequency_Distribution_1985-2003',
    url: 'https://sedac.ciesin.columbia.edu/data/set/ndh-flood-hazard-frequency-distribution',
    nativeRes: { vi: '2,5 phút cung (~4,6 km) khớp ô 5 km', en: '2.5 arc-min (~4.6 km) grid' },
    dateLabel: { vi: 'Lớp tần suất rủi ro lịch sử 1985–2003 (tĩnh)', en: 'Historical hazard deciles 1985–2003 (static)' },
    units: { vi: 'Phân tầng màu tần suất ngập lịch sử 1985–2003 (không quy đổi số từ RGB)', en: 'Historical flood frequency color tiers 1985–2003 (no RGB inversion)' },
    caveat: {
      vi: 'Phản ánh xu thế ngập lịch sử quy mô vùng trước khi một số tuyến đê bao khép kín mới được xây dựng.',
      en: 'Shows historical regional flood recurrence; check local dyke rings before assuming open-flood depth.',
    },
  },
  evi: {
    key: 'evi',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS Terra (modis.gsfc.nasa.gov)', en: 'NASA MODIS Terra (modis.gsfc.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · LP DAAC / MODIS', en: 'NASA EOSDIS GIBS · LP DAAC / MODIS' },
    datasetName: 'MODIS_Terra_L3_EVI_16Day (MOD13Q1)',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod13.php',
    nativeRes: { vi: '250 m → ô lưới 5 km', en: '250 m → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 16 ngày · mốc 16/10/2026', en: '16-day composite · 2026-10-16' },
    units: { vi: 'Phân tầng màu GIBS chỉ số thực vật EVI (không quy đổi số từ RGB)', en: 'GIBS color tiers for EVI (no RGB numeric inversion)' },
    caveat: {
      vi: 'Bổ sung tốt cho NDVI ở vườn cây ăn trái tán rậm vì EVI ít bị bão hòa khi sinh khối cao.',
      en: 'Complements NDVI in dense orchards because EVI resists saturation at high biomass.',
    },
  },
  lai: {
    key: 'lai',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS Combined (modis.gsfc.nasa.gov)', en: 'NASA MODIS Combined (modis.gsfc.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · LP DAAC / MODIS', en: 'NASA EOSDIS GIBS · LP DAAC / MODIS' },
    datasetName: 'MODIS_Combined_L4_LAI_8Day (MCD15A2H)',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod15.php',
    nativeRes: { vi: '500 m → ô lưới 5 km', en: '500 m → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 8 ngày · mốc 24/10/2026', en: '8-day composite · 2026-10-24' },
    units: { vi: 'Phân tầng màu GIBS chỉ số diện tích lá LAI (không quy đổi số từ RGB)', en: 'GIBS color tiers for Leaf Area Index (no RGB numeric inversion)' },
    caveat: {
      vi: 'Ô khuyết ảnh thường do mây dày che đỉnh tán trong chu kỳ 8 ngày.',
      en: 'Missing cells are masked due to persistent 8-day cloud cover.',
    },
  },
  fpar: {
    key: 'fpar',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS Combined (modis.gsfc.nasa.gov)', en: 'NASA MODIS Combined (modis.gsfc.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · LP DAAC / MODIS', en: 'NASA EOSDIS GIBS · LP DAAC / MODIS' },
    datasetName: 'MODIS_Combined_L4_FPAR_8Day (MCD15A2H)',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod15.php',
    nativeRes: { vi: '500 m → ô lưới 5 km', en: '500 m → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 8 ngày · mốc 24/10/2026', en: '8-day composite · 2026-10-24' },
    units: { vi: 'Phân tầng màu GIBS tỷ lệ hấp thụ bức xạ fPAR (không quy đổi số từ RGB)', en: 'GIBS color tiers for fPAR (no RGB numeric inversion)' },
    caveat: {
      vi: 'Đo phần ánh sáng tán lá giữ lại để quang hợp; thấp trên ruộng vừa gieo sạ hoặc đất trống.',
      en: 'Indicates how much solar PAR the green canopy intercepts; low on newly sown or fallow rice fields.',
    },
  },
  gpp: {
    key: 'gpp',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS Terra (modis.gsfc.nasa.gov)', en: 'NASA MODIS Terra (modis.gsfc.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · LP DAAC / MODIS', en: 'NASA EOSDIS GIBS · LP DAAC / MODIS' },
    datasetName: 'MODIS_Terra_L4_Gross_Primary_Productivity_8Day (MOD17A2H)',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod17.php',
    nativeRes: { vi: '500 m → ô lưới 5 km', en: '500 m → 5 km grid' },
    dateLabel: { vi: 'Tổng hợp 8 ngày · mốc 16/10/2026', en: '8-day composite · 2026-10-16' },
    units: { vi: 'Phân tầng màu GIBS năng suất sơ cấp thô GPP (không quy đổi kg C/m² từ RGB)', en: 'GIBS color tiers for 8-day GPP (no RGB numeric inversion)' },
    caveat: {
      vi: 'Thang màu cầu vồng MODIS: đỏ/cam là quang hợp thấp (đầu/cuối vụ hoặc stress), xanh lục sáng là tích lũy sinh khối mạnh.',
      en: 'MODIS rainbow scale: red/orange indicates low 8-day carbon uptake, while bright green shows peak growth.',
    },
  },
  landCover: {
    key: 'landCover',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA MODIS IGBP (modis.gsfc.nasa.gov)', en: 'NASA MODIS IGBP (modis.gsfc.nasa.gov)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · LP DAAC / MCD12Q1', en: 'NASA EOSDIS GIBS · LP DAAC / MCD12Q1' },
    datasetName: 'MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual (2024)',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod12.php',
    nativeRes: { vi: '500 m thường niên → ô lưới 5 km', en: '500 m annual → 5 km grid' },
    dateLabel: { vi: 'Bản đồ phân loại thường niên IGBP 2024', en: 'IGBP annual land cover 2024' },
    units: { vi: '17 lớp phủ chuẩn IGBP', en: 'IGBP 17 land cover classes' },
    caveat: {
      vi: 'Phân biệt nhanh vùng chuyên lúa/màu, vùng đất ngập nước thường xuyên và khu khảm vườn tạp.',
      en: 'Distinguishes dedicated croplands from permanent wetlands and orchard/natural mosaics.',
    },
  },
  biomass: {
    key: 'biomass',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA GEDI ISS LiDAR (daac.ornl.gov)', en: 'NASA GEDI ISS LiDAR (daac.ornl.gov)' },
    shortOrg: { vi: 'NASA ORNL DAAC · GEDI L4B LiDAR', en: 'NASA ORNL DAAC · GEDI L4B LiDAR' },
    datasetName: 'GEDI_ISS_L4B_Aboveground_Biomass_Density_Mean_201904-202303',
    url: 'https://daac.ornl.gov/GEDI/guides/GEDI_L4B_Gridded_Biomass.html',
    nativeRes: { vi: '1 km LiDAR trên trạm ISS → ô lưới 5 km', en: '1 km ISS LiDAR → 5 km grid' },
    dateLabel: { vi: 'Trung bình quan trắc 2019–2023', en: '2019–2023 mission mean' },
    units: { vi: 'Phân tầng màu GEDI sinh khối cây lâu năm (không quy đổi Mg/ha từ RGB)', en: 'GEDI color tiers for woody biomass (no RGB numeric inversion)' },
    caveat: {
      vi: 'Nhạy với cây lâu năm, vườn cây ăn trái cao tán và rừng tràm/đước; lúa ngắn ngày sẽ hiển thị ở mức màu thấp nhất.',
      en: 'Measures standing woody biomass (orchards/forests); short-cycle paddy fields register in the lowest tier.',
    },
  },
  soilTemp: {
    key: 'soilTemp',
    status: 'available',
    scope: 'nasa',
    badge: { vi: 'NASA SMAP L4 (nsidc.org)', en: 'NASA SMAP L4 (nsidc.org)' },
    shortOrg: { vi: 'NASA EOSDIS GIBS · SMAP L4 / NSIDC', en: 'NASA EOSDIS GIBS · SMAP L4 / NSIDC' },
    datasetName: 'SMAP_L4_Soil_Temperature_Layer_1 (SPL4SMAU)',
    url: 'https://nsidc.org/data/spl4smau/versions/8',
    nativeRes: { vi: '9 km (SMAP L4 lớp 0–10 cm) → ô lưới 5 km', en: '9 km (SMAP L4 layer 1) → 5 km grid' },
    dateLabel: { vi: 'Mốc 12:00 UTC ngày 10/11/2026', en: '12:00 UTC · 2026-11-10' },
    units: { vi: 'Phân tầng màu GIBS nhiệt độ đất 0–10 cm (không quy đổi °C/K từ RGB)', en: 'GIBS color tiers for 0–10 cm topsoil heat (no RGB numeric inversion)' },
    caveat: {
      vi: 'Lớp nhiệt đất mô hình 9 km phản ánh tương đối sức nóng vùng rễ nông; che phủ rơm rạ tại vườn giúp giữ mát gốc hơn đất trần.',
      en: '9 km modeled topsoil heat color tiers; field mulching keeps root zones cooler than bare soil.',
    },
  },
})

export function emSynthesizeGardenStack(envMap, lat, lon, garden = null, floodCount = 0, lang = 'vi') {
  const m = emGetEnvMap(envMap)
  const L = lang === 'en' ? 'en' : 'vi'
  if (!m || lat == null || lon == null) return null
  const items = {}
  let readCount = 0
  let cloudCount = 0
  for (const key of EM_AVAILABLE_KEYS) {
    const cell = emCellAt(m, key, lat, lon)
    const desc = cell && !cell.missing ? emDescribeCell(key, cell) : null
    const isCloudMasked = key === 'flood3d' && desc?.bandIndex === 0
    if (isCloudMasked) cloudCount += 1
    else if (desc) readCount += 1
    const meta = EM_FILTER_META[key]
    items[key] = {
      key,
      meta,
      cell,
      desc,
      cloudMasked: isCloudMasked,
      hex: desc?.hex || null,
      bandIndex: desc?.bandIndex ?? null,
      totalBands: desc?.totalBands ?? null,
      title: desc?.title?.[L] || null,
      detail: desc?.detail?.[L] || null,
    }
  }
  if (!readCount && !cloudCount) return null

  const p = garden?.profile || {}
  const profileMetrics = []
  if (p.soilType && p.soilType !== 'unknown') profileMetrics.push({ k: 'soil', label: p.soilType })
  const phVal = p.ph !== '' && p.ph != null && Number.isFinite(+p.ph) ? +p.ph : null
  const ecVal = p.ec !== '' && p.ec != null && Number.isFinite(+p.ec) ? +p.ec : null
  const omVal = p.om !== '' && p.om != null && Number.isFinite(+p.om) ? +p.om : null
  if (phVal !== null) profileMetrics.push({ k: 'ph', val: phVal })
  if (ecVal !== null) profileMetrics.push({ k: 'ec', val: ecVal, type: p.ecType || 'unknown' })
  if (omVal !== null) profileMetrics.push({ k: 'om', val: omVal })
  if (['yes', 'limited', 'no'].includes(p.irrigation)) profileMetrics.push({ k: 'irrigation', label: p.irrigation })
  if (p.season) profileMetrics.push({ k: 'season', label: p.season })
  if (p.sowing != null) profileMetrics.push({ k: 'sowing', val: p.sowing })
  if (floodCount > 0) profileMetrics.push({ k: 'floodMarks', val: floodCount })

  // Không ép kiểu null <= N của JavaScript (null <= 2 là true sẽ gán oan vùng thiếu dữ liệu).
  const b = (k) => items[k]?.bandIndex
  const bLe = (k, max) => typeof b(k) === 'number' && b(k) <= max
  const bGe = (k, min) => typeof b(k) === 'number' && b(k) >= min
  const bEq = (k, val) => b(k) === val
  const elevM = items.elev?.cell?.elevM
  const soilCode = items.soilType?.cell?.soilClass?.code || ''
  const ecIsEce = p.ecType === 'ece'
  const ecUncalibrated = ecVal !== null && !ecIsEce
  const isAcid = p.soilType === 'acidSulfate' || (phVal !== null && phVal < 5.5) || soilCode.startsWith('Jt') || bLe('soilPh', 2)
  const isSaline = p.soilType === 'saline' || (ecIsEce && ecVal >= 2.0)
  const isHeavyClay = bGe('soilClay', 3)
  const isLowOm = (omVal !== null && omVal < 1.5) || bEq('soilSoc', 0)
  const isHighOm = p.soilType === 'peat' || (omVal !== null && omVal >= 3.5) || bGe('soilSoc', 3) || soilCode.startsWith('Od')
  const isLowN = bEq('soilNitrogen', 0)
  const isLowElev = typeof elevM === 'number' && elevM < 0.7
  const isCurrentFlood = floodCount >= 1 || bEq('flood3d', 2) || bEq('flood3d', 3) || bGe('soilRoot', 4)
  const hasHistFlood = bGe('floodHaz', 2)
  const isFloodProne = isCurrentFlood || hasHistFlood
  const isWetSoil = bGe('soilRoot', 2) || bGe('soil', 2)
  const isIrrigConstrained = p.irrigation === 'limited' || p.irrigation === 'no'
  const isWaterStressed = isIrrigConstrained || (!isWetSoil && (bLe('esi', 2) || bEq('soil', 0)))
  const isHotTopsoil = bGe('lst', 3) || bGe('soilTemp', 3)
  const isDenseCanopy = bGe('ndvi', 3) && (bGe('evi', 3) || bGe('biomass', 3))
  const isOpenWindow = bLe('ndvi', 1) || bLe('evi', 1) || bLe('gpp', 1)

  const emShort = (s) => {
    if (!s) return null
    const cleaned = String(s)
      .replace(/\s*\((mức màu|tier)\s*\d+\/\d+\)/gi, '')
      .replace(/^(Dải|Phổ|Màu)\s+/i, '')
      .trim()
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : null
  }
  const soilLabel = L === 'en'
    ? items.soilType?.cell?.soilClass?.labelEn
    : items.soilType?.cell?.soilClass?.labelVi
  const soilNameShort = soilLabel
    ? (soilCode && !soilLabel.includes(soilCode) ? `${soilLabel} (${soilCode})` : soilLabel)
    : (soilCode ? `FAO ${soilCode}` : null)

  const ecTypeDisplay = p.ecType && p.ecType !== 'unknown' ? ` (${p.ecType.toUpperCase()})` : L === 'en' ? ' (type unspecified)' : ' (chưa rõ phép đo)'
  const domains = [
    {
      id: 'soilTerrain',
      title: L === 'en' ? 'Soil & Elevation' : 'Đất & Cao độ',
      tone: isSaline || (isAcid && isLowElev) || ecUncalibrated ? 'warn' : 'ok',
      summary: L === 'en'
        ? [
            typeof elevM === 'number' ? `${elevM.toFixed(2)} m DEM` : null,
            soilNameShort,
            emShort(items.soilPh?.title),
            emShort(items.soilClay?.title),
            phVal !== null ? `Plot pH ${phVal}` : null,
            ecVal !== null ? `Plot EC ${ecVal} dS/m${ecTypeDisplay}` : null,
          ].filter(Boolean).join(' · ')
        : [
            typeof elevM === 'number' ? `Cao độ ${elevM.toFixed(2)} m` : null,
            soilNameShort,
            emShort(items.soilPh?.title?.split('·')[1]?.trim() || items.soilPh?.title),
            emShort(items.soilClay?.title?.split('·')[1]?.trim() || items.soilClay?.title),
            phVal !== null ? `pH vườn ${phVal}` : null,
            ecVal !== null ? `EC vườn ${ecVal} dS/m${ecTypeDisplay}` : null,
          ].filter(Boolean).join(' · '),
    },
    {
      id: 'waterFlood',
      title: L === 'en' ? 'Water & Flooding' : 'Nước & Ngập úng',
      tone: isFloodProne || isWaterStressed ? 'warn' : 'ok',
      summary: L === 'en'
        ? [
            emShort(items.soil?.title?.split('·')[1]?.trim() || items.soil?.title),
            emShort(items.soilRoot?.title?.split('·')[1]?.trim() || items.soilRoot?.title),
            emShort(items.floodHaz?.title?.split('·')[1]?.trim() || items.floodHaz?.title),
            items.flood3d?.cloudMasked ? 'Flood map: clouded' : emShort(items.flood3d?.title?.split('·')[1]?.trim()),
            p.irrigation ? `Irrigation: ${p.irrigation}` : null,
            floodCount ? `${floodCount} flood mark(s)` : null,
          ].filter(Boolean).join(' · ')
        : [
            emShort(items.soil?.title?.split('·')[1]?.trim() || items.soil?.title),
            emShort(items.soilRoot?.title?.split('·')[1]?.trim() || items.soilRoot?.title),
            emShort(items.floodHaz?.title?.split('·')[1]?.trim() || items.floodHaz?.title),
            items.flood3d?.cloudMasked ? 'Ảnh ngập 3 ngày bị mây che' : emShort(items.flood3d?.title?.split('·')[1]?.trim()),
            p.irrigation ? `Tưới: ${p.irrigation === 'yes' ? 'chủ động' : p.irrigation === 'limited' ? 'hạn chế' : 'nhờ mưa'}` : null,
            floodCount ? `${floodCount} điểm ngập` : null,
          ].filter(Boolean).join(' · '),
    },
    {
      id: 'vegClimate',
      title: L === 'en' ? 'Crops & Topsoil Heat' : 'Cây trồng & Nhiệt đất',
      tone: isHotTopsoil && isOpenWindow ? 'warn' : 'ok',
      summary: L === 'en'
        ? [
            emShort(items.landCover?.title?.split('·')[1]?.trim() || items.landCover?.title),
            emShort(items.evi?.title?.split('·')[1]?.trim() || items.evi?.title),
            emShort(items.soilTemp?.title?.split('·')[1]?.trim() || items.soilTemp?.title),
          ].filter(Boolean).join(' · ')
        : [
            emShort(items.landCover?.title?.split('·')[1]?.trim() || items.landCover?.title),
            emShort(items.evi?.title?.split('·')[1]?.trim() || items.evi?.title),
            emShort(items.soilTemp?.title?.split('·')[1]?.trim() || items.soilTemp?.title),
          ].filter(Boolean).join(' · '),
    },
  ]

  const tacticBasis = {
    vi: 'Gợi ý từ tổ hợp lớp màu 5 km & thông số vườn; chỉ để tham khảo, cần đo thực tế tại ruộng.',
    en: 'Combined 5 km visual tiers + plot inputs; advisory reference only, verify on farm.',
  }
  const addTactic = (entry) => tactics.push({ isHeuristic: true, basis: tacticBasis, ...entry })

  const tactics = []
  if (ecUncalibrated) {
    addTactic({
      priority: 'high',
      drivers: ['soilType', 'soilPh'],
      title: L === 'en'
        ? 'EC reading is not soil ECe yet'
        : 'Chưa thể đối chiếu mặn vì số đo chưa phải ECe đất',
      detail: L === 'en'
        ? `Why: ${ecVal} dS/m${ecTypeDisplay} cannot auto-convert to soil ECe. Confirm ECe locally before checking FAO-29 thresholds.`
        : `Vì sao: ${ecVal} dS/m${ecTypeDisplay} khác chuẩn ECe nên không tự quy đổi. Bà con cần đo ECe đất để biết chính xác độ mặn.`,
    })
  }
  if (isSaline || (isAcid && isLowElev)) {
    addTactic({
      priority: 'high',
      drivers: ['soilPh', 'soilType', 'elev'],
      title: L === 'en' ? 'Flush acid/salt & test pH/ECe before planting' : 'Rửa phèn–mặn & đo lại pH/ECe trước khi xuống giống',
      detail: L === 'en'
        ? `Why: ${[soilNameShort, typeof elevM === 'number' ? `${elevM.toFixed(2)} m DEM` : '', ecIsEce && ecVal !== null ? `ECe ${ecVal} dS/m` : phVal !== null ? `pH ${phVal}` : 'acid/saline zone'].filter(Boolean).join(', ')}. Flush soil and check raised beds for sensitive crops.`
        : `Vì sao: ${[soilNameShort, typeof elevM === 'number' ? `nền thấp ${elevM.toFixed(2)} m` : '', ecIsEce && ecVal !== null ? `ECe ${ecVal} dS/m` : phVal !== null ? `pH ${phVal}` : 'vùng có dấu hiệu phèn/mặn'].filter(Boolean).join(', ')}. Nên rửa đất, đo pH/ECe tại ruộng và ưu tiên cây chịu phèn–mặn.`,
    })
  }
  if (isFloodProne || (isHeavyClay && isWetSoil)) {
    const whyFlood = isCurrentFlood
      ? (L === 'en' ? `high root wetness${floodCount ? ` + ${floodCount} flood marks` : ''}` : `ẩm sâu cao${floodCount ? ` + ${floodCount} dấu ngập` : ''}`)
      : (L === 'en' ? 'historical flood zone (1985–2003)' : 'vùng từng ngập theo lịch sử 1985–2003')
    addTactic({
      priority: 'high',
      drivers: ['floodHaz', 'soilRoot', 'soilClay', 'elev'],
      title: L === 'en' ? 'Check dykes & dig drainage ditches' : 'Kiểm tra đê bao & khơi rãnh thoát úng',
      detail: L === 'en'
        ? `Why: ${[emShort(items.soilClay?.title?.split('·')[1]?.trim()), whyFlood].filter(Boolean).join(' + ')}. Heavy waterlogged soil hurts upland roots; check dykes and drainage furrows.`
        : `Vì sao: ${[emShort(items.soilClay?.title?.split('·')[1]?.trim()), whyFlood].filter(Boolean).join(' + ')}. Đất bí nước dễ thối rễ cây màu; hãy kiểm tra đê bao và xẻ mương thoát nước.`,
    })
  }
  if (isWaterStressed) {
    const whyDry = isIrrigConstrained
      ? (L === 'en' ? `irrigation is ${p.irrigation}` : `vườn ${p.irrigation === 'no' ? 'nhờ nước mưa' : 'tưới hạn chế'}`)
      : (L === 'en' ? 'dry-season ESI / surface dryness' : 'vùng thiếu ẩm cuối mùa khô (ESI / ẩm mặt thấp)')
    addTactic({
      priority: 'high',
      drivers: ['soil', 'soilRoot', 'esi', 'rain'],
      title: L === 'en' ? 'Mulch topsoil & pick short-cycle crops' : 'Tủ gốc giữ ẩm mùa khô & ưu tiên cây ngắn ngày',
      detail: L === 'en'
        ? `Why: ${whyDry}. Mulch soil surface to cut evaporation and use short-cycle or drought-tolerant crops.`
        : `Vì sao: ${whyDry}. Thiếu nước làm giảm năng suất vụ khô; nên tủ rơm giữ ẩm, tưới tiết kiệm và chọn giống ngắn ngày.`,
    })
  }
  if (isLowN || isLowOm || isHighOm) {
    addTactic({
      priority: 'med',
      drivers: ['soilNitrogen', 'soilSoc', 'landCover'],
      title: L === 'en'
        ? (isHighOm ? 'Go easy on nitrogen fertilizer' : 'Add legumes or composted straw')
        : (isHighOm ? 'Giảm bớt phân đạm hóa học' : 'Xen cây họ đậu & vùi rơm hoai bồi mùn'),
      detail: L === 'en'
        ? (isHighOm
            ? 'Why: soil maps/inputs show rich organic matter. Avoid excess urea to prevent lodging and root oxygen stress.'
            : 'Why: soil layers show low humus/nitrogen. Rotating legumes and composted straw helps rebuild soil fertility.')
        : (isHighOm
            ? 'Vì sao: đất nền giàu mùn/hữu cơ. Bón nhiều đạm hóa học dễ làm cây vóng, lốp đổ và bí rễ khi mưa.'
            : 'Vì sao: lớp đất nền nghèo mùn và đạm. Trồng xen đậu hoặc vùi rơm hoai giúp đất tơi xốp và giữ phân tốt hơn.'),
    })
  }
  if (isHotTopsoil || isDenseCanopy || isOpenWindow) {
    addTactic({
      priority: isHotTopsoil ? 'med' : 'ok',
      drivers: ['ndvi', 'evi', 'lai', 'gpp', 'biomass', 'soilTemp'],
      title: L === 'en'
        ? (isHotTopsoil ? 'Shade topsoil & protect young roots' : isDenseCanopy ? 'Prune dense canopy for airflow' : 'Open field canopy window')
        : (isHotTopsoil ? 'Che phủ rơm chống nóng rễ non' : isDenseCanopy ? 'Tỉa cành tạo tán thoáng' : 'Mặt ruộng đang thoáng, dễ xuống giống'),
      detail: L === 'en'
        ? `Why: ${isDenseCanopy ? 'dense canopy limits airflow and invites fungi' : 'sparse crop cover'}${isHotTopsoil ? ', while surface temp is hot — mulch young roots.' : '.'}`
        : `Vì sao: ${isDenseCanopy ? 'tán lá rậm dễ giữ ẩm sâu bệnh nên cần tỉa thoáng' : 'mặt ruộng đang thoáng hoặc chuyển vụ'}${isHotTopsoil ? ', kết hợp đất mặt đang nóng nên tủ rơm giữ mát gốc.' : '.'}`,
    })
  }
  if (!tactics.length) {
    const totalLayers = EM_AVAILABLE_KEYS.length
    const presentDrivers = ['ndvi', 'soil', 'soilPh', 'elev'].filter((k) => items[k]?.desc && !items[k]?.cloudMasked)
    const isSparse = readCount < 10
    addTactic({
      priority: 'ok',
      drivers: presentDrivers,
      title: L === 'en'
        ? (isSparse ? `Only ${readCount}/${totalLayers} layers readable — measure soil locally` : 'No extreme regional warnings — verify field soil')
        : (isSparse ? `Mới đọc được ${readCount}/${totalLayers} lớp — cần đo thêm tại vườn` : 'Chưa thấy cảnh báo lớn trên bản đồ — kiểm tra thêm đất vườn'),
      detail: L === 'en'
        ? (isSparse
            ? `Why: ${totalLayers - readCount} layers lack data/clouded at this spot. Measure soil pH & ECe on site before deciding.`
            : 'Why: readable 5 km soil, flood, and heat layers look moderate. Still test field pH/ECe and check local calendar.')
        : (isSparse
            ? `Vì sao: nhiều lớp 5 km thiếu ảnh gốc hoặc mây che tại đây. Chưa đủ cơ sở kết luận nếu thiếu pH/ECe đo tại ruộng.`
            : 'Vì sao: các lớp đất, ngập, nhiệt độ đọc được ở mức vừa. Bà con vẫn nên đo pH/ECe vườn để chắc ăn trước khi gieo.'),
    })
  }

  return {
    lat,
    lon,
    readCount,
    cloudCount,
    totalLayers: EM_AVAILABLE_KEYS.length,
    profileCount: profileMetrics.length,
    ecUncalibrated,
    hasHistFlood,
    isCurrentFlood,
    isHeuristic: true,
    profileMetrics,
    items,
    groups: EM_FILTER_GROUPS,
    domains,
    tactics,
    methodologyNote: {
      vi: 'Lưu ý: Lớp vệ tinh 5 km dùng màu tương đối (trừ cao độ, ESI, nhóm đất FAO). Gợi ý bên dưới để tham khảo cùng số đo tại vườn.',
      en: 'Note: 5 km satellite layers show regional tiers (except numeric DEM, ESI, FAO/IGBP classes); combine with field tests.',
    },
  }
}
