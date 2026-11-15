# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 85 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- **Bản gộp `nasa-merged` (14/11/2026):** gộp 4 nhánh S1 `nasa1-strategy` (Chiến thuật, Luân canh, Thuật ngữ), S2 `nasa2-map` (bản đồ ĐBSCL, lớp môi trường, Tab 3 Chi tiết), S3 `nasa3-my-garden-update` (popup thửa, sửa ranh), S4 `nasa4-UI-UX` (giao diện Vườn của tôi, Cây phù hợp, ô "Tìm ở đây"). 4 thư mục gốc giữ nguyên làm backup.
- **4 trang (`PAGES`):** `#/` Trang chủ · `#/ruong-cua-toi` Vườn của tôi · `#/luan-canh` Luân canh · `#/thuat-ngu` Thuật ngữ. Trang Dữ liệu `#/du-lieu` đã gỡ (địa chỉ cũ mở về Trang chủ); đăng nhập/tài khoản đã gỡ hoàn toàn.
- **Build & kiểm tra:** `npm run check:i18n` (11 bảng khớp), `npm run build` (`index.html` ~3,79 MB, 53 module, không trùng tên cấp cao nhất), `npm test` 183/183 pass, `check-provenance.mjs` qua.

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
- Trợ lý AI: mọi số trả về được đối chiếu `MF_LEDGER` (`asstVerifyReply`), số lạ bị thay bằng `fallbackAnswer`.
- Dữ liệu người dùng chỉ ở localStorage khóa `mvm-data-v1` (`dsActiveKey()` trả thẳng `DS_KEY`); khóa khí hậu vườn `local:${id}:${lat}:${lon}`.

## Snapshot tĩnh toàn ĐBSCL + Rate + AI 2 tầng (15/11/2026)

- **Không gọi API nền lúc chạy:** `myField.js` / `myGardens.js` / `cropSuitMap.js` bỏ `powerFetchRecord`; khí hậu lấy từ `ssClimateFor` (`site/logic/staticSnapshot.js`): bản lưu đúng tọa độ → huyện mẫu ≤ 15 km → tỉnh chứa thửa → tỉnh gần nhất. Server trả 204 khi chưa có khoá Gemini.
- **Dữ liệu mới:** `power_monthly.json` thêm `provinces` (13 tỉnh, tâm ranh, POWER daily 2001–2025, không thiếu tháng; chạy `fetch-power-monthly.mjs --provinces`); `mekong_soilgrids_ph_5km.json` (pH SoilGrids WCS số, 0–30 cm trọng số 5/10/15, 2.551 ô; `fetch-soilgrids-ph-wcs.mjs`); `mekong_salinity_5km.json` (Wang et al. 2025, Zenodo 15653696, MD5 khớp, 1.748 ô, dS/m, kind model). Build nhúng `PRECOMPUTED.powerProvinces`, `PRECOMPUTED.snapshot.{ph,ec}` (chỉ ô trong ranh ĐBSCL).
- **Tự điền + Rate:** `ssAutoFill`/`ssGardenEstimates` điền pH/độ mặn tham khảo khi thửa chưa đo (ô 5 km, ô kề ≤ 1 vòng, ghi khoảng cách); số đo của bà con luôn thắng. Độ mặn ước tính mang `ecType 'unknown'` → không bị chấm theo ngưỡng ECe. Rate: ground/farmer = Cao, satellite = Trung bình, model = Tham khảo (`SS_RATE_OF_KIND`, `SS_LAYER_KIND` cho 22 lớp). Tắt được bằng `profile.useEstimates` (Cài đặt vườn).
- **Luân canh:** bỏ `mk-page-head` (giữ câu nhắc 1 dòng + h2 sr-only), bỏ `rfClimateNoteHtml`; `rfDataTableHtml` (3 nhóm: Đo tại ruộng / Vệ tinh & lưới 5 km / Mô hình tĩnh; cột Nguồn · ngày · Rate; lớp đang bật `MF.layer` + ô màu `emDescribeCell`); `rfPickHtml` thành bảng so sánh phương án (hàng bấm được, phím Enter); `rfAltTableHtml` thành bảng cây × vụ.
- **Cây tự nhập:** `gmResolveCrop` (bỏ dấu, khớp VI/EN/mã) → `cropId` hoặc `profile.cropName`; `gmAssessGarden` trả `cropNotInLibrary` (giữ tên); ô `#gm-cropText` + datalist.
- **Tab 4:** bug mất thửa do `mgDrawAllGardens` thoát sớm + `MG.layer.clearLayers()` → `gmTabDrawsGardens`; panel chỉ còn tên, diện tích, nút "Tạo chiến thuật" (`mwStrategyCardHtml` → `rfOpenGardenStrategy`).
- **AI 2 tầng:** `asstTier1Propose` / `asstTier2Check` / `asstTwoTierText` / `ASST_MEASURE_GUIDE` (`assistantFallback.js`); ngữ cảnh có `facts` (kind) + `twoTier`; server chạy Tầng 1 (ẩn) rồi Tầng 2 (stream) khi có `context.facts`. Dữ kiện thửa: `rfAssistantFacts`, `rfAssistantCrop`.
- **Chưa làm (thiếu nguồn kiểm chứng được):** mưa hiệu quả FAO và bồn nước đất — trang FAO (fao.org/4/s2022e) chặn bằng xác minh "Verify you are human", chưa chép được nguyên văn công thức nên để trống. GIBS/ESI/SoilGrids WMS giữ mốc snapshot cũ đã xác minh (không tải lại).

## Đề xuất luân canh tự do + AI brainstorm (15/11/2026, tối)

- `site/logic/rotationGen.js` (`rg*`): `rgParseWish` (câu tự do → chuỗi cây + mong muốn ít tưới/đất/đa dạng), `rgSeasonGrid` (9 cây × 3 vụ bằng suitAssess, nước = FAO Manual 3 − mưa POWER), `rgGenerate` (chấm mọi chuỗi, bỏ chuỗi có vụ Đỏ, 3 đề xuất khác nhau ≥ 2 vụ: cân bằng / tiết kiệm nước / tốt cho đất + 12 "xem thêm"; trọng số `RG_PARAMS` do nhóm chọn; KHÔNG có điểm lợi nhuận), `rgCheckAi` (chấm lại đề xuất AI, cây ngoài thư viện báo thiếu, lời giải thích có số lạ bị ẩn). Test `scripts/tests/rotationGen.test.mjs`.
- Trang Luân canh: `rfGenHtml` thay bảng A–D (ô mô tả tự do lưu vào `profile.currentText`, dòng "Cách bạn đang làm", "Vì sao?" = `rfGenWhyHtml`), kế hoạch 3 vụ theo phương án chọn (`rfGenAsStrategy`, `rfGenSummaryHtml`). Thẻ lưới + Trợ lý 2 tầng dùng đề xuất tự do (`rfStatus`, `rfAssistantEval`). Cài đặt vườn: "Bạn đang làm kiểu nào?" là ô gõ tự do (`mgCurrentIdFrom` giữ mã A–D nếu trùng).
- `server.mjs`: `POST /api/strategies` (Gemini JSON brainstorm; 204 khi chưa có khoá → trang dùng bộ sinh theo luật). Chỉ gọi khi bà con bấm "Nhờ AI brainstorm thêm".

## Luân canh dạng bảng + nguồn minh bạch + lịch vụ tỉnh (15/11/2026, chiều)

- `rotationFarm.js`: 3 khối câu hỏi cũ → `rfPlanSummaryHtml` (3 ô chênh lệch so với 3 vụ lúa) + `rfPlanTableHtml` (Vụ | Cây & mức Hợp/Tạm/Tránh/Thiếu | Thay được | Việc cần làm; thẻ thiếu chung gom 1 thanh + 1 nút "Nhập ngay"). `rfDataTableHtml` = danh sách 2 cột (đo tại ruộng | vệ tinh + mô hình); `rfRateChip(rate, tip)` có tooltip nguồn (`rfTips`, đọc PRECOMPUTED/ssGrids/EM_FILTER_META/CATALOG/WB_FAO_PE), chip "Thiếu" ghi cách bổ sung; mobile ≤ 640 px tooltip cố định đáy màn hình. CSS mục 12 `hitech.css`.
- Mưa hiệu quả FAO Manual 3 §4.2 (`wbEffectiveRain`, `WB_FAO_PE`, chép nguyên văn https://www.fao.org/3/s2022e/s2022e08.htm, test tái lập bảng đáp án) + ẩm vùng rễ NASA GWETROOT trong danh sách dữ liệu.
- Lịch vụ cấp tỉnh: `fsCalendarSource(..., provinceCal)` mode 'province', `districtInputs` đọc `PRE.provinceCal` (id `p-<mã>`, nhóm k-means đã lưu, không chạy lại). Dữ liệu từ `scripts/python/province_calendars_fast.py` (3 luồng, Session, 6 lần thử lùi dần, lưu từng nhóm ngày ở `.preview/province-cache/`) → `province_calendars.json`; ORNL ~75 s/lượt. Chưa có file thì build bỏ qua (thửa xa vẫn "Thiếu lịch MODIS").

## Nâng cấp UI/UX High-Tech + chuyển động (15/11/2026)

- File mới `site/hitech.css` (nạp sau `gardens.css`): token `--mk-*` theo bảng màu Trang chủ, bo góc chuẩn 18/14/12/9 px, lưới tọa độ ~5 % (`.mk-tech-grid`), đầu trang con `.mk-page-head` (mã 01/02/03 + tọa độ ĐBSCL tính từ ranh giới thật bằng `mkRegionCoord()`), kính mờ cho thanh tìm/nút bản đồ/hộp 22 lớp/FAB, HUD cho popup thửa, `#term-pop`, drawer, `.gm-dialog` (`@starting-style` + `allow-discrete`).
- Chuyển động: vào trang 260 ms (`mkPageEnter`; trang bản đồ chỉ mờ, không transform), đóng menu mobile/overlay/popover có hiệu ứng ra (`mkAnimateOut`), viên trượt tab `#mw-panel`, nội dung tab mờ vào, thu gọn panel trái co cột + map đứng yên (đo được lệch ≤ 1 px), accordion nhóm vườn, đổi phương án A/B/C. Tắt hết khi `prefers-reduced-motion`.
- Không thêm số liệu nào; chấm radar `.mk-live-dot` chỉ là trang trí, không ghi "trực tiếp".
- Đã kiểm trên trình duyệt (desktop 1366 + mobile 375): 4 trang, thu/mở panel, tab, drawer Trợ lý (đóng giữa chừng rồi mở lại), hộp Tạo nhóm, hộp lớp, menu mobile — không lỗi console. Chưa kiểm bằng mắt: accordion nhóm và đổi A/B/C (cần dữ liệu vườn thật).

## Gộp 4 nhánh — các điểm sửa (14/11/2026)

- `myField.js` (S2): bỏ `dhRenderAll()`; lịch vụ theo `fsCalendarSource` + chỉ gọi `districtInputs` khi id có trong `PRECOMPUTED.climate.districts`; lỗi định vị tự ẩn 5 s (`MW.geoErrTimer`).
- `mapWorkspace.js`: nền S2 + Tab 4 của S1 (`rfBridgeHtml`, ẩn `#mw-compare-dock`, `FP.strategyId`), giữ fix S1 `whatIf.rainPct = 0` khi giả định đang bật. Tab 3 "Chi tiết" kiểm tra trước khối `!MF.loc`, vẫn vẽ thửa (bấm chọn được), đọc `g.profile.cropId`, `assess.result.criteria`, `profile.om`, dịch `soilType/ecType/irrigation/season` (không in "unknown"), thêm nút bánh răng `data-mg="settings"` và nút sang Tab 4.
- Ô "Tìm ở đây": `site/logic/placeSearch.js` (hàm thuần `mwFuzzySearchPlace`, `mwPlaceCatalog`, `psNormalize`, `psDamerau`): bỏ dấu, bỏ tiền tố tp/tỉnh/huyện/quận/tx, khớp đầu/chứa, Damerau-Levenshtein ≤ 1 (4–6 ký tự) / ≤ 2 (≥ 7), < 2 ký tự trả null. Tỉnh ngoài 5 huyện mẫu không mang `id` (tránh crash `districtInputs`). Không còn nút 5 huyện dưới ô tìm.
- `cropSuitMap.js` (S4 dropdown `CSM.openMenu`): tô đủ 13 tỉnh theo `prov.code`; tỉnh ngoài 5 huyện mẫu tô xám kèm nhãn `suitMap.noSampleProv` (thiếu thì nói thiếu).
- `myGardens.js` (UI S4 + popup S3): `mgFocusGarden` không ép chế độ 1 vườn; `mgBuildSnapshot` đánh giá TOÀN BỘ vườn; màu vẽ qua hàm thuần `gmMapStyle` (`gardenModel.js`): luôn là mức phù hợp thật, vườn chọn chỉ đậm viền/độ phủ; nút bánh răng mở `#gm-settings-form` (thêm 2 câu cho Tab 4: `cropChange` theo `FIELD_CHANGE_ANSWERS` và `currentId` A–D theo `ROTATIONS`; để trống = null, `MW` dùng mặc định `yes`/`A`).
- `mapDraw.js` = S3 (`MD.gardenId`, `editWrongGarden`, `draftColor`) + S4 (`mdUpdateLiveArea` khi chèn/kéo/xóa đỉnh, `.mw-crosshair` trong undo/redo); `mgDrawingHtml` có nút Làm lại.
- `template.html`: bỏ `sources` khỏi `PAGES`, `renderSources/renderDataHub/dataHubOnShow`, markup đăng nhập, `auInit`; 3 link `pageHref('sources')` trỏ sang `glossary`. Chữ "trang Dữ liệu" đổi thành "Cài đặt vườn (biểu tượng bánh răng)".
- Đã kiểm trên trình duyệt (localhost): 4 trang, VI/EN, Tab 1–4, tìm "Soc Trnag"/"Ca Mau"/chuỗi rác, màu vườn khi chưa chọn/đã chọn, popup bằng phím Enter, nút Tab 3, hộp lớp — không lỗi console.

## Tiền tố module

- `geo*` geometry · `fs*` fieldStrategies · `asst*` assistantFallback · `gm*` gardenModel · `em*`/`EM_*` envMapData · `ps*`/`mwFuzzySearchPlace`/`mwPlaceCatalog` placeSearch · `mekong*`/`MEKONG_*` mekongBoundaries.
- `MD/md*` mapDraw · `FP/fp*` fieldPlan · `MW/mw*` mapWorkspace · `MG/mg*` myGardens · `CSM/csm*` cropSuitMap · `MF/mf*` myField · `rf*` rotationFarm · `rx*` rotationExtras · `gp*` glossaryPage.

## Việc còn dở / giới hạn đã biết (giữ trung thực khi Q&A)

- Sau khi gỡ trang Dữ liệu, không còn chỗ nạp file vệ tinh (mưa/NDVI/độ ẩm) thủ công; số đo đất nhập trong Cài đặt vườn. `dataHub.js`, `authStore.js` chỉ còn trong 4 thư mục backup.
- Lịch vụ NDVI tính sẵn chỉ có cho 5 huyện mẫu (thửa > 15 km: "chưa có lịch", phương án xếp hạng thiếu dữ liệu); khí hậu đã có cho cả 13 tỉnh (snapshot tĩnh).
- Độ mặn Wang et al. 2025 đã có dạng lưới số (tự điền), CHƯA có lớp màu riêng trên bản đồ. Lớp `grace` đã ẩn vì không đủ độ phân giải cho lưới 5 km.
- Tài nguyên lớn vẫn giới hạn bởi dung lượng `localStorage`.
