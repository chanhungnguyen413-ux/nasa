# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 80 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- Phase đã xong: 0, 1, 2 (14/11/2026). Phase tiếp theo: 3.
- Commit gần nhất: "Phase 2: Trạm dữ liệu", nhánh `master`. Đã khai báo `origin` nhưng **chưa đẩy lên GitHub**.
- Build: `index.html` khoảng 1,1 MB (Leaflet nhúng thẳng). `npm test`: 78 ca, đều qua. `check:i18n`: field 207, data 212 khóa.

## Quyết định đã chốt (người duyệt: Hưng, 13/11/2026)

- Được dùng code viết trước ngày thi. Ưu tiên demo chạy được; không phase nào phụ thuộc dữ liệu nhóm đang xử lý.
- 5 huyện ĐBSCL là bản phân tích sâu (có lịch vụ NDVI); tọa độ bất kỳ dùng chế độ nhẹ (khí hậu + cân bằng nước).
- Trang tưới 4 thửa mô phỏng: đã ẩn khỏi menu (`menu:false`), xóa ở Phase 4.
- Tài khoản Earthdata: chưa xác nhận; SMAP/GPM/ECOSTRESS/GRACE chỉ đi qua cổng tải file (Phase 2 đã có).

## Trạng thái nguồn dữ liệu (dò 13/11/2026; chi tiết `docs/API_STATUS.md`; chạy lại `npm run probe`)

- **NASA POWER daily/monthly, Open-Meteo forecast/elevation, SoilGrids, MODIS ORNL, GIBS:** trình duyệt gọi được. SoilGrids thất thường (4–43 s).
- **OpenTopoData:** phải qua server (không CORS). **Ô bản đồ OSM:** mạng hiện tại từ chối; trang tự chuyển sang OpenTopoMap.
- POWER monthly: `T2M_MAX/T2M_MIN` là cực trị tháng, nên dùng số liệu NGÀY gộp thành tháng.

## Đã làm

- **Phase 1** (`#/ruong-cua-toi`): bản đồ + 4 lớp GIBS; khí hậu POWER 2001–2025, ET0 FAO-56, P − ET0, mưa năm khô p10; đèn lúa/đậu xanh/ngô theo yếu tố hạn chế; sổ bằng chứng.
- **Phase 2** (`#/du-lieu`, địa chỉ cũ `#/nguon-du-lieu` vẫn mở được): kéo thả CSV/JSON/GeoJSON → xác nhận cột → hộ chiếu dữ liệu → nhận/bỏ; biểu mẫu số đo đất; bảng hai cột nguồn; danh sách dữ liệu đã nạp (gỡ được). Trên "Ruộng của tôi": khoanh thửa (lưới chung), 4 loại đánh dấu, chuỗi tải lên có nhãn, so mưa tải lên với POWER, số đo ECe đổi đèn, dấu "Hay ngập" đổi tiêu chí úng của cây cạn.
- `samples/`: 3 file mẫu thật + 1 file hỏng cố ý, sinh bằng `node scripts/make-samples.mjs`; `samples/README.md` là hướng dẫn định dạng cho nhóm.

## Đăng ký một trang mới (`site/template.html`, số dòng ngày 14/11)

1. Thêm `<div data-page="id" hidden class="pt-[4.5rem]">` chứa `<section>` vào `<main>`.
2. Thêm một dòng vào `PAGES` (dòng 377): `{ id, slug, nav, icon, menu?, aliases? }`. `menu:false` ẩn khỏi menu; `aliases` là địa chỉ cũ.
3. Thêm chuỗi `navXxx`, `pageCards.id` vào `L.vi`/`L.en`. Gọi `renderXxx()` trong `renderAll()` (1853); việc cần làm khi trang hiện ra đặt trong `showPage` (390). `route` (432), `route()` lúc khởi động (2288).

## Tên cấp cao nhất đã có (build gộp mọi module vào một phạm vi; trùng tên là trang chết)

- Cũ: `clamp`, `round2`, `round5`, `mean` · `mid`, `round`, `LEVELS`, `monthOfDay` · `FILL`, `ymd`, `iso`, `getJson`, `fetchPower`, `fetchForecast`, `fetchNdvi`, `cacheKey` · `fmt`, `hhmm`, `METHOD` · `T`, `GLOSSARY`, `ROT_TEXT`, `SRC_TEXT`, `SOURCES`, `SEASONS`, `ROTATIONS`, `CROPS`, `PROVINCES`, `PRECOMPUTED` · template: `$`, `esc`, `S`, `D`, `L`, `t`, `l`, `icon`, `ICONS`, `PAGES`, `TONE`, `badge`, `term`, `store`, `menuPages`.
- Tiền tố đã dùng: `ev*`, `hz*`/`HARMONIZE_PARAMS`, `CATALOG*`, `GIBS_LAYERS`, `gibs*`, `catalogSource`, `power*`, `upload*`/`UPLOAD_*`, `fi*`/`FI_*`, `ds*`/`DS`, `et0*`, `wb*`, `suit*`/`SUIT_*`, `IRRIGATION_ANSWERS`, `fd*`, `FIELD_TEXT`, `DATA_TEXT`, `mf*`/`MF*`, `mfd*`/`MFD*`, `dh*`/`DH*`, `showValue`, `renderMyField`, `myFieldOnShow`, `renderDataHub`, `dataHubOnShow`.
- **Leaflet phải gọi qua `window.L`** (template đã có `const L`).

## Module và hàm công khai

- `site/core/evidence.js`: `evidence`, `evMissing`, `evDerive`, `evText(vi, en)`. `site/core/harmonize.js`: `hzField` (lưới ô 30 m, tối đa 400 ô), `hzLayer` (uniform/nearest/aggregate), `hzMonthValues`, `hzClimatology`, `hzCompare`, `HARMONIZE_PARAMS` (ngưỡng do nhóm chọn).
- `site/sources/`: `catalog.js` (`CATALOG`, `CATALOG_DYNAMIC` cho file tải lên), `power.js`, `upload.js` (`uploadParse`, `uploadGuessMapping`, `uploadValidate`, `UPLOAD_VARIABLES` có giới hạn vật lý), `farmerInput.js` (`fiSoilForField`, `fiMarksForField`, `fiBelongs`), `dataStore.js` (localStorage `mvm-data-v1`).
- `site/logic/`: `et0.js`, `waterBalance.js`, `suitability.js` (`suitAssess` nhận thêm `salinityEce` dạng Evidence, `salinityType`, `floodMarks`), `fieldData.js` (`fdCollect`, `fdApplyUpload`).
- `site/pages/myField.js` + `myFieldData.js` (khoanh thửa, đánh dấu, chuỗi tải lên) · `dataHub.js` · chữ ở `site/i18n/fieldText.js`, `dataText.js`.

## Sai lệch so với blueprint

- Phase 1: POWER daily thay monthly; khóa bộ nhớ đệm theo tọa độ 0,01°; thêm tiêu chí "úng"; OSM lùi về OpenTopoMap; không gọi skill impeccable.
- Phase 2: thêm nguồn gốc "Mô hình" cho file tải lên (ngoài vệ tinh/đo ruộng) để file NASA POWER không bị gắn nhãn vệ tinh. Độ phân giải gốc do người dùng nhập (không điền sẵn theo sản phẩm vì mỗi sản phẩm có nhiều cấp; bỏ trống = uniform). Chỉ số đo kiểu ECe mới chấm tiêu chí mặn (EC nước, EC 1:5 không quy đổi). Dấu "Hay ngập" cho cây cạn ra Vàng (`SUIT_PARAMS.farmerFloodGrade`, do nhóm chọn). Khoanh thửa (vốn là [N] của Phase 1) làm ở Phase 2 vì lưới chung cần đa giác. Lưu bằng localStorage, chưa dùng IndexedDB.

## Việc còn dở / lỗi đã biết

- Nhiệt độ, pH chưa có bảng chỉ tiêu có nguồn → luôn Xám. Tọa độ bất kỳ chỉ chấm được 2/6 khi chưa có số đo đất.
- Tiêu chí nước thô (tổng mưa vụ so với giữa khoảng FAO; chưa có Kc theo giai đoạn, nước giữ trong đất). Ngưỡng tưới "hạn chế" 150 mm do nhóm chọn.
- Phase 2 chưa làm: [N] độ cao cho từng ô (cần nguồn sai số đứng của Copernicus GLO-90), [N] SoilGrids, [C] NDVI cho tọa độ bất kỳ. Bảng nguồn chưa có dòng SoilGrids.
- Trang Luân canh rộng hơn 375 px khoảng 22 px (thẻ `article`), có từ trước Phase 2.
- File lớn (tới 20 MB) có thể vượt bộ nhớ localStorage: trang báo "chỉ dùng trong lần mở này".
- Ngày ảnh GIBS cố định (13/11) sẽ cũ dần. Chưa tự kiểm tra mở `index.html` bằng nhấp đúp. `.impeccable/` còn mô tả giao diện cũ. Lịch sử git chưa nối với `origin`.

## Ý tưởng vượt đề (chưa làm)

- Lớp GIBS `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` (độ ẩm vùng rễ cả vùng, không cần Earthdata). Lớp `IMERG_Precipitation_Rate_30min`.
