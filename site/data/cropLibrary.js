// Thư viện cây cho "Ruộng của tôi" (Luồng 2). MỖI con số có nguồn (src → URL) và TRÍCH NGUYÊN VĂN (quote) chép từ
// trang nguồn ngày 14/11/2026. scripts/check-provenance.mjs (chạy trong npm test) kiểm tra: có src, nguồn có URL,
// có quote, và mọi số của giá trị đều xuất hiện trong quote.
//
// Nguồn:
//   faoManual3  FAO Training Manual 3, chương 2: Bảng 4 (thời gian sinh trưởng), Bảng 5 (nhu cầu nước cả vụ)
//   fao56       FAO-56, Bảng 22: độ sâu rễ tối đa
//   fao29       FAO-29, Bảng 4: ngưỡng chịu mặn ECe ở mức 100% năng suất (cột đầu tiên của dòng)
//   (dấu " | " trong quote là ranh giới giữa hai ô của bảng trên trang nguồn)
//   ecocrop     FAO ECOCROP, trang "Data sheet" của từng cây: nhiệt độ và pH, khoảng tối ưu (Optimal) và khoảng chịu được
//               (Absolute). Quote ghi theo thứ tự cột trên trang: tối ưu thấp, tối ưu cao, chịu được thấp, chịu được cao.
// Lúa, ngô, đậu xanh: lấy lại đúng số của ROTATION_CROPS (trang Luân canh) để hai trang luôn khớp; chỉ thêm quote,
// nhiệt độ và pH.
// Cây chỉ được đưa vào khi có nguồn cho ÍT NHẤT nhu cầu nước và độ dài vụ (phase-3.md).
import { ROTATION_CROPS, SOURCES } from './rotationCrops.js'

export const CROP_SOURCES = {
  ecocrop: {
    short: 'FAO ECOCROP',
    cite: 'FAO ECOCROP database, crop data sheets (Ecology: temperature requirement and soil pH, optimal and absolute min/max). Retrieved 14 Nov 2026.',
    url: 'https://ecocrop.apps.fao.org/ecocrop/srv/en/home',
  },
}

/** Tìm một nguồn tra bảng: trong SOURCES của trang Luân canh trước, rồi trong CROP_SOURCES. */
export const cropSource = (key) => SOURCES[key] ?? CROP_SOURCES[key] ?? null

const ecoUrl = (id) => `https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=${id}`

export const CROP_LIBRARY = {
  rice: {
    ...ROTATION_CROPS.rice,
    name: { vi: 'Lúa', en: 'Rice' },
    quotes: {
      waterMm: 'Rice (paddy) | 450-700',
      cycleDays: 'Rice | 90-150',
      rootM: 'Rice | 0.5-1.0',
      salinityEce: 'Rice (paddy) (Oriza sativa) 3.0 2.0 3.8 2.6 5.1 3.4 7.2 4.8 11 7.6',
      tempC: 'Temperat. requir. | 20 | 30 | 10 | 36',
      ph: 'Soil PH | 5.5 | 7 | 4.5 | 9',
    },
    tempC: { optimal: [20, 30], absolute: [10, 36] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(1574),
    ph: { optimal: [5.5, 7], absolute: [4.5, 9] }, phSrc: 'ecocrop', phUrl: ecoUrl(1574),
  },
  maize: {
    ...ROTATION_CROPS.maize,
    name: { vi: 'Ngô', en: 'Maize' },
    quotes: {
      waterMm: 'Maize | 500-800',
      cycleDays: 'Maize grain | 125-180',
      rootM: 'Maize, Field (grain) (field corn) | 1.0-1.7',
      salinityEce: 'Corn (maize) (Zea mays) 1.7 1.1 2.5 1.7 3.8 2.5 5.9 3.9 10 6.7',
      tempC: 'Temperat. requir. | 18 | 33 | 10 | 47',
      ph: 'Soil PH | 5 | 7 | 4.5 | 8.5',
    },
    tempC: { optimal: [18, 33], absolute: [10, 47] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(2175),
    ph: { optimal: [5, 7], absolute: [4.5, 8.5] }, phSrc: 'ecocrop', phUrl: ecoUrl(2175),
  },
  mungbean: {
    ...ROTATION_CROPS.mungbean,
    name: { vi: 'Đậu xanh', en: 'Mung bean' },
    quotes: {
      waterMm: 'Bean | 300-500',
      cycleDays: 'Bean green | 75-90',
      rootM: 'Green Gram and Cowpeas | 0.6-1.0',
      tempC: 'Temperat. requir. | 21 | 36 | 8 | 40',
      ph: 'Soil PH | 5.5 | 6.2 | 4.3 | 8.3',
    },
    tempC: { optimal: [21, 36], absolute: [8, 40] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(2150),
    ph: { optimal: [5.5, 6.2], absolute: [4.3, 8.3] }, phSrc: 'ecocrop', phUrl: ecoUrl(2150),
  },
  soybean: {
    name: { vi: 'Đậu nành', en: 'Soybean' },
    waterMm: [450, 700], waterSrc: 'faoManual3',
    cycleDays: [135, 150], cycleSrc: 'faoManual3',
    rootM: [0.6, 1.3], rootSrc: 'fao56',
    salinityEce: 5.0, salinitySrc: 'fao29',
    tempC: { optimal: [20, 33], absolute: [10, 38] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(1150),
    ph: { optimal: [5.5, 6.5], absolute: [4.5, 8.4] }, phSrc: 'ecocrop', phUrl: ecoUrl(1150),
    legume: true, legumeSrc: 'ecocrop', // ECOCROP ghi họ Leguminosae
    upland: true,
    quotes: {
      waterMm: 'Soybean | 450-700',
      cycleDays: 'Soybean | 135-150',
      rootM: 'Soybeans | 0.6-1.3',
      salinityEce: 'Soybean (Glycine max) 5.0 3.3 5.5 3.7 6.3 4.2 7.5 5.0 10 6.7',
      tempC: 'Temperat. requir. | 20 | 33 | 10 | 38',
      ph: 'Soil PH | 5.5 | 6.5 | 4.5 | 8.4',
      legume: 'Family | Magnoliopsida:Rosidae:Fabales:Leguminosae',
    },
  },
  groundnut: {
    name: { vi: 'Đậu phộng', en: 'Groundnut' },
    waterMm: [500, 700], waterSrc: 'faoManual3',
    cycleDays: [130, 140], cycleSrc: 'faoManual3',
    rootM: [0.5, 1.0], rootSrc: 'fao56',
    salinityEce: 3.2, salinitySrc: 'fao29',
    tempC: { optimal: [22, 32], absolute: [10, 45] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(2199),
    ph: { optimal: [5.5, 6.5], absolute: [4.5, 8.5] }, phSrc: 'ecocrop', phUrl: ecoUrl(2199),
    legume: true, legumeSrc: 'ecocrop',
    upland: true,
    quotes: {
      waterMm: 'Peanut | 500-700',
      cycleDays: 'Peanut/Groundnut | 130-140',
      rootM: 'Groundnut (Peanut) | 0.5-1.0',
      salinityEce: 'Groundnut (Peanut) (Arachis hypogaea) 3.2 2.1 3.5 2.4 4.1 2.7 4.9 3.3 6.6 4.4',
      tempC: 'Temperat. requir. | 22 | 32 | 10 | 45',
      ph: 'Soil PH | 5.5 | 6.5 | 4.5 | 8.5',
      legume: 'Family | Magnoliopsida:Rosidae:Fabales:Leguminosae',
    },
  },
  cabbage: {
    name: { vi: 'Bắp cải', en: 'Cabbage' },
    waterMm: [350, 500], waterSrc: 'faoManual3',
    cycleDays: [120, 140], cycleSrc: 'faoManual3',
    rootM: [0.5, 0.8], rootSrc: 'fao56',
    salinityEce: 1.8, salinitySrc: 'fao29',
    tempC: { optimal: [15, 24], absolute: [7, 32] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(554),
    ph: { optimal: [6, 7.5], absolute: [5, 8.3] }, phSrc: 'ecocrop', phUrl: ecoUrl(554),
    legume: false,
    upland: true,
    quotes: {
      waterMm: 'Cabbage | 350-500',
      cycleDays: 'Cabbage | 120-140',
      rootM: 'Cabbage | 0.5-0.8',
      salinityEce: 'Cabbage (Brassica oleracea capitata) 1.8 1.2 2.8 1.9 4.4 2.9 7.0 4.6 12 8.1',
      tempC: 'Temperat. requir. | 15 | 24 | 7 | 32',
      ph: 'Soil PH | 6 | 7.5 | 5 | 8.3',
    },
  },
  tomato: {
    name: { vi: 'Cà chua', en: 'Tomato' },
    waterMm: [400, 800], waterSrc: 'faoManual3',
    cycleDays: [135, 180], cycleSrc: 'faoManual3',
    rootM: [0.7, 1.5], rootSrc: 'fao56',
    salinityEce: 2.5, salinitySrc: 'fao29',
    tempC: { optimal: [20, 27], absolute: [7, 35] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(1379),
    ph: { optimal: [5.5, 6.8], absolute: [5, 7.5] }, phSrc: 'ecocrop', phUrl: ecoUrl(1379),
    legume: false,
    upland: true,
    quotes: {
      waterMm: 'Tomato | 400-800',
      cycleDays: 'Tomato | 135-180',
      rootM: 'Tomato | 0.7-1.5',
      salinityEce: 'Tomato (Lycopersicon esculentum) 2.5 1.7 3.5 2.3 5.0 3.4 7.6 5.0 13 8.4',
      tempC: 'Temperat. requir. | 20 | 27 | 7 | 35',
      ph: 'Soil PH | 5.5 | 6.8 | 5 | 7.5',
    },
  },
  chili: {
    name: { vi: 'Ớt', en: 'Chili pepper' },
    waterMm: [600, 900], waterSrc: 'faoManual3',
    cycleDays: [120, 210], cycleSrc: 'faoManual3',
    // FAO-56 Bảng 22 chỉ có dòng ớt ngọt: mượn dòng này, ghi rõ là mượn (như cách làm với đậu xanh).
    rootM: [0.5, 1.0], rootSrc: 'fao56', proxyRoot: 'Sweet Peppers (bell)',
    salinityEce: 1.5, salinitySrc: 'fao29',
    tempC: { optimal: [17, 30], absolute: [8, 35] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(618),
    ph: { optimal: [5.5, 6.8], absolute: [4.5, 7] }, phSrc: 'ecocrop', phUrl: ecoUrl(618),
    legume: false,
    upland: true,
    quotes: {
      waterMm: 'Pepper | 600-900',
      cycleDays: 'Pepper | 120-210',
      rootM: 'Sweet Peppers (bell) | 0.5-1.0',
      salinityEce: 'Pepper (Capsicum annuum) 1.5 1.0 2.2 1.5 3.3 2.2 5.1 3.4 8.6 5.8',
      tempC: 'Temperat. requir. | 17 | 30 | 8 | 35',
      ph: 'Soil PH | 5.5 | 6.8 | 4.5 | 7',
    },
  },
  onion: {
    // ECOCROP xếp hành tím (Allium ascalonicum) là tên đồng nghĩa của Allium cepa; FAO Manual 3 chỉ có dòng "Onion".
    name: { vi: 'Hành (củ)', en: 'Onion (bulb)' },
    waterMm: [350, 550], waterSrc: 'faoManual3',
    cycleDays: [150, 210], cycleSrc: 'faoManual3',
    rootM: [0.3, 0.6], rootSrc: 'fao56',
    salinityEce: 1.2, salinitySrc: 'fao29',
    tempC: { optimal: [12, 25], absolute: [4, 30] }, tempSrc: 'ecocrop', tempUrl: ecoUrl(364),
    ph: { optimal: [6, 7], absolute: [4.3, 8.3] }, phSrc: 'ecocrop', phUrl: ecoUrl(364),
    legume: false,
    upland: true,
    quotes: {
      waterMm: 'Onion | 350-550',
      cycleDays: 'Onion dry | 150-210',
      rootM: 'Onions | - dry | 0.3-0.6',
      salinityEce: 'Onion (Allium cepa) 1.2 0.8 1.8 1.2 2.8 1.8 4.3 2.9 7.4 5.0',
      tempC: 'Temperat. requir. | 12 | 25 | 4 | 30',
      ph: 'Soil PH | 6 | 7 | 4.3 | 8.3',
    },
  },
}

export const CROP_LIB_IDS = Object.keys(CROP_LIBRARY)
