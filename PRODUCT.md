# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **The website is one self-contained file, `index.html`**: contains HTML, compiled Tailwind CSS v4, inlined Be Vietnam Pro font, inlined Lucide icons, Leaflet (inlined), all JavaScript modules, and precomputed NASA climate/NDVI JSONs so it works when double-clicked and offline.
- **Hash router (`site/template.html`):** Home `#/`, My field `#/ruong-cua-toi` (map workspace; aliases `#/ruong-hom-nay` and `#/thoi-tiet`), Rotations `#/luan-canh` (district-level comparison), Data `#/du-lieu` (uploads, soil input, sources & provenance; alias `#/nguon-du-lieu`).
- **Sources (`site/`):** pure logic (`site/core/`, `site/logic/`), sourced crop & district data (`site/data/`), data connectors (`site/sources/`), VI/EN string tables (`site/i18n/`), and workspace pages (`site/pages/`). `node scripts/build-site.mjs` regenerates `index.html`; `node scripts/check-i18n.mjs` verifies VI/EN key parity; `node --test scripts/tests/` runs all pure-logic, provenance, syntax, and assistant verification tests.
- **Server (`server/server.mjs`):** local Node server serving `index.html`, `/api/assistant` (Gemini grounded strictly in page state & evidence ledger), `/api/lan-qr`, and `/sw.js`.

## Users

- **Primary: hackathon judges evaluating a demo** of the NASA Space Apps 2026 challenge "Field Shift: Adapting Farms with NASA Data".
- **Depicted end users: Mekong Delta farmers and local extension officers** weighing field boundary context, water-balance risk, and 3-strategy crop transitions together.

## Product Purpose

A field-centered decision-support workspace combining NASA Earth observations (MODIS MOD13Q1 NDVI crop calendars, NASA POWER 2001–2025 daily climate for FAO-56 ET0 and `P − ET0` water balance, NASA GIBS overlays), FAO tables (Manual 3, FAO-56, FAO-29, ECOCROP), Linh et al. (10-year Mekong Delta trial), and the farmer's own field boundary, soil measurements (ECe, pH), irrigation setup, and risk marks.

## Capabilities

1. **Map-first Field Workspace (`#/ruong-cua-toi`):**
   - Full-screen WaterWise-inspired layout: 380 px guided 3-step left panel (desktop) or 3-detent bottom sheet (mobile), 48 px map controls, Esri World Imagery satellite basemap with automatic OSM/OpenTopoMap/offline fallback, GIBS overlays with opacity slider & resolution disclosure, and geolocation confirmation.
   - Polygon & rectangle field boundary drawer (`site/pages/mapDraw.js` + `site/logic/geometry.js`): close-on-first-vertex, undo/redo, draggable vertex handles, midpoint vertex insertion, live area (`ha` & `m²`) and edge lengths, self-intersection/max-area validation (`50 ha` team threshold), GeoJSON import/export, and picking-mode safety so idle map clicks never erase a drawn boundary.
   - **Separated `eligibility` vs `riskLevel` 3-strategy evaluator (`site/logic/fieldStrategies.js`):** ranks eligible options (Baseline, Water-saving, Soil-building), explains unmet constraints without turning ineligibility into false risk, shows `insufficient_data` with `missingFields` checklists outside the 5 NDVI calendar districts or when irrigation/climate is missing, detects stale results (`fsInputKey`) when field inputs change, and opens an evaluation-linked printable/copyable Action Plan (`fieldPlan.js`).
   - **What-if stress tests, crop zones, and evidence ledger:** dry-year replay, rain ±% and temperature +°C (ET0 scaling), sub-field crop-zone map grid (gray-hatch for unverified uniform climate grid), and tap-any-number evidence popovers.
2. **District Rotation Explorer (`#/luan-canh`):** 12-month MODIS NDVI + POWER season strip and 4-rotation comparison with priority weights and temperature/rain what-if sliders.
3. **Data & Transparency Hub (`#/du-lieu`):** CSV/JSON/GeoJSON upload parser with physical bounds & provenance passport, manual ECe/pH entry, dataset limits (including Esri basemap & client libraries), and two-method calendar agreement metrics.
4. **Grounded Assistant:** Gemini chat drawer + rule-based offline fallback; all streamed AI numbers are verified against `MF_LEDGER` and context (`asstVerifyReply`), rejecting hallucinated figures and always reminding users to consult local extension officers.

## Positioning & Commitments

- **Compare, explain, never prescribe.** Supports farmer and extension-officer judgment; never presents NASA data as an official NASA endorsement.
- **Honest units & thresholds:** Area is reported strictly in `ha` and `m²` (local "công" varies by district and is not guessed); team-chosen thresholds (50 ha max field, 15 km borrowed calendar radius, 5-point close-score band, 150 mm limited irrigation) are labeled cleanly.
- **Two languages, equal quality:** VI and EN match across every i18n table (`node scripts/check-i18n.mjs`).
