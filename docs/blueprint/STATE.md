# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 85 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- **Bản gộp `nasa-merged` (14/11/2026):** gộp 4 nhánh S1 `nasa1-strategy` (Chiến thuật, Luân canh, Thuật ngữ), S2 `nasa2-map` (bản đồ ĐBSCL, lớp môi trường, Tab 3 Chi tiết), S3 `nasa3-my-garden-update` (popup thửa, sửa ranh), S4 `nasa4-UI-UX` (giao diện Vườn của tôi, Cây phù hợp, ô "Tìm ở đây"). 4 thư mục gốc giữ nguyên làm backup.
- **4 trang (`PAGES`):** `#/` Trang chủ · `#/ruong-cua-toi` Vườn của tôi · `#/luan-canh` Luân canh · `#/thuat-ngu` Thuật ngữ. Trang Dữ liệu `#/du-lieu` đã gỡ (địa chỉ cũ mở về Trang chủ); đăng nhập/tài khoản đã gỡ hoàn toàn.
- **Build & kiểm tra:** `npm run check:i18n` (11 bảng khớp), `npm run build` (`index.html` ~2,85 MB, đã bỏ ảnh hero cũ và khối PHOTOS không dùng, 54 module, không trùng tên cấp cao nhất), `npm test` 199/199 pass, `check-provenance.mjs` qua.

## Quyết định đã chốt

- Toàn màn hình kiểu WaterWise cho `#/ruong-cua-toi`: desktop panel trái 380 px (thu gọn được: `MW.leftCollapsed`, nút `toggleLeftPanel`) + bản đồ; mobile bottom sheet 3 nấc.
- Bản đồ chỉ dùng dữ liệu ranh giới S2 `site/data/mekongBoundaries.js` (13 tỉnh, `prov.code`, `MEKONG_ENV_*`): `minZoom 6`, `maxBounds`, `noWrap`, pane `dbsclEnvPane`/`dbsclBorderPane`, **22 lớp môi trường đủ dữ liệu 5 km** (`EM_AVAILABLE_KEYS`, chia 3 nhóm `EM_FILTER_GROUPS`: Đất & Địa hình 6, Nước & Ngập lũ 6, Cây trồng & Nhiệt 10) + "Không lớp", thanh "Độ rõ lớp phủ" mặc định 100 %, ẩn `#mw-legend` khỏi bản đồ và tích hợp phổ màu + `<details>` nguồn vào Tab 3 ("Chi tiết"). Tổng hợp đa lớp `emSynthesizeGardenStack` kết hợp cả 22 lớp + hồ sơ vườn để gợi ý chiến thuật canh tác ở Tab 3 & Tab 4.
- **Lớp lọc môi trường ĐBSCL dùng dữ liệu công khai thực (`site/logic/envMapData.js`, `PRECOMPUTED.envMap`):**
  - Nguồn mới bổ sung (15/11/2026): 10 lớp NASA EOSDIS GIBS WMS (`soilRoot`, `evi`, `lai`, `fpar`, `gpp`, `landCover`, `biomass`, `flood3d`, `floodHaz`, `soilTemp` qua `scripts/fetch-environment-gibs.mjs`) + 4 lớp ISRIC SoilGrids 2.0 250 m (`soilPh`, `soilSoc`, `soilClay`, `soilNitrogen` qua `scripts/fetch-isric-soilgrids.mjs`), giữ trung thực ô trống/mây che (như `#afafaf` của `flood3d` hay vùng đô thị bị mask) không nội suy bịa.
  - Đã xóa `MF_ENV_SUB_ANCHORS`, hàm `sin` giả lập, chỉ số `(xx%)` ở `myField.js`, và loại bỏ `grace` (3° ~330 km, không đủ dữ liệu 5 km) khỏi menu lớp + Tab 3.
  - **NASA GIBS (MODIS NDVI 2026-10-16 · 1.475/1.624 ô; GPM IMERG rain-rate 2026-11-13 · 1.118/1.624; SMAP L4 surface soil moisture 2026-11-10 · 1.624/1.624; MODIS LST Day & Night 2026-11-01 · 1.431 & 1.285/1.624) + SERVIR ESI 4-wk dry season 2026-04-30 (`fetch-mekong-esi.mjs --date 2026-04-30`, 1.406/1.624):** giữ nguyên màu PNG gốc, ô thiếu để trong suốt (không nội suy).
  - **Dữ liệu trực tiếp ĐBSCL:** `elev` dùng DEM quốc gia 500 m PANGAEA Minderhoud et al. 2019 (`mekong_elevation_5km.json`, 1.600/1.624 ô, chuẩn Hòn Dấu); `soilType` dùng UN FAO DSMW v3.6 / Open Development Mekong (`scripts/build-mekong-soil.mjs`, `mekong_soil_5km.json`, 1.617/1.624 ô, nhóm đất FAO — ghi rõ chưa vẽ ranh mặn động g/L).
  - **UI gọn gàng (`mapWorkspace.js`, `myField.js`):** không hiện khung chú giải màu nổi trên bản đồ (`#mw-legend`) cho các lớp lọc; hover và Tab 3 dịch màu sang nhãn ngữ nghĩa (`emDescribeCell`, không in mã `#hex` thô); Tab 3 gồm: (1) màu & ý nghĩa tại khu vực/vườn đang chọn, (2) phổ giải thích màu `emSpectrumBands`, (3) mục `<details>` đóng mặc định cho chi tiết kỹ thuật & nguồn.
- Tách `eligibility` và `riskLevel` (`fieldStrategies.js`); ngưỡng do nhóm chọn ghi `// do nhóm chọn` (`maxFieldHa 50`, `districtRadiusKm 15`, `severeSalinityFactor 2`, `yellowSeasonPenalty 6`).
- Dữ liệu người dùng chỉ ở localStorage khóa `mvm-data-v1` (`dsActiveKey()` trả thẳng `DS_KEY`); khóa khí hậu vườn `local:${id}:${lat}:${lon}`.

## Snapshot tĩnh toàn ĐBSCL + Rate + AI 2 tầng (15/11/2026)

- **Không gọi API nền lúc chạy:** `myField.js` / `myGardens.js` / `cropSuitMap.js` bỏ `powerFetchRecord`; khí hậu lấy từ `ssClimateFor` (`site/logic/staticSnapshot.js`): bản lưu đúng tọa độ → huyện mẫu ≤ 15 km → tỉnh chứa thửa → tỉnh gần nhất. Server trả 204 khi chưa có khoá Gemini.
- **Dữ liệu mới:** `power_monthly.json` thêm `provinces` (13 tỉnh, tâm ranh, POWER daily 2001–2025, không thiếu tháng; chạy `fetch-power-monthly.mjs --provinces`); `mekong_soilgrids_ph_5km.json` (pH SoilGrids WCS số, 0–30 cm trọng số 5/10/15, 2.551 ô; `fetch-soilgrids-ph-wcs.mjs`); `mekong_salinity_5km.json` (Wang et al. 2025, Zenodo 15653696, MD5 khớp, 1.748 ô, dS/m, kind model). Build nhúng `PRECOMPUTED.powerProvinces`, `PRECOMPUTED.snapshot.{ph,ec}` (chỉ ô trong ranh ĐBSCL).
- **Tự điền + Rate:** `ssAutoFill`/`ssGardenEstimates` điền pH/độ mặn tham khảo khi thửa chưa đo (ô 5 km, ô kề ≤ 1 vòng, ghi khoảng cách); số đo của bà con luôn thắng. Độ mặn ước tính mang `ecType 'unknown'` → không bị chấm theo ngưỡng ECe. Rate: ground/farmer = Cao, satellite = Trung bình, model = Tham khảo (`SS_RATE_OF_KIND`, `SS_LAYER_KIND` cho 22 lớp). Tắt được bằng `profile.useEstimates` (Cài đặt vườn).
- **Luân canh:** bỏ `mk-page-head` (giữ câu nhắc 1 dòng + h2 sr-only), bỏ `rfClimateNoteHtml`; `rfDataTableHtml` (3 nhóm: Đo tại ruộng / Vệ tinh & lưới 5 km / Mô hình tĩnh; cột Nguồn · ngày · Rate; lớp đang bật `MF.layer` + ô màu `emDescribeCell`); `rfPickHtml` thành bảng so sánh phương án (hàng bấm được, phím Enter); `rfAltTableHtml` thành bảng cây × vụ.
- **Cây tự nhập:** `gmResolveCrop` (bỏ dấu, khớp VI/EN/mã) → `cropId` hoặc `profile.cropName`; `gmAssessGarden` trả `cropNotInLibrary` (giữ tên); ô `#gm-cropText` + datalist.
- **Tab 4:** bug mất thửa do `mgDrawAllGardens` thoát sớm + `MG.layer.clearLayers()` → `gmTabDrawsGardens`; panel chỉ còn tên, diện tích, nút "Tạo chiến thuật" (`mwStrategyCardHtml` → `rfOpenGardenStrategy`).
- **AI 2 tầng:** `asstTier1Propose` / `asstTier2Check` / `asstTwoTierText` / `ASST_MEASURE_GUIDE` (`assistantFallback.js`); ngữ cảnh có `facts` (kind) + `twoTier`; server chạy Tầng 1 (ẩn) rồi Tầng 2 (stream) khi có `context.facts`. Dữ kiện thửa: `rfAssistantFacts`, `rfAssistantCrop`.
- **Giao diện nasa-UI-UX đã ghép (15/11 đêm):** loader mầm cây `#mk-loader` (`initLoader`, tối thiểu 0,67 s) + chuyển trang `runTabTransition`/`triggerPageFadeIn` (thay `mkPageEnter`); hero 2D `mkHeroSceneHtml` + nút `toggleHeroAnim` (`S.heroAnim`); nền đất `renderSoilScene` (`.mk-underground-zone`); click burst; skeleton reveal 1 lần/khóa (`data-reveal="khóa"`, `revealedKeys`, `wireMotion` + `panelIo` cho `#mw-panel-body`). Font Plus Jakarta Sans + Fraunces nhúng offline (`fontFaces()` trong build, gói `@fontsource/*`), KHÔNG dùng Google Fonts. `hitech.css` mục 17 giữ tương thích (bản đồ chỉ fade opacity, in PDF hiện đủ).

## Lịch tỉnh đủ dữ liệu + "Thông số thửa" nhập tại dòng (16/11/2026)

- Lịch tỉnh: `provinceCalendarYear` (rotationInputs.js) chọn năm MỚI NHẤT có nhóm k-means 3 đỉnh (Vĩnh Long → 2021; An Giang/Long An/Hậu Giang → 2025); không có → báo "~N vụ/năm, chưa đủ lịch 3 vụ" (Trung bình) thay vì "Thiếu" (`rfProvCalText`, `rfProvCyclesText`). Tab 2 dùng lịch tỉnh (`csmProvinceWindow(..., provCode)`). Chỉ tỉnh không có ảnh tốt mới "Thiếu".
- "Thông số thửa" = 1 dòng/thông số (đã gộp ước tính pH/EC): `rfParamRows` đọc `ev.fill`; nhập ngay tại dòng `rfParamEditor` → `rfSaveInline` → `sfApplyInput` (smartFill.js, ô số nhận dấu phẩy, tự ghi ngày đo). `rgGenerate` không còn lỗi khi mọi chuỗi có vụ Đỏ.

## Điền thông minh luôn bật + quản lý vườn + sửa PDF/AI (15/11/2026, khuya)

- `site/logic/smartFill.js` (`sf*`): `sfFill` = 1 nguồn sự thật cho trường trống (pH/EC ô 5 km, loại đất bản đồ FAO khi nhãn rõ 1 nhóm, mùa vụ = vụ NDVI đang/sắp diễn ra, tháng gieo, cây theo câu "đang làm", mẫu A–D); không tự điền nguồn tưới/hữu cơ/đổi cây (`SF_NEVER`). `gmAssessGarden({fill})` trả `autoFilled`. UI qua `mgSmartFill`/`mgFillText`/`mgFillHint` (myGardens.js). Ô tích useEstimates đã bỏ (luôn true). 11 ca test `scripts/tests/smartFill.test.mjs`.
- Quản lý vườn ở Luân canh: `rfMgmtHtml`/`rfMgmtActions`/`rfCommitRename` (đổi tên tại chỗ, đổi nhóm, Cài đặt, Xóa); hộp thoại myGardens vẽ lại trang Luân canh + `revealNow`.
- PDF trắng: do `styles.css` `body * {visibility:hidden}` (thẻ chia sẻ cũ) → nay `body:not(.mk-printing-report)`; in mở khóa `body[data-view]` 100dvh; `window.print()` gọi ngay trong lượt bấm.
- AI: model nhẹ trước, chat 2 tầng 1 lượt (Tầng 1 = `context.twoTier`), phạm vi + định dạng ≤ 80 từ; câu ngoài chủ đề → `ASST_OFF_TOPIC` (`asstIsFarmQuestion`). Đo: ~1 s/câu.
- **Thửa demo cho ban giám khảo (15/11):** `site/logic/demoData.js` (`dmBuildDemo`, `dmStripDemo`, `DM_PARAMS`, `DM_ZONE_GROUPS`): ~13–26 thửa ở 13 tỉnh, 6 nhóm tiểu vùng, đủ mọi trường + điểm đánh dấu; pH/độ mặn/loại đất/lịch vụ lấy từ dữ liệu tĩnh tại chỗ rồi lệch ngẫu nhiên, còn lại ngẫu nhiên. Cờ `demo: true` → nhãn "Mô phỏng giả định" (rate `sim`, `tips.demo`, Trợ lý nhận kind `simulated`). Nút `loadDemo`/`clearDemo` ở Tab 1 Vườn của tôi (`mgLoadDemo`, `mgClearDemo`). Sửa kèm: `rfAssistantFacts` thiếu `const est`.

## Bản đồ, Tab 3 tự điền, xuất PDF (15/11/2026, tối)

- Bấm thửa (bản đồ hoặc danh sách) → `mwGoTab('cond')` tự sang Tab 3. Zoom ra tối thiểu = vừa khung ĐBSCL (`getBoundsZoom`, tính lại khi đổi kích thước bản đồ).
- Tab 3: `mwAutoFill` / `mwEstValue` tự điền tham khảo pH, độ mặn (ô 5 km), nhóm đất (bản đồ FAO), lịch vụ (MODIS) cho mục chưa đo, nhãn "≈ … · Tham khảo" + hộp nhắc nhập số đo.
- PDF qua hộp in trình duyệt (offline): `rfPrintReport` dựng `#mk-print`; `rfPrintGarden` (nút Tab 3: dữ liệu thửa kèm nguồn, khí hậu 12 tháng + mưa hiệu quả, 22 lớp, đề xuất), `rfPrintStrategy` (nút PDF từng đề xuất: kế hoạch, vì sao, dữ liệu). CSS `hitech.css` mục 14 (@media print mở sẵn tooltip nguồn); các lớp rf-* dùng `:is(#rot-farm, #mk-print)`.

## Đề xuất luân canh tự do + AI brainstorm (15/11/2026, tối)

- `site/logic/rotationGen.js` (`rg*`): `rgParseWish` (câu tự do → chuỗi cây + mong muốn ít tưới/đất/đa dạng), `rgSeasonGrid` (9 cây × 3 vụ bằng suitAssess, nước = FAO Manual 3 − mưa POWER), `rgGenerate` (chấm mọi chuỗi, bỏ chuỗi có vụ Đỏ, 3 đề xuất khác nhau ≥ 2 vụ: cân bằng / tiết kiệm nước / tốt cho đất + 12 "xem thêm"; trọng số `RG_PARAMS` do nhóm chọn; KHÔNG có điểm lợi nhuận), `rgCheckAi` (chấm lại đề xuất AI, cây ngoài thư viện báo thiếu, lời giải thích có số lạ bị ẩn). Test `scripts/tests/rotationGen.test.mjs`.
- Trang Luân canh: `rfGenHtml` thay bảng A–D (ô mô tả tự do lưu vào `profile.currentText`, dòng "Cách bạn đang làm", "Vì sao?" = `rfGenWhyHtml`), kế hoạch 3 vụ theo phương án chọn (`rfGenAsStrategy`, `rfGenSummaryHtml`). Thẻ lưới + Trợ lý 2 tầng dùng đề xuất tự do (`rfStatus`, `rfAssistantEval`). Cài đặt vườn: "Bạn đang làm kiểu nào?" là ô gõ tự do (`mgCurrentIdFrom` giữ mã A–D nếu trùng).
- **Gemini đã kết nối (15/11):** khoá trong `.env.local` (đã gitignore). `gemini-flash-latest` hay quá tải (503/chậm) → mỗi model chờ tối đa 25 s rồi chuyển `gemini-flash-lite-latest` (brainstorm ~30 s, chat 2 tầng ~40 s, đã kiểm trên trang; số trong lời AI đều qua asstVerifyReply).
- `server.mjs`: `POST /api/strategies` (Gemini JSON brainstorm; 204 khi chưa có khoá → trang dùng bộ sinh theo luật). Chỉ gọi khi bà con bấm "Nhờ AI brainstorm thêm".

## Luân canh dạng bảng + nguồn minh bạch + lịch vụ tỉnh (15/11/2026, chiều)

- `rotationFarm.js`: 3 khối câu hỏi cũ → `rfPlanSummaryHtml` (3 ô chênh lệch so với 3 vụ lúa) + `rfPlanTableHtml` (Vụ | Cây & mức Hợp/Tạm/Tránh/Thiếu | Thay được | Việc cần làm; thẻ thiếu chung gom 1 thanh + 1 nút "Nhập ngay"). `rfDataTableHtml` = danh sách 2 cột (đo tại ruộng | vệ tinh + mô hình); `rfRateChip(rate, tip)` có tooltip nguồn (`rfTips`, đọc PRECOMPUTED/ssGrids/EM_FILTER_META/CATALOG/WB_FAO_PE), chip "Thiếu" ghi cách bổ sung; mobile ≤ 640 px tooltip cố định đáy màn hình. CSS mục 12 `hitech.css`.
- Mưa hiệu quả FAO Manual 3 §4.2 (`wbEffectiveRain`, `WB_FAO_PE`, chép nguyên văn https://www.fao.org/3/s2022e/s2022e08.htm, test tái lập bảng đáp án) + ẩm vùng rễ NASA GWETROOT trong danh sách dữ liệu.
- **Lịch vụ tỉnh ĐÃ NẠP (15/11 tối)** từ file AppEEARS người dùng tải (`mekong-13-tinh-MOD13Q1-061-results.csv`, MOD13Q1.061, 1 ô 250 m tại tâm tỉnh) qua `scripts/python/province_calendars_appeears.py`: bỏ ảnh `pixel_reliability` ∉ {0,1}, rồi đúng luật đỉnh + nhóm k-means đã lưu + POWER. Có lịch 3 vụ: An Giang, Hậu Giang, Long An; lịch 1 vụ: Bến Tre, Cà Mau, Đồng Tháp, Trà Vinh, Vĩnh Long; không đủ ảnh tốt: Bạc Liêu, Cần Thơ, Sóc Trăng, Tiền Giang, Kiên Giang (tâm tỉnh rơi xuống nước, 116/116 ô fill). Tooltip đọc `PRECOMPUTED.provinceCalMeta.via`.
- Lịch vụ cấp tỉnh: `fsCalendarSource(..., provinceCal)` mode 'province', `districtInputs` đọc `PRE.provinceCal` (id `p-<mã>`, nhóm k-means đã lưu, không chạy lại). Dữ liệu từ `scripts/python/province_calendars_fast.py` (3 luồng, Session, 6 lần thử lùi dần, lưu từng nhóm ngày ở `.preview/province-cache/`) → `province_calendars.json`; ORNL ~75 s/lượt. Chưa có file thì build bỏ qua (thửa xa vẫn "Thiếu lịch MODIS").

## Nâng cấp UI/UX High-Tech (15/11/2026) — tóm tắt

- `site/hitech.css` (token `--mk-*`, HUD, chuyển động tôn trọng reduced-motion); `mkAnimateOut`/`mkRegionCoord` (template.html; `mkPageEnter` đã thay bằng `runTabTransition`), `mwFollowPanelResize` (thu panel, map đứng yên).

## Gộp 4 nhánh (14/11/2026) — tóm tắt

- myField/mapWorkspace/myGardens/mapDraw/cropSuitMap/placeSearch đã gộp từ S1–S4 (chi tiết trong lịch sử phiên cũ); bỏ trang Dữ liệu `#/du-lieu` và đăng nhập; màu vườn qua `gmMapStyle`; ô "Tìm ở đây" = `mwFuzzySearchPlace`.

## Tiền tố module

- `geo*` geometry · `fs*` fieldStrategies · `asst*` assistantFallback · `gm*` gardenModel · `em*`/`EM_*` envMapData · `ps*`/`mwFuzzySearchPlace`/`mwPlaceCatalog` placeSearch · `mekong*`/`MEKONG_*` mekongBoundaries.
- `MD/md*` mapDraw · `FP/fp*` fieldPlan · `MW/mw*` mapWorkspace · `MG/mg*` myGardens · `CSM/csm*` cropSuitMap · `MF/mf*` myField · `rf*` rotationFarm · `rx*` rotationExtras · `gp*` glossaryPage.

## Việc còn dở / giới hạn đã biết (giữ trung thực khi Q&A)

- Lịch vụ NDVI: 5 huyện mẫu + lịch tỉnh (8 tỉnh có ảnh tốt; Bạc Liêu, Cần Thơ, Sóc Trăng, Tiền Giang, Kiên Giang chưa có — mây/nước). Không còn chỗ nạp file vệ tinh thủ công; số đo đất nhập ở Cài đặt vườn hoặc ngay tại dòng trang Luân canh.
- Độ mặn Wang et al. 2025 đã có dạng lưới số (tự điền), CHƯA có lớp màu riêng trên bản đồ. Lớp `grace` đã ẩn vì không đủ độ phân giải cho lưới 5 km.
