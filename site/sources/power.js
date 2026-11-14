// NASA POWER cho một toạ độ bất kỳ: lấy số liệu NGÀY nhiều năm, gộp thành từng tháng, rồi tính khí hậu 12 tháng.
// Chạy được cả trong trình duyệt lẫn trong Node (scripts/fetch-power-monthly.mjs dùng chính file này).
//
// Vì sao dùng điểm cuối NGÀY chứ không phải điểm cuối THÁNG (sai lệch so với phase-1.md, đã ghi ở STATE.md):
// docs/API_STATUS.md kiểm chứng rằng T2M_MAX/T2M_MIN của điểm cuối tháng là cực trị của cả tháng, còn FAO-56 cần
// nhiệt độ cao nhất/thấp nhất TRUNG BÌNH ngày. Gộp từ số liệu ngày cho đúng thứ FAO-56 cần, và mưa cộng thẳng ra mm/tháng.
import { evidence, evMissing, evText } from '../core/evidence.js'
import { CATALOG } from './catalog.js'

export const POWER_DAILY_PARAMS = ['T2M_MAX', 'T2M_MIN', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN', 'PRECTOTCORR', 'GWETROOT']
export const POWER_FIRST_YEAR = 2001
// Tham số do nhóm chọn: tháng nào có ít hơn 90% số ngày hợp lệ thì coi tháng đó là thiếu (giống scripts/python).
export const POWER_PARAMS_RULES = { minDayShare: 0.9, yearsPerRequest: 5, timeoutMs: 30000 }
const POWER_EXPECTED_UNITS = { T2M_MAX: 'C', T2M_MIN: 'C', RH2M: '%', WS2M: 'm/s', ALLSKY_SFC_SW_DWN: 'MJ/m^2/day', PRECTOTCORR: 'mm/day', GWETROOT: '1' }

export const powerLastFullYear = (now = new Date()) => now.getFullYear() - 1
const powerDaysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate()

export function powerDailyUrl(lat, lon, startYear, endYear) {
  return `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${POWER_DAILY_PARAMS.join(',')}&community=AG&latitude=${lat}&longitude=${lon}&start=${startYear}0101&end=${endYear}1231&format=JSON`
}

/** Gọi POWER theo từng khối 5 năm (song song), trả về số liệu đã gộp thành tháng. Lỗi mạng thì ném lỗi. */
export async function powerFetchRecord(lat, lon, { endYear = powerLastFullYear(), fetchFn = fetch } = {}) {
  const blocks = []
  for (let y = POWER_FIRST_YEAR; y <= endYear; y += POWER_PARAMS_RULES.yearsPerRequest) blocks.push([y, Math.min(endYear, y + POWER_PARAMS_RULES.yearsPerRequest - 1)])
  const replies = await Promise.all(
    blocks.map(async ([a, b]) => {
      const res = await fetchFn(powerDailyUrl(lat, lon, a, b), { signal: AbortSignal.timeout(POWER_PARAMS_RULES.timeoutMs) })
      if (!res.ok) throw new Error(`NASA POWER trả lời HTTP ${res.status}`)
      return res.json()
    }),
  )
  return powerRecordFromReplies(replies, { lat, lon, years: [POWER_FIRST_YEAR, endYear] })
}

/** Gộp các phản hồi ngày thành một bản ghi tháng gọn (dùng chung cho trình duyệt và script tính sẵn). */
export function powerRecordFromReplies(replies, { lat, lon, years }) {
  const units = {}
  const daily = Object.fromEntries(POWER_DAILY_PARAMS.map((p) => [p, {}]))
  let fill = null
  for (const json of replies) {
    fill = json.header?.fill_value ?? fill
    for (const p of POWER_DAILY_PARAMS) {
      units[p] = json.parameters?.[p]?.units ?? units[p]
      Object.assign(daily[p], json.properties?.parameter?.[p] ?? {})
    }
  }
  // Đơn vị phải đúng như đã kiểm chứng ở Phase 0; khác thì không dùng (không đoán cách đổi).
  for (const p of POWER_DAILY_PARAMS) {
    if (units[p] !== POWER_EXPECTED_UNITS[p]) throw new Error(`Đơn vị của ${p} là "${units[p]}", không phải "${POWER_EXPECTED_UNITS[p]}" như đã kiểm chứng`)
  }
  const monthly = {}
  for (const p of POWER_DAILY_PARAMS) {
    monthly[p] = {}
    for (let y = years[0]; y <= years[1]; y++) {
      monthly[p][y] = []
      for (let m = 1; m <= 12; m++) {
        const n = powerDaysInMonth(y, m)
        const values = []
        for (let d = 1; d <= n; d++) {
          const v = daily[p][`${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`]
          if (typeof v === 'number' && v !== fill) values.push(v)
        }
        if (values.length < POWER_PARAMS_RULES.minDayShare * n) monthly[p][y].push(null)
        else {
          const sum = values.reduce((a, b) => a + b, 0)
          // Mưa: cộng các ngày (mm/ngày × 1 ngày) ra mm/tháng; nếu thiếu vài ngày thì quy đổi theo số ngày của tháng.
          const value = p === 'PRECTOTCORR' ? (sum / values.length) * n : sum / values.length
          monthly[p][y].push(Math.round(value * 100) / 100)
        }
      }
    }
  }
  return { lat, lon, years, fetchedAt: new Date().toISOString(), fill, units: { ...units, PRECTOTCORR: 'mm/month' }, monthly }
}

/** Bách phân vị kiểu nội suy tuyến tính (giống numpy.percentile mặc định, như scripts/python). */
export function powerPercentile(values, p) {
  const s = [...values].sort((a, b) => a - b)
  const idx = (p / 100) * (s.length - 1)
  const lo = Math.floor(idx)
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (idx - lo)
}

const POWER_VAR_INFO = {
  PRECTOTCORR: { key: 'rain', unit: 'mm' },
  T2M_MAX: { key: 'tmax', unit: '°C' },
  T2M_MIN: { key: 'tmin', unit: '°C' },
  RH2M: { key: 'rh', unit: '%' },
  WS2M: { key: 'ws', unit: 'm/s' },
  ALLSKY_SFC_SW_DWN: { key: 'rs', unit: 'MJ/m²/ngày' },
  GWETROOT: { key: 'gwetroot', unit: '0–1' },
}

/**
 * Khí hậu 12 tháng từ một bản ghi: mỗi tháng có Evidence cho mưa (trung bình, kèm p10/p90), mưa năm khô (p10),
 * nhiệt độ cao/thấp nhất trung bình, độ ẩm, gió 2 m, bức xạ, ẩm vùng rễ.
 */
export function powerClimate(record, { origin = 'network' } = {}) {
  const src = CATALOG.powerDaily
  const yearsText = `${record.years[0]}–${record.years[1]}`
  const months = []
  for (let m = 1; m <= 12; m++) {
    const row = { month: m }
    for (const [param, info] of Object.entries(POWER_VAR_INFO)) {
      const values = Object.values(record.monthly[param] ?? {}).map((arr) => arr[m - 1]).filter((v) => typeof v === 'number')
      const base = { unit: info.unit, kind: 'model', source: 'powerDaily', resolution: src.resolution, fetchedAt: record.fetchedAt, label: info.key }
      if (values.length < 10) {
        row[info.key] = evMissing({ reason: evText(`NASA POWER có ít hơn 10 năm số liệu cho tháng ${m}`, `NASA POWER has fewer than 10 years of data for month ${m}`), need: 'retry', unit: info.unit, label: info.key, source: 'powerDaily' })
        continue
      }
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const p10 = powerPercentile(values, 10)
      const p90 = powerPercentile(values, 90)
      row[info.key] = {
        ...evidence({ ...base, value: mean, period: evText(`${yearsText}, trung bình tháng ${m} (${values.length} năm)`, `${yearsText}, mean of month ${m} (${values.length} years)`), note: origin === 'precomputed' ? evText('bản tính sẵn trong trang', 'precomputed copy inside the page') : null }),
        spread: { p10, p90, years: values.length },
      }
      if (info.key === 'rain') {
        row.rainDry = evidence({ ...base, label: 'rainDry', value: p10, period: evText(`${yearsText}, tháng ${m}: mức mưa thấp 1 trong 10 năm (p10)`, `${yearsText}, month ${m}: low rain seen 1 year in 10 (p10)`), formula: evText('bách phân vị 10 của mưa tháng qua các năm', '10th percentile of monthly rain across years') })
      }
    }
    months.push(row)
  }
  return { years: record.years, fetchedAt: record.fetchedAt, origin, months }
}

/* ---------------------------------------------------------------
 * Bộ nhớ đệm trong trình duyệt (localStorage). Trong Node không có localStorage thì bỏ qua.
 * Khoá theo điểm yêu cầu, không dùng khoá 0,01° chung cho các vườn lân cận.
 * --------------------------------------------------------------- */
const powerCacheKey = (lat, lon) => `mvm-power-v2-${lat.toFixed(6)}_${lon.toFixed(6)}`
const powerStore = () => (typeof localStorage === 'undefined' ? null : localStorage)

export const powerCacheMatches = (record,lat,lon) => Number.isFinite(record?.lat) && Number.isFinite(record?.lon) && Math.abs(record.lat-lat)<1e-6 && Math.abs(record.lon-lon)<1e-6

export function powerReadCache(lat, lon) {
  try {
    const raw = powerStore()?.getItem(powerCacheKey(lat, lon)) ?? powerStore()?.getItem(`mvm-power-v1-${lat.toFixed(2)}_${lon.toFixed(2)}`)
    const record=raw ? JSON.parse(raw) : null
    return powerCacheMatches(record,lat,lon) ? record : null
  } catch {
    return null
  }
}

export function powerWriteCache(record) {
  try {
    powerStore()?.setItem(powerCacheKey(record.lat, record.lon), JSON.stringify(record))
  } catch {
    /* bộ nhớ đầy hoặc bị chặn: vẫn dùng được, chỉ không lưu lại */
  }
}

/** Độ cao Copernicus GLO-90 qua Open-Meteo (có CORS theo docs/API_STATUS.md). Trả về Evidence. */
export async function powerFetchElevation(lat, lon, { fetchFn = fetch } = {}) {
  const res = await fetchFn(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Open-Meteo elevation HTTP ${res.status}`)
  const value = (await res.json())?.elevation?.[0]
  if (typeof value !== 'number') throw new Error('Open-Meteo elevation không trả về số')
  return { value, fetchedAt: new Date().toISOString() }
}

export const powerElevationEvidence = (elev) =>
  elev
    ? evidence({ value: elev.value, unit: 'm', kind: 'satellite', source: 'copernicusDem', resolution: '90 m', fetchedAt: elev.fetchedAt, label: 'elevation' })
    : evMissing({ reason: evText('chưa lấy được độ cao của điểm này', 'elevation for this point is not loaded yet'), need: 'retry', unit: 'm', label: 'elevation', source: 'copernicusDem' })
