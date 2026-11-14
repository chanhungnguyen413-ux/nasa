# PROMPT CHO OPUS 5.5 HIGH (HACKATHON EDITION · SIÊU TIẾT KIỆM TOKEN): TÁI THIẾT KẾ LUỒNG CHIẾN THUẬT & GIAO DIỆN LUÂN CANH KIỂU YOUTUBE HIGHTECH

Bạn là **Lead Product Architect & Agritech UX Designer** cho dự án **Mùa Vụ Mekong (`nasa-NEW`)** thi **NASA Space Apps Challenge**.

---

## ⚡ 1. KỶ LUẬT TIẾT KIỆM TÀI NGUYÊN & CỔNG AN TOÀN (BẮT BUỘC TUÂN THỦ)

1. **Khóa vùng đọc (Không đốt token đọc lại hoặc khám phá):**
   - Nếu đang ở phiên làm việc có sẵn ngữ cảnh, **không đọc lại** các file bạn vừa sửa ở lượt trước; chỉ đọc `prompts_luan_canh_chien_thuat/01-NGU-CANH-RUT-GON-CHO-AGENT-MOI.md` khi mới bắt đầu phiên.
   - **TUYỆT ĐỐI KHÔNG đọc** `index.html`, `package-lock.json`, `node_modules/`, `.preview/`, `docs/blueprint/00-BLUEPRINT.md`, `site/data/precomputed/*.json`, và **KHÔNG chạy** launcher `impeccable context` hay mở `font-index.json` / `live-browser.js` / `new-work.md` trong `.claude/`.
   - *(Cho phép đọc nhanh 2 file chuẩn UI/motion siêu nhẹ nếu cần đối chiếu: `.claude/skills/impeccable/reference/animate.md` [89 dòng] và `.claude/skills/impeccable/reference/craft-floor.md` [44 dòng]).*
   - **Chỉ đọc đúng 5 file cần chạm:**
     1. `site/pages/rotationFarm.js` (433 dòng — nơi đang chứa toàn bộ logic & giao diện `#rot-farm`).
     2. `site/pages/mapWorkspace.js` (chỉ đọc dòng `284–460` và `487–565` — nơi xử lý Tab `4. Chiến thuật` và nút `data-mw="compare"`).
     3. `site/i18n/strategyText.js` (204 dòng) & `site/i18n/mapText.js` (chỉ phần `tabs` và `strat`/`cond` nếu cần thêm chữ).
     4. `site/template.html` (chỉ đọc dòng `692–726` phần `renderRotations`).
     5. `site/redesign.css` (chỉ đọc 25 dòng cuối để nối CSS `.rf-*`, giữ đồng bộ hệ thống màu Mekong & `--ease-out-expo` trong `site/styles.css:42`).
2. **4 Bất biến Hệ thống (Không làm gãy 139 bài test hiện có):**
   - **Không tạo file `.js` mới** (sửa trực tiếp trên `rotationFarm.js`, `mapWorkspace.js`, `strategyText.js`, `template.html`, và thêm CSS vào cuối `site/redesign.css` hoặc dùng Tailwind có sẵn) để không phải sửa `scripts/build-site.mjs`.
   - **Phạm vi gộp toàn cục (`builtPage.test.mjs`):** Mọi hàm/biến cấp cao nhất trong `rotationFarm.js` bắt buộc bắt đầu bằng `rf` / `RF_`.
   - **Không bịa số (`CLAUDE.md` & `check-provenance.mjs`):** Mọi con số phải đi từ `fsAssessField`, `rankRotations`, `CROP_LIBRARY`, `PRECOMPUTED` kèm nhãn nguồn rõ ràng; thiếu dữ liệu thì báo thiếu.
   - **Song ngữ tuyệt đối (`check-i18n.mjs`):** Mọi khóa/mảng thêm vào `STRAT_TEXT.vi.farm` phải có cấu trúc và độ dài mảng y hệt trong `STRAT_TEXT.en.farm`.

---

## 🎯 2. NHIỆM VỤ CỐT LÕI (THỰC HIỆN NGAY TRONG 1 LƯỢT)

### Nhiệm vụ A — Nối đánh dấu "Hay ngập" (`DS.marks`) vào `rfEvaluateGarden` (Hoàn thiện điểm còn nợ ở `STATE.md`)
- Trong `site/pages/rotationFarm.js` (`rfEvaluateGarden(g)` dòng `70–90`):
  - Lấy các đánh dấu của thửa `g`: `const marks = (DS.marks ?? []).filter((m) => m.gardenId === g.id)`.
  - Đếm số lần đánh dấu ngập: `const floodCount = marks.filter((m) => m.type === 'waterlogged').length`.
  - Tạo evidence `floodMarks` giống `myFieldData.js` (`floodCount > 0 ? evidence({ value: floodCount, unit: 'marks', kind: 'farmer', label: 'floodMarks' }) : null`) và truyền vào `fsAssessField({ ..., floodMarks })`.

### Nhiệm vụ B — Thiết kế lại Tab `4. Chiến thuật` trong `#/ruong-cua-toi` thành Cầu nối sang trang `#/luan-canh`
- Hiện tại, Tab `4. Chiến thuật` (`MW.tab === 'compare'` trong `site/pages/mapWorkspace.js`) đang nhồi cả bảng 3 chiến thuật vào khay `#mw-compare-dock` dưới bản đồ hoặc cột hẹp 380px, vừa chật vừa trùng lặp với trang `#/luan-canh`.
- **Hãy thiết kế lại luồng này như sau:**
  1. Tạo hàm toàn cục `export function rfOpenGardenStrategy(gardenId = null)` trong `site/pages/rotationFarm.js`:
     - Đặt `RF.view = gardenId || DS.activeGardenId || (DS.gardens?.[0]?.id ?? 'district')`.
     - Đặt `RF.mode = 'detail'` (mở thẳng màn hình chi tiết chiến thuật của thửa đó trên trang `#/luan-canh`).
     - Chuyển hướng sang `location.hash = pageHref('rotations')` (tức `#/luan-canh`), gọi `renderRotations()` và cuộn mượt lên đầu `#rotations`.
  2. Trong `site/pages/mapWorkspace.js`:
     - Khi người dùng bấm nút **`data-mw="compare"`** (ở bước `3. Điều kiện`) HOẶC bấm vào **Tab `4. Chiến thuật` (`data-mw-tab="compare"`)**:
       - Trên bản đồ không còn bật khay `#mw-compare-dock` rối mắt nữa (`dock.hidden = true`).
       - Trong panel `#mw-panel-body` của Tab `4. Chiến thuật`, hiển thị một **Thẻ Cầu Nối Tối Giản & Ấn Tượng (High-Tech Strategy Bridge Card)**:
         - Hiện tên thửa đang chọn (`DS.activeGardenId`), diện tích (`ha`), tóm tắt nhanh phương án đứng đầu (`Lúa ➔ Đậu xanh ➔ Lúa`), và **Nút bấm chính nổi bật (Primary CTA)**: **"Mở không gian Chiến thuật Luân canh của thửa này →"** (`data-rf="openFromMap"` gọi `rfOpenGardenStrategy(DS.activeGardenId)`).
         - Đồng thời, cung cấp nút phụ *"Vẫn xem nhanh kế hoạch hành động trên bản đồ"* (`data-mw="openPlan"`) nếu người dùng muốn bật lớp màu phân vùng (`MFZ`) ngay trên bản đồ.

### Nhiệm vụ C — Thiết kế lại trang `#/luan-canh` theo phong cách "YouTube Thumbnail Grid ➔ Click mở Chi tiết" (Tối giản · High-Tech · Nông dân nhìn hiểu ngay)
Thay vì thanh nút bấm chữ đơn điệu và bảng chữ dày đặc, hãy biến `#rot-farm` trong `site/pages/rotationFarm.js` thành trải nghiệm **2 tầng trực quan như YouTube**:

#### Tầng 1: Màn hình Danh sách Thửa ruộng dạng Lưới Thẻ Hình Chụp (`RF.mode === 'grid'` — Mặc định khi mở `#/luan-canh`)
1. **Bố cục Lưới Thẻ (`grid gap-6 sm:grid-cols-2 lg:grid-cols-3`):**
   - Mỗi thửa ruộng trong `DS.gardens` là một **Thẻ Video/Thumbnail 16:9** (`rounded-[24px] border border-[#dce3d5] bg-[#fafbf6] overflow-hidden shadow-card hover:-translate-y-1 transition-all cursor-pointer` bấm vào toàn thẻ `data-rf="openDetail" data-value="${g.id}"`):
   - **Phần Hình chụp 16:9 ở nửa trên thẻ (Satellite Plot Thumbnail):**
     - **Nền ảnh vệ tinh thực 100% không bịa:** Tính ô tile Esri World Imagery (`z = 16`, `x`, `y` từ `g.lat, g.lon` theo công thức Web Mercator chuẩn: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/${y}/${x}`) làm ảnh nền của khung 16:9, kèm lớp phủ gradient rừng tràm high-tech (`linear-gradient(180deg, rgba(23,61,43,0.25) 0%, rgba(17,45,39,0.82) 100%)`) và nền lưới tọa độ vệ tinh dự phòng khi ngoại tuyến.
     - **Hình vẽ Ranh giới Thửa ruộng ở chính giữa Thumbnail (`SVG Polygon Overlay`):** Nếu thửa có `g.polygon` (>= 3 đỉnh), chuẩn hóa tọa độ các đỉnh vào `viewBox="0 0 120 72"` và vẽ đa giác SVG của chính thửa ruộng đó nổi bật giữa khung ảnh (viền nét liền màu nhóm vườn `gmColor` hoặc màu đánh giá Xanh/Vàng/Đỏ, nền bán trong suốt) như một bản chụp flycam thực thụ!
     - **Các Nhãn góc kiểu YouTube:**
       - *Góc trên trái:* **Badge Trạng thái** (`🌟 Hợp luân canh`, `⚠️ Cần lưu ý`, hoặc `❓ Thiếu dữ liệu đất/nước`).
       - *Góc trên phải:* Nhãn nhỏ high-tech `NASA POWER · MODIS`.
       - *Góc dưới phải (giống thời lượng video YouTube):* Hộp đen mờ `tabular-nums` ghi **Diện tích & Huyện** (ví dụ: `0,45 ha · An Giang`).
       - *Dải băng góc dưới trái:* Chuỗi 3 vụ ngắn gọn (`ĐX: Lúa ➔ HT: Đậu xanh ➔ TĐ: Lúa`).
   - **Phần Thông tin bên dưới Thumbnail (như Tiêu đề & Kênh trên YouTube):**
     - Chấm màu nhóm vườn + **Tên thửa ruộng lớn, rõ (`text-lg font-extrabold text-[#173d2b]`)**.
     - **1 câu kết luận siêu dễ hiểu cho nông dân:** Ví dụ *"Khuyên dùng: Lúa – Đậu xanh – Lúa (Đỡ tốn ~175 mm nước tưới mùa khô)"* hoặc nếu thiếu dữ liệu thì nhắc *"Chưa chọn nguồn nước tưới — bấm để bổ sung trong 5 giây"*.
2. **Nếu người dùng chưa vẽ thửa nào (hoặc muốn xem thêm):**
   - Hiển thị **Thẻ Khám phá nhanh 5 Huyện ĐBSCL** (cũng có thumbnail vệ tinh tâm huyện + nút mở xem ngay) và **Thẻ "+ Vẽ thửa ruộng của bà con trên bản đồ"** dẫn sang `#/ruong-cua-toi`.

#### Tầng 2: Màn hình Xem Chi Tiết 1 Thửa (`RF.mode === 'detail'`) — "Đơn giản đến mức người không biết gì cũng hiểu Tại sao & Làm thế nào"
Khi bấm vào 1 thẻ thửa ruộng (hoặc nhảy từ Tab `4. Chiến thuật` bên `#/ruong-cua-toi` sang):
1. **Thanh Điều hướng Đầu trang & Dải Chuyển nhanh Thửa khác:**
   - Nút to rõ **"← Xem tất cả các thửa ruộng"** (`data-rf="backToGrid"`).
   - Bên cạnh là các chip nhỏ có mini-thumbnail để đổi nhanh sang thửa khác chỉ bằng 1 chạm.
2. **Banner Tóm tắt Thửa & "Con dấu Minh bạch Dữ liệu" (Data Transparency Bar):**
   - Hiển thị rõ: **Dữ liệu đã có** (`✓ Tọa độ & ranh thửa` · `✓ Khí hậu NASA POWER` · `✓ Lịch mùa vụ vệ tinh MODIS`) và **Dữ liệu thực địa của bà con** (`Nguồn tưới`, `pH`, `Độ mặn ECe`, `Hay ngập`). Cái nào thiếu thì hiện nút bấm bổ sung ngay tại chỗ — minh bạch 100%, không giấu giếm.
3. **4 Nút Mục tiêu 1 chạm ("Bà con muốn ưu tiên điều gì nhất năm nay?"):**
   - Giữ 4 nút mục tiêu lớn (`⚖️ Cân bằng`, `💧 Đỡ tốn nước`, `🌱 Dưỡng đất & lời cao`, `🛡️ An toàn năm hạn/mặn`).
4. **Trình bày Chiến thuật theo 3 Câu hỏi Đời thường (Không dùng thuật ngữ học thuật):**
   - **Câu 1 — "Trồng cây gì, vào tháng mấy?" (Sơ đồ 3 Vụ trực quan):** 3 ô vụ lớn nối nhau bằng mũi tên `Đông Xuân ➔ Hè Thu ➔ Thu Đông`, ghi rõ tháng gieo–thu hoạch, tên cây, đèn màu Xanh/Vàng/Đỏ và dòng gợi ý *"Có thể thay bằng: ..."*.
   - **Câu 2 — "Tại sao nên trồng theo cách này trên thửa đất này?" (3 Thanh So Sánh Bằng Mắt):**
     - Trình bày 3 lợi ích/rủi ro cụ thể kèm thanh mức độ trực quan: **💧 Nước tưới mùa khô** (tiết kiệm bao nhiêu `mm` so với 3 vụ lúa) · **🌱 Sức khỏe đất** (cây họ đậu trả lại đạm tự nhiên, ngắt sâu bệnh) · **🌾 Hiệu quả thực tế** (dẫn chứng thí nghiệm đồng ruộng ĐBSCL — Linh et al. 2015).
     - Nếu phương án bị loại (`⛔ Không nên trồng`), đóng khung màu đất nung giải thích bằng 1 câu tiếng Việt bình dân nhất (do mặn vượt sức chịu đựng, do phèn chua, hay do không có nước tưới mùa khô).
   - **Câu 3 — "Bắt đầu như thế nào?" (3 Bước chuẩn bị đơn giản):**
     - Gợi ý 3 việc cụ thể nông dân cần kiểm tra trước khi xuống giống (kiểm tra nguồn nước/bờ bao, đối chiếu các thông tin còn thiếu trong hộp vàng, và hỏi thêm cán bộ khuyến nông xã).
   - Bên dưới vẫn giữ bảng mở rộng **9 cây thay thế cho từng vụ (`rfAltTableHtml`)** và 2 khối `<details>` kỹ thuật cho giám khảo.

### Nhiệm vụ D — Hoàn thiện UI/UX & Transition Animation chuẩn High-Tech (GPU-only · `site/redesign.css`)
Gom mọi hiệu ứng `.rf-*` vào cuối `site/redesign.css` (tái dùng biến `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` đã có ở `site/styles.css:42`, tuyệt đối không thêm thư viện ngoài):
1. **Chuyển tầng mượt (Grid ↔ Detail & Bridge Tab 4 ➔ `#/luan-canh`):**
   - Dùng `document.startViewTransition` (khi trình duyệt hỗ trợ và không bật `prefers-reduced-motion: reduce`), kết hợp fallback CSS animation `@keyframes rf-enter` (`opacity` + `translateY(10px)` trong `260ms var(--ease-out-expo)`) để chuyển cảnh giữa Lưới Thẻ YouTube và Màn Chi Tiết liền mạch như app gốc.
   - Nội dung mặc định luôn hiển thị (`opacity: 1`), tránh ẩn cứng gây mất trang nếu lỗi script.
2. **Tương tác Micro-interaction & GPU-only (Cấm animate `width`, `height`, `top`, `left`):**
   - Hover thẻ thumbnail: ảnh vệ tinh zoom nhẹ `transform: scale(1.04)` (`450ms var(--ease-out-expo)`), đa giác SVG thửa ruộng nổi viền tinh tế.
   - Danh sách lưới thẻ xuất hiện với stagger nhẹ có trần (`animation-delay: min(index * 40ms, 160ms)`).
   - Nút chọn 4 mục tiêu & chip đổi nhanh thửa phản hồi trong `140–180ms`; thanh so sánh trực quan ở Câu 2 trượt mượt bằng `transform: scaleX(...)` (`transform-origin: left`).
   - Hỗ trợ đầy đủ `:focus-visible`, thao tác bàn phím (Enter/Space mở thẻ), cuộn ngang mượt trên mobile.
3. **Kỷ luật thẩm mỹ (`craft-floor.md`):**
   - Thay emoji thô trong các thẻ/nút/chỉ báo chính bằng Lucide `icon(...)` (hệ thống icon inlined có sẵn) để nét vẽ đồng bộ hoàn hảo.
   - **KHÔNG** dùng gradient text, không viền trái dày sặc sỡ, không lồng card dày đặc trong card; giữ đúng nền `#f7f8f2`, chữ `#192d22`, chính `#254f35`, nhấn `#628d39`.
   - Thêm block `@media (prefers-reduced-motion: reduce)` cho các class `.rf-*` (loại bỏ zoom/trượt, giữ phản hồi đổi màu/opacity rõ ràng).

---

## 💡 3. QUY TẮC ĐỀ XUẤT Ý TƯỞNG ĐỘT PHÁ ("BÁO TRƯỚC & XIN PHÉP")

Sau khi hoàn thành xong Nhiệm vụ A, B, C, D ở trên và đảm bảo mọi bài test đều PASS:
- **KHÔNG tự ý sửa thêm các trang khác** ngoài phạm vi trên.
- Ở cuối câu trả lời, hãy **đề xuất 3 ý tưởng đột phá tiếp theo (Next-Level Hackathon Ideas)** đáp ứng 4 tiêu chí: *(1) Tăng độ minh bạch dữ liệu NASA, (2) Giao diện High-Tech hài hòa màu xanh rừng tràm `#173d2b` / `#254f35` / `#6d9b37` / `#f7f8f2`, (3) Cực kỳ đơn giản cho nông dân, (4) Gây ấn tượng mạnh với giám khảo trong 30 giây*.
- Với mỗi ý tưởng, ghi rõ: **Mô tả ngắn · File sẽ chạm · Xin phép người dùng ("Bạn có muốn tôi triển khai ý tưởng X không?")** để người dùng duyệt trước khi làm.

---

## ✅ 4. KIỂM TRA ĐẦU RA BẮT BUỘC (CHẠY ĐÚNG 1 LẦN CUỐI PHIÊN)

```bash
npm run build
npm test
npm run check:i18n
```
Đảm bảo cả 139+ bài test và `check:i18n` đều PASS 100%, cập nhật ngắn gọn vào `docs/blueprint/STATE.md` và `prompts_luan_canh_chien_thuat/01-NGU-CANH-RUT-GON-CHO-AGENT-MOI.md`.
