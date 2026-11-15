# NGỮ CẢNH RÚT GỌN `nasa-NEW` CHO AGENT Ở PHIÊN MỚI

> Đọc file này (< 80 dòng) + `docs/blueprint/STATE.md` **THAY CHO** việc rà toàn bộ repo hay đọc `docs/blueprint/00-BLUEPRINT.md`.

## 1. Quy tắc CẤM ĐỌC (để không đốt token)
- **KHÔNG BAO GIỜ đọc:** `index.html` (~2,75 MB), `package-lock.json`, `node_modules/`, `.preview/`, `site/data/precomputed/*.json`.
- **KHÔNG BAO GIỜ quét/đọc:** `.claude/skills/impeccable/scripts/data/font-index.json` (1,1 MB) và `live-browser.js` (523 KB).
- **KHÔNG `grep`/`glob` toàn repo.** Chỉ đọc đúng file liên quan tới tác vụ.

## 2. Bản đồ Module `site/` (cập nhật 14/11/2026 — 50 module, 144 tests)
`scripts/build-site.mjs` xóa `import`/`export` và nối toàn bộ **50 module** trong `site/` + `site/template.html` (**1.285 dòng**) thành **1 `<script type="module">` duy nhất** trong `index.html`.
- **Khung & Router (`site/template.html`):**
  - Pages trong `PAGES`: `home` (`#/`), `myfield` (`#/ruong-cua-toi`), `rotations` (`#/luan-canh`), `glossary` (`#/thuat-ngu`), `sources` (`#/du-lieu`).
  - `S` (dòng `269–282`): `{ lang, rotDistrict, rotPriorities, rotWhatIf, rotCurrent, chat, busy, dialog, page, menuOpen }`.
  - `showPage(id)` (dòng `353–373`): đổi trang; gọi `myFieldOnShow()`, `dataHubOnShow()`, và `renderRotations()` khi vào `'rotations'`.
  - `renderRotations()`: chỉ còn tiêu đề + câu nhắc + `<div id="rot-farm">`, gọi thẳng `rfRender()`; `#rot-controls/#rot-strip/#rot-results` ĐÃ GỠ (3 hàm render cũ có guard null).
  - Events toàn cục (dòng `1099–1206`): `click` bắt `[data-ev]`, `[data-term]`, `[data-scrim]`, `[data-action]`; `change` bắt `rotWhatif`, `[data-select="rotDistrict"]`; `input` bắt `rotWeight`, `rotWhatif`.
- **Lớp Dữ liệu & Lưu trữ:**
  - `site/data/cropLibrary.js` (9 cây có nguồn FAO: `rice, mungbean, maize, soybean, groundnut, cabbage, tomato, chili, onion`), `rotationCrops.js` (`SOURCES`, `ROTATIONS` `A–D`, `PROFIT_RATIO_UPLAND`), `provinces.js` (`PROVINCES`: 5 huyện ĐBSCL).
  - `site/sources/dataStore.js`: `DS = { field, gardens, gardenGroups, gardenView, activeGardenId, uploads, soil, marks, saved }`; API: `dsLoad()`, `dsSave()`, `dsSaveGarden()`, `dsSelectGarden(id)`.
  - `site/sources/authStore.js`, `power.js` (cache v2), `catalog.js`, `upload.js`, `farmerInput.js`.
- **Lớp Logic thuần (KHÔNG đụng DOM):**
  - `site/logic/suitability.js` & `rotation.js` *(BỊ KHÓA bởi test hồi quy — không tự ý sửa ngưỡng!)*.
  - `site/logic/fieldStrategies.js` (`fs*`): `fsCalendarSource`, `fsAssessField`, `fsSeasonAlternatives`, `fsInputKey`; `FIELD_STRAT_PARAMS` gồm `closeTotalGap: 5`, `districtRadiusKm: 15`, `severeSalinityFactor: 2.0`, `yellowSeasonPenalty: 6`, `refSeasonGapMonths`.
  - `site/logic/gardenModel.js` (`gm*`): `gmProfileDefaults()`, `gmColor`, `gmVisibleGardens`, `gmSoilInputs`, `gmAssessGarden`.
  - `strategies.js`, `zones.js`, `whatIf.js`, `geometry.js` (`GEO_PARAMS.districtRadiusKm`), `fieldData.js`, `seasonStrip.js`, `waterBalance.js`, `et0.js`, `assistantFallback.js`.
- **Lớp Giao diện (`site/pages/`) & Từ điển (`site/i18n/`):**
  - `rotationFarm.js` (`rf*`, `RF = { view, irrigation, ph, ece }`): quản lý `#rot-farm` trên `#/luan-canh` và thẻ 5 mục dùng chung cho Tab `4. Chiến thuật`.
  - `glossaryPage.js` (`gp*`, `GP = { cat, query, focus }`): trang `#/thuat-ngu`, `renderGlossary()`, `gpFold`/`gpFilter` (thuần, có test); mỗi mục `GLOSSARY` có `category`; chữ ở `REDESIGN_TEXT.*.glossaryPage`.
  - `mapWorkspace.js` (`mw*` / `MW`): 4 tab `field | suit | cond | compare`; `myGardens.js` (`mg*`); `cropSuitMap.js` (`csm*`); `myField*.js`; `rotationExtras.js` (`rx*`); `dataHub.js`; `fieldPlan.js` (`fp*`); `mapDraw.js` (`md*`).
  - `i18n/`: `strategyText.js` (`STRAT_TEXT[lang].farm`), `mapText.js`, `gardenText.js`, `redesignText.js`, `rotationText.js`, `fieldText.js`, `dataText.js`, `sourcesText.js`, `phase3Text.js`, `glossary.js`, `strings.js`.
  - Font: Plus Jakarta Sans + Fraunces (+ Be Vietnam Pro dự phòng) nhúng offline bởi `fontFaces()` trong `build-site.mjs`.
  - CSS: `styles.css` (skeleton `[data-reveal]::after`), `redesign.css` (giao diện nasa-UI-UX) (`#f7f8f2`, `#254f35`, `#628d39`, `#dfe5d9`, `#192d22`), `gardens.css`, **`hitech.css`** (15/11: lớp HUD + motion chung, nạp CUỐI trong `build-site.mjs`; token `--mk-*`, `.mk-tech-grid`, `.mk-reticle`, `.mk-page-head`/`.mk-code`/`.mk-coord`, khối reduced-motion ở cuối file).
  - Motion JS: `template.html` có `initLoader()` + `runTabTransition(id)` (loader mầm cây `#mk-loader`, fade trang `.mk-page-fade-in`), `mkHeroSceneHtml`/`toggleHeroAnim`/`renderSoilScene` (cảnh 2D trang chủ), `wireMotion`/`revealElement`/`revealedKeys` (skeleton reveal theo khóa `data-reveal="…"`, panel bản đồ dùng `panelIo`), click burst `.mk-click-burst`; `mkAnimateOut(el, done, ms)` (gắn `.is-closing` rồi gỡ: menu mobile, `#overlay`, `#term-pop` qua `closeTerm(instant)`), `mkRegionCoord()` (khung tọa độ tính từ `MEKONG_OUTER_RINGS`); `mapWorkspace.js` có `mwSyncTabIndicator`, `mwAnimateTabBody`, `mwFollowPanelResize` (invalidateSize + panBy bù theo khung hình khi thu gọn panel); `myGardens.js` `toggleGroup` dùng `.mk-expand-in`/`.mk-collapse-out`; `rotationFarm.js` `pick` gắn `.rf-answers-in`. Chữ mới: `REDESIGN_TEXT.rotEyebrow/glossaryEyebrow`.

- **Snapshot tĩnh (15/11):** `site/logic/staticSnapshot.js` (`ss*`): `ssClimateFor(PRECOMPUTED, lat, lon, PROVINCES)` (huyện ≤ 15 km → tỉnh → tỉnh gần nhất, KHÔNG gọi mạng), `ssGrids`, `ssCellEstimate`, `ssAutoFill`/`ssGardenEstimates`, `ssRate` + `SS_RATE_OF_KIND`/`SS_LAYER_KIND`. Dữ liệu: `PRECOMPUTED.powerProvinces` (13 tỉnh), `PRECOMPUTED.snapshot.{ph,ec}` (SoilGrids WCS, Wang 2025). Script: `fetch-power-monthly.mjs --provinces`, `fetch-soilgrids-ph-wcs.mjs`, `build-mekong-salinity.mjs`.
- **Luân canh/Tab 4 (15/11):** `rfDataTableHtml` (bảng dữ liệu + Rate), `rfPickHtml` = bảng so sánh, `rfAltTableHtml` = bảng cây × vụ; `mwStrategyCardHtml` (Tab 4 tối giản), `gmTabDrawsGardens` (Tab 4 giữ thửa); `gmResolveCrop`/`gmCropLabel` + `profile.cropName`/`useEstimates`.
- **AI 2 tầng (15/11):** `assistantFallback.js`: `asstTier1Propose`, `asstTier2Check`, `asstTwoTierText`, `asstMeasureAnswer`, `ASST_MEASURE_GUIDE`; `assistantContext({ facts, crop })` thêm `twoTier`; `server.mjs` TIER1 → TIER2. Test: `scripts/tests/snapshotTwoTier.test.mjs`.

- **Luân canh tự do (15/11) + Thông số thửa nhập tại dòng (16/11: `rfParamRows`, `rfSaveInline`, `sfApplyInput`; lịch tỉnh `provinceCalendarYear`):** `site/logic/rotationGen.js` (`rgParseWish`, `rgSeasonGrid`, `rgGenerate`, `rgCheckAi`, `RG_PARAMS`); `rotationFarm.js` `rfGenHtml`/`rfGenWhyHtml`/`rfAskAi` (`RF.wish`, `RF.ai`, `RF.genPick`); server `/api/strategies`. Bảng A–D cũ (`rfPickHtml`) đã gỡ khỏi trang chi tiết.

- **Thửa demo (15/11):** `site/logic/demoData.js` (`dm*`: `dmBuildDemo({seed,today,fillFor})`, `dmStripDemo`); trang: `mgLoadDemo`/`mgClearDemo`/`mgDemoFillAt`/`mgDemoRowHtml` (myGardens.js), thửa `g.demo` → rate `sim` + `.mk-demo-badge` (gardens.css). Test: `scripts/tests/demoData.test.mjs`.
- **Điền thông minh (15/11):** `site/logic/smartFill.js` `sfFill`/`sfAutoSeason`/`sfCropForSeason`/`sfSoilTypeFromLabel`/`SF_NEVER`; trang dùng `mgSmartFill(g)` (myGardens.js), `gmAssessGarden({fill})`. Quản lý vườn Luân canh: `rfMgmtHtml`, `RF.renaming`. In PDF: `rfPrintReport` + class `mk-printing-report`.

## 3. Hợp đồng Dữ liệu Thửa ruộng (`DS.gardens[]`) & Đánh dấu (`DS.marks[]`)
- Thửa `g`: `{ id, name, groupId, lat, lon, districtId, areaM2, polygon, profile: { cropId, cropName, useEstimates, currentText, season, sowing, irrigation, ph, ec, ecType, om, soilType, measuredAt, notes, cropChange, currentId } }`.
- Đánh dấu: `DS.marks.filter(m => m.gardenId === g.id)` (`type === 'flood'` là "Hay ngập" — loại dấu lấy từ `FI_MARK_TYPES = ['flood','dry','acidSaline','good']` ở `site/sources/farmerInput.js`, KHÔNG phải `'waterlogged'`). Prompt 02 (YouTube luân canh) đã thực thi xong.

## 4. 4 Cổng Kiểm Tra Bắt Buộc trước khi xong
1. **Phạm vi gộp toàn cục (`builtPage.test.mjs`):** Tên hàm/hằng cấp cao nhất PHẢI duy nhất toàn `site/` (dùng tiền tố theo module). Ưu tiên sửa trên file sẵn có; nếu tạo `.js` mới, nhớ thêm vào mảng `modules` trong `scripts/build-site.mjs`.
2. **Bảo toàn logic nền:** Không sửa ngưỡng trong `suitability.js` và `rotation.js`.
3. **Nguồn gốc (`check-provenance.mjs`):** Mọi số ngưỡng mới trong `data/` đều phải có nguồn + quote nguyên văn.
4. **Song ngữ (`check-i18n.mjs`):** `vi` và `en` trong cả 11 bảng `site/i18n/*.js` phải khớp cả khóa object lẫn **độ dài mọi mảng**.
5. **Lệnh chạy cuối phiên:** `npm run build && npm test && npm run check:i18n`.

## 5. Quy tắc Bàn Giao (giữ ngữ cảnh qua mọi phiên sau)
Cuối mỗi phiên có thêm/đổi file, cập nhật **3–5 dòng** vào Mục 2 file này (`tên file · vai trò · hàm/state chính`) để mọi phiên mới chỉ cần đọc duy nhất file này + `STATE.md`.
