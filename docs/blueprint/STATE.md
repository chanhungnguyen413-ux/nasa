# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 85 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- **Bản gộp `nasa-merged` (14/11/2026):** gộp 4 nhánh S1 `nasa1-strategy` (Chiến thuật, Luân canh, Thuật ngữ), S2 `nasa2-map` (bản đồ ĐBSCL, lớp môi trường, Tab 3 Chi tiết), S3 `nasa3-my-garden-update` (popup thửa, sửa ranh), S4 `nasa4-UI-UX` (giao diện Vườn của tôi, Cây phù hợp, ô "Tìm ở đây"). 4 thư mục gốc giữ nguyên làm backup.
- **4 trang (`PAGES`):** `#/` Trang chủ · `#/ruong-cua-toi` Vườn của tôi · `#/luan-canh` Luân canh · `#/thuat-ngu` Thuật ngữ. Trang Dữ liệu `#/du-lieu` đã gỡ (địa chỉ cũ mở về Trang chủ); đăng nhập/tài khoản đã gỡ hoàn toàn.
- **Build & kiểm tra:** `npm run check:i18n` (11 bảng khớp), `npm run build` (`index.html` ~3,43 MB, 51 module, không trùng tên cấp cao nhất), `npm test` 155/155 pass, `check-provenance.mjs` qua.

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

## Gộp 4 nhánh — các điểm sửa (14/11/2026)

- `myField.js` (S2): bỏ `dhRenderAll()`; lịch vụ theo `fsCalendarSource` + chỉ gọi `districtInputs` khi id có trong `PRECOMPUTED.climate.districts`; lỗi định vị tự ẩn 5 s (`MW.geoErrTimer`).
- `mapWorkspace.js`: nền S2 + Tab 4 của S1 (`rfBridgeHtml`, ẩn `#mw-compare-dock`, `FP.strategyId`), giữ fix S1 `whatIf.rainPct = 0` khi giả định đang bật. Tab 3 "Chi tiết" kiểm tra trước khối `!MF.loc`, vẫn vẽ thửa (bấm chọn được), đọc `g.profile.cropId`, `assess.result.criteria`, `profile.om`, dịch `soilType/ecType/irrigation/season` (không in "unknown"), thêm nút bánh răng `data-mg="settings"` và nút sang Tab 4.
- Ô "Tìm ở đây": `site/logic/placeSearch.js` (hàm thuần `mwFuzzySearchPlace`, `mwPlaceCatalog`, `psNormalize`, `psDamerau`): bỏ dấu, bỏ tiền tố tp/tỉnh/huyện/quận/tx, khớp đầu/chứa, Damerau-Levenshtein ≤ 1 (4–6 ký tự) / ≤ 2 (≥ 7), < 2 ký tự trả null. Tỉnh ngoài 5 huyện mẫu không mang `id` (tránh crash `districtInputs`). Không còn nút 5 huyện dưới ô tìm.
- `cropSuitMap.js` (S4 dropdown `CSM.openMenu`): tô đủ 13 tỉnh theo `prov.code`; tỉnh ngoài 5 huyện mẫu tô xám kèm nhãn `suitMap.noSampleProv` (thiếu thì nói thiếu).
- `myGardens.js` (UI S4 + popup S3): `mgFocusGarden` không ép chế độ 1 vườn; `mgBuildSnapshot` đánh giá TOÀN BỘ vườn; màu vẽ qua hàm thuần `gmMapStyle` (`gardenModel.js`): luôn là mức phù hợp thật, vườn chọn chỉ đậm viền/độ phủ; nút bánh răng mở `#gm-settings-form` (thêm 2 câu cho Tab 4: `cropChange` theo `FIELD_CHANGE_ANSWERS` và `currentId` A–D theo `ROTATIONS`; để trống = null, `MW` dùng mặc định `yes`/`A`).
- `mapDraw.js` = S3 (`MD.gardenId`, `editWrongGarden`, `draftColor`) + S4 (`mdUpdateLiveArea` khi chèn/kéo/xóa đỉnh, `.mw-crosshair` trong undo/redo); `mgDrawingHtml` có nút Làm lại.
- `template.html`: bỏ `sources` khỏi `PAGES`, `renderSources/renderDataHub/dataHubOnShow`, markup đăng nhập, `auInit`; 3 link `pageHref('sources')` trỏ sang `glossary`. Chữ "trang Dữ liệu" đổi thành "Cài đặt vườn (biểu tượng bánh răng)".
- **UI/Animation (15/11/2026 — Round 1, 2 & 3):** `template.html`, `redesign.css`, `styles.css`, `redesignText.js`, `rotationFarm.js`, `glossaryPage.js`, `myGardens.js`, `cropSuitMap.js`, `mapWorkspace.js`:
  - `#mk-loader` phóng to (`124 px`), nạp tối thiểu `0,67 s` kèm fade-in vào trang; chuyển tab header đồng nhất animation mầm cây mọc `0,1 s` ở mọi tab (gồm `"Vườn của tôi"`) + fade-in trang mới.
  - `#hero`: `.mk-hero-card` căn giữa, intro căn chỉnh vừa 2 dòng (`max-width: 690px`); cảnh nền 2D `#mk-hero-scene` (hàng cây chân trời cao hơn, cây dừa/tán rộng có thân vững chắc, con trâu sừng cong gắn liền đầu gặm cỏ mỗi `18 s`, gió thổi `12 s`, 4 lá rơi, POV bóng râm + nút bật/tắt góc trên phải & chớp mắt POV khi tắt).
  - Dưới `#hero` (`.mk-underground-zone`): nền 2D lòng đất tĩnh `#mk-soil-bg` (`renderSoilScene()`: tầng đất, rễ cây, đá, xương, giun đất tĩnh không animation); `#stats`, `#pages`, `#mission`, `#contact` tối ưu độ tương phản chữ trắng/xanh sáng trên nền đất; 3 thẻ `.mk-tool-card` phóng to rõ nét với phân cấp 2 font đồng bộ; `#footer` phong cách rừng đậm chuyên nghiệp, chữ to rõ.
  - Thống nhất toàn trang đúng 2 font (`--font-sans`: `Plus Jakarta Sans` / `Be Vietnam Pro`, `--font-serif`: `Fraunces`); click burst tách nét quanh trỏ chuột với xanh lá sáng & vàng; skeleton scroll reveal 1 lần toàn bộ 4 trang (`wireMotion` + `panelIo`).
- **Build/Test mới nhất (15/11/2026):** `npm run build` (`3.487 KB · 83 icons`), `npm test` (`155/155` pass), `npm run check:i18n` (`11/11` bảng khớp).

## Tiền tố module

- `geo*` geometry · `fs*` fieldStrategies · `asst*` assistantFallback · `gm*` gardenModel · `em*`/`EM_*` envMapData · `ps*`/`mwFuzzySearchPlace`/`mwPlaceCatalog` placeSearch · `mekong*`/`MEKONG_*` mekongBoundaries.
- `MD/md*` mapDraw · `FP/fp*` fieldPlan · `MW/mw*` mapWorkspace · `MG/mg*` myGardens · `CSM/csm*` cropSuitMap · `MF/mf*` myField · `rf*` rotationFarm · `rx*` rotationExtras · `gp*` glossaryPage.

## Việc còn dở / giới hạn đã biết (giữ trung thực khi Q&A)

- Sau khi gỡ trang Dữ liệu, không còn chỗ nạp file vệ tinh (mưa/NDVI/độ ẩm) thủ công; số đo đất nhập trong Cài đặt vườn. `dataHub.js`, `authStore.js` chỉ còn trong 4 thư mục backup.
- Khí hậu/lịch vụ tính sẵn chỉ có cho 5 huyện mẫu; tỉnh khác chỉ có NASA POWER theo tọa độ (nếu có mạng) và xám ở Tab 2.
- Lớp `soilType` hiện dùng bản đồ nhóm đất FAO ĐBSCL (Open Development Mekong); ranh mặn động g/L mùa khô (SIWRR / Zenodo `10.5281/zenodo.15653696`) chưa tích hợp do tệp nguồn nặng 382 MB. Lớp `grace` đã ẩn khỏi giao diện vì không đủ độ phân giải cho lưới 5 km.
- Tài nguyên lớn vẫn giới hạn bởi dung lượng `localStorage`.
