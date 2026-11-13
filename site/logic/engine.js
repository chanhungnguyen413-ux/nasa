// The one place where numbers become decisions. Every card, map colour, banner
// and advice text reads from `deriveFarm` and `planFor`.

import { CROPS } from '../data/crops.js'
import { DEMO_DAYS, DEMO_FORECAST, DEMO_HISTORY, DEMO_WEATHER, PLOT_GEOMETRY, PLOT_SPREAD } from '../data/demo.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round2 = (v) => Math.round(v * 100) / 100
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length

export function moistureStatus(m, need) {
  if (m < need * 0.75) return { key: 'veryLow', tone: 'bad' }
  if (m < need) return { key: 'low', tone: 'warn' }
  if (m <= need * 1.5) return { key: 'good', tone: 'good' }
  return { key: 'wet', tone: 'good' }
}

export function ndviStatus(v) {
  if (v < 0.2) return { key: 'bare', tone: 'bad' }
  if (v < 0.4) return { key: 'sparse', tone: 'warn' }
  if (v < 0.6) return { key: 'fair', tone: 'warn' }
  return { key: 'good', tone: 'good' }
}

/** 0–4. Calibrated so the demo farm today (35% vs rice 40%, 9 dry days, 35°C, no rain due) is 2. */
export function droughtLevel({ moisture, need, dryDays, rain48h, tMax }) {
  const deficit = Math.max(0, (need - moisture) / need)
  const score =
    deficit * 10 + (Math.min(dryDays, 14) / 14) * 4 + (tMax >= 35 ? 1 : tMax >= 33 ? 0.5 : 0) - (Math.min(rain48h, 20) / 20) * 3
  if (score < 1.5) return 0
  if (score < 3) return 1
  if (score < 5) return 2
  if (score < 7) return 3
  return 4
}

function dryStreaks(series) {
  let run = 0
  return series.map((d) => (run = d.rain < 1 ? run + 1 : 0))
}

/** Builds the 7-day picture (history + today) for either the demo farm or live NASA data. */
function baseSeries({ source, live }) {
  if (source === 'live' && live?.power) {
    const streak = dryStreaks(live.power)
    const last = live.power.slice(-7)
    const streakLast = streak.slice(-7)
    const f = live.forecast
    // Open-Meteo returns today first; the strip shows the 7 days after it.
    const forecast = f ? f.slice(1, 8) : null
    return {
      unit: 'sat',
      days: last.map((d) => d.date),
      plots: PLOT_GEOMETRY.map((g) => ({
        id: g.id,
        moisture: last.map((d) => clamp(Math.round(d.wet * 100 + PLOT_SPREAD[g.id] * 1.5), 5, 100)),
        ndvi: live.ndvi
          ? last.map(() => round2(clamp(live.ndvi.value + PLOT_SPREAD[g.id] * 0.004, 0, 1)))
          : DEMO_HISTORY[g.id].ndvi,
      })),
      weather: last.map((d, i) => ({ dryDays: streakLast[i], tMax: Math.round(d.tMax) })),
      rain48h: f ? Math.round((f[0]?.rain ?? 0) + (f[1]?.rain ?? 0)) : 0,
      forecast,
      ndviSimulated: !live.ndvi,
      ndviDate: live.ndvi?.date ?? null,
      dataDate: last[last.length - 1].date,
    }
  }
  return {
    unit: 'vol',
    days: DEMO_DAYS,
    plots: PLOT_GEOMETRY.map((g) => ({ id: g.id, ...DEMO_HISTORY[g.id] })),
    weather: DEMO_DAYS.map((_, i) => ({ dryDays: DEMO_WEATHER.dryDays[i], tMax: DEMO_WEATHER.tMax[i] })),
    rain48h: DEMO_FORECAST[0].rain + DEMO_FORECAST[1].rain,
    forecast: DEMO_FORECAST,
    ndviSimulated: true,
    dataDate: DEMO_DAYS[DEMO_DAYS.length - 1],
  }
}

/**
 * The whole farm for one day.
 * @param {{source:'demo'|'live', live:any, crop:string, day:number, scenario:null|{moisture:number,dryDays:number,rain48h:number,tMax:number}}} opts
 */
export function deriveFarm({ source, live, crop, day, scenario }) {
  const base = baseSeries({ source, live })
  const need = CROPS[crop].need[base.unit]
  const last = base.days.length - 1
  const i = clamp(day ?? last, 0, last)
  const isToday = i === last

  const history = {
    moisture: base.days.map((_, d) => Math.round(mean(base.plots.map((p) => p.moisture[d])))),
    ndvi: base.days.map((_, d) => round2(mean(base.plots.map((p) => p.ndvi[d])))),
  }

  let weather = { ...base.weather[i], rain48h: isToday ? base.rain48h : 0 }
  let shift = 0
  if (scenario && isToday) {
    shift = scenario.moisture - history.moisture[i]
    weather = { dryDays: scenario.dryDays, tMax: scenario.tMax, rain48h: scenario.rain48h }
  }

  const plots = PLOT_GEOMETRY.map((g) => {
    const series = base.plots.find((p) => p.id === g.id)
    const moisture = clamp(series.moisture[i] + shift, 0, 100)
    const ndvi = series.ndvi[i]
    return {
      ...g,
      moisture,
      ndvi,
      level: droughtLevel({ moisture, need, ...weather }),
      mStatus: moistureStatus(moisture, need),
      nStatus: ndviStatus(ndvi),
    }
  })

  const avg = {
    moisture: Math.round(mean(plots.map((p) => p.moisture))),
    ndvi: round2(mean(plots.map((p) => p.ndvi))),
  }

  return {
    unit: base.unit,
    need,
    crop,
    days: base.days,
    dayIndex: i,
    isToday,
    plots,
    avg,
    weather,
    level: droughtLevel({ moisture: avg.moisture, need, ...weather }),
    forecast: base.forecast,
    history,
    ndviSimulated: base.ndviSimulated,
    ndviDate: base.ndviDate ?? null,
    dataDate: base.dataDate,
    whatIf: Boolean(scenario && isToday),
  }
}

const round5 = (v) => Math.round(v / 5) * 5

/** What to do on one plot today: water (with minutes), wait for rain, or nothing. */
export function planFor(plotId, farm) {
  const plot = farm.plots.find((p) => p.id === plotId)
  const rel = Math.max(0, (farm.need - plot.moisture) / farm.need)
  const minutes = clamp(round5(15 + 80 * rel + 4 * (farm.level - 1)), 15, 90)
  const method = CROPS[farm.crop].method
  const nextRain = farm.forecast?.find((f) => f.rain >= 10) ?? null

  let type = 'water'
  if (rel === 0) type = 'fine'
  else if (farm.weather.rain48h >= 10) type = 'wait'

  return { type, plot, rel, minutes, start: 18 * 60, method, nextRain }
}

/** Plots that need water today, most urgent first. */
export function farmPlans(farm) {
  return farm.plots.map((p) => planFor(p.id, farm)).sort((a, b) => b.rel - a.rel)
}
