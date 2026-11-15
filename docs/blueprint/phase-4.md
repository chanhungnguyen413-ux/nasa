# Phase 4 — Hoàn thiện cho nông dân, dọn code giả, sẵn sàng nộp bài

**Mục tiêu:** một nông dân ít dùng công nghệ đi hết luồng chính mà không cần hướng dẫn; không còn dữ liệu mô phỏng cũ trong sản phẩm; tài liệu nộp bài trung thực và đầy đủ.

**Đọc trước:** `CLAUDE.md`, `STATE.md`, mục 6 và 8 của blueprint, `PRODUCT.md`, `DESIGN.md`, `server/server.mjs`, `site/logic/assistantFallback.js`. Dùng skill `impeccable` (các chế độ rà soát/đánh bóng) cho phần giao diện.

## Việc phải làm

1. **[B] Rà luồng nông dân** trên "Ruộng của tôi", "Luân canh", "Dữ liệu" ở 390 px và 1440 px, VI và EN:
   - chữ nền ≥ 18 px, vùng chạm ≥ 48 px, tương phản chữ ≥ 4,5:1, không cuộn ngang, không chữ đè chữ;
   - đèn giao thông đồng nhất (cùng token màu, cùng biểu tượng, cùng chữ) trên bản đồ, biểu đồ, thẻ, bảng; có trạng thái Xám;
   - mỗi màn hình một hành động chính; không còn menu lồng;
   - mọi thuật ngữ khoa học trên ba trang có giải thích đời thường và nút "Chỉ số này nghĩa là gì?" (ET, cân bằng nước, bất thường độ ẩm đất, NDVI, nguy cơ sương giá, p10, mô hình ước tính…);
   - câu nhắc "tham khảo, kết hợp kinh nghiệm và cán bộ khuyến nông" có ở mọi khối kết quả;
   - trạng thái rỗng, đang tải, lỗi mạng, thiếu dữ liệu đều có lời hướng dẫn bước tiếp theo.
2. **[B] Xóa phần mô phỏng cũ:** trang "Ruộng hôm nay" và "Thời tiết" cũ, `engine.js`, `adviceText.js`, `crops.js`, dữ liệu demo trong `demo.js` (chuyển `PROVINCES` sang file riêng, cập nhật chỗ dùng và ghi chú trong `fetch_ndvi.py`), các hàm giao diện liên quan trong `template.html`, chuỗi i18n không còn dùng. Giữ chuyển hướng: đường dẫn cũ mở "Ruộng của tôi". Thẻ chia sẻ/QR: giữ nếu chuyển được sang nội dung mới (mục 5), không thì xóa. Sau khi xóa: build, test, và tìm trong `site/` không còn `PLOT_SPREAD`, `DEMO_HISTORY`.
3. **[B] Trợ lý AI không tự sinh số:** ngữ cảnh gửi cho mô hình là sổ bằng chứng của trang hiện tại (giá trị, đơn vị, nhãn loại, nguồn). Sau khi nhận câu trả lời, kiểm tra **mọi con số** trong đó có khớp một giá trị trong sổ (cho phép làm tròn) hay không; không khớp → thay bằng câu trả lời theo luật (`assistantFallback.js`, viết lại cho nội dung mới) và ghi nhãn "Trả lời mẫu". Lời hệ thống yêu cầu nêu nhãn loại khi trích số và nhắc hỏi cán bộ khuyến nông. Không có khóa API thì trợ lý vẫn chạy bằng câu trả lời theo luật.
4. **[B] Tài liệu:** cập nhật `PRODUCT.md` cho đúng sản phẩm mới; trang Dữ liệu liệt kê mọi nguồn đang dùng thật (kể cả ảnh nền bản đồ và thư viện), giai đoạn, độ phân giải, giới hạn; phần "chưa dùng" trung thực (SMAP/GPM/ECOSTRESS/GRACE chỉ có khi người dùng tải file); công bố dùng AI (trợ lý lập trình, mô hình của trợ lý trong trang). Viết `docs/DEMO.md`: kịch bản 60 giây và 3 phút, kèm phương án khi mất mạng.
5. **[N] Phiếu mang đến cán bộ khuyến nông:** một trang in được (tái dùng cơ chế thẻ chia sẻ): vị trí ruộng, ba chiến lược, đèn giao thông của cây đã chọn, danh sách **câu hỏi cần thẩm định tại địa phương** (lấy từ rủi ro và khoảng trống), nguồn và ngày dữ liệu, nhãn mô phỏng nếu có.
6. **[N] Nghe đọc:** nút "Nghe" ở mỗi thẻ kết quả dùng giọng đọc có sẵn của trình duyệt cho tiếng Việt/Anh; thiết bị không có giọng phù hợp thì ẩn nút.
7. **[N] Chế độ chữ lớn** (một nút, ghi nhớ lựa chọn) nếu việc tăng chữ nền toàn trang ảnh hưởng bố cục hiện có.
8. **[C]** Quay lại các mục [N]/[C] còn dở của phase trước theo `STATE.md`, ưu tiên thứ làm demo mạnh hơn.

## Nghiệm thu

- `npm run build && npm test && npm run check:i18n` qua.
- Đi hết `docs/DEMO.md` hai lần: có mạng và mất mạng.
- Tìm toàn bộ `site/`: không còn dữ liệu mô phỏng cũ; không còn chuỗi nào gọi dữ liệu mô hình là số đo vệ tinh.
- Hỏi trợ lý một câu cần số: mọi số trong câu trả lời đều có trong sổ bằng chứng (kiểm bằng test với câu trả lời giả có số sai → bị thay).
- Đối chiếu từng dòng bảng mục 8 của blueprint: dòng nào chưa đạt ghi rõ vào `STATE.md` và trang Dữ liệu (không che).

## Khoảng tự do

Toàn bộ phần trau chuốt hình thức, chuyển động, câu chữ, miễn theo `DESIGN.md`. Được bỏ một tính năng [N] nếu nó làm luồng chính rối hơn; ghi lý do.

## Bàn giao

Cập nhật `STATE.md`, commit, báo người dùng: danh sách việc con người phải tự kiểm trước khi nộp (nguồn trích dẫn, tên sản phẩm, quyền dùng ảnh nền, video dự phòng).
