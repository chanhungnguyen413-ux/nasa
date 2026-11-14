# Phase 3 — Giả định khí hậu, ba chiến lược luân canh, bản đồ vùng trồng

**Mục tiêu:** nông dân kéo thanh trượt và thấy ngay tác động lên nước và rủi ro mùa vụ; trang Luân canh nêu rõ ba chiến lược theo đề; chọn một cây thì bản đồ chỉ vùng nên trồng trong thửa ruộng, trung thực về giới hạn của dữ liệu.

**Đọc trước:** `CLAUDE.md`, `STATE.md`, mục 4, 5, 6 của blueprint, `site/logic/rotation.js`, `site/data/rotationCrops.js`, `site/i18n/rotationText.js` (cấu trúc mã lý do), các hàm `renderRotationControls`/`renderRotationResults`/`rotationCard` trong `template.html`, module Phase 1–2 theo `STATE.md`.

Nếu Phase 2 chưa làm: bỏ qua các mục có ghi "(cần Phase 2)".

## Việc phải làm

### Giả định khí hậu

1. **[B] `site/logic/whatIf.js`** theo blueprint 4.3: mưa ±% (phạm vi mùa khô / cả năm), nhiệt độ +°C qua ET0 (giữ áp suất hơi nước thực, giả định hiện trên màn hình), phát lại năm khô nhất (tính từ chuỗi năm, không gõ cứng). Mọi kết quả `kind: 'simulated'`, trừ phát lại năm thật mang nhãn năm lịch sử. Test: ΔT = 0 và mưa 0% cho đúng kết quả gốc; ΔT > 0 làm ET0 tăng; năm được chọn đúng là năm có tổng mưa mùa khô nhỏ nhất.
2. **[B] Giao diện thanh trượt** dưới biểu đồ "Ruộng của tôi": hai thanh lớn có mốc sẵn (−20% mưa, +2 °C), nút "Năm khô nhất", nút "Về số liệu thật". Biểu đồ, cân bằng nước và đèn giao thông cập nhật tức thì; dải băng "Mô phỏng giả định" luôn hiện khi có thay đổi; số gốc vẫn nhìn thấy để so (ví dụ nét mờ).
3. **[B] Nối vào Luân canh:** thanh "mưa mùa khô" hiện có giữ nguyên; thêm ΔT theo cùng cơ chế (nhu cầu nước của vụ nhân tỉ số ET0, blueprint 4.3) qua tham số `whatIf` của `rankRotations`. Giá trị mặc định phải cho kết quả **y hệt hiện tại** (test hồi quy không đổi). Cập nhật câu chữ đã ghi "không có thanh nhiệt độ" trong trang nguồn dữ liệu và `PRODUCT.md`: nay có, tác động qua nhu cầu nước, không qua ngưỡng chịu nhiệt.

### Ba chiến lược

4. **[B] `site/logic/strategies.js`** theo blueprint 4.5: từ kết quả `rankRotations`, chọn Cơ sở / Tiết kiệm nước–chống hạn / Phục hồi đất–ngắt sâu bệnh bằng số đo (`extraMm`, `dryPenaltyMm`, `soilPoints`); xử lý trường hợp một ứng viên thắng cả hai. Cho nông dân đổi kiểu hiện tại (mặc định A).
5. **[B] Hàng ba thẻ chiến lược** ở đầu trang Luân canh, mỗi thẻ đủ năm phần theo đúng thứ tự của đề: vì sao đề xuất (gắn với ưu tiên của nông dân) · bằng chứng dữ liệu (trích số có nguồn) · lợi ích kỳ vọng · khoảng trống và độ không chắc chắn · rủi ro cần nông dân/chuyên gia địa phương thẩm định. Tái dùng mã lý do và câu chữ hiện có; chỉ viết thêm câu cho phần tên chiến lược và "vì sao được chọn làm chiến lược này". Phần "ngắt chu kỳ sâu bệnh": chỉ nói điều nguồn hiện có cho phép; phần còn lại ghi vào khoảng trống. Bốn thẻ chi tiết hiện có nằm bên dưới.

### Thư viện cây và bản đồ vùng trồng

6. **[B] `site/data/cropLibrary.js`:** mở rộng số cây cho Luồng 2 (gợi ý các cây phổ biến ở ĐBSCL), **mỗi con số có `src` + URL + trích nguyên văn**, theo đúng kiểu `rotationCrops.js`. Nguồn ứng viên: các bảng FAO đang dùng (Manual 3, FAO-56, FAO-29) và cơ sở dữ liệu ECOCROP của FAO cho khoảng nhiệt độ và pH (kiểm chứng truy cập được và trích được; không được thì các tiêu chí đó tiếp tục Xám). Cây nào không đủ nguồn cho ít nhất tiêu chí nước và độ dài vụ thì **không đưa vào**. Viết `scripts/check-provenance.mjs` và thêm vào `npm test`. Chất lượng hơn số lượng: 6 cây đủ nguồn tốt hơn 20 cây thiếu.
7. **[B] Bản đồ vùng trồng (cần đa giác ruộng; dùng lưới Phase 2 nếu có, không thì tự tạo lưới tối thiểu):** chấm `suitability` cho từng ô với các lớp **thật sự khác nhau trong ruộng** (đánh dấu của nông dân, số đo có vị trí, độ cao nếu đạt điều kiện, file tải lên đủ mịn); gộp ô liền nhau cùng hạng thành vùng; tô theo đèn giao thông; chạm vào vùng hiện giải thích bằng chứng, **chỉ nêu con số so sánh khi con số đó tồn tại trong sổ bằng chứng**. Khi không lớp nào phân biệt được: một màu cho cả ruộng và câu hướng dẫn ở blueprint mục 5.
8. **[B] Ưu tiên của nông dân** (ít nước / dễ bán / cải tạo đất) sắp thứ tự cây trong cùng hạng; "dễ bán" hiện là khoảng trống thông tin (không có dữ liệu giá), không ảnh hưởng thứ tự.
9. **[N] Lớp nguy cơ trên bản đồ**, mỗi lớp chỉ bật khi đủ dữ liệu, không thì nút mờ kèm lý do:
   - *Ngập úng:* đánh dấu "Hay ngập" + cờ `wetRootFlag` hiện có theo tháng.
   - *Sương giá:* từ `T2M_MIN` nhiều năm; nơi không ghi nhận thì nói rõ "không ghi nhận trong N năm, thấp nhất X °C".
   - *Xói mòn:* chỉ khi có độ dốc đáng tin (độ cao đạt điều kiện) kết hợp tháng ruộng trống và mưa lớn; ĐBSCL phẳng thì hiện "không đánh giá được từ dữ liệu hiện có".
10. **[C] Độ ẩm đất dạng xô nước** (blueprint 4.2) khi biết loại đất, với bảng FAO-56 có trích dẫn.
11. **[C] Mưa hữu hiệu** nếu tìm được nguồn gốc trích được; khi đó bỏ `gapRainEffective` và cập nhật ảnh chụp test có chủ đích.

## Nghiệm thu

- `npm run build && npm test && npm run check:i18n` qua, gồm cổng nguồn gốc. Test hồi quy luân canh không đổi với tham số mặc định.
- Kéo +2 °C: ET0 và nước cần tưới tăng, dải băng mô phỏng hiện, chạm vào số thấy công thức và giả định. Bấm "Về số liệu thật": mọi số trở lại.
- Trang Luân canh hiện đúng ba chiến lược với đủ năm phần; đổi ưu tiên vẫn xếp lại bốn thẻ chi tiết như trước.
- Vẽ ruộng, đánh dấu một góc "Hay ngập", chọn ngô: góc đó đổi hạng và lời giải thích nêu đánh dấu của nông dân. Xóa đánh dấu: bản đồ một màu kèm câu hướng dẫn.
- Chọn cây ngoài thư viện: nhận câu "chưa có bảng chỉ tiêu có nguồn".
- Không câu giải thích nào chứa con số không có trong sổ bằng chứng.

## Khoảng tự do

Cách thể hiện so sánh gốc–giả định, hình thức ba thẻ chiến lược, thuật toán gộp ô thành vùng, cây nào vào thư viện. Được đề xuất chiến lược thứ tư nếu dữ liệu và nguồn cho phép.

## Bàn giao

Cập nhật `STATE.md` (liệt kê cây trong thư viện và tiêu chí nào còn Xám), commit, báo người dùng những khoảng trống nguồn cần người kiểm lại.
