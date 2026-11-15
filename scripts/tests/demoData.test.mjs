// Bộ sinh vườn demo (site/logic/demoData.js): đủ mọi trường, lấy số từ dữ liệu tĩnh khi có, luôn mang cờ demo, xóa sạch được.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DM_NOTE, DM_PARAMS, dmBuildDemo, dmStripDemo } from '../../site/logic/demoData.js'
import { gmNormalizeGarden } from '../../site/logic/gardenModel.js'
import { MEKONG_PROVINCES_GEO, mekongFindProvince } from '../../site/data/mekongBoundaries.js'
import { geoAreaM2 } from '../../site/logic/geometry.js'

const TODAY = '2026-11-15'
// Dữ liệu tĩnh giả lập: mọi ô đều có pH 6.0, độ mặn 2.0, đất phèn, lịch MODIS vụ Hè Thu gieo tháng 4.
const fullData = () => ({
  fields: {
    ph: { origin: 'auto', value: 6.0 },
    ec: { origin: 'auto', value: 2.0 },
    soilType: { origin: 'auto', value: 'acidSulfate' },
    season: { origin: 'auto', value: 'ht', months: [4, 5, 6, 7] },
    sowing: { origin: 'auto', value: 4 },
  },
})
const noData = () => ({ fields: {} })
const FIELDS = ['cropId', 'currentText', 'season', 'sowing', 'irrigation', 'ph', 'ec', 'ecType', 'om', 'soilType', 'measuredAt', 'notes', 'cropChange']

test('đủ mọi trường hồ sơ, nằm đúng tỉnh, có ranh + điểm đánh dấu, gắn cờ demo và ghi chú mô phỏng', () => {
  const d = dmBuildDemo({ seed: 7, today: TODAY, fillFor: noData })
  assert.ok(d.gardens.length >= 12, `có ${d.gardens.length} thửa`)
  const provs = new Set(d.gardens.map((g) => mekongFindProvince(g.lat, g.lon)?.code))
  assert.ok(provs.size >= 12, 'trải ra gần đủ 13 tỉnh')
  for (const g of d.gardens) {
    assert.equal(g.demo, true)
    for (const k of FIELDS) assert.ok(g.profile[k] !== null && g.profile[k] !== undefined && g.profile[k] !== '', `${g.id}.${k}`)
    assert.equal(g.profile.notes, DM_NOTE)
    assert.equal(g.polygon.length, 4)
    const ha = geoAreaM2(g.polygon) / 10000
    assert.ok(ha >= DM_PARAMS.areaHa[0] * 0.95 && ha <= DM_PARAMS.areaHa[1] * 1.05, `diện tích ${ha}`)
    assert.ok(d.groups.some((gr) => gr.id === g.groupId && gr.demo && /Mô phỏng giả định/.test(gr.name)))
    assert.ok(d.marks.some((m) => m.gardenId === g.id && m.type === 'flood'))
    // Chuẩn hóa của kho dữ liệu không làm rơi giá trị nào.
    const n = gmNormalizeGarden(g).profile
    for (const k of ['cropId', 'season', 'sowing', 'irrigation', 'ph', 'ec', 'om', 'soilType']) assert.equal(n[k], g.profile[k], k)
  }
})

test('có dữ liệu tĩnh tại chỗ → pH, độ mặn, loại đất, mùa vụ lấy từ dữ liệu đó (chỉ lệch nhẹ)', () => {
  const d = dmBuildDemo({ seed: 3, today: TODAY, fillFor: fullData })
  for (const g of d.gardens) {
    const p = g.profile
    assert.ok(Math.abs(p.ph - 6.0) <= DM_PARAMS.phJitter + 0.051, `pH ${p.ph}`)
    assert.ok(p.ec >= 2.0 * DM_PARAMS.ecFactor[0] - 0.051 && p.ec <= 2.0 * DM_PARAMS.ecFactor[1] + 0.051, `EC ${p.ec}`)
    assert.equal(p.soilType, 'acidSulfate')
    assert.equal(p.season, 'ht')
    assert.equal(p.sowing, 4)
  }
})

test('cùng seed → cùng dữ liệu; khác seed → khác', () => {
  const a = dmBuildDemo({ seed: 11, today: TODAY, fillFor: noData })
  const b = dmBuildDemo({ seed: 11, today: TODAY, fillFor: noData })
  const c = dmBuildDemo({ seed: 12, today: TODAY, fillFor: noData })
  assert.deepEqual(a, b)
  assert.notDeepEqual(a.gardens.map((g) => g.profile.ph), c.gardens.map((g) => g.profile.ph))
})

test('nhiều loại cây, nhiều loại đất, đủ 3 mùa vụ', () => {
  const d = dmBuildDemo({ seed: 2026, today: TODAY, fillFor: noData })
  assert.ok(new Set(d.gardens.map((g) => g.profile.cropId)).size >= 3)
  assert.ok(new Set(d.gardens.map((g) => g.profile.soilType)).size >= 4)
  assert.ok(new Set(d.gardens.map((g) => g.profile.season)).size === 3)
})

test('xóa demo chỉ gỡ đồ demo, giữ nguyên thửa thật của bà con', () => {
  const d = dmBuildDemo({ seed: 5, today: TODAY, fillFor: noData, provinces: MEKONG_PROVINCES_GEO.slice(0, 3) })
  const real = { id: 'that', name: 'Thửa thật', groupId: 'g1', profile: {} }
  const snap = { gardens: [real, ...d.gardens], gardenGroups: [{ id: 'g1', name: 'Vườn nhà' }, ...d.groups], marks: [{ id: 'm', gardenId: 'that' }, ...d.marks], soil: [], uploads: [], activeGardenId: d.gardens[0].id }
  const out = dmStripDemo(snap)
  assert.deepEqual(out.gardens, [real])
  assert.deepEqual(out.gardenGroups.map((g) => g.id), ['g1'])
  assert.deepEqual(out.marks.map((m) => m.id), ['m'])
  assert.equal(out.activeGardenId, null)
})
