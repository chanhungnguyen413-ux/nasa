# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 85 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- **Phase đã xong:** 0, 1, 2, 3, 4 (14/11/2026). Tất cả trang mô phỏng 4 thửa cũ (`ruong-hom-nay`, `thoi-tiet`, `crops.js`, `demo.js`, `live.js`, `engine.js`, `adviceText.js`) đã được xóa hoàn toàn; `#/ruong-hom-nay` và `#/thoi-tiet` chuyển hướng về `#/ruong-cua-toi`.
- **Nhánh phát hành:** `NEW` của repository `chanhungnguyen413-ux/nasa`; giữ lịch sử Git hiện có.
- **Build & kiểm tra:** `npm run build` tạo index.html (~2,6 MB, nhúng thêm ảnh); `npm test` (133 ca), `npm run check:i18n` (11 bảng, gồm cả mảng) và cổng nguồn gốc đều pass. Lệnh test đã sửa để chạy trên Windows/Node 24.

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
## Giữ vườn ngữ cảnh và sửa ranh (14/11/2026)

- Bộ chọn chỉ quyết định phần cần tô chi tiết. Luôn vẽ mọi vườn đã có ranh; vườn ngoài lựa chọn tô xám, giữ viền màu nhóm và vẫn bấm được. Chọn riêng một vườn bằng hàng bên trái hoặc bấm hình trên bản đồ.
- Bấm vườn đang chọn mở popup ngắn (tên, cây, mức phù hợp, yếu tố cần lưu ý); không mở tooltip/chú giải thường trực. Bỏ hộp “Mức phù hợp theo từng ô” cũ; giữ chú giải nguồn vệ tinh khi bật lớp GIBS.
- Sửa ranh gắn owner gardenId; ẩn ranh đã lưu khi hiện bản nháp; cập nhật Undo/Redo/Xóa góc sau kéo/chèn/chọn đỉnh. Lưu giữ profile và cập nhật ranh/diện tích, hủy giữ ranh cũ. Bản nháp không bị nhầm là zone thật.
- 133 tests qua; Chrome kiểm tra đủ vườn khi chọn, màu viền các nhóm, popup trên máy tính/điện thoại, kéo góc, undo/redo, chèn/xóa góc, lưu/hủy và tải lại. Mã huyện cũ không tồn tại được tra theo tọa độ để tránh làm trắng bản đồ.
## Việc còn dở / giới hạn đã biết (giữ trung thực khi Q&A)

- Chưa có dữ liệu SoilGrids / SMAP tự gọi theo vùng nếu không nạp file qua `#/du-lieu`; lớp GIBS mặc định cố định ngày tham chiếu (`2026-11-13`).
- Tài nguyên lớn (tới 20 MB) vẫn giới hạn bởi dung lượng `localStorage`.
