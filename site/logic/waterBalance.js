// Cân bằng nước khí hậu 12 tháng: mưa P, ET0, P − ET0 và cờ "tháng khô". Mọi số là Evidence có dấu vết.
// Định nghĩa tháng khô giữ đúng như trang Luân canh: mưa trung bình < ROTATION_PARAMS.dryMonthMm.
import { evDerive, evIsMissing, evText } from '../core/evidence.js'
import { ROTATION_PARAMS } from './rotation.js'

// Tham số điều chỉnh cho Phase 3 (thanh trượt). Phase 1 chỉ gọi với giá trị gốc.
export const WB_DEFAULT_ADJUST = { rainFactor: 1 }

/**
 * climate: kết quả powerClimate() · et0: kết quả et0Months()
 * Trả về 12 tháng { month, rain, rainDry, et0, balance, isDry, deficit }.
 */
export function wbMonthly({ climate, et0, adjust = WB_DEFAULT_ADJUST }) {
  const scale = (ev) =>
    adjust.rainFactor === 1 || evIsMissing(ev)
      ? ev
      : { ...ev, value: ev.value * adjust.rainFactor, kind: 'simulated', note: evText(`mưa × ${adjust.rainFactor} (giả định)`, `rain × ${adjust.rainFactor} (assumption)`) }
  return climate.months.map((row, i) => {
    const rain = scale(row.rain)
    const et = et0[i].monthly
    const balance = evDerive({ inputs: { rain, et0: et }, compute: (v) => v.rain - v.et0, unit: 'mm', formula: evText('P − ET0 (mưa tháng trừ bốc thoát hơi nước tham chiếu của tháng)', 'P − ET0 (monthly rain minus reference evapotranspiration)'), label: 'balance' })
    return {
      month: row.month,
      rain,
      rainDry: scale(row.rainDry),
      et0: et,
      balance,
      // Tháng "thiếu nước" theo khí hậu: mưa trung bình nhỏ hơn ET0 của tháng.
      deficit: !evIsMissing(balance) && balance.value < 0,
      isDry: !evIsMissing(rain) && rain.value < ROTATION_PARAMS.dryMonthMm,
    }
  })
}

/* ----------------------------------------------------------------
 * Mưa hiệu quả Pe (mm/tháng) — FAO Irrigation Water Management Training Manual 3
 * "Irrigation Water Needs" (Brouwer & Heibloem 1986), Chương 4, mục 4.2.
 * Nguồn: https://www.fao.org/3/s2022e/s2022e08.htm (chép nguyên văn 15/11/2026):
 *   "Pe = 0.8 P - 25 if P > 75 mm/month
 *    Pe = 0.6 P - 10 if P < 75 mm/month"
 *   "NOTE: Pe is always equal to or larger than zero; never negative"
 *   "These formulae can be applied in areas with a maximum slope of 4-5%"
 *   Tại P = 75 FAO ghi "Pe = 0.8 P - 25 or 0.6 P - 10" (cả hai cùng ra 35).
 * Test scripts/tests/snapshotTwoTier.test.mjs tái lập đúng bảng đáp án của FAO (35→11, 90→47, 116→68, 5→0, 260→183, 75→35).
 * ---------------------------------------------------------------- */
export const WB_FAO_PE = {
  url: 'https://www.fao.org/3/s2022e/s2022e08.htm',
  quote: 'Pe = 0.8 P - 25 if P > 75 mm/month; Pe = 0.6 P - 10 if P < 75 mm/month; Pe is always equal to or larger than zero; never negative',
  breakMm: 75,
  high: { a: 0.8, b: 25 },
  low: { a: 0.6, b: 10 },
}

/** Mưa hiệu quả của MỘT tháng (mm/tháng) theo FAO Manual 3; P không phải số hữu hạn → null (thiếu thì nói thiếu). */
export function wbEffectiveRainMm(pMm) {
  if (typeof pMm !== 'number' || !Number.isFinite(pMm) || pMm < 0) return null
  const { a, b } = pMm > WB_FAO_PE.breakMm ? WB_FAO_PE.high : WB_FAO_PE.low
  return Math.max(0, a * pMm - b)
}

/**
 * Mưa hiệu quả 12 tháng từ khí hậu powerClimate(): mỗi tháng là Evidence 'derived' (đầu vào: mưa tháng NASA POWER).
 * Trả về { months: [{ month, rain, effRain }], totalRainMm, totalEffMm } — tổng chỉ tính khi đủ 12 tháng.
 */
export function wbEffectiveRain(climate) {
  const months = (climate?.months ?? []).map((row) => ({
    month: row.month,
    rain: row.rain,
    effRain: evDerive({
      inputs: { rain: row.rain },
      compute: (v) => wbEffectiveRainMm(v.rain),
      unit: 'mm',
      label: 'effRain',
      source: 'faoManual3Pe',
      formula: evText('FAO Manual 3 mục 4.2: Pe = 0,8P − 25 nếu P > 75 mm/tháng; Pe = 0,6P − 10 nếu P < 75; không âm', 'FAO Manual 3 §4.2: Pe = 0.8P − 25 if P > 75 mm/month; Pe = 0.6P − 10 if P < 75; never negative'),
    }),
  }))
  const ok = months.length === 12 && months.every((m) => !evIsMissing(m.effRain))
  return {
    months,
    totalRainMm: ok ? months.reduce((s, m) => s + m.rain.value, 0) : null,
    totalEffMm: ok ? months.reduce((s, m) => s + m.effRain.value, 0) : null,
  }
}
