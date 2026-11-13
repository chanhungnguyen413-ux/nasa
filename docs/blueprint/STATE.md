# Trạng thái bàn giao

File này là trí nhớ giữa các phiên. Phiên nào cũng đọc đầu tiên và cập nhật cuối cùng. Giữ ngắn (dưới 80 dòng); xóa thứ đã lỗi thời.

## Đang ở đâu

- Phase đã xong: 0 (13/11/2026). Phase tiếp theo: 1.
- Commit gần nhất: "Phase 0: test hồi quy và dò nguồn dữ liệu", nhánh `master` (xem `git log --oneline`). Đã khai báo `origin` nhưng **chưa đẩy lên GitHub**.
- Build: `index.html` 664.465 byte; build lại cho kết quả giống hệt. `npm test`: 36 ca, đều qua.

## Quyết định đã chốt (người duyệt: Hưng, 13/11/2026)

- Được dùng code viết trước ngày thi.
- Ưu tiên có demo chạy được trước; không phase nào phụ thuộc dữ liệu nhóm đang xử lý.
- Giữ 5 huyện ĐBSCL làm bản phân tích sâu (có lịch vụ NDVI); tọa độ bất kỳ dùng chế độ nhẹ (khí hậu + cân bằng nước).
- Trang tưới với 4 thửa mô phỏng: thay bằng "Ruộng của tôi" (ẩn ở Phase 1, xóa ở Phase 4).
- Tài khoản Earthdata: chưa xác nhận; SMAP/GPM/ECOSTRESS/GRACE đi qua cổng upload, không gọi trực tiếp.

## Trạng thái nguồn dữ liệu (dò 13/11/2026; chi tiết ở `docs/API_STATUS.md`; chạy lại: `npm run probe`)

- **NASA POWER monthly:** trình duyệt gọi được (CORS `*`, khoảng 1,7 s). Đủ 9 tham số, 2001–2025, giá trị rỗng `-999`, khóa `YYYYMM` và `YYYY13` (giá trị cả năm).
- **NASA POWER daily:** trình duyệt gọi được, số liệu trễ khoảng 4 ngày.
- **Tọa độ ngoài ĐBSCL** (thử ở Đắk Lắk): POWER monthly trả đủ 9 tham số trong 1,7 s. Chế độ "tọa độ bất kỳ" khả thi.
- **Open-Meteo forecast:** trình duyệt gọi được. Không phải NASA.
- **Open-Meteo elevation:** trình duyệt gọi được. Là Copernicus DEM GLO-90 (90 m), không phải SRTM; phải ghi công Copernicus và Open-Meteo.
- **OpenTopoData `srtm30m`:** PHẢI QUA SERVER (không CORS). Giới hạn: 1 lần gọi/giây, 1000 lần/ngày, 100 tọa độ/lần.
- **SoilGrids v2.0:** trình duyệt gọi được (CORS `*`) và có số cho pH, carbon hữu cơ, sét, cát, limon (phải chia `d_factor`). **Thất thường:** lần dò đầu 4,5 s, lần sau 43 s. Không được để giao diện chờ nó; luôn giữ đường lui `missing`.
- **MODIS ORNL:** trình duyệt gọi được (4–6 s cho 1 mốc ảnh), ảnh mới nhất 16/10/2026. Trang nên dùng bản tính sẵn.
- **NASA GIBS:** tải ảnh được. 62 lớp khớp từ khóa (NDVI 5, IMERG 2, SMAP 23, LST 32); bảng định danh đầy đủ ở `API_STATUS.md`.

## Ảnh hưởng tới Phase 1 (đọc trước khi viết `power.js` và `et0.js`)

- **`T2M_MAX`, `T2M_MIN` của điểm cuối monthly là cực trị của cả tháng, KHÔNG phải trung bình ngày** (đã kiểm chứng bằng số với dữ liệu ngày năm 2025). FAO-56 cần Tmax/Tmin trung bình tháng: phải gom từ điểm cuối daily. Bảy tham số còn lại là trung bình ngày.
- **Mưa tháng là mm/ngày** (chuỗi đơn vị `mm/day`; tỉ số kiểm chứng 28,3–31): nhân với số ngày của tháng để ra mm/tháng. Bức xạ: `MJ/m^2/day`.
- Gợi ý lớp GIBS (Phase 1 quyết): NDVI `MODIS_Terra_L3_NDVI_16Day` (zoom 9, cùng chu kỳ 16 ngày với số liệu phân tích); mưa `IMERG_Precipitation_Rate`; độ ẩm đất `SMAP_L4_Analyzed_Surface_Soil_Moisture` (ô ảnh thử của bản L2/L3 chỉ khoảng 1 KB, có vẻ trống tại điểm thử; tiêu đề bản L4 ghi "Model Value-Added" nên nhãn là mô hình); nhiệt bề mặt `MODIS_Terra_L3_Land_Surface_Temp_8Day_Day`.
- Biểu tượng lucide chỉ được nhúng khi tên của nó xuất hiện trong `site/template.html` giữa hai dấu nháy đơn (build chỉ quét template). Lớp CSS thì build quét cả template lẫn module.

## Đăng ký một trang mới (`site/template.html`, số dòng ngày 13/11)

1. Thêm `<div data-page="id" hidden class="pt-[4.5rem]">` chứa `<section>` vào trong `<main>` (dòng 29–52).
2. Thêm một dòng vào mảng `PAGES` (dòng 365): `{ id, slug, nav: 'navXxx', icon }`. Menu, menu điện thoại, thẻ trang chủ và chân trang tự lấy từ mảng này.
3. Thêm chuỗi `navXxx` và `pageCards.id` vào `L.vi` (từ dòng 83) và `L.en` (từ dòng 145).
4. Viết `renderXxx()` rồi gọi trong `renderAll()` (dòng 1842). Liên quan: `showPage` (375), `goTo` (401), `route` (415), `renderNav` (433), `renderPagesOverview` (722), `renderRotations` (949), `renderSources` (1542), `openTerm` (1666), lời gọi `route()` lúc khởi động (2269).

## Tên cấp cao nhất đã có (build gộp mọi module vào một phạm vi; trùng tên là trang chết)

`clamp`, `round2`, `round5`, `mean` (engine.js) · `mid`, `round`, `LEVELS`, `monthOfDay` (rotation.js) · `FILL`, `ymd`, `iso`, `getJson`, `fetchPower`, `fetchForecast`, `fetchNdvi`, `cacheKey` (live.js) · `fmt`, `hhmm`, `METHOD` (adviceText.js) · `T`, `GLOSSARY`, `ROT_TEXT`, `SRC_TEXT`, `SOURCES`, `SEASONS`, `ROTATIONS`, `CROPS`, `PROVINCES`, `PRECOMPUTED` · trong template: `$`, `esc`, `S`, `D`, `L`, `t`, `l`, `icon`, `ICONS`, `PAGES`, `TONE`, `badge`, `term`, `store`. `npm test` (`builtPage.test.mjs`) báo ngay khi trùng.

## Module mới và hàm công khai

- `scripts/tests/cases.mjs`: `loadPrecomputed()`, `rotationCases(PRE)`, `seasonStripCases(PRE)`, `assertMatchesGolden()`. Ảnh chụp ở `scripts/tests/golden/`; ghi lại bằng `node scripts/update-golden.mjs` (chỉ khi cố ý đổi logic).
- `scripts/probe-apis.mjs` và `scripts/probe/{request,power,gibs,report}.mjs`: dò nguồn, ghi `docs/API_STATUS.md`. Dùng lại được: `timedFetch`, `analysePowerMonthly`, `monthlyMeaning`, `parseCapabilities`, `tileUrl`.

## Sai lệch so với blueprint

- Git: 3 commit (baseline, dọn thư mục skill, Phase 0). File `.exe` của skill impeccable không vào git (xem `.gitignore`).
- Thêm `builtPage.test.mjs` (kiểm tra cú pháp `index.html` đã build), ngoài hai test phase yêu cầu.
- Dò GIBS: file danh mục khoảng 5,8 MB được hạn 60 giây thay vì 15. Thử ô ảnh cho mọi lớp tìm được (62 lớp).
- Nguồn nào quá 15 giây được thử lại một lần với 60 giây, để phân biệt "chậm" với "chết".

## Việc còn dở / lỗi đã biết

- `.impeccable/surfaces/index-html.md` và `.impeccable/design.json` còn mô tả giao diện tưới tiêu cũ. Làm mới bằng skill impeccable trước khi dựng giao diện ở Phase 1.
- Lịch sử git trên máy chưa nối với kho GitHub `origin`; chưa quyết định cách đẩy lên.

## Ý tưởng vượt đề (chưa làm)

- Lớp ảnh `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` của GIBS: cho thấy độ ẩm vùng rễ cả vùng mà không cần tài khoản Earthdata. Chi phí: thêm 1 nút lớp ở Phase 1.
- Lớp `IMERG_Precipitation_Rate_30min` của GIBS: ảnh mưa gần thời gian thực (30 phút một ảnh). Chi phí: xử lý ngày giờ trong địa chỉ ô ảnh.
