# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 80 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- Phase đã xong: 0, 1 (14/11/2026). Phase tiếp theo: 2.
- Commit gần nhất: "Phase 1: Ruộng của tôi", nhánh `master`. Đã khai báo `origin` nhưng **chưa đẩy lên GitHub**.
- Build: `index.html` khoảng 1,0 MB (Leaflet nhúng thẳng). `npm test`: 54 ca, đều qua. `check:i18n`: field 185 khóa.

## Quyết định đã chốt (người duyệt: Hưng, 13/11/2026)

- Được dùng code viết trước ngày thi. Ưu tiên demo chạy được; không phase nào phụ thuộc dữ liệu nhóm đang xử lý.
- 5 huyện ĐBSCL là bản phân tích sâu (có lịch vụ NDVI); tọa độ bất kỳ dùng chế độ nhẹ (khí hậu + cân bằng nước).
- Trang tưới 4 thửa mô phỏng: đã ẩn khỏi menu ở Phase 1 (`menu:false`), xóa ở Phase 4.
- Tài khoản Earthdata: chưa xác nhận; SMAP/GPM/ECOSTRESS/GRACE đi qua cổng upload, không gọi trực tiếp.

## Trạng thái nguồn dữ liệu (dò 13/11/2026; chi tiết `docs/API_STATUS.md`; chạy lại `npm run probe`)

- **NASA POWER daily và monthly, Open-Meteo forecast/elevation, SoilGrids, MODIS ORNL, GIBS:** trình duyệt gọi được. SoilGrids thất thường (4–43 s).
- **OpenTopoData:** phải qua server (không CORS). **Ô bản đồ OSM:** mạng hiện tại từ chối kết nối; trang tự chuyển sang OpenTopoMap.
- POWER monthly: `T2M_MAX/T2M_MIN` là cực trị tháng, nên Phase 1 gom từ số liệu NGÀY. Mưa daily là mm/ngày, cộng thành mm/tháng.

## Phase 1 đã làm (trang `#/ruong-cua-toi`)

- Bản đồ Leaflet (chọn 1 trong 5 huyện, chạm bản đồ, vị trí của tôi) + 4 lớp ảnh GIBS cố định ngày (NDVI, IMERG, SMAP L4 nhãn "mô hình", LST).
- Khí hậu 25 năm (2001–2025) từ POWER daily, ET0 FAO-56 bước tháng, cân bằng nước P − ET0, mưa năm khô p10.
- Đèn phù hợp cho lúa, đậu xanh, ngô theo yếu tố hạn chế nhất; dưới một nửa tiêu chí chấm được → Xám "chưa đủ dữ liệu".
- Mọi số in qua `showValue()`; chạm vào số mở sổ bằng chứng (loại, nguồn, giai đoạn, công thức, đầu vào).
- Hiển thị: bản tính sẵn trong trang/bộ nhớ đệm trước, rồi lấy mới qua mạng. 5 huyện chạy được không cần mạng.

## Đăng ký một trang mới (`site/template.html`, số dòng ngày 14/11)

1. Thêm `<div data-page="id" hidden class="pt-[4.5rem]">` chứa `<section>` vào `<main>`.
2. Thêm một dòng vào `PAGES` (dòng 376): `{ id, slug, nav, icon, menu? }`. `menu:false` thì ẩn khỏi menu, thẻ trang chủ, chân trang (qua `menuPages()`).
3. Thêm chuỗi `navXxx` và `pageCards.id` vào `L.vi`/`L.en`. Gọi `renderXxx()` trong `renderAll()` (1850). Liên quan: `showPage` (388), `route` (429), lời gọi `route()` lúc khởi động (2284).

## Tên cấp cao nhất đã có (build gộp mọi module vào một phạm vi; trùng tên là trang chết)

- Cũ: `clamp`, `round2`, `round5`, `mean` · `mid`, `round`, `LEVELS`, `monthOfDay` · `FILL`, `ymd`, `iso`, `getJson`, `fetchPower`, `fetchForecast`, `fetchNdvi`, `cacheKey` · `fmt`, `hhmm`, `METHOD` · `T`, `GLOSSARY`, `ROT_TEXT`, `SRC_TEXT`, `SOURCES`, `SEASONS`, `ROTATIONS`, `CROPS`, `PROVINCES`, `PRECOMPUTED` · template: `$`, `esc`, `S`, `D`, `L`, `t`, `l`, `icon`, `ICONS`, `PAGES`, `TONE`, `badge`, `term`, `store`, `menuPages`.
- Phase 1 dùng tiền tố: `ev*`/`EV_*` (evidence), `CATALOG`, `GIBS_LAYERS`, `gibs*`, `catalogSource`, `power*`/`POWER_*`, `et0*`/`ET0_*`, `wb*`/`WB_*`, `suit*`/`SUIT_*`, `IRRIGATION_ANSWERS`, `FIELD_TEXT`, `mf*`/`MF*`, `showValue`, `renderMyField`, `myFieldOnShow`.
- **Leaflet phải gọi qua `window.L`** (template đã có `const L` là chữ trang chủ).

## Module mới và hàm công khai (Phase 1)

- `site/core/evidence.js`: `evidence`, `evMissing`, `evDerive` (thiếu → missing, mô phỏng → simulated), `evText(vi, en)` cho ghi chú/công thức song ngữ.
- `site/sources/catalog.js`: `CATALOG`, `GIBS_LAYERS`, `gibsTileTemplate`, `catalogSource`. `site/sources/power.js`: `powerFetchRecord`, `powerClimate`, `powerReadCache/WriteCache`, `powerFetchElevation`.
- `site/logic/et0.js`: `et0Compute` (test tái lập Ví dụ 17 FAO-56: 5,72 mm/ngày), `et0Months`. `waterBalance.js`: `wbMonthly`. `suitability.js`: `suitAssess`, `suitWindow`, `suitFindCrop`, `SUIT_PARAMS` (ngưỡng do nhóm chọn, in ra trang).
- `site/pages/myField.js` + `site/i18n/fieldText.js`. Tính sẵn: `node scripts/fetch-power-monthly.mjs` → `site/data/precomputed/power_monthly.json`.
- Nhãn `label` của Evidence là khóa ổn định (vd. `deficitDry`); chữ hiển thị ở `FIELD_TEXT.*.evLabels`, đơn vị ở `units`.

## Sai lệch so với blueprint

- Phase 0: 3 commit; `.exe` của skill không vào git; thêm `builtPage.test.mjs`; GIBS hạn 60 s.
- Phase 1: POWER daily thay monthly (lý do ở trên); khóa bộ nhớ đệm theo tọa độ làm tròn 0,01° (chưa theo ô lưới POWER); thêm tiêu chí "úng" (blueprint 4.4) để huyện chấm được 3/6; OSM tự lùi về OpenTopoMap; build quét biểu tượng lucide trong cả module; chip lời khuyên mô phỏng ở hero và nút lời khuyên trên điện thoại đã ẩn; không gọi skill impeccable (bám DESIGN.md hiện có).

## Việc còn dở / lỗi đã biết

- Nhiệt độ, pH, độ mặn chưa có bảng chỉ tiêu có nguồn → luôn Xám. Tọa độ bất kỳ chỉ chấm được 2/6 nên luôn "chưa đủ dữ liệu".
- Tiêu chí nước thô: so tổng mưa vụ với giữa khoảng nhu cầu FAO; chưa có Kc theo giai đoạn, chưa tính nước giữ trong đất. Ngưỡng tưới "hạn chế" 150 mm do nhóm chọn.
- Ngày ảnh GIBS cố định (dò 13/11) sẽ cũ dần. Sổ bằng chứng: đầu vào của tổng theo tháng hiện cùng một tên, chưa ghi tháng.
- Chưa tự kiểm tra mở `index.html` bằng nhấp đúp (trình duyệt trong app không mở `file://`); người dùng cần thử.
- `.impeccable/surfaces/index-html.md`, `design.json` còn mô tả giao diện cũ. Lịch sử git chưa nối với `origin`.
- [N] chưa làm: vẽ ranh thửa, dải dự báo 7 ngày Open-Meteo.

## Ý tưởng vượt đề (chưa làm)

- Lớp GIBS `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` (độ ẩm vùng rễ cả vùng, không cần Earthdata). Lớp `IMERG_Precipitation_Rate_30min` (mưa gần thời gian thực).
