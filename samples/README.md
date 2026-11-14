# File mẫu và định dạng file để nạp vào trang "Dữ liệu"

Mọi file ở đây sinh bằng `node scripts/make-samples.mjs` từ dữ liệu THẬT đã có trong repo. Không có file SMAP/GPM giả.

| File | Nội dung | Nguồn gốc khi nạp |
|---|---|---|
| `ndvi_modis_co-do.csv` | Chuỗi NDVI MODIS của Cờ Đỏ, 2021–2025, mỗi ảnh 16 ngày | MODIS (vệ tinh) |
| `ndvi_modis_5_huyen_anh_moi_nhat.geojson` | Ảnh NDVI mới nhất của 5 huyện, mỗi huyện một điểm | MODIS (vệ tinh) |
| `mua_nasa_power_co-do_theo_thang.json` | Mưa tháng NASA POWER của Cờ Đỏ, 2001–2025 (mm/tháng) | Mô hình (vd. NASA POWER) |
| `file_hong_de_thu.csv` | File HỎNG CỐ Ý (số vô lý, ngày sai) để thử thông báo lỗi | — |

## Nhóm cần chuẩn bị file thế nào để nạp được ngay

- **Định dạng:** CSV (dấu phẩy, chấm phẩy hoặc tab đều được; dòng mô tả ở đầu file được bỏ qua), JSON (mảng bản ghi), hoặc GeoJSON (điểm hoặc đa giác, số liệu nằm trong `properties`).
- **Cột (tên gợi ý, trang tự đoán và cho sửa):** `date`, `lat`, `lon`, và một cột giá trị đặt theo tên biến, kèm đơn vị trong ngoặc, ví dụ `rain (mm/day)`, `ndvi`, `sm (m3/m3)`, `lst (K)`.
- **Ngày:** `YYYY-MM-DD`, `YYYYMMDD`, `YYYY-MM` (số liệu tháng), `DD/MM/YYYY`, hoặc `AYYYYDDD` (kiểu MODIS).
- **Đơn vị nhận được** (đổi theo định nghĩa, không đoán):

| Biến | Đơn vị | Giới hạn vật lý (dòng ngoài giới hạn bị loại) |
|---|---|---|
| Độ ẩm đất (SMAP) | m³/m³ hoặc % | 0–1 m³/m³ |
| Bốc thoát hơi nước (ECOSTRESS) | mm/ngày hoặc mm/tháng | ≥ 0 |
| Nhiệt độ bề mặt | °C hoặc K | ≥ −273,15 °C |
| Lượng mưa (GPM/IMERG) | mm/ngày hoặc mm/tháng | ≥ 0 |
| NDVI | không đơn vị | −1 đến 1 |
| Xu hướng nước ngầm (GRACE-FO) | cm, mm hoặc m | không chặn (có thể âm) |
| pH | không đơn vị | 0–14 |
| Độ mặn EC | dS/m, mS/cm hoặc µS/cm | ≥ 0 |
| Chất hữu cơ | % hoặc g/kg | 0–100 % |

- **Độ phân giải gốc:** ghi lại từ tài liệu của sản phẩm để nhập khi nạp. Bỏ trống thì file được coi là một giá trị cho cả ruộng.
- **Cắt file theo vùng ruộng** trước khi nạp (trang nhận tối đa 20 MB).
- Chưa có bộ đọc riêng cho định dạng xuất của Giovanni/AppEEARS: khi có file thật của nhóm, đưa vào đây để đối chiếu rồi mới viết.
