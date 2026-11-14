// Gom dữ liệu người dùng (file tải lên, số đo đất, đánh dấu) cho RUỘNG ĐANG XEM. Hàm thuần: nhận kho, trả về kết quả.
// Trang "Ruộng của tôi" và trang "Dữ liệu" cùng dùng, để hai trang luôn nói cùng một điều.
import { evDerive, evIsMissing, evText } from '../core/evidence.js'
import { hzClimatology, hzCompare, hzField, hzFieldRecords, hzLayer } from '../core/harmonize.js'
import { fiBelongs, fiMarksForField, fiSoilForField } from '../sources/farmerInput.js'
import { UPLOAD_VARIABLES } from '../sources/upload.js'

/** Ruộng đang xem → đơn vị phân tích (một điểm, hoặc lưới ô nếu đã khoanh). */
export function fdField(loc, polygon = null, gardenId = null) {
  if (!loc) return null
  return { ...hzField({ point: [loc.lat, loc.lon], polygon }), gardenId }
}

/** Độ phân giải gốc để ghi lên Evidence: số người dùng nhập, không thì "không rõ". */
const fdResolution = (m) => (m ? evText(`${m} m (người dùng nhập)`, `${m} m (entered by the user)`) : evText('không rõ (người dùng chưa nhập)', 'unknown (not entered by the user)'))

/**
 * Một file đã nhận áp vào ruộng này thế nào.
 *   upload: { id, passport, records (đã giải nén), anchor }
 * Trả về null nếu file không thuộc ruộng này, ngược lại { upload, layer, fieldRecords, months (12 Evidence) | value (Evidence) }.
 */
export function fdApplyUpload(upload, field) {
  if (upload.gardenId && upload.gardenId !== field.gardenId) return null
  const pp = upload.passport
  const info = UPLOAD_VARIABLES[pp.variable]
  const located = upload.records.some((r) => r.lat !== null)
  // File không có tọa độ: thuộc ruộng mà người dùng đang xem lúc nhận file (anchor).
  if (!located && !(upload.anchor && fiBelongs({ ...upload.anchor, where: 'field' }, field))) return null
  const layer = hzLayer({ field, records: upload.records, resolutionM: pp.resolutionM })
  if (!layer.covered) return null
  const fieldRecords = hzFieldRecords(layer)
  if (fieldRecords.length === 0) return null
  const meta = { kind: pp.kind, source: `upload:${upload.id}`, resolution: fdResolution(pp.resolutionM), unit: info.unit, label: `up_${pp.variable}`, flow: info.flow, basis: pp.basis ?? 'day' }
  if (info.series) return { upload, layer, fieldRecords, months: hzClimatology(fieldRecords, meta).months }
  // Biến không theo thời gian (pH, EC, chất hữu cơ): trung bình các bản ghi thuộc ruộng.
  const inputs = Object.fromEntries(fieldRecords.map((r, i) => [`r${i}`, { value: r.value, unit: info.unit, kind: pp.kind, source: meta.source, label: meta.label }]))
  const value = evDerive({ inputs, compute: (v) => Object.values(v).reduce((a, b) => a + b, 0) / fieldRecords.length, unit: info.unit, formula: evText('trung bình các bản ghi thuộc ruộng', 'mean of the records in the field'), label: meta.label })
  return { upload, layer, fieldRecords, value: evIsMissing(value) ? value : { ...value, source: meta.source } }
}

/**
 * Mọi dữ liệu người dùng cho ruộng này.
 *   ds: kho (DS) với uploads đã giải nén bản ghi · climate: powerClimate() hoặc null
 * Trả về { field, soil, marks, uploads: [...], rainCompare: [{ upload, rows }] }.
 */
export function fdCollect({ ds, field, climate = null }) {
  if (!field) return null
  const soil = fiSoilForField(ds.soil, field)
  const marks = fiMarksForField(ds.marks, field)
  const uploads = ds.uploads.map((u) => fdApplyUpload(u, field)).filter(Boolean)
  // Hai nguồn cùng biến: mưa tải lên so với mưa NASA POWER. Hiện cả hai và mức lệch, không chọn một.
  const rainCompare = climate
    ? uploads.filter((u) => u.upload.passport.variable === 'rain' && u.months).map((u) => ({ upload: u.upload, rows: hzCompare(climate.months.map((m) => m.rain), u.months) }))
    : []
  return { field, soil, marks, uploads, rainCompare }
}
