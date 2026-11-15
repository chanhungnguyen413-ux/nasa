# Field Shift pivot brief (for Claude Code)

Put this file in the project root, next to `PRODUCT.md`, and ask Claude Code to read it first.
It explains how to turn the existing irrigation dashboard into an entry for the
NASA Space Apps 2026 challenge **"Field Shift: Adapting Farms with NASA Data"**.

The owner is a first-year CS student and the team's AI engineer. Keep code simple, small files,
clear names, and explain each change in plain language. The team presents in Vietnamese and English.

---

## 1. The challenge (official text, summarised)

Build a **decision-support tool** that combines NASA Earth observations with local soil information,
crop characteristics and farmer priorities, so farmers can **explore crop-rotation strategies** that
could improve soil health and resilience to changing weather and water conditions.

Required by the Objectives:
- Use NASA datasets (SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE/GRACE-FO, SRTM...).
- Compare **at least three rotation strategies, including the existing rotation**.
- For each strategy show: **why it was suggested, supporting evidence, benefits, information gaps,
  and risks that need local review** by farmers or agricultural experts.
- Highlight **when fields are typically bare** and **seasons when current crops look more vulnerable**.
- The tool supports, and never replaces, farmer judgment and local expertise.

Potential considerations worth scoring on: plain explanations of terms (evapotranspiration, soil-moisture
anomaly, NDVI, water balance); satellite vs ground measurements; comparing two AI/statistical approaches;
explaining model uncertainty; harmonising datasets to a common grid or time step; nutrient cycling,
erosion, organic matter, pest-cycle disruption, water use, market fit; farmer-entered priorities
and constraints; maps, timelines and "what if rain/temperature changes" sliders.

## 2. What exists today (keep / change / remove)

Keep and extend:
- `site/data/live.js`: NASA POWER daily point API (GWETTOP, GWETROOT, PRECTOTCORR, T2M_MAX) and MODIS
  MOD13Q1 NDVI via the ORNL DAAC subset API, for 5 Mekong Delta districts, cached in localStorage.
- Bilingual VI/EN strings (`site/i18n/`), click-a-term glossary, design system (`DESIGN.md`),
  self-contained `index.html` build, offline cache, what-if sliders, Gemini assistant with fallback.

Change:
- The core question moves from "irrigate today?" to "which rotation over the next seasons?".
  Irrigation advice becomes at most a small secondary panel, or is removed.
- The soil-moisture number from NASA POWER is a model estimate, **not a SMAP measurement**. Label it
  "NASA POWER (model estimate)". Only say "SMAP" for data actually fetched from SMAP.
- Rename the product so it does not read as an official NASA product (team chooses the name).
- What-if sliders now change the climate inputs (dry-season rain −/+%, temperature +°C) and re-rank rotations.
- Gemini assistant may only use numbers present on the page; keep the rule-based fallback.

Remove (judges penalise invented evidence):
- "Farmer stories" testimonials, "Partnership"/"Meet farmers" buttons, pilot-partner CTA.
- Unsourced numbers ("30–50% water saved", "85 m³", water-savings log) unless a real source is added.

## 3. Target product

One page, same visual style. Main flow (must work in a 60-second demo):
1. Pick a district (existing 5) and the current rotation (default rice–rice–rice).
2. **Season strip (12 months):** NDVI-derived crop calendar (crop cycles and bare/flooded windows) plus
   monthly climate from NASA POWER (rain, days above 35°C, root-zone wetness). Highlight vulnerable months.
3. **Rotation comparison:** four cards side by side, each with the five required parts
   (why / evidence / benefits / gaps / risks needing local review) and a confidence tag (High / Medium / Low with a reason).
4. **Priority sliders:** save water, improve soil, extra income, low risk. Ranking updates live and shows
   which inputs drove each score.
5. Data-sources section listing each dataset, what it was used for, dates covered, and resolution limits.
6. Footer: "Supports, not replaces, farmer and extension-officer judgment" and a non-affiliation line.

Rotation set (Mekong Delta, seasons Đông Xuân / Hè Thu / Thu Đông):
- A. Rice – Rice – Rice (current practice, baseline)
- B. Rice – Mung bean – Rice (legume, nitrogen fixing, short cycle)
- C. Rice – Maize – Rice (deep roots, feed market)
- D. Rice – Mung bean – Maize (one rice crop, two upland crops)

Evidence to cite (open the links, quote numbers exactly):
- Linh et al., Soil & Tillage Research 154 (2015) 44–52, 10-year Mekong Delta trial of exactly A–D:
  upland-crop rotations improved bulk density, porosity, aggregate stability; deeper rice roots;
  rice yield 32–36% higher; profitability about 2.5–2.9× vs rice monoculture.
  https://qldiem.ctu.edu.vn/ql/docgia/tacgia-71981/baibao-32809.html
- Same trial (Cai Lay, Tien Giang): higher soil organic matter, labile carbon, available nitrogen.
  https://qldiem.ctu.edu.vn/ql/docgia/tacgia-71981/baibao-13947.html
Information gap to state on the page: one site, alluvial clay soil; acid-sulphate or saline soils and
current market prices are not covered.

## 4. Data and AI work (the owner's part)

Precompute in Python (the owner wants to learn it), write JSON into `site/data/precomputed/`,
and let the page read it so the demo works offline. Fetch live only as an optional refresh.

1. **NDVI time series:** MOD13Q1 250 m 16-day NDVI from the ORNL DAAC MODIS subset API for each district,
   at least 5 years. Check the API's per-request date limit and chunk requests. Use the median of the 3×3 km block, as today.
2. **Crop calendar (two methods, compared):**
   - Rule-based: smooth (e.g. Savitzky–Golay), find peaks/troughs, count cycles per year, mark bare windows
     (NDVI below a threshold).
   - Clustering: k-means on each year's NDVI profile (23 values) to group years/districts by pattern.
   - Report agreement between the two and with the known local calendar (three rice crops per year).
3. **Monthly climate:** NASA POWER long-term data (daily or the monthly/climatology endpoints) for
   PRECTOTCORR, T2M_MAX, GWETROOT; verify parameter names against the POWER parameter list before use.
   Aggregate to 12 months: mean rain, days with T2M_MAX ≥ 35°C, mean root-zone wetness, plus year-to-year spread.
4. **Optional if time:** SMAP soil moisture and GPM IMERG rain for comparison with POWER; one GRACE groundwater
   trend chart for the delta; SRTM elevation as flood/salinity context.
5. **Scoring engine** (`site/logic/rotation.js`): crop table with sourced attributes (water need, cycle length,
   N-fixing, root depth, salinity tolerance, market note) × monthly climate fit → sub-scores for water, soil,
   income, risk; weighted by sliders. Every score keeps a list of reasons and a confidence level.

## 5. Honesty rules (non-negotiable)

- No invented users, testimonials, partners, yields or prices. Simulated values say "simulated".
- Every number on screen has a source or a visible "estimate" tag.
- State resolution limits: MODIS 250 m and POWER ~0.5° describe areas, not single plots.
- Disclose AI use (code assistants, Gemini) in the submission.
- Ask the local organisers whether code written before 14 Nov may be used; if not, use this brief to rebuild during the event.

## 6. Order of work

1. Remove the items in section 2 "Remove"; rename; fix the SMAP labelling. Run `npm run build`, check `index.html` opens.
2. Python: NDVI fetch + crop calendar (both methods) → JSON. Plot it to sanity-check three peaks a year.
3. Python: POWER monthly climate → JSON.
4. `rotation.js` scoring + four comparison cards + sliders + confidence tags, in VI and EN (`npm run check:i18n`).
5. Season strip visual; data-sources section; glossary entries (luân canh, cây họ đậu, cố định đạm, NDVI, bốc thoát hơi nước).
6. Rehearse the 60-second demo; record a 30-second backup video.
