// Demo farm: plot geometry, a week of simulated readings, a sample forecast and
// a sample watering log. Every value here is simulated for the presentation.

// Paddy outline: a rounded, slightly uneven polygon. `j` pulls each corner inward
// (x, y pairs clockwise from top-left) so no two plots are perfectly square.
function paddyPath(x, y, w, h, j) {
  const c = [
    [x + j[0], y + j[1]],
    [x + w - j[2], y + j[3]],
    [x + w - j[4], y + h - j[5]],
    [x + j[6], y + h - j[7]],
  ]
  const toward = (a, b, r) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy)
    return `${(a[0] + (dx * r) / len).toFixed(1)} ${(a[1] + (dy * r) / len).toFixed(1)}`
  }
  let d = ''
  for (let i = 0; i < 4; i++) {
    const cur = c[i]
    d += `${i ? 'L' : 'M'}${toward(cur, c[(i + 3) % 4], 26)} Q${cur[0]} ${cur[1]} ${toward(cur, c[(i + 1) % 4], 26)} `
  }
  return `${d}Z`
}

// Geometry in the 1200×520 farm-plan viewBox. `flow` is the water path from the canal gate.
export const PLOT_GEOMETRY = [
  { id: 'A', area: 0.6, x: 316, y: 118, w: 274, h: 182, j: [0, 8, 10, 0, 2, 0, 8, 10], flow: 'M600 90V209H578' },
  { id: 'B', area: 0.6, x: 610, y: 118, w: 274, h: 182, j: [4, 0, 0, 10, 8, 4, 0, 2], flow: 'M600 90V209H622' },
  { id: 'C', area: 0.6, x: 316, y: 322, w: 274, h: 168, j: [6, 0, 0, 6, 12, 0, 0, 8], flow: 'M600 90V406H578' },
  { id: 'D', area: 0.6, x: 610, y: 322, w: 274, h: 168, j: [0, 6, 8, 0, 0, 10, 10, 0], flow: 'M600 90V406H622' },
].map((p) => ({ ...p, d: paddyPath(p.x, p.y, p.w, p.h, p.j) }))

// Seven days ending today (index 6). Plot averages reproduce the headline numbers:
// 35% soil moisture and NDVI 0.68 today.
export const DEMO_DAYS = ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21']

export const DEMO_HISTORY = {
  A: { moisture: [52, 50, 48, 46, 45, 43, 41], ndvi: [0.74, 0.74, 0.73, 0.73, 0.73, 0.72, 0.72] },
  B: { moisture: [40, 37, 35, 33, 31, 29, 27], ndvi: [0.66, 0.65, 0.64, 0.63, 0.61, 0.62, 0.59] },
  C: { moisture: [50, 48, 45, 43, 40, 38, 36], ndvi: [0.72, 0.72, 0.71, 0.71, 0.7, 0.7, 0.7] },
  D: { moisture: [50, 49, 45, 42, 40, 38, 36], ndvi: [0.72, 0.73, 0.72, 0.72, 0.71, 0.71, 0.71] },
}

// Weather behind each of those days: consecutive dry days and the day's high.
export const DEMO_WEATHER = {
  dryDays: [3, 4, 5, 6, 7, 8, 9],
  tMax: [33, 34, 34, 35, 35, 36, 35],
}

// Next 7 days after today: hot until Thursday, rain from Friday.
export const DEMO_FORECAST = [
  { date: '2026-09-22', tMax: 36, rain: 0, prob: 5 },
  { date: '2026-09-23', tMax: 36, rain: 0, prob: 5 },
  { date: '2026-09-24', tMax: 35, rain: 0, prob: 10 },
  { date: '2026-09-25', tMax: 32, rain: 14, prob: 70 },
  { date: '2026-09-26', tMax: 30, rain: 22, prob: 85 },
  { date: '2026-09-27', tMax: 31, rain: 8, prob: 60 },
  { date: '2026-09-28', tMax: 32, rain: 3, prob: 40 },
]

// Offsets used to spread one NASA grid-cell value across the four plots in live mode.
export const PLOT_SPREAD = { A: 6, B: -8, C: 1, D: 1 }

// Coordinates sit in farming districts, not city centres, so satellite pixels see fields.
export const PROVINCES = [
  { id: 'cantho', name: 'Cần Thơ · Cờ Đỏ', lat: 10.1, lon: 105.43 },
  { id: 'angiang', name: 'An Giang · Thoại Sơn', lat: 10.3, lon: 105.26 },
  { id: 'soctrang', name: 'Sóc Trăng · Mỹ Tú', lat: 9.62, lon: 105.83 },
  { id: 'dongthap', name: 'Đồng Tháp · Tháp Mười', lat: 10.55, lon: 105.83 },
  { id: 'bentre', name: 'Bến Tre · Chợ Lách', lat: 10.25, lon: 106.13 },
]

// Sample watering history for the savings tracker (drip m³ vs the flood equivalent).
export const SEED_LOG = [
  { id: 's1', date: '2026-08-04', plot: 'A', minutes: 40, m3: 16, flood: 27, status: 'done', seeded: true },
  { id: 's2', date: '2026-08-09', plot: 'B', minutes: 45, m3: 18, flood: 30, status: 'done', seeded: true },
  { id: 's3', date: '2026-08-15', plot: 'C', minutes: 35, m3: 14, flood: 23, status: 'done', seeded: true },
  { id: 's4', date: '2026-08-22', plot: 'D', minutes: 35, m3: 14, flood: 23, status: 'done', seeded: true },
  { id: 's5', date: '2026-08-29', plot: 'B', minutes: 50, m3: 20, flood: 33, status: 'done', seeded: true },
  { id: 's6', date: '2026-09-04', plot: 'A', minutes: 30, m3: 12, flood: 20, status: 'done', seeded: true },
  { id: 's7', date: '2026-09-10', plot: 'C', minutes: 40, m3: 16, flood: 27, status: 'done', seeded: true },
  { id: 's8', date: '2026-09-16', plot: 'B', minutes: 45, m3: 18, flood: 30, status: 'done', seeded: true },
]
