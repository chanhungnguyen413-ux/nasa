# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated to Claude; the user is a first-year CS student and the team's AI engineer, new to web development. Node and npm are installed; Python 3 is installed for the data work.
- **The website is one self-contained file, `index.html`** (user-confirmed). It contains the HTML, compiled Tailwind CSS v4, the inlined Be Vietnam Pro font, inlined lucide icons, all JavaScript and a trimmed copy of the precomputed data, and it works when double-clicked and offline.
- **Pages inside the one file (hash router in `site/template.html`):** Home `#/`, Rotations `#/luan-canh`, Today's field `#/ruong-hom-nay`, Weather `#/thoi-tiet`, Data sources `#/nguon-du-lieu`. Each page is a `<div data-page>`; only the open one is shown. The browser Back button, reloads and shared links keep the page; a plain `#id` (e.g. `#dashboard`) opens the page holding that element and scrolls to it. Separate HTML files were not used because each would have to carry its own ~600 KB of fonts and CSS and the offline, double-click file would be lost.
- **Sources:** everything is edited in `site/` (`template.html`, `styles.css`, `logic/`, `data/`, `i18n/`). `npm run build` (`scripts/build-site.mjs`) regenerates `index.html`. `npm run check:i18n` checks that every string table has the same keys in VI and EN.
- **Data pipeline (Python, `scripts/python/`):** `fetch_ndvi.py` (MODIS NDVI) → `calendar_rule.py` (rule-based crop calendar) → `calendar_kmeans.py` (k-means calendar) → `compare_methods.py` (agreement and sensitivity) and `fetch_power_climate.py` (NASA POWER monthly climate). They write JSON to `site/data/precomputed/` and sanity-check plots to `scripts/python/output/`. The build inlines the JSON, so the page never needs these APIs during a demo.
- **Node checks:** `scripts/test-rotation.mjs`, `scripts/test-rotation-text.mjs` and `scripts/test-season-strip.mjs` print or verify the scoring, the VI/EN sentences and the 12-month strip without a browser.
- **Server:** `server/server.mjs` is a tiny Node server started by `Start Dashboard.bat` or `npm start`. It serves `index.html`, `/api/assistant` (Gemini, key in `.env.local`, server-side only), `/api/lan-qr` (phone QR code), and `/sw.js`, which removes the old design's offline service worker from browsers that had it.
- **Hosting:** laptop only for now, reachable by phones on the same Wi-Fi.

## Users

- **Primary: hackathon judges watching a demo** of the NASA Space Apps 2026 challenge "Field Shift: Adapting Farms with NASA Data". They have a few minutes to understand the idea, see that it works, and judge how well NASA data is used. They may not know agronomy or remote sensing.
- **Depicted end users: Mekong Delta farmers and extension officers** deciding together which rotation to try over the next seasons. They are the persona being illustrated, not a confirmed audience of this build.

## Product Purpose

A decision-support tool that helps a farmer and an extension officer explore crop-rotation strategies for a Mekong Delta district. It combines NASA Earth observations (MODIS NDVI, NASA POWER climate) with crop characteristics (FAO tables), a local 10-year rotation trial (Linh et al.) and the farmer's own priorities. For each of four rotations it shows why it was suggested, the evidence, the benefits, the information gaps and the risks that need local review, with a confidence tag. Success means a judge understands, in about a minute, the path from satellite data to crop calendar to a ranked, explained comparison.

## Positioning

It compares and explains; it does not prescribe. The ranking moves with the farmer's priorities, every number names its source or is marked as an estimate, and the page says plainly what it does not know (one trial site, no market prices, model climate). It supports, and never replaces, farmer and extension-officer judgment.

## Operating Context

- Shown live at a hackathon, on a laptop or projector, and possibly on a phone.
- 60-second demo path: Home → "So sánh luân canh" (opens the Rotations page) → pick a district → read the 12-month season strip (crop calendar, bare months, vulnerable months) → look at the four rotation cards → drag a priority slider and watch the ranking change → open one card's evidence and risks → tap a term (e.g. luân canh, NDVI) → open the Data sources page from the menu.
- Bilingual audience: Vietnamese and English.

## Capabilities and Constraints

- **Rotation comparison (main feature):** four rotations, Đông Xuân / Hè Thu / Thu Đông: A rice–rice–rice (current practice), B rice–mung bean–rice, C rice–maize–rice, D rice–mung bean–maize. Scores 0–100 for water, soil, income and dry-year risk, a weighted total, each criterion's contribution, and a High / Medium / Low confidence with reasons. Logic in `site/logic/rotation.js`, sourced crop facts in `site/data/rotationCrops.js`, sentences in `site/i18n/rotationText.js`.
- **Crop calendar from NDVI:** two methods (rule-based peaks and k-means) compared; the calendar comes from each district's own NDVI peaks. Chợ Lách shows no clear three-crop calendar and is not ranked; the page says so.
- **12-month season strip:** season, NDVI, bare/flooded months, rain, days ≥ 35 °C, root-zone wetness, and vulnerable months (dry and hot; team-chosen thresholds shown on the page).
- **Sliders:** four priority sliders (remembered), a dry-season rain what-if (−50% to +50%) and a temperature what-if (0 to +4 °C), neither remembered. The temperature slider acts only through water need: FAO-56 ET0 is recalculated with actual vapour pressure held constant, and each season's water need is scaled by the new/old ET0 ratio. Heat tolerance itself is not scored: no source for crop-specific heat thresholds was found.
- **Data-sources section:** each dataset with use, period, resolution and limits; the two-method comparison; what is not used yet; AI disclosure.
- **Glossary:** on-demand explanations, including luân canh, cây họ đậu, cố định đạm, NDVI and bốc thoát hơi nước.
- **Secondary irrigation dashboard** (from the earlier version): demo or live NASA POWER / MODIS / Open-Meteo readings for four plots, per-plot watering advice, map layers, 7-day replay, what-if simulator, share card with QR code, and a Gemini farm assistant that may only use the numbers on the page and falls back to rule-based sample answers without a key. The split of one grid-cell value across the four plots is simulated and labelled.
- **Constraint:** the user is a beginner, so code stays simple and readable, with small, clearly named files and comments that explain why.

## Brand Commitments

- Name: temporary "Mùa Vụ Mekong" / "Mekong Seasons" (the team will pick the final name; change `APP_NAME` in `site/template.html` and the assistant prompt in `server/server.mjs`). The old name "NASA Adapting Farms" was dropped so the product does not read as an official NASA product.
- Removed for honesty (FIELD_SHIFT_PIVOT.md step 1): illustrative farmer stories, Partnership / Meet farmers buttons, the pilot-partner CTA, the unsourced "30–50% water saved" figure, the water-savings log (its "85 m³" came from sample rows) and the drip-vs-flood volume comparison (an unsourced ×1.67 factor). No SMAP data is fetched; soil moisture is labelled "NASA POWER (model estimate)".
- Visual system: lime and moss on a pale ground, documented in `DESIGN.md`.

## Evidence on Hand

- No real field data from the team, farmer users, testimonials, pilots, or partnerships exist. Future work must not invent any of these.
- Evidence used: Linh et al. 2014 and 2015 (10-year trial at Cai Lậy, Tiền Giang, on alluvial clay; the abstracts give results for the upland rotations as a group, not per rotation), FAO Training Manual 3, FAO-56, FAO-29 and FAO "Soils and pulses". Mung bean has no row in several FAO tables; borrowed values are marked.
- The "three rice crops per year" expectation comes from the project brief and still needs an official source before it is quoted as fact.
- The irrigation demo values are placeholders and are shown as simulated.
- There is no official NASA endorsement. The project uses public NASA data sources and must not imply NASA branding or affiliation beyond that.

## Product Principles

1. **Compare, explain, never prescribe.** Show options, reasons and uncertainty; leave the decision to farmers and extension officers.
2. **Every number has a source or an "estimate" tag.** Thresholds the team chose are labelled as such on the page.
3. **Say what is unknown.** Information gaps and risks needing local review are first-class parts of every card, not footnotes.
4. **Demo in a minute.** District → season strip → rotation cards → priorities must be obvious without a guided tour.
5. **Two languages, equal quality.** Vietnamese and English are both complete, never a partial translation.
