# Phase 0 — Lưới an toàn và dò nguồn dữ liệu

**Mục tiêu:** có git, có test hồi quy cho phần đang chạy tốt, và biết chắc nguồn dữ liệu nào dùng được trước khi xây lên trên. Phase này **không đổi hành vi của trang**.

**Đọc trước:** `CLAUDE.md`, `docs/blueprint/STATE.md`, mục 1–3 của `docs/blueprint/00-BLUEPRINT.md`, `PRODUCT.md`, `package.json`, `scripts/build-site.mjs`, `scripts/test-rotation.mjs`, `site/logic/rotation.js`, `site/logic/rotationInputs.js`, `site/logic/seasonStrip.js`, `site/data/live.js`.

## Việc phải làm

1. **[B] Git.** Kiểm tra `git --version`. Có: `git init`, commit toàn bộ hiện trạng với thông điệp "baseline trước nâng cấp". Không có: dừng lại, báo người dùng cài Git for Windows; trong lúc chờ, sao chép thư mục project sang `../nasa-master-backup-phase0` rồi làm tiếp.
2. **[B] Build tái lập được.** Chạy `npm install` nếu thiếu, rồi `npm run build`. Ghi kích thước `index.html`. Nếu build lỗi, sửa cho chạy trước khi làm gì khác và ghi nguyên nhân vào `STATE.md`.
3. **[B] Test hồi quy.** Thêm `"test": "node --test scripts/tests/"` vào `package.json` (dùng `node:test` có sẵn, không thêm thư viện). Viết:
   - `scripts/tests/rotation.test.mjs`: chạy `rankRotations` cho cả 5 huyện với ưu tiên mặc định, một bộ ưu tiên lệch, và `dryRainPct: -30`; so với ảnh chụp kết quả lưu ở `scripts/tests/golden/rotation.json` (tạo từ code hiện tại, kiểm tra bằng mắt là hợp lý rồi mới lưu). Huyện Chợ Lách phải ra `rankable: false`.
   - `scripts/tests/seasonStrip.test.mjs`: tương tự cho `seasonStrip`.
   Ba script in ra màn hình hiện có giữ nguyên.
4. **[B] Dò API.** Viết `scripts/probe-apis.mjs` (Node 22 có sẵn `fetch`), gọi từng nguồn với hạn 15 giây tại điểm Cần Thơ · Cờ Đỏ (10,1 ; 105,43), gửi kèm header `Origin: http://localhost:5173` để đọc `access-control-allow-origin`. Ghi kết quả ra `docs/API_STATUS.md`: URL, mã HTTP, thời gian, có CORS hay không, đơn vị/ghi chú, và phán quyết một trong bốn: `TRÌNH DUYỆT GỌI ĐƯỢC` / `PHẢI QUA SERVER` (không CORS) / `CHỈ DÙNG BẢN LƯU` / `KHÔNG DÙNG ĐƯỢC`. Các nguồn:
   - NASA POWER **monthly** point (`/api/temporal/monthly/point`, community AG) với `T2M, T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR, GWETROOT, GWETTOP`, từ 2001 đến năm đủ gần nhất. Ghi lại: tham số nào trả về, **chuỗi đơn vị của từng tham số lấy từ chính phản hồi**, giá trị rỗng (fill), định dạng khóa thời gian (có khóa "tháng 13" là trung bình năm hay không), mưa tháng là mm/ngày hay mm/tháng.
   - NASA POWER daily point (đang dùng trong `live.js`).
   - Open-Meteo forecast (đang dùng) và Open-Meteo elevation.
   - Một dịch vụ độ cao SRTM công khai (ví dụ OpenTopoData `srtm30m`): có CORS không, điều khoản sử dụng.
   - SoilGrids REST v2.0 `properties/query` (pH, carbon hữu cơ, sét, cát, limon; các tầng 0–30 cm).
   - MODIS ORNL subset (đang dùng).
   - NASA GIBS: tải `WMTSCapabilities.xml` của `epsg3857/best`, tìm theo từ khóa các lớp NDVI (MODIS), lượng mưa (IMERG), độ ẩm đất (SMAP), nhiệt độ bề mặt đất (MODIS LST). Với mỗi lớp tìm được ghi: định danh chính xác, TileMatrixSet, mức zoom tối đa, chu kỳ và ngày mới nhất, định dạng ảnh, URL chú giải màu. **Không dùng tên lớp từ trí nhớ.**
5. **[B] Cập nhật `STATE.md`:** phần "Trạng thái nguồn dữ liệu" (tóm tắt 1 dòng mỗi nguồn), cách đăng ký một trang mới trong `template.html` (mảng `PAGES`, `<div data-page>`, hàm `route`/`showPage`; ghi số dòng), và các tên biến cấp cao nhất đang tồn tại dễ bị trùng (`clamp`, `round`, `mean`, `mid`, `S`, `L`…).
6. **[N]** Thử gọi POWER monthly cho một điểm ngoài ĐBSCL (ví dụ Đắk Lắk) để chắc chế độ "tọa độ bất kỳ" khả thi; ghi thời gian phản hồi.

## Nghiệm thu

- `npm test` qua; `npm run build` qua; `npm run check:i18n` qua.
- `git log` có commit baseline và commit Phase 0; `git status` sạch.
- `docs/API_STATUS.md` có phán quyết cho **mọi** nguồn ở mục 4, kể cả nguồn chết.
- Mở `index.html`: trang Luân canh hoạt động như trước.

## Khoảng tự do

Cấu trúc test, định dạng `API_STATUS.md`. Nếu dò API phát hiện một nguồn NASA mở, không cần khóa, hữu ích cho đề (ví dụ một điểm cuối khác của POWER, một lớp GIBS hợp hơn), ghi vào `STATE.md` mục "Ý tưởng vượt đề".

## Bàn giao

Cập nhật `STATE.md` (Phase đã xong: 0). Báo cho người dùng 5 dòng: nguồn nào sống, nguồn nào chết, có gì ảnh hưởng đến Phase 1.
