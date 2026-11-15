---
name: hackathon-agritech-pitch
description: Thiết kế slide thuyết trình Hackathon (HTML/CSS/PPTX) phong cách High-Tech AgriTech dựa trên codebase thực tế. Dùng khi cần tạo pitch deck, slide demo hoặc bài thuyết trình cho giám khảo.
---

# Hackathon AgriTech Pitch Deck Skill

## 1. Nguyên tắc cốt lõi (Hackathon-First)
- **Đọc trực tiếp từ repo:** Lấy bảng màu, font và biến thiết kế từ `site/hitech.css` và trạng thái tính năng từ `docs/blueprint/STATE.md`. Không dùng màu sắc hoặc số liệu giả định ngoài hệ thống.
- **Ít chữ, giàu thị giác:** Mỗi slide tối đa 3 ý chính, mỗi ý không quá 12 từ. Ưu tiên **Bento Grid**, **Big Metrics** (con số lớn) và **Split Layout** (1 bên giao diện thật/sơ đồ, 1 bên thông điệp).
- **Sẵn sàng Live Demo:** Tích hợp điều hướng phím mũi tên, chế độ toàn màn hình (phím F) và nút mở nhanh sang `#/ruong-cua-toi` và `#/luan-canh`.

## 2. Cấu trúc 7 Slide chuẩn chấm điểm Hackathon (Pitch 3–5 phút)
1. **Title & Hook:** Tên dự án + Thông điệp 1 câu (Canh tác và luân canh thông minh tại ĐBSCL bằng dữ liệu vệ tinh & AI kiểm chứng).
2. **The Problem (Nỗi đau thực tế):** Xâm nhập mặn, phèn hóa, lệch lịch thời vụ ở ĐBSCL; nông dân khó tiếp cận dữ liệu địa không gian phức tạp.
3. **Our Solution (Zero-Friction UX):** Khoanh vùng thửa ruộng trên bản đồ — hệ thống **tự điền luôn bật** (pH, EC, loại đất, mùa vụ) kèm nhãn nguồn minh bạch, bà con vẫn nhập đè thực tế bất cứ lúc nào.
4. **High-Tech Architecture (Điểm ăn tiền kỹ thuật):**
   - **Data Layer:** Đa nguồn vệ tinh & bản đồ số (MODIS NDVI lịch mùa vụ, SoilGrids pH/EC, FAO loại đất, DEM địa hình).
   - **Hybrid 2-Tier AI:** Tầng 1 tính toán tất định (`twoTier` deterministic) + Tầng 2 (`gemini-flash-lite`) kiểm chứng không bịa số liệu, phản hồi nhanh 6–11s, trả lời gói gọn dưới 80 từ.
5. **Core Features & Live Demo:** Bản đồ đánh giá màu vườn tự động (`#/ruong-cua-toi`), Ma trận 3 chiến thuật luân canh & quản lý vườn nhanh (`#/luan-canh`), Xuất báo cáo PDF kỹ thuật 1 chạm.
6. **Provenance & Reliability (Độ tin cậy):** Phân tách rõ giá trị thực đo của nông dân và giá trị ước tính (`≈ tự điền`), cơ chế fallback an toàn khi mất kết nối.
7. **Impact & Scalability:** Giảm thời gian lập kế hoạch vụ mùa, tối ưu chi phí phân/nước và sẵn sàng nhân rộng toàn vùng ĐBSCL.

## 3. Quy chuẩn Giao diện (High-Tech Visuals)
- **Tông màu:** Nền tương phản cao, điểm nhấn xanh Emerald/Teal (chỉ số sinh trưởng NDVI), vàng Amber (cảnh báo mặn/phèn EC/pH), viền mảnh `1px` sắc nét.
- **Sơ đồ kỹ thuật:** Vẽ bằng SVG hoặc khối CSS trực quan ngay trong slide (luồng dữ liệu Vệ tinh -> Tự điền -> AI 2 tầng -> Khuyến nghị luân canh).
- **Đầu ra mặc định:** Tạo file độc lập `site/pitch.html` (chạy được ngay không cần cài thêm thư viện ngoài) và hỗ trợ `@media print` để xuất ra PDF 16:9 không bị vỡ trang.
