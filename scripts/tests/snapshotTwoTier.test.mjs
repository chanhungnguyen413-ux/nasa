// Test cho đợt 15/11/2026: cây tự nhập, Tab 4 giữ thửa, khí hậu tĩnh ngoài bán kính 15 km,
// ước tính lưới 5 km + nhãn Rate minh bạch, và trợ lý AI 2 tầng (bản offline).
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { gmAssessGarden, gmCropLabel, gmNormalizeGarden, gmResolveCrop, gmTabDrawsGardens } from '../../site/logic/gardenModel.js'
import { ssAutoFill, ssCellEstimate, ssIndex, ssLabel, ssLayerKind, ssNearestClimate, ssRate, SS_LAYER_KIND } from '../../site/logic/staticSnapshot.js'
import { EM_AVAILABLE_KEYS } from '../../site/logic/envMapData.js'
import { PROVINCES } from '../../site/data/provinces.js'
import { evidence } from '../../site/core/evidence.js'
import { assistantContext, asstLedgerNumbers, asstMeasureAnswer, asstTier1Propose, asstTier2Check, asstTwoTierText, asstVerifyReply, fallbackAnswer } from '../../site/logic/assistantFallback.js'

const root = new URL('../../', import.meta.url)
const src = (p) => readFileSync(new URL(p, root), 'utf8')

/* ---------- 1. Cây tự nhập ---------- */

test('cây tự nhập: khớp thư viện khi gõ không dấu, giữ nguyên tên khi ngoài thư viện', () => {
  assert.deepEqual(gmResolveCrop('dau xanh'), { cropId: 'mungbean', cropName: null })
  assert.deepEqual(gmResolveCrop('  LÚA '), { cropId: 'rice', cropName: null })
  assert.deepEqual(gmResolveCrop('Sầu riêng'), { cropId: null, cropName: 'Sầu riêng' })
  assert.deepEqual(gmResolveCrop(''), { cropId: null, cropName: null })
})

test('cây ngoài thư viện không bị ép null mất tên; đánh giá báo thiếu tham số FAO', () => {
  const g = gmNormalizeGarden({ id: 'g1', lat: 10, lon: 105, polygon: [[10, 105], [10, 105.001], [10.001, 105.001]], profile: { cropId: 'durian', cropName: ' Sầu riêng ' } })
  assert.equal(g.profile.cropId, null)
  assert.equal(g.profile.cropName, 'Sầu riêng')
  assert.deepEqual(gmCropLabel(g.profile, 'vi'), { name: 'Sầu riêng', custom: true })
  const a = gmAssessGarden({ garden: g, climate: { months: [] } })
  assert.equal(a.grade, 'gray')
  assert.equal(a.reason, 'cropNotInLibrary')
})

/* ---------- 2. Tab 4 giữ thửa + vùng đánh dấu ---------- */

test('Tab 4 "Chiến thuật" vẽ thửa; chỉ Tab 2 "Cây phù hợp" ẩn thửa', () => {
  assert.equal(gmTabDrawsGardens('field'), true)
  assert.equal(gmTabDrawsGardens('cond'), true)
  assert.equal(gmTabDrawsGardens('compare'), true)
  assert.equal(gmTabDrawsGardens('suit'), false)
})

test('mã nguồn: mgDrawAllGardens dùng gmTabDrawsGardens và nhánh Tab 4 không xóa lớp thửa', () => {
  const mg = src('site/pages/myGardens.js')
  assert.match(mg, /if \(!gmTabDrawsGardens\(MW\.tab\)\) return/)
  const mw = src('site/pages/mapWorkspace.js')
  const start = mw.indexOf("if (MW.tab === 'compare') {")
  const end = mw.indexOf('return', start)
  assert.ok(start > 0, 'có nhánh Tab 4 riêng')
  const branch = mw.slice(start, end)
  assert.doesNotMatch(branch, /clearLayers/)
  assert.match(branch, /mgDrawAllGardens\(\)/)
  assert.match(branch, /mfdDrawLayers\(\)/)
  // Nhánh Tab 4 phải đứng TRƯỚC lệnh xóa lớp thửa dành cho Tab 2.
  assert.ok(start < mw.indexOf('MG.layer?.clearLayers()'))
})

/* ---------- 3. Khí hậu tĩnh ngoài bán kính 15 km ---------- */

const fakeRecord = (tag) => ({ tag, years: [2001, 2025], monthly: {} })
const fakePower = {
  districts: PROVINCES.map((d) => ({ id: d.id, name: d.name, record: fakeRecord(d.id), elevation: null })),
  provinces: [
    { code: 'camau', name: 'Cà Mau', lat: 9.0501, lon: 105.0408, record: fakeRecord('camau') },
    { code: 'cantho', name: 'Cần Thơ', lat: 10.1145, lon: 105.5305, record: fakeRecord('cantho') },
  ],
}

test('trong 15 km quanh huyện mẫu → dùng khí hậu huyện', () => {
  const r = ssNearestClimate(fakePower, 10.12, 105.45, PROVINCES)
  assert.equal(r.scope, 'district')
  assert.equal(r.id, 'cantho')
  assert.ok(r.distanceKm <= 15)
})

test('ngoài 15 km (Cà Mau) → khí hậu tĩnh của tỉnh chứa thửa, không gọi mạng', () => {
  const r = ssNearestClimate(fakePower, 9.18, 105.15, PROVINCES)
  assert.equal(r.scope, 'province')
  assert.equal(r.id, 'camau')
  assert.equal(r.record.tag, 'camau')
})

test('ngoài ranh ĐBSCL → tỉnh gần nhất, ghi rõ khoảng cách; không có dữ liệu → null', () => {
  const r = ssNearestClimate(fakePower, 8.6, 104.3, PROVINCES)
  assert.equal(r.scope, 'nearestProvince')
  assert.ok(r.distanceKm > 0)
  assert.equal(ssNearestClimate({ districts: [], provinces: [] }, 9.2, 105.1, PROVINCES), null)
})

/* ---------- 4. Ước tính lưới 5 km + Rate minh bạch ---------- */

const grid = { dLat: 5 / 111.32, dLon: 5 / (111.32 * Math.cos((10 * Math.PI) / 180)) }
const cellOf = (lat, lon) => [Math.floor(lat / grid.dLat), Math.floor(lon / grid.dLon)]

test('Rate: đo tại ruộng = Cao; vệ tinh không bao giờ là Cao; lớp bản đồ không có lớp "ground"', () => {
  assert.equal(ssRate('ground'), 'high')
  assert.equal(ssRate('satellite'), 'medium')
  assert.equal(ssRate('model'), 'ref')
  assert.equal(ssRate('missing'), 'none')
  assert.ok(Object.values(SS_LAYER_KIND).every((k) => k !== 'ground'))
  for (const key of EM_AVAILABLE_KEYS) assert.notEqual(ssRate(ssLayerKind(key)), 'high', key)
  assert.deepEqual(ssLabel(evidence({ value: 1, kind: 'satellite', source: 'gibs', period: '2026-10-16' })), { kind: 'satellite', rate: 'medium', source: 'gibs', period: '2026-10-16' })
})

test('ô 5 km: lấy đúng ô chứa thửa; ô trống thì mượn ô kề và ghi khoảng cách; xa hơn thì thiếu', () => {
  const [i, j] = cellOf(9.5, 105.5)
  const idx = ssIndex({ grid, cells: [[i, j, 6.1], [i + 1, j, 5.2]] })
  assert.deepEqual(ssCellEstimate(idx, 9.5, 105.5), { value: 6.1, i, j, method: 'cell', distanceKm: 0 })
  const idx2 = ssIndex({ grid, cells: [[i + 1, j, 5.2]] })
  const near = ssCellEstimate(idx2, 9.5, 105.5)
  assert.equal(near.method, 'nearestCell')
  assert.equal(near.value, 5.2)
  assert.ok(near.distanceKm > 0 && near.distanceKm < 10)
  const idx3 = ssIndex({ grid, cells: [[i + 5, j, 5.2]] })
  assert.equal(ssCellEstimate(idx3, 9.5, 105.5), null)
})

test('tự điền: số đo tại ruộng thắng ước tính; ước tính mang kind "model", độ mặn ước tính KHÔNG phải ECe', () => {
  const [i, j] = cellOf(9.5, 105.5)
  const grids = { ph: ssIndex({ grid, cells: [[i, j, 5.8]] }), ec: ssIndex({ grid, cells: [[i, j, 2.4]] }) }
  const est = ssAutoFill({ profile: { ph: null, ec: null }, lat: 9.5, lon: 105.5, grids, snapshot: { ph: 'SoilGrids 2.0', ec: 'Dry season 2023' } })
  assert.equal(est.ph.origin, 'estimate')
  assert.equal(est.ph.ev.kind, 'model')
  assert.equal(est.ph.rate, 'ref')
  assert.equal(est.ec.ecType, 'unknown')
  assert.equal(est.ec.ev.unit, 'dS/m')
  const own = ssAutoFill({ profile: { ph: 6.5, ec: 1.2, ecType: 'ece', measuredAt: '2026-11-01' }, lat: 9.5, lon: 105.5, grids })
  assert.equal(own.ph.origin, 'field')
  assert.equal(own.ph.rate, 'high')
  assert.equal(own.ec.value, 1.2)
  const off = ssAutoFill({ profile: {}, lat: 9.5, lon: 105.5, grids, enabled: false })
  assert.equal(off.ph.origin, 'missing')
})

test('snapshot độ mặn Wang et al. 2025 (nếu đã build): đơn vị dS/m, loại mô hình, có giới hạn ghi rõ', { skip: !existsSync(new URL('site/data/precomputed/mekong_salinity_5km.json', root)) }, () => {
  const j = JSON.parse(src('site/data/precomputed/mekong_salinity_5km.json'))
  assert.equal(j.source.unit, 'dS/m')
  assert.equal(j.source.kind, 'model')
  assert.equal(j.source.doi, '10.5281/zenodo.15653696')
  assert.ok(j.records.length > 100)
  assert.ok(j.limitations.some((l) => /not .*ECe/i.test(l)))
})

test('snapshot pH SoilGrids 0–30 cm: loại mô hình, giá trị pH hợp lệ', () => {
  const j = JSON.parse(src('site/data/precomputed/mekong_soilgrids_ph_5km.json'))
  assert.equal(j.source.kind, 'model')
  assert.ok(j.records.length > 100)
  assert.ok(j.records.every(([, , ph]) => ph > 0 && ph < 14))
})

/* ---------- 5. AI 2 tầng ---------- */

const evalRes = { strategies: [
  { strategyId: 'B', crops: ['rice', 'mungbean', 'rice'], eligibility: 'eligible', riskLevel: 'lower', rank: 1, score: 78, missingFields: [] },
  { strategyId: 'A', crops: ['rice', 'rice', 'rice'], eligibility: 'eligible', riskLevel: 'higher', rank: 2, score: 54, missingFields: [] },
] }
const facts = [
  { key: 'irrigation', present: false },
  { key: 'ph', value: 4.2, unit: '', kind: 'model', source: 'soilgridsPh' },
  { key: 'ec', value: 3.5, unit: 'dS/m', kind: 'ground', ecType: 'ece', source: 'soilForm' },
  { key: 'climate', present: true, kind: 'model' },
  { key: 'calendar', present: true, kind: 'satellite' },
]

test('Tầng 1 đề xuất đúng phương án đứng đầu; thiếu dữ liệu thì không đề xuất', () => {
  const ctx = assistantContext({ loc: { name: 'X', lat: 10, lon: 105 }, evalResult: evalRes, facts, crop: { id: 'rice', name: 'Lúa' } })
  assert.deepEqual(asstTier1Propose(ctx).strategyId, 'B')
  const need = asstTier1Propose({ fieldStrategies: [{ id: 'B', crops: [], eligibility: 'insufficient_data', missingFields: ['irrigation'] }] })
  assert.equal(need.status, 'needData')
  assert.deepEqual(need.missing, ['irrigation'])
})

test('Tầng 2 gắn cờ: đo thực địa / xấp xỉ / thiếu / mâu thuẫn theo ngưỡng FAO-29 + ECOCROP', () => {
  const ctx = assistantContext({ loc: { name: 'X', lat: 10, lon: 105 }, evalResult: evalRes, facts, crop: { id: 'rice', name: 'Lúa' } })
  const { checks, verdict } = asstTier2Check(asstTier1Propose(ctx), ctx)
  const by = (k, st) => checks.find((c) => c.key === k && (!st || c.status === st))
  assert.equal(by('ec').status, 'field')
  assert.equal(by('ph').status, 'approx') // ước tính SoilGrids: không được gọi là đo trực tiếp
  assert.equal(by('calendar').rate, 'medium')
  assert.equal(by('irrigation').status, 'missing')
  assert.ok(by('salinity', 'conflict')) // ECe 3.5 > ngưỡng lúa 3.0 (FAO-29)
  assert.ok(by('phBand', 'conflict')) // pH 4.2 ngoài khoảng chịu được của lúa
  assert.ok(by('salinityThreshold', 'missing')) // đậu xanh chưa có dòng FAO-29
  assert.equal(verdict, 'conflict')
})

test('Tầng 2: cây tự nhập → báo thiếu tham số; EC không phải ECe → cảnh báo, không chấm', () => {
  const ctx = assistantContext({ evalResult: evalRes, facts: [{ key: 'ec', value: 2, unit: 'dS/m', kind: 'model', ecType: 'unknown' }], crop: { name: 'Sầu riêng', custom: true } })
  const { checks } = asstTier2Check(asstTier1Propose(ctx), ctx)
  assert.equal(checks.find((c) => c.key === 'crop').reason, 'customCrop')
  assert.ok(checks.some((c) => c.key === 'ecType' && c.status === 'warn'))
  assert.ok(!checks.some((c) => c.key === 'salinity'))
})

test('câu trả lời 2 tầng offline chỉ dùng số có trong ngữ cảnh và luôn kèm lời nhắc khuyến nông', () => {
  const ctx = assistantContext({ loc: { name: 'X', lat: 10, lon: 105 }, evalResult: evalRes, facts, crop: { id: 'rice', name: 'Lúa' } })
  for (const lang of ['vi', 'en']) {
    const text = asstTwoTierText(ctx, lang)
    assert.equal(asstVerifyReply(text, asstLedgerNumbers(ctx)).ok, true, text)
    assert.match(text, lang === 'vi' ? /khuyến nông/ : /extension officer/)
  }
  assert.match(fallbackAnswer('Đề xuất và kiểm tra chiến thuật cho thửa của tôi', ctx, 'vi'), /Tầng 2/)
})

test('hướng dẫn tự đo: không chứa ngưỡng hay số tự bịa, nhắc nhập vào Cài đặt vườn', () => {
  for (const lang of ['vi', 'en']) {
    const t = asstMeasureAnswer('cách tự đo độ mặn', lang)
    assert.equal(asstVerifyReply(t, new Set()).ok, true, t)
    assert.match(t, lang === 'vi' ? /Cài đặt vườn/ : /Garden settings/)
  }
  assert.match(fallbackAnswer('Cách tự đo độ mặn, pH tại ruộng?', {}, 'vi'), /bút đo EC/)
})

/* ---------- 6. Lịch vụ NDVI cấp tỉnh (ngoài 15 km quanh huyện mẫu) ---------- */

import { fsCalendarSource } from '../../site/logic/fieldStrategies.js'
import { districtInputs } from '../../site/logic/rotationInputs.js'

const kmeansJson = JSON.parse(src('site/data/precomputed/calendar_kmeans.json'))
const fakeProvCal = [{ id: 'p-camau', code: 'camau', name: 'Cà Mau', lat: 9.0501, lon: 105.0408, climate: [{ month: 1 }], monthly: [], calendarYear: 2025, calendarCluster: kmeansJson.clusters[0].cluster, sensitivity: { min: 2, max: 3 } }]

test('ngoài 15 km + trong ranh tỉnh có lịch → mode "province"; không truyền lịch tỉnh thì giữ hành vi cũ', () => {
  const loc = { lat: 9.18, lon: 105.15 }
  assert.deepEqual(fsCalendarSource(loc, PROVINCES), { mode: 'none', districtId: null, distanceKm: null })
  const cal = fsCalendarSource(loc, PROVINCES, undefined, fakeProvCal)
  assert.equal(cal.mode, 'province')
  assert.equal(cal.districtId, 'p-camau')
  assert.ok(cal.distanceKm > 0)
  // Trong 15 km quanh huyện mẫu thì huyện mẫu vẫn thắng.
  assert.equal(fsCalendarSource({ lat: 10.12, lon: 105.45 }, PROVINCES, undefined, fakeProvCal).mode, 'borrowed')
  // Tỉnh không có lịch hợp lệ → vẫn nói thiếu, không mượn tỉnh bên cạnh.
  assert.equal(fsCalendarSource({ lat: 9.6, lon: 106.0 }, PROVINCES, undefined, fakeProvCal).mode, 'none')
})

test('districtInputs đọc lịch cấp tỉnh: đỉnh vụ = nhóm k-means đã lưu, không chạy lại k-means', () => {
  const pre = { kmeans: kmeansJson, provinceCal: fakeProvCal, climate: { districts: [] }, comparison: { sensitivity: { districts: {} } } }
  const inp = districtInputs(pre, 'p-camau')
  assert.deepEqual(inp.peakDays, kmeansJson.clusters[0].shape.peakDayOfYear)
  assert.deepEqual(inp.sensitivity, { min: 2, max: 3 })
  assert.equal(inp.calendarYear, 2025)
})

/* ---------- 7. Mưa hiệu quả FAO Manual 3 (mục 4.2) ---------- */

import { wbEffectiveRain, wbEffectiveRainMm } from '../../site/logic/waterBalance.js'

test('mưa hiệu quả tái lập đúng bảng đáp án FAO Manual 3 mục 4.2 và ví dụ mục 4.3', () => {
  // Bảng "ANSWER" của mục 4.2 (FAO làm tròn tới mm).
  for (const [p, pe] of [[35, 11], [90, 47], [116, 68], [5, 0], [260, 183], [75, 35]]) assert.equal(Math.round(wbEffectiveRainMm(p)), pe, `P = ${p}`)
  // "Step 1" của mục 4.3: Feb–June.
  assert.deepEqual([20, 38, 40, 80, 16].map((p) => Math.round(wbEffectiveRainMm(p))), [2, 13, 14, 39, 0])
  assert.equal(wbEffectiveRainMm(null), null)
  assert.equal(wbEffectiveRainMm(-1), null)
})

test('mưa hiệu quả 12 tháng: Evidence "derived" từ mưa POWER; thiếu một tháng thì không cộng tổng', () => {
  const rain = (v) => evidence({ value: v, unit: 'mm', kind: 'model', source: 'powerDaily', label: 'rain' })
  const climate = { months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rain: rain(i < 4 ? 20 : 200) })) }
  const r = wbEffectiveRain(climate)
  assert.equal(r.months[0].effRain.kind, 'derived')
  assert.equal(Math.round(r.totalEffMm), 4 * 2 + 8 * 135)
  climate.months[0].rain = { value: null, kind: 'missing', unit: 'mm' }
  assert.equal(wbEffectiveRain(climate).totalEffMm, null)
})
