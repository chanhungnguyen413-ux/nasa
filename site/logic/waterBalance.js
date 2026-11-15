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
