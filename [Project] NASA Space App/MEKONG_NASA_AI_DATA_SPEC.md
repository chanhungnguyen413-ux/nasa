# ĐẶC TẢ KỸ THUẬT ĐƯỜNG ỐNG DỮ LIỆU & TỪ ĐIỂN ĐẶC TRƯNG HUẤN LUYỆN AI NÔNG NGHIỆP ĐỒNG BẰNG SÔNG CỬU LONG (NASA EO + SOILGRIDS)

* **Tài liệu bàn giao:** Bộ phận Kỹ thuật Dữ liệu Không gian Địa lý (Geospatial Data Engineering) -> Bộ phận Huấn luyện Mô hình AI (AI/ML Training Team)
* **Phạm vi không gian (Bounding Box ĐBSCL):** Kinh độ `104.5°E – 106.8°E`, Vĩ độ `8.5°N – 11.0°N` (`[104.5, 8.5, 106.8, 11.0]`)
* **Hệ quy chiếu chuẩn (Target CRS):** `EPSG:32648` (WGS 84 / UTM Zone 48N)
* **Độ phân giải lưới phân tích chung (Master Grid):** Ô lưới chuẩn **100 m × 100 m** (1 ha/pixel) và tổng hợp thống kê vùng theo **Ranh giới hành chính cấp Xã (`adm3_id`)**
* **Bước thời gian tổng hợp (Temporal Step):** Hàng tháng (Monthly) và theo kỳ quyết định mùa vụ (**Đông Xuân**, **Xuân Hè / Hè Thu**, **Thu Đông / Lúa Mùa**)

---

## 1. Quy ước Khung Tham Chiếu Chuẩn & Chống Rò rỉ Dữ liệu (Anti-Leakage Anchor)

* **Hệ tọa độ & Lưới không gian chuẩn (Master Grid):** Hệ chiếu phẳng **UTM Zone 48N (`EPSG:32648`)**, kích thước pixel chuẩn **100 m × 100 m** (1 ha/pixel), đồng thời liên kết khóa ngoại với ranh giới hành chính cấp xã (`adm3_id`) qua phép thống kê vùng có trọng số diện tích (*Area-Weighted Zonal Statistics*) sau khi đã che mặt nạ đất canh tác nông nghiệp (*Cropland Mask*).
* **Mốc thời gian ra quyết định ($t_0$ - Decision Cut-off):** Chốt vào ngày **15 của tháng trước khi xuống giống** mỗi vụ:
  * **Vụ Đông Xuân (ĐX):** `15/10`
  * **Vụ Xuân Hè / Hè Thu (XH/HT):** `15/03`
  * **Vụ Thu Đông / Lúa Mùa (TĐ/Mùa):** `15/07`
  * Mọi biến đầu vào `X` chỉ được phép truy xuất trong miền thời gian $t \le t_0$ để **chống rò rỉ dữ liệu tương lai (Zero Future Data Leakage)**.

---

## 2. Danh mục Nguồn Dữ liệu Gốc & Đường dẫn Truy cập Xác thực

| STT | Bộ dữ liệu | Mã Sản phẩm Chuẩn | Mã Tài sản Google Earth Engine (GEE Asset ID) | Cổng Truy cập / API Trực tiếp |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **SMAP** | `SPL4SMGP` (V008)<br>`SPL3SMP_E` (V006) | `NASA/SMAP/SPL4SMGP/008`<br>`NASA/SMAP/SPL3SMP_E/006` | [NASA AppEEARS](https://appeears.earthdatacloud.nasa.gov/) |
| **2** | **ECOSTRESS** | `ECO_L2T_LSTE` (V002)<br>`ECO_L4T_ESI` (V002) | *(Truy xuất qua AppEEARS / LP DAAC Cloud)* | [NASA AppEEARS](https://appeears.earthdatacloud.nasa.gov/) / [Earthdata Search](https://search.earthdata.nasa.gov/search?q=ECO_L2T_LSTE) |
| **3** | **GPM IMERG** | `GPM_3IMERGDF` (V07)<br>`GPM_3IMERGHH` (V07) | `NASA/GPM_L3/IMERG_V07` | [NASA Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/) |
| **4** | **Landsat 8/9** | `LANDSAT_OT_C2_L2` | `LANDSAT/LC08/C02/T1_L2`<br>`LANDSAT/LC09/C02/T1_L2` | [USGS EarthExplorer](https://earthexplorer.usgs.gov/) |
| **5** | **MODIS** | `MOD13Q1` (V061)<br>`MOD11A2` (V061) | `MODIS/061/MOD13Q1`<br>`MODIS/061/MOD11A2` | [NASA AppEEARS](https://appeears.earthdatacloud.nasa.gov/) |
| **6** | **NASA POWER** | `Agroclimatology (AG)` | *(Tải trực tiếp qua REST API)* | [NASA POWER API Viewer](https://power.larc.nasa.gov/data-access-viewer/) |
| **7** | **GRACE / GRACE-FO** | `TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4` | `NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI` | [PO.DAAC GRACE Portal](https://grace.jpl.nasa.gov/data/data-analysis-tool/) |
| **8** | **SRTM / NASADEM** | `NASADEM_HGT` (V001)<br>`SRTMGL1` (V003) | `NASA/NASADEM_HGT/001`<br>`USGS/SRTMGL1_003` | [OpenTopography NASADEM](https://portal.opentopography.org/raster?opentopoID=OTSDEM.032021.4326.2) |
| **9** | **SoilGrids 2.0** | `ISRIC SoilGrids 250m` | `projects/soilgrids-isric/phh2o_mean`<br>`projects/soilgrids-isric/clay_mean`<br>`projects/soilgrids-isric/soc_mean` | [ISRIC SoilGrids Portal](https://soilgrids.org/) |

* **URL mẫu gọi trực tiếp NASA POWER REST API (không cần đăng nhập) cho khung tọa độ ĐBSCL:**
  ```http
  https://power.larc.nasa.gov/api/temporal/daily/regional?parameters=PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,RH2M,ALLSKY_SFC_SW_DWN&community=AG&latitude-min=8.5&latitude-max=11.0&longitude-min=104.5&longitude-max=106.8&start=20200101&end=20251231&format=CSV
  ```

---

## 3. Ba Bảng Đặc Tả Kỹ Thuật Chuẩn Hóa Cho Đội Huấn Luyện AI

### Bảng 1: Bảng Quy tắc Đồng bộ Độ phân giải (Resolution Synchronization & Data Fusion Rules)

| `Bo_Du_Lieu` | `Do_Phan_Giai_Goc` | `Phuong_Phap_Tai_Lay_Mau_&_Tong_Hop` (Về lưới 100 m & Cấp xã / Tháng) | `Xu_Ly_Thieu_Du_Lieu_&_Che_May` |
| :--- | :--- | :--- | :--- |
| **1. SMAP** (`SPL4SMGP` V008) | **9 km × 9 km**<br>3 giờ/lần | • **Không gian:** Hạ tỷ lệ (Downscaling) từ 9 km về 100 m bằng hồi quy phụ trợ chỉ số thực vật – nhiệt độ (**DisPATCh / Optical-Thermal Sharpening** với `MODIS/Landsat NDVI` & `LST`), hoặc nội suy song tuyến tính (**Bilinear**) kèm chuẩn hóa dị thường Z-score theo chuỗi khí hậu 10 năm.<br>• **Thời gian:** Trung bình tháng ($\mu$) và độ lệch chuẩn tháng ($\sigma$). | • Sản phẩm `L4` đã đồng hóa mô hình hoàn chỉnh (0% khuyết dữ liệu).<br>• Loại bỏ/gắn cờ các ô lưới ven biển có tỷ lệ mặt nước mở `water_fraction > 0.5` để tránh nhiễu bức xạ vi ba. |
| **2. ECOSTRESS** (`ECO_L2T_LSTE` & `ECO_L4T_ESI` V002) | **70 m × 70 m**<br>1–5 ngày (Bất quy tắc) | • **Không gian:** Nội suy song tuyến tính (**Bilinear**) từ 70 m về lưới chuẩn 100 m; tính trung vị vùng (*Zonal Median*) theo ranh giới xã.<br>• **Thời gian:** Chuẩn hóa giờ thu nhận về nhiệt độ tương đương lúc 13:30 chiều, sau đó gộp theo **phân vị thứ 75 (`P75` cho `LST`)** và **phân vị thứ 25 (`P25` cho `ESI`)** hàng tháng để bắt đỉnh stress nhiệt. | • Lọc mây và sương mù nghiêm ngặt bằng bitmask `QC` (`cloud_mask == 0`).<br>• Nếu khuyết > 15 ngày do mây + lệch quỹ đạo ISS: Dùng thuật toán **STARFM / Hồi quy tuyến tính cục bộ** với `MOD11A2` (1 km) để lấp đầy khoảng trống. |
| **3. GPM IMERG** (`GPM_3IMERGDF` & `HH` V07) | **0.1° × 0.1° (~11 km)**<br>30 phút & Hàng ngày | • **Không gian:** Nội suy **Bicubic** về lưới 100 m; tính trung bình có trọng số diện tích (*Area-Weighted Mean*) cho cấp xã.<br>• **Thời gian:** Cộng tổng lượng mưa tháng ($\sum\text{mm}$), tính chỉ số mưa chuẩn hóa (**SPI-1**, **SPI-3**) và trích xuất cực đại mưa 1 ngày lớn nhất tháng (`Rx1day`). | • Dữ liệu tổ hợp vệ tinh V07 không bị ảnh hưởng bởi mây.<br>• Kiểm tra và cắt ngưỡng ngoại lai vật lý (`0 <= rain_mm <= 500 mm/ngày`) và hiệu chỉnh sai số hệ thống (Bias Correction) theo trạm đo mưa mặt đất. |
| **4. Landsat 8/9** (`LC08` & `LC09` C2 T1 L2) | **30 m × 30 m**<br>8 ngày (Kết hợp L8+L9) | • **Không gian:** Gộp trung bình khối (**Block Averaging / Average Pooling**) từ ~11 pixel (30 m) về 1 pixel chuẩn (100 m) để giảm nhiễu hạt.<br>• **Thời gian:** Ghép ảnh **Maximum Value Composite (MVC)** theo tháng cho `NDVI`/`EVI` và **Median Composite** cho `BSI`/`MNDWI`. | • Xóa mây, bóng mây và mây ti (Cirrus) qua bitmask `QA_PIXEL` (Bits 1, 2, 3, 4 = 0).<br>• Khi mất ảnh mùa mưa (tháng 6–10): Áp dụng bộ lọc làm mượt **Whittaker Smoother** kết hợp hòa trộn không gian - thời gian (**ESTARFM**) từ nền `MOD13Q1`. |
| **5. MODIS** (`MOD13Q1` & `MOD11A2` V061) | **250 m** (`MOD13Q1` / 16 ngày)<br>**1 km** (`MOD11A2` / 8 ngày) | • **Không gian:** Chuyển hệ chiếu từ `Sinusoidal` sang `EPSG:32648`, nội suy **Bilinear** về lưới 100 m.<br>• **Thời gian:** Tính trung bình có trọng số theo số ngày nằm trong tháng và tính **Dị thường chuẩn hóa (Standardized Anomaly)**: $Z = (X_t - \mu_{\text{month}}) / \sigma_{\text{month}}$. | • Chỉ giữ pixel có `SummaryQA == 0` (Good) hoặc `1` (Marginal).<br>• Nội suy tuyến tính theo thời gian (*Temporal Linear Interpolation*) cho các bước 8–16 ngày bị che mây liên tiếp (tối đa cửa sổ 32 ngày). |
| **6. NASA POWER** (`Agroclimatology` Daily) | **0.5° × 0.625° (~50 km)**<br>Hàng ngày | • **Không gian:** Nội suy **Bilinear** về tâm hình học (Centroid) của từng xã (`adm3_id`) hoặc lưới 100 m.<br>• **Thời gian:** Tính trung bình tháng cho `T2M`, `VPD`, `ALLSKY_SFC_SW_DWN` và đếm tổng số ngày nắng nóng cực đoan (`T2M_MAX > 35°C`) trong tháng. | • Bộ dữ liệu tái phân tích đồng hóa MERRA-2 hoàn chỉnh 100%, không bị khuyết do mây.<br>• Kiểm tra giá trị khuyết mặc định `-999` của API và thay thế bằng trung bình trượt 5 ngày (`Rolling Mean 5d`). |
| **7. GRACE / GRACE-FO** (`MASCON_CRI` RL06.3 V4) | **0.5° × 0.5° (~55 km)**<br>Hàng tháng | • **Không gian:** Bắt buộc dùng bản lọc bờ biển **CRI (Coastal Resolution Improvement)**; gán theo trọng số khoảng cách nghịch đảo (**IDW / Bilinear**) về cấp xã.<br>• **Thời gian:** Tính độ dốc xu thế 12 tháng ($\text{Slope}_{12m}$) và hiệu số biến thiên tháng ($\Delta\text{TWS}_t = \text{TWS}_t - \text{TWS}_{t-1}$). | • Khoảng trống lịch sử 11 tháng giữa GRACE và GRACE-FO (2017–2018) hoặc tháng khuyết đơn lẻ: Điền khuyết bằng hồi quy chuỗi thời gian với độ ẩm đất tầng sâu từ **GLDAS-2.2** (`NASA/GLDAS`) hoặc nội suy **Cubic Spline**. |
| **8. SRTM / NASADEM** (`NASADEM_HGT` V001) | **30 m × 30 m**<br>Tĩnh (Static) | • **Không gian:** Gộp trung bình (Mean) và độ lệch chuẩn (StdDev - đo độ gồ ghề vi địa hình) từ 30 m về lưới 100 m.<br>• Tính chỉ số **HAND (Height Above Nearest Drainage)** — độ cao tương đối so với mạng lưới kênh rạch ĐBSCL. | • `NASADEM` đã lấp đầy các lỗ rỗng (voids) của SRTM cũ bằng dữ liệu ASTER/ICESat.<br>• Khử sai số dương do tán cây rừng tràm/vườn cây ăn trái và nhà cửa bằng bộ lọc hình thái học (*Morphological Slope Filter*) hoặc tham chiếu chéo với **FABDEM**. |
| **9. SoilGrids 2.0 & Bản đồ Thổ nhưỡng ĐBSCL** | **250 m × 250 m**<br>Tĩnh (Static 0–30 cm & 30–60 cm) | • **Không gian:** Nội suy **Bilinear** cho biến liên tục (`pH_H2O`, `%Clay`, `%Sand`, `SOC`, `CEC`, `Bulk_Density`) và **Nearest Neighbor / Majority Vote** cho nhóm đất phân loại (Đất phù sa, đất phèn hoạt động/tiềm tàng, đất mặn) về lưới 100 m. | • Các pixel rỗng trùng với kênh rạch nội đồng nhỏ hoặc khu dân cư mới: Điền khuyết không gian bằng cửa sổ trượt **Focal Median (5×5 pixels)** cùng đơn vị địa mạo. |

---

### Bảng 2: Bảng Đặc trưng Đầu vào Huấn luyện AI (Biến `X` - Feature Engineering & Anti-Leakage Spec)

| `Ten_Cot` | `Kieu_Du_Lieu` | `Cua_So_Tre_Thoi_Gian` (So với mốc quyết định $t_0$) | `Chi_So_Do_Bat_Dinh` (Cột chất lượng đi kèm trong bảng `X`) | `Y_Nghia_Nong_Hoc` |
| :--- | :--- | :--- | :--- | :--- |
| `sm_rz_lag1m_mean` | `float32` | Trễ 1 tháng (`[t0 - 30d, t0]`) | `smap_downscale_r2` (`float16`: hệ số $R^2$ nội suy không gian từ 9 km về 100 m) | Lượng nước hữu dụng tích trữ sẵn trong tầng rễ (0–100 cm) ngay trước ngày xuống giống vụ mới. |
| `sm_rz_roll3m_zscore` | `float32` | Trung bình trượt 3 tháng (`[t0 - 90d, t0]`) so với TB 10 năm | `smap_water_contam_flag` (`uint8`: `1` nếu ô 9 km chứa > 30% mặt nước kênh/biển) | Đánh giá mức độ hạn đất tích lũy từ vụ trước; nếu `Z < -1.5` cảnh báo thiếu ẩm nghiêm trọng cho vụ Xuân Hè. |
| `eco_esi_lag1m_p25` | `float32` | Phân vị 25% trong 1 tháng trước (`[t0 - 30d, t0]`) | `eco_valid_obs_cnt` (`uint8`: số lần chụp sạch mây thực tế trong tháng, từ `0` đến `8`) | Bắt tín hiệu stress bốc hơi nước gay gắt nhất cuối vụ trước (phản ánh độ mặn/khô hạn tồn lưu trong đất). |
| `eco_lst_anom_lag1m` | `float32` | Dị thường nhiệt độ bề mặt 1 tháng trước (`[t0 - 30d, t0]`) | `eco_gapfill_ratio` (`float16`: tỷ lệ % pixel phải nội suy từ MODIS `MOD11A2`) | Phát hiện hiện tượng bốc nóng cục bộ cấp lô ruộng do cạn nước mặt hoặc xì phèn/mặn lên mặt ruộng. |
| `gpm_spi3_lag1m` | `float32` | Chỉ số mưa chuẩn hóa tích lũy 3 tháng (`[t0 - 90d, t0]`) | `gpm_scale_factor` (`uint8`: cấp độ phân giải gốc `11 km` so với diện tích xã) | Đo lường độ dư thừa hoặc thiếu hụt nước mưa trung hạn để quyết định thời điểm rửa mặn vụ Lúa – Tôm. |
| `gpm_rx1day_roll3m` | `float32` | Lượng mưa 1 ngày cực đại trong cửa sổ 3 tháng cùng kỳ 5 năm trước | `gpm_gauge_corr_weight` (`float16`: trọng số hiệu chỉnh trạm đo mưa mặt đất) | Đặc trưng rủi ro khí hậu lịch sử: Xác suất gặp mưa dông cực đoan gây ngập úng nếu trồng cây họ đậu/hoa màu. |
| `ls_evi_peak_prev_season` | `float32` | Đỉnh `EVI` của vụ liền trước (`[t0 - 120d, t0 - 15d]`) | `ls_cloud_free_frac` (`float16`: tỷ lệ ảnh sạch mây 0.0–1.0 trong suốt vụ trước) | Phản ánh sức khỏe sinh khối của vụ trước; đỉnh `EVI` suy giảm liên tiếp qua các năm báo hiệu đất bị thoái hóa/nhiễm mặn. |
| `ls_bsi_mndwi_diff_lag1m` | `float32` | Hiệu số `BSI - MNDWI` trong 1 tháng trước (`[t0 - 30d, t0]`) | `ls_interp_flag` (`uint8`: `0` = ảnh thật L8/L9, `1` = nội suy Whittaker/MODIS) | Phân tách rõ trạng thái mặt ruộng trước vụ mới: Đang ngập nước/nuôi tôm (`< -0.2`) hay đang phơi ải khô kiệt (`> +0.2`). |
| `mod_lst_diurnal_roll2m` | `float32` | Biên độ nhiệt Ngày–Đêm trung bình trượt 2 tháng (`[t0 - 60d, t0]`) | `mod_qa_good_pct` (`float16`: % ngày đạt chuẩn `SummaryQA == 0`) | Chỉ báo quán tính nhiệt của đất: Biên độ thấp báo hiệu nền đất ngập/ẩm; biên độ cao báo hiệu đất khô hạn. |
| `pwr_vpd_gt2kpa_days_lag1m` | `int16` | Tổng số ngày có `VPD > 2.0 kPa` trong 30 ngày trước (`[t0 - 30d, t0]`) | `pwr_grid_dist_km` (`float16`: khoảng cách từ tâm xã đến tâm ô lưới MERRA-2) | Đánh giá áp lực bốc hơi khí quyển và độ khô không khí gây mất nước nhanh ở cây con mới gieo sạ. |
| `pwr_solar_roll3m_mean` | `float32` | Trung bình trượt 3 tháng (`[t0 - 90d, t0]`) và trung bình kỳ vọng mùa vụ tới (Climatology 20 năm) | `pwr_climatology_std` (`float16`: độ biến động bức xạ giữa các năm) | Tiềm năng bức xạ mặt trời phục vụ quang hợp, giúp AI ước lượng trần năng suất lúa hoặc đậu. |
| `grace_tws_slope_12m` | `float32` | Độ dốc tuyến tính 12 tháng quá khứ (`[t0 - 365d, t0]`) | `grace_mascon_leakage_err` (`float32`: sai số chuẩn của ô Mascon ven biển, đơn vị `cm`) | Tốc độ suy giảm tổng trữ lượng nước ngọt và nước ngầm của tiểu vùng; cảnh báo xâm nhập mặn sâu vào mùa khô. |
| `topo_hand_m` | `float32` | Biến tĩnh (Static baseline) | `dem_canopy_bias_prob` (`float16`: xác suất nhiễu độ cao do cây lâu năm/nhà cửa) | Độ cao tương đối so với kênh rạch gần nhất (`HAND`), quyết định khả năng tự chảy khi tưới/tiêu và nguy cơ ngập triều. |
| `soil_ph_clay_soc_idx` | `float32` | Biến tĩnh (Static 0–30 cm từ SoilGrids 2.0 + Bản đồ đất ĐBSCL) | `soil_prediction_pi90` (`float16`: khoảng tin cậy 90% `PI90` của mô hình SoilGrids) | Tổ hợp độ chua phèn (`pH_H2O < 4.5`), tỷ lệ sét (`%Clay`) và hữu cơ (`SOC`), quyết định ngưỡng chịu hạn phèn và giữ ẩm. |

---

### Bảng 3: Bảng Nhãn Mục tiêu & Điểm Đánh giá Đa mục tiêu (Biến `y` - Target Labels & Multi-Objective Scoring)

| `Nhan_Chien_Luoc_Luan_Canh` (`y_class`) | `Diem_Tiet_Kiem_Nuoc` (`y_water_score`: Thang `0.0 – 1.0`) | `Chi_So_Cai_Tao_Dat` (`y_soil_score`: Thang `-1.0` đến `+1.0`) | `Nhan_Thich_Ung_Khi_Hau` (`y_climate_tier`) |
| :--- | :--- | :--- | :--- |
| **`0_LUA_3VU`**<br>*(3 vụ Lúa thâm canh: Đông Xuân – Hè Thu – Thu Đông)* | **`0.15 – 0.25` (Thấp)**<br>• Tiêu thụ ~3,500 – 4,500 $\text{m}^3/\text{ha/vụ}$ × 3 vụ.<br>• Đòi hỏi duy trì tầng nước mặt liên tục.<br>• *Điều kiện gán nhãn:* `topo_hand_m` từ `1.2–3.0 m`, `sm_rz_lag1m_mean > 0.35`, `eco_esi_lag1m_p25 > 0.65`. | **`-0.60` đến `-0.30` (Suy thoái đất)**<br>• Đất ngập yếm khí quanh năm làm tích tụ độc chất hữu cơ, thiếu oxy tầng rễ, cạn kiệt vi lượng và ngắt nguồn phù sa tự nhiên (do đê bao kín). | **`TIER_3_VULNERABLE` (Kém bền vững)**<br>• Chỉ duy trì ở vùng ngọt hóa hoàn toàn.<br>• Phát thải khí nhà kính ($\text{CH}_4$) cao; rủi ro thiệt hại nặng khi xảy ra hạn mặn cực đoan hoặc lũ lớn. |
| **`1_LUA_MAU_DAU`**<br>*(Luân canh: Lúa Đông Xuân – Cây họ đậu/Bắp – Lúa Thu Đông)* | **`0.75 – 0.90` (Rất cao)**<br>• Vụ màu/đậu tiết kiệm **65–75% lượng nước tưới** so với trồng lúa vụ 2 (~1,000 – 1,200 $\text{m}^3/\text{ha}$), tận dụng trực tiếp ẩm tầng rễ.<br>• *Điều kiện gán nhãn:* `sm_rz_lag1m_mean` từ `0.22–0.32`, `topo_hand_m > 1.5 m`, `gpm_rx1day_roll3m < 40 mm`. | **`+0.70` đến `+0.95` (Cải tạo đất tối ưu)**<br>• Vi khuẩn nốt sần rễ cây họ đậu cố định **40–80 kg N/ha** tự nhiên.<br>• Đất được thoáng khí, khoáng hóa chất hữu cơ và cắt đứt 100% vòng đời sâu bệnh hại lúa (rầy nâu, vàng lùn). | **`TIER_1_RESILIENT_DRYLAND` (Thích ứng hạn ngọt)**<br>• Giải pháp tối ưu cho vùng phù sa và đất phèn nhẹ khi dự báo mùa khô thiếu nước thượng nguồn sông Mê Kông (`grace_tws_slope_12m < 0`). |
| **`2_LUA_TOM`**<br>*(Thuận thiên: Tôm nước lợ mùa khô – 1 vụ Lúa mùa mưa)* | **`0.80 – 0.95` (Tối ưu nước ngọt)**<br>• Không sử dụng nước ngọt bơm tưới trong suốt 6 tháng mùa khô.<br>• Vụ lúa mùa mưa sử dụng 100% nước trời để rửa mặn và nuôi lúa.<br>• *Điều kiện gán nhãn:* `topo_hand_m < 1.2 m`, vùng mặn/lợ ven biển, chuyển vụ lúa khi `gpm_spi3_lag1m > 0.5` (~mưa 30 ngày > 200 mm). | **`+0.40` đến `+0.65` (Cân bằng hữu cơ – mặn)**<br>• Lớp bùn đáy giàu dinh dưỡng sau vụ tôm cung cấp phân hữu cơ tự nhiên cho lúa; rễ lúa phân hủy làm sạch đáy ao cho vụ tôm kế tiếp.<br>• *Lưu ý:* Cần rửa mặn kỹ đầu mùa mưa để tránh tích muối tầng canh tác. | **`TIER_1_RESILIENT_COASTAL` (Thích ứng xâm nhập mặn)**<br>• Mô hình kinh tế tuần hoàn chủ lực cho toàn dải ven biển ĐBSCL (Cà Mau, Bạc Liêu, Sóc Trăng, Kiên Giang, Trà Vinh, Bến Tre), biến nguy cơ nước mặn thành nguồn lợi thủy sản. |
| **`3_LUA_XALU_THUYSAN`**<br>*(2 vụ Lúa – Xả lũ đón phù sa / Nuôi cá mùa nước nổi)* | **`0.65 – 0.80` (Cân bằng thủy văn)**<br>• Vụ 3 không tốn nước tưới mà đóng vai trò **không gian trữ nước tự nhiên** (Water Retention Basin), giúp giảm ngập cho hạ lưu và bổ cập nước ngầm (`grace_tws`).<br>• *Điều kiện gán nhãn:* `topo_hand_m < 1.0 m`, vùng trũng đầu nguồn, `ls_bsi_mndwi_diff_lag1m < -0.25` vào tháng 8–11. | **`+0.80` đến `+1.00` (Phục hồi độ phì cao nhất)**<br>• Nhận **lớp phù sa tự nhiên** giàu NPK và vi lượng từ lũ sông Mê Kông; nước lũ rửa trôi hoàn toàn phèn, độc chất và tiêu diệt chuột, cỏ dại. | **`TIER_1_NATURE_BASED` (Thích ứng ngập lũ đầu nguồn)**<br>• Giải pháp thuận thiên chuẩn cho vùng trũng Đồng Tháp Mười và Tứ giác Long Xuyên. |
| **`4_LUA_BOHOA_KIEMSOAT`**<br>*(1–2 vụ Lúa – Nghỉ đất / Phơi ải có kiểm soát ẩm mùa khô)* | **`0.90 – 1.00` (Cắt giảm 100% nước vụ hạn)**<br>• Ngừng hoàn toàn việc bơm vét nước kênh nhiễm mặn trong các đợt El Niño cực đoan.<br>• *Điều kiện gán nhãn:* `sm_rz_roll3m_zscore < -1.5`, `eco_esi_lag1m_p25 < 0.35`, `pwr_vpd_gt2kpa_days_lag1m > 15 ngày`. | **`-0.20` đến `+0.30` (Phụ thuộc nền đất)**<br>• **Đất phù sa/mặn (`+0.30`):** Giúp giải phóng khí độc, làm tơi xốp đất.<br>• **Đất phèn tiềm tàng (`-0.20`):** Phải giữ ẩm tối thiểu (`sm_rz_lag1m_mean > 0.18`) để ngăn oxy hóa tầng Pyrite gây xì phèn sắt/nhôm đầu mùa mưa. | **`TIER_2_DEFENSIVE_SAFEGUARD` (Phòng vệ khẩn cấp)**<br>• Nhãn bảo toàn vốn cho nông dân khi các chỉ báo NASA vượt ngưỡng chịu đựng sinh học của cả lúa và cây màu trong mùa khô hạn mặn kỷ lục. |

---

## 4. Đặc tả Schema File Xuất (`Parquet` / `CSV`) Bàn Giao Cho Đội AI

* **Định dạng lưu trữ khuyến nghị:** Apache Parquet (`compression='zstd'`) hoặc CSV UTF-8.
* **Cấu trúc phân vùng thư mục (Partitioning):**
  `feature_store/grid_100m/crop_year={YYYY}/decision_season={DX|XH|TD}/province_id={ma_tinh}/part-*.parquet`

```yaml
primary_keys:
  - grid_id: string          # Mã định danh ô lưới 100m (VD: "UTM48N_X584200_Y1105300")
  - adm3_id: string          # Mã hành chính cấp xã/phường
  - centroid_lat: float32    # Vĩ độ tâm ô lưới (WGS84)
  - centroid_lon: float32    # Kinh độ tâm ô lưới (WGS84)
  - crop_year: int16         # Năm canh tác (VD: 2024)
  - decision_season: string  # Kỳ ra quyết định ("DX", "XH", "TD")
  - cutoff_date_t0: date     # Ngày chốt dữ liệu đầu vào chống rò rỉ (YYYY-MM-15)

features_X:
  - sm_rz_lag1m_mean: float32
  - sm_rz_roll3m_zscore: float32
  - eco_esi_lag1m_p25: float32
  - eco_lst_anom_lag1m: float32
  - gpm_spi3_lag1m: float32
  - gpm_rx1day_roll3m: float32
  - ls_evi_peak_prev_season: float32
  - ls_bsi_mndwi_diff_lag1m: float32
  - mod_lst_diurnal_roll2m: float32
  - pwr_vpd_gt2kpa_days_lag1m: int16
  - pwr_solar_roll3m_mean: float32
  - grace_tws_slope_12m: float32
  - topo_hand_m: float32
  - soil_ph_clay_soc_idx: float32

uncertainty_weights_U:
  - smap_downscale_r2: float16
  - smap_water_contam_flag: uint8
  - eco_valid_obs_cnt: uint8
  - eco_gapfill_ratio: float16
  - gpm_scale_factor: uint8
  - gpm_gauge_corr_weight: float16
  - ls_cloud_free_frac: float16
  - ls_interp_flag: uint8
  - mod_qa_good_pct: float16
  - pwr_grid_dist_km: float16
  - pwr_climatology_std: float16
  - grace_mascon_leakage_err: float32
  - dem_canopy_bias_prob: float16
  - soil_prediction_pi90: float16

targets_y:
  - y_class: int8            # 0: 0_LUA_3VU, 1: 1_LUA_MAU_DAU, 2: 2_LUA_TOM, 3: 3_LUA_XALU_THUYSAN, 4: 4_LUA_BOHOA_KIEMSOAT
  - y_class_label: string    # Tên nhãn chiến lược luân canh
  - y_water_score: float32   # Điểm tiết kiệm nước [0.0, 1.0]
  - y_soil_score: float32    # Chỉ số cải tạo đất [-1.0, +1.0]
  - y_climate_tier: string   # Phân hạng thích ứng khí hậu
```
