// Ma trận test cho hệ thống ĐIỀN THÔNG MINH (site/logic/smartFill.js) — luôn bật, không bịa, số bà con nhập luôn thắng.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { sfAutoSeason, sfCropForSeason, sfFill, sfSoilTypeFromLabel, SF_NEVER } from '../../site/logic/smartFill.js'
import { ssIndex } from '../../site/logic/staticSnapshot.js'
import { gmAssessGarden, gmNormalizeGarden } from '../../site/logic/gardenModel.js'
import { powerClimate } from '../../site/sources/power.js'

// Lưới 5 km giả lập quanh một điểm (cùng cách chia ô với dữ liệu thật).
const grid = { dLat: 5 / 111.32, dLon: 5 / (111.32 * Math.cos((10 * Math.PI) / 180)) }
const LAT = 10.1202, LON = 105.4502
const [I, J] = [Math.floor(LAT / grid.dLat), Math.floor(LON / grid.dLon)]
const grids = { ph: ssIndex({ grid, cells: [[I, J, 5.8]] }), ec: ssIndex({ grid, cells: [[I, J, 2.5]] }) }
const emptyGrids = { ph: ssIndex({ grid, cells: [] }), ec: ssIndex({ grid, cells: [] }) }
// Lịch vụ NDVI giả lập: ĐX T11–T2, HT T3–T6, TĐ T7–T9 (tháng 10 rơi vào khoảng trống).
const windows = [{ season: 'dx', months: [11, 12, 1, 2] }, { season: 'ht', months: [3, 4, 5, 6] }, { season: 'td', months: [7, 8, 9] }]
// Bản đồ đất giả lập: emCellAt đọc qua emEnsureIndex(envMap) — dùng đúng hình dạng PRECOMPUTED.envMap của lớp soilType.
const soilMap = (label) => ({
  grid: { dLat: grid.dLat, dLon: grid.dLon },
  layers: { soilType: { kind: 'soilType', classes: [{ code: 'X1', hex: '#aa8844', labelVi: label, labelEn: label }], cells: [[I, J, 0]] } },
})
const base = { lat: LAT, lon: LON, grids, windows, month: 4, snapshot: { ph: 'WCS 2026-11-15', ec: '11/2022–04/2023' } }

test('1. số bà con nhập luôn thắng: pH, EC, loại đất, mùa vụ, cây giữ nguyên, rate Cao', () => {
  const r = sfFill({ ...base, envMap: soilMap('Đất phèn'), profile: { ph: 6.4, ec: 1.2, ecType: 'ece', soilType: 'clay', season: 'td', cropId: 'maize', measuredAt: '2026-11-01' } })
  for (const k of ['ph', 'ec', 'soilType', 'season', 'cropId']) assert.equal(r.fields[k].origin, 'field', k)
  assert.equal(r.fields.ph.value, 6.4)
  assert.equal(r.fields.ph.rate, 'high')
  assert.equal(r.fields.ec.ecType, 'ece')
  assert.equal(r.fields.soilType.value, 'clay')
  assert.equal(r.fields.cropId.value, 'maize')
})

test('2. thiếu + có ô 5 km → tự điền có nguồn, kind model, rate Tham khảo; EC tự điền không phải ECe', () => {
  const r = sfFill({ ...base, profile: {} })
  assert.equal(r.fields.ph.origin, 'auto')
  assert.equal(r.fields.ph.value, 5.8)
  assert.equal(r.fields.ph.kind, 'model')
  assert.equal(r.fields.ph.rate, 'ref')
  assert.equal(r.fields.ph.source, 'soilgridsPh')
  assert.equal(r.fields.ph.period, 'WCS 2026-11-15')
  assert.equal(r.fields.ec.ecType, 'unknown')
  assert.equal(r.fields.ec.source, 'wangSalinity')
})

test('3. thiếu + ô và ô kề trống → để trống, có lý do và việc cần làm', () => {
  const r = sfFill({ ...base, grids: emptyGrids, profile: {} })
  for (const k of ['ph', 'ec']) {
    assert.equal(r.fields[k].origin, 'empty')
    assert.equal(r.fields[k].value, null)
    assert.equal(r.fields[k].reason, 'noCell')
    assert.equal(r.fields[k].need, 'measure')
  }
})

test('4. mùa vụ: tháng trong vụ → vụ đó; tháng ở khoảng trống → vụ sắp tới; không có lịch → trống', () => {
  assert.equal(sfAutoSeason(windows, 4).season, 'ht')
  assert.equal(sfAutoSeason(windows, 10).season, 'dx') // T10 trống → ĐX bắt đầu T11
  assert.equal(sfAutoSeason(null, 4), null)
  const r = sfFill({ ...base, profile: {} })
  assert.equal(r.fields.season.origin, 'auto')
  assert.equal(r.fields.season.value, 'ht')
  assert.equal(r.fields.season.rate, 'medium')
  const none = sfFill({ ...base, windows: null, profile: {} })
  assert.equal(none.fields.season.origin, 'empty')
  assert.equal(none.fields.season.reason, 'noCalendar')
})

test('5. tháng gieo = tháng đầu vụ tự điền; tháng gieo nhập tay giữ nguyên', () => {
  assert.equal(sfFill({ ...base, profile: {} }).fields.sowing.value, 3)
  const own = sfFill({ ...base, profile: { sowing: 8 } })
  assert.equal(own.fields.sowing.origin, 'field')
  assert.equal(own.fields.sowing.value, 8)
  assert.equal(own.fields.season.reason, 'sowingGiven') // đã có tháng gieo thì không cần đoán mùa vụ
})

test('6. cây theo đúng vụ trong câu "đang làm"; cây ngoài thư viện giữ tên; không có câu → trống', () => {
  assert.deepEqual(sfCropForSeason('ngô - đậu phộng - lúa', 1), { id: 'groundnut' })
  assert.deepEqual(sfCropForSeason('lúa - sầu riêng - lúa', 1), { custom: 'sầu riêng' })
  const r = sfFill({ ...base, profile: { currentText: 'ngô - đậu phộng - lúa' } }) // tháng 4 = HT = vụ 2
  assert.equal(r.fields.cropId.origin, 'auto')
  assert.equal(r.fields.cropId.value, 'groundnut')
  assert.equal(r.fields.cropId.rate, 'high') // lời của chính bà con
  const custom = sfFill({ ...base, profile: { currentText: 'lúa - sầu riêng - lúa' } })
  assert.equal(custom.fields.cropId.custom, 'sầu riêng')
  const none = sfFill({ ...base, profile: {} })
  assert.equal(none.fields.cropId.origin, 'empty')
  assert.equal(none.fields.cropId.reason, 'noCurrentText')
})

test('7. loại đất: nhãn rõ một nhóm → tự điền; nhãn nhiều nhóm → trống kèm nhãn gốc; không có ô → trống', () => {
  assert.equal(sfSoilTypeFromLabel('Đất phù sa phì nhiêu (Je72-2a)'), 'alluvial')
  assert.equal(sfSoilTypeFromLabel('Đất hữu cơ / than bùn (Od21-a)'), 'peat')
  assert.equal(sfSoilTypeFromLabel('Đất sét lầy giàu dinh dưỡng (Ge56-3a)'), 'clay')
  assert.equal(sfSoilTypeFromLabel('Đất xám bạc màu phiến sét (Ag16-2a)'), null) // "phiến sét" là đá mẹ, không phải đất sét
  assert.equal(sfSoilTypeFromLabel('Đất phù sa nước lợ mặn / phèn (Jt14-3a)'), null)
  const one = sfFill({ ...base, envMap: soilMap('Đất phù sa phì nhiêu (Je72-2a)'), profile: {} })
  assert.equal(one.fields.soilType.origin, 'auto')
  assert.equal(one.fields.soilType.value, 'alluvial')
  const many = sfFill({ ...base, envMap: soilMap('Đất phù sa nước lợ mặn / phèn (Jt14-3a)'), profile: {} })
  assert.equal(many.fields.soilType.origin, 'empty')
  assert.equal(many.fields.soilType.reason, 'ambiguousSoil')
  assert.match(many.fields.soilType.note.vi, /mặn \/ phèn/)
  assert.equal(sfFill({ ...base, envMap: null, profile: {} }).fields.soilType.reason, 'noCell')
})

test('8. nguồn tưới, chất hữu cơ, ý muốn đổi cây không bao giờ tự điền', () => {
  const r = sfFill({ ...base, envMap: soilMap('Đất phèn'), profile: { currentText: 'lúa - lúa - lúa' } })
  for (const k of Object.keys(SF_NEVER)) {
    assert.equal(r.fields[k].origin, 'empty', k)
    assert.equal(r.fields[k].reason, 'notInferable')
  }
  assert.deepEqual(Object.keys(SF_NEVER).sort(), ['cropChange', 'irrigation', 'om'])
})

test('9. hàm thuần: không sửa hồ sơ đầu vào; cùng đầu vào → cùng kết quả', () => {
  const profile = Object.freeze({ currentText: 'ngô - đậu phộng - lúa', ph: null })
  const a = sfFill({ ...base, profile })
  const b = sfFill({ ...base, profile })
  assert.deepEqual(a, b)
  assert.deepEqual(profile, { currentText: 'ngô - đậu phộng - lúa', ph: null })
})

// Tích hợp với đánh giá màu vườn (gardenModel.js) dùng khí hậu NASA POWER thật đã tính sẵn.
const pm = JSON.parse(readFileSync(new URL('../../site/data/precomputed/power_monthly.json', import.meta.url), 'utf8'))
const climate = powerClimate(pm.districts[0].record, { origin: 'precomputed' })
const sq = (lat, lon, d) => [[lat, lon], [lat, lon + d], [lat + d, lon + d], [lat + d, lon]]
const garden = (profile) => gmNormalizeGarden({ id: 'g1', lat: LAT, lon: LON, polygon: sq(LAT, LON, 0.0005), profile })

test('10. màu vườn: chưa chọn mùa/cây nhưng có lịch + câu "đang làm" → không còn xám vì thiếu; có số thật → như cũ', () => {
  const g = garden({ currentText: 'ngô - đậu phộng - lúa', irrigation: 'yes' })
  const fill = sfFill({ ...base, profile: g.profile })
  const without = gmAssessGarden({ garden: g, climate, windows })
  assert.equal(without.reason, 'noCrop')
  const withFill = gmAssessGarden({ garden: g, climate, windows, fill })
  assert.notEqual(withFill.reason, 'noCrop')
  assert.notEqual(withFill.reason, 'noSeason')
  assert.deepEqual(withFill.autoFilled.sort(), ['cropId', 'season'])
  // Hồ sơ đầy đủ → fill không đổi gì (hồi quy).
  const full = garden({ cropId: 'rice', season: 'dx', irrigation: 'yes', ph: 6, ec: 1, ecType: 'ece', measuredAt: '2026-11-01' })
  const a = gmAssessGarden({ garden: full, climate, windows })
  const b = gmAssessGarden({ garden: full, climate, windows, fill: sfFill({ ...base, profile: full.profile }) })
  assert.equal(b.grade, a.grade)
  assert.equal(b.reason, a.reason)
  assert.deepEqual(b.autoFilled, [])
})

test('11. không có lịch và không có câu "đang làm" → vẫn xám đúng lý do cũ, không bịa', () => {
  const g = garden({ irrigation: 'yes' })
  const r = gmAssessGarden({ garden: g, climate, windows: null, fill: sfFill({ ...base, windows: null, profile: g.profile }) })
  assert.equal(r.grade, 'gray')
  assert.equal(r.reason, 'noCrop')
  assert.deepEqual(r.autoFilled, [])
  const g2 = garden({ cropId: 'rice', irrigation: 'yes' })
  const r2 = gmAssessGarden({ garden: g2, climate, windows: null, fill: sfFill({ ...base, windows: null, profile: g2.profile }) })
  assert.equal(r2.reason, 'noSeason')
})

/* ---------- Nhập tại dòng (trang Luân canh) + chọn năm lịch tỉnh ---------- */
import { sfApplyInput } from '../../site/logic/smartFill.js'
import { provinceCalendarYear } from '../../site/logic/rotationInputs.js'

test('12. nhập tại dòng: số hợp lệ ghi kèm ngày đo; ngoài khoảng → lỗi; để trống → xóa (quay về tự điền)', () => {
  assert.deepEqual(sfApplyInput('ph', '6,2', { today: '2026-11-15' }), { ok: true, patch: { ph: 6.2, measuredAt: '2026-11-15' } })
  assert.deepEqual(sfApplyInput('ph', '6.5', { profile: { measuredAt: '2026-10-01' }, today: '2026-11-15' }).patch.measuredAt, '2026-10-01')
  assert.deepEqual(sfApplyInput('ph', '20', { today: '2026-11-15' }), { ok: false, error: 'range' })
  assert.deepEqual(sfApplyInput('ec', '1.4', { today: '2026-11-15', ecType: 'ece' }).patch, { ec: 1.4, measuredAt: '2026-11-15', ecType: 'ece' })
  assert.equal(sfApplyInput('ec', '1.4', { today: '2026-11-15', ecType: 'bogus' }).patch.ecType, 'unknown')
  assert.deepEqual(sfApplyInput('ph', '', {}).patch, { ph: null })
  assert.deepEqual(sfApplyInput('ec', ' ', {}).patch, { ec: null, ecType: 'unknown' })
  assert.deepEqual(sfApplyInput('om', 'abc', {}), { ok: false, error: 'range' })
})

test('13. nhập tại dòng: cây theo thư viện hoặc tên tự do; ô chọn chỉ nhận giá trị hợp lệ', () => {
  assert.deepEqual(sfApplyInput('cropId', 'đậu xanh').patch, { cropId: 'mungbean', cropName: null })
  assert.deepEqual(sfApplyInput('cropId', 'Sầu riêng').patch, { cropId: null, cropName: 'Sầu riêng' })
  assert.deepEqual(sfApplyInput('irrigation', 'limited').patch, { irrigation: 'limited' })
  assert.equal(sfApplyInput('irrigation', 'maybe').ok, false)
  assert.deepEqual(sfApplyInput('season', 'ht').patch, { season: 'ht' })
  assert.deepEqual(sfApplyInput('soilType', 'acidSulfate').patch, { soilType: 'acidSulfate' })
  assert.deepEqual(sfApplyInput('soilType', '').patch, { soilType: 'unknown' })
  assert.equal(sfApplyInput('soilType', 'moon').ok, false)
  // Ghi patch vào hồ sơ rồi chạy sfFill: giá trị nhập thắng ước tính.
  const p = { ...sfApplyInput('ph', '6.5', { today: '2026-11-15' }).patch }
  assert.equal(sfFill({ ...base, profile: p }).fields.ph.origin, 'field')
})

test('14. lịch tỉnh: chọn năm mới nhất có dạng 3 vụ; không có năm nào → năm cuối', () => {
  const clusters = [{ cluster: 1, shape: { peaks: 3 } }, { cluster: 3, shape: { peaks: 1 } }]
  assert.deepEqual(provinceCalendarYear({ 2021: { cluster: 1 }, 2022: { cluster: 1 }, 2025: { cluster: 3 } }, clusters), { year: 2022, cluster: 1, rule: 'latest3', lastYear: 2025, lastPeaks: 1 })
  assert.deepEqual(provinceCalendarYear({ 2024: { cluster: 3 }, 2025: { cluster: 3 } }, clusters), { year: 2025, cluster: 3, rule: 'last', lastYear: 2025, lastPeaks: 1 })
  assert.equal(provinceCalendarYear({}, clusters), null)
})
