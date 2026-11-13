# Phase 2 — Trạm dữ liệu: nhập, hợp nhất, tách nhãn

**Mục tiêu:** người dùng hoặc giám khảo nạp được dữ liệu thật của mình (file xuất từ NASA Earthdata, số đo đất, hiểu biết của nông dân), hệ thống đưa mọi nguồn về lưới chung của ruộng và luôn tách rõ **Vệ tinh / Mô hình** với **Đo tại ruộng / Nông dân báo**. Dữ liệu nạp vào phải làm thay đổi kết quả ở trang "Ruộng của tôi".

**Đọc trước:** `CLAUDE.md`, `STATE.md`, `docs/API_STATUS.md`, mục 3, 5, 6 của blueprint, các module Phase 1 ghi trong `STATE.md` (đọc phần hàm công khai, không đọc lại toàn bộ), `site/i18n/sourcesText.js`, hàm `renderSources` trong `template.html`.

## Việc phải làm

1. **[B] `site/sources/upload.js` — đọc file ngay trong trình duyệt** (không gửi đi đâu):
   - CSV (tự nhận dấu phân cách, bỏ qua dòng mô tả đầu file), JSON (mảng bản ghi), GeoJSON (điểm/đa giác có thuộc tính).
   - Tự đoán cột ngày, giá trị, vĩ độ, kinh độ, biến, đơn vị từ tên cột; **luôn cho người dùng xác nhận hoặc sửa** bằng các ô chọn lớn trước khi nhận.
   - Danh mục biến nhận được: độ ẩm đất, bốc thoát hơi nước, nhiệt độ bề mặt, lượng mưa, NDVI, xu hướng nước ngầm, pH, độ mặn (EC), chất hữu cơ. Mỗi biến có đơn vị chấp nhận và **giới hạn vật lý** (ví dụ NDVI trong [−1, 1], pH trong [0, 14], mưa ≥ 0); dòng ngoài giới hạn bị loại và được đếm.
   - Người dùng chọn nguồn gốc file: sản phẩm vệ tinh (SMAP, ECOSTRESS, GPM, Landsat, MODIS, GRACE-FO, khác) → `kind: 'satellite'`; số đo tại ruộng → `kind: 'ground'`. Độ phân giải gốc theo sản phẩm lấy từ `catalog.js` (ghi nguồn cho từng con số độ phân giải; không chắc thì để người dùng nhập).
   - **Không viết bộ nhận dạng riêng cho định dạng xuất của Giovanni/AppEEARS dựa trên trí nhớ.** Chỉ thêm khi có file thật của nhóm để đối chiếu; trước đó bộ ánh xạ cột là đường chính.
2. **[B] Hộ chiếu dữ liệu:** sau khi đọc file hiện một thẻ: tên file, số dòng nhận/loại (kèm lý do), khoảng ngày, biến, đơn vị, phạm vi giá trị, số điểm rơi trong/ngoài ruộng, nhãn loại. Nút "Dùng dữ liệu này" và "Bỏ". Dữ liệu đã nhận lưu cục bộ (IndexedDB hoặc localStorage tùy kích thước) và gỡ được.
3. **[B] File mẫu thật trong `samples/`:** sinh bằng script từ dữ liệu thật đã có trong repo (ví dụ chuỗi NDVI MODIS của một huyện từ `ndvi_raw.json` → CSV; khí hậu POWER tháng → CSV), mỗi file ghi rõ nguồn và ngày lấy ở dòng đầu. Dùng cho demo kéo thả và cho test. **Không tạo file SMAP/GPM giả.**
4. **[B] `site/core/harmonize.js`** theo mục 5 của blueprint: lưới ô trong đa giác ruộng; bước tháng; mỗi lớp ghi phương pháp (`uniform` / `nearest` / `aggregate`) và độ phân giải gốc; lớp `uniform` gắn cờ và không được dùng để phân vùng. Ngưỡng tỉ lệ ngày tối thiểu của một tháng nằm trong tham số do nhóm chọn. Test: nguồn 55 km không bao giờ sinh ra khác biệt giữa các ô; tháng thiếu ngày → `missing`.
5. **[B] Nối vào kết quả:** dữ liệu mưa/NDVI/độ ẩm đất tải lên xuất hiện trên biểu đồ Phase 1 như một chuỗi riêng có nhãn. **Hai nguồn cùng biến:** hiện cả hai và mức lệch (tuyệt đối và %), không tự chọn một; mức lệch lớn hơn ngưỡng (do nhóm chọn) thì hạ độ tin cậy và nói lý do.
6. **[B] Số đo đất tại ruộng:** biểu mẫu nút lớn cho pH, độ mặn (EC), chất hữu cơ, loại đất (chọn từ danh sách), ngày đo, vị trí (cả ruộng hoặc một điểm chạm trên bản đồ). Số đo độ mặn kích hoạt tiêu chí mặn ở `suitability.js` (ngưỡng FAO-29 đã có).
7. **[B] Nông dân đánh dấu:** trên bản đồ, các nút "Hay ngập", "Khô nhanh", "Đất phèn/mặn", "Đất tốt" → chạm để đặt điểm hoặc vùng; lưu thành Evidence `kind: 'farmer'`. "Hay ngập" đi vào tiêu chí úng của cây cạn.
8. **[B] Trang "Dữ liệu"** (`#/du-lieu`, thay mục "Nguồn dữ liệu" trong menu, giữ nguyên nội dung nguồn và công bố AI hiện có): vùng kéo thả, hộ chiếu, biểu mẫu đất, bảng hai cột Vệ tinh–Mô hình / Đo tại ruộng–Nông dân báo với trạng thái từng nguồn (đang có · từ bộ nhớ · thiếu · không dùng được, theo `API_STATUS.md`).
9. **[N] Độ cao:** `site/sources/elevation.js` theo phán quyết ở `API_STATUS.md` (qua `server.mjs` nếu không có CORS; nhãn đúng tên bộ dữ liệu và nhà cung cấp). Lấy cho các ô lưới (gộp yêu cầu, tôn trọng giới hạn gọi). Chỉ coi là khác biệt trong ruộng khi chênh lệch lớn hơn sai số đứng công bố của bộ dữ liệu (tìm và trích nguồn con số sai số; không có thì coi là `uniform`).
10. **[N] Đất từ SoilGrids:** `site/sources/soil.js` nếu Phase 0 thấy dịch vụ sống: gọi một lần cho tâm ruộng, hạn giờ ngắn, `kind: 'model'`, nhãn "ước tính từ mô hình toàn cầu 250 m, không phải số đo ruộng". Chết: hiện "Thiếu dữ liệu đất — hãy nhập kết quả xét nghiệm". Số đo tại ruộng luôn được ưu tiên hiển thị hơn SoilGrids, cả hai cùng hiện.
11. **[C] NDVI cho tọa độ bất kỳ:** gọi MODIS ORNL nhiều năm cho điểm mới, tính trung vị NDVI theo tháng và tỉ lệ ảnh có NDVI thấp (cùng định nghĩa `bareShare` trong `calendar_rule.py`) để đánh dấu tháng ruộng trống ngoài 5 huyện.

## Nghiệm thu

- `npm run build && npm test && npm run check:i18n` qua. Test mới: đọc ba định dạng, loại dòng ngoài giới hạn, harmonize, mức lệch hai nguồn.
- Kéo một file trong `samples/` vào trang Dữ liệu: thấy hộ chiếu, xác nhận, rồi thấy chuỗi mới trên biểu đồ "Ruộng của tôi" với nhãn đúng.
- Kéo một file hỏng (sai cột, số vô lý): được báo rõ lý do, không có gì lọt vào tính toán.
- Nhập độ mặn cao hơn ngưỡng của ngô: đèn của ngô đổi và bảng "Vì sao?" chỉ ra số đo tại ruộng là nguyên nhân.
- Không có ô lưới nào nhận giá trị khác nhau từ một nguồn độ phân giải vùng.

## Khoảng tự do

Trải nghiệm kéo thả, cách vẽ hộ chiếu, nơi lưu dữ liệu, cách hiện mức lệch giữa hai nguồn sao cho nông dân hiểu. Được đề xuất thêm định dạng nhập nếu chi phí nhỏ.

## Bàn giao

Cập nhật `STATE.md`, commit, báo người dùng: định dạng file nhóm cần chuẩn bị để nạp được ngay (cột nào, đơn vị nào).
