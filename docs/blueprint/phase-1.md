# Phase 1 — Lát cắt demo: "Ruộng của tôi"

**Mục tiêu:** một đường demo trọn vẹn bằng dữ liệu thật: chọn ruộng trên bản đồ thật → khí hậu 20+ năm và cân bằng nước từ NASA POWER → đèn giao thông cho ba cây đã có nguồn → chạm vào số nào cũng ra nguồn. Không cần dữ liệu của nhóm, không cần khóa API.

**Kịch bản 60 giây phải chạy được khi xong phase:** mở trang → bấm "Cần Thơ · Cờ Đỏ" (hoặc chạm bản đồ) → bật lớp ảnh NDVI của NASA → cuộn xuống biểu đồ mưa/ET0/nhiệt, thấy tháng thiếu nước và tháng ruộng trống → chọn "đậu xanh", thấy đèn và lý do → chạm vào một con số, thấy nguồn và công thức → sang trang Luân canh.

**Đọc trước:** `CLAUDE.md`, `STATE.md`, `docs/API_STATUS.md`, mục 2–6 của blueprint, `DESIGN.md` (phần token màu, chữ, thành phần), `site/data/rotationCrops.js`, `site/logic/rotation.js`, `site/logic/seasonStrip.js`, `site/data/live.js`, `site/i18n/glossary.js` (cấu trúc), các đoạn `PAGES`/`route`/`renderNav`/`renderPagesOverview`/`openTerm` trong `template.html` (theo số dòng ghi ở `STATE.md`). Dùng skill `impeccable` của project khi dựng giao diện.

## Việc phải làm

### Lõi

1. **[B] `site/core/evidence.js`** theo mục 3 của blueprint: tạo Evidence, tạo `missing` (có `reason` và `need`), hàm suy dẫn giữ `inputs` và lan truyền `missing`/`simulated`. Test: lan truyền đúng; không có đường nào cho ra số khi đầu vào bắt buộc thiếu.
2. **[B] `site/sources/catalog.js`:** danh mục nguồn (tên hiển thị VI/EN, nhà cung cấp, `kind`, độ phân giải gốc, URL, ghi công). Lấy thông tin từ `API_STATUS.md` và `SOURCES` hiện có; không lặp lại `SOURCES`, tham chiếu sang.
3. **[B] `site/sources/power.js`:** lấy NASA POWER monthly cho một tọa độ → từng năm × 12 tháng → khí hậu tháng (trung bình, p10, p90, số năm) dạng Evidence `kind: 'model'`. Giá trị rỗng của API → `missing`. Cache theo ô lưới POWER (cùng ô thì không gọi lại) trong localStorage, có `fetchedAt`. Mưa đổi sang mm/tháng theo đơn vị ghi nhận ở Phase 0. Cùng file này chạy được trong Node.
4. **[B] `scripts/fetch-power-monthly.mjs`:** dùng chính module trên, ghi `site/data/precomputed/power_monthly.json` cho 5 huyện; build nhúng vào trang để **demo chạy được khi mất mạng**. Thứ tự ưu tiên khi hiển thị: mạng → cache → bản tính sẵn (5 huyện) → `missing`. Luôn hiện ngày lấy dữ liệu.
5. **[B] `site/logic/et0.js`:** ET0 Penman–Monteith bước tháng (blueprint 4.1). Mở hai trang FAO-56 đã cho, đối chiếu từng phương trình. Test tái lập Ví dụ 17 bằng số chép từ trang nguồn, sai số ≤ 0,1 mm/ngày. Thiếu bất kỳ đầu vào nào → `missing` (không dùng phương án thay thế trong phase này).
6. **[B] `site/logic/waterBalance.js`:** 12 tháng `P`, `ET0`, `P − ET0`, cờ tháng khô (định nghĩa hiện có), tất cả là Evidence có dấu vết. Hàm nhận tham số điều chỉnh (để Phase 3 gắn thanh trượt) nhưng phase này chỉ gọi với giá trị gốc.
7. **[B] `site/logic/suitability.js`:** chấm theo yếu tố hạn chế nhất (blueprint 4.4) cho ba cây trong `ROTATION_CROPS`, **chỉ dùng số đã có nguồn trong file đó**:
   - *Nước:* nhu cầu vụ (FAO Manual 3) so với mưa trong cửa sổ vụ, năm thường và năm khô (p10), kết hợp câu trả lời "Ruộng có chủ động nước tưới không?" (có / hạn chế / không). Ngưỡng phân hạng nằm trong `SUIT_PARAMS`, hiện trên trang là "ngưỡng do nhóm chọn".
   - *Độ dài vụ:* `cycleDays` so với số ngày của cửa sổ.
   - *Độ mặn:* chỉ chấm khi có số đo độ mặn của ruộng (chưa có ở phase này → Xám, việc cần làm "đo độ mặn"). Đậu xanh không có ngưỡng trong FAO-29 → Xám với lý do "nguồn không có dòng cho cây này".
   - *Nhiệt độ, pH:* chưa có ngưỡng có nguồn → Xám "Thiếu bảng chỉ tiêu có nguồn". **Không thêm số.**
   - Cửa sổ vụ: 5 huyện dùng `seasonWindows` từ lịch NDVI; tọa độ khác thì nông dân chọn tháng gieo bằng nút tháng, cửa sổ = tháng gieo + độ dài chu kỳ.
   Test: thiếu hơn một nửa tiêu chí → "Chưa đủ dữ liệu", không ra Xanh; kết quả chung luôn bằng hạng xấu nhất.

### Trang

8. **[B] Bản đồ thật.** Thêm Leaflet (`npm i -D leaflet`), nhúng JS và CSS vào `index.html` qua `build-site.mjs` (xem "Bẫy của build"; không dùng ảnh marker của Leaflet, dùng `circleMarker`/`divIcon`). Ảnh nền: lớp bản đồ mở có ghi công đúng điều khoản. Chọn vị trí bằng ba nút lớn: chạm bản đồ / "Vị trí của tôi" / 5 huyện (`PROVINCES`). Mất mạng: không có ảnh nền nhưng nút huyện vẫn dùng được, có dòng báo.
9. **[B] Lớp ảnh NASA GIBS:** hàng nút, mỗi lúc một lớp, dùng **đúng định danh ghi trong `API_STATUS.md`**; hiện ngày ảnh, chú giải màu, tên sản phẩm, và dòng "Ảnh để nhìn tổng thể; con số cho ruộng nằm ở bảng bên dưới". Lớp nào Phase 0 không tìm thấy thì không có nút.
10. **[B] Biểu đồ 12 tháng** (SVG tự vẽ theo phong cách `weekChart` hiện có, không thêm thư viện): cột mưa + dải p10–p90, đường ET0, đường nhiệt độ cao nhất, tô vùng thiếu nước; đọc được ở 390 px. Với 5 huyện: đánh dấu tháng ruộng thường trống và tháng dễ tổn thương từ `seasonStrip`. Tọa độ khác: ghi "Chưa có lịch vụ từ NDVI cho điểm này".
11. **[B] Khối "Trồng gì?":** nút chọn cây (3 cây), câu hỏi nước tưới, thẻ đèn giao thông (màu + biểu tượng + chữ), câu lý do bằng lời thường nêu yếu tố hạn chế, nút "Vì sao?" mở bảng từng tiêu chí với nhãn loại số liệu. Gõ tên cây ngoài thư viện → "Chưa có bảng chỉ tiêu có nguồn cho cây này".
12. **[B] Sổ bằng chứng:** `showValue(ev)` là cách duy nhất in số trên trang này; chạm vào số mở tấm nổi (tái dùng cơ chế popover của thuật ngữ) với giá trị, nhãn loại, nguồn có liên kết, giai đoạn, độ phân giải gốc, công thức, các đầu vào chạm tiếp được.
13. **[B] Điểm nối:** thêm trang `#/ruong-cua-toi` vào `PAGES`, menu và thẻ trang chủ; nút chính ở trang chủ dẫn tới đây. **Gỡ "Ruộng hôm nay" và "Thời tiết" khỏi menu và thẻ trang chủ** (code và đường dẫn cũ giữ nguyên đến Phase 4). Chuỗi mới ở `site/i18n/fieldText.js`, đủ VI/EN, thêm vào `check-i18n.mjs`. Thuật ngữ mới trong `glossary.js`: bốc thoát hơi nước tham chiếu (ET0), cân bằng nước, năm khô (p10), mô hình ước tính và vệ tinh đo khác nhau thế nào. Câu nhắc "tham khảo, kết hợp kinh nghiệm và cán bộ khuyến nông" cuối khối kết quả.
14. **[N] Khoanh thửa ruộng:** chạm các góc trên bản đồ, nút "Xong" và "Vẽ lại"; lưu đa giác (GeoJSON) vào localStorage, hiện diện tích. Phase 2–3 sẽ dùng.
15. **[N]** Dải dự báo 7 ngày Open-Meteo (tái dùng `fetchForecast`) dưới biểu đồ, nhãn nguồn đúng.
16. **[C]** Sương giá từ dữ liệu: nhiệt độ thấp nhất từng ghi nhận trong chuỗi `T2M_MIN` và câu kết luận tính ra từ đó.

## Nghiệm thu

- `npm run build && npm test && npm run check:i18n` qua. Test mới: evidence, et0 (Ví dụ 17), waterBalance, suitability.
- Kịch bản 60 giây chạy được ở 1440 px và 390 px, tiếng Việt và tiếng Anh.
- Tắt mạng, mở `index.html` bằng nhấp đúp: 5 huyện vẫn có biểu đồ và đèn giao thông; tọa độ khác báo thiếu dữ liệu kèm việc cần làm, không có số nào bịa ra.
- Trên trang mới không còn giá trị nào hiển thị mà không có nhãn loại; không có chuỗi "SMAP" cho dữ liệu không lấy từ SMAP.
- Trang Luân canh không đổi (test hồi quy qua).
- Chụp màn hình trang mới ở hai bề rộng và tự rà theo `DESIGN.md` trước khi kết thúc.

## Khoảng tự do

Bố cục, hình thức biểu đồ, chuyển động, cách diễn đạt câu lý do, cấu trúc bên trong các module. Được đề xuất cách hiện độ không chắc chắn tốt hơn dải p10–p90 nếu nông dân dễ hiểu hơn. Xong toàn bộ [B] mà còn ngữ cảnh: tự đề xuất ba ý làm demo thuyết phục hơn, làm **một** ý rẻ nhất, ghi hai ý còn lại vào `STATE.md` mục "Ý tưởng vượt đề".

## Bàn giao

Cập nhật `STATE.md`: module mới + hàm công khai, sai lệch, việc dở. Commit. Báo người dùng cách chạy demo và ba điểm yếu nhất còn lại.
