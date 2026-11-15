// Tính năng 2 của tổng quan Mekong: "Cây này phù hợp ở đâu" (bản đồ mức phù hợp toàn 13 tỉnh ĐBSCL theo cây & mùa vụ).
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { PROVINCES } from '../data/provinces.js'
import { MEKONG_PROVINCES_GEO } from '../data/mekongBoundaries.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { P3_TEXT } from '../i18n/phase3Text.js'
import { emSynthesizeGardenStack } from '../logic/envMapData.js'
import { suitAssess, suitWindow, SUIT_PARAMS } from '../logic/suitability.js'
import { seasonWindows } from '../logic/rotation.js'
import { districtInputs } from '../logic/rotationInputs.js'
import { powerClimate, powerFetchRecord, powerReadCache, powerWriteCache } from '../sources/power.js'

const CSM = {
  crop: 'rice',
  period: 'dx', // 'dx' | 'ht' | 'td' | 'year'
  irrigation: 'none', // 'none' (null) | 'no' | 'limited' | 'yes'
  selectedId: null, // province.code trong 13 tỉnh MEKONG_PROVINCES_GEO
  openMenu: null, // null | 'crop' | 'period' | 'irr'
  layer: null,
  appliedMsg: null,
  liveRecords: new Map(),
  fetchStatus: new Map(), // provCode -> 'loading' | 'error'
  fetchingAll: false,
}
const csmT = () => MAP_TEXT[S.lang].suitMap
const CSM_FILL = { green: '#5b8c1a', yellow: '#c58a12', red: '#8f2f14', gray: '#9aa59e' }
// Khung tháng tham khảo ĐBSCL cho 9 tỉnh chưa có lịch 3 vụ NDVI MODIS riêng (chỉ dùng để đọc khí hậu; suitCycle vẫn giữ Xám).
const CSM_REF_MONTHS = { dx: [12, 1, 2, 3], ht: [4, 5, 6, 7], td: [8, 9, 10, 11] }

function csmProvinceWindow(sampleId, period) {
  if (sampleId) {
    const windows = seasonWindows(districtInputs(PRECOMPUTED, sampleId).peakDays)
    const ndviWindow = windows?.find((w) => w.season === period)
    if (ndviWindow) return suitWindow({ ndviWindow, crop: CSM.crop })
  }
  if (period === 'year') {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    return { season: period, months, days: Math.round(months.length * 30.4), source: 'annual' }
  }
  const months = CSM_REF_MONTHS[period]
  if (!months) return null
  return { season: period, months, days: Math.round(months.length * 30.4), source: 'ref' }
}

function csmProvinceClimate(prov, sample) {
  if (sample) {
    const stored = PRECOMPUTED.power.find((d) => d.id === sample.id)
    if (stored?.record) return { climate: powerClimate(stored.record, { origin: 'precomputed' }), source: 'precomputed' }
  }
  // Snapshot tĩnh 13 tỉnh (scripts/fetch-power-monthly.mjs): có sẵn trong trang, không gọi mạng lúc chạy.
  const snap = (PRECOMPUTED.powerProvinces ?? []).find((p) => p.code === prov.code)
  if (snap?.record) return { climate: powerClimate(snap.record, { origin: 'precomputed' }), source: 'precomputed' }
  const cachedMem = CSM.liveRecords.get(prov.code)
  if (cachedMem) return { climate: powerClimate(cachedMem, { origin: 'network' }), source: 'live' }
  const cachedDisk = powerReadCache(prov.center[0], prov.center[1])
  if (cachedDisk) {
    CSM.liveRecords.set(prov.code, cachedDisk)
    return { climate: powerClimate(cachedDisk, { origin: 'cache' }), source: 'cache' }
  }
  return { climate: null, source: CSM.fetchStatus.get(prov.code) || 'missing' }
}

async function csmFetchMissingProvinces({ forceRetry = false } = {}) {
  // Đã có snapshot tĩnh cho cả 13 tỉnh → không tự tải nền nữa (yêu cầu: dữ liệu thuần tĩnh).
  if ((PRECOMPUTED.powerProvinces ?? []).length) return
  if (CSM.fetchingAll) return
  const pending = MEKONG_PROVINCES_GEO.filter((prov) => {
    if (PROVINCES.some((p) => p.id === prov.code)) return false
    if (CSM.liveRecords.has(prov.code) || powerReadCache(prov.center[0], prov.center[1])) return false
    const st = CSM.fetchStatus.get(prov.code)
    if (st === 'loading') return false
    if (st === 'error' && !forceRetry) return false
    return true
  })
  if (!pending.length) return
  CSM.fetchingAll = true
  let idx = 0
  const worker = async () => {
    while (idx < pending.length) {
      const prov = pending[idx++]
      CSM.fetchStatus.set(prov.code, 'loading')
      try {
        const rec = await powerFetchRecord(prov.center[0], prov.center[1])
        powerWriteCache(prov.center[0], prov.center[1], rec)
        CSM.liveRecords.set(prov.code, rec)
        CSM.fetchStatus.delete(prov.code)
      } catch {
        CSM.fetchStatus.set(prov.code, 'error')
      }
      if (S.page === 'myfield' && MW.tab === 'suit') mwRenderBody()
    }
  }
  try {
    await Promise.all([worker(), worker()])
  } finally {
    CSM.fetchingAll = false
    if (S.page === 'myfield' && MW.tab === 'suit') mwRenderBody()
  }
}

function csmAssessAll() {
  const irr = CSM.irrigation === 'none' ? null : CSM.irrigation
  return MEKONG_PROVINCES_GEO.map((prov) => {
    const sample = PROVINCES.find((x) => x.id === prov.code) ?? null
    const lat = sample ? sample.lat : prov.center[0]
    const lon = sample ? sample.lon : prov.center[1]
    const climInfo = csmProvinceClimate(prov, sample)
    const window = csmProvinceWindow(sample?.id ?? null, CSM.period)
    const result = climInfo.climate && window
      ? suitAssess({
          crop: CSM.crop,
          window,
          climate: climInfo.climate,
          irrigation: irr,
        })
      : { crop: CSM.crop, known: true, overall: 'gray', limiting: [], criteria: [], window, gradedCount: 0, totalCount: 6 }
    const envSyn = PRECOMPUTED?.envMap ? emSynthesizeGardenStack(PRECOMPUTED.envMap, lat, lon, {}, 0, S.lang) : null
    return {
      code: prov.code,
      prov,
      sample,
      lat,
      lon,
      displayName: prov[S.lang] ?? prov.vi,
      climate: climInfo.climate,
      climateStatus: climInfo.source,
      window,
      result,
      envSyn,
    }
  })
}

function csmClearLayer() {
  if (CSM.layer && MF.map) MF.map.removeLayer(CSM.layer)
  CSM.layer = null
}

function csmSelectProvince(code) {
  CSM.openMenu = null
  CSM.appliedMsg = null
  CSM.selectedId = code
  if (typeof mwRenderBody === 'function') mwRenderBody()
}

function csmDrawMap(items) {
  const Lf = window.L
  if (!MF.map || !Lf) return
  csmClearLayer()
  CSM.layer = Lf.layerGroup().addTo(MF.map)
  for (const item of items) {
    const grade = item.result.overall
    const color = CSM_FILL[grade] ?? CSM_FILL.gray
    const sel = CSM.selectedId === item.code
    const label = grade === 'gray' ? mfT().overallGray : mfT().grades[grade]
    const tipTitle = item.sample ? `${item.displayName} (${item.sample.name.split('·')[1]?.trim() ?? item.sample.name})` : item.displayName
    const poly = Lf.polygon(item.prov.rings, {
      pane: 'dbsclEnvPane',
      color: sel ? '#0b2e1b' : '#ffffff',
      weight: sel ? 2.5 : 1,
      fillColor: color,
      fillOpacity: sel ? 0.78 : grade === 'gray' ? 0.42 : 0.65,
    })
    poly.bindTooltip(`${esc(tipTitle)} · ${esc(label)}`, { sticky: true })
    poly.on('click', (e) => {
      Lf.DomEvent.stopPropagation(e)
      csmSelectProvince(item.code)
    })
    poly.addTo(CSM.layer)

    const m = Lf.circleMarker([item.lat, item.lon], {
      radius: sel ? 11 : 8,
      color: sel ? '#0b2e1b' : '#ffffff',
      weight: sel ? 3 : 2,
      fillColor: color,
      fillOpacity: 0.94,
    })
    m.bindTooltip(`${esc(tipTitle)} · ${esc(label)}`)
    m.on('click', (e) => {
      Lf.DomEvent.stopPropagation(e)
      csmSelectProvince(item.code)
    })
    m.addTo(CSM.layer)
  }
}

function csmCropGuidance(cropId) {
  const c = CROP_LIBRARY[cropId]
  if (!c) return ''
  const parts = S.lang === 'en'
    ? [
        `Season water need ${c.waterMm[0]}–${c.waterMm[1]} mm (${c.cycleDays[0]}–${c.cycleDays[1]} days)`,
        c.ph ? `optimal soil pH ${c.ph.optimal[0]}–${c.ph.optimal[1]}` : null,
        c.salinityEce != null ? `salinity tolerance <= ${c.salinityEce} dS/m (ECe)` : 'FAO-29 has no salinity threshold',
        c.upland ? 'upland crop: keep drainage furrows to prevent root waterlogging' : 'paddy crop: suits bunded flooded fields',
        c.legume ? 'legume helps nitrogen fixation' : null,
      ]
    : [
        `Nhu cầu nước ${c.waterMm[0]}–${c.waterMm[1]} mm/vụ (${c.cycleDays[0]}–${c.cycleDays[1]} ngày)`,
        c.ph ? `pH đất tối ưu ${c.ph.optimal[0]}–${c.ph.optimal[1]}` : null,
        c.salinityEce != null ? `chịu mặn tối đa ${c.salinityEce} dS/m (ECe)` : 'chưa có ngưỡng mặn FAO-29',
        c.upland ? 'cây trồng cạn: cần rãnh thoát úng tầng rễ' : 'lúa nước: hợp ruộng giữ nước chủ động',
        c.legume ? 'cây họ đậu hỗ trợ cố định đạm' : null,
      ]
  return parts.filter(Boolean).join('; ') + '.'
}

function csmExplainHtml(item) {
  const T = csmT()
  const F = mfT()
  const r = item.result
  const gradeLabel = r.overall === 'gray' ? F.overallGray : F.grades[r.overall]
  const reasons = r.criteria
    .filter((c) => r.overall === 'gray' ? c.grade === 'gray' : r.limiting.includes(c.key) || c.grade !== 'green')
    .slice(0, 4)
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

  const cropGuide = csmCropGuidance(CSM.crop)
  const practice = r.overall === 'gray'
    ? `${T.noDataPractice} ${cropGuide}`
    : cropGuide

  const calBadge = item.window?.source === 'ndvi' && item.sample
    ? `<p class="mt-1.5 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-950">${esc(T.calSampleBadge(item.sample.name))}</p>`
    : `<p class="mt-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-950">${esc(T.calRefBadge)}</p>`

  const climAlert = !item.climate
    ? `<p class="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-950">${esc(item.climateStatus === 'loading' ? T.climateLoading(1) : T.climateMissing)}</p>`
    : r.overall === 'gray' && CSM.irrigation === 'none'
      ? `<p class="mt-2 rounded-xl border border-line bg-ground px-2.5 py-2 text-[11px] text-ink">${esc(T.grayNeedIrrNote)}</p>`
      : ''

  const envDomains = item.envSyn?.domains?.slice(0, 2) ?? []
  const envHtml = envDomains.length
    ? `<div><p class="font-extrabold text-ink">${esc(T.envContextTitle)}</p>${envDomains.map((d) => `<p class="mt-0.5 text-muted"><span class="font-bold text-ink">${esc(d.title)}:</span> ${esc(d.summary)}</p>`).join('')}</div>`
    : ''

  return `<div class="mt-4 rounded-3xl border border-moss-900/20 bg-white p-4 shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-extrabold text-ink">${esc(item.displayName)}${item.sample ? ` · ${esc(item.sample.name.split('·')[1]?.trim() ?? '')}` : ''}</p>
        ${mfGradeBadge(r.overall, gradeLabel)}
      </div>
      ${calBadge}
      ${climAlert}
      <div class="mt-3 space-y-2.5 text-xs">
        <div>
          <p class="font-extrabold text-ink">${T.whyColor}</p>
          ${reasons ? `<ul>${reasons}</ul>` : `<p class="mt-0.5 text-muted">${esc(r.overall === 'gray' ? F.overallGray : typeof F.summary?.green === 'function' ? F.summary.green(r.gradedCount, r.totalCount) : F.summary?.green || '')}</p>`}
        </div>
        <div>
          <p class="font-extrabold text-ink">${T.mainRisk}</p>
          <p class="mt-0.5 text-muted">${esc(risks)}</p>
        </div>
        <div>
          <p class="font-extrabold text-ink">${T.refPractice}</p>
          <p class="mt-0.5 text-muted">${esc(practice)}</p>
        </div>
        ${envHtml}
        <div>
          <p class="font-extrabold text-ink">${T.sourceLimit}</p>
          <p class="mt-0.5 text-muted">${esc(T.limitNote(T.periods[CSM.period]))}${!item.sample ? ` ${esc(T.unsampledClick(item.displayName))}` : ''}</p>
        </div>
      </div>
      <button type="button" data-csm="apply" class="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-moss-900 px-4 text-xs font-extrabold text-white hover:bg-moss-800">${icon('arrow-right', 'size-4')}${T.applyBtn}</button>
    </div>`
}

function csmRenderHtml() {
  const T = csmT()
  csmFetchMissingProvinces()
  const items = csmAssessAll()
  csmDrawMap(items)
  const ratedClimate = items.filter((it) => Boolean(it.climate)).length
  const loadingCount = items.filter((it) => it.climateStatus === 'loading').length
  const failedCount = items.filter((it) => it.climateStatus === 'error').length
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
  const irrPills = `<div class="mt-1.5 grid grid-cols-2 gap-1.5" role="group" aria-label="${esc(T.irrQ)}">${['none', 'no', 'limited', 'yes'].map((k) => {
    const on = CSM.irrigation === k
    return `<button type="button" data-csm="irr" data-value="${k}" aria-pressed="${on}" class="min-h-9 rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-bold leading-snug transition-colors ${on ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-ground/60 text-ink hover:border-moss-700'}">${esc(T.irrOpts[k])}</button>`
  }).join('')}</div>`

  const zoneButtons = items
    .map((it) => {
      const g = it.result.overall
      const on = CSM.selectedId === it.code
      const title = it.sample ? `${it.displayName} · ${it.sample.name.split('·')[1]?.trim() ?? ''}` : it.displayName
      return `<button type="button" data-csm="zone" data-value="${it.code}" class="flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-colors ${on ? 'border-moss-900 bg-moss-50 text-moss-950' : 'border-line bg-white hover:border-moss-700'}">
          <span class="min-w-0 truncate">${esc(title)}</span>
          <span class="inline-flex shrink-0 items-center gap-1.5"><span class="size-3 rounded-full" style="background:${CSM_FILL[g]}"></span>${g === 'gray' ? mfT().overallGray : mfT().grades[g]}</span>
        </button>`
    })
    .join('')
  const selected = items.find((it) => it.code === CSM.selectedId) ?? null
  const statusBanner = loadingCount > 0
    ? `<p class="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950">${esc(T.climateLoading(loadingCount))}</p>`
    : failedCount > 0
      ? `<button type="button" data-csm="retryClimate" class="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-extrabold text-amber-950 hover:bg-amber-100">${icon('refresh-cw', 'size-3.5')}${esc(T.climateRetry)}</button>`
      : ''

  return `<div class="rounded-3xl border border-line bg-white p-4 shadow-card">
      <p class="text-base font-extrabold text-ink">${T.title}</p>
      <p class="mt-1 text-xs text-muted">${esc(T.sub)}</p>
      <p class="mt-3 text-xs font-extrabold text-ink">${T.cropQ}</p>
      ${cropDropdown}
      <p class="mt-3 text-xs font-extrabold text-ink">${T.periodQ}</p>
      ${periodDropdown}
      <p class="mt-3 text-xs font-extrabold text-ink">${T.irrQ}</p>
      ${irrPills}
      <p class="mt-3 text-[11px] font-bold text-moss-900">${esc(T.provincesCount(items.length, ratedClimate))}</p>
      ${statusBanner}
      <div class="mt-3 border-t border-line pt-4 space-y-2">${zoneButtons}</div>
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
    case 'irr':
      CSM.irrigation = b.dataset.value
      CSM.openMenu = null
      return mwRenderBody()
    case 'retryClimate':
      csmFetchMissingProvinces({ forceRetry: true })
      return mwRenderBody()
    case 'zone': {
      CSM.selectedId = b.dataset.value
      CSM.openMenu = null
      const prov = MEKONG_PROVINCES_GEO.find((x) => x.code === CSM.selectedId)
      const sample = PROVINCES.find((x) => x.id === CSM.selectedId)
      const pt = sample ? [sample.lat, sample.lon] : prov?.center
      if (pt && MF.map) MF.map.setView(pt, 9)
      return mwRenderBody()
    }
    case 'apply': {
      if (['dx', 'ht', 'td'].includes(CSM.period)) MF.season = CSM.period
      MF.cropQuery = { text: CROP_LIBRARY[CSM.crop].name[S.lang], known: true }
      if (typeof MFZ !== 'undefined') MFZ.crop = CSM.crop
      const g = typeof mgActiveGarden === 'function' ? mgActiveGarden() : null
      if (g) {
        g.profile = {
          ...(g.profile || {}),
          cropId: CSM.crop,
          ...(['dx', 'ht', 'td'].includes(CSM.period) ? { season: CSM.period } : {}),
        }
        g.updatedAt = new Date().toISOString()
        if (typeof MG !== 'undefined' && MG.assessments) MG.assessments.delete(g.id)
        if (typeof dsSave === 'function') dsSave()
        if (typeof mgSelectGarden === 'function') mgSelectGarden(g.id, { fit: false })
      } else {
        const prov = MEKONG_PROVINCES_GEO.find((x) => x.code === CSM.selectedId)
        const sample = PROVINCES.find((x) => x.id === CSM.selectedId)
        const locArg = sample
          ? { lat: sample.lat, lon: sample.lon, id: sample.id, name: sample.name }
          : prov
            ? { lat: prov.center[0], lon: prov.center[1], name: prov[S.lang] ?? prov.vi }
            : null
        if (locArg && (!MF.loc || Math.abs(MF.loc.lat - locArg.lat) > 1e-4 || Math.abs(MF.loc.lon - locArg.lon) > 1e-4)) {
          mfSelect(locArg)
        }
      }
      if (typeof MW !== 'undefined') Object.assign(MW, { evalResult: null, evalInputKey: null, stale: false })
      csmClearLayer()
      CSM.openMenu = null
      MW.tab = 'field'
      MW.sheet = 'half'
      mfRenderDynamic()
      return
    }
  }
})
