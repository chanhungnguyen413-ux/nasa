# Trạng thái nguồn dữ liệu (API_STATUS)

File này do `scripts/probe-apis.mjs` sinh ra lúc **2026-11-13 23:23:39 (giờ của máy chạy)**. Không sửa tay: chạy lại bằng `npm run probe`.

- Điểm thử: Cần Thơ · Cờ Đỏ (vĩ độ 10.1, kinh độ 105.43).
- Mỗi lần gọi gửi kèm header `Origin: http://localhost:5173` để đọc header CORS `access-control-allow-origin`. Tự kiểm tra "Node có thật sự gửi header Origin": **có**.
- Hạn mỗi lần gọi: 15 giây. Quá hạn thì thử lại một lần với 60 giây, chỉ để phân biệt "chậm" với "chết".
- Kết quả phản ánh mạng của máy này tại lúc chạy. **Nên chạy lại tại nơi thi.**

## Bốn phán quyết

- **TRÌNH DUYỆT GỌI ĐƯỢC**: gọi được và máy chủ cho phép trang web đọc phản hồi (có CORS), hoặc là ảnh tải bằng thẻ `<img>` (không cần CORS).
- **PHẢI QUA SERVER**: gọi được nhưng không có CORS, nên phải đi qua `server/server.mjs`. Khi đó trang mở bằng nhấp đúp sẽ không có nguồn này.
- **CHỈ DÙNG BẢN LƯU**: lúc dò không gọi được, nhưng repo đã có bản tính sẵn đủ dùng trong `site/data/precomputed/`.
- **KHÔNG DÙNG ĐƯỢC**: lúc dò không gọi được và không có bản lưu nào.

## Tóm tắt

| Nguồn | Phán quyết | HTTP | Thời gian | CORS | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| NASA POWER monthly | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 1,7 s | `*` | 9/9 tham số, đủ đến năm 2025; mưa: mm/ngày; `T2M_MAX`, `T2M_MIN` tháng là cực trị, KHÔNG phải trung bình |
| NASA POWER daily | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 0,8 s | `*` | ngày có đủ số liệu gần nhất: 20261110 (trễ 4 ngày) |
| Open-Meteo forecast | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 0,7 s | `*` | 8 ngày dự báo |
| Open-Meteo elevation | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 0,2 s | `*` | độ cao tại điểm thử: 2 m |
| OpenTopoData srtm30m | **PHẢI QUA SERVER** | 200 | 0,4 s | không có | độ cao tại điểm thử: 0 m (bộ `srtm30m`) |
| SoilGrids v2.0 | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 43,0 s (CHẬM: quá 15 s ở lần gọi đầu) | `*` | 5 tính chất đất có số |
| MODIS ORNL subset | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 4,0 s | `http://localhost:5173` | ảnh mới nhất: 2026-10-16 |
| NASA POWER monthly (ngoài ĐBSCL) | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 1,7 s | `*` | 9/9 tham số, đủ đến năm 2025 |
| NASA GIBS (ảnh) | **TRÌNH DUYỆT GỌI ĐƯỢC** | 200 | 9,9 s | `*` | 1330 lớp trong danh mục; 62 lớp khớp từ khoá; 62/62 lớp tải được ô ảnh thử |

## Chi tiết từng nguồn

### NASA POWER monthly · Cần Thơ · Cờ Đỏ (10.1; 105.43)

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,GWETROOT,GWETTOP&community=AG&longitude=105.43&latitude=10.1&start=2001&end=2025&format=JSON`
- Tài liệu chính thức: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- Mã HTTP: 200 · thời gian: 1,7 s · CORS: `*`
- Tham số trả về: 9/9.
- Giá trị rỗng (fill) ghi trong phản hồi: `-999`.
- Khoá thời gian dạng `YYYYMM`, ví dụ: `200101`, `200102`, `200103`, `200104`, `200105`, `200106`, `200107`, `200108`, `200109`, `200110`, `200111`, `200112`, `200113`, `200201`. Có khoá "tháng 13": **có** (xem cột cuối của bảng để biết nó là gì).
- Năm có trong phản hồi: 2001–2025. Năm gần nhất đủ 12 tháng cho mọi tham số: **2025**.
- Chuẩn thời gian: LST; nguồn ghi trong phản hồi: ["SYN1DEG","MERRA2","POWER"]; phiên bản API: v2.10.0.
- **Mưa tháng (PRECTOTCORR):** chuỗi đơn vị trong phản hồi là `mm/day`. Kiểm chứng bằng số: tổng mưa tháng tính từ dữ liệu NGÀY (`climate_monthly.json`, 2001–2025) chia cho giá trị tháng của API cho tỉ số từ 28.3 đến 31 qua 12 tháng → **mm/ngày (muốn có mm/tháng phải nhân với số ngày của tháng)**.
- So giá trị tháng với dữ liệu NGÀY của năm 2025 (cột "Giá trị tháng là gì" trong bảng): tham số là **cực trị của cả tháng, không phải trung bình ngày**: `T2M_MAX`, `T2M_MIN`.
- **Hệ quả cho ET0 (FAO-56):** công thức cần nhiệt độ cao nhất/thấp nhất TRUNG BÌNH của tháng. Không được đưa thẳng `T2M_MAX`, `T2M_MIN` của điểm cuối monthly vào công thức; phải gom từ dữ liệu ngày (`/api/temporal/daily/point`), hoặc ghi rõ phương án thay thế và nguồn.

| Tham số | Đơn vị (nguyên văn trong phản hồi) | Tên dài trong phản hồi | Ô rỗng / số tháng | Giá trị tháng là gì (so với dữ liệu ngày) | Khoá "13" là gì |
| --- | --- | --- | --- | --- | --- |
| `ALLSKY_SFC_SW_DWN` | `MJ/m^2/day` | All Sky Surface Shortwave Downward Irradiance | 0 / 300 | trung bình các ngày | trung bình 12 tháng |
| `GWETROOT` | `1` | Root Zone Soil Wetness | 0 / 300 | trung bình các ngày | trung bình 12 tháng |
| `GWETTOP` | `1` | Surface Soil Wetness | 0 / 300 | trung bình các ngày | trung bình 12 tháng |
| `PRECTOTCORR` | `mm/day` | Precipitation Corrected | 0 / 300 | trung bình các ngày | trung bình 12 tháng |
| `RH2M` | `%` | Relative Humidity at 2 Meters | 0 / 300 | trung bình các ngày | trung bình 12 tháng |
| `T2M` | `C` | Temperature at 2 Meters | 0 / 300 | trung bình các ngày | trung bình 12 tháng |
| `T2M_MAX` | `C` | Temperature at 2 Meters Maximum | 0 / 300 | giá trị CAO NHẤT trong tháng (không phải trung bình) | giá trị CAO NHẤT trong 12 tháng |
| `T2M_MIN` | `C` | Temperature at 2 Meters Minimum | 0 / 300 | giá trị THẤP NHẤT trong tháng (không phải trung bình) | giá trị THẤP NHẤT trong 12 tháng |
| `WS2M` | `m/s` | Wind Speed at 2 Meters | 0 / 300 | trung bình các ngày | trung bình 12 tháng |

### NASA POWER daily (đang dùng trong site/data/live.js)

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETTOP,GWETROOT,PRECTOTCORR,T2M_MAX&community=AG&latitude=10.1&longitude=105.43&start=20261020&end=20261113&format=JSON`
- Tài liệu chính thức: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Mã HTTP: 200 · thời gian: 0,8 s · CORS: `*`
- Đơn vị trong phản hồi: `GWETTOP` = `1`, `GWETROOT` = `1`, `PRECTOTCORR` = `mm/day`, `T2M_MAX` = `C`.
- Giá trị rỗng: `-999`. Hỏi 25 ngày; ngày gần nhất có đủ mọi tham số: **20261110** (trễ khoảng 4 ngày so với hôm nay).

### Open-Meteo forecast (đang dùng trong site/data/live.js)

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://api.open-meteo.com/v1/forecast?latitude=10.1&longitude=105.43&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=8`
- Tài liệu chính thức: https://open-meteo.com/en/docs
- Mã HTTP: 200 · thời gian: 0,7 s · CORS: `*`
- Đơn vị trong phản hồi (`daily_units`): `time` = `iso8601`, `temperature_2m_max` = `°C`, `precipitation_sum` = `mm`, `precipitation_probability_max` = `%`.
- Không phải dữ liệu NASA. Nhãn trên trang phải ghi đúng là Open-Meteo.

### Open-Meteo elevation

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://api.open-meteo.com/v1/elevation?latitude=10.1&longitude=105.43`
- Tài liệu chính thức: https://open-meteo.com/en/docs/elevation-api
- Mã HTTP: 200 · thời gian: 0,2 s · CORS: `*`
- Giá trị trả về tại điểm thử: **2** (phản hồi không kèm chuỗi đơn vị; trang tài liệu ghi là mét).
- Theo trang tài liệu của Open-Meteo: dữ liệu là Copernicus DEM, bản phát hành 2021, GLO-90, độ phân giải 90 m. **Không phải SRTM**, nên nhãn phải ghi "Copernicus DEM GLO-90 qua Open-Meteo".
- Cũng theo trang đó: người dùng phải ghi công chương trình Copernicus và dẫn tới Open-Meteo; mỗi lần gọi tối đa 100 toạ độ.

### OpenTopoData srtm30m (dịch vụ độ cao SRTM công khai)

**Phán quyết: PHẢI QUA SERVER**

- Địa chỉ đã gọi: `https://api.opentopodata.org/v1/srtm30m?locations=10.1,105.43`
- Tài liệu chính thức: https://www.opentopodata.org/api/
- Mã HTTP: 200 · thời gian: 0,4 s · CORS: không có
- Giá trị trả về: **0**, tên bộ dữ liệu trong phản hồi: `srtm30m`.
- Điều khoản của API công khai (trang chủ https://www.opentopodata.org/, mục "Public API"): tối đa 100 toạ độ mỗi lần gọi, 1 lần gọi mỗi giây, 1000 lần gọi mỗi ngày.
- Cũng theo trang đó, CORS chỉ có ở gói trả phí. Khớp với kết quả dò: không có header CORS, nên trình duyệt không gọi thẳng được.
- Trang chủ ghi bộ `srtm30m`: độ phân giải khoảng 30 m, phủ vĩ độ −60 đến 60, nguồn USGS.

### SoilGrids REST v2.0 properties/query (pH, carbon hữu cơ, sét, cát, limon; 0–30 cm)

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=105.43&lat=10.1&property=phh2o&property=soc&property=clay&property=sand&property=silt&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`
- Tài liệu chính thức: https://rest.isric.org/soilgrids/v2.0/docs
- Mã HTTP: 200 · thời gian: 43,0 s (CHẬM: quá 15 s ở lần gọi đầu) · CORS: `*`
- Giá trị là số nguyên đã nhân hệ số; chia cho hệ số ở cột 3 để ra đơn vị ở cột 4.

| Tính chất | Đơn vị lưu (mapped_units) | Hệ số chia (d_factor) | Đơn vị sau khi chia (target_units) | 0-5cm | 5-15cm | 15-30cm |
| --- | --- | --- | --- | --- | --- | --- |
| `clay` | g/kg | 10 | % | 333 | 341 | 359 |
| `phh2o` | pH*10 | 10 | - | 56 | 56 | 56 |
| `sand` | g/kg | 10 | % | 250 | 240 | 230 |
| `silt` | g/kg | 10 | % | 417 | 419 | 411 |
| `soc` | dg/kg | 10 | g/kg | 397 | 203 | 229 |

### MODIS MOD13Q1 qua ORNL DAAC subset (đang dùng)

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=10.1&longitude=105.43&band=250m_16_days_NDVI&startDate=A2025001&endDate=A2025001&kmAboveBelow=1&kmLeftRight=1`
- Tài liệu chính thức: https://modis.ornl.gov/data/modis_webservice.html
- Mã HTTP: 200 · thời gian: 4,0 s · CORS: `http://localhost:5173`
- Máy chủ lặp lại đúng Origin được gửi (không trả `*`). Thử thêm với `Origin: null` (trang mở bằng nhấp đúp): máy chủ trả `null` → vẫn gọi được.
- Phản hồi ghi: đơn vị `NDVI ratio - No units`, hệ số nhân `0.0001`, lưới 9 × 9 ô, mỗi ô 232 m.
- Danh sách ngày ảnh (`/dates`): 614 mốc, mới nhất **2026-10-16**, mất 1.8 s.
- Yêu cầu thử chỉ hỏi 1 mốc ảnh. Hỏi 10 mốc (giới hạn mỗi lần gọi) chậm hơn nhiều, nên trang nên dùng bản tính sẵn cho 5 huyện.

### NASA POWER monthly (ngoài ĐBSCL) · một điểm ở Đắk Lắk, ngoài ĐBSCL (12.67; 108.04)

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,GWETROOT,GWETTOP&community=AG&longitude=108.04&latitude=12.67&start=2001&end=2025&format=JSON`
- Tài liệu chính thức: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- Mã HTTP: 200 · thời gian: 1,7 s · CORS: `*`
- Tham số trả về: 9/9.
- Giá trị rỗng (fill) ghi trong phản hồi: `-999`.
- Khoá thời gian dạng `YYYYMM`, ví dụ: `200101`, `200102`, `200103`, `200104`, `200105`, `200106`, `200107`, `200108`, `200109`, `200110`, `200111`, `200112`, `200113`, `200201`. Có khoá "tháng 13": **có** (xem cột cuối của bảng để biết nó là gì).
- Năm có trong phản hồi: 2001–2025. Năm gần nhất đủ 12 tháng cho mọi tham số: **2025**.
- Chuẩn thời gian: LST; nguồn ghi trong phản hồi: ["SYN1DEG","MERRA2","POWER"]; phiên bản API: v2.10.0.

| Tham số | Đơn vị (nguyên văn trong phản hồi) | Tên dài trong phản hồi | Ô rỗng / số tháng | Giá trị tháng là gì (so với dữ liệu ngày) | Khoá "13" là gì |
| --- | --- | --- | --- | --- | --- |
| `ALLSKY_SFC_SW_DWN` | `MJ/m^2/day` | All Sky Surface Shortwave Downward Irradiance | 0 / 300 | không kiểm tra ở điểm này | trung bình 12 tháng |
| `GWETROOT` | `1` | Root Zone Soil Wetness | 0 / 300 | không kiểm tra ở điểm này | trung bình 12 tháng |
| `GWETTOP` | `1` | Surface Soil Wetness | 0 / 300 | không kiểm tra ở điểm này | trung bình 12 tháng |
| `PRECTOTCORR` | `mm/day` | Precipitation Corrected | 0 / 300 | không kiểm tra ở điểm này | trung bình 12 tháng |
| `RH2M` | `%` | Relative Humidity at 2 Meters | 0 / 300 | không kiểm tra ở điểm này | trung bình 12 tháng |
| `T2M` | `C` | Temperature at 2 Meters | 0 / 300 | không kiểm tra ở điểm này | trung bình 12 tháng |
| `T2M_MAX` | `C` | Temperature at 2 Meters Maximum | 0 / 300 | không kiểm tra ở điểm này | giá trị CAO NHẤT trong 12 tháng |
| `T2M_MIN` | `C` | Temperature at 2 Meters Minimum | 0 / 300 | không kiểm tra ở điểm này | giá trị THẤP NHẤT trong 12 tháng |
| `WS2M` | `m/s` | Wind Speed at 2 Meters | 0 / 300 | không kiểm tra ở điểm này | trung bình 12 tháng |

### NASA GIBS (ảnh nền vệ tinh, chỉ để nhìn)

**Phán quyết: TRÌNH DUYỆT GỌI ĐƯỢC**

- Địa chỉ đã gọi: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml`
- Tài liệu chính thức: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
- Mã HTTP: 200 · thời gian: 9,9 s · CORS: `*` · dung lượng: 5705 KB
- Danh mục có 1330 lớp. Tìm theo từ khoá được 62 lớp trong 4 nhóm; thử tải 1 ô ảnh (zoom ≤ 6, ngày mặc định của lớp) tại điểm thử: 62/62 lớp tải được.
- Header CORS của ô ảnh: `*`. Bản đồ tải ảnh bằng thẻ `<img>` nên không cần CORS; blueprint cũng cấm đọc số từ màu ảnh.
- Theo tài liệu GIBS, file danh mục chỉ liệt kê 100 mốc thời gian gần nhất của mỗi lớp, nên bảng dưới không ghi "ngày bắt đầu".
- Ô ảnh thử rất nhỏ (vài trăm byte) thường là ô trong suốt: lớp có ảnh nhưng ngày đó không phủ điểm thử.
- Các bảng xếp theo: lớp theo ngày/tháng trước lớp theo giờ, rồi ảnh mới nhất trước. Việc chọn lớp nào cho từng nút là của Phase 1.

#### Sức khỏe cây: NDVI (MODIS): 5 lớp

| Định danh (dùng nguyên văn) | Tiêu đề trong capabilities | TileMatrixSet | Zoom tối đa | Chu kỳ | Ngày mới nhất | Ngày mặc định | Định dạng | Thử 1 ô ảnh tại điểm thử | Chú giải màu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MODIS_Terra_NDVI_8Day` | Vegetation Index (rolling 8-Day, MODIS, Terra) | GoogleMapsCompatible_Level9 | 9 | P1D | 2026-11-12 | 2026-11-12 | image/png | được (200, 12852 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_NDVI_H.svg |
| `MODIS_Aqua_L3_NDVI_16Day` | Vegetation Index (16-Day, MODIS, Aqua) | GoogleMapsCompatible_Level9 | 9 | P16D | 2026-10-24 | 2026-10-24 | image/png | được (200, 12929 byte, 0,9 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_L3_NDVI_H.svg |
| `MODIS_Terra_L3_NDVI_16Day` | Vegetation Index (16-Day, MODIS, Terra) | GoogleMapsCompatible_Level9 | 9 | P16D | 2026-10-16 | 2026-10-16 | image/png | được (200, 12872 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_L3_NDVI_H.svg |
| `MODIS_Aqua_L3_NDVI_Monthly` | Vegetation Index (Monthly, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 12860 byte, 1,1 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_L3_NDVI_H.svg |
| `MODIS_Terra_L3_NDVI_Monthly` | Vegetation Index (L3, Monthly, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 12883 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_L3_NDVI_H.svg |

Mẫu địa chỉ ô ảnh (của lớp đầu bảng): `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`

#### Lượng mưa (IMERG): 2 lớp

| Định danh (dùng nguyên văn) | Tiêu đề trong capabilities | TileMatrixSet | Zoom tối đa | Chu kỳ | Ngày mới nhất | Ngày mặc định | Định dạng | Thử 1 ô ảnh tại điểm thử | Chú giải màu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `IMERG_Precipitation_Rate` | Precipitation Rate (IMERG) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-12 | 2026-11-12 | image/png | được (200, 4797 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg |
| `IMERG_Precipitation_Rate_30min` | Precipitation Rate, 30-minute avg. (IMERG) | GoogleMapsCompatible_Level6 | 6 | PT30M | 2026-11-13T10:30:00Z | 2026-11-13T10:30:00Z | image/png | được (200, 2338 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg |

Mẫu địa chỉ ô ảnh (của lớp đầu bảng): `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`

#### Độ ẩm đất (SMAP): 23 lớp

| Định danh (dùng nguyên văn) | Tiêu đề trong capabilities | TileMatrixSet | Zoom tối đa | Chu kỳ | Ngày mới nhất | Ngày mặc định | Định dạng | Thử 1 ô ảnh tại điểm thử | Chú giải màu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SMAP_L2_Passive_Day_Soil_Moisture_Option1` | Soil Moisture (L2, Passive, Day, Single Channel Algorithm, H Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 960 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Day_Soil_Moisture_Option2` | Soil Moisture (L2, Passive, Day, Single Channel Algorithm, V Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 961 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Day_Soil_Moisture_Option3` | Soil Moisture (L2, Passive, Day, Dual Channel Algorithm, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 961 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Enhanced_Day_Soil_Moisture_Option1` | Soil Moisture (L2, Passive Enhanced, Day, Single Channel Algorithm, H Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 968 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Enhanced_Day_Soil_Moisture_Option2` | Soil Moisture (L2, Passive Enhanced, Day, Single Channel Algorithm, V Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 969 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Enhanced_Day_Soil_Moisture_Option3` | Soil Moisture (L2, Passive Enhanced, Day, Dual Channel Algorithm, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 968 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Enhanced_Night_Soil_Moisture_Option1` | Soil Moisture (L2, Passive Enhanced, Night, Single Channel Algorithm, H Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1536 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Enhanced_Night_Soil_Moisture_Option2` | Soil Moisture (L2, Passive Enhanced, Night, Single Channel Algorithm, V Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1528 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Enhanced_Night_Soil_Moisture_Option3` | Soil Moisture (L2, Passive Enhanced, Night, Dual Channel Algorithm, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1523 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Night_Soil_Moisture_Option1` | Soil Moisture (L2, Passive, Night, Single Channel Algorithm, H Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1030 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Night_Soil_Moisture_Option2` | Soil Moisture (L2, Passive, Night, Single Channel Algorithm, V Polarization, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1036 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L2_Passive_Night_Soil_Moisture_Option3` | Soil Moisture (L2, Passive, Night, Dual Channel Algorithm, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1032 byte, 0,8 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L3_Passive_Day_Soil_Moisture` | Soil Moisture (L3, Passive, Day, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 961 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L3_Passive_Enhanced_Day_Soil_Moisture` | Soil Moisture (L3, Passive Enhanced, Day, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 968 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L3_Passive_Enhanced_Night_Soil_Moisture` | Soil Moisture (L3, Passive Enhanced, Night, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1523 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L3_Passive_Night_Soil_Moisture` | Soil Moisture (L3, Passive, Night, Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 1032 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` | Root Zone Soil Moisture (L4, 12z Instantaneous, Model Value-Added, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 3707 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg |
| `SMAP_L4_Analyzed_Surface_Soil_Moisture` | Surface Soil Moisture (L4, 12z Instantaneous, Model Value-Added, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 3783 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg |
| `SMAP_L4_Uncertainty_Analyzed_Root_Zone_Soil_Moisture` | Root Zone Soil Moisture Uncertainty (L4, 12z Instantaneous, Model Value-Added, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 4205 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Uncertainty_Analyzed_Soil_Moisture_H.svg |
| `SMAP_L4_Uncertainty_Analyzed_Surface_Soil_Moisture` | Surface Soil Moisture Uncertainty (L4, 12z Instantaneous, Model Value-Added, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-11-10 | 2026-11-10 | image/png | được (200, 3535 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Uncertainty_Analyzed_Soil_Moisture_H.svg |
| `SMAP_Sentinel-1_L2_Active_Passive_Soil_Moisture` | Soil Moisture (L2, Active-Passive, Radiometer/SMAP,  Radar/Sentinel-1) | GoogleMapsCompatible_Level6 | 6 | P1D | 2026-07-21 | 2026-07-21 | image/png | được (200, 935 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L3_Active_Passive_Soil_Moisture` | Soil Moisture (L3, Active/Passive, Radar/Radiometer, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2015-07-07 | 2015-07-07 | image/png | được (200, 934 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |
| `SMAP_L3_Active_Soil_Moisture` | Soil Moisture (L3, Active, Radar, SMAP) | GoogleMapsCompatible_Level6 | 6 | P1D | 2015-07-07 | 2015-07-07 | image/png | được (200, 934 byte, 0,8 s) | https://gibs.earthdata.nasa.gov/legends/SMAP_Soil_Moisture_H.svg |

Mẫu địa chỉ ô ảnh (của lớp đầu bảng): `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L2_Passive_Day_Soil_Moisture_Option1/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`

#### Nhiệt độ bề mặt đất (MODIS LST): 32 lớp

| Định danh (dùng nguyên văn) | Tiêu đề trong capabilities | TileMatrixSet | Zoom tối đa | Chu kỳ | Ngày mới nhất | Ngày mặc định | Định dạng | Thử 1 ô ảnh tại điểm thử | Chú giải màu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MODIS_Aqua_Land_Surface_Temp_Day` | Land Surface Temperature (Day, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 1472 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_Land_Surface_Temp_Day_TES` | Land Surface Temperature (Day, MODIS, Aqua, ASTER TES) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 1557 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_Land_Surface_Temp_Night` | Land Surface Temperature (Night, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 86335 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_Land_Surface_Temp_Night_TES` | Land Surface Temperature (Night, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 12210 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_Land_Surface_Temp_Day` | Land Surface Temperature (Day, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 1809 byte, 0,8 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_Land_Surface_Temp_Day_TES` | Land Surface Temperature (ASTER TES, Day, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 2687 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_Land_Surface_Temp_Night` | Land Surface Temperature (Night, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 1189 byte, 0,6 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_Land_Surface_Temp_Night_TES` | Land Surface Temperature (ASTER TES, Night, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-13 | 2026-11-13 | image/png | được (200, 1189 byte, 0,8 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Daily_Day` | Land Surface Temperature (L3, Daily, Day, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-12 | 2026-11-12 | image/png | được (200, 3342 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Daily_Night` | Land Surface Temperature (L3, Daily, Night, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-12 | 2026-11-12 | image/png | được (200, 1199 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Daily_Day` | Land Surface Temperature (L3, Daily, Day, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-11 | 2026-11-11 | image/png | được (200, 2361 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Daily_Day_TES` | Land Surface Temperature (ASTER TES L3, Daily, Day, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-11 | 2026-11-11 | image/png | được (200, 2409 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Daily_Night` | Land Surface Temperature (L3, Daily, Night, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-11 | 2026-11-11 | image/png | được (200, 1189 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Daily_Night_TES` | Land Surface Temperature (ASTER TES L3, Daily, Night, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-11 | 2026-11-11 | image/png | được (200, 1189 byte, 1,0 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Daily_Day_TES` | Land Surface Temperature (ASTER TES L3, Daily, Day, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-11 | 2026-11-11 | image/png | được (200, 2054 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Daily_Night_TES` | Land Surface Temperature (ASTER TES L3, Daily, Night, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P1D | 2026-11-11 | 2026-11-11 | image/png | được (200, 1189 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_8Day_Day` | Land Surface Temperature (L3, 8-Day, Day, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 8855 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_8Day_Day_TES` | Land Surface Temperature (ASTER TES L3, 8-Day, Day, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 9553 byte, 0,8 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_8Day_Night` | Land Surface Temperature (L3, 8-Day, Night, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 4667 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_8Day_Night_TES` | Land Surface Temperature (ASTER TES L3, 8-Day, Night, MODIS, Aqua) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 4871 byte, 0,8 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_8Day_Day` | Land Surface Temperature (8-Day, Day, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 7514 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_8Day_Day_TES` | Land Surface Temperature (ASTER TES L3, 8-Day, Day, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 9132 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_8Day_Night` | Land Surface Temperature (L3, 8-Day, Night, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 5939 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_8Day_Night_TES` | Land Surface Temperature (ASTER TES L3, 8-Day, Night, MODIS, Terra) | GoogleMapsCompatible_Level7 | 7 | P8D | 2026-11-01 | 2026-11-01 | image/png | được (200, 6763 byte, 0,8 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Monthly_CMG_Day_TES` | Land Surface Temperature (ASTER TES L3, Monthly, Day, MODIS, Aqua) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 4556 byte, 0,9 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Monthly_CMG_Night_TES` | Land Surface Temperature (ASTER TES L3, Monthly, Night, MODIS, Aqua) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 2960 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Monthly_Day` | Land Surface Temperature (L3, Monthly, Day, MODIS, Aqua) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 4554 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Aqua_L3_Land_Surface_Temp_Monthly_Night` | Land Surface Temperature (L3, Monthly, Night, MODIS, Aqua) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 3064 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Monthly_CMG_Day_TES` | Land Surface Temperature (ASTER TES L3, Monthly, Day, MODIS, Terra) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 3850 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Monthly_CMG_Night_TES` | Land Surface Temperature (ASTER TES L3, Monthly, Night, MODIS, Terra) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 3423 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day` | Land Surface Temperature (L3, Monthly, Day, MODIS, Terra) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 3770 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |
| `MODIS_Terra_L3_Land_Surface_Temp_Monthly_Night` | Land Surface Temperature (L3, Monthly, Night, MODIS, Terra) | GoogleMapsCompatible_Level6 | 6 | P1M | 2026-10-01 | 2026-10-01 | image/png | được (200, 3317 byte, 0,7 s) | https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg |

Mẫu địa chỉ ô ảnh (của lớp đầu bảng): `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_Land_Surface_Temp_Day/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`
