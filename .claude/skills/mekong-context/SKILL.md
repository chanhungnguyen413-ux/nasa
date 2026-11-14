---
name: mekong-context
description: Nạp toàn bộ ngữ cảnh dự án Mùa Vụ Mekong (nasa-NEW, NASA Space Apps 2026) chỉ trong 1 lần đọc, siêu tiết kiệm token. Tự động dùng cho mọi tác vụ sửa code, thiết kế UI, luân canh, bản đồ vườn, dữ liệu nông học, test hoặc chuẩn bị demo hackathon trong repo này.
user-invocable: true
---

# Ngữ cảnh & Cẩm nang Tiết kiệm Token — Mùa Vụ Mekong (`nasa-NEW`)

## 1. Quy trình mở phiên 15 giây (Không rà repo)
- **Đọc ngay:** `docs/blueprint/STATE.md` + (nếu làm theo prompt có sẵn) file được chỉ định trong `prompts_luan_canh_chien_thuat/`.
- **CẤM ĐỌC (đốt token):** `index.html` (~2,75 MB), `package-lock.json`, `node_modules/`, `.preview/`, `site/data/precomputed/*.json`, `docs/blueprint/00-BLUEPRINT.md` (chỉ tham khảo khi làm phase cũ), `.claude/skills/impeccable/scripts/data/font-index.json` (1,1 MB), `.claude/skills/impeccable/scripts/live-browser.js` (523 KB).

## 2. Bản đồ kiến trúc & File mới nhất (49 module · 139 tests)
`scripts/build-site.mjs` nối `site/template.html` (1.285 dòng) + 49 file trong `site/` thành **1 `<script type="module">` chung** (xóa `import/export` → bắt buộc dùng tiền tố duy nhất ở cấp module!).

- **Router & Khung (`site/template.html`):**
  - `PAGES`: `home` (`#/`), `myfield` (`#/ruong-cua-toi`), `rotations` (`#/luan-canh`), `sources` (`#/du-lieu`).
  - `S` (`269–282`): `{ lang, rotDistrict, rotPriorities, rotWhatIf, rotCurrent, chat, busy, dialog, page, menuOpen }`.
  - `showPage(id)` (`353–373`): gọi `myFieldOnShow()`, `dataHubOnShow()`, `renderRotations()`.
  - `renderRotations()` (`692–726`): chứa `<div id="rot-farm">` và 2 `<details>` (`#rot-controls`, `#rot-strip` + `#rot-results`).
- **Dữ liệu & Kho (`site/data/`, `site/sources/`):**
  - `cropLibrary.js` (9 cây có nguồn FAO: `rice, mungbean, maize, soybean, groundnut, cabbage, tomato, chili, onion`), `rotationCrops.js` (`SOURCES`, `ROTATIONS A–D`, `PROFIT_RATIO_UPLAND`), `provinces.js` (`PROVINCES`: 5 huyện ĐBSCL).
  - `dataStore.js`: `DS = { field, gardens, gardenGroups, gardenView, activeGardenId, uploads, soil, marks, saved }`, API `dsLoad`, `dsSave`, `dsSaveGarden`, `dsSelectGarden(id)`.
  - `authStore.js`: đồng bộ tài khoản; `power.js`: cache NASA POWER v2; `catalog.js`, `upload.js`, `farmerInput.js`.
- **Logic thuần (`site/logic/` — KHÔNG chạm DOM):**
  - `suitability.js` & `rotation.js`: **KHÓA bởi test hồi quy** (`suitability.test.mjs` L101, `golden/rotation.json`) — không sửa ngưỡng.
  - `fieldStrategies.js` (`fs*`): `fsCalendarSource`, `fsAssessField`, `fsSeasonAlternatives`, `fsInputKey`.
  - `gardenModel.js` (`gm*`): `gmProfileDefaults()` (`cropId, season, sowing, irrigation, ph, ec, ecType, om, soilType, measuredAt, notes, cropChange, currentId`), `gmColor`, `gmAssessGarden`.
  - `geometry.js` (`geo*`, `GEO_PARAMS.districtRadiusKm = 15`, `maxFieldHa = 50`), `strategies.js`, `zones.js`, `whatIf.js`, `fieldData.js`, `seasonStrip.js`, `waterBalance.js`, `et0.js`, `assistantFallback.js` (`asst*`).
- **Giao diện (`site/pages/`) & Từ điển (`site/i18n/`):**
  - `rotationFarm.js` (`rf*` / `RF`): `#rot-farm` trên `#/luan-canh` + thẻ 5 mục dùng chung Tab 4.
  - `mapWorkspace.js` (`mw*` / `MW`): 4 tab `field | suit | cond | compare`; `myGardens.js` (`mg*`); `cropSuitMap.js` (`csm*`); `myField*.js`; `mapDraw.js` (`md*`); `fieldPlan.js` (`fp*`); `dataHub.js`; `rotationExtras.js` (`rx*`).
  - `i18n/`: `strategyText.js` (có `STRAT_TEXT.{vi,en}.farm`), `mapText.js`, `gardenText.js`, `redesignText.js`, `rotationText.js`, `fieldText.js`, `dataText.js`, `sourcesText.js`, `phase3Text.js`, `glossary.js`, `strings.js`.
  - CSS (`DESIGN.md`): `styles.css`, `redesign.css` (`#f7f8f2` nền, `#254f35` xanh đậm, `#628d39` nhấn, `#dfe5d9` viền, `#192d22` chữ), `gardens.css`.

## 3. Nguyên tắc Hackathon, UI/UX & Motion cho Nông dân
- **Không biết gì về trồng cây hay công nghệ vẫn dùng được:** Kết luận ngay ở đầu, dùng hình ảnh trực quan + đèn giao thông Xanh/Vàng/Đỏ, tránh thuật ngữ rối mắt (giấu bảng kỹ thuật vào `<details>`).
- **UI/UX & Animation chuẩn High-Tech (tiết kiệm token):** Cần tham khảo chuẩn UI/motion thì chỉ đọc `.claude/skills/impeccable/reference/animate.md` (89 dòng) + `craft-floor.md` (44 dòng), KHÔNG chạy `impeccable` launcher nặng. Dùng `--ease-out-expo`, chỉ animate `transform`/`opacity`/`clip-path` + `View Transitions` fallback CSS, ưu tiên Lucide `icon()` thay emoji thô, và luôn có `@media (prefers-reduced-motion: reduce)`.
- **Minh bạch tuyệt đối:** Chỉ rõ dữ liệu nào từ NASA (kèm độ phân giải thô), dữ liệu nào từ FAO/Linh 2015, dữ liệu nào nông dân tự nhập; thiếu trường nào kêu rõ và cho nút bổ sung ngay.
- **Đề xuất trước khi làm mở rộng:** Luôn hỏi ý kiến người dùng trước khi thêm thay đổi đột phá ngoài phạm vi yêu cầu.

## 4. Cổng kiểm tra bắt buộc cuối phiên
```bash
npm run build && npm test && npm run check:i18n
```
Sau khi pass, cập nhật tóm tắt ngắn vào `docs/blueprint/STATE.md` và cập nhật bảng module ở `prompts_luan_canh_chien_thuat/01-NGU-CANH-RUT-GON-CHO-AGENT-MOI.md` (nếu có thêm file/hàm mới).
