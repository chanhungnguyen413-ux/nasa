// Trang "Ruộng của tôi" (#/ruong-cua-toi): chọn ruộng trên bản đồ thật → khí hậu NASA POWER + ET0 + cân bằng nước
// → đèn giao thông cho 3 cây có nguồn → chạm vào số nào cũng ra nguồn.
//
// File này chỉ lo GIAO DIỆN. Mọi phép tính nằm ở các hàm thuần (site/logic/*, site/sources/*), đã có test.
// Nó dùng các tiện ích có sẵn trong site/template.html ($, esc, icon, S, wide, closeTerm, openTermEl, PRECOMPUTED…),
// vì build gộp mọi module vào cùng một phạm vi. Leaflet là biến toàn cục: luôn gọi qua `window.L`, vì trong
// template `L` là bảng chữ của trang chủ.
import { evidence, evIsMissing } from '../core/evidence.js'
import { PROVINCES } from '../data/provinces.js'
import { MEKONG_OUTER_RINGS, MEKONG_PROVINCE_BORDERS, MEKONG_PROVINCES_GEO, MEKONG_ENV_LAYER_MAP, mekongFindProvince } from '../data/mekongBoundaries.js'
import { EM_AVAILABLE_KEYS, EM_FILTER_META, emCellAt, emDescribeCell } from '../logic/envMapData.js'
import { CROP_LIB_IDS, CROP_LIBRARY } from '../data/cropLibrary.js'
import { P3_TEXT } from '../i18n/phase3Text.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { cpSort } from '../logic/cropPriority.js'
import { DATA_TEXT } from '../i18n/dataText.js'
import { FIELD_TEXT } from '../i18n/fieldText.js'
import { gmHasBoundary } from '../logic/gardenModel.js'
import { et0Months } from '../logic/et0.js'
import { seasonWindows } from '../logic/rotation.js'
import { districtInputs } from '../logic/rotationInputs.js'
import { fsCalendarSource } from '../logic/fieldStrategies.js'
import { seasonStrip } from '../logic/seasonStrip.js'
import { IRRIGATION_ANSWERS, SUIT_PARAMS, suitAssess, suitFindCrop, suitWindow } from '../logic/suitability.js'
import { wbMonthly } from '../logic/waterBalance.js'
import { GIBS_LAYERS, catalogSource, gibsTileTemplate } from '../sources/catalog.js'
import { powerClimate, powerElevationEvidence, powerReadCache } from '../sources/power.js'
import { ssClimateFor } from '../logic/staticSnapshot.js'

const MF_CROPS = CROP_LIB_IDS // Phase 3: cả thư viện cây (site/data/cropLibrary.js)
const MF = {
  loc: null, // { lat, lon, id?, name? }
  record: null, // bản ghi POWER đã gộp tháng (có .elevation)
  elevation: null,
  origin: null, // 'network' | 'cache' | 'precomputed'
  status: 'idle', // 'idle' | 'loading' | 'ok' | 'failed'
  error: null,
  seq: 0, // chống lẫn kết quả khi người dùng chọn điểm mới trước khi điểm cũ tải xong
  layer: null,
  season: 'ht',
  sowing: 5,
  irrigation: null,
  openWhy: new Set(),
  cropQuery: null,
  priority: null, // ưu tiên của nông dân: null | 'water' | 'market' | 'soil' (chỉ sắp thứ tự trong cùng hạng)
  geo: null, // null | 'locating' | thông báo lỗi
  map: null,
  base: null,
  marker: null,
  overlay: null,
  dbsclBorderLayer: null,
  dbsclEnvLayer: null,
  tileErrors: 0,
}
const MF_LEDGER = new Map() // id → Evidence, cho sổ bằng chứng
let mfLedgerSeq = 0

const mfT = () => FIELD_TEXT[S.lang]
const mfNum = (v, digits = 0) => Number(v).toLocaleString(mfT().locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })
const mfMonthsText = (months) => (months.length > 1 ? `${mfT().months[months[0] - 1]}–${mfT().months[months[months.length - 1] - 1]}` : mfT().months[months[0] - 1])
const mfWhen = (iso) => new Date(iso).toLocaleString(mfT().locale, { dateStyle: 'short', timeStyle: 'short' })

/* ================================================================
 * showValue(): CỬA RA DUY NHẤT cho mọi con số trên trang này.
 * Luôn kèm nhãn loại số liệu; chạm vào thì mở sổ bằng chứng.
 * ================================================================ */
const MF_KIND_STYLE = {
  satellite: 'bg-moss-900 text-white',
  model: 'bg-moss-100 text-moss-900',
  ground: 'bg-lime-100 text-moss-900',
  farmer: 'bg-lime-100 text-moss-900',
  reference: 'bg-moss-50 text-moss-800',
  derived: 'bg-moss-50 text-moss-800',
  simulated: 'border border-dashed border-sun-400 bg-sun-100 text-sun-700',
  missing: 'border border-dashed border-line bg-white text-muted',
}

/** Tên hiển thị của một con số: khóa label dịch qua FIELD_TEXT; không có trong bảng dịch thì giữ nguyên. */
/** Chữ song ngữ evText({vi,en}) → chữ của ngôn ngữ đang chọn; chuỗi thường giữ nguyên. */
const mfTxt = (x) => (x && typeof x === 'object' ? x[S.lang] ?? x.vi : x ?? '')
/** Đơn vị viết trong logic bằng tiếng Việt (vd. 'ngày') → đơn vị của ngôn ngữ đang chọn. */
const mfUnit = (u) => mfT().units[u] ?? u ?? ''
const mfLabel = (ev) => (ev?.label ? mfT().evLabels[ev.label] ?? P3_TEXT[S.lang].evLabels[ev.label] ?? ev.label : ev?.inputName ?? '')

/** Số chữ số thập phân vừa với độ lớn: 0,82 (ẩm vùng rễ) cần 2 chữ số, 304 mm thì không cần. */
const mfDigits = (ev) => (evIsMissing(ev) || Number.isInteger(ev.value) ? 0 : ev.unit === '°C' || Math.abs(ev.value) >= 1 && Math.abs(ev.value) < 10 ? 1 : Math.abs(ev.value) < 1 ? 2 : 0)

function showValue(ev, { digits = 0, compact = false, unit = true } = {}) {
  const id = `ev${++mfLedgerSeq}`
  MF_LEDGER.set(id, ev)
  const R = mfT()
  const tag = `<span class="inline-block whitespace-nowrap rounded-full px-1.5 text-xs font-bold leading-5 ${MF_KIND_STYLE[ev.kind]}">${R.kindTags[ev.kind]}</span>`
  const number = evIsMissing(ev) ? '—' : `${mfNum(ev.value, digits)}${unit && ev.unit ? `<span class="font-semibold text-muted"> ${esc(mfUnit(ev.unit))}</span>` : ''}`
  const aria = `${evIsMissing(ev) ? R.kinds.missing : `${mfNum(ev.value, digits)} ${mfUnit(ev.unit)}`}, ${R.kinds[ev.kind]}`
  return `<button type="button" data-ev="${id}" aria-label="${esc(aria)}" class="tabular inline-flex ${compact ? 'flex-col items-center' : 'items-baseline gap-1.5'} rounded-lg px-1 font-bold text-ink underline decoration-current/30 decoration-dotted underline-offset-4 hover:bg-moss-50">${number}${tag}</button>`
}

/** Sổ bằng chứng: tấm nổi hiện giá trị, loại, nguồn, giai đoạn, độ phân giải, công thức, đầu vào (chạm tiếp được). */
function mfOpenLedger(btn) {
  const ev = MF_LEDGER.get(btn.dataset.ev)
  if (!ev) return
  if (openTermEl === btn) return closeTerm()
  const R = mfT()
  const src = ev.source ? catalogSource(ev.source) : null
  const r = btn.getBoundingClientRect()
  const left = Math.min(Math.max(12, r.left), window.innerWidth - 372)
  const pos = wide() ? `position:absolute;left:${left + scrollX}px;top:${r.bottom + scrollY + 8}px;width:360px` : 'position:fixed;left:12px;right:12px;bottom:12px;max-height:70vh;overflow:auto'
  const row = (label, value) => (value ? `<div class="grid grid-cols-[7.5rem_1fr] gap-2 border-t border-line py-2"><dt class="font-bold text-muted">${label}</dt><dd>${value}</dd></div>` : '')
  const inputs = (ev.inputs ?? []).filter((i) => i && (i.kind !== 'missing' || i.note))
  openTermEl = btn
  $('#popover').innerHTML = `
    <div id="term-pop" role="dialog" aria-label="${esc(mfLabel(ev) || R.ledger.kind)}" class="pop-in z-50 rounded-3xl border border-line bg-white p-5 text-left text-[15px] text-ink shadow-lift" style="${pos}">
      <div class="flex items-start justify-between gap-3">
        <p class="text-base font-extrabold text-moss-900">${esc(mfLabel(ev))}</p>
        <button type="button" data-action="close-term" aria-label="${t().closeTerm}" class="-m-1 rounded-full p-1 text-muted hover:bg-moss-50 hover:text-ink">${icon('x', 'size-4')}</button>
      </div>
      <p class="tabular mt-1 text-2xl font-extrabold">${evIsMissing(ev) ? '—' : `${mfNum(ev.value, Number.isInteger(ev.value) ? 0 : Math.abs(ev.value) < 10 ? 2 : 0)} <span class="text-base font-bold text-muted">${esc(mfUnit(ev.unit))}</span>`}</p>
      <dl class="mt-3 text-sm leading-relaxed">
        ${row(R.ledger.kind, `<span class="rounded-full px-2 py-0.5 text-xs font-bold ${MF_KIND_STYLE[ev.kind]}">${R.kinds[ev.kind]}</span>`)}
        ${row(R.ledger.source, src ? `${esc(src.name[S.lang])}${src.url ? ` · <a href="${src.url}" target="_blank" rel="noopener" class="font-semibold text-moss-700 underline">${R.ledger.open}</a>` : ''}` : '')}
        ${row(R.ledger.period, esc(mfTxt(ev.period)))}
        ${row(R.ledger.resolution, esc(mfTxt(ev.resolution ?? src?.resolution)))}
        ${row(R.ledger.fetched, ev.fetchedAt ? mfWhen(ev.fetchedAt) : '')}
        ${row(R.ledger.formula, esc(mfTxt(ev.formula)))}
        ${row(evIsMissing(ev) ? R.ledger.reason : R.ledger.note, esc(mfTxt(ev.note)))}
        ${row(R.ledger.need, evIsMissing(ev) && ev.need ? R.needs[ev.need] : '')}
        ${row(R.ledger.inputs, inputs.length ? `<span class="flex flex-wrap gap-1.5">${inputs.map((i) => `<span class="inline-flex items-center gap-1">${esc(mfLabel(i))}: ${showValue(i, { digits: Math.abs(i.value ?? 0) < 10 ? 2 : 0 })}</span>`).join('')}</span>` : '')}
      </dl>
    </div>`
}

/* ================================================================
 * Tính toàn bộ kết quả cho điểm đang chọn (hàm thuần ở site/logic/*)
 * ================================================================ */
function mfCompute() {
  if (!MF.record) return null
  const realClimate = powerClimate(MF.record, { origin: MF.origin })
  const lat = evidence({ value: MF.loc.lat, unit: '°', kind: 'farmer', source: 'location', label: mfT().latLabel })
  const elevation = powerElevationEvidence(MF.elevation)
  // Phase 3 (site/pages/myFieldWhatIf.js): giả định mưa ±%, nhiệt độ +°C, phát lại năm khô nhất.
  const scenario = mfwScenario(realClimate)
  const climate = scenario.climate
  const et0 = et0Months(climate.months, { lat, elevation })
  const wb = wbMonthly({ climate, et0 })
  // Số liệu thật để vẽ nét mờ so sánh khi đang giả định.
  const base = scenario.active ? { climate: realClimate, wb: wbMonthly({ climate: realClimate, et0: et0Months(realClimate.months, { lat, elevation }) }) } : null
  let windows = null
  let strip = null
  // Lịch vụ lấy theo cùng quy tắc với Chiến thuật (fsCalendarSource); chỉ dùng khi huyện có trong bản tính sẵn
  // (5 huyện PROVINCES) — các tỉnh ĐBSCL khác (từ ô tìm kiếm) không có id nên không crash districtInputs.
  const calSrc = fsCalendarSource(MF.loc, PROVINCES, undefined, PRECOMPUTED.provinceCal)
  const calId = calSrc.districtId
  const provCal = PRECOMPUTED.provinceCal?.find((p) => p.id === calId)
  if (calId && (PRECOMPUTED.climate.districts.some((d) => d.id === calId) || provCal)) {
    const inputs = districtInputs(PRECOMPUTED, calId)
    windows = seasonWindows(inputs.peakDays)
    if (windows) {
      const monthly = PRECOMPUTED.rule.districts.find((d) => d.id === calId)?.monthly ?? provCal?.monthly
      if (monthly) strip = seasonStrip({ climate: inputs.climate, monthly, windows })
    }
  }
  // Phase 2 (site/pages/myFieldData.js): file tải lên, số đo đất, đánh dấu của nông dân cho ruộng này.
  const user = mfdCollect(climate)
  const extra = mfdSuitInputs(user)
  const results = MF_CROPS.map((crop) => {
    const ndviWindow = windows ? windows.find((w) => w.season === MF.season) : null
    if (!ndviWindow && !MF.sowing) return { crop, known: true, overall: 'gray', worstSeen: null, limiting: [], gradedCount: 0, totalCount: 6, criteria: [], window: null }
    return suitAssess({ crop, window: suitWindow({ ndviWindow, sowingMonth: MF.sowing, crop }), climate, irrigation: MF.irrigation, ...extra })
  })
  const uploadRain = user?.uploads.find((u) => u.upload.passport.variable === 'rain' && u.months)?.months ?? null
  return { climate, et0, wb, windows, strip, results, user, uploadRain, scenario, base }
}

/* ================================================================
 * Khung trang
 * ================================================================ */
const mfPill = (attrs, label, active = false, extra = '') =>
  `<button type="button" ${attrs} aria-pressed="${active}" class="inline-flex min-h-12 items-center gap-2 rounded-full border px-5 text-base font-bold transition-colors ${active ? 'border-moss-900 bg-moss-900 text-white' : 'border-line bg-white text-ink hover:border-moss-700'} ${extra}">${label}</button>`

function renderMyField() {
  if (MF.map) {
    MF.map.remove() // khung trang được vẽ lại (vd. đổi ngôn ngữ): bản đồ cũ gắn với phần tử đã mất
    Object.assign(MF, { map: null, base: null, marker: null, overlay: null, dbsclBorderLayer: null, dbsclEnvLayer: null })
  }
  mwRenderShell()
  mfRenderDynamic()
}

/* Gọi từ showPage() trong template mỗi khi trang này hiện ra: bản đồ chỉ khởi tạo được khi khung đang hiện. */
function myFieldOnShow() {
  mwSyncSheetStyle() // Đồng bộ chiều cao ngay cả khi đã đổi kích thước lúc đang ở trang khác.
  if (!MF.map) mfInitMap()
  else MF.map.invalidateSize()
  mgRestoreSelection()
  mfdRestore() // mở lại trang: chọn lại ruộng đã lưu trên máy
}

function mfInitMap() {
  const Lf = window.L
  const el = $('#mf-map')
  if (!el) return
  if (!Lf) return ($('#mf-map-note').innerHTML = `<p class="font-semibold text-sun-700">${mfT().noLeaflet}</p>`)
  MF.map = Lf.map(el, {
    scrollWheelZoom: true,
    zoomControl: false,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: [[5.5, 100.0], [15.0, 111.0]],
    maxBoundsViscosity: 1.0,
    worldCopyJump: false,
  }).setView(MF.loc ? [MF.loc.lat, MF.loc.lon] : [10.05, 105.55], MF.loc ? 12 : 8)
  const envPane = MF.map.createPane('dbsclEnvPane')
  envPane.style.zIndex = '240'
  const borderPane = MF.map.createPane('dbsclBorderPane')
  borderPane.style.zIndex = '380'
  borderPane.style.pointerEvents = 'none'
  mfUseBase(MW.basemap === 'street' ? 1 : 0)
  mfDrawDbsclBoundaries()
  for (const p of PROVINCES) {
    Lf.circleMarker([p.lat, p.lon], { radius: 7, color: '#0f3d24', weight: 2, fillColor: '#ffffff', fillOpacity: 1 })
      .bindTooltip(esc(p.name))
      .on('click', (e) => {
        if (typeof mdActive === 'function' && mdActive()) return
        if (typeof MFD !== 'undefined' && MFD.mode) return
        if (!MW.picking && (DS.activeGardenId || (typeof mfdPolygon === 'function' && mfdPolygon()))) return
        Lf.DomEvent.stopPropagation(e)
        MW.picking = false
        MW.confirmGeo = false
        mfSelect({ lat: p.lat, lon: p.lon, id: p.id, name: p.name })
      })
      .addTo(MF.map)
  }
  MF.map.on('click', (e) => {
    if (mfdMapClick(e.latlng)) return
    MW.picking = false
    MW.confirmGeo = false
    const lat = Math.round(e.latlng.lat * 1e4) / 1e4
    const lon = Math.round(e.latlng.lng * 1e4) / 1e4
    const prov = mekongFindProvince(lat, lon)
    mfSelect({ lat, lon, name: prov ? (prov[S.lang] ?? prov.vi) : undefined })
  })
  MF.map.on('mousemove', (e) => {
    if (typeof mdHandleMouseMove === 'function') mdHandleMouseMove(e.latlng)
    mfUpdateEnvHover(e.latlng)
  })
  MF.map.on('mouseout', () => mfHideEnvHover())
  mfApplyOverlay()
  mfApplyMarker()
  const initPoly = typeof mfdPolygon === 'function' ? mfdPolygon() : null
  if (initPoly && typeof mgFitGardenOnMap === 'function') mgFitGardenOnMap({ lat: MF.loc.lat, lon: MF.loc.lon, polygon: initPoly })
}

// Bản đồ nền: Ảnh vệ tinh Esri (nhìn rõ bờ ruộng) mặc định khi khoanh thửa → OpenStreetMap → OpenTopoMap.
// Khi một nền lỗi liên tiếp 3 ô ảnh thì tự lùi sang nền kế tiếp; hết nền thì vẫn dùng ranh thửa và số liệu lưu sẵn.
const MF_BASES = [
  { key: 'sat', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 18, attribution: 'Tiles © Esri — Esri, Maxar, Earthstar Geographics' },
  { key: 'street', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  { key: 'topo', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', maxZoom: 17, attribution: 'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | © <a href="https://opentopomap.org">OpenTopoMap</a>' },
]

function mfUseBase(index) {
  const Lf = window.L
  if (!MF.map || !Lf) return
  if (MF.base) MF.base.remove()
  MF.base = null
  MF.tileErrors = 0
  MW.tilesOffline = false
  const def = MF_BASES[index]
  if (!def) {
    MW.tilesOffline = true
    mwRenderLegend()
    return ($('#mf-map-note').innerHTML = `<p class="flex items-center gap-2 text-sm font-semibold text-sun-700">${icon('wifi-off', 'size-4')}${MAP_TEXT[S.lang].legend.offlineTiles}</p>`)
  }
  let loaded = false
  MF.base = Lf.tileLayer(def.url, { maxZoom: def.maxZoom, minZoom: 6, noWrap: true, attribution: def.attribution }).addTo(MF.map)
  MF.base.bringToBack()
  MF.base.on('tileload', () => {
    loaded = true
    MW.tilesOffline = false
  })
  MF.base.on('tileerror', () => {
    MF.tileErrors += 1
    if (!loaded && MF.tileErrors === 3) mfUseBase(index + 1)
  })
  mwRenderLegend()
}

function mfDrawDbsclBoundaries() {
  const Lf = window.L
  if (!MF.map || !Lf) return
  if (MF.dbsclBorderLayer) MF.dbsclBorderLayer.remove()
  MF.dbsclBorderLayer = Lf.layerGroup().addTo(MF.map)
  // 1. Đường biên giới giữa 13 tỉnh/thành trong ĐBSCL
  for (const line of MEKONG_PROVINCE_BORDERS) {
    Lf.polyline(line, { pane: 'dbsclBorderPane', color: '#ffffff', weight: 3.0, opacity: 0.72, interactive: false }).addTo(MF.dbsclBorderLayer)
    Lf.polyline(line, { pane: 'dbsclBorderPane', color: '#1f6b3c', weight: 1.7, opacity: 0.92, dashArray: '5 4', interactive: false }).addTo(MF.dbsclBorderLayer)
  }
  // 2. Đường biên giới bao ngoài toàn vùng Đồng bằng sông Cửu Long
  for (const ring of MEKONG_OUTER_RINGS) {
    Lf.polygon(ring, { pane: 'dbsclBorderPane', color: '#ffffff', weight: 5.5, opacity: 0.88, fill: false, interactive: false }).addTo(MF.dbsclBorderLayer)
    Lf.polygon(ring, { pane: 'dbsclBorderPane', color: '#0b2e1b', weight: 3.2, opacity: 0.98, fill: false, interactive: false }).addTo(MF.dbsclBorderLayer)
  }
  // 3. Nhãn tên 13 tỉnh/thành ĐBSCL
  for (const prov of MEKONG_PROVINCES_GEO) {
    Lf.marker(prov.center, {
      pane: 'dbsclBorderPane',
      interactive: false,
      icon: Lf.divIcon({
        className: 'mk-prov-label-wrap',
        html: `<span class="mk-prov-label">${esc(prov[S.lang] ?? prov.vi)}</span>`,
      }),
    }).addTo(MF.dbsclBorderLayer)
  }
}

const MF_CHUNK_DLAT = 5 / 111.32 // ~5 km theo vĩ độ
const MF_CHUNK_DLON = 5 / (111.32 * Math.cos((10 * Math.PI) / 180)) // ~5 km theo kinh độ tại 10°N

function mfCreateEnvGridLayer(layerKey) {
  const Lf = window.L
  const EnvGrid = Lf.GridLayer.extend({
    createTile(coords) {
      const tile = document.createElement('canvas')
      tile.width = 256
      tile.height = 256
      const ctx = tile.getContext('2d')
      if (!ctx || !MF.map) return tile
      const ox = coords.x * 256
      const oy = coords.y * 256
      const nw = MF.map.unproject([ox, oy], coords.z)
      const se = MF.map.unproject([ox + 256, oy + 256], coords.z)
      if (nw.lat < 8.3 || se.lat > 11.15 || se.lng < 103.35 || nw.lng > 106.95) return tile

      ctx.save()
      ctx.beginPath()
      for (const ring of MEKONG_OUTER_RINGS) {
        for (let i = 0; i < ring.length; i++) {
          const p = MF.map.project(ring[i], coords.z)
          if (i === 0) ctx.moveTo(p.x - ox, p.y - oy)
          else ctx.lineTo(p.x - ox, p.y - oy)
        }
        ctx.closePath()
      }
      ctx.clip()

      const envMap = typeof PRECOMPUTED !== 'undefined' ? PRECOMPUTED?.envMap : null
      const iMin = Math.floor(Math.max(8.3, se.lat) / MF_CHUNK_DLAT)
      const iMax = Math.floor(Math.min(11.15, nw.lat) / MF_CHUNK_DLAT)
      const jMin = Math.floor(Math.max(103.35, nw.lng) / MF_CHUNK_DLON)
      const jMax = Math.floor(Math.min(106.95, se.lng) / MF_CHUNK_DLON)
      for (let i = iMin; i <= iMax; i++) {
        const lat0 = i * MF_CHUNK_DLAT
        const lat1 = (i + 1) * MF_CHUNK_DLAT
        const cLat = (lat0 + lat1) * 0.5
        for (let j = jMin; j <= jMax; j++) {
          const lon0 = j * MF_CHUNK_DLON
          const lon1 = (j + 1) * MF_CHUNK_DLON
          const cLon = (lon0 + lon1) * 0.5
          const s = emCellAt(envMap, layerKey, cLat, cLon)
          if (!s || s.missing || !s.hex) continue
          const p0 = MF.map.project([lat1, lon0], coords.z)
          const p1 = MF.map.project([lat0, lon1], coords.z)
          const x = p0.x - ox
          const y = p0.y - oy
          const w = p1.x - p0.x
          const h = p1.y - p0.y
          ctx.fillStyle = s.hex
          ctx.fillRect(x, y, Math.ceil(w), Math.ceil(h))
          if (w >= 6 && h >= 6) {
            ctx.strokeStyle = 'rgba(255,255,255,0.22)'
            ctx.lineWidth = 0.6
            ctx.strokeRect(x, y, w, h)
          }
        }
      }
      ctx.restore()
      return tile
    },
  })
  return new EnvGrid({
    pane: 'dbsclEnvPane',
    bounds: [[8.3, 103.35], [11.15, 106.95]],
    noWrap: true,
    maxZoom: 18,
    minZoom: 6,
    opacity: Math.min(0.88, MW.opacity * 0.85),
  })
}

function mfHideEnvHover() {
  const el = $('#mf-env-hover')
  if (el) el.hidden = true
}

function mfUpdateEnvHover(latlng) {
  const el = $('#mf-env-hover')
  if (!el) return
  if (!MF.layer || !EM_AVAILABLE_KEYS.includes(MF.layer) || !latlng) {
    el.hidden = true
    return
  }
  const meta = EM_FILTER_META[MF.layer]
  const prov = meta ? mekongFindProvince(latlng.lat, latlng.lng) : null
  if (!prov) {
    el.hidden = true
    return
  }
  const T = mwT()
  const R = mfT()
  const provName = prov[S.lang] ?? prov.vi
  const badgeTone = meta.scope === 'dbscl'
    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
    : 'bg-sky-100 text-sky-950 border-sky-300'
  const filterName = R.layers[MF.layer] ?? MF.layer
  const sourceBadge = `<span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${badgeTone}">${esc(meta.badge[S.lang])}</span>`

  const envMap = typeof PRECOMPUTED !== 'undefined' ? PRECOMPUTED?.envMap : null
  const s = emCellAt(envMap, MF.layer, latlng.lat, latlng.lng)
  const desc = emDescribeCell(MF.layer, s)
  const swatch = s && !s.missing && s.hex
    ? `<span class="size-3.5 shrink-0 rounded-sm border border-black/25" style="background:${esc(s.hex)}"></span>`
    : `<span class="size-3.5 shrink-0 rounded-sm border border-dashed border-slate-400 bg-slate-100"></span>`

  const detailLine = !s || s.missing || !desc
    ? `<span class="text-slate-700">${esc(T.legend.envMissingCell)}</span>`
    : `<span class="font-bold text-ink">${esc(desc.title[S.lang])}</span>`

  el.hidden = false
  el.innerHTML = `
    <div class="flex flex-wrap items-center gap-1.5">
      ${swatch}
      <span class="font-extrabold text-moss-950">${esc(provName)}</span>
      <span class="text-[11px] font-semibold text-muted">${esc(filterName)}</span>
      ${sourceBadge}
    </div>
    <div class="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-ink">
      ${detailLine}
    </div>`
}

function mfCreateClippedGibsLayer(layer) {
  const Lf = window.L
  const ClippedLayer = Lf.GridLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement('canvas')
      tile.width = 256
      tile.height = 256
      const ctx = tile.getContext('2d')
      if (!ctx || !MF.map) {
        setTimeout(() => done(null, tile), 0)
        return tile
      }
      const img = new Image()
      img.onload = () => {
        if (!MF.map) return done(null, tile)
        const ox = coords.x * 256
        const oy = coords.y * 256
        ctx.save()
        ctx.beginPath()
        for (const ring of MEKONG_OUTER_RINGS) {
          for (let i = 0; i < ring.length; i++) {
            const p = MF.map.project(ring[i], coords.z)
            if (i === 0) ctx.moveTo(p.x - ox, p.y - oy)
            else ctx.lineTo(p.x - ox, p.y - oy)
          }
          ctx.closePath()
        }
        ctx.clip()
        ctx.drawImage(img, 0, 0, 256, 256)
        ctx.restore()
        done(null, tile)
      }
      img.onerror = (err) => done(err, tile)
      img.src = gibsTileTemplate(layer).replace('{z}', coords.z).replace('{y}', coords.y).replace('{x}', coords.x)
      return tile
    },
  })
  return new ClippedLayer({
    pane: 'dbsclEnvPane',
    bounds: [[8.3, 103.4], [11.1, 106.9]],
    noWrap: true,
    maxNativeZoom: layer.maxZoom,
    maxZoom: 18,
    minZoom: 6,
    opacity: Math.min(0.48, MW.opacity * 0.52),
    attribution: 'NASA EOSDIS GIBS',
  })
}

function mfApplyMarker() {
  const Lf = window.L
  if (!MF.map || !Lf) return
  if (MF.marker) MF.marker.remove()
  if (typeof mgDrawAllGardens === 'function') mgDrawAllGardens()
  if (typeof mgActiveGarden === 'function' && mgActiveGarden()) { mfdDrawLayers(); return }
  if (!MF.loc) return
  MF.marker = Lf.circleMarker([MF.loc.lat, MF.loc.lon], { radius: 9, color: '#0b2e1b', weight: 3, fillColor: '#b8e55a', fillOpacity: 1 }).addTo(MF.map)
  mfdDrawLayers() // ranh thửa và đánh dấu của nông dân
}

function mfApplyOverlay() {
  const Lf = window.L
  if (MF.overlay) MF.overlay.remove()
  MF.overlay = null
  if (MF.dbsclEnvLayer) MF.dbsclEnvLayer.remove()
  MF.dbsclEnvLayer = null
  if (!MF.map || !Lf) {
    mwRenderLegend()
    return
  }
  if (MF.layer && !EM_AVAILABLE_KEYS.includes(MF.layer)) MF.layer = null
  const envKey = MF.layer && EM_AVAILABLE_KEYS.includes(MF.layer) ? MF.layer : null
  if (envKey) {
    MF.dbsclEnvLayer = Lf.layerGroup().addTo(MF.map)
    // Làm dịu phần bản đồ ngoài ranh giới ĐBSCL để biểu đồ màu sắc nổi bật riêng cho ĐBSCL
    const worldRing = [[-85, -180], [-85, 180], [85, 180], [85, -180]]
    Lf.polygon([worldRing, ...MEKONG_OUTER_RINGS], {
      pane: 'dbsclEnvPane',
      stroke: false,
      fillColor: '#091a10',
      fillOpacity: 0.28,
      interactive: false,
    }).addTo(MF.dbsclEnvLayer)
    mfCreateEnvGridLayer(MF.layer).addTo(MF.dbsclEnvLayer)
  } else {
    mfHideEnvHover()
  }
  mwRenderLegend()
  if (MW.tab === 'cond') mwRenderBody()
}

function mfUpdateEnvOpacity() {
  if (MF.overlay) MF.overlay.setOpacity(Math.min(0.48, MW.opacity * 0.52))
  if (MF.dbsclEnvLayer) {
    MF.dbsclEnvLayer.eachLayer((l) => {
      if (typeof l.setOpacity === 'function') {
        l.setOpacity(Math.min(0.88, MW.opacity * 0.85))
      }
    })
  }
}

/* ================================================================
 * Chọn điểm và tải số liệu: thứ tự mạng → bộ nhớ máy → bản tính sẵn → thiếu
 * Hiện ngay bản có sẵn (nếu có), rồi thay bằng bản mới khi mạng trả lời.
 * ================================================================ */
async function mfSelect(loc) {
  const garden=typeof mgActiveGarden==='function'?mgActiveGarden():null
  if(garden && gmHasBoundary(garden) && Math.abs(garden.lat-loc.lat)<1e-7 && Math.abs(garden.lon-loc.lon)<1e-7) return mgSelectGarden(garden.id,{fit:false})
  mfdOnSelect(loc)
  MF.loc = loc
  if (typeof MW !== 'undefined') Object.assign(MW, { evalResult: null, evalInputKey: null, stale: false })
  const seq = ++MF.seq
  const cached = powerReadCache(loc.lat, loc.lon)
  const stored = loc.id ? PRECOMPUTED.power.find((d) => d.id === loc.id) : null
  if (cached) Object.assign(MF, { record: cached, elevation: cached.elevation ?? null, origin: 'cache' })
  else if (stored) Object.assign(MF, { record: stored.record, elevation: stored.elevation, origin: 'precomputed' })
  else Object.assign(MF, { record: null, elevation: null, origin: null, snap: null })
  Object.assign(MF, { status: 'loading', error: null })
  mfApplyMarker()
  mfRenderDistrictButtons()
  mfRenderDynamic()
  // Không gọi NASA POWER lúc chạy: chưa có bản đúng tọa độ thì dùng snapshot tĩnh gần nhất (huyện mẫu → tỉnh).
  if (seq !== MF.seq) return
  if (!MF.record) {
    const snap = ssClimateFor(PRECOMPUTED, loc.lat, loc.lon, PROVINCES)
    if (snap) Object.assign(MF, { record: snap.record, elevation: snap.elevation, origin: 'snapshot', snap })
  }
  Object.assign(MF, MF.record ? { status: 'ok' } : { status: 'failed', error: mfT().origin.noSnapshot })
  mfRenderDynamic()
}

function mfRenderDistrictButtons() {
  document.querySelectorAll('[data-mf="district"]').forEach((b) => {
    const on = MF.loc?.id === b.dataset.value
    b.setAttribute('aria-pressed', String(on))
    b.classList.toggle('bg-moss-900', on)
    b.classList.toggle('text-white', on)
    b.classList.toggle('border-moss-900', on)
    b.classList.toggle('bg-white/95', !on)
    b.classList.toggle('border-line', !on)
    b.classList.toggle('text-ink', !on)
  })
}

/* ================================================================
 * Phần thay đổi theo điểm đang chọn
 * ================================================================ */
function mfRenderDynamic() {
  if (!$('#mw-panel-body')) return
  closeTerm()
  MF_LEDGER.clear()
  mwRenderBody()
  mwRenderLegend()
}

function mfSelectedHtml() {
  const R = mfT()
  const lat = evidence({ value: MF.loc.lat, unit: '°', kind: 'farmer', source: 'location', label: R.latLabel })
  const lon = evidence({ value: MF.loc.lon, unit: '°', kind: 'farmer', source: 'location', label: R.lonLabel })
  const elev = { ...powerElevationEvidence(MF.elevation), label: R.elevationLabel }
  return `<div class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[28px] border border-line bg-white px-6 py-4 shadow-card">
    <span class="flex items-center gap-2 font-extrabold">${icon('map-pin', 'size-5 text-moss-700')}${R.selected}: ${esc(MF.loc.name ?? R.pointName)}</span>
    <span class="text-base text-muted">${R.latLabel} ${showValue(lat, { digits: 4, unit: false })}</span>
    <span class="text-base text-muted">${R.lonLabel} ${showValue(lon, { digits: 4, unit: false })}</span>
    <span class="text-base text-muted">${R.elevationLabel} ${showValue(elev)}</span>
  </div>`
}

function mfStatusHtml() {
  const R = mfT()
  const when = MF.record ? mfWhen(MF.record.fetchedAt) : ''
  let text
  let tone = 'text-muted'
  if (MF.status === 'loading' && !MF.record) text = R.loading
  else if (MF.status === 'failed' && !MF.record) {
    text = `${R.origin.failed(MF.error)} ${R.needs.retry}.`
    tone = 'text-clay-700'
  } else if (MF.origin === 'network') text = R.origin.network(when)
  else if (MF.origin === 'snapshot') text = R.origin.snapshot(MF.snap?.name ?? '—', MF.snap?.scope, mfNum(MF.snap?.distanceKm ?? 0, 0))
  else if (MF.origin === 'cache') text = MF.status === 'loading' ? R.origin.cache(when) : R.origin.cacheOnly(when)
  else text = MF.status === 'loading' ? R.origin.precomputed(when) : R.origin.precomputedOnly(when)
  const retry = MF.status === 'failed' ? mfPill('data-mf="retry"', `${icon('refresh-cw', 'size-4')}${R.retry}`) : ''
  return `<div class="flex flex-wrap items-center gap-3 text-base font-semibold ${tone}" aria-live="polite">${MF.status === 'loading' ? icon('refresh-cw', 'size-4 animate-spin') : ''}<span>${esc(text)}</span>${retry}</div>`
}

/* ---------------- Bước 2: biểu đồ + bảng ---------------- */
function mfWaterHtml(data) {
  const R = mfT()
  if (!data) return mfStatusHtml()
  return `
    ${mfStatusHtml()}
    <div class="mt-4 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7">
      <div id="mf-chartbody">${mfChartBodyHtml(data)}</div>
      ${mfwPanelHtml(data)}
    </div>
    <div id="mf-tablebox">${mfTableHtml(data)}</div>
    <div id="mf-series">${mfdSeriesHtml(data)}</div>`
}

/** Phần biểu đồ (vẽ lại mỗi lần kéo thanh trượt giả định). */
function mfChartBodyHtml(data) {
  const R = mfT()
  const deficits = data.wb.filter((m) => m.deficit).map((m) => R.months[m.month - 1])
  const years = data.climate.replayYear ? String(data.climate.replayYear) : `${data.climate.years[0]}–${data.climate.years[1]}`
  return `
      ${mfwBannerHtml(data)}
      <h4 class="text-xl font-extrabold">${R.chartTitle}</h4>
      <p class="mt-1 text-base leading-relaxed text-muted">${R.chartSub(years)}</p>
      <div class="mt-4">${mfRainChart(data)}</div>
      <div class="mt-2">${mfTempChart(data)}</div>
      ${mfLegendHtml(Boolean(data.strip), Boolean(data.uploadRain))}
      <p class="mt-3 text-base font-semibold">${deficits.length ? R.deficitSummary(deficits.join(', ')) : R.noDeficit}</p>
      <p class="mt-1 text-base text-muted">${data.strip ? R.stripNote : R.noCalendar}</p>`
}

/** Bảng 12 tháng (vẽ lại mỗi lần kéo thanh trượt giả định). */
function mfTableHtml(data) {
  const R = mfT()
  const rows = [
    ['rain', (m) => m.rain, 0],
    ['rainDry', (m) => m.rainDry, 0],
    ['et0', (m) => m.et0, 0],
    ['balance', (m) => m.balance, 0],
    ['tmax', (m, i) => data.climate.months[i].tmax, 1],
  ]
  return `
    <div class="mt-5 rounded-[28px] border border-line bg-white shadow-card">
      <p class="px-5 pt-5 text-base font-extrabold sm:px-7">${R.tableTitle}</p>
      <div class="mt-3 overflow-x-auto pb-4">
        <table class="w-full min-w-[860px] table-fixed border-collapse text-sm">
          <colgroup><col class="w-44" />${R.months.map(() => '<col />').join('')}</colgroup>
          <thead><tr><th class="sticky left-0 bg-white"></th>${R.months.map((m) => `<th scope="col" class="px-1 pb-2 text-center text-[13px] font-extrabold">${m}</th>`).join('')}</tr></thead>
          <tbody>${rows
            .map(
              ([key, pick, digits]) =>
                `<tr class="border-t border-line"><th scope="row" class="sticky left-0 bg-white py-2 pl-5 pr-2 text-left text-[13px] font-bold text-muted sm:pl-7">${R.rows[key]}</th>${data.wb
                  .map((m, i) => `<td class="px-0.5 py-2 text-center">${showValue(pick(m, i), { digits, compact: true, unit: false })}</td>`)
                  .join('')}</tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>
    </div>`
}

function mfLegendHtml(hasStrip, hasUploadRain = false) {
  const R = mfT()
  const item = (swatch, label) => `<span class="flex items-center gap-2">${swatch}${label}</span>`
  return `<div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-muted">
    ${item('<span class="h-3.5 w-3 rounded-sm bg-water-500"></span>', R.legend.rain)}
    ${item('<span class="h-4 w-0.5 bg-water-700"></span>', R.legend.spread)}
    ${item('<span class="h-1 w-5 rounded-full bg-moss-900"></span>', R.legend.et0)}
    ${item('<span class="size-3.5 rounded-sm bg-clay-100 ring-1 ring-clay-700/30"></span>', R.legend.deficit)}
    ${item('<span class="h-1 w-5 rounded-full bg-[#e07b2a]"></span>', R.legend.tmax)}
    ${hasUploadRain ? item('<span class="size-3 border-2 border-ink bg-white"></span>', DATA_TEXT[S.lang].series.legendUpload) : ''}
    ${hasStrip ? item('<span class="rounded-full border border-dashed border-muted px-1.5 text-xs font-bold">—</span>', R.legend.bare) : ''}
    ${hasStrip ? item(`<span class="text-sun-700">${icon('triangle-alert', 'size-4')}</span>`, R.legend.vulnerable) : ''}
  </div>`
}

// Biểu đồ SVG tự vẽ. viewBox hẹp hơn trên điện thoại để chữ vẫn ≥ 12 px khi thu nhỏ.
function mfChartFrame() {
  const narrow = !wide()
  return { W: narrow ? 520 : 960, fs: narrow ? 18 : 13, padL: narrow ? 58 : 46, padR: 10 }
}

function mfRainChart(data) {
  const R = mfT()
  const { W, fs, padL, padR } = mfChartFrame()
  const H = W === 520 ? 340 : 300
  const top = 14
  const bottom = data.strip ? fs * 4.4 : fs * 2.4
  const plotH = H - top - bottom
  const step = (W - padL - padR) / 12
  const val = (ev) => (evIsMissing(ev) ? null : ev.value)
  const peaks = [...data.wb, ...(data.base?.wb ?? [])].flatMap((m) => [val(m.et0), m.rain.spread?.p90 ?? val(m.rain)]).filter((v) => v !== null)
  const tick = Math.max(...peaks) > 400 ? 100 : 50
  const maxY = Math.ceil((Math.max(...peaks, 1) * 1.05) / tick) * tick
  const y = (v) => top + (1 - v / maxY) * plotH
  const cx = (i) => padL + step * (i + 0.5)
  const parts = []
  for (let v = 0; v <= maxY; v += tick) {
    parts.push(`<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8e1" stroke-width="1"/>`)
    parts.push(`<text x="${padL - 6}" y="${y(v) + fs * 0.35}" font-size="${fs}" fill="#5a6b61" text-anchor="end">${mfNum(v)}</text>`)
  }
  parts.push(`<text x="${padL - 6}" y="${top - 2}" font-size="${fs}" fill="#5a6b61" text-anchor="end">mm</text>`)
  data.wb.forEach((m, i) => {
    const cell = data.strip?.[i]
    if (cell?.isVulnerable) parts.push(`<rect x="${padL + step * i}" y="${top}" width="${step}" height="${plotH}" fill="#fdf1d3" opacity="0.7"/>`)
    const rain = val(m.rain)
    const et = val(m.et0)
    if (rain !== null && et !== null && et > rain) {
      parts.push(`<rect x="${cx(i) - step * 0.42}" y="${y(et)}" width="${step * 0.84}" height="${y(rain) - y(et)}" rx="4" fill="#f6ddd2" stroke="#8f2f14" stroke-opacity="0.25"/>`)
    }
    if (rain !== null) {
      parts.push(`<rect x="${cx(i) - step * 0.22}" y="${y(rain)}" width="${step * 0.44}" height="${Math.max(1, y(0) - y(rain))}" rx="4" fill="#2e86c1"/>`)
      const s = data.climate.months[i].rain.spread
      if (s) parts.push(`<path d="M${cx(i)} ${y(s.p90)}V${y(s.p10)}M${cx(i) - 5} ${y(s.p90)}h10M${cx(i) - 5} ${y(s.p10)}h10" stroke="#1b5a86" stroke-width="2" fill="none"/>`)
    }
    parts.push(`<text x="${cx(i)}" y="${top + plotH + fs * 1.4}" font-size="${fs}" font-weight="700" fill="#10231a" text-anchor="middle">${R.months[i]}</text>`)
    if (cell?.isBare) parts.push(`<text x="${cx(i)}" y="${top + plotH + fs * 2.8}" font-size="${fs * 0.92}" fill="#5a6b61" text-anchor="middle">—</text>`) // dấu "—" như chú giải: chữ đầy đủ chồng lên nhau trên màn hẹp
    if (cell?.isVulnerable) parts.push(`<text x="${cx(i)}" y="${top + plotH + fs * (cell.isBare ? 4.1 : 2.8)}" font-size="${fs}" fill="#7f5306" text-anchor="middle">▲</text>`)
  })
  const pts = data.wb.map((m, i) => (val(m.et0) === null ? null : [cx(i), y(m.et0.value)])).filter(Boolean)
  if (pts.length > 1) {
    parts.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#0f3d24" stroke-width="3" stroke-linejoin="round"/>`)
    for (const [px, py] of pts) parts.push(`<circle cx="${px}" cy="${py}" r="4.5" fill="#0f3d24" stroke="#fff" stroke-width="2"/>`)
  }
  if (data.base) parts.push(...mfwBaseOverlay(data.base, { cx, y, step })) // số liệu thật, nét mờ để so
  if (data.uploadRain) parts.push(...mfdRainOverlay(data.uploadRain, { cx, y })) // mưa của file tải lên: chuỗi riêng có nhãn
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${R.chartAria}" class="block h-auto w-full">${parts.join('')}</svg>`
}

function mfTempChart(data) {
  const R = mfT()
  const { W, fs, padL, padR } = mfChartFrame()
  const H = W === 520 ? 170 : 130
  const top = 12
  const plotH = H - top - fs * 1.2
  const step = (W - padL - padR) / 12
  const values = data.climate.months.map((m) => (evIsMissing(m.tmax) ? null : m.tmax.value))
  const real = values.filter((v) => v !== null)
  if (real.length < 2) return ''
  const lo = Math.floor(Math.min(...real) - 1)
  const hi = Math.ceil(Math.max(...real) + 1)
  const y = (v) => top + (1 - (v - lo) / (hi - lo)) * plotH
  const cx = (i) => padL + step * (i + 0.5)
  const parts = [lo, hi].map((v) => `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8e1"/><text x="${padL - 6}" y="${y(v) + fs * 0.35}" font-size="${fs}" fill="#5a6b61" text-anchor="end">${v}°</text>`)
  const pts = values.map((v, i) => (v === null ? null : [cx(i), y(v)])).filter(Boolean)
  parts.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#e07b2a" stroke-width="3" stroke-linejoin="round"/>`)
  for (const [px, py] of pts) parts.push(`<circle cx="${px}" cy="${py}" r="4" fill="#e07b2a" stroke="#fff" stroke-width="2"/>`)
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${R.tempAria}" class="block h-auto w-full">${parts.join('')}</svg>`
}

/* ---------------- Bước 3: Trồng gì? ---------------- */
const MF_GRADE_STYLE = {
  green: ['bg-lime-100 text-moss-900', 'circle-check'],
  yellow: ['bg-sun-100 text-sun-700', 'triangle-alert'],
  red: ['bg-clay-100 text-clay-700', 'circle-x'],
  gray: ['border border-dashed border-line bg-ground text-muted', 'circle-help'],
}
const mfGradeBadge = (grade, text, big = false) =>
  `<span class="inline-flex items-center gap-2 rounded-full ${big ? 'px-4 py-2 text-lg' : 'px-3 py-1 text-sm'} font-extrabold ${MF_GRADE_STYLE[grade][0]}">${icon(MF_GRADE_STYLE[grade][1], big ? 'size-5' : 'size-4')}${text}</span>`

function mfCropsHtml(data) {
  const R = mfT()
  if (!data) return mfStatusHtml()
  const question = data.windows
    ? `<p class="text-base font-bold">${R.seasonQ}</p><div class="mt-2 flex flex-wrap gap-2">${data.windows.map((w) => mfPill(`data-mf="season" data-value="${w.season}"`, `${R.seasons[w.season]} · ${mfMonthsText(w.months)}`, MF.season === w.season)).join('')}</div>`
    : `<p class="text-base font-bold">${R.sowingQ}</p><div class="mt-2 flex flex-wrap gap-2">${R.months.map((m, i) => mfPill(`data-mf="sowing" data-value="${i + 1}"`, m, MF.sowing === i + 1, 'min-w-12 justify-center px-3')).join('')}</div>`
  const query = MF.cropQuery
    ? `<p class="mt-3 text-base font-semibold ${MF.cropQuery.known ? 'text-moss-900' : 'text-clay-700'}">${esc(MF.cropQuery.known ? R.knownCrop(MF.cropQuery.text) : R.unknownCrop(MF.cropQuery.text))}</p>`
    : ''
  return `
    ${mfdSoilSummaryHtml(data.user)}
    <div class="grid gap-5 rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7 lg:grid-cols-2">
      <div>${question}</div>
      <div><p class="text-base font-bold">${R.irrigationQ}</p><div class="mt-2 flex flex-wrap gap-2">${IRRIGATION_ANSWERS.map((a) => mfPill(`data-mf="irrigation" data-value="${a}"`, R.irrigation[a], MF.irrigation === a)).join('')}</div></div>
      <form data-mf-form="crop" class="lg:col-span-2">
        <label for="mf-crop-input" class="text-base font-bold">${R.otherCrop}</label>
        <div class="mt-2 flex flex-wrap gap-2">
          <input id="mf-crop-input" name="crop" type="text" autocomplete="off" placeholder="${R.otherCropPlaceholder}" class="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-ground px-5 text-base outline-none focus:border-moss-700" />
          <button type="submit" class="min-h-12 rounded-full bg-moss-900 px-5 text-base font-bold text-white hover:bg-moss-800">${R.check}</button>
        </div>
        ${query}
      </form>
    </div>
    ${mfwCropsBannerHtml(data)}
    ${mfPriorityHtml()}
    <div class="mt-5 grid gap-5 lg:grid-cols-3">${cpSort(data.results, MF.priority).map((r) => mfCropCard(r)).join('')}</div>
    <p class="mt-4 text-sm leading-relaxed text-muted">${R.teamParams({ limit: mfNum(SUIT_PARAMS.limitedIrrigationMm), tol: SUIT_PARAMS.cycleToleranceDays, wet: mfNum(SUIT_PARAMS.wetRootFlag, 2), share: S.lang === 'vi' ? 'một nửa' : 'half' })}</p>`
}

/** Ba nút ưu tiên (ít nước / dễ bán / cải tạo đất). Chỉ sắp thứ tự trong cùng hạng (site/logic/cropPriority.js). */
function mfPriorityHtml() {
  const X = P3_TEXT[S.lang].priority
  const note = MF.priority ? `<p class="mt-2 text-base ${MF.priority === 'market' ? 'font-semibold text-sun-700' : 'text-muted'}">${MF.priority === 'market' ? X.marketGap : X[MF.priority]}</p>` : ''
  return `<div class="mt-5">
      <p class="text-base font-bold">${X.title}</p>
      <p class="text-sm text-muted">${X.hint}</p>
      <div class="mt-2 flex flex-wrap gap-2">${mfPill('data-mf="priority" data-value=""', X.none, !MF.priority)}${['water', 'market', 'soil'].map((k) => mfPill(`data-mf="priority" data-value="${k}"`, X.labels[k], MF.priority === k)).join('')}</div>
      ${note}
      <p class="mt-2 text-sm text-muted">${P3_TEXT[S.lang].cropsMore(MF_CROPS.length)}</p>
    </div>`
}

function mfCropCard(r) {
  const R = mfT()
  const open = MF.openWhy.has(r.crop)
  const names = r.limiting.map((k) => R.criteria[k].toLowerCase()).join(', ')
  let summary
  if (r.overall === 'gray') summary = R.summary.gray(r.gradedCount, r.totalCount) + (r.worstSeen ? R.summary.graySeen(R.grades[r.worstSeen]) : '')
  else if (r.overall === 'green') summary = R.summary.green(r.gradedCount, r.totalCount)
  else summary = R.summary.limiting(names)
  const reasonFor = (c) => {
    const n = c.numbers ?? {}
    const d1 = (v) => mfNum(v ?? 0, Number.isInteger(v) ? 0 : 1)
    const fmt = { normal: mfNum(n.deficitNormal ?? 0), dry: mfNum(n.deficitDry ?? 0), limit: mfNum(SUIT_PARAMS.limitedIrrigationMm), window: mfNum(n.window ?? 0), cycleMin: n.cycleMin, cycleMax: n.cycleMax, wet: mfNum(n.wet ?? 0, 2), flag: mfNum(n.flag ?? 0, 2), t: mfNum(n.t ?? 0, 1), ph: d1(n.ph), o1: d1(n.o1), o2: d1(n.o2), a1: d1(n.a1), a2: d1(n.a2) }
    return (R.reasons[c.reason] ?? P3_TEXT[S.lang].reasons[c.reason])(fmt)
  }
  const whyTable = open
    ? `<ul class="mt-4 divide-y divide-line border-t border-line">${r.criteria
        .map(
          (c) => `<li class="py-3">
            <div class="flex flex-wrap items-center justify-between gap-2"><span class="font-extrabold">${R.criteria[c.key]}</span>${mfGradeBadge(c.grade, R.grades[c.grade])}</div>
            <p class="mt-1 text-base leading-relaxed">${esc(reasonFor(c))}</p>
            ${c.evidence.length ? `<p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">${c.evidence.map((ev) => `<span class="inline-flex items-center gap-1">${esc(mfLabel(ev))}: ${showValue(ev, { digits: mfDigits(ev) })}</span>`).join('')}</p>` : ''}
          </li>`,
        )
        .join('')}</ul>`
    : ''
  return `<article class="flex flex-col rounded-[28px] border border-line bg-white p-6 shadow-card">
    <div class="flex items-center justify-between gap-3"><h4 class="text-2xl font-extrabold tracking-tight">${CROP_LIBRARY[r.crop].name[S.lang]}</h4>${icon('sprout', 'size-6 text-moss-700')}</div>
    <div class="mt-4">${mfGradeBadge(r.overall, r.overall === 'gray' ? R.overallGray : R.grades[r.overall], true)}</div>
    <p class="mt-4 text-lg leading-relaxed">${esc(summary)}</p>
    <p class="mt-2 text-base text-muted">${R.graded(r.gradedCount, r.totalCount)} · ${R.windowText(mfMonthsText(r.window.months), mfNum(r.window.days))}</p>
    ${whyTable}
    <div class="mt-auto pt-5">
      <button type="button" data-mf="why" data-value="${r.crop}" aria-expanded="${open}" class="inline-flex min-h-12 items-center gap-2 rounded-full border border-line px-5 text-base font-bold hover:border-moss-700">${open ? R.hideWhy : R.why}${icon('chevron-down', `size-5 transition-transform ${open ? 'rotate-180' : ''}`)}</button>
    </div>
  </article>`
}

/* ================================================================
 * Sự kiện của trang (tự đăng ký, không đụng bộ xử lý chung của template)
 * ================================================================ */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mf]')
  if (!b) return
  const v = b.dataset.value
  switch (b.dataset.mf) {
    case 'step':
      document.getElementById(v)?.scrollIntoView({ block: 'start' }) // cùng cách cuộn với route() của template
      break
    case 'district': {
      const p = PROVINCES.find((x) => x.id === v)
      MW.picking = false
      MW.confirmGeo = false
      if (typeof mdActive === 'function' && mdActive()) {
        MF.map?.setView([p.lat, p.lon], 15)
        if (typeof mgRefreshBox === 'function') mgRefreshBox()
        return
      }
      MF.map?.setView([p.lat, p.lon], 12)
      return mfSelect({ lat: p.lat, lon: p.lon, id: p.id, name: p.name })
    }
    case 'tapmap':
      MW.picking = true
      mwRenderTopNotices()
      return ($('#mf-map-note').innerHTML = `<p class="font-semibold text-moss-900">${MAP_TEXT[S.lang].search.pickingHint}</p>`)
    case 'mylocation': {
      // Lỗi định vị tự ẩn sau 5 giây (MW.geoErrTimer).
      const showGeoErr = (msg) => {
        MF.geo = msg
        mwRenderTopNotices()
        if (MW.geoErrTimer) clearTimeout(MW.geoErrTimer)
        MW.geoErrTimer = setTimeout(() => {
          MF.geo = null
          MW.geoErrTimer = null
          mwRenderTopNotices()
        }, 5000)
      }
      if (MW.geoErrTimer) {
        clearTimeout(MW.geoErrTimer)
        MW.geoErrTimer = null
      }
      if (!navigator.geolocation) return showGeoErr('geolocation is not available')
      MF.geo = 'locating'
      mwRenderTopNotices()
      return navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (MW.geoErrTimer) {
            clearTimeout(MW.geoErrTimer)
            MW.geoErrTimer = null
          }
          MF.geo = null
          MW.picking = false
          MW.confirmGeo = true
          const loc = { lat: Math.round(pos.coords.latitude * 1e4) / 1e4, lon: Math.round(pos.coords.longitude * 1e4) / 1e4 }
          MF.map?.setView([loc.lat, loc.lon], 14)
          mfSelect(loc)
        },
        (err) => showGeoErr(err.message || 'không rõ lý do'),
        { timeout: 10000 },
      )
    }
    case 'layer':
      MF.layer = v === 'none' ? null : v
      mwRenderLayerMenu()
      return mfApplyOverlay()
    case 'season':
      MF.season = v
      mwOnInputsChanged()
      return mfRenderDynamic()
    case 'sowing':
      MF.sowing = Number(v)
      mwOnInputsChanged()
      return mfRenderDynamic()
    case 'irrigation':
      MF.irrigation = v
      mwOnInputsChanged()
      return mfRenderDynamic()
    case 'why':
      if (MF.openWhy.has(v)) MF.openWhy.delete(v)
      else MF.openWhy.add(v)
      return mfRenderDynamic()
    case 'priority':
      MF.priority = v || null
      mwOnInputsChanged()
      return mfRenderDynamic()
    case 'retry':
      return MF.loc && mfSelect(MF.loc)
  }
})

document.addEventListener('submit', (e) => {
  if (e.target.dataset?.mfForm !== 'crop') return
  e.preventDefault()
  const text = String(new FormData(e.target).get('crop') ?? '').trim()
  if (!text) return
  MF.cropQuery = { text, known: Boolean(suitFindCrop(text) && CROP_LIBRARY[suitFindCrop(text)]) }
  mfRenderDynamic()
})

let mfResizeTimer
addEventListener('resize', () => {
  clearTimeout(mfResizeTimer)
  mfResizeTimer = setTimeout(() => S.page === 'myfield' && MF.record && mfRenderDynamic(), 200)
})
