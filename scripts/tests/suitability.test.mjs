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
