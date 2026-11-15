// Test cân bằng nước và chấm mức phù hợp: hạng chung = hạng xấu nhất; thiếu hơn nửa tiêu chí → "Chưa đủ dữ liệu".
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evidence, evMissing } from '../../site/core/evidence.js'
import { ROTATION_PARAMS } from '../../site/logic/rotation.js'
import { SUIT_PARAMS, suitAssess, suitFindCrop, suitWindow } from '../../site/logic/suitability.js'
import { wbMonthly } from '../../site/logic/waterBalance.js'

const ev = (value, unit = 'mm') => evidence({ value, unit, kind: 'model', source: 'powerDaily' })
// Khí hậu giả để test logic: mưa tháng `rain`, mưa năm khô `dry`, ẩm vùng rễ `wet`.
const climateOf = (rain, dry, wet = 0.6) => ({
  months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rain: ev(rain[i]), rainDry: ev(dry[i]), gwetroot: ev(wet, '0–1') })),
})
const flat = (v) => Array(12).fill(v)
const ndvi = (months) => ({ ndviWindow: { months, season: 'ht' } })

test('cân bằng nước: P − ET0 đúng, tháng khô theo đúng định nghĩa của trang Luân canh', () => {
  const rain = [10, 20, 30, 60, 160, 220, 240, 210, 250, 230, 140, 40]
  const climate = climateOf(rain, rain.map((r) => r / 2))
  const et0 = Array.from({ length: 12 }, () => ({ monthly: ev(120) }))
  const wb = wbMonthly({ climate, et0 })
  assert.equal(wb.length, 12)
  wb.forEach((m, i) => {
    assert.equal(m.balance.value, rain[i] - 120)
    assert.equal(m.balance.kind, 'derived')
    assert.equal(m.isDry, rain[i] < ROTATION_PARAMS.dryMonthMm)
    assert.equal(m.deficit, rain[i] < 120)
  })
  const broken = wbMonthly({ climate, et0: et0.map((e, i) => (i === 0 ? { monthly: evMissing({ reason: 'thử' }) } : e)) })
  assert.equal(broken[0].balance.kind, 'missing')
  assert.equal(broken[0].deficit, false, 'không có số thì không kết luận thiếu nước')
})

test('tên cây ngoài thư viện → không chấm, báo "chưa có bảng chỉ tiêu có nguồn"', () => {
  assert.equal(suitFindCrop('Đậu xanh'), 'mungbean')
  assert.equal(suitFindCrop('bắp'), 'maize')
  assert.equal(suitFindCrop('sầu riêng'), null)
  assert.equal(suitAssess({ crop: 'durian', window: { months: [1], days: 30, source: 'sowing' }, climate: climateOf(flat(100), flat(50)) }).known, false)
})

test('hạng chung luôn bằng hạng XẤU NHẤT trong các tiêu chí chấm được', () => {
  const months = [2, 3, 4, 5]
  const climate = climateOf(flat(10), flat(5), 0.9) // rất khô, nhưng ẩm vùng rễ cao (để thử tiêu chí úng)
  for (const crop of ['rice', 'mungbean', 'maize']) {
    for (const irrigation of ['yes', 'limited', 'no']) {
      const r = suitAssess({ crop, window: suitWindow({ ...ndvi(months), crop }), climate, irrigation })
      const graded = r.criteria.filter((c) => c.grade !== 'gray').map((c) => c.grade)
      const worst = ['red', 'yellow', 'green'].find((g) => graded.includes(g))
      if (r.overall !== 'gray') assert.equal(r.overall, worst, `${crop}/${irrigation}`)
    }
  }
  const r = suitAssess({ crop: 'maize', window: suitWindow({ ...ndvi(months), crop: 'maize' }), climate, irrigation: 'no' })
  assert.equal(r.overall, 'red')
  assert.ok(r.limiting.includes('water'))
})

test('chấm được ít hơn một nửa tiêu chí → "Chưa đủ dữ liệu" (Xám), không bao giờ ra Xanh', () => {
  // Toạ độ ngoài 5 huyện: không có lịch vụ NDVI → độ dài vụ không chấm; mưa rất nhiều → nước Xanh.
  const climate = climateOf(flat(400), flat(300), 0.5)
  const r = suitAssess({ crop: 'maize', window: suitWindow({ sowingMonth: 5, crop: 'maize' }), climate, irrigation: 'no' })
  assert.ok(r.gradedCount < SUIT_PARAMS.minGradedShare * r.totalCount)
  assert.equal(r.overall, 'gray')
  assert.equal(r.worstSeen, 'green')
})

test('chưa trả lời câu hỏi nước tưới → tiêu chí nước là Xám kèm lời nhắc', () => {
  const r = suitAssess({ crop: 'rice', window: suitWindow({ ...ndvi([5, 6, 7]), crop: 'rice' }), climate: climateOf(flat(100), flat(50)), irrigation: null })
  assert.equal(r.criteria.find((c) => c.key === 'water').reason, 'needIrrigationAnswer')
})

test('đậu xanh: độ mặn Xám vì FAO-29 không có dòng; nhiệt độ và pH Xám vì chưa có bảng có nguồn', () => {
  const r = suitAssess({ crop: 'mungbean', window: suitWindow({ ...ndvi([3, 4, 5]), crop: 'mungbean' }), climate: climateOf(flat(150), flat(100)), irrigation: 'limited' })
  const by = Object.fromEntries(r.criteria.map((c) => [c.key, c]))
  assert.equal(by.salinity.reason, 'salinityNoThreshold')
  assert.equal(by.temperature.grade, 'gray')
  assert.equal(by.ph.grade, 'gray')
  const rice = suitAssess({ crop: 'rice', window: suitWindow({ ...ndvi([3, 4, 5]), crop: 'rice' }), climate: climateOf(flat(150), flat(100)), irrigation: 'limited' })
  assert.equal(rice.criteria.find((c) => c.key === 'salinity').reason, 'salinityNeedMeasure', 'có ngưỡng nhưng chưa có số đo → việc cần làm là đo')
})

test('khí hậu bị thiếu → tiêu chí nước Xám, không đoán', () => {
  const climate = { months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rain: evMissing({ reason: 'mất mạng', need: 'retry' }), rainDry: evMissing({ reason: 'mất mạng', need: 'retry' }), gwetroot: evMissing({ reason: 'mất mạng' }) })) }
  const r = suitAssess({ crop: 'maize', window: suitWindow({ ...ndvi([5, 6, 7, 8]), crop: 'maize' }), climate, irrigation: 'no' })
  assert.equal(r.criteria.find((c) => c.key === 'water').grade, 'gray')
  assert.notEqual(r.overall, 'green')
})

/* ---------------- Phase 2: số đo đất và đánh dấu của nông dân ---------------- */
import { fiMarksForField, fiSoilForField, fiCheck } from '../../site/sources/farmerInput.js'
import { hzField } from '../../site/core/harmonize.js'

const P2_FIELD = hzField({ polygon: [[10.1, 105.43], [10.1, 105.432], [10.102, 105.432], [10.102, 105.43]] })

test('số đo ECe của ruộng cao hơn ngưỡng FAO-29 của ngô → tiêu chí mặn Vàng, bằng chứng là số đo tại ruộng', () => {
  const soil = fiSoilForField([{ id: 'a', date: '2026-11-01', where: 'field', lat: 10.101, lon: 105.431, ec: 4, ecType: 'ece' }], P2_FIELD)
  assert.equal(soil.ec.kind, 'ground')
  const climate = climateOf(flat(200), flat(150))
  const before = suitAssess({ crop: 'maize', window: suitWindow({ ...ndvi([5, 6, 7, 8, 9]), crop: 'maize' }), climate })
  const after = suitAssess({ crop: 'maize', window: suitWindow({ ...ndvi([5, 6, 7, 8, 9]), crop: 'maize' }), climate, salinityEce: soil.ec, salinityType: soil.ecType })
  const sal = after.criteria.find((c) => c.key === 'salinity')
  assert.equal(sal.grade, 'yellow')
  assert.ok(sal.evidence.some((e) => e.kind === 'ground' && e.value === 4))
  assert.equal(after.gradedCount, before.gradedCount + 1)
  assert.notEqual(after.overall, before.overall, 'đèn của ngô phải đổi khi có số đo độ mặn')
})

test('số đo EC kiểu khác (nước, 1:5) không được quy đổi: tiêu chí mặn vẫn Xám và nói cần ECe', () => {
  const soil = fiSoilForField([{ id: 'a', date: '2026-11-01', where: 'field', lat: 10.101, lon: 105.431, ec: 4, ecType: 'ecw' }], P2_FIELD)
  const r = suitAssess({ crop: 'maize', window: suitWindow({ ...ndvi([5, 6, 7, 8, 9]), crop: 'maize' }), climate: climateOf(flat(200), flat(150)), salinityEce: soil.ec, salinityType: soil.ecType })
  const sal = r.criteria.find((c) => c.key === 'salinity')
  assert.equal(sal.grade, 'gray')
  assert.equal(sal.reason, 'salinityNotEce')
})

test('đánh dấu "Hay ngập" trong ruộng → cây cạn bị Vàng ở tiêu chí úng; lúa nước không đổi; dấu ngoài ruộng không tính', () => {
  const marks = [
    { id: 'm1', type: 'flood', lat: 10.1012, lon: 105.4312, date: '2026-11-02' },
    { id: 'm2', type: 'flood', lat: 10.3, lon: 105.8, date: '2026-11-02' },
  ]
  const m = fiMarksForField(marks, P2_FIELD)
  assert.equal(m.flood.value, 1)
  assert.equal(m.flood.kind, 'farmer')
  const climate = climateOf(flat(200), flat(150), 0.3) // ẩm vùng rễ thấp: khí hậu không báo úng
  const maize = suitAssess({ crop: 'maize', window: suitWindow({ ...ndvi([5, 6, 7, 8, 9]), crop: 'maize' }), climate, floodMarks: m.flood })
  const w = maize.criteria.find((c) => c.key === 'waterlogging')
  assert.equal(w.grade, SUIT_PARAMS.farmerFloodGrade)
  assert.equal(w.reason, 'waterlog_farmer')
  assert.ok(w.evidence.some((e) => e.kind === 'farmer'))
  const rice = suitAssess({ crop: 'rice', window: suitWindow({ ...ndvi([5, 6, 7]), crop: 'rice' }), climate, floodMarks: m.flood })
  assert.equal(rice.criteria.find((c) => c.key === 'waterlogging').grade, 'green')
})

test('biểu mẫu đất: số ngoài giới hạn vật lý bị từ chối, ô trống là chưa đo', () => {
  assert.equal(fiCheck('ph', '5,6'), 5.6)
  assert.equal(fiCheck('ph', '15'), 'out')
  assert.equal(fiCheck('ec', '-1'), 'out')
  assert.equal(fiCheck('om', ''), null)
  const none = fiSoilForField([], P2_FIELD)
  assert.equal(none.ph.kind, 'missing')
  assert.equal(none.ph.need, 'measure')
})

test('số đo "cả ruộng" vẫn thuộc ruộng sau khi khoanh thửa không chứa điểm đã chọn', () => {
  const point = [10.1, 105.43]
  const far = hzField({ point, polygon: [[10.11, 105.44], [10.11, 105.442], [10.112, 105.442], [10.112, 105.44]] })
  const soil = fiSoilForField([{ id: 'a', date: '2026-11-01', where: 'field', lat: point[0], lon: point[1], ph: 5.5 }], far)
  assert.equal(soil.ph.value, 5.5)
  const other = fiSoilForField([{ id: 'b', date: '2026-11-01', where: 'point', lat: point[0], lon: point[1], ph: 6 }], far)
  assert.equal(other.ph.kind, 'missing', 'số đo tại MỘT điểm ngoài thửa thì không tính cho thửa')
})

/* ---------------- Phase 3: thư viện cây, nhiệt độ và pH theo ECOCROP ---------------- */
import { CROP_LIBRARY } from '../../site/data/cropLibrary.js'
import { suitBand } from '../../site/logic/suitability.js'

const climateT = (tmax, tmin) => ({
  months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rain: ev(200), rainDry: ev(150), gwetroot: ev(0.5, '0–1'), tmax: ev(tmax, '°C'), tmin: ev(tmin, '°C') })),
})

test('khoảng ECOCROP: tối ưu → Xanh, chịu được → Vàng, ngoài khoảng → Đỏ', () => {
  const band = { optimal: [20, 27], absolute: [7, 35] }
  assert.equal(suitBand(24, band), 'green')
  assert.equal(suitBand(30, band), 'yellow')
  assert.equal(suitBand(36, band), 'red')
})

test('nhiệt độ: trung bình (Tmax+Tmin)/2 trong vụ so với ECOCROP; bắp cải ở 28 °C là Vàng, cà chua là Vàng, lúa là Xanh', () => {
  const climate = climateT(33, 23) // trung bình 28 °C
  const at = (crop) => suitAssess({ crop, window: suitWindow({ ...ndvi([1, 2, 3, 4, 5]), crop }), climate }).criteria.find((c) => c.key === 'temperature')
  assert.equal(at('cabbage').grade, 'yellow') // tối ưu 15–24, chịu được 7–32
  assert.equal(at('tomato').grade, 'yellow') // tối ưu 20–27, chịu được 7–35
  assert.equal(at('rice').grade, 'green') // tối ưu 20–30
  assert.equal(at('rice').evidence[0].value, 28)
  assert.ok(at('rice').evidence.some((e) => e.kind === 'reference' && e.source === 'ecocrop'))
})

test('pH: chưa đo thì Xám và việc cần làm là đo; đo được thì so với khoảng ECOCROP', () => {
  const climate = climateT(32, 24)
  const w = suitWindow({ ...ndvi([1, 2, 3, 4]), crop: 'tomato' })
  const none = suitAssess({ crop: 'tomato', window: w, climate }).criteria.find((c) => c.key === 'ph')
  assert.equal(none.grade, 'gray')
  assert.equal(none.reason, 'phNeedMeasure')
  const acid = evidence({ value: 4.0, unit: '', kind: 'ground', label: 'phField' })
  assert.equal(suitAssess({ crop: 'tomato', window: w, climate, ph: acid }).criteria.find((c) => c.key === 'ph').grade, 'red') // chịu được 5–7,5
})

test('thư viện: 9 cây, cây nào cũng có nhu cầu nước và độ dài vụ; tìm được bằng tên VI/EN; cây ngoài thư viện → null', () => {
  assert.equal(Object.keys(CROP_LIBRARY).length, 9)
  for (const crop of Object.values(CROP_LIBRARY)) {
    assert.equal(crop.waterMm.length, 2)
    assert.equal(crop.cycleDays.length, 2)
  }
  assert.equal(suitFindCrop('Đậu phộng'), 'groundnut')
  assert.equal(suitFindCrop('tomato'), 'tomato')
  assert.equal(suitFindCrop('sầu riêng'), null)
  assert.equal(suitAssess({ crop: 'durian', window: { months: [1] }, climate: climateT(30, 22) }).known, false)
})
