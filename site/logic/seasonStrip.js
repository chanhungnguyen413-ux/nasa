// Dải mùa vụ 12 tháng cho một huyện: lịch vụ (NDVI), tháng ruộng trống/ngập, và khí hậu tháng (NASA POWER).
// Hàm thuần: nhận số liệu, trả 12 ô tháng. Giao diện chỉ việc vẽ.
import { dryMonths } from './rotation.js'

// Ngưỡng do nhóm chọn (không phải hằng số khoa học); hiển thị nguyên văn trên trang.
export const STRIP_PARAMS = {
  bareShare: 0.5, // >= 50% số ảnh của tháng đó (5 năm) có NDVI < 0,3: "thường trống hoặc ngập"
  hotDays: 5, // tháng khô có trung bình >= 5 ngày nắng >= 35 °C: "dễ tổn thương"
}

/**
 * climate: 12 tháng từ climate_monthly.json; monthly: 12 tháng từ calendar_rule.json;
 * windows: kết quả seasonWindows() hoặc null nếu không có lịch 3 vụ.
 */
export function seasonStrip({ climate, monthly, windows }) {
  const dry = dryMonths(climate)
  return climate.map((c) => {
    const m = c.month
    const ndvi = monthly.find((x) => x.month === m)
    const win = windows?.find((w) => w.months.includes(m)) ?? null
    const isDry = dry.includes(m)
    const isBare = ndvi.bareShare >= STRIP_PARAMS.bareShare
    const isVulnerable = isDry && c.hotDays.mean >= STRIP_PARAMS.hotDays
    return {
      month: m,
      season: win?.season ?? null,
      isPeak: win ? win.peakMonth === m : false,
      ndvi: ndvi.ndviMedian,
      bareShare: ndvi.bareShare,
      isBare,
      rainMm: c.rainMm.mean,
      rainP10: c.rainMm.p10,
      rainP90: c.rainMm.p90,
      hotDays: c.hotDays.mean,
      rootWetness: c.rootWetness.mean,
      isDry,
      isVulnerable,
    }
  })
}
