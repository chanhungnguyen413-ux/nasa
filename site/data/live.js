// Live data for one province: NASA POWER (soil wetness, rain, heat), Open-Meteo
// (7-day forecast) and, when reachable, MODIS NDVI from the ORNL DAAC subset service.
// Results are cached in localStorage so the page still works offline.

const FILL = -999

const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
const iso = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`

async function getJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function fetchPower({ lat, lon }) {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 864e5)
  const url =
    'https://power.larc.nasa.gov/api/temporal/daily/point' +
    `?parameters=GWETTOP,GWETROOT,PRECTOTCORR,T2M_MAX&community=AG&latitude=${lat}&longitude=${lon}` +
    `&start=${ymd(start)}&end=${ymd(end)}&format=JSON`
  const json = await getJson(url)
  const p = json.properties.parameter
  const days = Object.keys(p.GWETTOP)
    .filter((k) => p.GWETTOP[k] !== FILL && p.PRECTOTCORR[k] !== FILL && p.T2M_MAX[k] !== FILL)
    .sort()
  if (days.length < 7) throw new Error('POWER returned too few days')
  return days.map((k) => ({
    date: iso(k),
    wet: p.GWETTOP[k], // 0–1 topsoil saturation
    root: p.GWETROOT[k] === FILL ? null : p.GWETROOT[k],
    rain: p.PRECTOTCORR[k], // mm/day
    tMax: p.T2M_MAX[k], // °C
  }))
}

async function fetchForecast({ lat, lon }) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}` +
    '&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=8'
  const { daily } = await getJson(url)
  return daily.time.map((date, i) => ({
    date,
    tMax: Math.round(daily.temperature_2m_max[i]),
    rain: Math.round(daily.precipitation_sum[i] ?? 0),
    prob: daily.precipitation_probability_max[i] ?? 0,
  }))
}

// MODIS day-of-year date string, e.g. A2026264.
const modisDate = (d) => {
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 0)
  const doy = Math.floor((d.getTime() - startOfYear) / 864e5)
  return `A${d.getUTCFullYear()}${String(doy).padStart(3, '0')}`
}

async function fetchNdvi({ lat, lon }) {
  const end = new Date()
  const start = new Date(end.getTime() - 64 * 864e5)
  const url =
    'https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset' +
    `?latitude=${lat}&longitude=${lon}&band=250m_16_days_NDVI&startDate=${modisDate(start)}&endDate=${modisDate(end)}` +
    '&kmAboveBelow=1&kmLeftRight=1'
  const json = await getJson(url, { headers: { Accept: 'application/json' } })
  // A 3×3 km block of 250 m pixels; the median ignores roads, canals and houses.
  const rows = (json.subset || [])
    .map((r) => ({ date: r.calendar_date, px: (r.data || []).filter((v) => v > -3000).sort((a, b) => a - b) }))
    .filter((r) => r.px.length >= 9)
  if (!rows.length) throw new Error('No NDVI rows')
  const last = rows[rows.length - 1]
  const median = last.px[Math.floor(last.px.length / 2)]
  return { value: Math.round(median * 0.0001 * 100) / 100, date: last.date }
}

const cacheKey = (id) => `naf-live-${id}`

export function readCachedLive(provinceId) {
  try {
    const raw = localStorage.getItem(cacheKey(provinceId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Fetches everything for a province. POWER is required; forecast and NDVI are best-effort. */
export async function fetchLive(province) {
  const [power, forecast, ndvi] = await Promise.allSettled([fetchPower(province), fetchForecast(province), fetchNdvi(province)])
  if (power.status !== 'fulfilled') throw power.reason
  const data = {
    fetchedAt: new Date().toISOString(),
    power: power.value,
    forecast: forecast.status === 'fulfilled' ? forecast.value : null,
    ndvi: ndvi.status === 'fulfilled' ? ndvi.value : null,
  }
  try {
    localStorage.setItem(cacheKey(province.id), JSON.stringify(data))
  } catch {
    /* storage full or blocked: live data still shows, it just won't survive offline */
  }
  return data
}
