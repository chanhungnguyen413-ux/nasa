// Không gian làm việc bản đồ toàn màn hình kiểu WaterWise (Bước A, C, D, E, F của kế hoạch):
//   - Desktop: topbar 72 px · panel trái 380 px (3 bước) · bản đồ chiếm phần còn lại · khay so sánh rộng bên dưới khi xem Bước 3
//   - Mobile (360–430 px): bản đồ toàn màn hình · bottom sheet 3 nấc (peek / half / full)
//   - Máy trạng thái chọn ruộng: chạm bản đồ khi 'idle' KHÔNG làm mất ranh thửa cũ; chỉ chọn mới khi bật "Chọn chỗ khác"
//   - Điều khiển 48 px nổi trên bản đồ: tìm/nhập tọa độ, phóng to/thu nhỏ, vị trí của tôi (+ xác nhận), nền vệ tinh/đường, lớp dữ liệu + chú giải
import { evidence } from '../core/evidence.js'
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { PROVINCES } from '../data/provinces.js'
import { MEKONG_PROVINCES_GEO, MEKONG_ENV_ZONES, MEKONG_ENV_LAYER_MAP, mekongFindProvince } from '../data/mekongBoundaries.js'
import { EM_AVAILABLE_KEYS, EM_FILTER_GROUPS, EM_FILTER_META, emCellAt, emDescribeCell, emLayerStats, emSpectrumBands, emSynthesizeGardenStack } from '../logic/envMapData.js'
import { REDESIGN_TEXT } from '../i18n/redesignText.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { ROT_TEXT } from '../i18n/rotationText.js'
import { STRAT_TEXT } from '../i18n/strategyText.js'
import { FIELD_TEXT } from '../i18n/fieldText.js'
import { DATA_TEXT } from '../i18n/dataText.js'
import { FIELD_CHANGE_ANSWERS, fsAssessField, fsInputKey } from '../logic/fieldStrategies.js'
import { GEO_PARAMS, geoAreaM2, geoParseLatLon } from '../logic/geometry.js'
import { wiEt0Pair } from '../logic/whatIf.js'
import { GIBS_LAYERS, catalogSource } from '../sources/catalog.js'
import { powerElevationEvidence } from '../sources/power.js'
import { mwFuzzySearchPlace, mwPlaceCatalog, psNormalize } from '../logic/placeSearch.js'
import { rfBridgeHtml } from './rotationFarm.js'
import { GARDEN_GRADES, gmCropLabel, gmHasBoundary } from '../logic/gardenModel.js'

const MW = {
  tab: 'field', // 'field' | 'cond' | 'compare'
  sheet: 'half', // mobile: 'peek' | 'half' | 'full'
  basemap: 'sat', // 'sat' | 'street'
  opacity: 1, // lớp phủ hiện rõ 100% ngay khi mở
  layersOpen: false,
  legendOpen: true,
  fullscreen: false,
  leftCollapsed: false,
  picking: false,
  confirmGeo: false,
  tilesOffline: false,
  searchErr: null,
  searchErrTimer: null,
  geoErrTimer: null,
  cropChange: 'yes', // 'yes' | 'partial' | 'no'
  currentId: 'A',
  evalResult: null,
  evalInputKey: null,
  evalSeq: 0,
  stale: false,
  openStratWhy: new Set(),
  layerMenuPos: null,
}
const mwT = () => MAP_TEXT[S.lang]
const mwDesktop = () => matchMedia('(min-width: 1024px)').matches

addEventListener('resize', () => {
  if (S.page !== 'myfield') return
  mwSyncSheetStyle()
  if (MW.layersOpen) mwApplyLayerMenuPos($('#mw-layer-menu'))
  MF.map?.invalidateSize()
})

function mwCurrentInputKey(data = null) {
  const poly = mfdPolygon()
  const u = data?.user
  const g = typeof mgActiveGarden === 'function' ? mgActiveGarden() : null
  const soilLast = DS.soil?.[DS.soil.length - 1]
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
    gardenId: g?.id ?? '',
    ec: g?.profile?.ec ?? soilLast?.ec ?? null,
    ecType: g?.profile?.ecType ?? soilLast?.ecType ?? null,
    ph: g?.profile?.ph ?? soilLast?.ph ?? null,
    soilType: g?.profile?.soilType ?? null,
    climateKey: MF.record ? `${MF.origin ?? ''}:${MF.record.fetchedAt ?? ''}` : 'none',
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
    // Khi giả định đang bật, data.climate đã nhân rainPct rồi: truyền 0 để không nhân đôi giả định mưa.
    whatIf: { rainPct: data?.scenario?.active ? 0 : MFW.rainPct },
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
    <div id="mw-root" data-left-collapsed="${MW.leftCollapsed ? 'true' : 'false'}" class="relative h-[calc(100dvh-4.5rem)] w-full overflow-hidden bg-ground lg:grid lg:grid-cols-[380px_1fr] lg:grid-rows-[1fr_auto]">
      <!-- Cột bản đồ (Desktop bên phải; Mobile chiếm toàn nền phía sau bottom sheet) -->
      <div class="relative h-full w-full lg:col-start-2 lg:row-start-1">
        <div id="mf-map" role="application" aria-label="${R.mapLabel}" class="h-full w-full bg-moss-50"></div>

        <!-- Thanh tìm kiếm (chỉ hiện danh sách tỉnh/huyện khi gõ tìm kiếm) -->
        <div class="pointer-events-none absolute inset-x-3 top-3 z-[400] flex flex-col gap-2 pr-14 sm:max-w-xl">
          <div class="pointer-events-auto flex items-center gap-2">
            <button type="button" id="mw-left-toggle-map" data-mw="toggleLeftPanel" ${MW.leftCollapsed ? '' : 'hidden'} aria-label="${T.controls.togglePanelShow}" title="${T.controls.togglePanelShow}" class="${MW.leftCollapsed ? 'hidden lg:grid' : 'hidden'} size-11 shrink-0 place-items-center rounded-xl border border-line bg-white/95 text-ink shadow-lift backdrop-blur hover:bg-moss-50">${icon('panel-left-open', 'size-5')}</button>
            <form id="mw-search-form" class="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-line bg-white/95 p-1.5 shadow-lift backdrop-blur">
              <label for="mw-search-input" class="sr-only">${T.search.placeholder}</label>
              <input id="mw-search-input" name="q" type="text" autocomplete="off" placeholder="${T.search.placeholder}" class="min-h-10 min-w-0 flex-1 bg-transparent pl-3 text-[15px] font-semibold text-ink outline-none" />
              <button type="submit" class="min-h-10 shrink-0 rounded-full bg-moss-900 px-4 text-sm font-bold text-white hover:bg-moss-800">${T.search.btn}</button>
            </form>
          </div>
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
          <button type="button" id="mw-fullscreen-btn" data-mw="fullscreen" aria-label="${T.controls.fullscreen}" title="${T.controls.fullscreen}" class="hidden size-12 place-items-center rounded-2xl border border-line bg-white/95 text-ink shadow-card hover:bg-moss-50 sm:grid">${icon('maximize-2', 'size-5')}</button>
        </div>

        <!-- Hộp chọn lớp dữ liệu (kéo thả trong vùng bản đồ, nút đóng cố định trên đầu) -->
        <div id="mw-layer-menu" hidden class="mw-layer-menu-in absolute bottom-14 right-3 z-[410] w-72 overflow-hidden rounded-2xl border border-line bg-white/95 shadow-lift backdrop-blur"></div>

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
        <div class="mk-workspace-title mk-tech-grid">
          <div class="mk-workspace-head">
            <p class="mk-eyebrow"><span class="mk-live-dot"></span><span class="mk-code">01</span> · ${REDESIGN_TEXT[S.lang].workspaceEyebrow}</p>
            <button type="button" data-mw="toggleLeftPanel" aria-label="${T.controls.togglePanelHide}" title="${T.controls.togglePanelHide}" class="mk-panel-close-btn">${icon('panel-left-close', 'size-4')}</button>
          </div>
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

  // Cuộn trong panel trái không được kéo theo phóng/thu bản đồ.
  $('#mw-panel')?.addEventListener('wheel', (ev) => ev.stopPropagation(), { passive: true })
  // Thanh tab xuống dòng khi panel đổi rộng (VI dài hơn EN): đo lại "viên trượt" mỗi khi kích thước đổi.
  const tabList = document.querySelector('#mw-panel [role="tablist"]')
  if (tabList && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => mwSyncTabIndicator()).observe(tabList)
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
  mwSyncTabIndicator()
}

// "Viên trượt" của thanh tab (site/hitech.css): đặt vị trí/kích thước bằng biến CSS, chỉ transform trượt.
// Lần đo đầu tiên đặt ngay (không trượt từ góc trái); tab đang ẩn (offsetWidth = 0) thì bỏ qua.
/** Chuyển sang một tab của panel (dùng chung cho nút tab và khi bấm vào thửa). */
function mwGoTab(tab) {
  if (MW.tab === tab) return mfRenderDynamic()
  MW.tab = tab
  if (typeof CSM !== 'undefined') CSM.openMenu = null
  MW.picking = false
  if (tab !== 'field' && typeof mdActive === 'function' && mdActive()) mdSetMode('idle')
  if (!mwDesktop() && MW.sheet === 'peek') MW.sheet = 'half'
  mfRenderDynamic()
  mwAnimateTabBody()
}

function mwSyncTabIndicator() {
  const list = document.querySelector('#mw-panel [role="tablist"]')
  const on = list?.querySelector('[data-mw-tab][aria-selected="true"]')
  if (!list || !on || !on.offsetWidth) return
  const first = !list.dataset.mkInd
  if (first) list.classList.add('mk-ind-instant')
  list.style.setProperty('--mk-tab-x', `${on.offsetLeft}px`)
  list.style.setProperty('--mk-tab-y', `${on.offsetTop}px`)
  list.style.setProperty('--mk-tab-w', `${on.offsetWidth}px`)
  list.style.setProperty('--mk-tab-h', `${on.offsetHeight}px`)
  list.dataset.mkInd = '1'
  if (first) requestAnimationFrame(() => requestAnimationFrame(() => list.classList.remove('mk-ind-instant')))
}

// Nội dung tab mới mờ + nhích lên (CSS .mk-tab-in). Gỡ lớp sau ~0,4 s để các lần vẽ lại sau đó
// (chọn vườn, đổi lớp…) không chạy lại hiệu ứng.
let mwTabAnimTimer = null
function mwAnimateTabBody() {
  const body = $('#mw-panel-body')
  if (!body) return
  body.classList.remove('mk-tab-in')
  void body.offsetWidth
  body.classList.add('mk-tab-in')
  clearTimeout(mwTabAnimTimer)
  mwTabAnimTimer = setTimeout(() => body.classList.remove('mk-tab-in'), 420)
}

// Thu gọn / mở panel trái (desktop): cột lưới co giãn trong ~340 ms. Mỗi khung hình báo Leaflet kích thước mới
// (invalidateSize, không pan) rồi bù đúng đoạn mép trái vừa dịch, để bản đồ đứng yên thay vì trượt theo khung.
// Kết thúc (transitionend hoặc hẹn giờ dự phòng) luôn gọi invalidateSize lần cuối → không còn mép xám.
let mwPanelRaf = 0
function mwFollowPanelResize() {
  const map = MF.map
  const box = $('#mf-map')
  const root = $('#mw-root')
  if (!map || !box) return
  cancelAnimationFrame(mwPanelRaf)
  let prevLeft = box.getBoundingClientRect().left
  let carry = 0 // Leaflet chỉ pan số nguyên px: dồn phần lẻ để không trôi dần
  let done = false
  const finish = () => {
    if (done) return
    done = true
    cancelAnimationFrame(mwPanelRaf)
    map.invalidateSize({ pan: false })
  }
  const t0 = performance.now()
  const step = (now) => {
    if (done) return
    const left = box.getBoundingClientRect().left
    map.invalidateSize({ pan: false, debounceMoveend: true })
    carry += prevLeft - left
    const px = Math.round(carry)
    if (px) {
      map.panBy([-px, 0], { animate: false })
      carry -= px
    }
    prevLeft = left
    if (now - t0 < 520) mwPanelRaf = requestAnimationFrame(step)
    else finish()
  }
  mwPanelRaf = requestAnimationFrame(step)
  root?.addEventListener('transitionend', (ev) => { if (ev.target === root && ev.propertyName === 'grid-template-columns') requestAnimationFrame(finish) }, { once: true })
}

function mwRenderTopNotices() {
  const el = $('#mw-top-notices')
  if (!el) return
  const T = mwT()
  const R = mfT()
  const msgs = []
  if (MF.geo === 'locating') {
    msgs.push(`<div class="w-fit max-w-[230px] rounded-xl border border-line bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-card">${esc(R.locating)}</div>`)
  } else if (MF.geo) {
    msgs.push(`<div class="mw-error-toast w-fit max-w-[230px] rounded-xl border border-clay-700/30 bg-clay-100 px-3 py-1.5 text-xs font-bold text-clay-700 shadow-card">${esc(R.geoError(MF.geo))}</div>`)
  }
  if (MW.picking) {
    msgs.push(`<div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-moss-900 bg-lime-100 px-3.5 py-2 text-sm font-bold text-moss-950 shadow-card"><span>${esc(T.search.pickingHint)}</span><button type="button" data-mw="cancelPick" class="min-h-9 rounded-full bg-moss-900 px-3 text-xs font-bold text-white">${T.search.pickingCancel}</button></div>`)
  }
  if (MW.confirmGeo && MF.loc) {
    msgs.push(`<div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sun-400 bg-sun-100 px-3.5 py-2 text-sm font-bold text-sun-700 shadow-card"><span>${esc(T.search.confirmLoc)}</span><div class="flex gap-1.5"><button type="button" data-mw="confirmYes" class="min-h-9 rounded-full bg-moss-900 px-3 text-xs font-bold text-white">${T.search.confirmYes}</button><button type="button" data-mw="pickNew" class="min-h-9 rounded-full border border-sun-700 bg-white px-3 text-xs font-bold text-sun-700">${T.search.confirmRelocate}</button></div></div>`)
  }
  if (MW.searchErr) {
    msgs.push(`<div class="mw-error-toast w-fit max-w-[230px] rounded-xl border border-clay-700/30 bg-clay-100 px-3 py-1.5 text-xs font-bold text-clay-700 shadow-card">${esc(MW.searchErr)}</div>`)
  }
  el.innerHTML = msgs.join('')
}

function mwEnvBadgeClass(meta, active) {
  if (active) return 'border-white/40 bg-white/20 text-white'
  if (meta.status === 'insufficient') return 'border-amber-300 bg-amber-100 text-amber-950'
  if (meta.scope === 'dbscl') return 'border-emerald-300 bg-emerald-100 text-emerald-950'
  if (meta.scope === 'isric') return 'border-amber-300 bg-amber-50 text-amber-950'
  return 'border-sky-300 bg-sky-100 text-sky-950'
}

function mwEnvSourcePill(meta, labelText) {
  const tone = meta.status === 'insufficient'
    ? 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200'
    : meta.scope === 'dbscl'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200'
      : meta.scope === 'isric'
        ? 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
        : 'border-sky-300 bg-sky-100 text-sky-950 hover:bg-sky-200'
  const text = `${labelText} · ${meta.badge[S.lang]}`
  return `<a href="${esc(meta.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border px-2 py-0.5 text-left text-[10px] font-bold leading-snug break-words underline-offset-2 hover:underline ${tone}">${esc(text)}</a>`
}

function mwApplyLayerMenuPos(el) {
  if (!el || !MW.layerMenuPos) return
  const wrap = el.parentElement
  if (!wrap) return
  const w = wrap.clientWidth
  const h = wrap.clientHeight
  const ew = el.offsetWidth || 288
  const eh = el.offsetHeight || 200
  if (w < 40 || h < 40) return
  const left = Math.max(8, Math.min(MW.layerMenuPos.left, Math.max(8, w - ew - 8)))
  const top = Math.max(8, Math.min(MW.layerMenuPos.top, Math.max(8, h - eh - 8)))
  MW.layerMenuPos = { left, top }
  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.right = 'auto'
  el.style.bottom = 'auto'
}

function mwBindLayerMenuDrag(el) {
  if (!el || el.dataset.mwDragBound === '1') return
  el.dataset.mwDragBound = '1'
  el.addEventListener('wheel', (ev) => ev.stopPropagation(), { passive: true })
  el.addEventListener('pointerdown', (ev) => {
    // Chặn lan pointerdown xuống Leaflet để không bị kéo nhầm nền bản đồ khi bấm/kéo hộp lớp.
    ev.stopPropagation()
    const handle = ev.target.closest('#mw-layer-drag')
    if (!handle || ev.target.closest('button, a, input, label')) return
    const wrap = el.parentElement
    if (!wrap) return
    const wrapRect = wrap.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const startLeft = elRect.left - wrapRect.left
    const startTop = elRect.top - wrapRect.top
    const startX = ev.clientX
    const startY = ev.clientY
    ev.preventDefault()
    handle.setPointerCapture?.(ev.pointerId)
    const onMove = (me) => {
      MW.layerMenuPos = {
        left: startLeft + (me.clientX - startX),
        top: startTop + (me.clientY - startY),
      }
      mwApplyLayerMenuPos(el)
    }
    const onUp = (ue) => {
      handle.releasePointerCapture?.(ue.pointerId)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onUp)
    }
    addEventListener('pointermove', onMove)
    addEventListener('pointerup', onUp)
    addEventListener('pointercancel', onUp)
  })
}

function mwRenderLayerMenu() {
  const el = $('#mw-layer-menu')
  // Hộp lớp mở thì ẩn nút toàn màn hình và nút trợ lý (#fab) để khỏi che hộp.
  const fsBtn = $('#mw-fullscreen-btn')
  if (fsBtn) {
    fsBtn.hidden = MW.layersOpen
    fsBtn.classList.toggle('sm:grid', !MW.layersOpen)
  }
  const fab = $('#fab')
  if (fab && S.page === 'myfield') fab.hidden = MW.layersOpen
  if (!el) return
  el.hidden = !MW.layersOpen
  if (!MW.layersOpen) return
  mwBindLayerMenuDrag(el)
  const prevScroll = el.querySelector('[data-mw-layer-scroll]')?.scrollTop ?? 0
  const R = mfT()
  const T = mwT()
  const btn = (val, label, active) => {
    const meta = val !== 'none' ? EM_FILTER_META[val] : null
    const tag = meta
      ? `<span class="mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold leading-none ${mwEnvBadgeClass(meta, active)}">${esc(meta.badge[S.lang])}</span>`
      : ''
    return `<button type="button" data-mf="layer" data-value="${val}" aria-pressed="${active}" class="flex w-full items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-bold leading-tight ${active ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-white text-ink hover:border-moss-700'}"><span class="min-w-0 flex-1"><span class="block truncate">${esc(label)}</span>${tag}</span>${active ? icon('check', 'size-3.5 shrink-0') : ''}</button>`
  }
  const groupHtml = EM_FILTER_GROUPS.map((grp) => `
    <div class="mt-2">
      <p class="px-1 text-[10px] font-extrabold uppercase tracking-wide text-moss-700">${esc(R.layerGroups?.[grp.id] ?? grp.id)}</p>
      <div class="mt-1 grid gap-1">${grp.keys.map((key) => btn(key, R.layers[key] ?? key, MF.layer === key)).join('')}</div>
    </div>`).join('')
  el.innerHTML = `
    <div class="flex max-h-[58vh] flex-col">
      <div id="mw-layer-drag" title="${esc(T.controls.layersDragHint)}" class="flex shrink-0 cursor-grab touch-none select-none items-center justify-between gap-2 border-b border-line bg-white/95 px-2.5 py-2 active:cursor-grabbing">
        <div class="flex min-w-0 items-center gap-1.5">
          ${icon('grip-horizontal', 'size-3.5 shrink-0 text-muted')}
          <p class="truncate text-xs font-extrabold">${R.layersTitle}</p>
        </div>
        <button type="button" data-mw="layersToggle" aria-label="${esc(T.controls.layersClose)}" title="${esc(T.controls.layersClose)}" class="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-ground px-2 py-0.5 text-[11px] font-bold text-ink hover:bg-moss-50">${icon('x', 'size-3.5')}<span>${esc(T.controls.layersClose)}</span></button>
      </div>
      <div data-mw-layer-scroll class="min-h-0 flex-1 overflow-y-auto p-2.5">
        <p class="text-[10px] font-semibold text-muted">${esc(T.legend.envFilterGroupTitle)}</p>
        <div class="mt-1.5 grid gap-1">${btn('none', R.layers.none, MF.layer === null)}</div>
        ${groupHtml}
        <div class="mt-2 border-t border-line pt-2">
          <div class="flex justify-between text-[11px] font-bold text-muted"><span>${T.legend.opacity}</span><span id="mw-opacity-val">${Math.round(MW.opacity * 100)}%</span></div>
          <input type="range" data-mw-opacity min="20" max="100" step="5" value="${Math.round(MW.opacity * 100)}" class="range mt-1 w-full" style="--fill:${((MW.opacity * 100 - 20) / 80) * 100}%" />
        </div>
      </div>
    </div>`
  const scroller = el.querySelector('[data-mw-layer-scroll]')
  if (scroller && prevScroll > 0) scroller.scrollTop = prevScroll
  mwApplyLayerMenuPos(el)
}

function mwEnvChartHtml() {
  const activeKey = MF.layer && EM_AVAILABLE_KEYS.includes(MF.layer) ? MF.layer : null
  if (!activeKey) return ''
  const T = mwT()
  const R = mfT()
  const envMap = typeof PRECOMPUTED !== 'undefined' ? PRECOMPUTED?.envMap : null
  const meta = EM_FILTER_META[activeKey]
  const stats = emLayerStats(envMap, activeKey)
  if (!meta || !stats) return ''

  const activeTitle = R.layers[activeKey] ?? activeKey
  const g = typeof mgActiveGarden === 'function' ? mgActiveGarden() : null
  const lat = g?.lat ?? MF.loc?.lat
  const lon = g?.lon ?? MF.loc?.lon
  const activeProv = lat != null && lon != null ? mekongFindProvince(lat, lon) : null
  const placeName = g?.name || MF.loc?.name || (activeProv ? (activeProv[S.lang] ?? activeProv.vi) : null)
  const provName = activeProv ? (activeProv[S.lang] ?? activeProv.vi) : null
  const placeLabel = placeName && provName && placeName !== provName ? `${placeName} (${provName})` : (placeName || provName)
  const cell = lat != null && lon != null ? emCellAt(envMap, activeKey, lat, lon) : null
  const desc = cell ? emDescribeCell(activeKey, cell) : null

  let areaHtml = ''
  if (lat == null || lon == null) {
    areaHtml = `<p class="mt-1.5 text-[11px] text-muted">${esc(T.legend.envNoPointHint)}</p>`
  } else if (!cell || cell.missing || !desc) {
    areaHtml = `
      <div class="mt-1.5 flex items-start gap-2 rounded-2xl border border-dashed border-line bg-ground/60 p-2.5">
        <span class="mt-0.5 size-4 shrink-0 rounded border border-dashed border-slate-400 bg-slate-100"></span>
        <div class="min-w-0 text-[11px]">
          <p class="font-extrabold text-ink">${esc(placeLabel || T.legend.envSelectedAreaTitle)}</p>
          <p class="mt-0.5 text-muted">${esc(T.legend.envMissingCell)}</p>
        </div>
      </div>`
  } else {
    const tierBadge =
      desc.bandIndex != null && desc.totalBands
        ? `<span class="ml-auto shrink-0 rounded-full border border-moss-900/20 bg-white px-2 py-0.5 text-[10px] font-extrabold text-moss-900">${esc(
            T.legend.envTierBadge.replace('{i}', String(desc.bandIndex + 1)).replace('{n}', String(desc.totalBands)),
          )}</span>`
        : ''
    areaHtml = `
      <div class="mt-1.5 flex items-start gap-2.5 rounded-2xl border border-moss-900/15 bg-moss-50/70 p-2.5">
        <span class="mt-0.5 size-5 shrink-0 rounded-md border border-black/20 shadow-sm" style="background:${esc(desc.hex)}"></span>
        <div class="min-w-0 flex-1 text-[11px] leading-snug">
          <div class="flex flex-wrap items-center gap-1.5">
            <p class="font-extrabold text-moss-950">${esc(placeLabel || T.legend.envSelectedAreaTitle)}</p>
            ${tierBadge}
          </div>
          <p class="mt-0.5 font-bold text-ink">${esc(desc.title[S.lang])}</p>
          <p class="mt-0.5 text-muted">${esc(desc.detail[S.lang])}</p>
        </div>
      </div>`
  }

  const bands = emSpectrumBands(activeKey)
  const activeIdx = desc?.bandIndex ?? -1
  const spectrumHtml = bands.length
    ? `<div class="mt-3 border-t border-line/70 pt-2.5">
        <p class="text-[11px] font-extrabold text-ink">${esc(T.legend.envSpectrumTitle)}</p>
        <div class="mt-2 flex h-3 w-full gap-0.5 overflow-hidden rounded-full border border-black/15 bg-black/5 p-0.5" role="img" aria-label="${esc(T.legend.envSpectrumTitle)}">
          ${bands
            .map((b, idx) => {
              const isCur = idx === activeIdx
              return `<span class="h-full flex-1 rounded-sm" title="${esc(`${idx + 1}. ${b.label[S.lang]}`)}" style="background:${esc(b.hex)};${isCur ? 'outline:2px solid #0f172a;outline-offset:-1px;' : ''}"></span>`
            })
            .join('')}
        </div>
        <div class="mt-2 space-y-1.5">${bands
          .map((b, idx) => {
            const isCur = idx === activeIdx
            const rowCls = isCur
              ? 'border border-moss-900/35 bg-moss-50/80 shadow-sm'
              : 'border border-transparent bg-white/60'
            const activePill = isCur
              ? `<span class="ml-auto shrink-0 rounded-full bg-moss-900 px-1.5 py-0.5 text-[9px] font-extrabold text-white">${esc(T.legend.envActiveBand)}</span>`
              : ''
            return `<div class="flex items-start gap-2 rounded-xl px-2 py-1.5 text-[11px] leading-snug ${rowCls}">
              <span class="mt-0.5 size-4 shrink-0 rounded-md border border-black/25 shadow-sm" style="background:${esc(b.hex)}"></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-black/10 text-[9px] font-extrabold text-ink">${idx + 1}</span>
                  <span class="font-bold text-ink">${esc(b.label[S.lang])}</span>
                  ${activePill}
                </div>
                ${b.desc?.[S.lang] ? `<p class="mt-0.5 text-[10px] text-muted">${esc(b.desc[S.lang])}</p>` : ''}
              </div>
            </div>`
          })
          .join('')}</div>
      </div>`
    : ''

  const legendExtra = stats.legendDataUrl
    ? `<img src="${esc(stats.legendDataUrl)}" alt="${esc(R.legendAlt)}" class="mt-2 max-h-24 w-auto rounded-lg border border-line bg-white p-1" />`
    : stats.legendUrl
      ? `<a href="${esc(stats.legendUrl)}" target="_blank" rel="noopener noreferrer" class="mt-1.5 inline-flex items-center gap-1 font-bold text-moss-900 underline">${esc(T.legend.envOpenLegend)}</a>`
      : ''

  return `
    <div class="rounded-3xl border border-line bg-white p-4 shadow-card text-xs">
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <p class="font-extrabold text-moss-950">${esc(activeTitle)}</p>
        <span class="rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${mwEnvBadgeClass(meta, false)}">${esc(meta.shortOrg[S.lang])}</span>
      </div>
      <div class="mt-2.5">
        <p class="text-[10px] font-extrabold uppercase tracking-wide text-moss-700">${esc(T.legend.envSelectedAreaTitle)}</p>
        ${areaHtml}
      </div>
      ${spectrumHtml}
      <details class="mt-3 border-t border-line/70 pt-2.5 text-[11px] text-muted">
        <summary class="cursor-pointer select-none font-extrabold text-moss-900 hover:underline">${esc(T.legend.envMoreDetailsBtn)}</summary>
        <div class="mt-2 space-y-1.5 leading-relaxed">
          <div class="flex flex-wrap items-center gap-1.5">${mwEnvSourcePill(meta, activeTitle)}</div>
          <p><span class="break-all font-bold text-ink">${esc(meta.datasetName)}</span> · ${esc(meta.dateLabel[S.lang])}</p>
          <p>${esc(meta.nativeRes[S.lang])} · ${esc(T.legend.envCoverage(stats.coveredCells, stats.totalDeltaCells))}</p>
          <p>${esc(meta.caveat[S.lang])}</p>
          ${legendExtra}
          <p class="text-[10px] font-semibold text-moss-800">${esc(T.legend.dbsclOnlyNote)}</p>
        </div>
      </details>
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
    <div class="max-w-sm rounded-2xl border border-line bg-white/95 p-3 text-xs shadow-lift backdrop-blur">
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

  if (MW.tab === 'field') {
    if (dock) { dock.hidden = true; dock.classList.add('hidden') }
    if (typeof csmClearLayer === 'function') csmClearLayer()
    mfzClearLayer()
    body.innerHTML = mgWorkspaceHtml()
    mdUpdateLiveArea()
    if (typeof wireMotion === 'function') wireMotion() // hiện dần từng thẻ trong khung panel (template: panelIo)
    return
  }

  // Tab 3 "Chi tiết": giữ nguyên các thửa đã vẽ trên bản đồ để bấm chọn thửa ngay tại đây.
  // Đặt TRƯỚC khối "chưa chọn điểm" để khi chưa bấm thửa vẫn hiện đúng details.empty.
  if (MW.tab === 'cond') {
    if (dock) {
      dock.hidden = true
      dock.classList.add('hidden')
    }
    if (typeof csmClearLayer === 'function') csmClearLayer()
    if (typeof mfzClearLayer === 'function') mfzClearLayer()
    if (typeof mgDrawAllGardens === 'function') mgDrawAllGardens()
    body.innerHTML = mwRenderDetailsHtml()
    if (typeof wireMotion === 'function') wireMotion() // hiện dần từng thẻ trong khung panel (template: panelIo)
    return
  }

  // Tab 4 "Chiến thuật": KHÔNG xóa lớp thửa (bug cũ làm mất vùng ruộng/vùng đánh dấu khi bấm Chiến thuật).
  // Panel tinh gọn: tên thửa, diện tích, 1 nút "Tạo chiến thuật" sang trang Luân canh cho đúng thửa đó.
  if (MW.tab === 'compare') {
    if (dock) {
      dock.hidden = true
      dock.classList.add('hidden')
    }
    if (typeof csmClearLayer === 'function') csmClearLayer()
    if (typeof mfzClearLayer === 'function') mfzClearLayer()
    if (typeof mgDrawAllGardens === 'function') mgDrawAllGardens()
    if (typeof mfdDrawLayers === 'function') mfdDrawLayers()
    body.innerHTML = mwStrategyCardHtml()
    if (typeof wireMotion === 'function') wireMotion() // hiện dần từng thẻ trong khung panel (template: panelIo)
    return
  }

  // Tab 2 "Cây phù hợp" tô màu theo tỉnh: ẩn lớp thửa và đóng popup của thửa.
  MG.layer?.clearLayers()
  if (typeof mgClosePopup === 'function') mgClosePopup()

  if (MW.tab === 'suit') {
    if (dock) {
      dock.hidden = true
      dock.classList.add('hidden')
    }
    body.innerHTML = typeof csmRenderHtml === 'function' ? csmRenderHtml() : ''
    if (typeof wireMotion === 'function') wireMotion() // hiện dần từng thẻ trong khung panel (template: panelIo)
    return
  }
}

// Thẻ Tab 4 tối giản: không lặp các khối chi tiết của Tab 3 (đất, tiêu chí, tổng hợp 22 lớp).
function mwStrategyCardHtml() {
  const T = mwT().tab4
  const g = typeof mgActiveGarden === 'function' ? mgActiveGarden() : null
  if (!g && !MF.loc) return `<div class="rounded-3xl border border-dashed border-line bg-white p-5 text-base leading-relaxed text-muted">${esc(T.empty)}</div>`
  const areaM2 = g?.polygon?.length >= 3 ? geoAreaM2(g.polygon) : null
  const area = areaM2 ? `${mfNum(areaM2 / 10000, 2)} ha` : T.noArea
  const name = g?.name || MF.loc?.name || T.point
  const G = typeof mgT === 'function' ? mgT() : null
  // Chú giải màu giữ ngay trong thẻ vì thửa vẫn được tô theo mức phù hợp trên bản đồ ở Tab 4.
  const legend = g && G ? `<div class="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-ink">${Object.entries(G.grades).map(([k, label]) => `<span class="inline-flex items-center gap-1"><i class="inline-block size-3 rounded-sm" style="background:${GARDEN_GRADES[k]}"></i>${esc(label)}</span>`).join('')}</div>` : ''
  return `<div class="rounded-3xl border border-line bg-white p-5 shadow-card" data-reveal="mw-tab4-${esc(g?.id || 'loc')}">
      <p class="text-xs font-extrabold uppercase tracking-wide text-moss-700">${esc(T.eyebrow)}</p>
      <h3 class="mt-1 text-xl font-extrabold tracking-tight text-moss-950">${esc(name)}</h3>
      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"><dt class="font-semibold text-muted">${esc(T.area)}</dt><dd class="font-extrabold tabular-nums text-ink">${esc(area)}</dd></dl>
      <button type="button" data-rf="openFromMap" data-value="${esc(g?.id ?? '')}" class="rf-press rf-cta mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#173d2b] px-5 text-base font-extrabold text-white shadow-card hover:bg-[#254f35]">${icon('sparkles', 'size-5')}${esc(T.cta)}</button>
      <p class="mt-2 text-xs leading-relaxed text-muted">${esc(g ? T.hint : T.hintPoint)}</p>
      ${legend}
    </div>`
}

function mwEnvSynthesisHtml(g) {
  const T = mwT()
  const L = T.legend
  const R = mfT()
  const lat = g?.lat ?? MF.loc?.lat
  const lon = g?.lon ?? MF.loc?.lon
  if (lat == null || lon == null) {
    return `<div class="mt-3 rounded-3xl border border-dashed border-line bg-white p-3.5 text-xs text-muted">${esc(L.synthNoPoint)}</div>`
  }
  const floodCount = g
    ? (DS.marks || []).filter((m) => m.gardenId === g.id && m.type === 'flood').length
    : (DS.marks || []).filter((m) => m.type === 'flood').length
  const syn = emSynthesizeGardenStack(PRECOMPUTED?.envMap, lat, lon, g, floodCount, S.lang)
  if (!syn) return ''
  let covText = L.synthCoverage
    .replace('{n}', String(syn.readCount))
    .replace('{total}', String(syn.totalLayers))
    .replace('{p}', String(syn.profileCount))
  if (syn.cloudCount > 0 && typeof L.synthCloudNote === 'function') {
    covText += ` · ${L.synthCloudNote(syn.cloudCount)}`
  }
  const methodNote = syn.isHeuristic && syn.methodologyNote?.[S.lang]
    ? `<div class="mt-2 rounded-2xl border border-line bg-ground/70 px-3 py-2 text-[11px] leading-relaxed text-ink">
        <span class="mr-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">${esc(L.synthHeuristicTag)}</span>
        <span>${esc(syn.methodologyNote[S.lang])}</span>
      </div>`
    : ''
  const domainsHtml = syn.domains
    .map((d) => `
      <div class="rounded-2xl border px-3 py-2 ${d.tone === 'warn' ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/40'}">
        <p class="text-[11px] font-extrabold text-moss-950">${esc(d.title)}</p>
        <p class="mt-0.5 text-[11px] leading-snug text-ink">${esc(d.summary || '—')}</p>
      </div>`)
    .join('')
  const tacticsHtml = syn.tactics
    .map((tac) => {
      const tone = tac.priority === 'high' ? 'border-amber-300 bg-amber-50/70' : tac.priority === 'med' ? 'border-sky-200 bg-sky-50/50' : 'border-emerald-200 bg-emerald-50/50'
      const driverBtns = (tac.drivers || [])
        .map((k) => `<button type="button" data-mf="layer" data-value="${k}" class="rounded-full border border-moss-200 bg-white px-2 py-0.5 text-[10px] font-bold text-moss-900 hover:border-moss-700">${esc((R.layers[k] ?? k).split('(')[0].trim())}</button>`)
        .join('')
      return `
        <div class="rounded-2xl border p-2.5 ${tone}">
          <p class="text-xs font-extrabold text-moss-950">${esc(tac.title)}</p>
          <p class="mt-1 text-[11px] leading-relaxed text-ink">${esc(tac.detail)}</p>
          ${driverBtns ? `<div class="mt-1.5 flex flex-wrap gap-1">${driverBtns}</div>` : ''}
        </div>`
    })
    .join('')
  const groupsHtml = syn.groups
    .map((grp) => {
      const rows = grp.keys
        .map((key) => {
          const item = syn.items[key]
          const meta = item.meta
          const label = R.layers[key] ?? key
          const swatch = item.hex
            ? `<span class="mt-0.5 inline-block size-3.5 shrink-0 rounded border border-black/15" style="background:${item.hex}"></span>`
            : `<span class="mt-0.5 inline-block size-3.5 shrink-0 rounded border border-dashed border-muted/40"></span>`
          const reading = item.title || L.envNoDataAtPoint
          return `
            <div class="rounded-xl border border-line/70 bg-ground/60 p-2">
              <div class="flex flex-col items-start gap-1.5">
                <button type="button" data-mf="layer" data-value="${key}" class="flex w-full min-w-0 items-start gap-2 text-left hover:underline">
                  ${swatch}
                  <span class="min-w-0 flex-1">
                    <span class="block text-[11px] font-extrabold text-moss-950">${esc(label)}</span>
                    <span class="block text-[11px] leading-snug text-ink">${esc(reading)}</span>
                  </span>
                </button>
                <div class="max-w-full pl-5">${mwEnvSourcePill(meta, meta.shortOrg[S.lang])}</div>
              </div>
            </div>`
        })
        .join('')
      return `
        <div class="mt-2">
          <p class="text-[10px] font-extrabold uppercase tracking-wide text-moss-700">${esc(R.layerGroups?.[grp.id] ?? grp.id)}</p>
          <div class="mt-1 space-y-1">${rows}</div>
        </div>`
    })
    .join('')
  return `
    <div class="mt-3 rounded-3xl border border-line bg-white p-3.5 shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <p class="text-xs font-extrabold uppercase tracking-wide text-moss-900">${esc(L.synthTitle)}</p>
        <span class="rounded-full bg-moss-100 px-2.5 py-0.5 text-[10px] font-extrabold text-moss-900">${esc(covText)}</span>
      </div>
      <p class="mt-1 text-[11px] leading-snug text-muted">${esc(L.synthSubtitle)}</p>
      ${methodNote}
      <div class="mt-2.5 grid gap-1.5">${domainsHtml}</div>
      <div class="mt-2.5 space-y-1.5">${tacticsHtml}</div>
      <details class="mt-3 rounded-2xl border border-line bg-ground/40 p-2.5">
        <summary class="cursor-pointer select-none text-xs font-extrabold text-moss-900">${esc(L.synthAllLayersBtn)}</summary>
        <p class="mt-1 text-[10px] text-muted">${esc(L.synthClickHint)}</p>
        <div class="mt-1.5 space-y-2">${groupsHtml}</div>
      </details>
    </div>`
}

function mwClimateBannerHtml(g, D) {
  const env = g && typeof mgEnvironment === 'function' ? mgEnvironment(g) : null
  const hasRec = g ? Boolean(env?.record || MF.record) : Boolean(MF.record)
  if (hasRec) return ''
  const st = g ? (env?.status ?? MF.status) : MF.status
  if (st === 'loading') {
    return `<div class="rounded-2xl border border-line bg-moss-50/70 px-3.5 py-2.5 text-xs font-semibold text-moss-900" role="status">${esc(D.climateLoading)}</div>`
  }
  if (st === 'failed') {
    const retryAttr = g ? `data-mg="retryEnvironment" data-value="${esc(g.id)}"` : `data-mf="retry"`
    return `<div class="rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950" role="alert">
      <p class="font-semibold">${esc(D.climateFailed)}</p>
      <button type="button" ${retryAttr} class="mt-2 inline-flex min-h-9 items-center rounded-full border border-amber-700 bg-white px-3 text-xs font-extrabold text-amber-900 hover:bg-amber-100">${esc(D.climateRetry)}</button>
    </div>`
  }
  return ''
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
  const cropId = g?.profile?.cropId
  // Cây tự nhập (ngoài thư viện FAO) vẫn hiện đúng tên của bà con.
  const cropName = g ? gmCropLabel(g.profile, S.lang)?.name ?? null : null
  const recCrops = zone?.layers?.['1_soil_type']?.recommended_crops || null
  const marksCount = g ? (DS.marks || []).filter((m) => m.gardenId === g.id).length : (DS.marks || []).length
  const irrigLabel = profile.irrigation ? (FIELD_TEXT[S.lang].irrigation[profile.irrigation] ?? profile.irrigation) : D.unmeasured
  const sowingLabel = profile.season ? (FIELD_TEXT[S.lang].seasons[profile.season] ?? profile.season) : profile.sowing ? (R.months[profile.sowing - 1] ?? `T${profile.sowing}`) : D.unmeasured
  // Hồ sơ mặc định để 'unknown' cho loại đất / loại EC: coi như chưa đo, không in chữ "unknown".
  const SF = DATA_TEXT[S.lang].soilForm
  const ecTypeLabel = profile.ecType && profile.ecType !== 'unknown' ? SF.ecTypes?.[profile.ecType] ?? '' : ''
  const ecText = profile.ec !== '' && profile.ec != null ? `${profile.ec} dS/m${ecTypeLabel ? ` (${ecTypeLabel})` : ''}` : D.unmeasured
  const omText = profile.om != null && profile.om !== '' ? `${profile.om}%` : D.unmeasured
  const soilTypeText = profile.soilType && profile.soilType !== 'unknown' ? SF.soilTypes?.[profile.soilType] ?? profile.soilType : D.unmeasured

  const auto = g ? mwAutoFill(g) : { any: false }
  const row = (k, v) =>
    `<div class="flex items-start justify-between gap-3 border-b border-line/60 py-1.5 text-xs last:border-b-0"><span class="font-semibold text-muted">${esc(k)}</span><span class="text-right font-bold text-ink">${v}</span></div>`

  const criteriaHtml = assess?.result?.criteria?.length
    ? `<div class="mt-2.5 space-y-1.5">${assess.result.criteria
        .map((c) => {
          const ev = c.evidence?.[0]
          return `<div class="flex items-center justify-between gap-2 rounded-xl bg-ground px-2.5 py-1.5 text-xs"><span class="min-w-0 font-semibold text-ink">${esc(R.criteria?.[c.key] ?? c.key)}${ev ? ` · ${showValue(ev, { digits: mfDigits(ev) })}` : ''}</span>${mfGradeBadge(c.grade, R.grades[c.grade], 'xs')}</div>`
        })
        .join('')}</div>`
    : ''

  const dKey = esc(g?.id || 'loc') // khóa reveal: mỗi thửa chỉ chạy hiệu ứng hiện dần một lần
  return `
    <div class="space-y-3">
      <div class="rounded-3xl border border-line bg-white p-4 shadow-card" data-reveal="mw-det-head-${dKey}">
        <h3 class="text-base font-extrabold text-moss-950">${esc(g?.name || MF.loc?.name || D.title)}</h3>
        ${g?.demo ? `<p class="mt-1"><span class="mk-demo-badge">${esc(mgT().demoBadge)}</span> <span class="text-xs text-muted">${esc(mgT().demoHint)}</span></p>` : ''}
        <div class="mt-2">
          ${row(D.areaLabel, esc(areaText))}
          ${row(D.provinceLabel, esc(prov ? (prov[S.lang] ?? prov.vi) : '—'))}
        </div>
      </div>

      <div class="rounded-3xl border border-line bg-white p-4 shadow-card" data-reveal="mw-det-soil-${dKey}">
        <p class="text-xs font-extrabold uppercase tracking-wide text-moss-700">${esc(D.soilTitle)}</p>
        <div class="mt-2">
          ${row(D.phLabel, profile.ph !== '' && profile.ph != null ? esc(String(profile.ph)) : mwEstValue(auto.ph))}
          ${row(D.ecLabel, profile.ec != null && profile.ec !== '' ? esc(ecText) : mwEstValue(auto.ec))}
          ${row(D.organicLabel, esc(omText))}
          ${row(D.soilTypeLabel, profile.soilType && profile.soilType !== 'unknown' ? esc(soilTypeText) : mwEstValue(auto.soil))}
          ${row(D.irrigationLabel, esc(irrigLabel))}
          ${row(D.sowingLabel, profile.season || profile.sowing ? esc(sowingLabel) : mwEstValue(auto.season))}
          ${row(D.marksLabel, esc(String(marksCount)))}
          ${row(D.dateLabel, esc(profile.measuredAt || D.unmeasured))}
          ${profile.notes ? row(D.notesLabel, esc(profile.notes)) : ''}
        </div>
      </div>

      <div class="rounded-3xl border border-line bg-white p-4 shadow-card" data-reveal="mw-det-crop-${dKey}">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-extrabold uppercase tracking-wide text-moss-700">${esc(D.cropTitle)}</p>
          ${assess ? mfGradeBadge(assess.grade, typeof mgT === 'function' ? mgT().grades[assess.grade] : assess.grade, 'xs') : ''}
        </div>
        <p class="mt-1 text-sm font-extrabold text-ink">${cropName ? esc(cropName) : auto.crop ? mwEstValue(auto.crop) : esc(D.noCrop)}</p>
        ${!cropName && recCrops ? `<p class="mt-1 text-xs text-muted"><span class="font-bold text-moss-900">${esc(T.legend.dbsclRecCrop)}</span> ${esc(recCrops)}</p>` : ''}
        ${criteriaHtml}
      </div>

      ${g && auto.any ? `<div class="rounded-3xl border border-[#f1e2b8] bg-[#fdf8ea] p-4 text-xs leading-relaxed text-ink">
        <p>${esc(D.autoNote)}</p>
        <button type="button" data-mg="settings" data-value="${esc(g.id)}" class="mt-2 inline-flex min-h-10 items-center gap-2 rounded-full bg-moss-900 px-4 text-xs font-extrabold text-white">${icon('pencil', 'size-4')}${esc(D.autoBtn)}</button>
      </div>` : ''}
      ${mwClimateBannerHtml(g, D)}
      ${envChart}
      ${mwEnvSynthesisHtml(g)}
      ${g ? `<div class="grid gap-2 sm:grid-cols-2">
        <button type="button" data-mg="settings" data-value="${esc(g.id)}" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-moss-900 bg-white px-4 text-sm font-extrabold text-moss-900 hover:bg-moss-50">${icon('settings', 'size-4')}${esc(D.editBtn)}</button>
        <button type="button" data-mw="compare" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss-900 px-4 text-sm font-extrabold text-white shadow-card hover:bg-moss-800">${icon('scale', 'size-4')}${esc(D.compareBtn)}</button>
        <button type="button" data-mw="pdfGarden" data-value="${esc(g.id)}" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-extrabold text-moss-900 hover:bg-moss-50 sm:col-span-2">${icon('file-down', 'size-4')}${esc(D.pdfBtn)}</button>
      </div>` : ''}
    </div>`
}

/**
 * Tự điền THAM KHẢO cho Tab 3 từ dữ liệu đã có (không ghi vào hồ sơ): pH/độ mặn ô 5 km, nhóm đất bản đồ FAO,
 * lịch vụ MODIS của huyện/tỉnh. Mỗi giá trị kèm nhãn nguồn + "Tham khảo"; bà con vẫn được nhắc nhập số đo.
 */
function mwAutoFill(g) {
  // Đọc đúng kết quả điền thông minh dùng cho màu vườn (mgSmartFill → sfFill), không tự tính riêng.
  const sf = mgSmartFill(g)
  const G = mgT()
  const pick = (k) => {
    const f = sf.fields[k]
    if (f?.origin !== 'auto') return null
    return { value: mgFillText(k, f), src: `${G.fillSrc[f.source] ?? f.source}` }
  }
  const out = { ph: pick('ph'), ec: pick('ec'), soil: pick('soilType'), season: pick('season'), crop: pick('cropId') }
  if (!out.soil && sf.fields.soilType.note) out.soil = { value: sf.fields.soilType.note[S.lang], src: G.fillSrc.faoSoilMap }
  out.any = Boolean(out.ph || out.ec || out.soil || out.season || out.crop)
  return out
}

// "Chưa đo" + dòng ước tính có nguồn và nhãn Tham khảo (không bao giờ hiện như số đo tại ruộng).
function mwEstValue(e) {
  const D = mwT().details
  if (!e) return esc(D.unmeasured)
  return `<span class="block">${esc(D.unmeasured)}</span><span class="block text-[11px] font-semibold text-moss-700">≈ ${esc(e.value)}</span><span class="block text-[10px] font-semibold text-muted">${esc(e.src)} · ${esc(D.estTag)}</span>`
}

function mwCompareHtml(data) {
  const T = mwT()
  const res = MW.evalResult
  if (!res?.evaluated) return `<p class="rounded-3xl border border-dashed border-line bg-white p-5 text-muted">${T.emptyPrompt}</p>`
  const staleHtml = MW.stale
    ? `<div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-sun-400 bg-sun-100 px-4 py-3 text-sm font-bold text-sun-700" role="status">
        <span class="flex items-center gap-2">${icon('triangle-alert', 'size-5')}${esc(T.cond.staleBanner)}</span>
        <button type="button" data-mw="compare" class="min-h-10 rounded-full bg-moss-900 px-4 text-xs font-extrabold text-white">${T.cond.recompareBtn}</button>
      </div>`
    : ''
  // So sánh 3 chiến lược nay nằm ở trang Luân canh (rfBridgeHtml mở sang); ở đây chỉ còn kế hoạch hành động.
  if (FP.strategyId && FP.evalId === res.evaluationId) return staleHtml + fpRenderHtml(res, data)
  return staleHtml
}

function mwNormSearch(s) {
  return psNormalize(s)
}

function mwSearchCatalog() {
  // Địa danh chỉ lấy từ PROVINCES + MEKONG_PROVINCES_GEO; tỉnh ngoài 5 huyện mẫu không mang id (tránh crash districtInputs).
  return mwPlaceCatalog(PROVINCES, MEKONG_PROVINCES_GEO, S.lang)
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
  const catalog = mwSearchCatalog()
  const matches = catalog.filter((item) => [item.name, item.vi, item.en, item.code, item.id].some((x) => x && mwNormSearch(x).includes(norm)))
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
        `<button type="button" data-mw="pickSuggest" data-idx="${catalog.indexOf(m)}" class="min-h-9 rounded-full border border-line bg-ground px-3 text-xs font-bold text-ink hover:border-moss-700 hover:bg-moss-50">${esc(m.name)}</button>`,
    )
    .join('')}</div>`
}

// Chọn một địa danh từ ô tìm kiếm: đang vẽ thửa thì chỉ dời bản đồ, không đổi điểm đang xét.
function mwGoToPlace(match) {
  MW.picking = false
  MW.confirmGeo = false
  mwRenderSearchSuggestions('')
  mwRenderTopNotices()
  if (typeof mdActive === 'function' && mdActive()) {
    MF.map?.setView([match.lat, match.lon], 15)
    return
  }
  MF.map?.setView([match.lat, match.lon], match.zoom ?? 12)
  return mfSelect({ lat: match.lat, lon: match.lon, id: match.id || undefined, name: match.name ?? (S.lang === 'en' ? match.en : match.vi) })
}

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'mw-search-form') return
  e.preventDefault()
  const raw = String(new FormData(e.target).get('q') ?? '').trim()
  if (MW.searchErrTimer) {
    clearTimeout(MW.searchErrTimer)
    MW.searchErrTimer = null
  }
  MW.searchErr = null
  if (!raw) {
    mwRenderTopNotices()
    return
  }
  // Tọa độ "10.03, 105.78" đi trước, vì chuỗi số không phải tên địa danh.
  const ll = geoParseLatLon(raw)
  if (ll) {
    MW.picking = false
    MW.confirmGeo = false
    mwRenderSearchSuggestions('')
    mwRenderTopNotices()
    MF.map?.setView([ll.lat, ll.lon], 14)
    if (!(typeof mdActive === 'function' && mdActive())) mfSelect(ll)
    return
  }
  const match = mwFuzzySearchPlace(raw, mwSearchCatalog())
  if (match) return mwGoToPlace(match)
  MW.searchErr = mwT().search.invalid
  mwRenderTopNotices()
  const inp = $('#mw-search-input')
  inp?.focus()
  inp?.select?.()
  // Thông báo "Không tìm thấy kết quả." tự ẩn sau 5 giây.
  MW.searchErrTimer = setTimeout(() => {
    MW.searchErr = null
    MW.searchErrTimer = null
    mwRenderTopNotices()
  }, 5000)
})

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-mw-tab]')
  if (tab) {
    MW.tab = tab.dataset.mwTab
    if (typeof CSM !== 'undefined') CSM.openMenu = null
    if (typeof MFD !== 'undefined') MFD.mode = null
    MW.picking = false
    if (MW.tab !== 'field' && typeof mdActive === 'function' && mdActive()) mdSetMode('idle')
    if (!mwDesktop() && MW.sheet === 'peek') MW.sheet = 'half'
    mfRenderDynamic()
    return mwAnimateTabBody()
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
    case 'toggleLeftPanel': {
      // Thu gọn / mở lại panel trái trên Desktop; bản đồ cần invalidateSize để lấp chỗ trống.
      MW.leftCollapsed = !MW.leftCollapsed
      const root = $('#mw-root')
      if (root) root.dataset.leftCollapsed = MW.leftCollapsed ? 'true' : 'false'
      const openBtn = $('#mw-left-toggle-map')
      if (openBtn) {
        openBtn.classList.toggle('lg:grid', MW.leftCollapsed)
        openBtn.hidden = !MW.leftCollapsed
      }
      mwFollowPanelResize()
      return
    }
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
      const match = mwSearchCatalog()[Number(b.dataset.idx)]
      if (!match) return
      const inp = $('#mw-search-input')
      if (inp) inp.value = match.name || ''
      return mwGoToPlace(match)
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
    case 'pdfGarden': {
      const g = DS.gardens.find((x) => x.id === b.dataset.value)
      return g ? rfPrintGarden(g) : null
    }
    case 'compare': {
      MW.tab = 'compare'
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
  const valEl = $('#mw-opacity-val')
  if (valEl) valEl.textContent = `${pct}%`
  if (typeof mfUpdateEnvOpacity === 'function') mfUpdateEnvOpacity()
  else if (MF.overlay) MF.overlay.setOpacity(MW.opacity)
  const data = mfCompute()
  if (MFZ.crop && data) mfzRefresh(data)
})
