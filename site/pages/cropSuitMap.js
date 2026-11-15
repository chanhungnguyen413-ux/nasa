// Tính năng 2 của tổng quan Mekong: "Cây này phù hợp ở đâu" (bản đồ mức phù hợp toàn ĐBSCL theo cây & mùa vụ).
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { PROVINCES } from '../data/provinces.js'
import { MEKONG_PROVINCES_GEO } from '../data/mekongBoundaries.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { P3_TEXT } from '../i18n/phase3Text.js'
import { suitAssess, suitWindow, SUIT_PARAMS } from '../logic/suitability.js'
import { seasonWindows } from '../logic/rotation.js'
import { districtInputs } from '../logic/rotationInputs.js'
import { powerClimate } from '../sources/power.js'

const CSM = {
  crop: 'rice',
  period: 'dx', // 'dx' | 'ht' | 'td' | 'year'
  selectedId: null,
  openMenu: null, // null | 'crop' | 'period'
  layer: null,
  appliedMsg: null,
}
const csmT = () => MAP_TEXT[S.lang].suitMap
const CSM_FILL = { green: '#5b8c1a', yellow: '#c58a12', red: '#8f2f14', gray: '#9aa59e' }

function csmSeasonWindow(districtId, period) {
  // Dùng cùng lịch NDVI với trang Luân canh; không tự gán lịch vụ cố định cho huyện thiếu lịch.
  const windows = seasonWindows(districtInputs(PRECOMPUTED, districtId).peakDays)
  const ndviWindow = windows?.find((w) => w.season === period)
  if (ndviWindow) return suitWindow({ ndviWindow, crop: CSM.crop })
  if (period !== 'year') return null
  // Chế độ cả năm chỉ tổng hợp khí hậu, không gọi đó là lịch một vụ đã kiểm chứng.
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  return { season: period, months, days: Math.round(months.length * 30.4), source: 'annual' }
}

function csmAssessAll() {
  return PROVINCES.map((p) => {
    const stored = PRECOMPUTED.power.find((d) => d.id === p.id)
    const climate = stored?.record ? powerClimate(stored.record) : null
    const window = csmSeasonWindow(p.id, CSM.period)
    const result = window ? suitAssess({
      crop: CSM.crop,
      window,
      climate,
      irrigation: null, // Bản đồ vùng chưa biết nguồn tưới của từng hộ, giữ trạng thái thiếu.
    }) : { crop: CSM.crop, known: true, overall: 'gray', limiting: [], criteria: [], window: null }
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
  // Tô cả 13 tỉnh ĐBSCL: MEKONG_PROVINCES_GEO dùng khóa prov.code (không có districtId).
  // Tỉnh nằm trong 5 huyện mẫu lấy đúng đánh giá của huyện; tỉnh khác chưa có số liệu tính sẵn nên để xám (thiếu thì nói thiếu).
  const byDistrict = new Map(items.map((it) => [it.province.id, it]))
  for (const prov of MEKONG_PROVINCES_GEO) {
    const item = byDistrict.get(prov.districtId ?? prov.code)
    const grade = item ? item.result.overall : 'gray'
    const color = CSM_FILL[grade] ?? CSM_FILL.gray
    const sel = Boolean(item) && CSM.selectedId === item.province.id
    const label = !item ? csmT().noSampleProv : grade === 'gray' ? mfT().overallGray : mfT().grades[grade]
    const poly = Lf.polygon(prov.rings, {
      pane: 'dbsclEnvPane',
      color: sel ? '#0b2e1b' : '#ffffff',
      weight: sel ? 2.5 : 1,
      fillColor: color,
      fillOpacity: !item ? 0.3 : sel ? 0.72 : 0.55,
    })
    poly.bindTooltip(`${esc(prov[S.lang] ?? prov.vi)}${item ? ` (${esc(item.province.name)})` : ''} · ${esc(label)}`, { sticky: true })
    poly.on('click', (e) => {
      Lf.DomEvent.stopPropagation(e)
      CSM.openMenu = null
      if (!item) return
      CSM.selectedId = item.province.id
      CSM.appliedMsg = null
      csmDrawMap(items)
      mwRenderBody()
    })
    poly.addTo(CSM.layer)
  }
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
      CSM.openMenu = null
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

  return `<div class="mt-4 rounded-3xl border border-moss-900/20 bg-white p-4 shadow-card" data-reveal="csm-explain-${esc(item.province.id)}">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-extrabold text-ink">${esc(item.province.name)}</p>
        ${mfGradeBadge(r.overall, gradeLabel)}
      </div>
      <div class="mt-3 space-y-2.5 text-xs">
        <div>
          <p class="font-extrabold text-ink">${T.whyColor}</p>
          ${reasons ? `<ul>${reasons}</ul>` : `<p class="mt-0.5 text-muted">${esc(r.overall === 'gray' ? F.overallGray : F.summary.green)}</p>`}
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
  const cropDropdown = `<div class="gm-select-wrap mt-1.5" data-csm-wrap="crop">
    <button type="button" class="gm-view-button !min-h-11" data-csm="toggleMenu" data-value="crop" aria-expanded="${CSM.openMenu === 'crop'}" aria-controls="csm-options-crop" data-active="true">
      ${icon('sprout', 'size-4')}
      <span><strong>${esc(CROP_LIBRARY[CSM.crop]?.name[S.lang] ?? CSM.crop)}</strong></span>
      ${icon('chevron-down', `size-4 transition-transform ${CSM.openMenu === 'crop' ? 'rotate-180' : ''}`)}
    </button>
    ${CSM.openMenu === 'crop' ? `<div class="gm-options !left-0 !right-0 !w-full !max-w-none" id="csm-options-crop" role="listbox" aria-label="${esc(T.cropQ)}">${CROP_LIB_IDS.map((id) => `<button type="button" role="option" aria-selected="${CSM.crop === id}" data-csm="crop" data-value="${id}"><span>${esc(CROP_LIBRARY[id].name[S.lang])}</span>${CSM.crop === id ? icon('check', 'size-4') : ''}</button>`).join('')}</div>` : ''}
  </div>`
  const periodDropdown = `<div class="gm-select-wrap mt-1.5" data-csm-wrap="period">
    <button type="button" class="gm-view-button !min-h-11" data-csm="toggleMenu" data-value="period" aria-expanded="${CSM.openMenu === 'period'}" aria-controls="csm-options-period" data-active="true">
      ${icon('calendar', 'size-4')}
      <span><strong>${esc(T.periods[CSM.period])}</strong></span>
      ${icon('chevron-down', `size-4 transition-transform ${CSM.openMenu === 'period' ? 'rotate-180' : ''}`)}
    </button>
    ${CSM.openMenu === 'period' ? `<div class="gm-options !left-0 !right-0 !w-full !max-w-none" id="csm-options-period" role="listbox" aria-label="${esc(T.periodQ)}">${['dx', 'ht', 'td', 'year'].map((p) => `<button type="button" role="option" aria-selected="${CSM.period === p}" data-csm="period" data-value="${p}"><span>${esc(T.periods[p])}</span>${CSM.period === p ? icon('check', 'size-4') : ''}</button>`).join('')}</div>` : ''}
  </div>`
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

  return `<div class="rounded-3xl border border-line bg-white p-4 shadow-card" data-reveal="csm-card">
      <p class="text-base font-extrabold text-ink">${T.title}</p>
      <p class="mt-1 text-xs text-muted">${esc(T.sub)}</p>
      <p class="mt-3 text-xs font-extrabold text-ink">${T.cropQ}</p>
      ${cropDropdown}
      <p class="mt-3 text-xs font-extrabold text-ink">${T.periodQ}</p>
      ${periodDropdown}
      <div class="mt-6 border-t border-line pt-5 space-y-2">${zoneButtons}</div>
      ${selected ? '' : `<p class="mt-3 text-xs text-muted">${esc(T.clickHint)}</p>`}
      ${CSM.appliedMsg ? `<p class="mt-2 rounded-xl bg-lime-100 px-3 py-2 text-xs font-bold text-moss-900">${esc(CSM.appliedMsg)}</p>` : ''}
    </div>
    ${selected ? csmExplainHtml(selected) : ''}`
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-csm]')
  if (!b) {
    if (CSM.openMenu && !e.target.closest('[data-csm-wrap]')) {
      CSM.openMenu = null
      mwRenderBody()
    }
    return
  }
  CSM.appliedMsg = null
  switch (b.dataset.csm) {
    case 'toggleMenu':
      CSM.openMenu = CSM.openMenu === b.dataset.value ? null : b.dataset.value
      return mwRenderBody()
    case 'crop':
      CSM.crop = b.dataset.value
      CSM.openMenu = null
      return mwRenderBody()
    case 'period':
      CSM.period = b.dataset.value
      CSM.openMenu = null
      return mwRenderBody()
    case 'zone': {
      CSM.selectedId = b.dataset.value
      CSM.openMenu = null
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
      CSM.openMenu = null
      MW.tab = 'field'
      MW.sheet = 'half'
      if (typeof MFZ !== 'undefined') MFZ.crop = CSM.crop
      mwRenderBody()
      return
    }
  }
})
