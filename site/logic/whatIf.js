// Giả định khí hậu (blueprint mục 4.3). Hàm thuần: nhận khí hậu 12 tháng (powerClimate) và trả về khí hậu mới.
//   - Mưa ±%: nhân mưa của các tháng trong phạm vi (mùa khô hoặc cả năm).
//   - Nhiệt độ +°C: cộng ΔT vào nhiệt độ cao nhất và thấp nhất, GIỮ NGUYÊN áp suất hơi nước thực ea
//     (giả định này hiện trên màn hình), rồi tính lại ET0 bằng FAO-56 như bình thường.
//   - Phát lại năm khô nhất: chọn năm có tổng mưa mùa khô nhỏ nhất trong chuỗi NASA POWER (tính ra, không gõ cứng),
//     dùng số liệu tháng của đúng năm đó. Đây là số liệu thật của một năm, KHÔNG phải mô phỏng.
// Mọi số bị thanh trượt làm đổi mang kind 'simulated' (evDerive tự lan truyền sang ET0, cân bằng nước, đèn giao thông).
import { evDerive, evIsMissing, evMissing, evText, evidence } from '../core/evidence.js'
import { et0Months, et0SatVap } from './et0.js'
import { ROTATION_PARAMS } from './rotation.js'

export const WI_DEFAULT = { rainPct: 0, rainScope: 'dry', deltaT: 0, replay: false }
// Giới hạn của thanh trượt và hai mốc gợi ý (do nhóm chọn; blueprint gợi ý −20% mưa, +2 °C).
export const WI_PARAMS = { rainPct: [-50, 50], rainStep: 5, deltaT: [0, 4], deltaTStep: 0.5, presets: { rainPct: -20, deltaT: 2 } }

export const wiIsActive = (w) => Boolean(w) && (w.rainPct !== 0 || w.deltaT !== 0 || w.replay)
export const wiIsSimulated = (w) => Boolean(w) && (w.rainPct !== 0 || w.deltaT !== 0)

/** Các tháng mùa khô: mưa trung bình < ROTATION_PARAMS.dryMonthMm (cùng định nghĩa với trang Luân canh). */
export function wiDryMonths(climate) {
  return climate.months.filter((m) => !evIsMissing(m.rain) && m.rain.value < ROTATION_PARAMS.dryMonthMm).map((m) => m.month)
}

/**
 * Năm có tổng mưa mùa khô nhỏ nhất. record: bản ghi POWER (record.monthly.PRECTOTCORR[năm] = 12 số mm/tháng).
 * Chỉ xét năm có đủ số liệu ở mọi tháng mùa khô. Trả về { year, dryRainMm, months } hoặc null.
 */
export function wiDriestYear(record, climate) {
  const dry = wiDryMonths(climate)
  if (!dry.length) return null
  let best = null
  for (const [year, months] of Object.entries(record.monthly.PRECTOTCORR ?? {})) {
    const values = dry.map((m) => months[m - 1])
    if (values.some((v) => typeof v !== 'number')) continue
    const total = values.reduce((a, b) => a + b, 0)
    if (!best || total < best.dryRainMm) best = { year: Number(year), dryRainMm: total, months: dry }
  }
  return best
}

const WI_PARAM_OF = { rain: 'PRECTOTCORR', tmax: 'T2M_MAX', tmin: 'T2M_MIN', rh: 'RH2M', ws: 'WS2M', rs: 'ALLSKY_SFC_SW_DWN', gwetroot: 'GWETROOT' }

/** Khí hậu của MỘT năm thật (phát lại năm khô nhất). Cùng hình dạng với powerClimate(). */
export function wiYearClimate(record, year, climate) {
  const months = climate.months.map((base, i) => {
    const row = { month: base.month }
    for (const [key, param] of Object.entries(WI_PARAM_OF)) {
      const v = record.monthly[param]?.[year]?.[i]
      const ref = base[key]
      row[key] =
        typeof v === 'number'
          ? evidence({ value: v, unit: ref.unit, kind: 'model', source: 'powerDaily', resolution: ref.resolution, fetchedAt: record.fetchedAt, label: key, period: evText(`năm ${year}, tháng ${base.month}`, `year ${year}, month ${base.month}`) })
          : evMissing({ reason: evText(`NASA POWER thiếu số liệu tháng ${base.month} năm ${year}`, `NASA POWER has no data for month ${base.month} of ${year}`), need: 'retry', unit: ref.unit, label: key, source: 'powerDaily' })
    }
    // Một năm cụ thể thì "năm khô" chính là năm đó: mưa năm khô = mưa của năm.
    row.rainDry = evIsMissing(row.rain) ? row.rain : { ...row.rain, label: 'rainDry', note: evText(`đang phát lại năm ${year}: mưa năm khô lấy bằng mưa của năm này`, `replaying ${year}: dry-year rain equals this year's rain`) }
    return row
  })
  return { ...climate, months, replayYear: year }
}

/** Một Evidence bị giả định làm đổi: giữ dấu vết (đầu vào gốc), gắn nhãn mô phỏng và ghi rõ giả định. */
function wiSim(ev, value, formula) {
  if (evIsMissing(ev)) return ev
  return { ...ev, value, kind: 'simulated', inputs: [ev], formula, period: ev.period, note: evText('Mô phỏng giả định', 'Simulated assumption') }
}

/**
 * Áp các giả định lên khí hậu 12 tháng.
 *   climate: powerClimate() · w: { rainPct, rainScope: 'dry' | 'year', deltaT, replay } · record: bản ghi POWER (cho phát lại năm)
 * Trả về { climate, driest, dryMonths }.
 */
export function wiApply(climate, w, { record = null } = {}) {
  const dryMonths = wiDryMonths(climate)
  const driest = record ? wiDriestYear(record, climate) : null
  let out = w.replay && driest ? wiYearClimate(record, driest.year, climate) : climate
  if (!wiIsSimulated(w)) return { climate: out, driest, dryMonths }
  const factor = 1 + w.rainPct / 100
  const scoped = (m) => w.rainScope === 'year' || dryMonths.includes(m)
  const rainF = evText(`mưa × (1 ${w.rainPct >= 0 ? '+' : '−'} ${Math.abs(w.rainPct)}%)`, `rain × (1 ${w.rainPct >= 0 ? '+' : '−'} ${Math.abs(w.rainPct)}%)`)
  const tF = (k) => evText(`${k} + ${w.deltaT} °C (giả định)`, `${k} + ${w.deltaT} °C (assumption)`)
  const months = out.months.map((row) => {
    const next = { ...row }
    if (w.rainPct !== 0 && scoped(row.month)) {
      next.rain = { ...wiSim(row.rain, evIsMissing(row.rain) ? null : row.rain.value * factor, rainF), spread: row.rain.spread && { ...row.rain.spread, p10: row.rain.spread.p10 * factor, p90: row.rain.spread.p90 * factor } }
      next.rainDry = wiSim(row.rainDry, evIsMissing(row.rainDry) ? null : row.rainDry.value * factor, rainF)
    }
    if (w.deltaT !== 0) {
      // ea tính từ nhiệt độ và độ ẩm GỐC (phương trình 12 và 19 của FAO-56), rồi giữ nguyên khi nhiệt độ tăng.
      next.ea = evDerive({
        inputs: { tmax: row.tmax, tmin: row.tmin, rh: row.rh },
        compute: (v) => (v.rh / 100) * ((et0SatVap(v.tmax) + et0SatVap(v.tmin)) / 2),
        unit: 'kPa',
        formula: evText('ea = RH/100 × (e°(Tmax) + e°(Tmin))/2 từ số liệu gốc; giữ nguyên khi nhiệt độ tăng', 'ea = RH/100 × (e°(Tmax) + e°(Tmin))/2 from the original data; held constant when temperature rises'),
        label: 'ea',
      })
      next.tmax = wiSim(row.tmax, evIsMissing(row.tmax) ? null : row.tmax.value + w.deltaT, tF('Tmax'))
      next.tmin = wiSim(row.tmin, evIsMissing(row.tmin) ? null : row.tmin.value + w.deltaT, tF('Tmin'))
    }
    return next
  })
  out = { ...out, months }
  return { climate: out, driest, dryMonths }
}

/**
 * ET0 tháng (mm) gốc và khi tăng ΔT, cho trang Luân canh: nhu cầu nước của vụ nhân tỉ số ET0 mới / ET0 gốc
 * của các tháng trong vụ (mô hình hệ số cây đơn ETc = Kc × ET0 khi Kc không đổi; blueprint 4.3).
 *   climate: powerClimate() · lat, elevation: Evidence · deltaT: số °C
 * Trả về { base: [12 số], adj: [12 số] } hoặc null nếu thiếu số liệu ở tháng nào.
 */
export function wiEt0Pair({ climate, lat, elevation, deltaT }) {
  const base = et0Months(climate.months, { lat, elevation }).map((m) => m.monthly)
  const adj = et0Months(wiApply(climate, { ...WI_DEFAULT, deltaT }).climate.months, { lat, elevation }).map((m) => m.monthly)
  if ([...base, ...adj].some(evIsMissing)) return null
  return { base: base.map((e) => e.value), adj: adj.map((e) => e.value) }
}
