// Crop facts for the rotation comparison. EVERY number here has a source key (see SOURCES).
// `proxy` marks a value borrowed from a related crop because the source has no row for this one.

export const SOURCES = {
  power: {
    short: 'NASA POWER',
    cite: 'NASA POWER Daily API (community AG), PRECTOTCORR / T2M_MAX / GWETROOT, 2001–2025. Model estimate on a coarse grid (about half a degree).',
    url: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/',
  },
  modis: {
    short: 'MODIS MOD13Q1',
    cite: 'MODIS MOD13Q1 NDVI, 250 m, 16-day composite, 2021–2025, via the ORNL DAAC MODIS subset REST API.',
    url: 'https://modis.ornl.gov/data/modis_webservice.html',
  },
  linh2014: {
    short: 'Linh et al. 2014',
    cite: 'Trần Bá Linh, Võ Thị Gương, Lê Văn Khoa, Wim Cornelis. Prospects of crop rotation for improving soil quality and rice yield in the Mekong Delta, Vietnam. 20th World Congress of Soil Science, Jeju, 2014.',
    url: 'https://qldiem.ctu.edu.vn/ql/docgia/tacgia-71981/baibao-13947.html',
  },
  linh2015: {
    short: 'Linh et al. 2015',
    cite: 'Trần Bá Linh, Võ Thị Gương, Lê Văn Khoa, S. Sleutel, W. Cornelis. Deeper tillage and root growth in annual rice-upland cropping systems result in improved rice yield and economic profit relative to rice monoculture. Soil & Tillage Research 154 (2015) 44–52.',
    url: 'https://qldiem.ctu.edu.vn/ql/docgia/tacgia-71981/baibao-32809.html',
  },
  faoManual3: {
    short: 'FAO Training Manual 3, Tables 4–5',
    cite: 'FAO Irrigation Water Management Training Manual 3, Chapter 2 "Crop water needs": Table 4 (total growing period), Table 5 (seasonal crop water needs).',
    url: 'https://www.fao.org/4/s2022e/s2022e02.htm',
  },
  fao56: {
    short: 'FAO-56, Table 22',
    cite: 'Allen et al. 1998, FAO Irrigation and Drainage Paper 56, Table 22: maximum effective rooting depth (Zr).',
    url: 'https://www.fao.org/4/x0490e/x0490e0e.htm',
  },
  fao29: {
    short: 'FAO-29, Table 4',
    cite: 'Ayers & Westcot, FAO Irrigation and Drainage Paper 29, Table 4: crop salt tolerance (threshold ECe).',
    url: 'https://www.fao.org/4/t0234e/t0234e03.htm',
  },
  faoPulses: {
    short: 'FAO, Soils and pulses',
    cite: 'FAO 2016. Soils and pulses: symbiosis for life. Pulses fix nitrogen with root-nodule bacteria; part of it carries over to the next crop.',
    url: 'https://openknowledge.fao.org/server/api/core/bitstreams/083a0b41-703e-4977-b50f-6cf870d22538/content',
  },
}

export const ROTATION_CROPS = {
  rice: {
    waterMm: [450, 700], waterSrc: 'faoManual3', // "Rice (paddy) 450-700"
    cycleDays: [90, 150], cycleSrc: 'faoManual3', // "Rice 90-150"
    rootM: [0.5, 1.0], rootSrc: 'fao56', // "Rice 0.5-1.0"
    salinityEce: 3.0, salinitySrc: 'fao29', // threshold ECe, dS/m
    legume: false,
    upland: false,
  },
  maize: {
    waterMm: [500, 800], waterSrc: 'faoManual3', // "Maize 500-800"
    cycleDays: [125, 180], cycleSrc: 'faoManual3', // "Maize grain 125-180"
    rootM: [1.0, 1.7], rootSrc: 'fao56', // "Maize, Field (grain) 1.0-1.7"
    salinityEce: 1.7, salinitySrc: 'fao29',
    legume: false,
    upland: true,
  },
  mungbean: {
    waterMm: [300, 500], waterSrc: 'faoManual3', proxyWater: 'Bean', // no mung bean row; "Bean 300-500"
    cycleDays: [75, 90], cycleSrc: 'faoManual3', proxyCycle: 'Bean green', // "Bean green 75-90"
    rootM: [0.6, 1.0], rootSrc: 'fao56', // "Green Gram and Cowpeas 0.6-1.0" (green gram = mung bean)
    salinityEce: null, salinitySrc: 'fao29', // FAO-29 has no mung bean row: information gap
    legume: true, legumeSrc: 'faoPulses',
    upland: true,
  },
}

// Seasons in order: Đông Xuân, Hè Thu, Thu Đông. Rotation set from FIELD_SHIFT_PIVOT.md,
// the same four treatments as the Linh et al. trial.
export const SEASONS = ['dx', 'ht', 'td']
export const ROTATIONS = [
  { id: 'A', crops: ['rice', 'rice', 'rice'], baseline: true },
  { id: 'B', crops: ['rice', 'mungbean', 'rice'] },
  { id: 'C', crops: ['rice', 'maize', 'rice'] },
  { id: 'D', crops: ['rice', 'mungbean', 'maize'] },
]

// Linh et al. 2015 abstract: "farmer's profitability even increased 2.5–2.9 times" (upland rotations
// vs rice–rice–rice, not split by rotation). We use the LOWER end to stay conservative.
export const PROFIT_RATIO_UPLAND = { low: 2.5, high: 2.9, src: 'linh2015' }
