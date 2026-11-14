// Cổng nguồn gốc (blueprint mục 3, quy tắc 3). Thất bại nếu một con số trong site/data/cropLibrary.js hoặc
// site/data/rotationCrops.js:
//   - thiếu src, hoặc src không trỏ tới nguồn có URL;
//   - thiếu trích nguyên văn (quote);
//   - có số KHÔNG xuất hiện trong trích dẫn (chống gõ nhầm hoặc viết từ trí nhớ).
// Chạy riêng: node scripts/check-provenance.mjs · Chạy trong npm test qua scripts/tests/provenance.test.mjs.
import { fileURLToPath } from 'node:url'
import { CROP_LIBRARY, cropSource } from '../site/data/cropLibrary.js'
import { PROFIT_RATIO_UPLAND, ROTATION_CROPS } from '../site/data/rotationCrops.js'

// Trường số → trường nguồn tương ứng.
const PROV_FIELDS = [
  ['waterMm', 'waterSrc'],
  ['cycleDays', 'cycleSrc'],
  ['rootM', 'rootSrc'],
  ['salinityEce', 'salinitySrc'],
  ['tempC', 'tempSrc'],
  ['ph', 'phSrc'],
]

const provNumbers = (v) => (v && typeof v === 'object' ? Object.values(v).flat(2) : [v]).filter((x) => typeof x === 'number')
// Lấy số trong câu trích (không lấy dấu trừ: "90-150" là khoảng, không phải số âm).
const provQuoteNumbers = (q) => (String(q).match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

export function checkProvenance() {
  const errors = []
  for (const [id, crop] of Object.entries(CROP_LIBRARY)) {
    if (!crop.name?.vi || !crop.name?.en) errors.push(`${id}: thiếu tên VI/EN`)
    for (const [field, srcField] of PROV_FIELDS) {
      const value = crop[field]
      if (value === null || value === undefined) continue // thiếu số thì tiêu chí là Xám: được phép, không phải lỗi
      const src = cropSource(crop[srcField])
      if (!src) errors.push(`${id}.${field}: thiếu nguồn (${srcField} = ${crop[srcField]})`)
      else if (!src.url) errors.push(`${id}.${field}: nguồn ${crop[srcField]} không có URL`)
      const quote = crop.quotes?.[field]
      if (!quote) {
        errors.push(`${id}.${field}: thiếu trích nguyên văn`)
        continue
      }
      const inQuote = provQuoteNumbers(quote)
      for (const n of provNumbers(value)) {
        if (!inQuote.some((q) => Math.abs(q - n) < 1e-9)) errors.push(`${id}.${field}: số ${n} không có trong trích dẫn "${quote}"`)
      }
    }
    // Số liệu ECOCROP mở theo từng cây: phải có địa chỉ trang dữ liệu của đúng cây đó.
    if (crop.tempC && !crop.tempUrl) errors.push(`${id}.tempC: thiếu tempUrl (trang ECOCROP của cây)`)
    if (crop.ph && !crop.phUrl) errors.push(`${id}.ph: thiếu phUrl (trang ECOCROP của cây)`)
    if (crop.legume && !cropSource(crop.legumeSrc)) errors.push(`${id}.legume: thiếu nguồn cho "cây họ đậu"`)
  }
  // rotationCrops.js: mọi số có nguồn có URL, và trùng khớp với thư viện (nơi giữ trích dẫn).
  for (const [id, crop] of Object.entries(ROTATION_CROPS)) {
    const lib = CROP_LIBRARY[id]
    if (!lib) {
      errors.push(`rotationCrops.${id}: không có trong cropLibrary (nơi giữ trích dẫn)`)
      continue
    }
    for (const [field, srcField] of PROV_FIELDS.slice(0, 4)) {
      if (crop[field] === null) continue
      if (!cropSource(crop[srcField])?.url) errors.push(`rotationCrops.${id}.${field}: nguồn không có URL`)
      if (JSON.stringify(crop[field]) !== JSON.stringify(lib[field])) errors.push(`rotationCrops.${id}.${field}: khác với cropLibrary`)
    }
  }
  if (!cropSource(PROFIT_RATIO_UPLAND.src)?.url) errors.push('PROFIT_RATIO_UPLAND: nguồn không có URL')
  return errors
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkProvenance()
  if (errors.length) {
    console.log(`Cổng nguồn gốc: ${errors.length} lỗi`)
    for (const e of errors) console.log(` - ${e}`)
    process.exit(1)
  }
  console.log(`Cổng nguồn gốc: qua (${Object.keys(CROP_LIBRARY).length} cây, mọi số có nguồn, URL và trích dẫn)`)
}
