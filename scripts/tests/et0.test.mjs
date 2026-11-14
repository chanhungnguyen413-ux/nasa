// Test ET0: tái lập Ví dụ 17 của FAO-56 (Bangkok, tháng 4, số liệu trung bình tháng).
// Mọi số dưới đây chép từ https://www.fao.org/4/X0490E/x0490e08.htm (đã đối chiếu 13/11/2026).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evidence, evMissing } from '../../site/core/evidence.js'
import { et0Compute, et0MidMonthDay, et0Months, et0Radiation, et0SoilHeat, et0Slope } from '../../site/logic/et0.js'

const EX17 = {
  latDeg: 13 + 44 / 60, // "13°44'N"
  z: 2, // "2 m"
  tmax: 34.8,
  tmin: 25.6,
  ea: 2.85,
  u2: 2,
  sunshineHours: 8.5,
  tMonth: 30.2, // tháng 4
  tPrevMonth: 29.2, // tháng 3
}
const near = (actual, expected, tol, what) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual.toFixed(4)} khác ${expected} quá ${tol}`)

test('J của ngày 15/4 là 105 (bảng 2.5 của FAO-56)', () => assert.equal(et0MidMonthDay(4), 105))

test('Ví dụ 17: các bước trung gian khớp trang nguồn', () => {
  const { ra, n } = et0Radiation(EX17.latDeg, 105)
  near(ra, 38.06, 0.05, 'Ra')
  near(n, 12.31, 0.05, 'N')
  near(et0Slope(30.2), 0.246, 0.002, 'Δ')
  near(et0SoilHeat(EX17.tPrevMonth, EX17.tMonth), 0.14, 1e-9, 'G (phương trình 44)')
})

test('Ví dụ 17: ET0 = 5,72 mm/ngày, sai số ≤ 0,1', () => {
  const g = et0SoilHeat(EX17.tPrevMonth, EX17.tMonth) // chỉ biết tháng trước → phương trình 44, như ví dụ
  const { et0, parts } = et0Compute({ ...EX17, j: 105, g })
  near(parts.rs, 22.65, 0.1, 'Rs')
  near(parts.rso, 28.54, 0.1, 'Rso')
  near(parts.rn, 14.33, 0.2, 'Rn')
  near(et0, 5.72, 0.1, 'ET0')
})

test('ET0 theo tháng: đủ đầu vào thì ra số "derived"; thiếu một đầu vào thì tháng đó là "missing"', () => {
  const ev = (value, unit) => evidence({ value, unit, kind: 'model', source: 'powerDaily' })
  const month = (m, overrides = {}) => ({ month: m, tmax: ev(32, '°C'), tmin: ev(24, '°C'), rh: ev(80, '%'), ws: ev(2, 'm/s'), rs: ev(18, 'MJ/m²/ngày'), ...overrides })
  const months = Array.from({ length: 12 }, (_, i) => month(i + 1))
  const location = { lat: evidence({ value: 10.1, unit: '°', kind: 'farmer', source: 'location' }), elevation: evidence({ value: 2, unit: 'm', kind: 'satellite', source: 'copernicusDem' }) }
  const ok = et0Months(months, location)
  assert.equal(ok.length, 12)
  for (const r of ok) {
    assert.equal(r.daily.kind, 'derived')
    assert.ok(r.daily.value > 0 && r.daily.value < 10)
    assert.ok(r.daily.inputs.length >= 7, 'phải giữ danh sách đầu vào để truy ngược')
  }
  const broken = months.map((m, i) => (i === 4 ? { ...m, rh: evMissing({ reason: 'thử' }) } : m))
  const out = et0Months(broken, location)
  assert.equal(out[4].daily.kind, 'missing')
  assert.equal(out[4].daily.value, null)
  assert.equal(out[4].monthly.kind, 'missing', 'mm/tháng tính từ một số thiếu cũng phải thiếu')
  const noElevation = et0Months(months, { ...location, elevation: evMissing({ reason: 'chưa có độ cao', need: 'retry' }) })
  assert.ok(noElevation.every((r) => r.daily.kind === 'missing'), 'không có độ cao thì không có ET0 (không dùng giá trị thay thế)')
})
