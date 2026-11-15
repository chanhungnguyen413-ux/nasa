// Test đánh giá 3 chiến lược gắn với mảnh đất (Guide §4, §6.1, §8.2, §9.2).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evidence } from '../../site/core/evidence.js'
import { PROVINCES } from '../../site/data/provinces.js'
import { fsAssessField, fsCalendarSource, fsInputKey } from '../../site/logic/fieldStrategies.js'
import { loadPrecomputed } from './cases.mjs'

const PRE = loadPrecomputed()
const ev = (value, unit = 'mm') => evidence({ value, unit, kind: 'model', source: 'powerDaily' })
const goodClimate = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    rain: ev(220),
    rainDry: ev(180),
    gwetroot: ev(0.5, '0–1'),
    tmax: ev(31, '°C'),
    tmin: ev(24, '°C'),
  })),
}
const codo = PROVINCES.find((p) => p.id === 'cantho')
const cholach = PROVINCES.find((p) => p.id === 'bentre')

test('lịch vụ: điểm trực tiếp của huyện → direct; điểm trong bán kính → borrowed; ngoài vùng → none', () => {
  assert.equal(fsCalendarSource(codo, PROVINCES).mode, 'direct')
  assert.equal(fsCalendarSource({ lat: codo.lat + 0.02, lon: codo.lon }, PROVINCES).mode, 'borrowed')
  assert.equal(fsCalendarSource({ lat: 11.5, lon: 105.6 }, PROVINCES).mode, 'none')
})

test('hộ "Không đổi cây" → hai phương án thay thế thành ineligible có lý do, KHÔNG bị ép thành riskLevel high; A vẫn được chấm', () => {
  const res = fsAssessField({
    loc: codo,
    provinces: PROVINCES,
    precomputed: PRE,
    climate: goodClimate,
    irrigation: 'yes',
    cropChange: 'no',
    currentId: 'A',
  })
  assert.equal(res.evaluated, true)
  assert.equal(res.strategies.length, 3)
  const base = res.strategies.find((s) => s.isBaseline)
  const others = res.strategies.filter((s) => !s.isBaseline)
  assert.equal(base.eligibility, 'eligible')
  assert.equal(base.rank, 1)
  for (const s of others) {
    assert.equal(s.eligibility, 'ineligible')
    assert.equal(s.rank, null)
    assert.ok(s.unmetConstraints.includes('noCropChange'))
    assert.notEqual(s.riskLevel, 'unknown')
  }
})

test('thiếu trả lời nước tưới hoặc thiếu khí hậu → insufficient_data và rank: null', () => {
  const noIrr = fsAssessField({ loc: codo, provinces: PROVINCES, precomputed: PRE, climate: goodClimate, irrigation: null })
  for (const s of noIrr.strategies) {
    assert.equal(s.eligibility, 'insufficient_data')
    assert.equal(s.rank, null)
    assert.ok(s.missingFields.includes('irrigation'))
  }
  const noClim = fsAssessField({ loc: codo, provinces: PROVINCES, precomputed: PRE, climate: null, irrigation: 'yes' })
  for (const s of noClim.strategies) {
    assert.equal(s.eligibility, 'insufficient_data')
    assert.equal(s.rank, null)
    assert.ok(s.missingFields.includes('climate'))
  }
})

test('ngoài 5 huyện hoặc Chợ Lách: vẫn hiện đủ 3 chiến lược với insufficient_data và rank: null', () => {
  for (const loc of [{ lat: 11.5, lon: 105.6 }, cholach]) {
    const res = fsAssessField({ loc, provinces: PROVINCES, precomputed: PRE, climate: goodClimate, irrigation: 'yes' })
    assert.equal(res.baseRankable, false)
    assert.equal(res.strategies.length, 3)
    for (const s of res.strategies) {
      assert.equal(s.eligibility, 'insufficient_data')
      assert.equal(s.rank, null)
      assert.ok(s.missingFields.includes('ndviCalendar'))
    }
  }
})

test('cùng đầu vào → cùng kết quả; đổi đầu vào làm đổi fsInputKey', () => {
  const opts = { loc: codo, provinces: PROVINCES, precomputed: PRE, climate: goodClimate, irrigation: 'limited', cropChange: 'yes', currentId: 'A' }
  const r1 = fsAssessField(opts)
  const r2 = fsAssessField(opts)
  assert.deepEqual(r1.strategies.map((s) => [s.strategyId, s.eligibility, s.riskLevel, s.rank, s.score]), r2.strategies.map((s) => [s.strategyId, s.eligibility, s.riskLevel, s.rank, s.score]))

  const k1 = fsInputKey({ loc: codo, polygon: null, season: 'ht', sowing: 5, irrigation: 'limited', cropChange: 'yes', currentId: 'A', priorities: {}, whatIf: {} })
  const k2 = fsInputKey({ loc: codo, polygon: null, season: 'ht', sowing: 5, irrigation: 'yes', cropChange: 'yes', currentId: 'A', priorities: {}, whatIf: {} })
  assert.notEqual(k1, k2)
})

/* ---------------- 8 tình huống thực tế của nông dân (Bước 4) ---------------- */
// Khí hậu giả lập CHỈ dùng trong test (không phải số NASA): mỗi case đổi đúng một yếu tố để thấy tác động của nó.
const mkClimate = (rain, rainDry) => ({
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    rain: ev(rain(i + 1)),
    rainDry: ev(rainDry(i + 1)),
    gwetroot: ev(0.5, '0–1'),
    tmax: ev(31, '°C'),
    tmin: ev(24, '°C'),
  })),
})
// Mùa khô tháng 12–4 gần như không mưa.
const drySeasonClimate = mkClimate((m) => (m <= 4 || m === 12 ? 5 : 220), (m) => (m <= 4 || m === 12 ? 0 : 180))
// Năm thường đủ mưa, năm khô (p10) chỉ 40 mm/tháng: ruộng tưới hạn chế bù không kịp năm khô.
const dryYearOnlyClimate = mkClimate(() => 220, () => 40)
const phEv = (value) => evidence({ value, unit: '', kind: 'ground', label: 'phField' })
const base = { loc: codo, provinces: PROVINCES, precomputed: PRE, climate: goodClimate }
const waterGrades = (s) => s.assessments.map((a) => a.criteria.find((c) => c.key === 'water')?.grade)

test('Case 1 — phù sa ngọt, chủ động nước: cả 3 phương án eligible, xếp #1..#3, có cây Xanh để thay thế', () => {
  const res = fsAssessField({ ...base, irrigation: 'yes', ph: phEv(6.2), salinityEce: 0.8, salinityType: 'ece' })
  assert.deepEqual(res.strategies.map((s) => s.eligibility), ['eligible', 'eligible', 'eligible'])
  assert.deepEqual(res.strategies.map((s) => s.rank).sort(), [1, 2, 3])
  assert.equal(res.seasonAlternatives.length, 3)
  assert.ok(res.seasonAlternatives.every((a) => a.greenCrops.length > 0))
  // Vụ Vàng bị trừ điểm: điểm thửa không bao giờ vượt điểm tổng của trang Luân canh.
  for (const s of res.strategies) assert.ok(s.score <= s.rot.total)
})

test('Case 2 — chỉ chờ mưa, mùa khô thiếu nước: phương án có vụ water=red → ineligible, rank null, waterRed', () => {
  const res = fsAssessField({ ...base, climate: drySeasonClimate, irrigation: 'no' })
  const withRed = res.strategies.filter((s) => waterGrades(s).includes('red'))
  assert.ok(withRed.length > 0)
  for (const s of withRed) {
    assert.equal(s.eligibility, 'ineligible')
    assert.equal(s.rank, null)
    assert.ok(s.unmetConstraints.includes('waterRed'))
  }
})

test('Case 3 — tưới hạn chế: năm thường thiếu > 150 mm → waterRed; chỉ năm khô thiếu > 150 mm → vẫn eligible, conditional', () => {
  const red = fsAssessField({ ...base, climate: drySeasonClimate, irrigation: 'limited' })
  for (const s of red.strategies.filter((x) => waterGrades(x).includes('red'))) {
    assert.equal(s.eligibility, 'ineligible')
    assert.ok(s.unmetConstraints.includes('waterRed'))
  }
  assert.ok(red.strategies.some((s) => s.unmetConstraints.includes('waterRed')))

  const yellow = fsAssessField({ ...base, climate: dryYearOnlyClimate, irrigation: 'limited' })
  for (const s of yellow.strategies) {
    assert.ok(!waterGrades(s).includes('red'))
    assert.ok(waterGrades(s).includes('yellow'))
    assert.equal(s.eligibility, 'eligible')
    assert.equal(s.riskLevel, 'conditional')
  }
})

test('Case 4 — mặn vừa ECe 3,6: phương án có ngô (1,7 × 2 = 3,4 < 3,6) bị loại salinityRed; đậu nành (5,0) vẫn Xanh về mặn', () => {
  const res = fsAssessField({ ...base, irrigation: 'yes', salinityEce: 3.6, salinityType: 'ece' })
  const withMaize = res.strategies.filter((s) => s.crops.includes('maize'))
  assert.ok(withMaize.length > 0)
  for (const s of withMaize) {
    assert.equal(s.eligibility, 'ineligible')
    assert.ok(s.unmetConstraints.includes('salinityRed'))
    assert.equal(s.riskLevel, 'high')
  }
  // Lúa (3,0 × 2 = 6,0) chưa bị loại ở 3,6.
  assert.ok(res.strategies.some((s) => !s.crops.includes('maize') && s.eligibility === 'eligible'))
  const soy = res.seasonAlternatives.flatMap((a) => [...a.greenCrops, ...a.yellowCrops, ...a.redCrops]).filter((c) => c.crop === 'soybean')
  assert.ok(soy.length === 3)
  assert.ok(soy.every((c) => !c.reasons.some((r) => r.key === 'salinity')))
  assert.ok(res.seasonAlternatives.some((a) => a.greenCrops.some((c) => c.crop === 'soybean')))
})

test('Case 5 — mặn nặng ECe 6,5: cả lúa (3,0 × 2 = 6,0) và ngô đều bị loại salinityRed', () => {
  const res = fsAssessField({ ...base, irrigation: 'yes', salinityEce: 6.5, salinityType: 'ece' })
  for (const s of res.strategies) {
    assert.equal(s.eligibility, 'ineligible')
    assert.equal(s.rank, null)
    assert.ok(s.unmetConstraints.includes('salinityRed'))
  }
})

test('Case 6 — đất phèn chua nặng pH 3,8 (dưới mốc chịu được 4,5 / 4,3 của ECOCROP): ineligible, phRed', () => {
  const res = fsAssessField({ ...base, irrigation: 'yes', ph: phEv(3.8) })
  for (const s of res.strategies) {
    assert.equal(s.eligibility, 'ineligible')
    assert.ok(s.unmetConstraints.includes('phRed'))
  }
})

test('Case 7 — chưa trả lời nước tưới, chưa đo pH/ECe: insufficient_data và liệt kê đủ missingFields', () => {
  const res = fsAssessField({ ...base, irrigation: null })
  for (const s of res.strategies) {
    assert.equal(s.eligibility, 'insufficient_data')
    assert.equal(s.rank, null)
    for (const f of ['irrigation', 'ph', 'salinityEce']) assert.ok(s.missingFields.includes(f), f)
  }
})

test('Case 8 — vườn cách tâm huyện 5 km vs 40 km (dù loc.id gắn sẵn): borrowed vs none + insufficient_data', () => {
  const near = { id: 'cantho', lat: codo.lat + 5 / 111, lon: codo.lon }
  const far = { id: 'cantho', lat: codo.lat + 40 / 111, lon: codo.lon }
  assert.equal(fsCalendarSource(near, PROVINCES).mode, 'borrowed')
  assert.equal(fsCalendarSource(far, PROVINCES).mode, 'none')
  const res = fsAssessField({ ...base, loc: far, irrigation: 'yes' })
  assert.equal(res.calendar.mode, 'none')
  for (const s of res.strategies) assert.equal(s.eligibility, 'insufficient_data')
})

/* ---------------- Nhiệm vụ A & C: đánh dấu "Hay ngập" theo thửa, ảnh vệ tinh thumbnail ---------------- */
const { rfFloodMarksEvidence, rfMercPx, rfThumbFrame } = await import('../../site/pages/rotationFarm.js')
const { FI_MARK_TYPES } = await import('../../site/sources/farmerInput.js')

test('Hay ngập: chỉ đếm dấu "flood" (FI_MARK_TYPES) của ĐÚNG thửa; có dấu thì tiêu chí ngập của cây màu theo nông dân', () => {
  const marks = [
    { gardenId: 'g1', type: 'flood' },
    { gardenId: 'g1', type: 'waterlogged' }, // tên cũ đoán sai: không được đếm
    { gardenId: 'g1', type: 'flood' },
    { gardenId: 'g1', type: 'other' },
    { gardenId: 'g2', type: 'flood' },
  ]
  const f1 = rfFloodMarksEvidence(marks, 'g1')
  assert.equal(f1.count, 2)
  assert.equal(f1.ev.kind, 'farmer')
  assert.equal(f1.ev.value, 2)
  assert.equal(rfFloodMarksEvidence(marks, 'g3').ev, null)
  assert.equal(rfFloodMarksEvidence(null, 'g1').count, 0)
  // Khóa tên loại dấu với nút "Hay ngập" thật trên bản đồ, để hai nơi không lệch nhau lần nữa.
  assert.ok(FI_MARK_TYPES.includes('flood'))

  const opts = { ...base, irrigation: 'yes' }
  const mung = (res) => res.strategies.flatMap((s) => s.assessments).find((a) => a.crop === 'mungbean')
  const flood = (a) => a.criteria.find((c) => c.key === 'waterlogging')
  assert.notEqual(flood(mung(fsAssessField(opts))).reason, 'waterlog_farmer')
  assert.equal(flood(mung(fsAssessField({ ...opts, floodMarks: f1.ev }))).reason, 'waterlog_farmer')
})

test('Ảnh thumbnail: chiếu Web Mercator chuẩn, ranh thửa nằm trong khung 320×180, ô ảnh phủ kín khung', () => {
  assert.deepEqual(rfMercPx(0, 0, 1), [256, 256])
  const poly = [[10.1, 105.43], [10.1, 105.432], [10.102, 105.432], [10.102, 105.43]]
  const fr = rfThumbFrame({ lat: 10.101, lon: 105.431, polygon: poly })
  assert.ok(fr.z >= 12 && fr.z <= 17)
  for (const [x, y] of fr.points) assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 180)
  assert.ok(fr.tiles.every((t) => t.url === `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${t.z}/${t.y}/${t.x}`))
  assert.ok(Math.min(...fr.tiles.map((t) => t.left)) <= 0 && Math.max(...fr.tiles.map((t) => t.left + 256)) >= 320)
  assert.ok(Math.min(...fr.tiles.map((t) => t.top)) <= 0 && Math.max(...fr.tiles.map((t) => t.top + 256)) >= 180)
  // Bản ghi đảo thứ tự [kinh độ, vĩ độ] vẫn ra cùng khung.
  const swapped = rfThumbFrame({ lat: 10.101, lon: 105.431, polygon: poly.map(([a, b]) => [b, a]) })
  assert.deepEqual(swapped.points, fr.points)
})
