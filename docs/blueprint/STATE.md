# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 85 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- **Phase đã xong:** 0, 1, 2, 3, 4 (14/11/2026). Tất cả trang mô phỏng 4 thửa cũ (`ruong-hom-nay`, `thoi-tiet`, `crops.js`, `demo.js`, `live.js`, `engine.js`, `adviceText.js`) đã được xóa hoàn toàn; `#/ruong-hom-nay` và `#/thoi-tiet` chuyển hướng về `#/ruong-cua-toi`.
- **Nhánh:** `master` (đã khai báo `origin` nhưng chưa đẩy lên GitHub).
- **Build & kiểm tra:** `node scripts/build-site.mjs` tạo `index.html` (~1,14 MB, Leafet + Lucide + precomputed JSON nhúng thẳng). `node --test scripts/tests/` (114 ca), `node scripts/check-i18n.mjs` (9 bảng VI/EN khớp 100%), `node scripts/check-provenance.mjs` đều pass.

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

## Việc còn dở / giới hạn đã biết (giữ trung thực khi Q&A)

- Chưa có dữ liệu SoilGrids / SMAP tự gọi theo vùng nếu không nạp file qua `#/du-lieu`; lớp GIBS mặc định cố định ngày tham chiếu (`2026-11-13`).
- Chưa tự động mở trình duyệt kiểm tra ảnh chụp file `index.html` trực tiếp qua `file://` trong phiên này (đã chạy đầy đủ `node --check` trên mọi `<script>` trong `index.html` + 114 unit/integration tests).
- Tài nguyên lớn (tới 20 MB) vẫn giới hạn bởi dung lượng `localStorage`.
