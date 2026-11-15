// Phần Phase 3 của trang Luân canh: thanh nhiệt độ (qua ET0) và hàng ba thẻ chiến lược.
// Dùng tiện ích của template ($, esc, icon, S, rotLines, whatIfTag, PRECOMPUTED, SOURCES…) vì build gộp mọi module.
// Template chỉ gọi các hàm rx* ở vài điểm nối.
import { evidence } from '../core/evidence.js'
import { ROT_TEXT, rotationParts } from '../i18n/rotationText.js'
import { STRAT_TEXT } from '../i18n/strategyText.js'
import { pickStrategies } from '../logic/strategies.js'
import { wiEt0Pair } from '../logic/whatIf.js'
import { powerClimate } from '../sources/power.js'

const RX_ET0_CACHE = new Map() // 'huyện|ΔT' → { base, adj }: tính ET0 hai lần mỗi lần kéo thanh thì tốn, nên nhớ lại

/** ET0 tháng gốc và khi tăng ΔT cho một huyện, từ bản NASA POWER tính sẵn trong trang. Không có số liệu → null. */
function rxEt0Pair(districtId, deltaT) {
  const key = `${districtId}|${deltaT}`
  if (RX_ET0_CACHE.has(key)) return RX_ET0_CACHE.get(key)
  const stored = PRECOMPUTED.power.find((d) => d.id === districtId)
  if (!stored) return null
  const climate = powerClimate(stored.record, { origin: 'precomputed' })
  const lat = evidence({ value: stored.record.lat, unit: '°', kind: 'farmer', source: 'location' })
  const elevation = evidence({ value: stored.elevation.value, unit: 'm', kind: 'satellite', source: 'copernicusDem' })
  const pair = wiEt0Pair({ climate, lat, elevation, deltaT })
  RX_ET0_CACHE.set(key, pair)
  return pair
}

/** Tham số whatIf đưa vào rankRotations(): ΔT = 0 thì KHÔNG có et0, nên kết quả y hệt trước Phase 3. */
function rxWhatIf() {
  const w = { dryRainPct: S.rotWhatIf.dryRainPct }
  if (S.rotWhatIf.deltaT) {
    const pair = rxEt0Pair(S.rotDistrict, S.rotWhatIf.deltaT)
    if (pair) w.et0 = pair
  }
  return w
}

/** Câu nhắc dưới thanh nhiệt độ + câu khi đang bật. */
function rxTempNoteHtml() {
  const X = STRAT_TEXT[S.lang]
  const missing = S.rotWhatIf.deltaT && !rxEt0Pair(S.rotDistrict, S.rotWhatIf.deltaT)
  return `<p class="mt-2 text-sm leading-relaxed text-muted">${X.tempNote}</p>${missing ? `<p class="mt-2 text-sm font-semibold text-clay-700">${X.tempUnavailable}</p>` : ''}`
}

const rxActiveNote = () => (S.rotWhatIf.deltaT ? ` ${STRAT_TEXT[S.lang].tempActive(S.rotWhatIf.deltaT)}` : '')

/* ---------------- Hàng ba thẻ chiến lược ---------------- */
function rxStrategiesHtml(result) {
  const X = STRAT_TEXT[S.lang]
  const R = ROT_TEXT[S.lang]
  const picks = pickStrategies(result, S.rotCurrent)
  if (!picks) return ''
  // Câu "ít hơn lúa ba vụ…" của rotationParts luôn so với kiểu A (lúa ba vụ), nên mốc so sánh vẫn là kiểu A.
  const baseline = result.rotations.find((r) => r.baseline)
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const num = (v) => Number(v).toLocaleString(R.locale, { maximumFractionDigits: 0 })
  const prio = (keys) => X.priority(keys.map((k) => X.priorityItem(R.criteria[k], S.rotPriorities[k])).join(', '))
  const current = `<div class="flex flex-wrap items-center gap-2"><span class="text-sm font-bold text-muted">${X.currentLabel}</span>${result.rotations
    .map((r) => r.id)
    .sort()
    .map((id) => `<button type="button" data-rx="current" data-value="${id}" aria-pressed="${S.rotCurrent === id}" class="min-h-12 min-w-12 rounded-full border px-4 text-base font-extrabold ${S.rotCurrent === id ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-white hover:border-moss-700'}">${id}</button>`)
    .join('')}</div>`
  const fold = (title, lines, open = false) => `
    <details class="group border-t border-line py-3" ${open ? 'open' : ''}>
      <summary class="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold">${title}<span class="text-muted transition-transform duration-300 group-open:rotate-180">${icon('chevron-down', 'size-5')}</span></summary>
      ${rotLines(lines)}
    </details>`
  const cards = picks.map((p) => {
    const P = rotationParts(p.rot, baseline, S.lang)
    const line = (text) => ({ text, src: [] })
    const chosen = X.chosen[p.kind]({ dry: num(p.metric.dryYearMm), extra: num(p.metric.extraMm), points: p.metric.soilPoints })
    const why = [line(chosen)]
    if (p.alsoWins) why.push(line(X.alsoWins))
    if (p.runnerUp) why.push(line(X.runnerUp))
    if (p.kind === 'water') why.push(line(prio(['water', 'risk'])))
    if (p.kind === 'soil') why.push(line(prio(['soil'])))
    why.push(...P.why)
    const gaps = [...P.gaps, ...P.confidence]
    if (p.kind === 'soil' || p.alsoWins) gaps.push(line(X.pestGap))
    const label = p.alsoWins ? `${X.names[p.kind]} · ${X.names[p.alsoWins]}` : X.names[p.kind]
    return `<article class="flex min-w-0 flex-col rounded-[28px] border ${p.kind === 'base' ? 'border-line bg-ground' : 'border-moss-900 bg-white'} p-6 shadow-card">
        <p class="text-sm font-extrabold uppercase tracking-wide text-moss-700">${label}</p>
        <h4 class="mt-1 text-2xl font-extrabold tracking-tight">${p.rot.id}. ${p.rot.crops.map((c) => cap(R.crops[c])).join(' – ')}</h4>
        <p class="mt-1 text-sm font-bold text-muted">${R.total}: <span class="tabular text-ink">${p.rot.total}</span> / 100</p>
        <div class="mt-4">
          ${fold(X.parts.why, why, true)}
          ${fold(X.parts.evidence, P.evidence)}
          ${fold(X.parts.benefits, P.benefits)}
          ${fold(X.parts.gaps, gaps)}
          ${fold(X.parts.risks, P.risks)}
        </div>
      </article>`
  })
  return `<section class="mt-6" aria-labelledby="rx-title">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl"><h3 id="rx-title" class="text-2xl font-extrabold tracking-tight">${X.title}</h3><p class="mt-1 text-[15px] text-muted">${X.sub}</p></div>
        ${current}
      </div>
      <div class="mt-4 grid gap-5 lg:grid-cols-3">${cards.join('')}</div>
      <h3 class="mt-10 text-2xl font-extrabold tracking-tight">${X.detailsTitle}</h3>
    </section>`
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-rx]')
  if (!b) return
  if (b.dataset.rx === 'current') {
    S.rotCurrent = b.dataset.value
    renderRotationResults()
  }
})
