# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 85 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- **Bản gộp `nasa-merged` (14/11/2026):** gộp 4 nhánh S1 `nasa1-strategy` (Chiến thuật, Luân canh, Thuật ngữ), S2 `nasa2-map` (bản đồ ĐBSCL, lớp môi trường, Tab 3 Chi tiết), S3 `nasa3-my-garden-update` (popup thửa, sửa ranh), S4 `nasa4-UI-UX` (giao diện Vườn của tôi, Cây phù hợp, ô "Tìm ở đây"). 4 thư mục gốc giữ nguyên làm backup.
- **4 trang (`PAGES`):** `#/` Trang chủ · `#/ruong-cua-toi` Vườn của tôi · `#/luan-canh` Luân canh · `#/thuat-ngu` Thuật ngữ. Trang Dữ liệu `#/du-lieu` đã gỡ (địa chỉ cũ mở về Trang chủ); đăng nhập/tài khoản đã gỡ hoàn toàn.
- **Build & kiểm tra:** `npm run check:i18n` (11 bảng khớp), `npm run build` (index.html ~2,9 MB, 50 module, không trùng tên cấp cao nhất), `npm test` 150/150 pass.

## Quyết định đã chốt

- Toàn màn hình kiểu WaterWise cho `#/ruong-cua-toi`: desktop panel trái 380 px (thu gọn được: `MW.leftCollapsed`, nút `toggleLeftPanel`) + bản đồ; mobile bottom sheet 3 nấc.
- Bản đồ chỉ dùng dữ liệu ranh giới S2 `site/data/mekongBoundaries.js` (13 tỉnh, `prov.code`, `MEKONG_ENV_*`): `minZoom 6`, `maxBounds`, `noWrap`, pane `dbsclEnvPane`/`dbsclBorderPane`, 9 lớp môi trường + "Không lớp", thanh "Độ rõ lớp phủ" mặc định 100 %.
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
- Đã kiểm trên trình duyệt (localhost): 4 trang, VI/EN, Tab 1–4, tìm "Soc Trnag"/"Ca Mau"/chuỗi rác, màu vườn khi chưa chọn/đã chọn, popup bằng phím Enter, nút Tab 3, hộp lớp — không lỗi console.

## Tiền tố module

- `geo*` geometry · `fs*` fieldStrategies · `asst*` assistantFallback · `gm*` gardenModel · `ps*`/`mwFuzzySearchPlace`/`mwPlaceCatalog` placeSearch · `mekong*`/`MEKONG_*` mekongBoundaries.
- `MD/md*` mapDraw · `FP/fp*` fieldPlan · `MW/mw*` mapWorkspace · `MG/mg*` myGardens · `CSM/csm*` cropSuitMap · `MF/mf*` myField · `rf*` rotationFarm · `rx*` rotationExtras · `gp*` glossaryPage.

## Việc còn dở / giới hạn đã biết (giữ trung thực khi Q&A)

- Sau khi gỡ trang Dữ liệu, không còn chỗ nạp file vệ tinh (mưa/NDVI/độ ẩm) thủ công; số đo đất nhập trong Cài đặt vườn. `dataHub.js`, `authStore.js` chỉ còn trong 4 thư mục backup.
- Khí hậu/lịch vụ tính sẵn chỉ có cho 5 huyện mẫu; tỉnh khác chỉ có NASA POWER theo tọa độ (nếu có mạng) và xám ở Tab 2.
- Màu lớp môi trường ĐBSCL là bảng phân vùng định tính theo 6 vùng sinh thái (S2), không phải ảnh đo. CẦN XEM LẠI: `mfSampleEnvAt` (myField.js) cộng biến thiên giả lập bằng hàm sin cho từng ô 5 km và in "(xx%)" ở `#mf-env-hover` — trái bất biến 1 nếu không gắn nhãn mô phỏng. GIBS mặc định cố định ngày tham chiếu.
- Tài nguyên lớn vẫn giới hạn bởi dung lượng `localStorage`.
