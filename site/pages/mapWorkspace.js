// Không gian làm việc bản đồ toàn màn hình kiểu WaterWise (Bước A, C, D, E, F của kế hoạch):
//   - Desktop: topbar 72 px · panel trái 380 px (3 bước) · bản đồ chiếm phần còn lại · khay so sánh rộng bên dưới khi xem Bước 3
//   - Mobile (360–430 px): bản đồ toàn màn hình · bottom sheet 3 nấc (peek / half / full)
//   - Máy trạng thái chọn ruộng: chạm bản đồ khi 'idle' KHÔNG làm mất ranh thửa cũ; chỉ chọn mới khi bật "Chọn chỗ khác"
//   - Điều khiển 48 px nổi trên bản đồ: tìm/nhập tọa độ, phóng to/thu nhỏ, vị trí của tôi (+ xác nhận), nền vệ tinh/đường, lớp dữ liệu + chú giải
import { evidence } from '../core/evidence.js'
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { PROVINCES } from '../data/provinces.js'
import { MEKONG_PROVINCES_GEO, MEKONG_ENV_ZONES, MEKONG_ENV_LAYER_MAP, MEKONG_ENV_LAYER_KEYS, mekongFindProvince } from '../data/mekongBoundaries.js'
import { REDESIGN_TEXT } from '../i18n/redesignText.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { ROT_TEXT } from '../i18n/rotationText.js'
import { STRAT_TEXT } from '../i18n/strategyText.js'
import { FIELD_CHANGE_ANSWERS, fsAssessField, fsInputKey } from '../logic/fieldStrategies.js'
import { GEO_PARAMS, geoParseLatLon } from '../logic/geometry.js'
import { wiEt0Pair } from '../logic/whatIf.js'
import { GIBS_LAYERS, catalogSource } from '../sources/catalog.js'
import { powerElevationEvidence } from '../sources/power.js'

const MW = {
  tab: 'field', // 'field' | 'cond' | 'compare'
  sheet: 'half', // mobile: 'peek' | 'half' | 'full'
  basemap: 'sat', // 'sat' | 'street'
  opacity: 0.72,
  layersOpen: false,
  legendOpen: true,
  fullscreen: false,
  picking: false,
  confirmGeo: false,
  tilesOffline: false,
  searchErr: null,
  cropChange: 'yes', // 'yes' | 'partial' | 'no'
  currentId: 'A',
  evalResult: null,
  evalInputKey: null,
  evalSeq: 0,
  stale: false,
  openStratWhy: new Set(),
}
const mwT = () => MAP_TEXT[S.lang]
const mwDesktop = () => matchMedia('(min-width: 1024px)').matches

addEventListener('resize', () => {
  if (S.page !== 'myfield') return
  mwSyncSheetStyle()
  MF.map?.invalidateSize()
})

function mwCurrentInputKey(data = null) {
  const poly = mfdPolygon()
  const u = data?.user
  return fsInputKey({
    loc: MF.loc,
    polygon: poly,
    season: MF.season,
    sowing: MF.sowing,
    irrigation: MF.irrigation,
    cropChange: MW.cropChange,
    currentId: MW.currentId,
    priorities: S.rotPriorities,
    whatIf: MFW,
    soilCount: DS.soil.length,
    markCount: u ? u.marks.list.length : DS.marks.length,
  })
}

function mwOnInputsChanged() {
  if (!MW.evalResult) return
  MW.stale = mwCurrentInputKey() !== MW.evalInputKey
  mwRenderBody()
}

function mwRunEvaluate(data) {
  if (!MF.loc) return
  const user = data?.user ?? mfdCollect(data?.climate ?? null)
  const extra = mfdSuitInputs(user)
  let et0Pair = null
  if (data?.climate && MFW.deltaT) {
    const lat = evidence({ value: MF.loc.lat, unit: '°', kind: 'farmer', source: 'location' })
    const elev = powerElevationEvidence(MF.elevation)
    et0Pair = wiEt0Pair({ climate: data.climate, lat, elevation: elev, deltaT: MFW.deltaT })
  }
  const evaluationId = `EV-${++MW.evalSeq}`
  MW.evalResult = fsAssessField({
    loc: MF.loc,
    provinces: PROVINCES,
    precomputed: PRECOMPUTED,
    climate: data?.climate ?? null,
    irrigation: MF.irrigation,
    ...extra,
    cropChange: MW.cropChange,
    currentId: MW.currentId,
    priorities: S.rotPriorities,
    whatIf: { rainPct: MFW.rainPct },
    et0Pair,
    evaluationId,
  })
  MW.evalInputKey = mwCurrentInputKey(data)
  MW.stale = false
  FP.strategyId = null
  FP.evalId = null
}

function mwRenderShell() {
  const T = mwT()
  const R = mfT()

  const tabBtn = (id, label) =>
    `<button type="button" data-mw-tab="${id}" class="min-h-11 flex-1 rounded-full px-3 text-xs font-extrabold transition-colors sm:text-sm">${label}</button>`

  $('#myfield').innerHTML = `
    <div id="mw-root" class="relative h-[calc(100dvh-4.5rem)] w-full overflow-hidden bg-ground lg:grid lg:grid-cols-[380px_1fr] lg:grid-rows-[1fr_auto]">
      <!-- Cột bản đồ (Desktop bên phải; Mobile chiếm toàn nền phía sau bottom sheet) -->
      <div class="relative h-full w-full lg:col-start-2 lg:row-start-1">
        <div id="mf-map" role="application" aria-label="${R.mapLabel}" class="h-full w-full bg-moss-50"></div>

        <!-- Thanh tìm kiếm (chỉ hiện danh sách tỉnh/huyện khi gõ tìm kiếm) -->
        <div class="pointer-events-none absolute inset-x-3 top-3 z-[400] flex flex-col gap-2 pr-14 sm:max-w-xl">
          <form id="mw-search-form" class="pointer-events-auto flex items-center gap-1.5 rounded-full border border-line bg-white/95 p-1.5 shadow-lift backdrop-blur">
            <label for="mw-search-input" class="sr-only">${T.search.placeholder}</label>
            <input id="mw-search-input" name="q" type="text" autocomplete="off" placeholder="${T.search.placeholder}" class="min-h-10 min-w-0 flex-1 bg-transparent pl-3 text-sm font-semibold text-ink outline-none" />
            <button type="submit" class="min-h-10 shrink-0 rounded-full bg-moss-900 px-4 text-sm font-bold text-white hover:bg-moss-800">${T.search.btn}</button>
          </form>
          <div id="mw-search-suggestions" hidden class="pointer-events-auto max-h-52 overflow-y-auto rounded-2xl border border-line bg-white/95 p-1.5 shadow-lift backdrop-blur"></div>
          <div id="mw-top-notices" class="pointer-events-auto space-y-1.5"></div>
          <div id="mf-map-note" class="pointer-events-auto text-xs" aria-live="polite"></div>
        </div>

        <!-- Đọc nhanh chỉ số môi trường khi rà chuột -->
        <div id="mf-env-hover" hidden class="pointer-events-none absolute right-16 top-3 z-[405] max-w-[260px] rounded-2xl border border-line bg-white/95 px-3 py-2 text-xs shadow-lift backdrop-blur"></div>

        <!-- Cụm nút điều khiển nổi góc phải (≥ 48×48 px) -->
        <div class="absolute right-3 top-3 z-[400] flex flex-col gap-2">
          <button type="button" data-mw="zoomIn" aria-label="${T.controls.zoomIn}" title="${T.controls.zoomIn}" class="grid size-12 place-items-center rounded-2xl border border-line bg-white/95 text-ink shadow-card hover:bg-moss-50">${icon('plus', 'size-5')}</button>
          <button type="button" data-mw="zoomOut" aria-label="${T.controls.zoomOut}" title="${T.controls.zoomOut}" class="grid size-12 place-items-center rounded-2xl border border-line bg-white/95 text-ink shadow-card hover:bg-moss-50">${icon('minus', 'size-5')}</button>
          <button type="button" data-mf="mylocation" aria-label="${T.controls.myLoc}" title="${T.controls.myLoc}" class="grid size-12 place-items-center rounded-2xl border border-line bg-white/95 text-ink shadow-card hover:bg-moss-50">${icon('locate-fixed', 'size-5')}</button>
          <button type="button" id="mw-basemap-btn" data-mw="basemap" aria-label="${T.controls.basemapSat}" title="${T.controls.basemapSat}" class="grid size-12 place-items-center rounded-2xl border border-line bg-white/95 text-ink shadow-card hover:bg-moss-50">${icon('globe', 'size-5')}</button>
          <button type="button" data-mw="layersToggle" aria-label="${T.controls.layers}" title="${T.controls.layers}" class="grid size-12 place-items-center rounded-2xl border border-line bg-white/95 text-ink shadow-card hover:bg-moss-50">${icon('layers', 'size-5')}</button>
          <button type="button" data-mw="fullscreen" aria-label="${T.controls.fullscreen}" title="${T.controls.fullscreen}" class="hidden size-12 place-items-center rounded-2xl border border-line bg-white/95 text-ink shadow-card hover:bg-moss-50 sm:grid">${icon('maximize-2', 'size-5')}</button>
        </div>

        <!-- Hộp chọn lớp dữ liệu (gọn góc dưới phải theo khung đánh dấu) -->
        <div id="mw-layer-menu" hidden class="absolute bottom-14 right-3 z-[410] max-h-[265px] w-64 overflow-y-auto rounded-2xl border border-line bg-white/95 p-2.5 shadow-lift backdrop-blur"></div>

        <!-- Chú giải nổi góc dưới trái trên bản đồ -->
        <div id="mw-legend" class="absolute bottom-28 left-3 z-[400] max-h-[52vh] max-w-[min(360px,calc(100%-1.5rem))] overflow-y-auto lg:bottom-4"></div>
      </div>

      <!-- Panel trái trên Desktop / Bottom sheet 3 nấc trên Mobile -->
      <aside id="mw-panel" aria-label="${R.title}" class="fixed inset-x-0 bottom-0 z-[420] flex flex-col rounded-t-[28px] border-t border-line bg-ground shadow-lift transition-[height] duration-200 lg:static lg:col-start-1 lg:row-start-1 lg:h-full lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none">
        <div class="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-4 pt-2 pb-2 lg:hidden">
          <button type="button" data-mw="cycleSheet" aria-label="${T.sheet.drag}" class="flex min-h-9 flex-1 items-center justify-center gap-2 text-xs font-extrabold text-muted">
            <span class="h-1.5 w-10 rounded-full bg-line"></span>
            <span id="mw-sheet-label">${T.sheet[MW.sheet]}</span>
          </button>
          <div class="flex gap-1">
            ${['peek', 'half', 'full'].map((k) => `<button type="button" data-mw-sheet="${k}" class="min-h-8 rounded-full px-2.5 text-[11px] font-bold">${T.sheet[k]}</button>`).join('')}
          </div>
        </div>
        <div class="mk-workspace-title">
          <p class="mk-eyebrow">${REDESIGN_TEXT[S.lang].workspaceEyebrow}</p>
          <h1>${icon('sprout', 'size-5')}${REDESIGN_TEXT[S.lang].workspaceTitle}</h1>
          <p>${REDESIGN_TEXT[S.lang].workspaceSub}</p>
        </div>
        <div class="shrink-0 border-b border-line bg-white p-2.5">
          <div class="flex gap-1 rounded-full bg-ground p-1" role="tablist">
            ${tabBtn('field', T.tabs.field)}${tabBtn('suit', T.tabs.suit)}${tabBtn('cond', T.tabs.cond)}${tabBtn('compare', T.tabs.compare)}
          </div>
        </div>
        <div id="mw-panel-body" class="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"></div>
      </aside>

      <!-- Khay so sánh rộng cho Desktop (3 thẻ nằm ngang không bị bóp vào panel 380 px) -->
      <section id="mw-compare-dock" hidden class="hidden max-h-[46vh] overflow-y-auto border-t border-line bg-ground p-5 lg:col-span-2 lg:row-start-2"></section>
    </div>`

  mwSyncSheetStyle()
  mwRenderTopNotices()
  mwRenderLayerMenu()
  mwRenderLegend()
  mfRenderDistrictButtons()
}

function mwSyncSheetStyle() {
  const p = $('#mw-panel')
  if (!p) return
  if (mwDesktop()) {
    p.style.height = ''
  } else {
    p.style.height = MW.sheet === 'peek' ? '116px' : MW.sheet === 'half' ? '50dvh' : '84dvh'
  }
  document.querySelectorAll('[data-mw-sheet]').forEach((b) => {
    const on = b.dataset.mwSheet === MW.sheet
    b.className = `min-h-8 rounded-full px-2.5 text-[11px] font-bold ${on ? 'bg-moss-900 text-white' : 'bg-ground text-muted'}`
  })
  const lbl = $('#mw-sheet-label')
  if (lbl) lbl.textContent = mwT().sheet[MW.sheet]
  document.querySelectorAll('[data-mw-tab]').forEach((b) => {
    const on = b.dataset.mwTab === MW.tab
    b.setAttribute('aria-selected', String(on))
    b.className = `min-h-11 flex-1 rounded-full px-3 text-xs font-extrabold transition-colors sm:text-sm ${on ? 'bg-moss-900 text-white shadow-card' : 'text-muted hover:text-ink'}`
  })
}

function mwRenderTopNotices() {
  const el = $('#mw-top-notices')
  if (!el) return
  const T = mwT()
  const R = mfT()
  const msgs = []
  if (MF.geo === 'locating') {
    msgs.push(`<div class="rounded-2xl border border-line bg-white/95 px-3.5 py-2 text-sm font-semibold shadow-card">${esc(R.locating)}</div>`)
  } else if (MF.geo) {
    msgs.push(`<div class="rounded-2xl border border-clay-700/30 bg-clay-100 px-3.5 py-2 text-sm font-semibold text-clay-700 shadow-card">${esc(R.geoError(MF.geo))}</div>`)
  }
  if (MW.picking) {
    msgs.push(`<div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-moss-900 bg-lime-100 px-3.5 py-2 text-sm font-bold text-moss-950 shadow-card"><span>${esc(T.search.pickingHint)}</span><button type="button" data-mw="cancelPick" class="min-h-9 rounded-full bg-moss-900 px-3 text-xs font-bold text-white">${T.search.pickingCancel}</button></div>`)
  }
  if (MW.confirmGeo && MF.loc) {
    msgs.push(`<div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sun-400 bg-sun-100 px-3.5 py-2 text-sm font-bold text-sun-700 shadow-card"><span>${esc(T.search.confirmLoc)}</span><div class="flex gap-1.5"><button type="button" data-mw="confirmYes" class="min-h-9 rounded-full bg-moss-900 px-3 text-xs font-bold text-white">${T.search.confirmYes}</button><button type="button" data-mw="pickNew" class="min-h-9 rounded-full border border-sun-700 bg-white px-3 text-xs font-bold text-sun-700">${T.search.confirmRelocate}</button></div></div>`)
  }
  if (MW.searchErr) {
    msgs.push(`<div class="rounded-2xl border border-clay-700/30 bg-clay-100 px-3.5 py-2 text-sm font-bold text-clay-700 shadow-card">${esc(MW.searchErr)}</div>`)
  }
  el.innerHTML = msgs.join('')
}

function mwRenderLayerMenu() {
  const el = $('#mw-layer-menu')
  if (!el) return
  el.hidden = !MW.layersOpen
  if (!MW.layersOpen) return
  const R = mfT()
  const T = mwT()
  const btn = (val, label, active) =>
    `<button type="button" data-mf="layer" data-value="${val}" aria-pressed="${active}" class="flex w-full items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-bold leading-tight ${active ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-white text-ink hover:border-moss-700'}"><span class="truncate">${esc(label)}</span>${active ? icon('check', 'size-3.5 shrink-0') : ''}</button>`
  el.innerHTML = `
    <div class="flex items-center justify-between gap-1"><p class="text-xs font-extrabold">${R.layersTitle}</p><button type="button" data-mw="layersToggle" aria-label="${t().closeTerm}" class="rounded-full p-0.5 hover:bg-moss-50">${icon('x', 'size-3.5')}</button></div>
    <div class="mt-1.5 grid gap-1">
      ${btn('none', R.layers.none, MF.layer === null)}
      ${MEKONG_ENV_LAYER_KEYS.map((key) => btn(key, R.layers[key] ?? key, MF.layer === key)).join('')}
    </div>
    <div class="mt-2 border-t border-line pt-2">
      <div class="flex justify-between text-[11px] font-bold text-muted"><span>${T.legend.opacity}</span><span>${Math.round(MW.opacity * 100)}%</span></div>
      <input type="range" data-mw-opacity min="20" max="100" step="5" value="${Math.round(MW.opacity * 100)}" class="range mt-1 w-full" style="--fill:${((MW.opacity * 100 - 20) / 80) * 100}%" />
    </div>`
}

function mwEnvChartHtml() {
  const envKey = MF.layer ? MEKONG_ENV_LAYER_MAP[MF.layer] : null
  if (!envKey) return ''
  const T = mwT()
  const R = mfT()
  const groups = new Map()
  for (const prov of MEKONG_PROVINCES_GEO) {
    const z = MEKONG_ENV_ZONES[prov.zoneId]
    const info = z?.layers?.[envKey]
    if (!info) continue
    const k = `${info.color_hex}|${info.color_label}`
    if (!groups.has(k)) groups.set(k, { hex: info.color_hex, label: info.color_label, value: info.value, provinces: [] })
    groups.get(k).provinces.push(prov[S.lang] ?? prov.vi)
  }
  const items = [...groups.values()]
  const totalProvs = items.reduce((s, it) => s + it.provinces.length, 0) || 1
  const colorBar = `<div class="mt-2 flex h-3 w-full overflow-hidden rounded-full border border-line shadow-inner">${items.map((it) => `<span style="width:${((it.provinces.length / totalProvs) * 100).toFixed(1)}%;background:${esc(it.hex)}" title="${esc(it.label)}"></span>`).join('')}</div>`
  const rows = items
    .map(
      (it) => `<div class="flex items-start gap-2 text-[11px] leading-snug">
        <span class="mt-0.5 size-3 shrink-0 rounded-sm border border-black/15" style="background:${esc(it.hex)}"></span>
        <div><span class="font-extrabold text-ink">${esc(it.label)}</span> <span class="text-muted">(${esc(it.provinces.join(', '))})</span></div>
      </div>`,
    )
    .join('')
  const activeProv = MF.loc ? mekongFindProvince(MF.loc.lat, MF.loc.lon) : null
  const activeZone = activeProv ? MEKONG_ENV_ZONES[activeProv.zoneId] : null
  const activeInfo = activeZone?.layers?.[envKey] ?? null
  const activeBox = activeInfo
    ? `<div class="mt-2 rounded-xl border border-moss-900/20 bg-moss-50/70 p-2.5 text-[11px] leading-snug">
        <p class="font-extrabold text-moss-950">${esc(activeProv[S.lang] ?? activeProv.vi)} · <span style="color:${esc(activeInfo.color_hex)}">● ${esc(activeInfo.color_label)}</span></p>
        <p class="mt-0.5 font-semibold text-ink">${esc(activeInfo.value)}</p>
        <p class="mt-0.5 text-muted">${esc(S.lang === 'en' ? activeInfo.legend_en : activeInfo.legend_vi)}</p>
        <p class="mt-1 font-semibold text-moss-900">${esc(T.legend.dbsclRecCrop)} <span class="font-normal text-ink">${esc(activeInfo.recommended_crops)}</span></p>
      </div>`
    : ''
  return `
    <div class="rounded-3xl border border-line bg-white p-4 shadow-card text-xs">
      <p class="font-extrabold text-moss-950">${esc(T.legend.dbsclEnvTitle)}</p>
      <p class="text-[11px] font-bold text-ink">${esc(R.layers[MF.layer] ?? MF.layer)}</p>
      ${colorBar}
      <div class="mt-2 space-y-1.5">${rows}</div>
      ${activeBox}
      <p class="mt-1.5 text-[10px] font-semibold text-moss-800">${esc(T.legend.dbsclOnlyNote)}</p>
    </div>`
}

function mwRenderLegend() {
  const el = $('#mw-legend')
  if (!el) return
  const T = mwT()
  const R = mfT()
  const zoneCrop = MW.tab !== 'field' && MFZ.crop ? CROP_LIBRARY[MFZ.crop]?.name[S.lang] : null
  if (!MW.tilesOffline && !zoneCrop) {
    el.hidden = true
    el.innerHTML = ''
    return
  }
  el.hidden = false
  el.innerHTML = `
    <div class="rounded-2xl border border-line bg-white/95 p-3 text-xs shadow-lift backdrop-blur">
      ${MW.tilesOffline ? `<p class="mb-2 flex items-center gap-1.5 font-bold text-sun-700">${icon('wifi-off', 'size-4')}${esc(T.legend.offlineTiles)}</p>` : ''}
      ${zoneCrop ? `
        <p class="font-extrabold text-moss-900">${esc(T.legend.zoneTitle)} · ${esc(T.legend.cropPrefix)} ${esc(zoneCrop)}</p>
        <div class="mt-1.5 flex flex-wrap gap-2 text-[11px] font-bold">
          <span class="inline-flex items-center gap-1"><span class="size-3 rounded-sm bg-[#5b8c1a]"></span>${R.grades.green}</span>
          <span class="inline-flex items-center gap-1"><span class="size-3 rounded-sm bg-[#c58a12]"></span>${R.grades.yellow}</span>
          <span class="inline-flex items-center gap-1"><span class="size-3 rounded-sm bg-[#8f2f14]"></span>${R.grades.red}</span>
          <span class="inline-flex items-center gap-1"><span class="size-3 rounded-sm mfz-hatch-swatch"></span>${R.grades.gray}</span>
        </div>
        <p class="mt-1 text-[11px] text-muted">${esc(T.legend.grayPattern)}</p>` : ''}
    </div>`
}

function mwRenderBody() {
  const body = $('#mw-panel-body')
  const dock = $('#mw-compare-dock')
  if (!body) return
  mwSyncSheetStyle()
  mwRenderTopNotices()
  const T = mwT()
  const R = mfT()

  if (MW.tab === 'field') {
    if (dock) { dock.hidden = true; dock.classList.add('hidden') }
    if (typeof csmClearLayer === 'function') csmClearLayer()
    mfzClearLayer()
    body.innerHTML = mgWorkspaceHtml()
    mdUpdateLiveArea()
    return
  }
  MG.layer?.clearLayers()

  if (MW.tab === 'suit') {
    if (dock) {
      dock.hidden = true
      dock.classList.add('hidden')
    }
    body.innerHTML = typeof csmRenderHtml === 'function' ? csmRenderHtml() : ''
    return
  }
  if (typeof csmClearLayer === 'function') csmClearLayer()

  if (!MF.loc) {
    if (dock) dock.hidden = true
    body.innerHTML = `
      ${typeof mgGardensBarHtml === 'function' ? mgGardensBarHtml() : ''}
      <div class="mt-4 rounded-3xl border border-dashed border-line bg-white p-5 text-base leading-relaxed text-muted">${esc(T.emptyPrompt)}</div>
      <div id="mf-tools" class="mt-4">${mdToolsHtml()}</div>`
    return
  }

  const data = mfCompute()
  if (MW.tab === 'cond') {
    if (dock) {
      dock.hidden = true
      dock.classList.add('hidden')
    }
    body.innerHTML = mwRenderDetailsHtml()
    return
  }

  // Bước 3: So sánh 3 chiến lược
  if (!MW.evalResult) mwRunEvaluate(data)
  const compareHtml = mwCompareHtml(data)
  if (wide() && dock) {
    dock.innerHTML = compareHtml
    dock.hidden = false
    dock.classList.remove('hidden')
    body.innerHTML = `
      <div id="mf-selected">${mfSelectedHtml()}</div>
      <div class="mt-4 rounded-3xl border border-line bg-white p-4 shadow-card">
        <p class="text-sm font-bold text-ink">${S.lang === 'vi' ? 'Bảng so sánh 3 chiến lược đang mở rộng ở khay bên dưới bản đồ để đọc rõ 3 cột song song.' : 'The 3-strategy comparison is open in the wide tray below the map for side-by-side reading.'}</p>
        <button type="button" data-mw="compare" class="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-moss-900 px-4 text-sm font-extrabold text-moss-900 hover:bg-moss-50">${icon('refresh-cw', 'size-4')}${T.cond.recompareBtn}</button>
      </div>
      <div id="mf-zones" class="mt-4"></div>`
    mfzRefresh(data)
  } else {
    if (dock) {
      dock.hidden = true
      dock.classList.add('hidden')
    }
    body.innerHTML = compareHtml
  }
}

function mwRenderDetailsHtml() {
  const T = mwT()
  const D = T.details
  const R = mfT()
  const g = typeof mgActiveGarden === 'function' ? mgActiveGarden() : null
  const envChart = mwEnvChartHtml()
  if (!g && !MF.loc) {
    return `<div class="space-y-3"><div class="rounded-3xl border border-dashed border-line bg-white p-5 text-sm leading-relaxed text-muted">${esc(D.empty)}</div>${envChart}</div>`
  }
  const lat = g?.lat ?? MF.loc?.lat
  const lon = g?.lon ?? MF.loc?.lon
  const prov = lat != null && lon != null ? mekongFindProvince(lat, lon) : null
  const zone = prov ? MEKONG_ENV_ZONES[prov.zoneId] : null
  const areaM2 = g?.polygon?.length >= 3 && typeof geoAreaM2 === 'function' ? geoAreaM2(g.polygon) : null
  const areaText = areaM2 ? `${(areaM2 / 10000).toFixed(2)} ha (${Math.round(areaM2).toLocaleString()} m²)` : '—'
  const profile = g?.profile || {}
  const assess = g && typeof mgAssessment === 'function' ? mgAssessment(g) : null
  const cropName = g?.crop ? CROP_LIBRARY[g.crop]?.name[S.lang] ?? g.crop : null
  const recCrops = zone?.layers?.['1_soil_type']?.recommended_crops || null
  const marksCount = g ? (DS.marks || []).filter((m) => m.gardenId === g.id).length : (DS.marks || []).length
  const irrigLabel = profile.irrigation ? (R.irrigation[profile.irrigation] ?? profile.irrigation) : D.unmeasured
  const sowingLabel = profile.season ? (R.seasons[profile.season] ?? profile.season) : profile.sowing ? (R.months[profile.sowing - 1] ?? `T${profile.sowing}`) : D.unmeasured
  const ecText = profile.ec !== '' && profile.ec != null ? `${profile.ec} dS/m${profile.ecType ? ` (${profile.ecType})` : ''}` : D.unmeasured

  const row = (k, v) =>
    `<div class="flex items-start justify-between gap-3 border-b border-line/60 py-1.5 text-xs last:border-b-0"><span class="font-semibold text-muted">${esc(k)}</span><span class="text-right font-bold text-ink">${v}</span></div>`

  const criteriaHtml = assess?.suitability?.criteria?.length
    ? `<div class="mt-2.5 space-y-1.5">${assess.suitability.criteria
        .map((c) => {
          const ev = c.evidence?.[0]
          return `<div class="flex items-center justify-between gap-2 rounded-xl bg-ground px-2.5 py-1.5 text-xs"><span class="font-semibold text-ink">${esc(R.criteria?.[c.key] ?? c.key)}${ev ? ` · ${showValue(ev, { digits: mfDigits(ev) })}` : ''}</span>${mfGradeBadge(c.grade, c.grade === 'gray' ? R.overallGray : R.grades[c.grade])}</div>`
        })
        .join('')}</div>`
    : ''

  return `
    <div class="space-y-3">
      <div class="rounded-3xl border border-line bg-white p-4 shadow-card">
        <h3 class="text-base font-extrabold text-moss-950">${esc(g?.name || MF.loc?.name || D.title)}</h3>
        <div class="mt-2">
          ${row(D.areaLabel, esc(areaText))}
          ${row(D.provinceLabel, esc(prov ? (prov[S.lang] ?? prov.vi) : '—'))}
        </div>
      </div>

      <div class="rounded-3xl border border-line bg-white p-4 shadow-card">
        <p class="text-xs font-extrabold uppercase tracking-wide text-moss-700">${esc(D.soilTitle)}</p>
        <div class="mt-2">
          ${row(D.phLabel, esc(profile.ph !== '' && profile.ph != null ? String(profile.ph) : D.unmeasured))}
          ${row(D.ecLabel, esc(ecText))}
          ${row(D.organicLabel, esc(profile.organic || D.unmeasured))}
          ${row(D.soilTypeLabel, esc(profile.soilType || D.unmeasured))}
          ${row(D.irrigationLabel, esc(irrigLabel))}
          ${row(D.sowingLabel, esc(sowingLabel))}
          ${row(D.marksLabel, esc(String(marksCount)))}
          ${row(D.dateLabel, esc(profile.measuredAt || D.unmeasured))}
          ${profile.notes ? row(D.notesLabel, esc(profile.notes)) : ''}
        </div>
      </div>

      <div class="rounded-3xl border border-line bg-white p-4 shadow-card">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-extrabold uppercase tracking-wide text-moss-700">${esc(D.cropTitle)}</p>
          ${assess ? mfGradeBadge(assess.grade, typeof mgT === 'function' ? mgT().grades[assess.grade] : assess.grade) : ''}
        </div>
        <p class="mt-1 text-sm font-extrabold text-ink">${esc(cropName || D.noCrop)}</p>
        ${!cropName && recCrops ? `<p class="mt-1 text-xs text-muted"><span class="font-bold text-moss-900">${esc(T.legend.dbsclRecCrop)}</span> ${esc(recCrops)}</p>` : ''}
        ${criteriaHtml}
      </div>

      ${envChart}
    </div>`
}

function mwCompareHtml(data) {
  const T = mwT()
  const ST = STRAT_TEXT[S.lang]
  const RT = ROT_TEXT[S.lang]
  const res = MW.evalResult
  if (!res?.evaluated) return `<p class="rounded-3xl border border-dashed border-line bg-white p-5 text-muted">${T.emptyPrompt}</p>`

  const staleHtml = MW.stale
    ? `<div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-sun-400 bg-sun-100 px-4 py-3 text-sm font-bold text-sun-700" role="status">
        <span class="flex items-center gap-2">${icon('triangle-alert', 'size-5')}${esc(T.cond.staleBanner)}</span>
        <button type="button" data-mw="compare" class="min-h-10 rounded-full bg-moss-900 px-4 text-xs font-extrabold text-white">${T.cond.recompareBtn}</button>
      </div>`
    : ''

  if (FP.strategyId && FP.evalId === res.evaluationId) {
    return staleHtml + fpRenderHtml(res, data)
  }

  const calName = res.calendar.districtId ? PROVINCES.find((p) => p.id === res.calendar.districtId)?.name : null
  const calNote =
    res.calendar.mode === 'borrowed'
      ? `<p class="mb-3 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-moss-900">${esc(T.cond.borrowedCal(calName, mfNum(res.calendar.distanceKm, 1), GEO_PARAMS.districtRadiusKm))}</p>`
      : res.calendar.mode === 'none' || !res.baseRankable
        ? `<p class="mb-3 rounded-2xl border border-dashed border-sun-400 bg-sun-100 px-4 py-2.5 text-sm font-semibold text-sun-700">${esc(T.cond.outsideCal(GEO_PARAMS.districtRadiusKm))}</p>`
        : ''

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const eligStyle = {
    eligible: 'bg-moss-900 text-white',
    ineligible: 'border border-line bg-ground text-muted',
    insufficient_data: 'border border-dashed border-line bg-white text-muted',
  }
  const riskStyle = {
    lower: ['bg-lime-100 text-moss-900', 'circle-check'],
    conditional: ['bg-sun-100 text-sun-700', 'triangle-alert'],
    high: ['bg-clay-100 text-clay-700', 'circle-x'],
    unknown: ['border border-dashed border-line bg-white text-muted', 'circle-help'],
  }

  const cards = res.strategies
    .map((s) => {
      const name = s.alsoWins ? `${ST.names[s.kind]} · ${ST.names[s.alsoWins]}` : ST.names[s.kind]
      const crops = s.crops.map((c) => cap(CROP_LIBRARY[c]?.name[S.lang] ?? RT.crops[c])).join(' – ')
      const rBadge = riskStyle[s.riskLevel]
      const rankPill = s.rank ? `<span class="rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-extrabold text-moss-900">${T.strat.rankLabel(s.rank)}${s.score !== null ? ` · ${s.score}/100` : ''}</span>` : `<span class="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs font-bold text-muted">${T.strat.unranked}</span>`
      const openWhy = MW.openStratWhy.has(s.strategyId)
      const whyDetails = openWhy
        ? `<ul class="mt-3 space-y-2 border-t border-line pt-3 text-xs">${s.assessments
            .map(
              (a, i) => `<li class="rounded-xl bg-ground p-2.5">
                  <div class="flex items-center justify-between gap-2 font-bold"><span>${esc(CROP_LIBRARY[a.crop]?.name[S.lang] ?? a.crop)} (${s.windows?.[i] ? mfT().seasons[s.windows[i].season] : `#${i + 1}`})</span>${mfGradeBadge(a.overall, a.overall === 'gray' ? mfT().overallGray : mfT().grades[a.overall])}</div>
                  ${a.criteria.filter((c) => c.evidence.length).slice(0, 2).map((c) => `<div class="mt-1 flex flex-wrap gap-2 text-[11px] text-muted">${c.evidence.slice(0, 2).map((ev) => `<span>${esc(mfLabel(ev))}: ${showValue(ev, { digits: mfDigits(ev) })}</span>`).join('')}</div>`).join('')}
                </li>`,
            )
            .join('')}</ul>`
        : ''

      return `<article class="flex min-w-0 flex-col rounded-3xl border ${s.eligibility === 'eligible' && !s.isBaseline ? 'border-moss-900 bg-white' : 'border-line bg-white'} p-4 shadow-card ${MW.stale ? 'opacity-65' : ''}">
          <div class="flex flex-wrap items-center justify-between gap-1.5">
            <p class="text-xs font-extrabold uppercase tracking-wide text-moss-700">${esc(name)}</p>
            ${rankPill}
          </div>
          <h4 class="mt-1 text-lg font-extrabold tracking-tight text-ink">${esc(s.strategyId)}. ${esc(crops)}</h4>
          <div class="mt-2.5 flex flex-wrap gap-1.5">
            <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${eligStyle[s.eligibility]}">${esc(T.strat.eligibility[s.eligibility])}</span>
            <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${rBadge[0]}">${icon(rBadge[1], 'size-3.5')}${esc(T.strat.risk[s.riskLevel])}</span>
          </div>
          ${s.unmetConstraints.length ? `<p class="mt-2 text-xs font-semibold text-ink">${s.unmetConstraints.map((u) => esc(T.strat.unmet[u] ?? u)).join(' ')}</p>` : ''}
          ${s.missingFields.length ? `<p class="mt-2 text-xs text-muted"><span class="font-bold">${S.lang === 'vi' ? 'Còn thiếu:' : 'Missing:'}</span> ${s.missingFields.map((m) => esc(T.strat.missingLabel[m] ?? m)).join(' · ')}</p>` : ''}
          ${whyDetails}
          <div class="mt-auto flex flex-wrap gap-2 pt-3">
            <button type="button" data-mw="stratWhy" data-value="${s.strategyId}" class="min-h-10 rounded-full border border-line px-3 text-xs font-bold hover:border-moss-700">${T.strat.openEvidence}</button>
            <button type="button" data-mw="openPlan" data-value="${s.strategyId}" data-crop="${s.crops[1] ?? s.crops[0]}" class="min-h-10 flex-1 rounded-full ${s.eligibility === 'eligible' ? 'bg-moss-900 text-white hover:bg-moss-800' : 'border border-dashed border-line bg-ground text-ink'} px-3 text-xs font-extrabold">${s.eligibility === 'eligible' ? T.strat.pickPlan : T.strat.previewPlan}</button>
          </div>
        </article>`
    })
    .join('')

  return `
    ${staleHtml}${calNote}
    ${data?.scenario?.active ? `<div class="mb-3">${mfwCropsBannerHtml(data)}</div>` : ''}
    ${res.nearTie ? `<p class="mb-3 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink">${esc(T.strat.nearTie)}</p>` : ''}
    <div class="grid gap-4 lg:grid-cols-3">${cards}</div>
    <details class="mt-5 rounded-3xl border border-line bg-white p-4 shadow-card">
      <summary class="cursor-pointer font-extrabold text-moss-900">${mfT().steps.crops} (${CROP_LIBRARY ? Object.keys(CROP_LIBRARY).length : 9})</summary>
      <div id="mf-crops" class="mt-4">${mfCropsHtml(data)}</div>
    </details>
    <p class="mt-4 text-sm font-semibold text-muted">${mfT().reminder}</p>`
}

function mwNormSearch(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
}

function mwSearchCatalog() {
  const distItems = PROVINCES.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, zoom: 12 }))
  const provItems = MEKONG_PROVINCES_GEO.map((p) => ({
    id: p.districtId || p.vi,
    name: p[S.lang] ?? p.vi,
    lat: p.center[0],
    lon: p.center[1],
    zoom: 10,
  }))
  return [...distItems, ...provItems]
}

function mwRenderSearchSuggestions(raw) {
  const box = $('#mw-search-suggestions')
  if (!box) return
  const norm = mwNormSearch(raw)
  if (!norm) {
    box.hidden = true
    box.innerHTML = ''
    return
  }
  const matches = mwSearchCatalog().filter((item) => mwNormSearch(item.name).includes(norm) || mwNormSearch(item.id).includes(norm))
  if (!matches.length) {
    box.hidden = true
    box.innerHTML = ''
    return
  }
  box.hidden = false
  box.innerHTML = `<div class="flex flex-wrap gap-1.5">${matches
    .slice(0, 8)
    .map(
      (m) =>
        `<button type="button" data-mw="pickSuggest" data-lat="${m.lat}" data-lon="${m.lon}" data-zoom="${m.zoom}" data-id="${esc(m.id)}" data-name="${esc(m.name)}" class="min-h-9 rounded-full border border-line bg-ground px-3 text-xs font-bold text-ink hover:border-moss-700 hover:bg-moss-50">${esc(m.name)}</button>`,
    )
    .join('')}</div>`
}

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'mw-search-form') return
  e.preventDefault()
  const raw = String(new FormData(e.target).get('q') ?? '').trim()
  MW.searchErr = null
  if (!raw) return
  const norm = mwNormSearch(raw)
  const match = mwSearchCatalog().find((p) => mwNormSearch(p.name).includes(norm) || mwNormSearch(p.id) === norm)
  if (match) {
    MW.picking = false
    MW.confirmGeo = false
    mwRenderSearchSuggestions('')
    MF.map?.setView([match.lat, match.lon], match.zoom)
    return mfSelect({ lat: match.lat, lon: match.lon, id: match.id, name: match.name })
  }
  const ll = geoParseLatLon(raw)
  if (ll) {
    MW.picking = false
    MW.confirmGeo = false
    mwRenderSearchSuggestions('')
    MF.map?.setView([ll.lat, ll.lon], 14)
    return mfSelect(ll)
  }
  MW.searchErr = mwT().search.invalid
  mwRenderTopNotices()
})

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-mw-tab]')
  if (tab) {
    MW.tab = tab.dataset.mwTab
    if (!mwDesktop() && MW.sheet === 'peek') MW.sheet = 'half'
    return mfRenderDynamic()
  }
  const sheet = e.target.closest('[data-mw-sheet]')
  if (sheet) {
    MW.sheet = sheet.dataset.mwSheet
    return mwSyncSheetStyle()
  }
  const b = e.target.closest('[data-mw]')
  if (!b) return
  const v = b.dataset.value
  switch (b.dataset.mw) {
    case 'cycleSheet':
      MW.sheet = MW.sheet === 'peek' ? 'half' : MW.sheet === 'half' ? 'full' : 'peek'
      return mwSyncSheetStyle()
    case 'zoomIn':
      return MF.map?.zoomIn()
    case 'zoomOut':
      return MF.map?.zoomOut()
    case 'basemap':
      MW.basemap = MW.basemap === 'sat' ? 'street' : 'sat'
      mfUseBase(MW.basemap === 'sat' ? 0 : 1)
      return ($('#mw-basemap-btn').title = MW.basemap === 'sat' ? mwT().controls.basemapStreet : mwT().controls.basemapSat)
    case 'layersToggle':
      MW.layersOpen = !MW.layersOpen
      return mwRenderLayerMenu()
    case 'fullscreen': {
      const root = $('#mw-root')
      if (!document.fullscreenElement && root?.requestFullscreen) root.requestFullscreen().catch(() => {})
      else if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      return
    }
    case 'pickSuggest': {
      const lat = Number(b.dataset.lat)
      const lon = Number(b.dataset.lon)
      const zoom = Number(b.dataset.zoom) || 11
      const inp = $('#mw-search-input')
      if (inp) inp.value = b.dataset.name || ''
      MW.picking = false
      MW.confirmGeo = false
      mwRenderSearchSuggestions('')
      MF.map?.setView([lat, lon], zoom)
      return mfSelect({ lat, lon, id: b.dataset.id, name: b.dataset.name })
    }
    case 'pickNew':
      MW.picking = true
      MW.confirmGeo = false
      if (!mwDesktop()) MW.sheet = 'peek'
      mwSyncSheetStyle()
      return mwRenderTopNotices()
    case 'cancelPick':
      MW.picking = false
      return mwRenderTopNotices()
    case 'confirmYes':
      MW.confirmGeo = false
      return mwRenderTopNotices()
    case 'cropChange':
      MW.cropChange = v
      mwOnInputsChanged()
      return mwRenderBody()
    case 'currentId':
      MW.currentId = v
      mwOnInputsChanged()
      return mwRenderBody()
    case 'compare': {
      MW.tab = 'compare'
      const data = mfCompute()
      mwRunEvaluate(data)
      if (!mwDesktop() && MW.sheet === 'peek') MW.sheet = 'full'
      return mfRenderDynamic()
    }
    case 'stratWhy':
      if (MW.openStratWhy.has(v)) MW.openStratWhy.delete(v)
      else MW.openStratWhy.add(v)
      return mwRenderBody()
    case 'openPlan': {
      const data = mfCompute()
      const cropToZone = b.dataset.crop
      if (cropToZone && mfdPolygon()) {
        MFZ.crop = cropToZone
        mfzRefresh(data)
        mwRenderLegend()
      }
      return fpOpen(v, MW.evalResult?.evaluationId)
    }
  }
})

document.addEventListener('input', (e) => {
  if (e.target.id === 'mw-search-input') {
    return mwRenderSearchSuggestions(e.target.value)
  }
  if (!e.target.hasAttribute('data-mw-opacity')) return
  const pct = Number(e.target.value)
  MW.opacity = pct / 100
  e.target.style.setProperty('--fill', `${((pct - 20) / 80) * 100}%`)
  if (typeof mfUpdateEnvOpacity === 'function') mfUpdateEnvOpacity()
  else if (MF.overlay) MF.overlay.setOpacity(MW.opacity)
  const data = mfCompute()
  if (MFZ.crop && data) mfzRefresh(data)
})
