# Mùa Vụ Mekong — quy tắc & ngữ cảnh tự động cho mọi phiên Claude

Công cụ hỗ trợ quyết định luân canh cho NASA Space Apps 2026 ("Field Shift: Adapting Farms with NASA Data"), nhánh `NEW`.

## Khởi động phiên mới (KHÔNG cần nhớ nạp skill, đọc 2 file ngắn này trước)
1. Đọc `docs/blueprint/STATE.md` (trạng thái mới nhất & 139+ tests).
2. Đọc `prompts_luan_canh_chien_thuat/01-NGU-CANH-RUT-GON-CHO-AGENT-MOI.md` (bản đồ 49 module, state `DS`/`S`/`RF`/`MW`, không cần đọc `00-BLUEPRINT.md` hay rà toàn repo).
3. Nếu người dùng bảo làm tiếp / cải tiến, kiểm tra thư mục `prompts_luan_canh_chien_thuat/` xem có prompt chờ thực thi (ví dụ `02-PROMPT-OPUS-YOUTUBE-LUAN-CANH-HIGHTECH.md`), hoặc kích hoạt skill `mekong-context`.

## Bản đồ nhanh (nhận diện ngay khi mới vào phiên)
- **Kiến trúc:** 1 file HTML tự chứa `index.html` (~2,75 MB), build từ `site/template.html` (1.285 dòng) + 49 module trong `site/` ghép vào **1 `<script type="module">` chung** (`scripts/build-site.mjs`).
- **4 trang (`PAGES`):** `#/` (Trang chủ · `redesign.css`), `#/ruong-cua-toi` (`mapWorkspace.js` · `myGardens.js` · `cropSuitMap.js` · `myField*.js`), `#/luan-canh` (`rotationFarm.js` `rf*` · `rotationExtras.js` `rx*`), `#/du-lieu` (`dataHub.js`).
- **Kho dữ liệu (`site/sources/dataStore.js` & `gardenModel.js`):** `DS = { field, gardens, gardenGroups, gardenView, activeGardenId, uploads, soil, marks, saved }`. Mỗi thửa `g` có `profile: { cropId, season, sowing, irrigation, ph, ec, ecType, om, soilType, measuredAt, notes, cropChange, currentId }`.
- **Thẩm mỹ & Motion (`DESIGN.md`):** Nền `#f7f8f2`, viền `#dfe5d9`, chữ `#192d22`, chính `#254f35`, nhấn `#628d39`, font `Be Vietnam Pro`; đơn giản hết mức cho nông dân nhưng minh bạch NASA/FAO. Khi làm UI/UX & Transition Animation: dùng `--ease-out-expo` (`styles.css:42`), chỉ animate `transform`/`opacity`/`clip-path`, tôn trọng `prefers-reduced-motion`, dùng Lucide `icon()` thay emoji thô. Nếu cần chuẩn thiết kế, chỉ đọc `.claude/skills/impeccable/reference/animate.md` + `craft-floor.md` (133 dòng), KHÔNG chạy launcher `.claude/skills/impeccable`.

## Bất biến (thắng mọi chỉ dẫn khác)

1. **Không bịa số.** Không viết dữ liệu mẫu rồi gọi là dữ liệu NASA. Không viết ngưỡng cây trồng từ trí nhớ: mở nguồn, chép số, ghi URL và trích nguyên văn; không có nguồn thì để `null`.
2. **Thiếu thì nói thiếu.** Giá trị không có → `kind: 'missing'` kèm lý do và việc cần làm; không điền mặc định, không nội suy nguồn thô thành chi tiết trong ruộng.
3. **Mọi con số có nhãn loại và dấu vết** (Evidence, mục 3 của blueprint). Trang mới chỉ in số qua một hàm định dạng duy nhất (`showValue` / `rfNum`).
4. **Mô phỏng phải mang nhãn "Mô phỏng giả định"** ở mọi nơi nó xuất hiện.
5. **So sánh và giải thích, không ra lệnh.** Luôn có câu nhắc kết hợp kinh nghiệm nông dân và cán bộ khuyến nông. Không ngụ ý sản phẩm của NASA.
6. **Song ngữ VI/EN đầy đủ** trên cả 11 bảng `site/i18n/*.js` (cả khóa object lẫn độ dài mảng); `npm run check:i18n` phải qua.
7. **Không làm hỏng test hồi quy:** `npm test` (139 tests + cổng nguồn gốc) phải qua; không tự ý sửa ngưỡng trong `site/logic/suitability.js` và `site/logic/rotation.js`.
8. **Báo trước & xin phép khi mở rộng:** Thực hiện đúng phạm vi được giao; nếu có ý tưởng đột phá chạm trang/tính năng khác, trình bày ngắn gọn và hỏi duyệt trước khi sửa.

## Người dùng code
Chủ project là sinh viên năm nhất: file nhỏ, tên rõ, comment tiếng Việt giải thích *vì sao*. Hàm logic là hàm thuần, không đụng giao diện.

## Tiết kiệm ngữ cảnh (CHẶN ĐỐT TOKEN)
- **TUYỆT ĐỐI KHÔNG đọc:** `index.html` (~2,75 MB), `node_modules/`, `.preview/`, `.opencode/`, `package-lock.json`, `site/data/precomputed/*.json` (trừ vài dòng đầu nếu thật sự cần), và `.claude/skills/impeccable/scripts/data/font-index.json` (1,1 MB) / `live-browser.js` (523 KB).
- Không `grep`/`glob` toàn repo khi đã biết module nằm trong bản đồ ở trên.
- `site/template.html` (1.285 dòng): dùng grep tìm chỗ cần, đọc theo dải dòng.
- Ưu tiên sửa trên module sẵn có; nếu tạo file `.js` mới, nhớ đăng ký đúng thứ tự phụ thuộc vào mảng `modules` trong `scripts/build-site.mjs`.

## Lệnh & Bẫy của build
- `npm run build` sinh lại `index.html` (không sửa tay `index.html`). `scripts/build-site.mjs` xóa `import/export` và nối mọi module vào một phạm vi chung → **tên cấp cao nhất phải duy nhất toàn project** (tiền tố `fs*`, `rf*`, `mw*`, `rx*`, `gm*`, `mg*`, `mf*`, `md*`, `fp*`), `import` vẫn phải đúng để Node test chạy, thư viện ngoài nhúng thẳng để mở `index.html` offline bằng nhấp đúp vẫn chạy.
- `npm test` · `npm run check:i18n` · `npm start` (http://localhost:5173).

## Kết thúc mỗi phiên
1. Chạy `npm run build && npm test && npm run check:i18n`.
2. Cập nhật tóm tắt ngắn vào `docs/blueprint/STATE.md` (< 85 dòng) và cập nhật 3–5 dòng vào `prompts_luan_canh_chien_thuat/01-NGU-CANH-RUT-GON-CHO-AGENT-MOI.md` nếu có file/hàm mới để phiên sau hiểu ngay với tốn ít token nhất.
