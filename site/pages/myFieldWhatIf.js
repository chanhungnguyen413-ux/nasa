// Phần Phase 3 của trang "Ruộng của tôi": thanh trượt giả định dưới biểu đồ (mưa ±%, nhiệt độ +°C), nút "Năm khô nhất",
// nút "Về số liệu thật", dải băng "Mô phỏng giả định" và nét mờ số liệu thật trên biểu đồ.
// Phép tính nằm ở site/logic/whatIf.js (hàm thuần, có test). File này chỉ lo giao diện; myField.js gọi các hàm mfw*.
import { evIsMissing } from '../core/evidence.js'
import { P3_TEXT } from '../i18n/phase3Text.js'
import { WI_DEFAULT, WI_PARAMS, wiApply, wiIsActive, wiIsSimulated } from '../logic/whatIf.js'

const MFW = { ...WI_DEFAULT } // giả định không lưu lại: mở lại trang là về số liệu thật
const mfwT = () => P3_TEXT[S.lang].whatIf

/** Khí hậu sau giả định (dùng trong mfCompute). Trả về { climate, driest, dryMonths, active, simulated }. */
function mfwScenario(realClimate) {
  const out = wiApply(realClimate, MFW, { record: MF.record })
  return { ...out, active: wiIsActive(MFW) && (!MFW.replay || Boolean(out.driest) || wiIsSimulated(MFW)), simulated: wiIsSimulated(MFW), replayYear: out.climate.replayYear ?? null }
}

/** Dải băng phía trên biểu đồ: "Mô phỏng giả định" khi thanh trượt ≠ 0; nhãn năm thật khi phát lại năm khô nhất. */
function mfwBannerHtml(data) {
  const X = mfwT()
  const s = data.scenario
  const parts = []
  if (MFW.rainPct !== 0) parts.push(X.partRain(MFW.rainPct, X.scope[MFW.rainScope].toLowerCase()))
  if (MFW.deltaT !== 0) parts.push(X.partTemp(mfNum(MFW.deltaT, Number.isInteger(MFW.deltaT) ? 0 : 1)))
  const sim = s.simulated
    ? `<div class="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-sun-400 bg-sun-100 px-4 py-3 text-base font-bold text-sun-700" role="status">${icon('flask-conical', 'size-5')}<span>${X.banner}</span><span class="font-semibold">${esc(X.bannerText(parts.join(', ')))}</span></div>`
    : ''
  const replay = s.replayYear ? `<div class="mb-4 flex items-center gap-2 rounded-2xl bg-water-100 px-4 py-3 text-base font-bold text-water-700">${icon('calendar-range', 'size-5')}${esc(X.replay(s.replayYear))}</div>` : ''
  return replay + sim
}

/** Nhắc mô phỏng ở bước 3 (đèn giao thông): mọi nơi có số mô phỏng đều phải mang nhãn. */
function mfwCropsBannerHtml(data) {
  if (!data.scenario?.active) return ''
  return `<div class="mt-5">${mfwBannerHtml(data)}</div>`
}

/** Nét mờ của số liệu thật trên biểu đồ mưa: cột mưa viền mờ và đường ET0 mờ. */
function mfwBaseOverlay(base, { cx, y, step }) {
  const parts = []
  base.wb.forEach((m, i) => {
    if (evIsMissing(m.rain)) return
    parts.push(`<rect x="${cx(i) - step * 0.3}" y="${y(m.rain.value)}" width="${step * 0.6}" height="${Math.max(1, y(0) - y(m.rain.value))}" rx="4" fill="none" stroke="#2e86c1" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="4 3"/>`)
  })
  const pts = base.wb.map((m, i) => (evIsMissing(m.et0) ? null : [cx(i), y(m.et0.value)])).filter(Boolean)
  if (pts.length > 1) parts.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#0f3d24" stroke-opacity="0.3" stroke-width="3" stroke-dasharray="6 5"/>`)
  return parts
}

const mfwRange = (key, label, value, min, max, step, unit) => `
  <div>
    <div class="flex items-baseline justify-between gap-3"><label for="mfw-${key}" class="text-base font-bold">${label}</label><output id="mfw-out-${key}" class="tabular text-lg font-extrabold text-moss-900">${mfwFmt(key, value)}${unit}</output></div>
    <input id="mfw-${key}" data-mfw-range="${key}" data-unit="${unit}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" class="range mt-2 h-12 w-full" style="--fill:${((value - min) / (max - min)) * 100}%" />
  </div>`
const mfwFmt = (key, v) => (key === 'rainPct' ? `${v > 0 ? '+' : ''}${v}` : `+${mfNum(v, Number.isInteger(v) ? 0 : 1)}`)

/** Khối thanh trượt dưới biểu đồ. Vẽ một lần; khi kéo chỉ vẽ lại biểu đồ, bảng và đèn (mfwLive). */
function mfwPanelHtml(data) {
  const X = mfwT()
  const s = data.scenario
  const dryText = s.dryMonths.length ? X.scopeHint(s.dryMonths.map((m) => mfT().months[m - 1]).join(', ')) : X.noDry
  const scope = ['dry', 'year'].map((k) => mfPill(`data-mfw="scope" data-value="${k}"`, X.scope[k], MFW.rainScope === k)).join('')
  const driest = s.driest ? X.driestHint(s.driest.year, mfNum(s.driest.dryRainMm)) : X.noDriest
  return `<div id="mf-whatif" class="mt-6 rounded-[24px] border border-dashed border-sun-400 bg-ground p-5 sm:p-6">
      <p class="text-lg font-extrabold">${X.title}</p>
      <p class="mt-1 text-base text-muted">${X.hint}</p>
      <div class="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          ${mfwRange('rainPct', X.rain, MFW.rainPct, WI_PARAMS.rainPct[0], WI_PARAMS.rainPct[1], WI_PARAMS.rainStep, '%')}
          <div class="mt-3 flex flex-wrap gap-2">${mfPill(`data-mfw="preset" data-key="rainPct" data-value="${WI_PARAMS.presets.rainPct}"`, X.preset(`${WI_PARAMS.presets.rainPct}%`))}${scope}</div>
          <p class="mt-2 text-sm text-muted">${dryText}</p>
        </div>
        <div>
          ${mfwRange('deltaT', X.temp, MFW.deltaT, WI_PARAMS.deltaT[0], WI_PARAMS.deltaT[1], WI_PARAMS.deltaTStep, ' °C')}
          <div class="mt-3 flex flex-wrap gap-2">${mfPill(`data-mfw="preset" data-key="deltaT" data-value="${WI_PARAMS.presets.deltaT}"`, X.preset(`+${WI_PARAMS.presets.deltaT} °C`))}</div>
          <p class="mt-2 text-sm text-muted">${X.tempNote}</p>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap items-center gap-3">
        ${mfPill('data-mfw="driest"', `${icon('sun', 'size-5')}${X.driest}`, MFW.replay, s.driest ? '' : 'pointer-events-none opacity-40')}
        ${mfPill('data-mfw="reset"', `${icon('rotate-ccw', 'size-5')}${X.reset}`)}
      </div>
      <p class="mt-2 text-sm text-muted">${driest}</p>
      ${s.active ? `<p class="mt-3 flex items-center gap-2 text-sm text-muted"><span class="h-0.5 w-6 border-t-2 border-dashed border-moss-900/40"></span>${X.legendBase}</p>` : ''}
    </div>`
}

/** Kéo thanh trượt: tính lại và vẽ lại biểu đồ, bảng, chuỗi tải lên và đèn giao thông; thanh trượt giữ nguyên. */
function mfwLive() {
  if (!MF.record || !$('#mf-chartbody')) return
  closeTerm()
  MF_LEDGER.clear()
  const data = mfCompute()
  $('#mf-chartbody').innerHTML = mfChartBodyHtml(data)
  $('#mf-tablebox').innerHTML = mfTableHtml(data)
  $('#mf-series').innerHTML = mfdSeriesHtml(data)
  $('#mf-crops').innerHTML = mfCropsHtml(data)
  if (typeof mfzRefresh === 'function') mfzRefresh(data)
}

document.addEventListener('input', (e) => {
  const key = e.target.dataset?.mfwRange
  if (!key) return
  const input = e.target
  const value = Number(input.value)
  MFW[key] = value
  input.style.setProperty('--fill', `${((value - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`)
  $(`#mfw-out-${key}`).textContent = `${mfwFmt(key, value)}${input.dataset.unit}`
  mfwLive()
})

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mfw]')
  if (!b) return
  switch (b.dataset.mfw) {
    case 'scope':
      MFW.rainScope = b.dataset.value
      break
    case 'preset':
      MFW[b.dataset.key] = Number(b.dataset.value)
      break
    case 'driest':
      MFW.replay = !MFW.replay
      break
    case 'reset':
      Object.assign(MFW, WI_DEFAULT)
      break
  }
  mfRenderDynamic() // nút bấm: vẽ lại cả khối (thanh trượt nhận giá trị mới)
})
