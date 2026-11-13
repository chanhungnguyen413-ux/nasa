// Bốc thoát hơi nước tham chiếu ET0 theo FAO-56 Penman–Monteith, bước THÁNG (FAO-56 cho phép dùng số liệu trung bình tháng).
// Nguồn đã đối chiếu (13/11/2026):
//   Chương 3: https://www.fao.org/4/X0490E/x0490e07.htm  (phương trình 7, 8, 11, 12, 13, 19, 21–25, 34–40, 43, 44)
//   Chương 4: https://www.fao.org/4/X0490E/x0490e08.htm  (phương trình 6 và Ví dụ 17: Bangkok tháng 4, ET0 = 5,72 mm/ngày)
// Test: scripts/tests/et0.test.mjs tái lập Ví dụ 17 với số chép từ trang nguồn.
import { evDerive, evIsMissing, evMissing, evText } from '../core/evidence.js'

const ET0_GSC = 0.082 // hằng số mặt trời, MJ m⁻² phút⁻¹ (chương 3)
const ET0_SIGMA = 4.903e-9 // hằng số Stefan-Boltzmann, MJ K⁻⁴ m⁻² ngày⁻¹ (phương trình 39)
const ET0_ALBEDO = 0.23 // hệ số phản xạ của cỏ tham chiếu (phương trình 38)

/** Áp suất hơi nước bão hoà e°(T), kPa (phương trình 11). */
export const et0SatVap = (t) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3))
/** Độ dốc đường áp suất hơi nước bão hoà Δ, kPa/°C (phương trình 13). */
export const et0Slope = (t) => (4098 * et0SatVap(t)) / (t + 237.3) ** 2
/** Áp suất khí quyển P theo độ cao z (m), kPa (phương trình 7). */
export const et0Pressure = (z) => 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26
/** Hằng số ẩm kế γ, kPa/°C (phương trình 8). */
export const et0Gamma = (z) => 0.000665 * et0Pressure(z)

/** Ngày thứ J trong năm của ngày 15 mỗi tháng (năm không nhuận), như bảng 2.5 của FAO-56 (15/4 → 105). */
export const et0MidMonthDay = (month) => Math.round((Date.UTC(2023, month - 1, 15) - Date.UTC(2023, 0, 0)) / 864e5)

/** Bức xạ ngoài khí quyển Ra (MJ m⁻² ngày⁻¹) và số giờ chiếu sáng tối đa N (phương trình 21–25, 34). */
export function et0Radiation(latDeg, j) {
  const phi = (Math.PI / 180) * latDeg // phương trình 22
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * j) / 365) // phương trình 23
  const delta = 0.409 * Math.sin((2 * Math.PI * j) / 365 - 1.39) // phương trình 24
  const ws = Math.acos(-Math.tan(phi) * Math.tan(delta)) // phương trình 25
  const ra = ((24 * 60) / Math.PI) * ET0_GSC * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws)) // phương trình 21
  return { ra, n: (24 / Math.PI) * ws } // phương trình 34
}

/** Dòng nhiệt vào đất G của tháng (MJ m⁻² ngày⁻¹): phương trình 43 nếu biết tháng sau, phương trình 44 nếu không. */
export function et0SoilHeat(tPrev, tNow, tNext = null) {
  return tNext === null ? 0.14 * (tNow - tPrev) : 0.07 * (tNext - tPrev)
}

/**
 * ET0 (mm/ngày) từ số liệu trung bình tháng. Trả về cả các bước trung gian để kiểm tra và hiện trên trang.
 *   tmax, tmin (°C) · u2 (m/s, gió ở 2 m) · z (m) · latDeg (độ, Bắc dương) · j (ngày trong năm)
 *   độ ẩm: `ea` (kPa) HOẶC `rhMean` (%)  → phương trình 19
 *   bức xạ: `rs` (MJ m⁻² ngày⁻¹) HOẶC `sunshineHours` (giờ nắng n) → phương trình 35
 *   g: dòng nhiệt vào đất (MJ m⁻² ngày⁻¹)
 */
export function et0Compute({ tmax, tmin, u2, z, latDeg, j, ea = null, rhMean = null, rs = null, sunshineHours = null, g = 0 }) {
  const tmean = (tmax + tmin) / 2
  const es = (et0SatVap(tmax) + et0SatVap(tmin)) / 2 // phương trình 12
  const eaUsed = ea ?? (rhMean / 100) * es // phương trình 19
  const slope = et0Slope(tmean)
  const gamma = et0Gamma(z)
  const { ra, n } = et0Radiation(latDeg, j)
  const rsUsed = rs ?? (0.25 + (0.5 * sunshineHours) / n) * ra // phương trình 35
  const rso = (0.75 + 2e-5 * z) * ra // phương trình 37
  const rns = (1 - ET0_ALBEDO) * rsUsed // phương trình 38
  const rsRatio = Math.min(1, rsUsed / rso) // "Rs/Rso ≤ 1.0" (chương 3)
  const rnl = ET0_SIGMA * (((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2) * (0.34 - 0.14 * Math.sqrt(eaUsed)) * (1.35 * rsRatio - 0.35) // phương trình 39
  const rn = rns - rnl // phương trình 40
  const et0 = (0.408 * slope * (rn - g) + ((gamma * 900) / (tmean + 273)) * u2 * (es - eaUsed)) / (slope + gamma * (1 + 0.34 * u2)) // phương trình 6
  return { et0, parts: { tmean, es, ea: eaUsed, slope, gamma, ra, n, rs: rsUsed, rso, rns, rnl, rn, g } }
}

const ET0_FORMULA = evText(
  'FAO-56 Penman–Monteith, bước tháng (phương trình 6); Rs từ NASA POWER; ea từ độ ẩm trung bình (phương trình 19); G theo phương trình 43',
  'FAO-56 Penman–Monteith, monthly step (equation 6); Rs from NASA POWER; ea from mean humidity (equation 19); G from equation 43',
)

/**
 * ET0 cho 12 tháng khí hậu (Evidence). Mỗi tháng trả về mm/ngày và mm/tháng.
 *   months: kết quả powerClimate().months · lat: Evidence vĩ độ · elevation: Evidence độ cao
 * Thiếu bất kỳ đầu vào nào (kể cả nhiệt độ tháng trước/sau dùng cho G) → tháng đó là 'missing'.
 */
export function et0Months(months, { lat, elevation }) {
  const tMean = (row) => (evIsMissing(row.tmax) || evIsMissing(row.tmin) ? null : (row.tmax.value + row.tmin.value) / 2)
  return months.map((row, i) => {
    const prev = months[(i + 11) % 12]
    const next = months[(i + 1) % 12]
    const neighbours =
      tMean(prev) === null || tMean(next) === null
        ? evMissing({ reason: evText('thiếu nhiệt độ tháng trước hoặc tháng sau (cần cho dòng nhiệt vào đất G)', 'temperature of the previous or next month is missing (needed for soil heat flux G)'), need: 'retry', label: 'soilHeat' })
        : { ...evDerive({ inputs: { tmaxPrev: prev.tmax, tminPrev: prev.tmin, tmaxNext: next.tmax, tminNext: next.tmin }, compute: (v) => et0SoilHeat((v.tmaxPrev + v.tminPrev) / 2, null, (v.tmaxNext + v.tminNext) / 2), unit: 'MJ/m²/ngày', formula: evText('G = 0,07 × (T tháng sau − T tháng trước) (FAO-56, phương trình 43)', 'G = 0.07 × (T next month − T previous month) (FAO-56, equation 43)'), label: 'soilHeat' }) }
    const daily = evDerive({
      inputs: { tmax: row.tmax, tmin: row.tmin, rh: row.rh, ws: row.ws, rs: row.rs, g: neighbours, lat, elevation },
      compute: (v) => et0Compute({ tmax: v.tmax, tmin: v.tmin, rhMean: v.rh, u2: v.ws, rs: v.rs, g: v.g, z: v.elevation, latDeg: v.lat, j: et0MidMonthDay(row.month) }).et0,
      unit: 'mm/ngày',
      formula: ET0_FORMULA,
      label: 'et0Day',
    })
    const days = new Date(Date.UTC(2023, row.month, 0)).getUTCDate()
    const monthly = evDerive({ inputs: { et0: daily }, compute: (v) => v.et0 * days, unit: 'mm', formula: evText(`ET0 mm/ngày × ${days} ngày của tháng`, `ET0 mm/day × ${days} days in the month`), label: 'et0' })
    return { month: row.month, daily, monthly }
  })
}
