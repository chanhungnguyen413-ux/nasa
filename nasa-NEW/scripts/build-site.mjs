// Builds index.html: ONE self-contained file (HTML + compiled Tailwind CSS + inlined font +
// inlined icons + the advice engine, data and translations from site/).
//
//   npm run build
//
// Edit the files in site/, never the generated index.html.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as Lucide from 'lucide-react'
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

const template = read('site/template.html')

// 1. The shared logic, in dependency order, with import/export keywords removed.
const modules = [
  'site/data/provinces.js',
  'site/i18n/strings.js',
  'site/i18n/glossary.js',
  'site/core/evidence.js',
  'site/logic/assistantFallback.js',
  'site/data/rotationCrops.js',
  'site/data/cropLibrary.js',
  'site/i18n/rotationText.js',
  'site/i18n/sourcesText.js',
  'site/logic/rotationInputs.js',
  'site/logic/rotation.js',
  'site/logic/seasonStrip.js',
  // Phase 1: trang "Ruộng của tôi" (thứ tự phụ thuộc: evidence → nguồn → logic → chữ → trang)
  'site/core/harmonize.js',
  'site/sources/catalog.js',
  'site/sources/upload.js',
  'site/sources/farmerInput.js',
  'site/sources/dataStore.js',
  'site/sources/power.js',
  'site/logic/et0.js',
  'site/logic/waterBalance.js',
  'site/logic/suitability.js',
  'site/logic/fieldData.js',
  'site/logic/whatIf.js',
  'site/logic/strategies.js',
  'site/logic/cropPriority.js',
  'site/logic/zones.js',
  'site/logic/geometry.js',
  'site/logic/fieldStrategies.js',
  'site/i18n/fieldText.js',
  'site/i18n/dataText.js',
  'site/i18n/strategyText.js',
  'site/i18n/phase3Text.js',
  'site/i18n/mapText.js',
  'site/pages/myField.js',
  'site/pages/myFieldData.js',
  'site/pages/myFieldWhatIf.js',
  'site/pages/myFieldZones.js',
  'site/pages/mapDraw.js',
  'site/pages/fieldPlan.js',
  'site/pages/myGardens.js',
  'site/pages/cropSuitMap.js',
  'site/pages/mapWorkspace.js',
  'site/pages/dataHub.js',
  'site/pages/rotationExtras.js',
]

// 0. Leaflet (bản đồ) nhúng thẳng vào trang để chạy được khi mở bằng nhấp đúp. Không dùng ảnh marker của Leaflet.
const leafletJs = read('node_modules/leaflet/dist/leaflet.js')
const leafletCss = read('node_modules/leaflet/dist/leaflet.css')
if (/<\/script/i.test(leafletJs)) throw new Error('leaflet.js chứa "</script": không nhúng thẳng được')

// 1b. Data precomputed in Python (scripts/python/*), trimmed to what the page needs, so the demo works offline.
const pre = (name) => JSON.parse(read(`site/data/precomputed/${name}`))
const climate = pre('climate_monthly.json')
const kmeans = pre('calendar_kmeans.json')
const comparison = pre('method_comparison.json')
const rule = pre('calendar_rule.json')
const ndvi = pre('ndvi_raw.json')
const powerMonthly = pre('power_monthly.json') // scripts/fetch-power-monthly.mjs
const ndviDates = ndvi.districts.flatMap((d) => d.series.map((r) => r.date)).sort()
const PRECOMPUTED = {
  ndvi: {
    source: ndvi.source, method: ndvi.method, years: ndvi.years, fetchedAt: ndvi.fetchedAt,
    first: ndviDates[0], last: ndviDates[ndviDates.length - 1], images: ndvi.districts[0].series.length,
  },
  climate: {
    source: climate.source, label: climate.label, resolution: climate.resolution, years: climate.years, fetchedAt: climate.fetchedAt,
    districts: climate.districts.map(({ id, name, months }) => ({ id, name, months })),
  },
  kmeans: { method: kmeans.method, clusters: kmeans.clusters.map(({ cluster, members, shape }) => ({ cluster, members, shape })) },
  comparison: { overall: comparison.overall, perDistrict: comparison.perDistrict, sensitivity: comparison.sensitivity },
  rule: { params: rule.params, years: rule.years, districts: rule.districts.map(({ id, monthly, bareWindows, cyclesPerYear }) => ({ id, monthly, bareWindows, cyclesPerYear })) },
  power: powerMonthly.districts, // khí hậu NASA POWER + độ cao cho 5 huyện: đường lui khi mất mạng
}

const logic = [`/* ---- site/data/precomputed/*.json (trimmed) ---- */\nconst PRECOMPUTED = ${JSON.stringify(PRECOMPUTED)}`]
  .concat(
    modules.map((file) => {
      const code = read(file)
        .replace(/^import[^\n]*\n/gm, '')
        .replace(/^export (?=(const|function|async function|let|class) )/gm, '')
      return `/* ---- ${file} ---- */\n${code}`
    }),
  )
  .join('\n')

// 2. Icons: every quoted kebab-case word in the template that names a lucide icon.
const pascal = (s) => s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())
// Quét cả template LẪN các module (trước đây chỉ quét template, nên biểu tượng dùng trong site/pages/* bị thiếu).
const words = new Set([...(template + logic).matchAll(/'([a-z][a-z0-9]*(?:-[a-z0-9]+)*)'/g)].map((m) => m[1]))
const icons = {}
for (const w of words) {
  const Comp = Lucide[pascal(w)]
  if (!Comp || typeof Comp !== 'object') continue
  // Strip size/class only from the outer <svg> tag; inner <rect>s need their own width/height.
  const svg = renderToStaticMarkup(createElement(Comp, { size: 24 })).replace(/^<svg[^>]*>/, (tag) =>
    tag.replace(/\s(width|height|class|aria-hidden)="[^"]*"/g, ''),
  )
  icons[w] = svg
}

// 3. Tailwind: compile styles.css against every class the template (and the logic) uses.
const compiler = await compile(read('site/styles.css'), { base: root, onDependency: () => {} })
const scanner = new Scanner({})
const candidates = scanner.scanFiles([
  { content: template, extension: 'html' },
  { content: logic, extension: 'js' },
])
const css = optimize(compiler.build(candidates), { minify: true }).code

// 4. Font: Be Vietnam Pro (latin, latin-ext, vietnamese) inlined as woff2 data URIs.
const fontDir = 'node_modules/@fontsource/be-vietnam-pro'
const fonts = [400, 500, 600, 700, 800]
  .map((w) =>
    read(`${fontDir}/${w}.css`)
      .split('@font-face')
      .filter((block) => block.includes('url(') && /(latin|latin-ext|vietnamese)-\d+-normal\.woff2/.test(block))
      .map((block) => {
        const file = block.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1]
        const data = readFileSync(join(root, fontDir, 'files', file)).toString('base64')
        return `@font-face${block.replace(/src:[^;]+;/, `src:url(data:font/woff2;base64,${data}) format("woff2");`)}`
      })
      .join('\n'),
  )
  .join('\n')

const html = template
  .replace('/*__FONTS__*/', () => fonts)
  .replace('/*__CSS__*/', () => css)
  .replace('/*__ICONS__*/ {}', () => JSON.stringify(icons))
  .replace('/*__LOGIC__*/', () => logic)
  .replace('/*__LEAFLET_CSS__*/', () => leafletCss)
  .replace('/*__LEAFLET_JS__*/', () => leafletJs)

const out = join(root, 'index.html')
writeFileSync(out, html)
console.log(`built ${out} · ${(html.length / 1024).toFixed(0)} KB · ${Object.keys(icons).length} icons · ${candidates.length} class candidates`)
