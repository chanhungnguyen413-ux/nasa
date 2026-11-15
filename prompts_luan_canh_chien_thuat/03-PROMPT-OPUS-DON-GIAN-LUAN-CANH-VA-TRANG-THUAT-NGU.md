# PROMPT OPUS 5.5 HIGH — TỐI GIẢN TRANG LUÂN CANH & TẠO TRANG THUẬT NGỮ CHUYÊN NGÀNH

## 0. Khóa ngữ cảnh & Tiết kiệm token (Bắt buộc)
- Nếu phiên hiện tại đã nạp `mekong-context`, **không** đọc lại `STATE.md`, `DESIGN.md`, `PRODUCT.md` hay các file không liên quan. Nếu là phiên mới, chạy `/mekong-context` trước.
- **Chỉ mở đúng các đoạn cần sửa** trong:
  - `site/template.html` (`PAGES`, `L`, `showPage`, `renderRotations`, `renderRotationResults`, `openTerm`)
  - `site/pages/rotationFarm.js` (`rfGridHtml`, `rfDetailNavHtml`, `rfRender`)
  - `site/i18n/glossary.js` (`GLOSSARY.vi`, `GLOSSARY.en`)
  - `site/redesign.css` (style + transition mượt cho trang Thuật ngữ mới)
- **Cấm tuyệt đối:** Không đọc `index.html`, `node_modules/`, `font-index.json`, `live-browser.js`, không chạy `impeccable context`.

---

## 1. Mục tiêu tinh gọn trang Luân canh (`#rotations`)

Trang `Luân canh` hiện vẫn còn quá nhiều mục thừa dưới phần ruộng và chú thích dàn trải. Sửa gọn theo đúng 3 yêu cầu sau sao cho người mới vào **nhìn thấy ngay các thửa ruộng của mình, không bị rối mắt**:

### 1.1. Bỏ phần màu đỏ (Bộ chọn huyện góc trên bên phải)
- Trong `renderRotations()` (`site/template.html`): **xóa** `${selectBox('rotDistrict', ...)}` cạnh tiêu đề trang.
- Chỉ giữ phần tiêu đề (`R.title`) và đoạn mô tả ngắn (`R.sub`), căn gọn một khối thoáng dẫn thẳng xuống **"Các thửa ruộng của bà con"**.
- Giữ fallback `S.rotDistrict` trong state nội bộ nếu engine nền còn đọc tới, không để lỗi event listener khi `#rotDistrict` không còn trên DOM.

### 1.2. Giữ phần màu xanh & Bỏ toàn bộ các mục bên dưới
- Trong `#rot-farm` (`site/pages/rotationFarm.js` — `rfGridHtml()`):
  - **GIỮ NGUYÊN phần màu xanh:** tiêu đề *"Các thửa ruộng của bà con"*, phụ đề hướng dẫn, lưới thẻ 16:9 YouTube (`rfGardenCard`) + thẻ dashed `"+ Vẽ thửa ruộng của bà con trên bản đồ"` (`rfDrawCard()`).
  - Bấm vào bất kỳ thửa ruộng nào vẫn mở trơn tru màn hình Tầng 2 (`rfDetailHtml` — 3 câu hỏi chiến thuật + nút quay lại lưới thửa).
  - Trong `rfDetailNavHtml()`: nếu bà con đã có ít nhất 1 thửa ruộng, chỉ hiển thị nút quay lại + các chip chuyển nhanh giữa các thửa của bà con (ẩn chip huyện mẫu để giao diện sạch nhất).
- **BỎ TOÀN BỘ các mục nằm bên dưới** lưới thẻ thửa trên trang `Luân canh`:
  1. Bỏ `<details>` *"Bảng tổng hợp các thửa"* (`rfSummaryHtml`) ở cuối `rfGridHtml()`.
  2. Bỏ khối *"Khám phá nhanh 5 huyện ĐBSCL"* (`F.districtsTitle`, `F.districtsSub`, 5 card `rfDistrictCard`, và dòng `F.imageryCredit`) khỏi `rfGridHtml()`.
  3. Bỏ dòng chú thích nhắc nhở (`F.reminder` trong `rfRender()` và `R.footnote` trong `renderRotations()`).
  4. Bỏ cả 2 khối `<details>` thu gọn bên dưới trong `renderRotations()`: *"#rot-controls (Tùy chỉnh mức ưu tiên chi tiết...)"* và *"#rot-strip / #rot-results (Xem thêm bảng số liệu khí hậu 12 tháng...)"*.
- **An toàn kỹ thuật (bắt buộc):** `renderRotations()` hiện gọi `renderSeasonStrip()`, `renderRotationControls()`, `renderRotationResults()` (mà `renderRotationResults()` lại là nơi gọi `rfRender()`). Khi bỏ `#rot-controls`, `#rot-strip`, `#rot-results` khỏi `#rotations`, sửa `renderRotations()` gọi **trực tiếp `rfRender()`** (và thêm guard null cho 3 hàm cũ nếu vẫn giữ lại cho logic/test) để **không bao giờ lỗi `null.innerHTML`**. Không xóa các hàm toán học thuần trong `site/logic/` kẻo vỡ unit test.

---

## 2. Chuyển phần màu vàng sang Trang tổng hợp từ chuyên ngành (`#/thuat-ngu`)

### 2.1. Gỡ dải chú thích trên trang Luân canh
- Trong `renderRotations()` (`site/template.html`), **xóa** thanh `"Bấm để hiểu: Luân canh · Cây họ đậu · Cố định đạm · NDVI · Bốc thoát hơi nước"`.
- Có thể đặt **1 liên kết chữ nhỏ nhẹ nhàng** ở phụ đề hoặc không cần thêm chip (nếu đặt, chỉ 1 text-link gọn dẫn sang `#/thuat-ngu` để người mới bấm khi cần).

### 2.2. Tạo trang mới: Tổng hợp Thuật ngữ chuyên ngành (`glossary`)
- **Router & Menu (`site/template.html`):**
  - Thêm page vào `PAGES`: `{ id: 'glossary', slug: 'thuat-ngu', nav: 'navGlossary', icon: 'book-open' }`.
  - Thêm nhãn `navGlossary` vào `L.vi` (*"Thuật ngữ"*) và `L.en` (*"Glossary"*), kèm mô tả trang trong `L.*.pageCards.glossary`.
  - Thêm `<div data-page="glossary" hidden class="pt-[4.5rem]"><section id="glossary" class="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20"></section></div>` cùng độ cao chuẩn với các trang con khác.
  - Gọi `renderGlossary()` khi `showPage('glossary')` được mở (và khi đổi ngôn ngữ `VI/EN`).
  - Rà thanh menu `#nav` trên desktop/mobile đảm bảo 5 mục (*Trang chủ · Vườn của tôi · Luân canh · Thuật ngữ · Dữ liệu*) hiển thị cân đối, không rớt dòng xấu.
- **Nội dung đầy đủ & bình dân (`site/i18n/glossary.js`):**
  - Hiển thị **toàn bộ 18 thuật ngữ hiện có** trong `GLOSSARY` (gồm 5 thuật ngữ từ phần màu vàng: *Luân canh, Cây họ đậu, Cố định đạm, NDVI, Bốc thoát hơi nước* + 13 thuật ngữ còn lại: *ET0, Cân bằng nước P − ET0, Năm khô p10, Độ ẩm đất, Độ bão hòa đất, Rủi ro hạn hán, Tưới nhỏ giọt, Tưới phun mưa, SMAP, MODIS, NASA POWER, Dự báo thời tiết, Mô hình ước tính và vệ tinh đo*).
  - Bổ sung thêm các từ chuyên ngành hay gặp trên app nếu chưa có (ví dụ: *Độ mặn ECe*, *Độ chua pH đất*, *Ba vụ ĐBSCL: Đông Xuân – Hè Thu – Thu Đông*, *Đất phù sa / Đất phèn*). **Đồng bộ đủ khóa giữa `vi` và `en`** để pass `npm run check:i18n`.
  - Gắn `category` cho mỗi thuật ngữ (VD: `cultivation` Canh tác & Luân canh · `soilWater` Đất & Nước · `satelliteWeather` Vệ tinh & Thời tiết) để lọc cực nhanh.
- **UI/UX High-Tech tối giản + Transition mượt (`site/redesign.css` + `.claude/skills/impeccable/reference/animate.md` & `craft-floor.md`):**
  - **Đơn giản cho người chưa biết gì:** mỗi thẻ thuật ngữ chỉ hiện 4 thứ rõ ràng: **(1) Nhãn nhóm + Tên thuật ngữ**, **(2) 1 câu giải thích kiểu bà con dễ hiểu**, **(3) Các mốc đọc số / ví dụ thực tế**, **(4) Nguồn minh bạch** (FAO-56, NASA POWER, MODIS, Linh et al. 2014...).
  - **Tìm kiếm + Chip lọc nhóm tức thì:** có 1 ô tìm kiếm (lọc theo tên, từ viết tắt `NDVI`, `ET0`, `ECe`, hoặc nội dung ngắn) và các pill lọc theo nhóm có trạng thái active `#173d2b`.
  - **Animation chuẩn GPU (`transform`, `opacity`):** áp dụng `--ease-out-expo` (`cubic-bezier(0.16, 1, 0.3, 1)`), staggered reveal nhẹ nhàng khi vào trang/lọc thẻ, hover nâng thẻ tinh tế (`translateY(-2px)`), tôn trọng `@media (prefers-reduced-motion: reduce)`. Không dùng gradient text hay emoji thô — dùng icon SVG qua `icon(...)`.
  - Trong `openTerm()` popover ở các trang khác, giữ nguyên hoạt động bình thường và thêm 1 link nhỏ `"Xem tất cả thuật ngữ ↗"` dẫn thẳng sang `pageHref('glossary')`.

---

## 3. Ý tưởng đột phá (Báo trước & xin phép)
- Thực hiện xong trọn vẹn phần trên trước. Nếu trong lúc làm bạn nghĩ ra **1–2 ý tưởng đột phá nhẹ** giúp trang `Thuật ngữ` hoặc `Luân canh` gây ấn tượng mạnh hơn với ban giám khảo mà giữ cực kỳ đơn giản (ví dụ: gợi ý thuật ngữ liên quan trực tiếp từ kết quả vườn đang xem, hoặc thanh đọc nhanh theo câu hỏi thực tế của nông dân), **chỉ liệt kê đề xuất ngắn ở cuối câu trả lời và XIN PHÉP trước, không tự ý thêm**.

---

## 4. Nghiệm thu bắt buộc
1. Chạy `npm run build && npm test && npm run check:i18n` và xác nhận toàn bộ test + i18n check + build đều xanh (cập nhật test nếu có assertion kiểm tra số trang trong `PAGES` hoặc cấu trúc cũ của `#rotations`, nhưng **không** xóa hay nới lỏng test tính toán).
2. Báo cáo ngắn gọn: các file đã sửa, số thuật ngữ đang hiển thị trên `#/thuat-ngu`, kết quả build/test/check:i18n, và tối đa 2 đề xuất đột phá cần xin phép (nếu có).
