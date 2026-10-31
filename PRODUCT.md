# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated to Claude; the user is new to web development. Node 20 and npm are installed on the machine.
- **The website is one self-contained file, `index.html`** (user-confirmed). It contains the HTML, compiled Tailwind CSS v4, the inlined Be Vietnam Pro font, inlined lucide icons and all JavaScript, and it works when double-clicked.
- **Sources:** everything is edited in `site/` (`template.html`, `styles.css`, `logic/`, `data/`, `i18n/`). `npm run build` (`scripts/build-site.mjs`) regenerates `index.html`.
- **Server:** `server/server.mjs` is a tiny Node server started by `Start Dashboard.bat` or `npm start`. It serves `index.html`, `/api/assistant` (Gemini, key in `.env.local`, server-side only), `/api/lan-qr` (phone QR code), and `/sw.js`, which removes the old design's offline service worker from browsers that had it.
- **Old design removed** at the user's request: the React/Vite app and its PWA offline mode are gone (sent to the Recycle Bin). Live NASA data is still cached in the browser for offline use.
- **Hosting:** laptop only for now, reachable by phones on the same Wi-Fi.

## Users

- **Primary: hackathon judges watching a demo.** They have a few minutes to understand the idea, see that it works, and judge how well NASA data is used. They may not know agronomy or remote sensing.
- **Depicted end user (the story the demo tells): farmers.** The dashboard is framed as a tool a farmer would use to decide when and how to irrigate. Farmers are the persona being illustrated, not the confirmed audience of this build.

## Product Purpose

NASA Adapting Farms turns NASA Earth-observation data into plain, actionable farming advice. The dashboard shows three field indicators and, with one tap, produces a specific irrigation recommendation. Success means a judge understands, in under a minute, the path from satellite data to indicator to concrete action.

## Positioning

It translates, rather than just displaying. Raw satellite metrics (soil moisture, NDVI, drought risk) become a specific, timed action, such as drip irrigation for 45 minutes at 18:00. Every technical term can be explained on the spot, so people who aren't experts can follow along.

## Operating Context

- Shown live at a hackathon, on a laptop or projector, and possibly on a phone.
- The presenter walks judges through it: read the three cards, tap "Gợi ý tưới tiêu" / "Irrigation advice", read the recommendation, and click a term (e.g. NDVI) to show the explanation.
- Bilingual audience: Vietnamese and English.

## Capabilities and Constraints

- Three indicator cards: Soil Moisture (e.g. 35%, Low), NDVI / Vegetation Index (e.g. 0.68, Good), and Drought Risk Level (e.g. Medium–High).
- An irrigation advice action that builds a recommendation from those values.
- A Vietnamese / English language switch covering all UI text and the advice.
- On-demand explanations of terms (NDVI, soil moisture, drought risk, drip irrigation, SMAP, MODIS).
- Terminology: SMAP (the NASA soil moisture mission) and MODIS (the source for NDVI) are the named data sources.
- **Two data modes.** Demo mode shows a simulated farm. Live NASA mode shows:
  - NASA POWER topsoil wetness, rain and heat for a chosen Mekong Delta district;
  - MODIS NDVI from the ORNL DAAC subset service;
  - an Open-Meteo 7-day forecast.
  The split of one grid-cell value across the four plots is simulated and labelled.
- **v2 features:** per-plot advice, map layers, a 7-day time-lapse, a what-if simulator, a crop selector, a water-savings log, a share card with a phone QR code, and a Gemini farm assistant. The assistant falls back to rule-based sample answers when no key is set.
- **Assistant key:** the Gemini key lives only in a gitignored `.env.local`.
- **Constraint:** the user is a beginner, so code should stay simple and readable, with small, clearly named files.

## Brand Commitments

- Name: "NASA Adapting Farms". Full title: "NASA Adapting Farms - Smart Agriculture Dashboard".
- The user asked for a nature-toned (green/blue), clean, modern feel in the original brief. This is recorded as a stated preference, not yet a design system.

## Evidence on Hand

- No real field data, farmer users, testimonials, pilots, or partnerships exist. Future work must not invent any of these.
- The demo values (35%, 0.68, Medium–High) are placeholders and should be clearly shown as simulated.
- There is no official NASA endorsement. The project uses public NASA data sources and must not imply NASA branding or affiliation beyond that.

## Product Principles

1. **Action over data.** Every indicator should lead to a decision a farmer could make today.
2. **Explain everything on demand.** No term stays opaque; one tap reveals what it means and how to read it.
3. **Honest about the data.** Say clearly where data comes from and when it is simulated.
4. **Demo in a minute.** The main path (indicators → advice → explanation) must be obvious without a guided tour.
5. **Two languages, equal quality.** Vietnamese and English are both complete, never a partial translation.
