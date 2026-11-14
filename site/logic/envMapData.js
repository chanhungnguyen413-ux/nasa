// Dữ liệu thực và metadata kiểm chứng cho 9 bộ lọc bản đồ ĐBSCL (lưới ~5 km).
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
    units: { vi: 'Cường độ mưa mm/giờ (ảnh ngày 13/11/2026)', en: 'Precipitation rate mm/hr (2026-11-13 snapshot)' },
    caveat: {
      vi: 'Đây là ảnh cường độ mưa 1 ngày (13/11/2026), KHÔNG phải tổng lượng mưa năm hay mưa cực đoan nhiều năm. Ô trống = không mưa lúc chụp.',
      en: 'Single-day rate snapshot (2026-11-13), NOT multi-year annual/extreme rainfall. Blank cells = no rain detected in snapshot.',
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
    units: { vi: 'Bảng màu ẩm đất mặt L4 (0–5 cm, m³/m³)', en: 'L4 surface soil moisture color scale (0–5 cm, m³/m³)' },
    caveat: {
      vi: 'Sản phẩm đồng hóa mô hình 9 km lớp đất mặt (0–5 cm), không thay thế đo ẩm tầng rễ 0–100 cm tại từng thửa ruộng.',
      en: '9 km assimilated surface-layer model product (0–5 cm); does not replace field-scale root-zone sensors.',
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
    units: { vi: 'Bảng màu nhiệt bề mặt ban ngày (Kelvin)', en: 'Daytime Land Surface Temperature color scale (Kelvin)' },
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
    units: { vi: 'Bảng màu nhiệt bề mặt ban đêm (Kelvin)', en: 'Nighttime Land Surface Temperature color scale (Kelvin)' },
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
    { hex: '#D62828', label: { vi: 'Đỏ cam · Rất chua / phèn mạnh (pH 4,5–5,0)', en: 'Crimson · Strongly acidic topsoil (pH 4.5–5.0)' }, desc: { vi: 'Nguy cơ ngộ độc phèn/nhôm cao; cần bón vôi, rửa phèn và ưu tiên cây chịu chua.', en: 'High acid/Al toxicity risk; apply lime, flush acidity, and pick tolerant crops.' } },
    { hex: '#F77F00', label: { vi: 'Cam đậm · Đất chua (pH 5,0–5,3)', en: 'Orange · Acidic topsoil (pH 5.0–5.3)' }, desc: { vi: 'Độ chua rõ rệt; cần bón lót vôi + lân trước khi xuống giống rau màu/đậu.', en: 'Marked acidity; basal lime and phosphorus recommended before vegetables/legumes.' } },
    { hex: '#FCBF49', label: { vi: 'Vàng nghệ · Chua vừa (pH 5,3–5,6)', en: 'Amber-gold · Moderately acidic (pH 5.3–5.6)' }, desc: { vi: 'Phù hợp lúa, khóm, mía; bổ sung vôi nhẹ nếu trồng dưa/ớt/cây ăn trái.', en: 'Suits rice and pineapple; light liming helps melons, chili, or orchards.' } },
    { hex: '#80B918', label: { vi: 'Xanh cốm · Ít chua (pH 5,6–5,9)', en: 'Lime green · Slightly acidic (pH 5.6–5.9)' }, desc: { vi: 'Ngưỡng khá tốt cho đa số cây trồng ĐBSCL, dinh dưỡng dễ hấp thu.', en: 'Good range for most delta crops with balanced nutrient availability.' } },
    { hex: '#2A9D8F', label: { vi: 'Xanh lục ngọc · Gần trung tính (pH 5,9–6,2)', en: 'Teal · Near-neutral topsoil (pH 5.9–6.2)' }, desc: { vi: 'Thuận lợi cho cây ăn trái, họ đậu, bắp và rau màu chất lượng cao.', en: 'Favorable pH for fruit orchards, legumes, maize, and vegetables.' } },
    { hex: '#1D6FA5', label: { vi: 'Xanh lam · Trung tính (pH ≥ 6,2)', en: 'Blue · Neutral topsoil (pH ≥ 6.2)' }, desc: { vi: 'Hữu dụng lân và vi lượng tốt; thuận lợi luân canh đa dạng.', en: 'Optimal phosphorus availability supporting diverse crop rotations.' } },
  ],
  soilSoc: [
    { hex: '#F3D58D', label: { vi: 'Vàng kem · Hữu cơ thấp (15–25 g/kg)', en: 'Warm cream · Low organic carbon (15–25 g/kg)' }, desc: { vi: 'Nền mùn thấp; cần vùi rơm hoai, phân hữu cơ hoặc trồng xen họ đậu.', en: 'Low humus; incorporate straw compost, manure, or legume cover crops.' } },
    { hex: '#E09F3E', label: { vi: 'Cam đất · Hữu cơ trung bình (25–35 g/kg)', en: 'Ochre · Moderate organic carbon (25–35 g/kg)' }, desc: { vi: 'Hữu cơ ở mức trung bình khá; giữ chế độ trả rơm lại đồng để ổn định đất.', en: 'Moderate background SOC; retain crop residues to maintain tilth.' } },
    { hex: '#C86D51', label: { vi: 'Đồng đỏ · Hữu cơ khá (35–45 g/kg)', en: 'Terracotta · Fairly rich SOC (35–45 g/kg)' }, desc: { vi: 'Giữ ẩm và giữ phân khá tốt cho cả lúa lẫn cây ăn trái.', en: 'Solid SOC supporting moisture retention and fertilizer efficiency.' } },
    { hex: '#7F4F24', label: { vi: 'Nâu sẫm · Giàu hữu cơ (45–60 g/kg)', en: 'Deep brown · Rich organic carbon (45–60 g/kg)' }, desc: { vi: 'Đất giàu mùn hữu cơ, giảm phân hóa học và tăng thoát nước mùa mưa.', en: 'Humus-rich soil; cut chemical N slightly and keep drainage channels open.' } },
    { hex: '#4A148C', label: { vi: 'Tím than · Rất giàu mùn / than bùn (> 60 g/kg)', en: 'Deep violet · Peaty / very high SOC (> 60 g/kg)' }, desc: { vi: 'Vùng rất giàu than bùn (U Minh/trũng sâu); tránh ngập yếm khí kéo dài.', en: 'Peaty soil typical of humic wetlands; prevent prolonged root anoxia.' } },
  ],
  soilClay: [
    { hex: '#F4D35E', label: { vi: 'Vàng cát · Thịt pha sét nhẹ (< 32%)', en: 'Sandy gold · Light clay loam (< 32%)' }, desc: { vi: 'Đất tơi thoáng nhất vùng, thuận lợi lên liếp rau màu, dưa và cây ăn trái.', en: 'Best-drained texture in delta for vegetables, melons, and orchard beds.' } },
    { hex: '#EE964B', label: { vi: 'Cam hổ phách · Sét trung bình (32–35%)', en: 'Amber-orange · Medium clay (32–35%)' }, desc: { vi: 'Cân bằng giữa giữ ẩm và thoát nước; rất hợp luân canh lúa – màu.', en: 'Balanced drainage and water retention ideal for rice–upland rotation.' } },
    { hex: '#C85A32', label: { vi: 'Đỏ gạch · Sét khá nặng (35–38%)', en: 'Brick red · Clay loam (35–38%)' }, desc: { vi: 'Giữ nước tốt; lên mô/liếp cao hơn mặt mương khi trồng cây ăn trái.', en: 'Water-retentive clay loam; use raised orchard mounds with drainage ditches.' } },
    { hex: '#7F2B1D', label: { vi: 'Nâu đỏ đậm · Đất sét nặng (38–41%)', en: 'Maroon · Heavy clay (38–41%)' }, desc: { vi: 'Thoát nước chậm khi mưa dầm; cần mương thoát nước sâu nếu chuyển sang cây cạn.', en: 'Slow drainage under heavy rain; cut deep furrows for upland sowing.' } },
    { hex: '#3D1E3A', label: { vi: 'Tím nâu sẫm · Sét rất nặng (≥ 41%)', en: 'Dark plum · Very heavy clay (≥ 41%)' }, desc: { vi: 'Nền sét rất chặt giữ nước mặt tốt cho lúa, dễ nứt nẻ mùa khô nếu thiếu phủ rơm.', en: 'Tight clay holding paddy water well; mulch in dry season to curb cracking.' } },
  ],
  soilNitrogen: [
    { hex: '#E9D8A6', label: { vi: 'Vàng nhạt · Đạm nền thấp (< 2,5 g/kg)', en: 'Sand · Low background N (< 2.5 g/kg)' }, desc: { vi: 'Đạm hữu cơ tự nhiên thấp; ưu tiên luân canh đậu xanh/đậu nành cố định đạm.', en: 'Low organic N reserve; include nitrogen-fixing legumes in rotation.' } },
    { hex: '#94D2BD', label: { vi: 'Xanh cốm · Đạm trung bình (2,5–3,1 g/kg)', en: 'Soft mint · Moderate N (2.5–3.1 g/kg)' }, desc: { vi: 'Nền đạm vừa phải; chia nhỏ đợt bón thúc theo giai đoạn sinh trưởng.', en: 'Moderate background N; apply split top-dressings by growth stage.' } },
    { hex: '#2A9D8F', label: { vi: 'Xanh ngọc · Đạm khá (3,1–3,7 g/kg)', en: 'Teal · Fairly rich N (3.1–3.7 g/kg)' }, desc: { vi: 'Cân đối đạm nền khá tốt, giảm rủi ro thiếu hụt giai đoạn làm đòng.', en: 'Solid background N supporting vegetative and panicle development.' } },
    { hex: '#1D6FA5', label: { vi: 'Xanh lam · Giàu đạm (3,7–4,4 g/kg)', en: 'Blue · Rich N (3.7–4.4 g/kg)' }, desc: { vi: 'Nền đạm tự nhiên giàu; tiết chế urê đầu vụ để hạn chế sâu bệnh và lốp đổ.', en: 'Rich background N; moderate early urea to avoid lodging and pests.' } },
    { hex: '#1D3557', label: { vi: 'Chàm đậm · Rất giàu đạm hữu cơ (> 4,4 g/kg)', en: 'Indigo · Very rich organic N (> 4.4 g/kg)' }, desc: { vi: 'Vùng giàu mùn–đạm (thường kèm than bùn); bổ sung kali–canxi cân bằng thân lá.', en: 'High humic-N zone; pair with potassium and calcium for sturdy stems.' } },
  ],
  soil: [
    { hex: '#E9C46A', label: { vi: 'Vàng cam · Đất mặt ráo / ẩm nhẹ (0,20–0,32 m³/m³)', en: 'Warm gold · Lightly moist topsoil (0.20–0.32 m³/m³)' }, desc: { vi: 'Lớp đất mặt 0–5 cm tương đối ráo, thuận tiện làm đất hoặc xuống giống cây màu.', en: 'Relatively drained top 0–5 cm soil suited to tilling and upland planting.' } },
    { hex: '#4CC9F0', label: { vi: 'Xanh ngọc · Đất mặt ẩm vừa (0,32–0,40 m³/m³)', en: 'Aqua cyan · Moderately moist topsoil (0.32–0.40 m³/m³)' }, desc: { vi: 'Độ ẩm bề mặt 0–5 cm đủ ẩm đều cho nảy mầm và rễ nông.', en: 'Balanced 0–5 cm soil moisture supporting germination and shallow roots.' } },
    { hex: '#1D4ED8', label: { vi: 'Xanh dương đậm · Đất mặt rất ẩm (0,40–0,48 m³/m³)', en: 'Deep blue · High surface soil moisture (0.40–0.48 m³/m³)' }, desc: { vi: 'Đất mặt 0–5 cm rất ẩm (vùng giữ nước hoặc ruộng trũng).', en: 'High surface soil moisture (0–5 cm), typical of wet paddy or coastal lowlands.' } },
    { hex: '#1E1B4B', label: { vi: 'Chàm thẫm · Đặc biệt ẩm (0,48–0,58 m³/m³)', en: 'Midnight indigo · Very wet surface (0.48–0.58 m³/m³)' }, desc: { vi: 'Tầng đất mặt rất ướt, hạn chế làm đất cơ giới nặng hoặc gieo cây cạn trực tiếp.', en: 'Very wet topsoil; avoid heavy machinery or un-ridged upland sowing.' } },
    { hex: '#7B2CBF', label: { vi: 'Tím sẫm · Bão hòa nước / sát mặt ruộng (≥ 0,58 m³/m³)', en: 'Deep purple · Saturated / waterlogged surface (≥ 0.58 m³/m³)' }, desc: { vi: 'Lớp đất mặt 0–5 cm bão hòa hoàn toàn hoặc đọng nước mặt ruộng.', en: 'Near-saturated 0–5 cm layer or standing water over fields.' } },
  ],
  soilRoot: [
    { hex: '#52B788', label: { vi: 'Xanh lá · Ẩm tầng rễ vừa (0,35–0,44 m³/m³)', en: 'Green · Balanced root moisture (0.35–0.44 m³/m³)' }, desc: { vi: 'Tầng rễ 0–100 cm thông thoáng, thuận lợi cây ăn trái và hoa màu rễ sâu.', en: 'Well-aerated 0–100 cm root zone ideal for orchards and upland crops.' } },
    { hex: '#0096C7', label: { vi: 'Xanh da trời · Ẩm tầng rễ khá (0,44–0,50 m³/m³)', en: 'Sky blue · Moist root zone (0.44–0.50 m³/m³)' }, desc: { vi: 'Dự trữ ẩm sâu dồi dào cho giai đoạn trổ/nuôi hạt không bị úng.', en: 'Healthy deep water reserve without waterlogging pressure.' } },
    { hex: '#1D4ED8', label: { vi: 'Xanh dương đậm · Tầng rễ ẩm cao (0,50–0,56 m³/m³)', en: 'Royal blue · Wet root zone (0.50–0.56 m³/m³)' }, desc: { vi: 'Tầng rễ ẩm cao; thích hợp lúa nước hoặc vườn có mương tiêu nước chủ động.', en: 'Wet subsoil favoring paddy rice or orchards with active drainage canals.' } },
    { hex: '#311B92', label: { vi: 'Chàm tím · Tầng rễ rất ẩm (0,56–0,68 m³/m³)', en: 'Deep violet · Very wet subsoil (0.56–0.68 m³/m³)' }, desc: { vi: 'Mực thủy cấp nông gần mặt liếp; cần bơm tiêu rãnh trước khi cây ra hoa.', en: 'Shallow water table; pump down orchard ditches prior to flowering.' } },
    { hex: '#6A040F', label: { vi: 'Đỏ rượu · Bão hòa / ngập úng tầng rễ (≥ 0,70 m³/m³)', en: 'Burgundy · Saturated / marshy root zone (≥ 0.70 m³/m³)' }, desc: { vi: 'Tầng 0–100 cm bão hòa hoàn toàn; chỉ hợp lúa nước, sen, thủy sản hoặc đầm lầy.', en: 'Fully saturated 0–100 cm profile suited to aquatic or paddy systems.' } },
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
    { hex: '#74C69D', label: { vi: 'Xanh ngọc nhạt · Mưa rất nhỏ (< 1 mm/giờ)', en: 'Pale mint · Very light rain (< 1 mm/hr)' }, desc: { vi: 'Cường độ mưa rất nhẹ trong ảnh quét GPM ngày 13/11/2026.', en: 'Trace rainfall rate in the 2026-11-13 GPM snapshot.' } },
    { hex: '#2D6A4F', label: { vi: 'Xanh lá · Mưa nhỏ rải rác (1–2,5 mm/giờ)', en: 'Forest green · Light rain (1–2.5 mm/hr)' }, desc: { vi: 'Mưa nhỏ giúp mát tán lá nhưng chưa đủ bổ sung trữ ẩm lớn.', en: 'Light shower cooling leaves without heavy runoff.' } },
    { hex: '#0096C7', label: { vi: 'Xanh lam · Mưa vừa (2,5–5 mm/giờ)', en: 'Cyan blue · Moderate rain (2.5–5 mm/hr)' }, desc: { vi: 'Cường độ mưa trung bình, thuận lợi giảm tưới bổ sung.', en: 'Moderate rainfall rate reducing immediate irrigation demand.' } },
    { hex: '#F77F00', label: { vi: 'Cam đậm · Mưa khá lớn (5–10 mm/giờ)', en: 'Orange · Moderately heavy rain (5–10 mm/hr)' }, desc: { vi: 'Mưa khá đậm; kiểm tra cống thoát nước ruộng màu/liếp.', en: 'Brisk rain rate; verify drainage outlets on upland beds.' } },
    { hex: '#D62828', label: { vi: 'Đỏ tươi · Mưa lớn cục bộ (> 10 mm/giờ)', en: 'Crimson · Heavy localized rain (> 10 mm/hr)' }, desc: { vi: 'Ổ mưa lớn nhất ngày quét; lưu ý ngập úng cục bộ hoặc xói trôi phân vừa bón.', en: 'Strongest storm core in overpass; watch for runoff and fertilizer leaching.' } },
  ],
  flood3d: [
    { hex: '#94A3B8', label: { vi: 'Xám đá · Mây che / thiếu ảnh quang học', en: 'Slate grey · Cloud cover / insufficient optical data' }, desc: { vi: 'MODIS không xuyên được mây trong 3 ngày này — không phải xác nhận khô ráo.', en: 'Optical MODIS blocked by clouds in this 3-day window — cannot confirm dry ground.' } },
    { hex: '#00B4D8', label: { vi: 'Xanh ngọc sáng · Mặt nước sông kênh thường xuyên', en: 'Cyan · Permanent surface water' }, desc: { vi: 'Dòng sông lớn, kênh rạch hoặc ao nuôi thủy sản cố định trong ô 5 km.', en: 'Main river channels, canals, or permanent aquaculture water.' } },
    { hex: '#F59E0B', label: { vi: 'Vàng hổ phách · Vùng ngập lặp lại theo mùa lũ', en: 'Amber · Recurring seasonal floodwater' }, desc: { vi: 'Vùng ghi nhận nước ngập lặp lại vào mùa nổi; ưu tiên mô hình thích nghi lũ.', en: 'Area showing recurring flood signatures; favor flood-adapted crops or dyked plots.' } },
    { hex: '#DC2626', label: { vi: 'Đỏ tươi · Ngập lũ phát hiện trong 3 ngày', en: 'Red · Active 3-day floodwater detected' }, desc: { vi: 'Tín hiệu nước dâng trên nền đất canh tác trong chu kỳ 3 ngày.', en: 'Active floodwater footprint over agricultural land in the 3-day window.' } },
  ],
  floodHaz: [
    { hex: '#66BB6A', label: { vi: 'Xanh lá · Tần suất ngập lịch sử thấp (Phân vị 1–3)', en: 'Green · Low historical flood frequency (Decile 1–3)' }, desc: { vi: 'Ít sự kiện lũ lớn lịch sử ở cấp độ vùng; vẫn cần xem mực triều cường địa phương.', en: 'Lower regional flood recurrence; still verify local tidal gates.' } },
    { hex: '#FDD835', label: { vi: 'Vàng · Nguy cơ trung bình thấp (Phân vị 4)', en: 'Yellow · Low-moderate frequency (Decile 4)' }, desc: { vi: 'Có xuất hiện ngập theo đợt đỉnh lũ hoặc mưa cực đoan.', en: 'Occasional flooding during peak river surges or heavy storms.' } },
    { hex: '#F77F00', label: { vi: 'Cam · Nguy cơ ngập đáng kể (Phân vị 5)', en: 'Orange · Notable flood frequency (Decile 5)' }, desc: { vi: 'Vùng có lịch sử ngập mùa nổi; nên tôn bờ bao hoặc gieo thu hoạch né đỉnh lũ.', en: 'Regular historical flood zone; strengthen bunds or schedule flood-evading harvests.' } },
    { hex: '#9B2226', label: { vi: 'Đỏ rượu · Tần suất ngập lịch sử cao (Phân vị ≥ 6)', en: 'Dark crimson · High historical flood frequency (Decile ≥ 6)' }, desc: { vi: 'Nằm trong vùng trũng / hành lang thoát lũ; ưu tiên sinh kế thuận mùa nước nổi.', en: 'Deep flood-corridor recurrence; prioritize lotus, rice-fish, or dyked crops.' } },
  ],
  ndvi: [
    { hex: '#C69C6D', label: { vi: 'Nâu cát · Đất trống, mặt nước hoặc mới cày xới', en: 'Tan · Bare soil, water, or freshly tilled' }, desc: { vi: 'Ít hoặc không có tán lá xanh tại thời điểm chụp 16 ngày.', en: 'Little or no green canopy during the 16-day window.' } },
    { hex: '#D9ED92', label: { vi: 'Vàng xanh · Cây mới lên hoặc tán thưa', en: 'Yellow-green · Emerging crop or sparse cover' }, desc: { vi: 'Độ phủ cây xanh đầu vụ hoặc đất ruộng mới bén rễ.', en: 'Low vegetation density (early growth or sparse canopy).' } },
    { hex: '#52B788', label: { vi: 'Xanh lá sáng · Cây trồng đang phát triển khá', en: 'Fresh green · Developing active crop canopy' }, desc: { vi: 'Thảm thực vật khép tán trung bình khá và sinh trưởng ổn định.', en: 'Moderately closed canopy with active vegetative growth.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Tán xanh dày khỏe mạnh', en: 'Emerald · Dense vigorous crop canopy' }, desc: { vi: 'Mật độ tán lá dày, quang hợp mạnh (lúa đang đòng/trổ hoặc vườn xanh tốt).', en: 'Dense green canopy in peak growth or well-kept orchard.' } },
    { hex: '#083D27', label: { vi: 'Lục thẫm · Thảm thực vật tối đa / rừng & vườn lâu năm', en: 'Deep pine · Peak lush biomass / forest or mature orchard' }, desc: { vi: 'Độ xanh và che phủ cao nhất đồng bằng; chú ý thông thoáng phòng nấm bệnh mùa ẩm.', en: 'Highest greenness density across the delta; prune for airflow in wet weather.' } },
  ],
  evi: [
    { hex: '#C69C6D', label: { vi: 'Nâu cát · Thực vật rất thưa / mặt nước (EVI < 0,15)', en: 'Tan · Bare soil / water / newly sown (EVI < 0.15)' }, desc: { vi: 'Độ phủ lá non rất ít; thuận tiện làm đất hoặc gieo sạ chuẩn bị vụ mới.', en: 'Minimal green canopy; open window for soil prep or seedbed establishment.' } },
    { hex: '#D4E09B', label: { vi: 'Vàng mạ · Tán non / thưa (EVI 0,15–0,25)', en: 'Chartreuse · Sparse developing canopy (EVI 0.15–0.25)' }, desc: { vi: 'Cây trồng đầu vụ đang vươn tán; giai đoạn cần giữ ẩm và trừ cỏ sớm.', en: 'Early vegetative cover requiring moisture and weed control.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá sáng · Tán khá khỏe (EVI 0,25–0,36)', en: 'Fresh green · Healthy closed canopy (EVI 0.25–0.36)' }, desc: { vi: 'Tán khép tương đối đều, tăng trưởng ổn định không bị bão hòa.', en: 'Evenly closed canopy growing steadily.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Sinh khối tán dày (EVI 0,36–0,48)', en: 'Emerald · Thick canopy (EVI 0.36–0.48)' }, desc: { vi: 'Tán vườn cây ăn trái hoặc đồng ruộng sung sức cao.', en: 'Vigorous orchard or peak-stage field canopy.' } },
    { hex: '#083D27', label: { vi: 'Lục thẫm · Sinh khối tán cực dày (EVI > 0,48)', en: 'Deep pine · Ultra-dense lush canopy (EVI > 0.48)' }, desc: { vi: 'Vườn cây lâu năm / rừng rậm nhất; lưu ý tỉa cành hạ ẩm độ dưới tán.', en: 'Densest perennial tree cover; thin interior branches for ventilation.' } },
  ],
  lai: [
    { hex: '#F9DC5C', label: { vi: 'Vàng tươi · Diện tích lá rất thấp (LAI < 0,6)', en: 'Bright yellow · Very sparse foliage (LAI < 0.6)' }, desc: { vi: 'Ánh nắng chiếu thẳng xuống đất; nên phủ rơm giữ ẩm chống bốc hơi.', en: 'Exposed topsoil; mulch to reduce evaporation.' } },
    { hex: '#B5E48C', label: { vi: 'Xanh non · Tán thưa vừa (LAI 0,6–1,2)', en: 'Sprout green · Sparse-moderate canopy (LAI 0.6–1.2)' }, desc: { vi: 'Độ dày tán vừa phải, hợp xen canh cây họ đậu ngắn ngày giữa hàng.', en: 'Moderate leaf cover allowing legume intercropping between rows.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá · Tán dày khá đều (LAI 1,2–1,9)', en: 'Medium green · Developed canopy (LAI 1.2–1.9)' }, desc: { vi: 'Che phủ đất tốt giúp giảm cỏ dại và ổn định nhiệt ẩm tầng mặt.', en: 'Good cover suppressing weeds and moderating topsoil heat.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Tán rất dày (LAI 1,9–2,6)', en: 'Emerald · Dense multi-layer canopy (LAI 1.9–2.6)' }, desc: { vi: 'Tán rậm che bóng mạnh; chọn cây chịu rợp bán phần nếu trồng xen.', en: 'Thick shade; choose shade-tolerant understory crops.' } },
    { hex: '#0B3C49', label: { vi: 'Xanh thẫm · Tán rừng / vườn kín hoàn toàn (LAI > 2,6)', en: 'Deep teal · Closed forest/orchard canopy (LAI > 2.6)' }, desc: { vi: 'Độ dày lá cực đại; cần tỉa tán thông thoáng để hạn chế nấm bệnh.', en: 'Maximum foliage density; prune to maintain airflow.' } },
  ],
  fpar: [
    { hex: '#FDE68A', label: { vi: 'Vàng nhạt · Hấp thụ bức xạ thấp (fPAR < 0,25)', en: 'Pale gold · Low light capture (fPAR < 0.25)' }, desc: { vi: 'Đất trống, mặt nước hoặc ruộng mới gieo sạ.', en: 'Fallow, open water, or newly sown paddies.' } },
    { hex: '#F59E0B', label: { vi: 'Vàng cam · Hấp thụ trung bình (fPAR 0,25–0,45)', en: 'Amber · Moderate light capture (fPAR 0.25–0.45)' }, desc: { vi: 'Tán cây thu nhận khoảng một phần ba đến gần một nửa ánh sáng quang hợp.', en: 'Canopy intercepts roughly 25–45% of photosynthetic radiation.' } },
    { hex: '#84CC16', label: { vi: 'Xanh chanh · Hấp thụ khá cao (fPAR 0,45–0,60)', en: 'Lime · Good light capture (fPAR 0.45–0.60)' }, desc: { vi: 'Cây trồng phát triển nhanh, tán đang mở rộng.', en: 'Actively expanding crop canopy.' } },
    { hex: '#10B981', label: { vi: 'Xanh ngọc · Hấp thụ cao (fPAR 0,60–0,72)', en: 'Emerald · High light capture (fPAR 0.60–0.72)' }, desc: { vi: 'Tán sử dụng bức xạ mặt trời hiệu quả trong giai đoạn tạo năng suất.', en: 'Efficient solar PAR capture during yield formation.' } },
    { hex: '#065F46', label: { vi: 'Lục đậm · Quang hợp tối đa (fPAR > 0,72)', en: 'Deep green · Peak PAR capture (fPAR > 0.72)' }, desc: { vi: 'Hơn 72% bức xạ quang hợp được tán lá giữ lại.', en: 'Over 72% of PAR captured by dense foliage.' } },
  ],
  gpp: [
    { hex: '#E63946', label: { vi: 'Đỏ · Quang hợp 8 ngày thấp (< 0,012 kg C/m²)', en: 'Red · Low 8-day productivity (< 0.012 kg C/m²)' }, desc: { vi: 'Đất chuyển vụ, mặt nước hoặc cây đang chịu stress khô nóng/mây nhiều.', en: 'Fallow transition or stressed vegetation.' } },
    { hex: '#F4A261', label: { vi: 'Cam · Quang hợp yếu–trung bình (0,012–0,020)', en: 'Orange · Low-moderate productivity (0.012–0.020)' }, desc: { vi: 'Cây mới bén rễ đầu vụ, tích lũy sinh khối còn chậm.', en: 'Early-stage crop with modest dry-matter gain.' } },
    { hex: '#E9C46A', label: { vi: 'Vàng · Quang hợp trung bình khá (0,020–0,028)', en: 'Yellow · Moderate productivity (0.020–0.028)' }, desc: { vi: 'Tốc độ quang hợp ổn định tại vùng trồng xen hoặc giữa vụ.', en: 'Steady assimilation in mixed or mid-season plots.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá · Quang hợp mạnh (0,028–0,038)', en: 'Green · Strong productivity (0.028–0.038)' }, desc: { vi: 'Cây sinh trưởng sung sức, tích lũy tinh bột và sinh khối nhanh.', en: 'Rapid biomass buildup and grain filling.' } },
    { hex: '#1B4332', label: { vi: 'Lục thẫm · Quang hợp cực đại (> 0,038 kg C/m²)', en: 'Deep pine · Peak productivity (> 0.038 kg C/m²)' }, desc: { vi: 'Cường độ quang hợp cao nhất ĐBSCL trong chu kỳ 8 ngày.', en: 'Peak carbon uptake rate across the Mekong Delta.' } },
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
    { hex: '#E9D8A6', label: { vi: 'Vàng cát · Rất thấp < 5 Mg/ha (đất ruộng lúa/màu)', en: 'Sand · Very low woody biomass < 5 Mg/ha' }, desc: { vi: 'Đặc trưng của đồng ruộng lúa/màu trống tán gỗ hoặc đồng trống.', en: 'Typical of treeless rice paddies and seasonal field crops.' } },
    { hex: '#A7C957', label: { vi: 'Xanh cốm · Thấp 5–15 Mg/ha (cây bờ thửa phân tán)', en: 'Light green · Low biomass 5–15 Mg/ha' }, desc: { vi: 'Có dải cây ven bờ, cây bụi hoặc vườn cây ăn trái mới trồng.', en: 'Scattered bund trees, shrubs, or young orchards.' } },
    { hex: '#52B788', label: { vi: 'Xanh lá · Trung bình 15–30 Mg/ha (vườn tạp / cây ăn trái nhỏ)', en: 'Green · Moderate biomass 15–30 Mg/ha' }, desc: { vi: 'Vùng nông – lâm kết hợp hoặc vườn cây ăn trái tán vừa.', en: 'Mixed homegardens or medium-stature orchards.' } },
    { hex: '#1B7F5C', label: { vi: 'Xanh ngọc đậm · Khá cao 30–65 Mg/ha (vườn cây lâu năm)', en: 'Emerald · High orchard biomass 30–65 Mg/ha' }, desc: { vi: 'Vườn cây ăn trái trưởng thành dày tán hoặc tràm/đước trung bình.', en: 'Mature dense fruit orchards or mid-biomass woodlands.' } },
    { hex: '#083D27', label: { vi: 'Lục thẫm · Cao > 65 Mg/ha (rừng tràm / rừng ngập mặn)', en: 'Deep pine · Dense forest biomass > 65 Mg/ha' }, desc: { vi: 'Khu vực tích lũy sinh khối gỗ cao nhất đồng bằng.', en: 'Highest standing woody biomass across the delta.' } },
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
    { hex: '#2A9D8F', label: { vi: 'Xanh ngọc · Đất mặt mát (24–26,5 °C)', en: 'Teal · Cool topsoil (24–26.5 °C)' }, desc: { vi: 'Nhiệt độ đất tầng 0–10 cm êm dịu, rất thuận lợi cho nảy mầm và rễ tơ.', en: 'Cool 0–10 cm topsoil ideal for germination and feeder roots.' } },
    { hex: '#8AB17D', label: { vi: 'Xanh lá dịu · Đất mặt mát–ấm (26,5–27,5 °C)', en: 'Sage · Mild topsoil (26.5–27.5 °C)' }, desc: { vi: 'Nền nhiệt tầng đất mặt cân bằng cho hầu hết cây trồng ĐBSCL.', en: 'Balanced topsoil temperature comfortable for most delta crops.' } },
    { hex: '#E9C46A', label: { vi: 'Vàng · Đất mặt ấm (27,5–29 °C)', en: 'Yellow · Warm topsoil (27.5–29 °C)' }, desc: { vi: 'Đất mặt bắt đầu ấm hơn vào buổi trưa; giữ phủ gốc nếu đất trồng màu còn trống.', en: 'Moderately warm topsoil; keep mulch over bare vegetable beds.' } },
    { hex: '#F4A261', label: { vi: 'Cam · Đất mặt khá nóng (29–30,5 °C)', en: 'Orange · Hot-warm topsoil (29–30.5 °C)' }, desc: { vi: 'Cường độ nóng tăng ở tầng 0–10 cm; nên tủ rơm và tưới giữ ẩm sáng sớm.', en: 'Warm-hot top layer; apply straw mulch and morning irrigation.' } },
    { hex: '#C1121F', label: { vi: 'Đỏ đậm · Đất mặt nóng (30,5–33 °C)', en: 'Crimson · Hot topsoil (30.5–33 °C)' }, desc: { vi: 'Tầng đất mặt tích nhiệt cao nhất đồng bằng; bắt buộc che phủ rơm rạ tránh sốc nhiệt rễ.', en: 'Hottest topsoil zone; mulch heavily to protect seedlings and soil microbes.' } },
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
    units: { vi: 'Độ chua pH (H₂O) tầng 0–5 cm', en: 'Soil pH in H₂O (0–5 cm)' },
    caveat: {
      vi: 'Ước lượng địa thống kê 250 m tầng 0–5 cm; cần ưu tiên pH tự đo tại ruộng khi bón vôi hạ phèn.',
      en: '250 m geostatistical 0–5 cm estimate; prioritize on-farm pH testing before liming.',
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
    units: { vi: 'g C / kg đất (0–5 cm)', en: 'g C / kg fine earth (0–5 cm)' },
    caveat: {
      vi: 'Phản ánh nền mùn hữu cơ tự nhiên theo vùng (cao ở U Minh/Đồng Tháp Mười), chưa phản ánh phân chuồng vừa bón.',
      en: 'Reflects regional background soil organic carbon; recent plot compost additions are captured via your farm profile.',
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
    units: { vi: 'Tỷ lệ hạt sét (%) trong đất mịn', en: 'Clay content (%) in fine earth' },
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
    units: { vi: 'g N / kg đất (tổng đạm nền)', en: 'g N / kg soil (background total N)' },
    caveat: {
      vi: 'Đây là đạm tổng nền trong đất chứ không phải đạm dễ tiêu tức thời (NH₄⁺/NO₃⁻) sau khi bón ure.',
      en: 'Measures total background soil nitrogen rather than plant-available mineral N right after fertilization.',
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
    units: { vi: 'Độ ẩm thể tích tầng rễ 0–100 cm (m³/m³)', en: '0–100 cm root-zone wetness (m³/m³)' },
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
    units: { vi: 'Phân vị tần suất ngập lịch sử (Decile 1–10)', en: 'Historical flood frequency decile (1–10)' },
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
    units: { vi: 'Chỉ số thực vật tăng cường EVI (ít bão hòa tán dày)', en: 'Enhanced Vegetation Index EVI (canopy-sensitive)' },
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
    units: { vi: 'Diện tích lá / diện tích đất (m²/m²)', en: 'One-sided green leaf area per ground area (m²/m²)' },
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
    units: { vi: 'Tỷ lệ bức xạ quang hợp hấp thụ (0–1)', en: 'Fraction of absorbed PAR (0–1)' },
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
    units: { vi: 'Tích lũy carbon quang hợp (kg C/m²/8 ngày)', en: 'Gross photosynthetic carbon uptake (kg C/m²/8-day)' },
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
    units: { vi: 'Mật độ sinh khối thân gỗ/cây lâu năm (Mg/ha)', en: 'Aboveground biomass density (Mg/ha)' },
    caveat: {
      vi: 'Nhạy với cây lâu năm, vườn cây ăn trái cao tán và rừng tràm/đước; lúa ngắn ngày sẽ hiển thị sinh khối gỗ gần 0.',
      en: 'Measures standing woody biomass (orchards/forests); short-cycle paddy fields naturally register near 0 Mg/ha.',
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
    units: { vi: 'Nhiệt độ lớp đất mặt 0–10 cm (K / °C)', en: 'Topsoil temperature 0–10 cm (K / °C)' },
    caveat: {
      vi: 'Lớp nhiệt đất 9 km phản ánh sức nóng vùng rễ nông; che phủ rơm rạ tại vườn giúp hạ 2–4 °C so với đất trần.',
      en: '9 km modeled topsoil heat index; field mulching lowers actual root-zone temperatures compared to bare soil.',
    },
  },
})

export function emSynthesizeGardenStack(envMap, lat, lon, garden = null, floodCount = 0, lang = 'vi') {
  const m = emGetEnvMap(envMap)
  const L = lang === 'en' ? 'en' : 'vi'
  if (!m || lat == null || lon == null) return null
  const items = {}
  let readCount = 0
  for (const key of EM_AVAILABLE_KEYS) {
    const cell = emCellAt(m, key, lat, lon)
    const desc = cell && !cell.missing ? emDescribeCell(key, cell) : null
    if (desc) readCount += 1
    const meta = EM_FILTER_META[key]
    items[key] = {
      key,
      meta,
      cell,
      desc,
      hex: desc?.hex || null,
      bandIndex: desc?.bandIndex ?? null,
      totalBands: desc?.totalBands ?? null,
      title: desc?.title?.[L] || null,
      detail: desc?.detail?.[L] || null,
    }
  }
  if (!readCount) return null

  const p = garden?.profile || {}
  const profileMetrics = []
  if (p.soilType) profileMetrics.push({ k: 'soil', label: p.soilType })
  if (p.ph !== '' && p.ph != null && Number.isFinite(+p.ph)) profileMetrics.push({ k: 'ph', val: +p.ph })
  if (p.ec !== '' && p.ec != null && Number.isFinite(+p.ec)) profileMetrics.push({ k: 'ec', val: +p.ec, type: p.ecType || 'ece' })
  if (p.om) profileMetrics.push({ k: 'om', label: p.om })
  if (p.irrigation) profileMetrics.push({ k: 'irrigation', label: p.irrigation })
  if (p.season) profileMetrics.push({ k: 'season', label: p.season })
  if (floodCount > 0) profileMetrics.push({ k: 'floodMarks', val: floodCount })

  const b = (k) => items[k]?.bandIndex
  const elevM = items.elev?.cell?.elevM
  const soilCode = items.soilType?.cell?.soilClass?.code || ''
  const isAcid = p.soilType === 'acid_sulfate' || (p.ph !== '' && p.ph != null && +p.ph < 5.5) || soilCode.startsWith('Jt') || b('soilPh') <= 2
  const isSaline = p.soilType === 'saline' || p.irrigation === 'saline_risk' || (p.ec !== '' && p.ec != null && +p.ec >= (p.ecType === 'ec15' ? 0.6 : 2.0))
  const isHeavyClay = b('soilClay') >= 3
  const isLowOm = p.om === 'low' || b('soilSoc') === 0
  const isHighOm = p.om === 'high' || b('soilSoc') >= 3 || soilCode.startsWith('Od')
  const isLowN = b('soilNitrogen') === 0
  const isLowElev = typeof elevM === 'number' && elevM < 0.7
  const isFloodProne = floodCount >= 1 || b('floodHaz') >= 2 || b('flood3d') === 2 || b('flood3d') === 3 || b('soilRoot') >= 4
  const isWetSoil = b('soilRoot') >= 2 || b('soil') >= 2
  const isWaterStressed = p.irrigation === 'dry_shortage' || (!isWetSoil && (b('esi') <= 2 || b('soil') === 0))
  const isHotTopsoil = b('lst') >= 3 || b('soilTemp') >= 3
  const isDenseCanopy = b('ndvi') >= 3 && (b('evi') >= 3 || b('biomass') >= 3)
  const isOpenWindow = b('ndvi') <= 1 || b('evi') <= 1 || b('gpp') <= 1

  const domains = [
    {
      id: 'soilTerrain',
      title: L === 'en' ? 'Soil & Terrain (6 map layers + plot pH/EC/OM)' : 'Đất & Địa hình (6 lớp bản đồ + pH/mặn/mùn vườn)',
      tone: isSaline || (isAcid && isLowElev) ? 'warn' : 'ok',
      summary: L === 'en'
        ? [
            typeof elevM === 'number' ? `Elevation ${elevM.toFixed(2)} m` : null,
            soilCode ? `FAO ${soilCode}` : null,
            items.soilPh?.title || null,
            items.soilClay?.title || null,
            p.ph ? `Plot pH ${p.ph}` : null,
            p.ec ? `Plot EC ${p.ec}` : null,
          ].filter(Boolean).join(' · ')
        : [
            typeof elevM === 'number' ? `Cao độ ${elevM.toFixed(2)} m` : null,
            soilCode ? `FAO ${soilCode}` : null,
            items.soilPh?.title?.split('·')[1]?.trim() || null,
            items.soilClay?.title?.split('·')[1]?.trim() || null,
            p.ph ? `pH vườn ${p.ph}` : null,
            p.ec ? `EC vườn ${p.ec} dS/m` : null,
          ].filter(Boolean).join(' · '),
    },
    {
      id: 'waterFlood',
      title: L === 'en' ? 'Water, Root Moisture & Flood (6 layers + irrigation/flood log)' : 'Nước, Độ ẩm & Ngập lũ (6 lớp + tưới tiêu & điểm ngập vườn)',
      tone: isFloodProne || isWaterStressed ? 'warn' : 'ok',
      summary: L === 'en'
        ? [
            items.soil?.title?.split('·')[1]?.trim() || null,
            items.soilRoot?.title?.split('·')[1]?.trim() || null,
            items.floodHaz?.title?.split('·')[1]?.trim() || null,
            items.flood3d?.bandIndex === 0 ? 'MODIS 3d: cloud-masked' : items.flood3d?.title?.split('·')[1]?.trim() || null,
            floodCount ? `${floodCount} logged flood marks` : null,
          ].filter(Boolean).join(' · ')
        : [
            items.soil?.title?.split('·')[1]?.trim() || null,
            items.soilRoot?.title?.split('·')[1]?.trim() || null,
            items.floodHaz?.title?.split('·')[1]?.trim() || null,
            items.flood3d?.bandIndex === 0 ? 'MODIS 3 ngày: mây che' : items.flood3d?.title?.split('·')[1]?.trim() || null,
            floodCount ? `${floodCount} điểm ngập vườn đã chấm` : null,
          ].filter(Boolean).join(' · '),
    },
    {
      id: 'vegClimate',
      title: L === 'en' ? 'Canopy, Biomass & Surface Heat (10 layers + crop cycle)' : 'Cây trồng, Sinh khối & Nhiệt đất (10 lớp + vụ/cây vườn)',
      tone: isHotTopsoil && isOpenWindow ? 'warn' : 'ok',
      summary: L === 'en'
        ? [
            items.landCover?.title?.split('·')[1]?.trim() || null,
            items.evi?.title?.split('·')[1]?.trim() || null,
            items.gpp?.title?.split('·')[1]?.trim() || null,
            items.soilTemp?.title?.split('·')[1]?.trim() || null,
          ].filter(Boolean).join(' · ')
        : [
            items.landCover?.title?.split('·')[1]?.trim() || null,
            items.evi?.title?.split('·')[1]?.trim() || null,
            items.gpp?.title?.split('·')[1]?.trim() || null,
            items.soilTemp?.title?.split('·')[1]?.trim() || null,
          ].filter(Boolean).join(' · '),
    },
  ]

  const tactics = []
  if (isSaline || (isAcid && isLowElev)) {
    tactics.push({
      priority: 'high',
      drivers: ['soilPh', 'soilType', 'elev'],
      title: L === 'en' ? 'Manage salinity/acidity & elevate beds before high-value crops' : 'Rửa phèn–mặn và nâng liếp trước khi xuống giống cây giá trị cao',
      detail: L === 'en'
        ? `Combined soil/elevation layers (${[soilCode || 'ISRIC pH', typeof elevM === 'number' ? `${elevM.toFixed(2)} m` : ''].filter(Boolean).join(', ')}) plus your plot readings (${p.ec ? `EC ${p.ec}` : `pH ${p.ph || 'low'}`}) favor salt/acid-buffered rotations (rice–shrimp, pineapple, or flushed raised beds with lime + Trichoderma compost).`
        : `Kết hợp địa hình–đất (${[soilCode, typeof elevM === 'number' ? `${elevM.toFixed(2)} m` : '', items.soilPh?.title?.split('·')[1]?.trim()].filter(Boolean).join(', ')}) cùng số liệu vườn (${p.ec ? `EC ${p.ec} dS/m` : p.ph ? `pH ${p.ph}` : 'vùng đất phèn/mặn'}) → ưu tiên lúa–tôm hoặc lên liếp đào mương rửa phèn, bón vôi + lân hữu cơ trước khi trồng màu.`,
    })
  }
  if (isFloodProne || (isHeavyClay && isWetSoil)) {
    tactics.push({
      priority: 'high',
      drivers: ['floodHaz', 'soilRoot', 'soilClay', 'elev'],
      title: L === 'en' ? 'Cut deep drainage & pair wet-season aquatic/paddy crops with dry-season rotation' : 'Tôn bờ, xẻ rãnh tiêu úng và luân canh thuận mùa nước nổi',
      detail: L === 'en'
        ? `Subsoil wetness (${items.soilRoot?.title?.split('·')[1] || 'high'}) + clay fraction (${items.soilClay?.title?.split('·')[1] || 'clay'}) + historical flood exposure${floodCount ? ` + ${floodCount} farm flood marks` : ''} require 35–40 cm drainage furrows for upland beds or flood-adapted paddy–lotus/duck–fish cycles.`
        : `Ẩm tầng rễ sâu (${items.soilRoot?.title?.split('·')[1]?.trim() || 'cao'}) + nền đất sét (${items.soilClay?.title?.split('·')[1]?.trim() || 'sét'}) + rủi ro ngập${floodCount ? ` và ${floodCount} dấu ngập tự chấm` : ''} → với liếp cây ăn trái/màu cần mương tiêu nước sâu 35–40 cm; vùng không đê khép kín ưu tiên lúa 2 vụ + sen/lúa–cá né đỉnh lũ.`,
    })
  } else if (isWaterStressed) {
    tactics.push({
      priority: 'high',
      drivers: ['soil', 'soilRoot', 'esi', 'rain'],
      title: L === 'en' ? 'Switch to drought-tolerant short crops & mulch for moisture conservation' : 'Chuyển sang cây cạn ngắn ngày chịu hạn & phủ rơm giữ ẩm tầng mặt',
      detail: L === 'en'
        ? `Lower moisture/evaporative signals combined with plot irrigation constraints (${p.irrigation || 'limited'}) point to 70–85 day mungbean/sesame/maize with straw mulch and morning drip or AWD irrigation.`
        : `Các lớp nước (ẩm mặt/tầng rễ/ESI) kết hợp điều kiện tưới tại vườn (${p.irrigation === 'dry_shortage' ? 'thiếu nước mùa khô' : 'nguồn nước hạn chế'}) → chọn đậu xanh, mè hoặc bắp nếp 70–85 ngày phủ rơm dày và tưới nhỏ giọt/AWD sáng sớm.`,
    })
  }
  if (isLowN || isLowOm || isHighOm) {
    tactics.push({
      priority: 'med',
      drivers: ['soilNitrogen', 'soilSoc', 'landCover'],
      title: L === 'en'
        ? (isHighOm ? 'Leverage rich organic matter, avoid excess urea & aerate soil' : 'Inject nitrogen-fixing legumes & composted straw to rebuild soil humus')
        : (isHighOm ? 'Tận dụng nền hữu cơ giàu, giảm đạm hóa học để tránh lốp đổ' : 'Xen đậu cố định đạm & vùi rơm hoai mục để bồi tụ đạm–mùn đất'),
      detail: L === 'en'
        ? (isHighOm
            ? 'ISRIC SOC/N layers show high organic reserves. Cut basal N by ~20%, monitor root aeration during rains, and favor potassium + calcium balance.'
            : 'ISRIC SOC/total-N layers indicate modest reserves. Rotate rice with mungbean/soybean/sesame and incorporate rice straw compost rather than burning stubble.')
        : (isHighOm
            ? 'Lớp ISRIC SOC và Tổng đạm tại ô đất đang ở ngưỡng giàu mùn → giảm ~20% phân urê đầu vụ, xới thoáng tầng mặt sau mưa dầm và tăng kali–canxi chống đổ ngã.'
            : 'Chỉ số SOC/Đạm nền vùng ở mức trung bình thấp → đưa 1 vụ đậu xanh/đậu phộng/vừng xen giữa 2 vụ lúa và ủ rơm rạ tại ruộng bằng chế phẩm sinh học thay vì đốt đồng.'),
    })
  }
  if (isHotTopsoil || isDenseCanopy || isOpenWindow) {
    tactics.push({
      priority: isHotTopsoil ? 'med' : 'ok',
      drivers: ['ndvi', 'evi', 'lai', 'gpp', 'biomass', 'soilTemp'],
      title: L === 'en'
        ? (isHotTopsoil ? 'Buffer topsoil heat & time sowing to NDVI/GPP canopy window' : isDenseCanopy ? 'Prune dense perennial canopy & use shade-tolerant intercrops' : 'Sowing window open across vegetation/GPP indices')
        : (isHotTopsoil ? 'Che phủ hạ nhiệt tầng đất mặt và tận dụng khe thời vụ qua ảnh thực vật' : isDenseCanopy ? 'Tỉa tán vườn dày và trồng xen cây chịu rợp dưới tán' : 'Tán thực vật còn thoáng — mở cửa sổ xuống giống vụ chuyển tiếp'),
      detail: L === 'en'
        ? `Vegetation stack (NDVI/EVI/LAI/fPAR/GPP + GEDI biomass) and SMAP soil heat show ${isDenseCanopy ? 'dense perennial canopy suited to ginger/turmeric understory intercrops' : 'open/transitional canopy'} ${isHotTopsoil ? 'with hot daytime topsoil (>29.5 °C) requiring mulch' : 'with balanced surface thermal conditions'}.`
        : `Tổ hợp 10 lớp thảm thực vật–nhiệt (MODIS NDVI/EVI/LAI/fPAR/GPP, GEDI sinh khối, IGBP) cho thấy ${isDenseCanopy ? 'tán cây lâu năm dày — hợp tỉa cành và xen gừng/nghệ/đậu chịu rợp' : 'mặt ruộng đang trống hoặc chuyển vụ thuận lợi xuống giống'}${isHotTopsoil ? '; đồng thời SMAP Soil Temp & MODIS LST cảnh báo đất mặt nóng (>29,5 °C), cần phủ rơm giữ ẩm rễ non' : ', nền nhiệt đất mặt ổn định'}.`,
    })
  }
  if (!tactics.length) {
    tactics.push({
      priority: 'ok',
      drivers: ['ndvi', 'soil', 'soilPh', 'elev'],
      title: L === 'en' ? 'Balanced multi-layer baseline — stick to 2-crop or diverse veggie-rice rotation' : 'Nền 22 lớp cân bằng — duy trì luân canh 2 lúa + 1 màu hoặc cây ăn trái hữu cơ',
      detail: L === 'en'
        ? 'All soil, moisture, flood, and canopy signals are within moderate bounds for Mekong Delta agriculture; refine fertilizer and sowing dates against local tidal calendars.'
        : 'Các chỉ số đất, ẩm tầng rễ, nguy cơ ngập và tán cây đều ở ngưỡng cân bằng cho sản xuất ĐBSCL; tiếp tục bám lịch thời vụ và cập nhật EC/pH vườn sau mỗi đợt triều cường.',
    })
  }

  return {
    lat,
    lon,
    readCount,
    totalLayers: EM_AVAILABLE_KEYS.length,
    profileCount: profileMetrics.length,
    profileMetrics,
    items,
    groups: EM_FILTER_GROUPS,
    domains,
    tactics,
  }
}
