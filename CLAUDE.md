# Mùa Vụ Mekong — quy tắc cho mọi phiên làm việc

Công cụ hỗ trợ quyết định luân canh cho NASA Space Apps 2026 ("Field Shift: Adapting Farms with NASA Data").
Trước khi làm gì: đọc `docs/blueprint/STATE.md`, rồi file phase được giao. Thiết kế tổng: `docs/blueprint/00-BLUEPRINT.md`.

## Bất biến (thắng mọi chỉ dẫn khác)

1. **Không bịa số.** Không viết dữ liệu mẫu rồi gọi là dữ liệu NASA. Không viết ngưỡng cây trồng từ trí nhớ: mở nguồn, chép số, ghi URL và trích nguyên văn; không có nguồn thì để `null`.
2. **Thiếu thì nói thiếu.** Giá trị không có → `kind: 'missing'` kèm lý do và việc cần làm; không điền mặc định, không nội suy nguồn thô thành chi tiết trong ruộng.
3. **Mọi con số có nhãn loại và dấu vết** (Evidence, mục 3 của blueprint). Trang mới chỉ in số qua một hàm duy nhất.
4. **Mô phỏng phải mang nhãn "Mô phỏng giả định"** ở mọi nơi nó xuất hiện.
5. **So sánh và giải thích, không ra lệnh.** Luôn có câu nhắc kết hợp kinh nghiệm nông dân và cán bộ khuyến nông. Không ngụ ý sản phẩm của NASA.
6. **Song ngữ VI/EN đầy đủ**; `npm run check:i18n` phải qua.
7. **Không làm hỏng trang Luân canh.** `npm test` (test hồi quy) phải qua trước mỗi commit.

## Người dùng code

Chủ project là sinh viên năm nhất: file nhỏ, tên rõ, comment tiếng Việt giải thích *vì sao*. Hàm logic là hàm thuần, không đụng giao diện.

## Tiết kiệm ngữ cảnh

- **Không đọc** `index.html` (file sinh ra, ~660 KB), `node_modules/`, `.opencode/`, `package-lock.json`.
- `site/template.html` dài hơn 2.200 dòng: dùng grep tìm chỗ cần, đọc theo dải dòng.
- Tính năng mới viết vào **file mới**; chỉ chạm code cũ ở điểm nối.
- File JSON trong `site/data/precomputed/` lớn: đọc phần đầu để biết cấu trúc.

## Lệnh

- `npm run build` sinh lại `index.html` từ `site/` (không sửa tay `index.html`).
- `npm test` chạy test hồi quy và cổng nguồn gốc (có từ Phase 0).
- `npm run check:i18n` kiểm tra khóa VI/EN.
- `npm start` chạy server tại http://localhost:5173.

## Bẫy của build

`scripts/build-site.mjs` xóa `import/export` và nối mọi module vào một phạm vi chung:
- tên cấp cao nhất phải duy nhất toàn project (đặt tiền tố theo module);
- `import` vẫn phải đúng để test Node chạy;
- thêm file mới vào mảng `modules` theo thứ tự phụ thuộc;
- thư viện ngoài nhúng thẳng vào `index.html` (trang phải chạy khi mở bằng nhấp đúp).

## Kết thúc mỗi phiên

`npm run build && npm test && npm run check:i18n`, commit, cập nhật `docs/blueprint/STATE.md`.
- **Không tự `git push`**: Tuyệt đối không tự động chạy `git push`; chủ project sẽ tự push thủ công.
