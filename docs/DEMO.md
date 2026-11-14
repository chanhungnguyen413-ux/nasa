# Kịch bản trình diễn (Demo Script) — Mùa Vụ Mekong

## Mục tiêu trình diễn
Trong 60–90 giây (hoặc 3 phút khi Q&A), ban giám khảo thấy rõ luồng quyết định thực tế cho người nông dân ĐBSCL:
**Chạm & khoanh ruộng trên ảnh vệ tinh → Đọc cân bằng nước NASA POWER & điều kiện đất thực tế → Đánh giá 3 chiến lược (tách rõ điều kiện tham gia vs. mức rủi ro) → Thử bật/tắt tưới hoặc giả định năm khô nhất để thấy khuyến nghị thay đổi có giải thích.**

---

## Bản 60–90 giây (Vòng chấm nhanh)

1. **Trang chủ (`#/`) [10s]:**
   - Mở từ `index.html` (chạy trực tiếp không cần mạng) hoặc `npm start`. Nhấn **"Xem ruộng của tôi"** để vào thẳng không gian bản đồ toàn màn hình.
2. **Bước 1 — Khoanh thửa ruộng trên bản đồ vệ tinh (`#/ruong-cua-toi`) [20s]:**
   - Bản đồ nền vệ tinh Esri World Imagery giúp nhìn rõ bờ ruộng, kênh mương.
   - Chạm chọn **Cần Thơ · Cờ Đỏ** (hoặc nhập tọa độ / chọn bất kỳ điểm nào).
   - Bấm **"Vẽ hình chữ nhật"** hoặc **"Vẽ từng góc"** để khoanh nhanh một thửa ~1–2 ha; chỉ ra diện tích `ha` / `m²` cập nhật trực tiếp và lưới bản đồ không bị mất ranh thửa khi bấm nhầm bên ngoài (trừ khi bật "Chọn chỗ khác").
   - Bật thử lớp **GIBS (MODIS / Độ ẩm bề mặt)** và kéo thanh độ mờ + nhấn lưu ý "ô lưới lớn" trên chú giải để chứng minh tính trung thực về độ phân giải vệ tinh.
3. **Bước 2 — Điều kiện thực tế & điểm nhấn "Bật/tắt tưới" [20s]:**
   - Chuyển sang tab **Điều kiện**, xem biểu đồ `P − ET0` 25 năm NASA POWER và kéo giả định **"Năm khô nhất"**.
   - Nhập nhanh độ mặn `ECe = 3,5 dS/m` (chú ý đơn vị **ECe**, không tự đoán quy đổi từ EC nước).
4. **Bước 3 — So sánh 3 chiến lược & Kế hoạch hành động [25s]:**
   - Chuyển sang tab **3 chiến lược**:
     - Khi **chưa chọn câu trả lời Tưới**: thẻ hiện rõ `Chưa đủ dữ liệu` (`missingFields: Thiếu trả lời tưới`), chưa xếp hạng bừa.
     - Chọn **"Tưới hạn chế / Không chủ động tưới"**: bấm **"Đánh giá lại"** → Chiến lược **B (Lúa – Đậu xanh – Lúa)** hoặc **C** vươn lên Hạng 1 nhờ ít thâm hụt nước hơn **A (3 vụ lúa)**; thử đổi sang **"Không đổi cây"** để cho thấy hai phương án đổi cây chuyển sang **Không phù hợp điều kiện (Ineligible)** chứ KHÔNG bị gắn nhầm là "Rủi ro cao"!
   - Bấm **"Lập kế hoạch hành động"** gắn mã đánh giá (`EV-...`) để xuất thẻ khuyến nông / in PDF.
   - Chạm vào một con số bất kỳ (cỡ bất kỳ) để mở **Sổ bằng chứng** truy ngược từ NASA POWER → FAO-56 → công thức.

---

## Bản 3 phút (Chuyên sâu cho Giám khảo kỹ thuật / Nông học)

1. **Giới thiệu bài toán (20s):** 5 huyện ĐBSCL + tọa độ tùy chọn; làm thế nào tránh "giả chính xác" khi ghép dữ liệu lưới ~50 km của NASA POWER với 1 thửa ruộng 1 ha.
2. **Thao tác bản đồ nâng cao (45s):**
   - Kéo thả 1 đỉnh đa giác và chèn thêm điểm giữa cạnh để uốn sát bờ ruộng thật.
   - Xuất/nhập GeoJSON, Undo (`Ctrl+Z`), và chuyển nền vệ tinh ↔ bản đồ đường phố.
   - Chỉ ra vùng trồng ô 30 m (`myFieldZones`) tự chuyển sang nền gạch chéo xám khi lớp khí hậu là lưới đồng nhất, chỉ tách màu vùng khi có đánh dấu thực địa ("Hay ngập") hoặc số đo đất cục bộ.
3. **Phản ứng khi đổi đầu vào & Stale detection (35s):**
   - Sau khi có kết quả 3 chiến lược, quay lại đổi "Ưu tiên" hoặc "Khí hậu giả định +2 °C": biểu ngữ cảnh báo **"Đầu vào vừa thay đổi — kết quả bên dưới có thể đã cũ"** xuất hiện ngay và vô hiệu hóa việc hiểu nhầm kết quả cũ.
4. **Dữ liệu tự nạp & Trợ lý AI có kiểm soát số (50s):**
   - Mở `#/du-lieu` (`#/nguon-du-lieu` vẫn tự chuyển hướng): tải file mẫu từ `samples/`, xem Hộ chiếu dữ liệu từ chối dòng lỗi vật lý.
   - Mở **Trợ lý nông trại** (nếu ngoại tuyến: trả lời mẫu theo luật; nếu kết nối Gemini: mọi con số AI sinh ra được đối chiếu với sổ bằng chứng `MF_LEDGER`, chặn số bịa và luôn đính kèm khuyến cáo hỏi cán bộ khuyến nông).

---

## Phương án dự phòng khi Mất mạng / Không có API Key tại bàn chấm

- Mở trực tiếp `index.html` bằng trình duyệt:
  - 5 huyện mẫu (Cờ Đỏ, Thoại Sơn, Mỹ Tú, Tháp Mười, Chợ Lách) đọc sẵn từ `PRECOMPUTED` (nhúng trong `index.html`).
  - Bản đồ nền tự động lùi từ Esri World Imagery → OpenStreetMap → OpenTopoMap → chế độ đa giác ngoại tuyến (không lỗi JS, vẫn vẽ/sửa thửa, tính diện tích `ha/m²`, và chấm 3 chiến lược đầy đủ).
  - Trợ lý tự chuyển mượt sang bộ trả lời mẫu theo luật (`sampleAnswer`).
