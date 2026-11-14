# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 85 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- **Phase đã xong:** 0, 1, 2, 3, 4 (14/11/2026). Tất cả trang mô phỏng 4 thửa cũ (`ruong-hom-nay`, `thoi-tiet`, `crops.js`, `demo.js`, `live.js`, `engine.js`, `adviceText.js`) đã được xóa hoàn toàn; `#/ruong-hom-nay` và `#/thoi-tiet` chuyển hướng về `#/ruong-cua-toi`.
- **Nhánh phát hành:** `NEW` của repository `chanhungnguyen413-ux/nasa`; giữ lịch sử Git hiện có.
- **Build & kiểm tra:** `npm run build` tạo index.html (~2,6 MB, nhúng thêm ảnh); `npm test` (141 ca), `npm run check:i18n` (11 bảng, gồm cả mảng) và cổng nguồn gốc đều pass. Lệnh test đã sửa để chạy trên Windows/Node 24.

## Quyết định đã chốt

- **Toàn màn hình kiểu WaterWise cho `#/ruong-cua-toi`:** desktop panel trái `380 px` (3 bước) + khay so sánh rộng + bản đồ; mobile bản đồ toàn màn hình + bottom sheet 3 nấc (`peek` / `half` / `full`); nút điều khiển nổi `48 px`.
- **Nền vệ tinh mặc định & an toàn ranh thửa:** Esri World Imagery → OpenStreetMap → OpenTopoMap → chế độ ranh thửa ngoại tuyến; chạm bản đồ khi không bật "Chọn chỗ khác" không xóa ranh thửa đang vẽ (`picking` mode).
- **Tách `eligibility` và `riskLevel` (`fieldStrategies.js`):** phương án không đổi cây ra `ineligible` (có lý do), điểm ngoài 5 huyện / Chợ Lách ra `insufficient_data` kèm `missingFields`, chỉ xếp hạng trong nhóm `eligible`. Phát hiện kết quả cũ qua `fsInputKey`.
- **Đơn vị & ngưỡng nhóm chọn (`// do nhóm chọn`):** chỉ dùng `ha` và `m²` (không đoán đổi ra "công"); `maxFieldHa: 50`, `districtRadiusKm: 15`, `closeTotalGap: 5`, `limitedIrrigationMm: 150`.
- **Trợ lý AI an toàn:** mọi số AI trả lời từ `/api/assistant` được kiểm tra qua `asstVerifyReply` đối chiếu `MF_LEDGER` và ngữ cảnh; số lạ bị thay bằng `fallbackAnswer(..., 'sample')`.

## Đã làm ở Phase 4

- `site/data/provinces.js`: tách `PROVINCES` khỏi `demo.js` cũ; cập nhật import ở `myField.js`, `mapWorkspace.js`, `fetch-power-monthly.mjs`, test.
- `site/logic/geometry.js` + `scripts/tests/geometry.test.mjs`: diện tích cầu, độ dài cạnh, tự cắt, validate (<3 đỉnh / quá 50 ha), kéo/chèn/xóa đỉnh, vẽ hình chữ nhật, GeoJSON, parse tọa độ, tìm huyện gần nhất.
- `site/logic/fieldStrategies.js` + `scripts/tests/fieldStrategies.test.mjs`: động cơ đánh giá 3 chiến lược gắn mảnh đất, tách `eligibility` / `riskLevel`, `fsInputKey`.
- `site/pages/mapDraw.js`, `site/pages/fieldPlan.js`, `site/pages/mapWorkspace.js`, `site/i18n/mapText.js`, `site/styles.css`, `site/sources/catalog.js` (`esriImagery`): công cụ khoanh thửa nâng cấp, kế hoạch hành động gắn `evaluationId`, legend/opacity GIBS & lưới đồng nhất, thanh tìm kiếm/tọa độ, xác nhận GPS.
- `site/logic/assistantFallback.js` + `scripts/tests/assistant.test.mjs`: viết lại hoàn toàn cho Mùa Vụ Mekong (`assistantContext`, `asstLedgerNumbers`, `asstVerifyReply`, `fallbackAnswer`).
- `site/template.html`, `site/i18n/sourcesText.js`, `scripts/build-site.mjs`, `PRODUCT.md`, `docs/DEMO.md`: gỡ hoàn toàn dashboard 4 thửa cũ, công bố Esri basemap & thư viện trên `#/du-lieu`, viết kịch bản trình diễn.

## Tiền tố & Module mới (Phase 4)

- `geo*`/`GEO_PARAMS` (`site/logic/geometry.js`), `fs*`/`FIELD_STRAT_PARAMS`/`FIELD_CHANGE_ANSWERS` (`site/logic/fieldStrategies.js`), `asst*`/`assistantContext`/`fallbackAnswer` (`site/logic/assistantFallback.js`).
- `MD*`/`md*` (`site/pages/mapDraw.js`), `FP*`/`fp*` (`site/pages/fieldPlan.js`), `MW*`/`mw*` (`site/pages/mapWorkspace.js`), `MAP_TEXT` (`site/i18n/mapText.js`).
- `PROVINCES` (`site/data/provinces.js`).

## Giao diện mới (14/11/2026)

- Trang chủ hai cột, nền kem/xanh đậm, ba công cụ, quy trình và CTA; VI/EN trong redesignText.js, CSS mới ở site/redesign.css. DESIGN.md là tài liệu hiện hành.
- Ảnh trang chủ nhúng trong HTML, nguồn Joel Vodell / Unsplash tại site/assets/README.md.
- Sửa tab cây phù hợp: hàm lịch không tồn tại, sai ID cây, sai tên đầu vào; dùng cùng lịch NDVI với Luân canh, giữ thiếu thông tin tưới và đất.
- Đồng bộ bảng thông tin bản đồ theo mốc 1.024 px khi mở trang / đổi kích thước. Đã kiểm tra Chrome 360/390/768/1024/1440 px, các trang, menu, chuyển VI/EN, 9 cây × 4 thời kỳ và bản HTML ngoại tuyến; không có lỗi JavaScript hay tràn ngang.

## Nhóm và vườn con (14/11/2026)

- Tạo nhóm rỗng, đặt tên/màu, + thêm vườn con; từng vườn có settings riêng (cây, vụ/tháng gieo, tưới, pH/EC/kiểu đo, hữu cơ, ngày đo, loại đất, ghi chú), đổi tên/chuyển nhóm/xóa xác nhận.
- Bộ chọn Nhóm/Vườn riêng là nút mở danh sách, lưu lựa chọn. Màu cha dùng viền; chưa chọn cây là xám; cây + hồ sơ đủ dữ liệu ra xanh/vàng/đỏ qua evaluator có nguồn, không tự tạo ngưỡng.
- `gardenModel.js`, `gardenText.js`, `gardens.css`; viết lại myGardens.js, nối vào mapWorkspace và công cụ vẽ. Snapshot có gardenGroups/gardenView/profile, tự chuyển vườn cũ vào nhóm; bản mới không tự tạo dữ liệu minh họa.
- Thêm gardenId cho số đo/file/dấu mới; profile và đánh giá độc lập dù trùng tọa độ. Sửa khôi phục hồ sơ khi chuyển vườn, giữ xám nếu chưa có lịch vụ/tháng gieo.
- 124 ca kiểm tra qua; Chrome kiểm tra tạo nhóm/vườn, vẽ ranh, xám→xanh/vàng/đỏ, đổi cây, màu cha, chuyển nhóm, đổi tên, xóa, tải lại, VI/EN và 390/768/1024/1440 px; tạo/lưu/khôi phục bằng HTML ngoại tuyến cũng qua.
## Sửa tính lại zone khi lưu (14/11/2026)

- Tái hiện được 3 lỗi: số đo cũ ghi đè settings vừa lưu; bản ghi không có gardenId ảnh hưởng vườn lân cận; lớp màu tổng nằm dưới các ô zone làm pha màu.
- Settings đất là đầu vào hiện hành cho cả vườn, được ưu tiên trên lịch sử/điểm đo của cùng chỉ tiêu. Điểm đo có gardenId chỉ phân vùng chỉ tiêu còn thiếu trong settings. Dữ liệu cũ chỉ nhận gardenId khi vị trí thuộc duy nhất một vườn; không xóa dữ liệu mơ hồ.
- Môi trường theo vườn/tọa độ, giữ ổn định khi lưu/đổi lựa chọn; cache POWER v2 không chung khóa 0,01°. Phản hồi mạng chậm đọc hồ sơ mới nhất. Một snapshot kết quả dùng chung cho map/list/card, khóa đầu vào đổi thì tính lại.
- Không tô nền tổng phía dưới các ô zone; lớp cũ bị thay thế khi lưu. Thêm “Căn cứ màu vùng” và giá trị/bằng chứng; ghi rõ hữu cơ/loại đất/ghi chú chưa đổi màu khi chưa có quy tắc kiểm chứng.
- 131 tests qua. Chrome bấm nút Lưu thật với lịch sử đo mới ngày hơn: ph 3→7,2→6 đổi đỏ→vàng→xanh ngay; không gọi lại nguồn môi trường khi lưu; kiểm tra cell layer, xóa cây→xám, reload và phản hồi môi trường chậm đều qua.
## Luân canh theo từng thửa (14/11/2026)

- `fieldStrategies.js`: chặn cứng tại thửa (`waterRed/phRed/tempRed/cycleRed` từ tiêu chí Đỏ, `salinityRed` khi ECe > ngưỡng FAO-29 × `severeSalinityFactor` 2,0 — DO NHÓM CHỌN, không phải số FAO); điểm thửa = điểm tổng − 6 × số vụ Vàng (`yellowSeasonPenalty`, do nhóm chọn); `fsSeasonAlternatives` chấm 9 cây × 3 vụ; `fsCalendarSource` không tin `loc.id` khi tọa độ lệch tâm huyện.
- Sửa nối: vườn ngoài 15 km không nhận `districtId` (`myGardens.js`), Ruộng của tôi mượn lịch theo `fsCalendarSource`, Tab 4 không nhân đôi giả định mưa, `shareSnapshot`/trợ lý gọi `rankRotations` đúng chữ ký (trước đó sai, `best` luôn rỗng), mở `#/luan-canh` thì vẽ lại theo `DS.gardens`.
- `site/pages/rotationFarm.js` (`rf*`): trang 2 tầng kiểu YouTube. Tầng 1 lưới thẻ 16:9 (ảnh Esri World Imagery THẬT ghép từ ô z12–17, ranh thửa chiếu Web Mercator cùng hệ nên nằm đúng chỗ, nhãn nguồn chỉ gắn khi thật có NASA POWER/MODIS), thẻ 5 huyện, thẻ "+ Vẽ thửa", bảng tổng hợp thu gọn. Tầng 2: nút quay lại + chip đổi thửa, thanh minh bạch dữ liệu (đã có / thiếu + nút bổ sung), 4 nút mục tiêu, chọn phương án, 3 câu hỏi (lịch 3 vụ · 3 thanh so sánh nước/đất/hiệu quả từ `rankRotations` · 3 bước chuẩn bị), bảng 9 cây. Chữ ở `STRAT_TEXT.farm`.
- Khí hậu của thửa: cache NASA POWER đúng tọa độ, không có thì số tính sẵn cấp huyện (ghi rõ trên trang). Câu "10 năm" KHÔNG dùng cho Linh et al. 2015 vì trích dẫn không ghi số năm.
- Tab 4. Chiến thuật (`mapWorkspace.js`) thành thẻ cầu nối `rfBridgeHtml`: không mở khay `#mw-compare-dock` nữa; nút chính `rfOpenGardenStrategy(id)` mở thẳng tầng 2 ở `#/luan-canh`, nút phụ vẫn mở kế hoạch hành động (`data-mw="openPlan"`).
- "Hay ngập": `rfFloodMarksEvidence(DS.marks, g.id)` đếm dấu `type === 'flood'` (đúng `FI_MARK_TYPES` mà nút "Hay ngập" ở `myFieldData.js` lưu) theo đúng `gardenId` → `floodMarks` của `fsAssessField`. Phiên 14/11 (lần 2) sửa lỗi bản trước đếm `'waterlogged'` nên dấu thật luôn ra 0; test khóa tên loại với `FI_MARK_TYPES`. Chrome: thửa có 2 dấu → "Hay ngập · 2 điểm", cây màu báo ngập úng, Tab 4 → Luân canh không lỗi console.
- 141 test (8 tình huống nông dân, đếm dấu ngập theo thửa, toán ô ảnh vệ tinh); Chrome kiểm lưới / chi tiết / đổi phương án / chế độ huyện / VI-EN / 375 px / cầu nối Tab 4 → kế hoạch → Luân canh, không lỗi console.

## Prompt 03 — Luân canh tối giản & trang Thuật ngữ (14/11/2026)

- `#/luan-canh` chỉ còn tiêu đề + mô tả + câu nhắc khuyến nông (bất biến 5) + link chữ sang Thuật ngữ, rồi lưới thẻ thửa. Đã gỡ bộ chọn huyện, dải chip thuật ngữ, 2 `<details>` (`#rot-controls`, `#rot-strip`/`#rot-results`), bảng tổng hợp, 5 thẻ huyện, `R.footnote`. `renderRotations()` gọi thẳng `rfRender()`; `renderSeasonStrip/Controls/Results` có guard null (nút mục tiêu vẫn gọi chúng). Giữ dòng ghi công Esri (điều khoản ảnh). Chip "theo huyện" chỉ hiện khi chưa có thửa.
- Trang mới `#/thuat-ngu` (`site/pages/glossaryPage.js`, `gp*`): 22 thuật ngữ (thêm `ece`, `ph`, `seasons`, `soiltype`; số chép từ `cropLibrary` FAO-29/Ecocrop), `category` ∈ cultivation/soilWater/satelliteWeather, tìm không dấu (`gpFold`, `gpFilter`), chip lọc, link "Xem tất cả thuật ngữ ↗" trong popover cuộn tới đúng từ. Chữ ở `REDESIGN_TEXT.*.glossaryPage`. Menu 5 mục.
- `rfSwap` (View Transition) có lưới an toàn 300 ms + bắt lỗi promise: trước đó khi trình duyệt không vẽ khung hình, bấm thẻ không mở được chi tiết.
- 144 test (thêm `glossaryPage.test.mjs`). Chrome: 375/1280 px, VI/EN, không tràn ngang, không lỗi console.

## Việc còn dở / giới hạn đã biết (giữ trung thực khi Q&A)

- Chưa có dữ liệu SoilGrids / SMAP tự gọi theo vùng nếu không nạp file qua `#/du-lieu`; lớp GIBS mặc định cố định ngày tham chiếu (`2026-11-13`).
- Tài nguyên lớn (tới 20 MB) vẫn giới hạn bởi dung lượng `localStorage`.
