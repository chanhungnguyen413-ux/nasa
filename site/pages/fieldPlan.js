// Kế hoạch hành động & Phiếu trao đổi với cán bộ khuyến nông (Bước G, Guide §3.1, §8.1, Phase 4 mục 5).
// Mỗi kế hoạch luôn gắn chặt với evaluationId của lần đánh giá (Guide §11); chỉ phương án 'eligible'
// mới tạo được kế hoạch áp dụng, phương án khác mang nhãn "Bản xem thử".
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { MAP_TEXT } from '../i18n/mapText.js'
import { P3_TEXT } from '../i18n/phase3Text.js'
import { ROT_TEXT } from '../i18n/rotationText.js'
import { STRAT_TEXT } from '../i18n/strategyText.js'
import { geoAreaM2 } from '../logic/geometry.js'

const FP = { strategyId: null, evalId: null }
const fpT = () => MAP_TEXT[S.lang].plan

function fpOpen(strategyId, evalId) {
  FP.strategyId = strategyId
  FP.evalId = evalId
  mwRenderBody()
}

function fpClose() {
  FP.strategyId = null
  FP.evalId = null
  mwRenderBody()
}

function fpRenderHtml(fieldRes, data) {
  if (!FP.strategyId || !fieldRes?.evaluated || FP.evalId !== fieldRes.evaluationId) return ''
  const strat = fieldRes.strategies.find((s) => s.strategyId === FP.strategyId)
  if (!strat) return ''
  const T = fpT()
  const MT = MAP_TEXT[S.lang]
  const RT = ROT_TEXT[S.lang]
  const ST = STRAT_TEXT[S.lang]
  const FT = mfT()
  const poly = mfdPolygon()
  const isPreview = strat.eligibility !== 'eligible'
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const cropLine = strat.crops.map((c) => cap(CROP_LIBRARY[c]?.name[S.lang] ?? RT.crops[c])).join(' – ')
  const stratName = strat.alsoWins ? `${ST.names[strat.kind]} · ${ST.names[strat.alsoWins]}` : ST.names[strat.kind]

  const scheduleRows = strat.crops
    .map((cropId, i) => {
      const w = strat.windows?.[i]
      const seasonLabel = w ? FT.seasons[w.season] : `${S.lang === 'vi' ? 'Vụ' : 'Season'} ${i + 1}`
      const monthsText = w ? mfMonthsText(w.months) : S.lang === 'vi' ? 'Chưa có lịch NDVI' : 'No NDVI calendar'
      const cropName = CROP_LIBRARY[cropId]?.name[S.lang] ?? RT.crops[cropId]
      const a = strat.assessments[i]
      const gradeBadge = a ? mfGradeBadge(a.overall, a.overall === 'gray' ? FT.overallGray : FT.grades[a.overall]) : ''
      return `<li class="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5">
          <div><span class="font-extrabold text-ink">${esc(seasonLabel)}</span> <span class="text-sm text-muted">(${esc(monthsText)})</span>: <span class="font-bold text-moss-900">${esc(cropName)}</span></div>
          ${gradeBadge}
        </li>`
    })
    .join('')

  const verifyItems = []
  for (const mf of strat.missingFields) {
    verifyItems.push(MT.strat.missingLabel[mf] ?? mf)
  }
  for (const lr of strat.localRisks) {
    const cName = CROP_LIBRARY[lr.crop]?.name[S.lang] ?? lr.crop
    verifyItems.push(`${cName} (${FT.criteria[lr.criterion]} · ${FT.grades[lr.grade]}): ${S.lang === 'vi' ? 'kiểm tra thực địa trước xuống giống' : 'verify on the ground before sowing'}`)
  }
  for (const rc of strat.rot?.reviewRisks ?? []) {
    const cName = RT.crops[rc.crop] ?? rc.crop
    verifyItems.push(`${FT.seasons[rc.season]} · ${cName}: ${rc.code}`)
  }
  if (!verifyItems.length) verifyItems.push(T.verifyEmpty)

  const areaText = poly ? `${mfNum(geoAreaM2(poly) / 1e4, 2)} ha (${mfNum(Math.round(geoAreaM2(poly)))} m²)` : S.lang === 'vi' ? 'Chưa khoanh ranh thửa' : 'No polygon drawn'
  const fetched = MF.record?.fetchedAt ? mfWhen(MF.record.fetchedAt) : '—'

  return `<article id="print-card" class="mt-4 rounded-3xl border border-line bg-white p-5 shadow-card">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-wide text-moss-700">${esc(stratName)}</p>
          <h4 class="mt-0.5 text-xl font-extrabold text-ink">${esc(strat.strategyId)}. ${esc(cropLine)}</h4>
          <p class="mt-1 text-xs font-semibold text-muted">${esc(T.evalTag(fieldRes.evaluationId))}</p>
        </div>
        <button type="button" data-fp="back" class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-bold hover:border-moss-700">${icon('arrow-left', 'size-4')}${T.backCompare}</button>
      </div>

      ${isPreview ? `<p class="mt-3 rounded-2xl border border-dashed border-sun-400 bg-sun-100 px-4 py-3 text-sm font-bold text-sun-700">${esc(MT.strat.previewNote)}</p>` : ''}
      ${data?.scenario?.active ? `<div class="mt-3">${mfwBannerHtml(data)}</div>` : ''}

      <div class="mt-4 grid gap-2 rounded-2xl bg-ground p-3.5 text-sm sm:grid-cols-2">
        <div><span class="font-bold text-muted">${FT.selected}:</span> <span class="font-semibold">${esc(MF.loc?.name ?? `${MF.loc.lat.toFixed(4)}, ${MF.loc.lon.toFixed(4)}`)}</span></div>
        <div><span class="font-bold text-muted">${S.lang === 'vi' ? 'Diện tích' : 'Area'}:</span> <span class="font-semibold">${esc(areaText)}</span></div>
      </div>

      <h5 class="mt-4 text-base font-extrabold">${T.scheduleTitle}</h5>
      <ul class="mt-1 text-sm">${scheduleRows}</ul>

      <h5 class="mt-4 text-base font-extrabold">${T.verifyTitle}</h5>
      <ul class="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink">${verifyItems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>

      <div class="mt-4 border-t border-line pt-3 text-xs text-muted">
        <p><span class="font-bold">${T.sourcesTitle}:</span> NASA POWER (${esc(fetched)}), MODIS MOD13Q1 (2021–2025), FAO Manual 3 / FAO-29 / FAO-56 / ECOCROP.</p>
        <p class="mt-1 font-semibold text-ink">${T.disclaimer}</p>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 print:hidden">
        <button type="button" data-fp="print" class="inline-flex min-h-12 items-center gap-2 rounded-full bg-moss-900 px-5 text-sm font-bold text-white hover:bg-moss-800">${icon('printer', 'size-4')}${T.printBtn}</button>
      </div>
    </article>`
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fp]')
  if (!b) return
  if (b.dataset.fp === 'back') return fpClose()
  if (b.dataset.fp === 'print') return window.print()
})
