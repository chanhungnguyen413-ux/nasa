# NASA Adapting Farms: full prompt to regenerate the website

This prompt combines every request made during the project into one brief. Give it to an AI coding assistant to rebuild the same website.

---

## PROMPT

Build **"NASA Adapting Farms – Smart Agriculture Dashboard"**, a bilingual (Vietnamese / English) web app for a NASA hackathon demo. It turns NASA Earth-observation data into plain, timed irrigation advice for Mekong Delta (Vietnam) farmers.

**Audience and honesty**
- The audience is hackathon judges watching a demo on a laptop, projector or phone. Farmers are the persona the demo depicts.
- Never invent claims: no fake customers, partners or NASA endorsement.
- Label every simulated number "mô phỏng / simulated".
- The footer says: "Không phải sản phẩm chính thức của NASA / Not an official NASA product".

### 1. Deliverable and tech
- **One fully self-contained `index.html`** containing all HTML, the compiled Tailwind CSS, the inlined Be Vietnam Pro font (full Vietnamese diacritics), inlined icons (lucide) and all JavaScript. It must work when double-clicked (file://).
- Photos are hotlinked from Unsplash (verified aerial rice paddies, fields, storm clouds, cracked soil, drip irrigation, Mekong canal) on dark-green fallbacks, with photographer credits in the footer.
- **Optional served mode** (a tiny local Node server, `server/server.mjs`, started by double-clicking `Start Dashboard.bat`) adds:
  - `/api/assistant`: Google Gemini (`gemini-flash-latest`, falling back to `gemini-flash-lite-latest`), streaming. The API key is read from a private `.env.local` and never sent to the browser.
  - `/api/lan-qr`: a QR code of the laptop's Wi-Fi address, so phones on the same Wi-Fi can open the page.

### 2. Visual style (match the "NEOFARM" agritech reference)
- **Palette:** vibrant lime `#b8e55a` for primary pills and highlights; deep moss `#0b2e1b` / `#0f3d24` / `#155030` for depth; ultra-clean light-gray ground `#f3f5f1` with white cards; ink `#10231a`; muted body `#5a6b61`. Water blue `#2e86c1` is used only for water; amber only for caution and "simulated".
- **Shapes:** fully rounded pill buttons, chips and badges; 24–32px rounded cards.
- **Type:** large, bold, modern headers (Be Vietnam Pro 800) with muted body text. Tabular numerals for all numbers. Nothing smaller than 12px.
- **Motion:**
  - `scroll-behavior: smooth`;
  - fade-in + 24px slide-up on load and on scroll (IntersectionObserver, staggered in grids);
  - count-up stats;
  - the mission sentence darkens word by word as it scrolls into view;
  - card hover lift (`-translate-y-1` + shadow + colour shift, `transition-all duration-300`);
  - a slow zoom on the hero photo.
  All motion is off under `prefers-reduced-motion`.

### 3. Page structure
1. **Nav:** leaf logo "NASA Adapting Farms", section links, a VI/EN pill toggle and a white "Liên hệ / Contact" pill. It is transparent over the hero and turns white on scroll.
2. **Hero:** a full-bleed aerial rice-paddy photo under a deep moss overlay (desaturated), with:
   - heading "Tưới thông minh cho ruộng lúa miền Tây / Smarter irrigation for Mekong rice fields";
   - a muted subline;
   - a dual pill group: lime "Hợp tác / Partnership" (goes to the contact CTA) and outline "Gặp nông dân / Meet farmers" (goes to the stories);
   - a glass chip with today's advice ("Hôm nay: Tưới nhỏ giọt thửa B · 45 phút · 18:00"), which opens the advice;
   - a round scroll arrow.
   The hero plus the stat band must fit in the first screen at 1440×900, with the stat numerals visible at 1280×720.
3. **Stat band** (dark moss) with true numbers only:
   - **3** NASA data sources (SMAP · MODIS · POWER);
   - **5** Mekong districts with live data;
   - **7 days** of forecast;
   - **30–50%** water saved with drip (marked as an estimate).
4. **Mission statement:** "Chúng tôi biến dữ liệu vệ tinh NASA thành [inline photo pill] lời khuyên tưới tiêu mà bất kỳ nông dân nào cũng làm theo được…". The second clause settles in muted grey.
5. **Dashboard, "Ruộng của bạn hôm nay":**
   - **Controls:** Demo / "NASA trực tiếp" (Live NASA) switch, a province picker (live mode), and a crop picker (rice, coffee, vegetables, fruit trees).
   - **Modern "digital farm" map** (SVG), full width:
     - dark moss ground with a faint dot grid, a canal with a moving shimmer, and a canal gate with a pill label;
     - 4 wide glossy plots (A–D, 2×2, about 72% of the width) with soft shadows, crop-row texture, and colour by layer. The dry plot gets a stipple pattern as well as its colour;
     - clearly visible round tree canopies (solid green, lighter crown, soft shadow) at the sides, plus a tree line along the bottom so trees also show in the cropped phone view;
     - floating white data chips on each plot (letter, value, NDVI);
     - lime action pills: "18:00 · 45′" (water), "Chờ mưa" (wait) or "Chưa cần tưới" (fine). On phones the unselected plots get a short "25′";
     - the selected plot has a breathing lime ring;
     - a glowing water line runs from the gate into the plot when advice opens, with bright dashes moving along it;
     - animated rain streaks appear when ≥10 mm of rain is due;
     - chips, action pills, the canal label and the gate label scale up when the map is drawn small, so text stays at 12px or more on phones and tablets. The canal label sits well left of the gate pill so the two never touch.
   - **Layer switch:** Soil moisture / NDVI / Drought.
   - **7-day time-lapse:** a play button and day slider. Past days show "Advice is for today only".
   - **Three reading cards** (rounded, with pill badges, clickable terms):
     - Soil moisture **35% "Thấp"** with a need line at 40% for rice;
     - NDVI **0,68 "Tốt"** on a 0–1 gradient scale;
     - Drought risk **"Trung bình - Cao" (3/5)** as a 5-segment bar (hatched for high).
   - **Big lime "Gợi ý tưới tiêu" card** (Plot B). It opens an **advice panel**:
     - a dark header with the headline (e.g. "Tưới nhỏ giọt thửa B trong 45 phút, lúc 18:00 chiều nay") and summary ("Độ ẩm đất thấp và rủi ro hạn hán tăng. Khuyên dùng: tưới nhỏ giọt 45 phút vào lúc 18:00 chiều nay để tiết kiệm nước.");
     - **Why?** (moisture vs need, drought and dry days, NDVI, 48h rain with the next heavy rain day, avoid 11:00–15:00 evaporation);
     - **How?** (3 numbered steps);
     - a day timeline with the 18:00–18:45 block;
     - water used vs flood irrigation (18 m³ vs 30 m³, about 40% saved);
     - "Lên lịch 18:00" (schedule) and Share buttons.
   - **Per-plot advice:** tap any plot.
     - Plot A (41%): "Thửa A chưa cần tưới".
     - When ≥10 mm of rain is forecast in 48h: "Chưa tưới thửa B: chờ mưa 30 mm".
6. **Solutions carousel:** photo cards with round lime arrow badges and prev/next arrow pills. There are six cards: per-plot advice, what-if, 7-day replay, water saved, share & QR, and farm assistant. Each card jumps to or opens its feature.
7. **Dark "Dự báo thời tiết thông minh" section:**
   - One combined chart, kept uncluttered so no label ever sits on a bar or a line:
     - the 7 measured days: solid moisture bars (lime when below the crop need, green when enough) with the value inside each bar, and a dashed crop-need line;
     - a dotted divider, with "Hôm nay" (today) in the date row;
     - the 7 forecast days: weather icons and max temperature in their own row above the plot, and rain bars in mm scaled to the week's wettest day;
     - NDVI as a separate row of numbers under the dates, not a line;
     - on phones, dates and NDVI show every other day.
   - Two photo cards:
     - "Hiểu độ ẩm và sức khỏe của đất": clickable glossary chips (SMAP, MODIS, NASA POWER, NDVI, soil saturation, drip irrigation) and the data-source list with dates.
     - **What-if simulator:** presets "Mùa khô gay gắt", "Sắp mưa lớn" and "Đủ nước" (the active one is filled lime), plus sliders for average soil moisture, days without rain, rain in the next 48h and max temperature. The map, readings, hero chip and advice all update live. A dashed amber "Giả định" mark appears on everything the scenario changes. "Bỏ giả định" clears it.
8. **Water saved:**
   - a drawn water tank whose fill level shows the savings, with "85 m³ so với tưới tràn trong mùa vụ này (≈ 85 bồn 1.000 lít)" and a "mẫu" (sample) tag;
   - a watering log with "Đánh dấu đã tưới" (mark as done), stored in localStorage;
   - live mode counts only the user's own entries.
9. **Farmer stories:** three testimonial cards with initials avatars, a visible label "Câu chuyện minh họa, không phải khách hàng thật" (illustrative, not real customers), and "minh họa" on each card.
10. **CTA:** a photo background with a white card, "Bắt đầu tưới thông minh hơn", an invitation to pilot partners ("meet the team at the demo booth"), and buttons for today's advice, the assistant and share.
11. **Footer:** data sources, photo credits and the non-affiliation line.
- **Floating lime "Hỏi trợ lý" pill.** On phones, a sticky bottom bar holds the lime advice button and the assistant button.

### 4. Features and logic
- **VI/EN switch** for all text, including the advice. Remember the choice (localStorage).
- **Click-a-term explanations:** dotted-underlined terms (NDVI, soil moisture, drought risk, drip, sprinkler, SMAP, MODIS, NASA POWER, saturation, forecast, evapotranspiration) open a popover. On phones it becomes a bottom sheet. It closes with Esc, a click outside, or ✕.
- **Advice engine** (one engine for everything):
  - Moisture status: below need×0.75 is very low; below need is low.
  - Drought score = 10×deficit + 4×min(dryDays,14)/14 + (1 if tMax≥35, 0.5 if tMax≥33) − 3×min(rain48h,20)/20. Levels: <1.5, <3, <5, <7, else level 4.
  - Minutes = round to 5 of (15 + 80×relative deficit + 4×(level−1)), clamped 15–90.
  - Drip applies minutes/15 mm; volume = mm × area(ha) × 10 m³; flood = 1.67× drip.
  - Watering time is 18:00. If rain ≥10 mm is due within 48h → wait. If there is no deficit → no watering.
- **Crops:**

  | Crop | Need (vol / sat) | Method |
  |---|---|---|
  | Rice | 40% / 75% | drip |
  | Coffee | 28% / 55% | drip |
  | Vegetables | 32% / 62% | sprinkler |
  | Fruit trees | 30% / 58% | drip |

- **Demo data** (21/09/2026), 4 plots of 0.6 ha:

  | Plot | Moisture % over 7 days | NDVI today |
  |---|---|---|
  | A | 52 → 41 | 0.72 |
  | B | 40 → 27 | 0.59 |
  | C | 50 → 36 | 0.70 |
  | D | 50 → 36 | 0.71 |

  Averages today: **35%, NDVI 0.68**. 9 dry days, 35°C. Forecast: dry and hot until Thursday 24/9, then rain of 14 / 22 / 8 / 3 mm from 25/9.
- **Live NASA mode:** 5 farming districts (Cần Thơ · Cờ Đỏ, An Giang · Thoại Sơn, Sóc Trăng · Mỹ Tú, Đồng Tháp · Tháp Mười, Bến Tre · Chợ Lách). The data comes from:
  - NASA POWER daily GWETTOP (topsoil saturation), PRECTOTCORR and T2M_MAX;
  - MODIS MOD13Q1 NDVI via the ORNL DAAC subset API (3×3 km median);
  - the Open-Meteo 7-day forecast.

  Data is cached in localStorage for offline use. The day label shows the data date (NASA lags a few days), and the per-plot spread is labelled simulated.
- **Share:** a printable advice card (Print / Save PDF prints only the card), copy text, native share, and the phone QR code. The card footer says "simulated" in demo mode and names the sources and date in live mode.
- **AI farm assistant:** a slide-in chat drawer with suggested questions. Answers stream in the current language, grounded in the dashboard numbers. When the AI is unavailable, it falls back to rule-based sample answers labelled "Trả lời mẫu".
- **Accessibility:** keyboard-operable plots, focus rings, contrast ≥ 4.5:1 for text, no horizontal scroll at 390px, and a reduced-motion mode.

### 5. Acceptance checks
- Demo defaults: 35% · 0,68 · Trung bình - Cao · "Tưới nhỏ giọt thửa B · 45 phút · 18:00 (thêm C 25′, D 25′)".
- Plot A gives "chưa cần tưới". The "Sắp mưa lớn" preset gives "chờ mưa 30 mm". Coffee changes plot B to 20′.
- Layers, time-lapse, schedule → log, VI/EN, term popovers, live NASA data, share and assistant all work at 1440, 1280×720 and 390 wide.
- No text overlaps any other text, and nothing scrolls sideways, at 1440×900, 1280×720, 1024×768, 768×1024, 390×844 and 360×740. This holds in demo, English, the drought and rain what-ifs, the NDVI layer, live NASA data, and with the advice panel open.
- Trees are clearly visible on the farm map on every screen size, including phones.

---

## Request history (for the report)

1. Asked for a simple React + Tailwind dashboard for "NASA Adapting Farms": nature green/blue tone, 3 cards (soil moisture 35% low, NDVI 0.68 good, drought risk "Trung bình - Cao"), and a "Gợi ý tưới tiêu" button that shows concrete advice (drip irrigation 45 minutes at 18:00).
2. Added a Vietnamese/English switch and click-a-term explanations (e.g. NDVI).
3. Captured the product context (`/impeccable init`): hackathon judges as the audience, NASA data → plain advice.
4. Built it, choosing the farm-related, farmer-friendly visual direction "Farm From Above" (an illustrated farm map).
5. Brainstormed an upgrade and chose: real NASA data mode, what-if simulator, per-plot advice and map layers, forecast and 7-day replay, water-savings tracker, crop selector, today banner and motion, offline/installable app, share card with QR, and an AI farm assistant with a Google Gemini key. The code was split into files.
6. Redesigned everything to match the NEOFARM reference image (lime + deep moss, pill shapes, aerial hero, stat band, card grids, smooth animations) as one self-contained `index.html`. All dashboard features were kept, with true statistics and illustrative stories.
7. Asked for the farm map to be prettier and more modern; it became the dark "digital farm" map.
8. Asked for this summary prompt for the report.
9. Asked to remove the old design and keep only the new one.
10. Asked for the trees on the farm map to be more visible, including on phones.
11. Asked to fix every overlapping label on all devices. The week chart was simplified until each number has its own space.
