// Tính năng 2 của tổng quan Mekong: "Cây này phù hợp ở đâu" (bản đồ mức phù hợp toàn ĐBSCL theo cây & mùa vụ).
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { PROVINCES } from '../data/provinces.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { P3_TEXT } from '../i18n/phase3Text.js'
import { suitAssess, suitFindWindow, SUIT_PARAMS } from '../logic/suitability.js'
import { powerClimate } from '../sources/power.js'

const CSM = {
  crop: 'lua',
  period: 'dx', // 'dx' | 'ht' | 'td' | 'year'
  selectedId: null,
  layer: null,
  appliedMsg: null,
}
const csmT = () => MAP_TEXT[S.lang].suitMap
const CSM_FILL = { green: '#5b8c1a', yellow: '#c58a12', red: '#8f2f14', gray: '#9aa59e' }

function csmPeriodMonths(districtId, period) {
  const rule = PRECOMPUTED.rule.districts.find((d) => d.id === districtId)
  if (period === 'year') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  if (rule) {
    const w = suitFindWindow(rule, period)
    if (w?.months?.length) return w.months
  }
  const fallback = { dx: [12, 1, 2, 3], ht: [4, 5, 6, 7], td: [8, 9, 10, 11] }
  return fallback[period] ?? [1, 2, 3, 4]
}

function csmAssessAll() {
  return PROVINCES.map((p) => {
    const stored = PRECOMPUTED.power.find((d) => d.id === p.id)
    const climate = stored?.record ? powerClimate(stored.record) : null
    const rule = PRECOMPUTED.rule.districts.find((d) => d.id === p.id) ?? null
    const months = csmPeriodMonths(p.id, CSM.period)
    const window = rule && CSM.period !== 'year' ? suitFindWindow(rule, CSM.period) : { season: CSM.period, months, days: months.length * 30 }
    const result = suitAssess({
      cropId: CSM.crop,
      window: window ?? { season: CSM.period, months, days: months.length * 30 },
      climate,
      irrigation: 'adequate',
    })
    return { province: p, climate, window, result }
  })
}

function csmClearLayer() {
  if (CSM.layer && MF.map) MF.map.removeLayer(CSM.layer)
  CSM.layer = null
}

function csmDrawMap(items) {
  const Lf = window.L
  if (!MF.map || !Lf) return
  csmClearLayer()
  CSM.layer = Lf.layerGroup().addTo(MF.map)
  for (const item of items) {
    const grade = item.result.overall
    const color = CSM_FILL[grade] ?? CSM_FILL.gray
    const sel = CSM.selectedId === item.province.id
    const m = Lf.circleMarker([item.province.lat, item.province.lon], {
      radius: sel ? 15 : 12,
      color: sel ? '#0b2e1b' : '#ffffff',
      weight: sel ? 3.5 : 2.5,
      fillColor: color,
      fillOpacity: 0.92,
    })
    const label = grade === 'gray' ? mfT().overallGray : mfT().grades[grade]
    m.bindTooltip(`${esc(item.province.name)} · ${esc(label)}`)
    m.on('click', (e) => {
      Lf.DomEvent.stopPropagation(e)
      CSM.selectedId = item.province.id
      CSM.appliedMsg = null
      csmDrawMap(items)
      mwRenderBody()
    })
    m.addTo(CSM.layer)
  }
}

function csmExplainHtml(item) {
  const T = csmT()
  const F = mfT()
  const r = item.result
  const gradeLabel = r.overall === 'gray' ? F.overallGray : F.grades[r.overall]
  const reasons = r.criteria
    .filter((c) => r.overall === 'gray' ? c.grade === 'gray' : r.limiting.includes(c.key) || c.grade !== 'green')
    .slice(0, 3)
    .map((c) => {
      const fn = F.reasons[c.reason] ?? P3_TEXT[S.lang]?.reasons?.[c.reason]
      const text = fn
        ? fn({
            normal: mfNum(c.numbers?.deficitNormal ?? 0),
            dry: mfNum(c.numbers?.deficitDry ?? 0),
            limit: mfNum(SUIT_PARAMS.limitedIrrigationMm),
            window: mfNum(c.numbers?.window ?? 0),
            cycleMin: c.numbers?.cycleMin,
            cycleMax: c.numbers?.cycleMax,
            wet: mfNum(c.numbers?.wet ?? 0, 2),
            flag: mfNum(c.numbers?.flag ?? 0, 2),
            t: mfNum(c.numbers?.t ?? 0, 1),
            ph: mfNum(c.numbers?.ph ?? 0, 1),
            o1: c.numbers?.o1,
            o2: c.numbers?.o2,
            a1: c.numbers?.a1,
            a2: c.numbers?.a2,
          })
        : c.reason
      return `<li class="mt-1 text-xs"><span class="font-bold">${F.criteria[c.key]}:</span> ${esc(text)}</li>`
    })
    .join('')

  const risks = r.overall === 'gray'
    ? T.noDataRisk
    : r.limiting.length
      ? r.limiting.map((k) => F.criteria[k]).join(', ')
      : F.grades.green

  const practice = r.overall === 'gray'
    ? T.noDataPractice
    : CROP_LIBRARY[CSM.crop]?.note?.[S.lang] ?? T.refPractice

  return `<div class="mt-4 rounded-3xl border border-moss-900/20 bg-white p-4 shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-extrabold text-ink">${esc(item.province.name)}</p>
        ${mfGradeBadge(r.overall, gradeLabel)}
      </div>
      <div class="mt-3 space-y-2.5 text-xs">
        <div>
          <p class="font-extrabold text-ink">${T.whyColor}</p>
          ${reasons ? `<ul>${reasons}</ul>` : `<p class="mt-0.5 text-muted">${esc(F.summary.green)}</p>`}
        </div>
        <div>
          <p class="font-extrabold text-ink">${T.mainRisk}</p>
          <p class="mt-0.5 text-muted">${esc(risks)}</p>
        </div>
        <div>
          <p class="font-extrabold text-ink">${T.refPractice}</p>
          <p class="mt-0.5 text-muted">${esc(practice)}</p>
        </div>
        <div>
          <p class="font-extrabold text-ink">${T.sourceLimit}</p>
          <p class="mt-0.5 text-muted">${esc(T.limitNote(T.periods[CSM.period]))}</p>
        </div>
      </div>
      <button type="button" data-csm="apply" class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-moss-900 px-4 text-xs font-extrabold text-white hover:bg-moss-800">${icon('arrow-right', 'size-4')}${T.applyBtn}</button>
    </div>`
}

function csmRenderHtml() {
  const T = csmT()
  const items = csmAssessAll()
  csmDrawMap(items)
  const cropPills = CROP_LIB_IDS.map((id) =>
    mfPill(`data-csm="crop" data-value="${id}"`, esc(CROP_LIBRARY[id].name[S.lang]), CSM.crop === id, '!min-h-9 !px-3 !text-xs'),
  ).join('')
  const periodPills = ['dx', 'ht', 'td', 'year']
    .map((p) => mfPill(`data-csm="period" data-value="${p}"`, T.periods[p], CSM.period === p, '!min-h-9 !px-3 !text-xs'))
    .join('')
  const zoneButtons = items
    .map((it) => {
      const g = it.result.overall
      const on = CSM.selectedId === it.province.id
      return `<button type="button" data-csm="zone" data-value="${it.province.id}" class="flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-colors ${on ? 'border-moss-900 bg-moss-50 text-moss-950' : 'border-line bg-white hover:border-moss-700'}">
          <span>${esc(it.province.name)}</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-full" style="background:${CSM_FILL[g]}"></span>${g === 'gray' ? mfT().overallGray : mfT().grades[g]}</span>
        </button>`
    })
    .join('')
  const selected = items.find((it) => it.province.id === CSM.selectedId) ?? null

  return `<div class="rounded-3xl border border-line bg-white p-4 shadow-card">
      <p class="text-base font-extrabold text-ink">${T.title}</p>
      <p class="mt-1 text-xs text-muted">${esc(T.sub)}</p>
      <p class="mt-3 text-xs font-extrabold text-ink">${T.cropQ}</p>
      <div class="mt-1.5 flex flex-wrap gap-1.5">${cropPills}</div>
      <p class="mt-3 text-xs font-extrabold text-ink">${T.periodQ}</p>
      <div class="mt-1.5 flex flex-wrap gap-1.5">${periodPills}</div>
      <div class="mt-3 space-y-1.5">${zoneButtons}</div>
      ${selected ? '' : `<p class="mt-3 text-xs text-muted">${esc(T.clickHint)}</p>`}
      ${CSM.appliedMsg ? `<p class="mt-2 rounded-xl bg-lime-100 px-3 py-2 text-xs font-bold text-moss-900">${esc(CSM.appliedMsg)}</p>` : ''}
    </div>
    ${selected ? csmExplainHtml(selected) : ''}`
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-csm]')
  if (!b) return
  CSM.appliedMsg = null
  switch (b.dataset.csm) {
    case 'crop':
      CSM.crop = b.dataset.value
      return mwRenderBody()
    case 'period':
      CSM.period = b.dataset.value
      return mwRenderBody()
    case 'zone': {
      CSM.selectedId = b.dataset.value
      const p = PROVINCES.find((x) => x.id === CSM.selectedId)
      if (p && MF.map) MF.map.setView([p.lat, p.lon], 10)
      return mwRenderBody()
    }
    case 'apply': {
      if (['dx', 'ht', 'td'].includes(CSM.period)) MF.season = CSM.period
      MF.cropQuery = { text: CROP_LIBRARY[CSM.crop].name[S.lang], known: true }
      const p = PROVINCES.find((x) => x.id === CSM.selectedId)
      if (!MF.loc && p) mfSelect({ lat: p.lat, lon: p.lon, id: p.id, name: p.name })
      csmClearLayer()
      MW.tab = 'field'
      MW.sheet = 'half'
      if (typeof MFZ !== 'undefined') MFZ.crop = CSM.crop
      mwRenderBody()
      return
    }
  }
})
