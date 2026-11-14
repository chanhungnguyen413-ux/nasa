import json
import os

scenarios = [
    # =========================================================================
    # NHOM A: VUNG PHU SA NGOT (FRESHWATER ALLUVIAL ZONE - 4 KICH BAN)
    # =========================================================================
    {
        "scenario_id": "DBSCL_01_PHUSA_CANTHO",
        "vung_sinh_thai": "Vùng phù sa ngọt (Nội đồng sông Hậu)",
        "thang_quan_trac": "Tháng 3 (Cuối vụ Đông Xuân - Chuẩn bị vụ Xuân Hè)",
        "input_farmer": {
            "lat": 10.062,
            "lon": 105.558,
            "tinh_thanh": "Cần Thơ (Huyện Thới Lai)",
            "cay_dang_trong": "Lúa OM18 (Vừa thu hoạch vụ Đông Xuân, thâm canh 3 vụ lúa/năm)",
            "phan_bon_dang_dung": "Urê (46% N), DAP (18-46-0), Kali đỏ (KCl) liều cao liên tục",
            "thuoc_tru_sau_dang_dung": "Thuốc trừ cỏ Quinclorac + Pretilachlor, thuốc sâu Abamectin",
            "muc_tieu_nong_dan": "Muốn xuống giống tiếp vụ Lúa Xuân Hè ngay nhưng lo thiếu nước bơm tưới, đất chai cứng và tốn nhiều phân bón"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.21 m3/m3 (khô mặt), sm_rootzone = 0.27 m3/m3 (Z-score = -1.1, ẩm tầng rễ trung bình thấp)",
            "ECOSTRESS_C2": "LST_Day = 35.8°C (cao hơn TB 2.4°C), ESI = 0.48 (bắt đầu thiếu hụt bốc hơi)",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 12 mm (SPI-1 = -1.3, khô hạn ngắn hạn), dự báo 10 ngày tới không mưa",
            "Landsat89_MODIS": "NDVI giảm từ 0.72 về 0.22 (vừa gặt xong), BSI = +0.18 (đất trống phơi ải), EVI đỉnh vụ trước giảm 8% so với 3 năm trước",
            "NASA_POWER_AG": "T2M_MAX = 35.5°C, RH2M = 58%, VPD = 2.15 kPa (khí quyển hanh khô), Bức xạ = 21.4 MJ/m2/ngày",
            "GRACE_FO_CRI": "lwe_thickness = -8.5 cm (trữ lượng nước ngọt toàn vùng đang rút xuống mùa khô)",
            "SRTM_NASADEM": "Độ cao = 1.4 m, HAND = 1.1 m (bình địa phù sa trong đê bao)",
            "SoilGrids_250m": "Đất phù sa ngọt (Fluvisols), Clay = 48%, pH_H2O = 5.3 (hơi chua do bón đạm lâu năm), SOC = 1.6%"
        },
        "ai_diagnosis_simple": "Bà con ơi, vệ tinh NASA báo đất mặt ruộng mình đang khô và nóng (gần 36°C), nước ngọt trong kênh rạch toàn vùng đang rút thấp nhưng lớp đất sâu dưới rễ vẫn còn giữ được độ ẩm khá tốt. Nếu sạ lúa ngay lúc này sẽ rất tốn tiền dầu bơm nước và phân Urê dễ bốc hơi mất hết 40%; nhưng nếu chuyển sang tỉa đậu xanh hoặc mè ngay trong tuần này thì hãy cẩn thận vì thuốc cỏ Quinclorac phun ở vụ lúa trước vẫn còn nằm trong đất khô, dễ làm quăn lá cây đậu non!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Bơm nước sạ tiếp Lúa vụ 2 - Xuân Hè)",
                "ly_do_de_xuat": "Phù hợp nếu nông dân đã chuẩn bị sẵn giống lúa OM18 và muốn duy trì thói quen canh tác 3 vụ lúa.",
                "bang_chung_ve_tinh_tho_nhuong": "Địa hình bằng phẳng (NASADEM HAND = 1.1 m) có đê bao giữ nước, bức xạ mặt trời NASA POWER cao (21.4 MJ/m2/ngày) thuận lợi cho lúa quang hợp nếu đủ nước.",
                "loi_ich_du_kien": "Không phải thay đổi công cụ gieo sạ và đầu ra thương lái thu mua lúa quen thuộc.",
                "khoang_trong_thong_tin": "Vệ tinh không thấy được mực nước thực tế trong kênh nội đồng sát ruộng và chi phí tiền dầu/điện bơm nước của hộ gia đình.",
                "rui_ro_can_kiem_tra": "Nắng nóng (LST = 35.8°C, VPD = 2.15 kPa) làm bốc hơi nước cực nhanh, gây ngộ độc hữu cơ (thối rễ lúa) do rơm rạ vụ Đông Xuân phân hủy yếm khí và phát sinh dịch rầy nâu, cỏ lúa lộn."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Luân canh cải tạo đất & cố định đạm (Lúa Đông Xuân -> Đậu nành / Đậu xanh 70 ngày -> Lúa Thu Đông)",
                "ly_do_de_xuat": "Phá vỡ thế độc canh 3 vụ lúa, tận dụng vi khuẩn nốt sần họ đậu để bồi hoàn đạm tự nhiên và nâng pH đất đang bị chua hóa (pH = 5.3).",
                "bang_chung_ve_tinh_tho_nhuong": "SMAP ghi nhận ẩm tầng rễ (sm_rootzone = 0.27 m3/m3) đủ nuôi bộ rễ cọc của cây đậu mà không cần bơm ngập nước như lúa; EVI vụ trước suy giảm báo hiệu đất đang mỏi mệt.",
                "loi_ich_du_kien": "Tiết kiệm 65% lượng nước tưới, rễ đậu để lại 50–70 kg đạm tự nhiên/ha giúp vụ lúa kế tiếp giảm 30–40% phân Urê và cắt đứt vòng đời sâu cuốn lá, rầy nâu.",
                "khoang_trong_thong_tin": "Vệ tinh không đo được nồng độ tồn dư hóa chất thuốc trừ cỏ Quinclorac/Pretilachlor còn bám trong keo sét tầng mặt 0–10 cm.",
                "rui_ro_can_kiem_tra": "Bắt buộc hỏi lại ngày phun thuốc cỏ cuối cùng: Cần cày phơi ải 10–14 ngày kết hợp bón 40 kg vôi + nấm Trichoderma để phân hủy hết Quinclorac trước khi xuống giống đậu, tránh hiện tượng xoăn đọt và thui rễ cọc."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Luân canh tiết kiệm nước & thích ứng BĐKH (Trồng Mè/Vừng chịu hạn hoặc Bắp sinh khối phủ rơm)",
                "ly_do_de_xuat": "Thích ứng tối ưu với cảnh báo thiếu hụt nước ngọt mùa khô (GRACE = -8.5 cm) và không khí hanh khô (VPD = 2.15 kPa).",
                "bang_chung_ve_tinh_tho_nhuong": "GPM báo mưa tháng chỉ đạt 12 mm và ECOSTRESS LST cao (35.8°C), rất phù hợp với cây Mè (Vừng) ưa nắng ấm và cực kỳ tiết kiệm nước trên nền đất phù sa.",
                "loi_ich_du_kien": "Tiết kiệm tới 75–80% nước tưới so với lúa; dùng rơm vụ Đông Xuân tủ gốc giúp hạ nhiệt độ mặt đất 4–5°C và giữ ẩm tầng mặt SMAP.",
                "khoang_trong_thong_tin": "Vệ tinh không biết được khả năng thoát nước cục bộ của rãnh thoát nước quanh ruộng nếu có mưa trái mùa.",
                "rui_ro_can_kiem_tra": "Cây mè rất sợ ngập úng cục bộ; cán bộ khuyến nông cần hướng dẫn nông dân xẻ rãnh thoát nước sâu 25 cm quanh ruộng phòng trường hợp có mưa dông chuyển mùa tháng 5."
            }
        }
    },
    {
        "scenario_id": "DBSCL_02_PHUSA_ANGIANG",
        "vung_sinh_thai": "Vùng phù sa ngọt (Cù lao sông Tiền - sông Hậu)",
        "thang_quan_trac": "Tháng 4 (Cao điểm nắng nóng mùa khô)",
        "input_farmer": {
            "lat": 10.538,
            "lon": 105.402,
            "tinh_thanh": "An Giang (Huyện Chợ Mới)",
            "cay_dang_trong": "Ớt chỉ thiên & Dưa hấu chuyên canh (Trồng liên tục 3 vụ màu/năm)",
            "phan_bon_dang_dung": "NPK 16-16-16 liều cao, Kali đỏ (KCl), phân bón lá kích bông",
            "thuoc_tru_sau_dang_dung": "Thuốc nấm gốc Đồng (Copper Hydroxide), Mancozeb, thuốc trị bọ trĩ Imidacloprid",
            "muc_tieu_nong_dan": "Cây ớt đang rụng bông do nắng gắt và xuất hiện bệnh héo xanh chết cây; muốn tìm cách cứu vụ hiện tại và chọn cây vụ tới"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.18 m3/m3 (rất khô), sm_rootzone = 0.24 m3/m3",
            "ECOSTRESS_C2": "LST_Day = 38.2°C (điểm nóng nhiệt cấp lô ruộng 70m), ESI = 0.38 (cây bị căng thẳng bốc hơi nặng)",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 8 mm, dự báo 7 ngày tới có 1 đợt mưa dông chuyển mùa ~35 mm",
            "Landsat89_MODIS": "NDVI = 0.42 (tán cây thưa dần ở giữa ruộng), MODIS LST biên độ nhiệt ngày-đêm = 13.5°C (đất mất khả năng điều hòa nhiệt)",
            "NASA_POWER_AG": "T2M_MAX = 36.8°C (5 ngày liên tiếp > 36°C), VPD = 2.45 kPa (khô hạn khí quyển gay gắt)",
            "GRACE_FO_CRI": "lwe_thickness = -6.2 cm (mực nước ngầm và sông rạch hạ thấp)",
            "SRTM_NASADEM": "Độ cao = 2.6 m, HAND = 1.9 m (đất bãi bồi cao ven sông, thoát nước nhanh)",
            "SoilGrids_250m": "Đất phù sa pha cát (Silt Loam), Sand = 32%, pH_H2O = 5.1, ECe tăng nhẹ do tích muối phân hóa học"
        },
        "ai_diagnosis_simple": "Vệ tinh ECOSTRESS phát hiện ruộng ớt của bà con đang bị 'sốt nhiệt' lên tới hơn 38°C vào buổi trưa và không khí cực kỳ hanh khô, làm cây đóng khí khổng không hút được dinh dưỡng dẫn đến rụng bông hàng loạt. Đặc biệt, việc phun thuốc gốc Đồng cùng phân bón lá lúc trời nắng gắt đang làm cháy táp mô lá, còn bón quá nhiều NPK hóa học lâu ngày đã diệt hết vi sinh vật có lợi, khiến vi khuẩn héo xanh dễ tấn công bộ rễ!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Tiếp tục trồng chuyên canh Ớt/Rau màu và tăng thuốc hóa học)",
                "ly_do_de_xuat": "Đất bãi bồi cao (HAND = 1.9 m) không bị ngập và nông dân đã có sẵn hệ thống tưới rãnh/béc phun.",
                "bang_chung_ve_tinh_tho_nhuong": "Vị trí gần nguồn nước ngọt sông Tiền và bức xạ mặt trời dồi dào cho cây ăn quả ngắn ngày.",
                "loi_ich_du_kien": "Thu tiền mặt nhanh nếu giá ớt và dưa hấu ngoài thị trường đang ở mức cao.",
                "khoang_trong_thong_tin": "Vệ tinh không nhìn thấy mật độ vi khuẩn Ralstonia solanacearum (gây héo xanh) và tuyến trùng đang tích tụ trong đất.",
                "rui_ro_can_kiem_tra": "Tích tụ kim loại Đồng (Cu) và Mancozeb làm đất chai cứng, mặn hóa thứ cấp; nguy cơ chết cây hàng loạt từ 30–60% diện tích khi có mưa dông chuyển mùa GPM (~35 mm) làm hầm nhiệt mặt liếp."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Luân canh cải tạo đất & cố định đạm (Trồng Bắp ngọt xen Đậu xanh / Đậu phộng hoặc Cây phân xanh)",
                "ly_do_de_xuat": "Khác họ thực vật với ớt/dưa hấu (họ Cà/Bầu bí) giúp cắt đứt nguồn thức ăn của tuyến trùng và nấm bệnh trong đất cạn.",
                "bang_chung_ve_tinh_tho_nhuong": "Đất pha cát (Sand = 32%, HAND = 1.9 m) thoát nước tốt kết hợp ẩm tầng rễ SMAP (0.24 m3/m3) rất hợp với bộ rễ đậu phộng/đậu xanh và bắp.",
                "loi_ich_du_kien": "Thân lá bắp và đậu tạo sinh khối lớn che phủ mặt đất, kéo nhiệt độ mặt đất ECOSTRESS LST giảm 4–5°C, bổ sung hữu cơ và phục hồi hệ nấm đối kháng Trichoderma.",
                "khoang_trong_thong_tin": "Chưa rõ độ chua thực tế tại rãnh luống và hàm lượng muối tồn dư (EC) do bón NPK liều cao nhiều vụ.",
                "rui_ro_can_kiem_tra": "Cần ngưng phun thuốc gốc Đồng ít nhất 3 tuần trước khi thả giống nấm vi sinh Trichoderma và vi khuẩn nốt sần Rhizobium, nếu không thuốc Đồng tồn dư sẽ diệt chết vi sinh vật vừa bón."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Luân canh tiết kiệm nước & rửa đất (Đưa 1 vụ Lúa nước ngắn ngày vào mùa mưa kế tiếp + Tưới nhỏ giọt tủ màng sinh học)",
                "ly_do_de_xuat": "Sử dụng chính nước mưa mùa mưa tới để ngâm đất trồng 1 vụ lúa nhằm 'rửa mặn phân bón' và diệt sạch vi khuẩn héo xanh hiếu khí.",
                "bang_chung_ve_tinh_tho_nhuong": "Biên độ nhiệt MODIS cao (13.5°C) và ESI thấp (0.38) cho thấy đất mặt đang bị kiệt ẩm và tích muối; ngâm nước trồng lúa 90 ngày vào mùa mưa GPM là cách khử trùng đất tự nhiên hiệu quả nhất.",
                "loi_ich_du_kien": "Giải độc hoàn toàn hóa chất tồn dư, diệt 90% mầm bệnh héo xanh và cỏ dại cạn mà không tốn tiền mua thuốc khử trùng đất; trong vụ hiện tại chuyển sang phun Canxi-Bo + Amino chiều mát để giữ bông.",
                "khoang_trong_thong_tin": "Vệ tinh không xác định được bờ bao hiện tại của rẫy màu có giữ được nước ngập 5–10 cm để trồng lúa hay không.",
                "rui_ro_can_kiem_tra": "Nông dân cần kiểm tra lại cao trình bờ bao và gia cố rãnh thoát để giữ nước mưa khi chuyển từ rẫy màu sang ruộng lúa."
            }
        }
    },
    {
        "scenario_id": "DBSCL_03_PHUSA_TIENGIANG",
        "vung_sinh_thai": "Vùng phù sa ngọt ven sông Tiền (Nhạy cảm xâm nhập mặn mùa khô)",
        "thang_quan_trac": "Tháng 2 (Cao điểm mùa khô - Giai đoạn cây ăn trái mang bông/trái non)",
        "input_farmer": {
            "lat": 10.385,
            "lon": 106.115,
            "tinh_thanh": "Tiền Giang (Thị xã Cai Lậy)",
            "cay_dang_trong": "Sầu riêng Ri6 & Monthong (8 năm tuổi, đang mang bông và trái non)",
            "phan_bon_dang_dung": "NPK 12-12-17, Lân tạo mầm liều cao, phân bón lá kích đọt/nuôi trái",
            "thuoc_tru_sau_dang_dung": "Paclobutrazol (xử lý ra hoa nghịch vụ tưới gốc), thuốc trừ sâu rầy dạng nhũ dầu (EC)",
            "muc_tieu_nong_dan": "Giữ trái non không bị rụng hàng loạt khi trời nắng gắt, lá sầu riêng đang có hiện tượng cháy chóp lá"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.23 m3/m3, sm_rootzone = 0.28 m3/m3 (đang giảm nhanh suốt 3 tuần qua)",
            "ECOSTRESS_C2": "LST_Day = 36.4°C trên vườn (cao hơn 3.1°C so với vườn có thảm cỏ che phủ), ESI = 0.41 (cây bị stress nước rõ rệt)",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 4 mm (hạn kiệt mùa khô), SPI-3 = -1.65",
            "Landsat89_MODIS": "EVI = 0.46 (giảm từ 0.58 xuống 0.46 trong 1 tháng - dấu hiệu rụng lá/cháy chóp lá), MNDWI mương vườn thu hẹp",
            "NASA_POWER_AG": "T2M_MAX = 35.9°C, RH2M = 54%, VPD = 2.30 kPa (áp lực bốc hơi nước qua lá rất cao)",
            "GRACE_FO_CRI": "lwe_thickness = -12.4 cm (thiếu hụt nước ngọt nghiêm trọng trên lưu vực, ranh mặn 1 g/L áp sát cửa sông)",
            "SRTM_NASADEM": "Độ cao mô liếp = 1.8 m, HAND = 1.3 m",
            "SoilGrids_250m": "Đất phù sa cổ lên liếp, Clay = 52%, pH_H2O = 4.6 (đất mô liếp bị chua hóa nặng), SOC = 1.4%"
        },
        "ai_diagnosis_simple": "Cảnh báo khẩn cho vườn sầu riêng của bà con: Vệ tinh GRACE và ECOSTRESS cho thấy nguồn nước ngọt toàn vùng đang cạn mạnh, mặt liếp vườn đang quá nóng (trên 36°C) và cây đang bị 'khát nước ngầm' dù bà con vẫn tưới! Nguyên nhân là chất xử lý ra hoa Paclobutrazol tồn dư trong đất chua (pH 4.6) đã làm cùn rễ cám khiến cây không hút nổi nước, cộng thêm việc xịt thuốc sâu dạng nhũ dầu (EC) lúc trời hanh khô đang làm nóng bông và gây rụng trái non hàng loạt!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Để mặt liếp đất trống, tiếp tục dùng Paclobutrazol và phun thuốc EC/NPK bình thường)",
                "ly_do_de_xuat": "Kỹ thuật xử lý ra hoa đồng loạt bằng Paclobutrazol và làm sạch cỏ mặt liếp vốn rất phổ biến tại Cai Lậy.",
                "bang_chung_ve_tinh_tho_nhuong": "Đất liếp cao (1.8 m) giúp dễ siết nước làm khô hạn nhân tạo để ép cây phân hóa mầm hoa.",
                "loi_ich_du_kien": "Cây ra bông tập trung, dễ xử lý rải vụ bán giá cao nếu thời tiết ôn hòa.",
                "khoang_trong_thong_tin": "Vệ tinh không đo được trực tiếp độ mặn (phần ngàn) của nước trong mương vườn đã đắp đập trữ ngọt hay chưa.",
                "rui_ro_can_kiem_tra": "Paclobutrazol lưu tồn 1–3 năm làm chai đất, suy kiệt cây; nếu nước tưới chớm nhiễm mặn > 0.5‰ kết hợp VPD = 2.30 kPa sẽ gây cháy lá rụng sạch trái và chết nhánh."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Xen canh thảm che phủ cố định đạm (Trồng Cỏ lạc dại / Đậu phộng / Đậu xanh phủ mặt liếp + Giải độc đất)",
                "ly_do_de_xuat": "Trồng thảm cây họ đậu phủ kín mặt liếp sầu riêng thay vì cạo trọc đất, kết hợp bón vôi Dolomite + humic + vi sinh để nâng pH và phân giải tồn dư Paclobutrazol.",
                "bang_chung_ve_tinh_tho_nhuong": "ECOSTRESS chứng minh các vườn có thảm thực vật che phủ mặt liếp có nhiệt độ LST thấp hơn 3–5°C và chỉ số ESI cao hơn 25% so với liếp đất trống; SoilGrids báo pH = 4.6 rất cần cải tạo.",
                "loi_ich_du_kien": "Cỏ lạc/đậu xanh giữ ẩm tầng mặt, cố định đạm tự nhiên, tạo môi trường cho giun đất và nấm rễ Mycorrhiza phát triển giúp rễ tơ sầu riêng phục hồi mạnh.",
                "khoang_trong_thong_tin": "Vệ tinh không thấy được độ dày lớp bùn/hữu cơ hiện có trên mô trồng sầu riêng.",
                "rui_ro_can_kiem_tra": "Vào giai đoạn cần siết nước 15–20 ngày để làm bông vụ sau, nông dân cần phát thấp thảm cỏ đậu và phủ lại làm lớp tủ gốc để không cạnh tranh ẩm."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Thích ứng hạn mặn & Sốc nhiệt (Trữ ngọt mương vườn phủ lục bình + Tưới phun sương dưới tán + Đổi thuốc EC sang SC/WG)",
                "ly_do_de_xuat": "Bảo vệ tức thời đợt bông/trái non trước áp lực khô hạn khí quyển (NASA POWER VPD = 2.30 kPa) và nguy cơ xâm nhập mặn từ sông Tiền (GRACE = -12.4 cm).",
                "bang_chung_ve_tinh_tho_nhuong": "Tín hiệu giảm nhanh của Landsat EVI (0.58 -> 0.46) và ESI (0.41) đòi hỏi can thiệp giảm bốc hơi và làm mát tiểu khí hậu vườn ngay lập tức.",
                "loi_ich_du_kien": "Đổi thuốc nhũ dầu (EC) sang dạng mát cây (SC, WG) phun sau 16h30 kèm Amino + Canxi-Bo giúp giảm 50% tỷ lệ rụng trái non; thả lục bình trong mương giảm 40% bốc hơi nước ngọt dự trữ.",
                "khoang_trong_thong_tin": "Bắt buộc có bút đo độ mặn tại chỗ vì vệ tinh không đo được độ mặn dưới 1.0‰ trong mương nhỏ.",
                "rui_ro_can_kiem_tra": "Khuyến nông và nông dân phải đo độ mặn nước mương trước mỗi lần bơm tưới (tuyệt đối không tưới cho sầu riêng nếu độ mặn > 0.3–0.5‰) và tỉa bớt 20–30% số trái non nếu nước ngọt dự trữ không đủ dùng hết tháng 4."
            }
        }
    },
    {
        "scenario_id": "DBSCL_04_PHUSA_VINHLONG",
        "vung_sinh_thai": "Vùng phù sa ngọt chuyên canh màu trên đất ruộng",
        "thang_quan_trac": "Tháng 8 (Đầu mùa mưa lớn / Mùa lũ kết hợp mưa dông)",
        "input_farmer": {
            "lat": 10.095,
            "lon": 105.762,
            "tinh_thanh": "Vĩnh Long (Huyện Bình Tân)",
            "cay_dang_trong": "Khoai lang tím Nhật & Hành lá (Vừa thu hoạch sau 2 vụ màu liên tiếp)",
            "phan_bon_dang_dung": "Urê, DAP, NPK 20-20-15 liều rất cao",
            "thuoc_tru_sau_dang_dung": "Thuốc trừ sùng khoai (Diazinon / Chlorpyrifos), thuốc nấm Metalaxyl + Mancozeb",
            "muc_tieu_nong_dan": "Muốn lên luống trồng tiếp vụ Khoai lang thứ 3 trong năm nhưng đất nhiều sùng hà và mưa lớn liên tục"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.41 m3/m3 (bão hòa nước), sm_wetness = 0.89 (đất ngậm no nước)",
            "ECOSTRESS_C2": "LST_Day = 29.1°C (mát do ẩm cao), ESI = 0.82",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 285 mm, xuất hiện 3 trận mưa cực đoan > 65 mm/ngày trong 2 tuần qua",
            "Landsat89_MODIS": "BSI = -0.12, MNDWI = +0.18 (nhiều ô ruộng trũng quanh vùng bắt đầu đọng nước ngập)",
            "NASA_POWER_AG": "T2M_MAX = 31.2°C, RH2M = 86% (độ ẩm không khí rất cao), Bức xạ giảm còn 14.5 MJ/m2/ngày do mây mưa",
            "GRACE_FO_CRI": "lwe_thickness = +11.8 cm (nước lũ thượng nguồn và mưa nội đồng làm dâng cao mực nước thủy văn)",
            "SRTM_NASADEM": "Độ cao = 1.1 m, HAND = 0.7 m (vùng bình địa thấp, tiêu thoát nước chậm khi triều cường dâng)",
            "SoilGrids_250m": "Đất phù sa sét pha thịt (Clay Loam), Clay = 44%, pH_H2O = 5.4, tầng đế cày bị nén chặt"
        },
        "ai_diagnosis_simple": "Vệ tinh GPM và SMAP báo động đất ruộng Bình Tân của bà con hiện đã ngậm no nước (gần 90% bão hòa) và sắp tới còn nhiều đợt mưa dông rất to trên 60 mm làm nước rút không kịp. Nếu bà con cố lên luống trồng tiếp khoai lang và rải phân Urê/NPK lúc này, mưa lớn sẽ rửa trôi mất 70% phân bón, củ khoai bị thối nhũn, còn thuốc trị sùng tồn dư trong đất ngập nước sẽ gây ô nhiễm nặng nguồn nước mương mà không diệt hết được ổ sùng cũ!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Tiếp tục lên luống trồng Khoai lang vụ 3 trong mùa mưa lũ)",
                "ly_do_de_xuat": "Nông dân kỳ vọng vụ khoai nghịch mùa mưa sẽ bán được giá cao hơn chính vụ.",
                "bang_chung_ve_tinh_tho_nhuong": "Đất phù sa Bình Tân vốn màu mỡ (Clay = 44%), giữ dinh dưỡng tốt.",
                "loi_ich_du_kien": "Duy trì chuỗi cung ứng khoai lang thương phẩm nếu tự chủ hoàn toàn được trạm bơm tiêu úng.",
                "khoang_trong_thong_tin": "Vệ tinh không thấy được công suất máy bơm tát nước của từng hộ và mật độ ấu trùng bọ hà (sùng khoai) trong đất.",
                "rui_ro_can_kiem_tra": "Khi sm_wetness = 0.89 và HAND = 0.7 m, chỉ cần 1 trận mưa GPM > 60 mm trùng kỳ triều cường sẽ làm ngập rãnh luống, gây thối dây khoai và sùng hà đục hỏng > 50% củ."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Luân canh cải tạo đất & cắt cầu nối dịch hại (Chuyển sang trồng 1 vụ Lúa nước Thu Đông kết hợp thả vịt/cá ruộng)",
                "ly_do_de_xuat": "Đưa nước vào ngâm ruộng trồng 1 vụ lúa nước để làm chết ngạt 100% nhộng và ấu trùng sùng khoai lang (Cylas formicarius) cùng nấm thối củ trong đất.",
                "bang_chung_ve_tinh_tho_nhuong": "Tín hiệu GRACE (+11.8 cm), GPM mưa lớn (285 mm/tháng) và Landsat MNDWI (+0.18) hoàn toàn thuận lợi cho lúa nước phát triển tự nhiên không tốn nước tưới.",
                "loi_ich_du_kien": "Cây lúa hút hết lượng phân Lân và NPK tồn dư từ 2 vụ khoai trước (hầu như không cần bón thêm DAP), diệt sạch sùng khoai mà không tốn một giọt thuốc trừ sâu hóa học nào.",
                "khoang_trong_thong_tin": "Vệ tinh không biết ruộng đã cày san phẳng lại mặt luống khoai hay chưa.",
                "rui_ro_can_kiem_tra": "Do đất còn dư nhiều phân đạm/lân từ vụ khoai, nếu sạ lúa dày quá sẽ dễ bị lốp lá và nhiễm bệnh đạo ôn khi trời âm u (bức xạ giảm còn 14.5 MJ/m2/ngày); cần sạ thưa (80–100 kg/ha) và không bón thừa Urê."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Thích ứng ngập úng & Cải tạo sinh học (Trồng Đậu tương rau / Đậu xanh trên liếp cao phủ màng hoặc Xả lũ đón phù sa ngắn hạn)",
                "ly_do_de_xuat": "Nếu ở gò cao thoát nước được thì trồng đậu tương rau 65 ngày có rãnh sâu; nếu ở chân ruộng trũng thì mở cống đón nước phù sa ngâm đất 1.5 tháng trước khi làm vụ Khoai Đông Xuân.",
                "bang_chung_ve_tinh_tho_nhuong": "Dữ liệu SRTM/NASADEM giúp phân tách các gò cao (> 1.3 m) trồng được đậu với vùng trũng (< 1.0 m) nên xả lũ rửa đất.",
                "loi_ich_du_kien": "Phục hồi hoàn toàn cấu trúc đất bị nén chặt, rửa trôi độc chất thuốc trừ sâu gốc Lân hữu cơ/Cúc và chuẩn bị nền đất sạch bệnh cho vụ Khoai lang Đông Xuân trúng giá.",
                "khoang_trong_thong_tin": "Cần kiểm tra lịch đóng/mở cống ngăn lũ của tiểu vùng thủy lợi địa phương.",
                "rui_ro_can_kiem_tra": "Nếu chọn trồng đậu trên liếp cao vào tháng 8, bắt buộc chia nhỏ lượng phân bón và phủ rơm/màng phủ để tránh mưa GPM rửa trôi phân."
            }
        }
    },

    # =========================================================================
    # NHOM B: VUNG DAT PHEN (ACID SULFATE SOIL ZONE - 4 KICH BAN)
    # =========================================================================
    {
        "scenario_id": "DBSCL_05_DATPHEN_LONGAN",
        "vung_sinh_thai": "Vùng đất phèn Đồng Tháp Mười",
        "thang_quan_trac": "Tháng 5 (Chuyển giao từ mùa khô sang mưa đầu mùa - Đầu vụ Hè Thu)",
        "input_farmer": {
            "lat": 10.612,
            "lon": 105.955,
            "tinh_thanh": "Long An (Huyện Tân Thạnh)",
            "cay_dang_trong": "Lúa OM5451 (Mới gieo sạ 15 ngày tuổi sau khi phơi ruộng khô mùa nắng)",
            "phan_bon_dang_dung": "Đang chuẩn bị rải Urê + DAP đợt 1 (Ít bón vôi đầu vụ)",
            "thuoc_tru_sau_dang_dung": "Thuốc trừ cỏ hậu nảy mầm Bispyribac-sodium, thuốc diệt ốc Niclosamide",
            "muc_tieu_nong_dan": "Lúa con đang bị vàng đọt, rễ đen thui không đẻ nhánh sau mấy đám mưa đầu mùa; muốn cứu lúa và tính hướng luân canh bền vững"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "Tháng trước sm_rootzone = 0.16 m3/m3 (phơi ruộng quá khô làm oxy hóa tầng phèn), hiện tại tăng vọt lên 0.36 m3/m3 sau mưa",
            "ECOSTRESS_C2": "LST_Day tháng trước đạt 37.5°C, hiện tại ESI = 0.44 (lúa non bị ức chế hút nước do ngộ độc phèn)",
            "GPM_IMERG_V07": "Mưa 10 ngày đầu tháng 5 đạt 95 mm (mưa dông đầu mùa sau 3 tháng khô hạn)",
            "Landsat89_MODIS": "NDVI = 0.24 (tăng trưởng cực chậm so với chuẩn lúa 15 ngày tuổi là 0.35), BSI trước vụ rất cao (+0.24)",
            "NASA_POWER_AG": "T2M_MAX = 34.5°C, RH2M = 76%, Bức xạ = 18.8 MJ/m2/ngày",
            "GRACE_FO_CRI": "lwe_thickness = -5.8 cm (mực nước kênh nội đồng còn thấp, phèn từ bờ kênh rỉ ra)",
            "SRTM_NASADEM": "Độ cao = 0.9 m, HAND = 0.5 m (vùng trũng phèn Đồng Tháp Mười, khó tiêu thoát nước đáy)",
            "SoilGrids_250m": "Đất phèn hoạt động (Thionic Fluvisols), pH_H2O = 3.9 (rất chua), hàm lượng sắt/nhôm di động (Fe2+, Al3+) rất cao"
        },
        "ai_diagnosis_simple": "Bà con ơi, vệ tinh SMAP và dữ liệu đất cho thấy trong mùa nắng vừa qua ruộng mình bị phơi quá khô làm tầng phèn dưới sâu bị 'cháy' (oxy hóa), nên khi gặp 95 mm mưa đầu mùa tuần rồi, phèn sắt và phèn nhôm đã xì mạnh lên mặt ruộng làm bó đen rễ lúa! Lúc này bà con tuyệt đối khoan rải phân Urê và DAP cũng như ngưng xịt thuốc cỏ Bispyribac-sodium, vì trong nước phèn chua (pH dưới 4.0) phân DAP sẽ bị phèn khóa chặt không tan được, còn thuốc cỏ sẽ làm lúa ngộ độc chết chòm!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Tiếp tục rải thúc Urê + DAP và phun thuốc cỏ để ép lúa lên)",
                "ly_do_de_xuat": "Nông dân thấy lúa vàng còi cọc thường nghĩ là do thiếu phân đạm nên muốn rải thêm Urê.",
                "bang_chung_ve_tinh_tho_nhuong": "NDVI thấp (0.24) dễ gây nhầm lẫn giữa thiếu đạm thông thường và ngộ độc phèn sắt/nhôm.",
                "loi_ich_du_kien": "Không tốn công tháo thay nước ruộng.",
                "khoang_trong_thong_tin": "Vệ tinh không nhìn thấy lớp váng phèn màu đỏ/vàng nổi trên mặt nước ruộng và màu sắc rễ lúa mới nhổ lên.",
                "rui_ro_can_kiem_tra": "Trên nền đất pH = 3.9 đang xì phèn, ion Al3+ và Fe2+ kết tủa toàn bộ lân trong DAP (mất 80% tiền phân), đồng thời thuốc cỏ hậu nảy mầm gây cháy lá và chết lúa non tới 40–50% diện tích."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Cứu lúa khẩn cấp bằng Thau chua rửa phèn + Luân canh Lúa – Mè đen / Đậu xanh trên liếp (vụ Xuân Hè năm sau)",
                "ly_do_de_xuat": "Trước mắt phải tháo cạn nước phèn trong ruộng, bơm nước mới vào ngâm vôi nung/vôi nông nghiệp (50–100 kg/ha) và bón Lân nung chảy (Văn Điển/Ninh Bình) để hạ độc phèn rồi mới bón đạm.",
                "bang_chung_ve_tinh_tho_nhuong": "SoilGrids báo pH = 3.9 và SMAP ghi nhận chu kỳ khô-ướt đột ngột (0.16 -> 0.36 m3/m3) là cơ chế điển hình kích hoạt xì phèn đầu mùa mưa.",
                "loi_ich_du_kien": "Lúa ra rễ trắng mới sau 5–7 ngày, phục hồi đẻ nhánh; về lâu dài trồng mè/đậu trên liếp giúp giữ ẩm mặt đất mùa khô, không để đất nứt nẻ sinh phèn.",
                "khoang_trong_thong_tin": "Vệ tinh không đo được độ pH của nguồn nước ngoài kênh chính hiện tại có đủ ngọt để bơm vào thay nước hay cũng đang bị chua phèn.",
                "rui_ro_can_kiem_tra": "Cần dùng giấy quỳ hoặc bút đo pH kiểm tra nước kênh trước khi bơm vào ruộng (chỉ bơm khi pH nước kênh > 5.5)."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Luân canh thích ứng vùng trũng phèn (2 vụ Lúa Đông Xuân & Hè Thu sớm -> Chuyển vụ 3 sang Trồng Sen / Nuôi cá mùa lũ)",
                "ly_do_de_xuat": "Quản lý thủy văn thuận thiên: Không phơi đất khô kiệt vào mùa nắng (giữ ẩm SMAP > 0.22) và tận dụng mùa lũ tháng 8–11 để rửa phèn tự nhiên.",
                "bang_chung_ve_tinh_tho_nhuong": "Địa hình trũng thấp (NASADEM HAND = 0.5 m, cao độ 0.9 m) tại Tân Thạnh rất thích hợp giữ nước trồng Sen lấy ngó/hạt hoặc xả lũ nuôi cá thay vì làm lúa vụ 3 bấp bênh.",
                "loi_ich_du_kien": "Cây Sen chịu phèn rất tốt, giữ mặt đất luôn ngập ẩm nên tầng sinh phèn (Pyrite) nằm yên dưới sâu không bao giờ bị oxy hóa; thu nhập từ sen cao gấp 2–3 lần lúa vụ 3.",
                "khoang_trong_thong_tin": "Chưa rõ đầu ra thu mua ngó sen/gương sen tại hợp tác xã địa phương.",
                "rui_ro_can_kiem_tra": "Cần kiểm tra bệnh thối ngó sen và chuẩn bị giống sen khỏe sạch bệnh từ trạm khuyến nông."
            }
        }
    },
    {
        "scenario_id": "DBSCL_06_DATPHEN_DONGTHAP",
        "vung_sinh_thai": "Vùng trũng ngập lũ đầu nguồn Đồng Tháp Mười",
        "thang_quan_trac": "Tháng 7 (Cuối vụ Hè Thu - Trước mùa nước nổi tháng 8–11)",
        "input_farmer": {
            "lat": 10.745,
            "lon": 105.525,
            "tinh_thanh": "Đồng Tháp (Huyện Tam Nông)",
            "cay_dang_trong": "Lúa Đài Thơm 8 (Sắp thu hoạch vụ Hè Thu, đã làm 3 vụ lúa/năm suốt 6 năm trong đê bao kín)",
            "phan_bon_dang_dung": "NPK 16-16-8, Urê, Kali đỏ (Lượng phân phải tăng 25% so với trước mới giữ được năng suất)",
            "thuoc_tru_sau_dang_dung": "Tricyclazole (trị đạo ôn), Pymetrozine + Dinotefuran (trị rầy nâu), Propiconazole",
            "muc_tieu_nong_dan": "Đắn đo giữa việc bơm tát sạ tiếp vụ Lúa Thu Đông (vụ 3) hay mở cống xả lũ nuôi thủy sản / trồng cây khác vì đất ngày càng bạc màu và sâu bệnh nhiều"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.43 m3/m3, sm_wetness = 0.92 (đất bão hòa ẩm liên tục quanh năm)",
            "ECOSTRESS_C2": "LST_Day = 29.8°C, ESI = 0.78",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 240 mm, dự báo mùa mưa lũ năm nay cao hơn trung bình nhiều năm (SPI-3 = +1.4)",
            "Landsat89_MODIS": "Chuỗi MODIS EVI 6 năm cho thấy đỉnh sinh khối vụ 3 giảm dần 12%; MNDWI vùng ngoài đê bao đã tăng lên +0.32 (nước lũ đã về)",
            "NASA_POWER_AG": "T2M_MAX = 31.5°C, RH2M = 84%, Bức xạ = 15.2 MJ/m2/ngày",
            "GRACE_FO_CRI": "lwe_thickness = +16.4 cm (trữ lượng nước lũ thượng nguồn Mê Kông đổ về rất lớn)",
            "SRTM_NASADEM": "Độ cao = 0.8 m, HAND = 0.4 m (lòng chảo trũng ngập lũ sâu tự nhiên)",
            "SoilGrids_250m": "Đất phèn tiềm tàng được phủ phù sa, pH_H2O = 4.7, thiếu hụt vi lượng Silic và Kẽm do ngăn lũ lâu năm"
        },
        "ai_diagnosis_simple": "Vệ tinh GRACE và Landsat cho thấy năm nay nước lũ từ thượng nguồn đổ về rất lớn và mặt ruộng trong đê bao của bà con đã bị suy giảm sức sống 12% sau 6 năm làm lúa 3 vụ liên tục không nghỉ! Việc đóng kín đê bao đã chặn mất lớp phù sa màu mỡ, làm đất thiếu vi lượng nên bà con phải tốn thêm 25% phân hóa học và xịt thuốc đạo ôn, rầy nâu liên miên mà lúa vẫn yếu gốc, rất dễ bị đổ ngã hoặc vỡ đê ngập úng trong vụ 3 này!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Đóng cống bơm tát sạ tiếp Lúa vụ 3 - Thu Đông)",
                "ly_do_de_xuat": "Hệ thống đê bao khép kín hiện có cho phép ngăn lũ nếu trạm bơm hoạt động 24/24.",
                "bang_chung_ve_tinh_tho_nhuong": "Nguồn nước tưới dồi dào, không lo hạn hán.",
                "loi_ich_du_kien": "Có thêm 1 vụ thu hoạch lúa hạt vào tháng 10–11 nếu thời tiết không có bão lũ cực đoan.",
                "khoang_trong_thong_tin": "Vệ tinh không kiểm tra được độ vững chắc của thân đê bao đất và chi phí tiền điện bơm tiêu úng nội đồng.",
                "rui_ro_can_kiem_tra": "Với GRACE (+16.4 cm), GPM SPI-3 (+1.4) và cao độ trũng (0.8 m), áp lực nước ngoài đê rất lớn; lúa vụ 3 thiếu nắng (bức xạ 15.2 MJ/m2) cộng với dư đạm rất dễ bùng phát dịch rầy nâu, đạo ôn cổ bông và đổ ngã ngập úng."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Luân canh phục hồi độ phì tự nhiên (2 vụ Lúa -> Mở cống Xả lũ đón phù sa kết hợp Nuôi Cá/Tôm càng xanh mùa nước nổi)",
                "ly_do_de_xuat": "Mở cống đón nước lũ sông Mê Kông tràn vào ruộng từ tháng 8 đến tháng 11 để bồi đắp phù sa tự nhiên và vệ sinh đồng ruộng.",
                "bang_chung_ve_tinh_tho_nhuong": "Landsat MNDWI (+0.32) và GRACE (+16.4 cm) khẳng định nguồn nước lũ dồi dào giàu phù sa đang ở ngay ngoài bờ kênh; chuỗi MODIS EVI suy giảm chứng tỏ đất rất cần nghỉ để nạp lại dinh dưỡng.",
                "loi_ich_du_kien": "Nhận miễn phí 3–5 tấn phù sa giàu NPK & vi lượng/ha, nước lũ rửa sạch phèn (pH từ 4.7 lên 5.8), nhấn chìm toàn bộ chuột, cỏ lồng vực, lúa ma và cắt đứt mầm bệnh đạo ôn/rầy nâu; vụ Đông Xuân kế tiếp giảm 40% phân thuốc mà năng suất tăng vọt 1–1.5 tấn/ha.",
                "khoang_trong_thong_tin": "Phụ thuộc vào quy chế vận hành cống chung của cả ô bao (không thể xả lũ 1 ruộng đơn lẻ nếu cả ô bao vẫn trồng lúa).",
                "rui_ro_can_kiem_tra": "Cần họp thống nhất trong Hợp tác xã/Tổ bơm tát để xả lũ đồng loạt theo lịch (ví dụ chu kỳ 3 năm xả lũ 1 năm) và giăng lưới đăng quầng giữ cá/tôm càng xanh."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Luân canh 2 Lúa – 1 Màu ngắn ngày (Lúa Đông Xuân -> Đậu nành/Mè vụ Xuân Hè -> Xả lũ mùa nước nổi)",
                "ly_do_de_xuat": "Thay vụ lúa Hè Thu tốn nước bằng vụ Đậu nành/Mè ngắn ngày (thu hoạch trước tháng 7), sau đó đón lũ sớm từ tháng 8.",
                "bang_chung_ve_tinh_tho_nhuong": "Tránh được hoàn toàn rủi ro lũ sớm cuối tháng 7 làm ngập lúa Hè Thu ở vùng trũng HAND = 0.4 m.",
                "loi_ich_du_kien": "Kép lợi ích: Vừa có đạm sinh học từ cây họ đậu vào mùa khô, vừa có phù sa tự nhiên vào mùa lũ, giảm 50% lượng thuốc BVTV cả năm.",
                "khoang_trong_thong_tin": "Cần xác định giống đậu nành/mè ngắn ngày (65–70 ngày) phù hợp với chân đất phèn nhẹ tại Tam Nông.",
                "rui_ro_can_kiem_tra": "Cần thu hoạch dứt điểm cây màu trước ngày 15/06 để tránh những đợt mưa dông GPM đầu mùa làm ngập rễ đậu."
            }
        }
    },
    {
        "scenario_id": "DBSCL_07_DATPHEN_HAUGIANG",
        "vung_sinh_thai": "Vùng trũng phèn nội đồng Tây sông Hậu",
        "thang_quan_trac": "Tháng 3 (Giữa mùa khô - Sau thu hoạch Lúa Đông Xuân)",
        "input_farmer": {
            "lat": 9.815,
            "lon": 105.685,
            "tinh_thanh": "Hậu Giang (Huyện Phụng Hiệp)",
            "cay_dang_trong": "Lúa RVT / Đài Thơm 8 (Vừa thu hoạch xong trên nền đất phèn trũng)",
            "phan_bon_dang_dung": "Urê, DAP, Kali đỏ (Bón theo thói quen, ít dùng Lân nung chảy và vôi)",
            "thuoc_tru_sau_dang_dung": "Thuốc trừ cỏ Butachlor, thuốc sâu Lambda-cyhalothrin, thuốc nấm Hexaconazole",
            "muc_tieu_nong_dan": "Đang tính cày lật đất sâu và phơi ruộng thật khô nứt nẻ suốt tháng 3–4 để diệt cỏ dại rồi mới làm vụ tiếp theo"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.25 m3/m3 (đang bốc hơi nhanh), sm_rootzone = 0.30 m3/m3",
            "ECOSTRESS_C2": "LST_Day = 35.2°C, ESI = 0.51",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 15 mm, mùa khô kéo dài thêm 6 tuần nữa",
            "Landsat89_MODIS": "NDVI = 0.25 (gốc rạ sau gặt), BSI đang tăng nhanh (+0.14)",
            "NASA_POWER_AG": "T2M_MAX = 35.1°C, RH2M = 62%, VPD = 1.95 kPa, Bức xạ = 20.8 MJ/m2/ngày",
            "GRACE_FO_CRI": "lwe_thickness = -9.1 cm (mực nước ngầm hạ thấp làm lộ tầng sinh phèn dưới độ sâu 40–60 cm)",
            "SRTM_NASADEM": "Độ cao = 0.7 m, HAND = 0.4 m (vùng trũng phèn Phụng Hiệp, tiêu nước kém)",
            "SoilGrids_250m": "Đất phèn tiềm tàng nông (Sulfaquepts), tầng Pyrite (FeS2) nằm ngay độ sâu 40 cm, pH_H2O = 4.1, SOC = 2.8%"
        },
        "ai_diagnosis_simple": "Cảnh báo quan trọng cho bà con ở Phụng Hiệp: Dữ liệu đất và vệ tinh GRACE cho thấy ngay dưới mặt ruộng khoảng 2 gang tay (40 cm) là tầng đất sinh phèn tiềm tàng rất nặng, và hiện nay mực nước ngầm đang tụt xuống thấp! Nếu bà con cày lật sâu và phơi ruộng khô nứt nẻ dưới nắng 35°C lúc này, không khí sẽ lọt xuống đốt cháy tầng phèn ngầm tạo ra axit sunfuric cực chua, làm vụ tới sạ cây gì cũng bị thối rễ chết hàng loạt!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên dự định (Cày sâu lật đất và phơi ải khô kiệt trong tháng 3–4 rồi sạ tiếp Lúa)",
                "ly_do_de_xuat": "Nông dân áp dụng máy móc kinh nghiệm 'cày ải phơi đất' của vùng đất phù sa ngọt sang vùng đất phèn.",
                "bang_chung_ve_tinh_tho_nhuong": "Nắng nóng NASA POWER (20.8 MJ/m2/ngày) giúp làm khô mặt đất rất nhanh.",
                "loi_ich_du_kien": "Diệt được một phần cỏ dại và ốc bươu vàng trên mặt ruộng.",
                "khoang_trong_thong_tin": "Vệ tinh không đo được độ sâu chính xác đến từng cm của vỉa phèn Pyrite (váng vàng rơm) tại từng góc ruộng.",
                "rui_ro_can_kiem_tra": "Cực kỳ nguy hiểm trên đất phèn nông (pH = 4.1): Cày sâu và phơi nứt nẻ làm oxy hóa FeS2 thành H2SO4 và Fe2+/Al3+ độc hại; do địa hình trũng (HAND = 0.4 m) không tiêu thoát được nước đáy, phèn sẽ nằm lại đầu độc ruộng suốt nhiều năm."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Canh tác che phủ giữ ẩm & cố định đạm (Bừa nông giữ rơm + Gieo Đậu xanh / Đậu nành trên nền đất ẩm không cày sâu)",
                "ly_do_de_xuat": "Trồng cây họ đậu ngắn ngày bằng kỹ thuật làm đất tối thiểu (chỉ xới nhẹ 5–10 cm mặt đất và phủ rơm rạ) để giữ độ ẩm tầng dưới luôn > 0.22 m3/m3 nhằm 'nhốt phèn' dưới sâu.",
                "bang_chung_ve_tinh_tho_nhuong": "SMAP hiện còn độ ẩm tầng rễ 0.30 m3/m3 rất lý tưởng; tán lá đậu kết hợp lớp rơm tủ giúp giảm nhiệt độ mặt đất ECOSTRESS LST không cho đất nứt nẻ.",
                "loi_ich_du_kien": "Ngăn chặn hoàn toàn quá trình oxy hóa sinh phèn, có thêm thu nhập từ 1.5–2 tấn đậu/ha, đồng thời rễ đậu cải tạo tầng đất mặt giàu đạm hữu cơ.",
                "khoang_trong_thong_tin": "Cần kiểm tra lượng thuốc trừ cỏ Butachlor đã dùng ở đầu vụ trước có còn tồn dư hay đã phân hủy hết sau 90 ngày.",
                "rui_ro_can_kiem_tra": "Do Butachlor chỉ dùng đầu vụ lúa nên cuối vụ hầu như đã phân hủy, nhưng nông dân cần bón lót 500 kg Lân nung chảy + vôi bột theo rãnh gieo hạt để rễ đậu phát triển khỏe trên nền pH = 4.1."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Lên liếp theo kiểu mương - liếp kết hợp (Trồng Khóm/Dứa Cầu Đúc hoặc Mía chịu phèn + Giữ nước mương ém phèn)",
                "ly_do_de_xuat": "Nếu vùng đất phèn quá nặng và thiếu nước ngọt tưới lúa mùa khô, chuyển sang mô hình cây trồng chịu phèn đặc sản (Khóm/Dứa) hoặc Lúa – Cá.",
                "bang_chung_ve_tinh_tho_nhuong": "SoilGrids pH = 4.1 và địa hình trũng 0.7 m rất phù hợp với sinh thái cây Khóm (ưa đất chua pH 4.0–5.0 và chịu hạn cực tốt khi VPD cao).",
                "loi_ich_du_kien": "Tiết kiệm 80% nước tưới mùa khô, mực nước giữ ổn định trong mương giúp ém tầng phèn dưới sâu không xì lên, hiệu quả kinh tế bền vững.",
                "khoang_trong_thong_tin": "Vệ tinh không biết vốn đầu tư ban đầu của nông dân và quy hoạch chuyển đổi đất lúa của xã.",
                "rui_ro_can_kiem_tra": "Khi đào mương lên liếp lần đầu trên đất phèn, tuyệt đối không đưa lớp đất phèn đen dưới đáy mương đắp lên mặt liếp trồng cây mà phải rửa phèn kỹ qua 1 mùa mưa."
            }
        }
    },
    {
        "scenario_id": "DBSCL_08_DATPHEN_KIENGIANG",
        "vung_sinh_thai": "Vùng đất phèn ven biển Tứ giác Long Xuyên",
        "thang_quan_trac": "Tháng 11 (Cuối mùa mưa lũ rút - Chuẩn bị gieo sạ vụ Đông Xuân sớm)",
        "input_farmer": {
            "lat": 10.185,
            "lon": 104.925,
            "tinh_thanh": "Kiên Giang (Huyện Hòn Đất)",
            "cay_dang_trong": "Đất ruộng đang rút nước lũ chuẩn bị sạ Lúa Đông Xuân (Giống ST24 / Đài Thơm 8)",
            "phan_bon_dang_dung": "Dự kiến bón lót DAP + Urê ngay sau khi tháo cạn nước",
            "thuoc_tru_sau_dang_dung": "Thuốc diệt ốc bươu vàng Metaldehyde / Niclosamide, thuốc cỏ tiền nảy mầm Pretilachlor",
            "muc_tieu_nong_dan": "Muốn sạ lúa Đông Xuân đúng lịch để né hạn mặn cuối vụ (tháng 2–3 năm sau) và lên kế hoạch luân canh cả năm"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.42 m3/m3, sm_wetness = 0.90 (mặt ruộng đang ngập bùn nhão sau mùa mưa)",
            "ECOSTRESS_C2": "LST_Day = 28.9°C, ESI = 0.85 (không có stress nhiệt)",
            "GPM_IMERG_V07": "Mưa 30 ngày qua = 165 mm, đang giảm dần về < 20 mm/tuần (bắt đầu chuyển sang mùa khô)",
            "Landsat89_MODIS": "MNDWI giảm từ +0.35 về +0.08 (nước lũ trên đồng đang rút nhanh ra Vịnh Thái Lan)",
            "NASA_POWER_AG": "T2M_MAX = 31.8°C, RH2M = 78%, Bức xạ tăng lên 19.2 MJ/m2/ngày (nắng tốt cho vụ Đông Xuân)",
            "GRACE_FO_CRI": "lwe_thickness = +8.2 cm nhưng độ dốc 12 tháng đang giảm (-2.5 cm/năm) báo hiệu mùa khô năm tới hạn mặn sẽ đến sớm vào cuối tháng 2",
            "SRTM_NASADEM": "Độ cao = 0.8 m, HAND = 0.6 m (đồng bằng thấp ven biển Vịnh Thái Lan)",
            "SoilGrids_250m": "Đất phèn mặn tiềm tàng (Salic Fluvisols / Thionic), Clay = 50%, pH_H2O = 4.4, SOC = 2.2%"
        },
        "ai_diagnosis_simple": "Vệ tinh Landsat và GPM cho thấy nước lũ trên cánh đồng Hòn Đất đang rút rất đẹp và nắng ấm đã lên, đây là 'thời điểm vàng' để bà con vệ sinh đồng ruộng và xuống giống vụ Đông Xuân ngay! Tuy nhiên, vệ tinh GRACE dự báo mùa khô năm tới nước ngọt sẽ cạn nhanh vào cuối tháng 2, nên nếu bà con sạ trễ hoặc bón quá nhiều đạm Urê làm lúa kéo dài ngày sẽ bị nước mặn từ biển Rạch Giá - Hà Tiên tràn vào lúc lúa đang ngậm sữa, còn rải thuốc ốc Niclosamide lúc nước rút cạn dễ làm ngộ độc mầm lúa mới sạ!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Làm 3 vụ Lúa liên tục, bón lót DAP + Urê và phun thuốc ốc/cỏ ngay khi sạ)",
                "ly_do_de_xuat": "Vụ Đông Xuân có bức xạ NASA POWER tốt nhất năm (19.2 MJ/m2/ngày) và nguồn nước đầu vụ đang ngọt hoàn toàn.",
                "bang_chung_ve_tinh_tho_nhuong": "Độ ẩm đất SMAP dồi dào (0.42 m3/m3) và nước lũ vừa rửa sạch mặn/phèn bề mặt (MNDWI rút về +0.08).",
                "loi_ich_du_kien": "Vụ Đông Xuân đạt năng suất cao nếu thu hoạch kịp trước ngày 20/02.",
                "khoang_trong_thong_tin": "Vệ tinh không biết lịch đóng cống ngăn mặn vùng Tứ giác Long Xuyên và giống lúa cụ thể nông dân chọn dài bao nhiêu ngày.",
                "rui_ro_can_kiem_tra": "Nếu dùng giống dài ngày (> 105 ngày) hoặc sạ trễ sang tháng 12 sẽ dính hạn mặn cuối vụ; và tiếp tục làm vụ 2, vụ 3 bằng lúa trên nền đất pH = 4.4 ven biển sẽ gặp rủi ro thiệt hại nặng vào tháng 4–5."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Luân canh 2 Lúa – 1 Đậu/Mè (Lúa Đông Xuân sớm -> Mè đen / Đậu xanh vụ Xuân Hè -> Lúa Hè Thu muộn)",
                "ly_do_de_xuat": "Sau khi gặt lúa Đông Xuân vào tháng 2, thay vì sạ lúa Xuân Hè ngay giữa đỉnh hạn mặn tháng 3–4, chuyển sang trồng Mè hoặc Đậu xanh 65 ngày.",
                "bang_chung_ve_tinh_tho_nhuong": "Xu thế GRACE (-2.5 cm/năm) cảnh báo thiếu nước ngọt tháng 3–4, trong khi nền đất sét 50% tại Hòn Đất giữ ẩm tầng rễ SMAP rất tốt sau vụ Đông Xuân để nuôi cây mè/đậu.",
                "loi_ich_du_kien": "Né trọn vẹn đỉnh hạn mặn tháng 3–4, cố định đạm sinh học, cải tạo độ tơi xốp cho tầng đất sét nặng (Clay = 50%) và cắt đứt dịch lúa cỏ.",
                "khoang_trong_thong_tin": "Cần kiểm tra thời gian cách ly thuốc trừ cỏ Pretilachlor và khả năng lên luống thoát nước trên nền đất sét.",
                "rui_ro_can_kiem_tra": "Không dùng thuốc cỏ lưu tồn lâu ở giai đoạn giữa vụ Đông Xuân để đất sạch hóa chất khi chuyển sang trồng đậu/mè vào tháng 2."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Thích ứng khí hậu ven biển (Sạ Lúa chịu mặn ngắn ngày OM5451/ST24 + Bón Lân nung chảy & Silic + Chuyển Lúa – Tôm/Cá ở vùng sát biển)",
                "ly_do_de_xuat": "Tối ưu hóa kỹ thuật ngay từ đầu vụ Đông Xuân: Bón lót Lân nung chảy + Silic thay vì Urê để cứng cây, chống phèn mặn và rút ngắn thời gian sinh trưởng 5–7 ngày.",
                "bang_chung_ve_tinh_tho_nhuong": "Độ cao thấp (0.8 m) và pH = 4.4 đòi hỏi bộ rễ lúa phải ăn sâu trước khi mặt đất khô hạn vào cuối vụ.",
                "loi_ich_du_kien": "Thu hoạch lúa Đông Xuân an toàn trước khi mặn xâm nhập; đối với các xã sát biển (HAND < 0.5 m) có thể chuyển sang 1 vụ Lúa Đông Xuân sớm – 1 vụ Tôm nước lợ mùa khô.",
                "khoang_trong_thong_tin": "Vệ tinh không phân biệt được ruộng nằm phía trong hay phía ngoài hệ thống cống ngăn mặn ven biển Quốc lộ 80.",
                "rui_ro_can_kiem_tra": "Nông dân cần xác nhận với thủy nông xã vị trí ruộng nằm trong vùng ngọt hóa hay vùng chuyển đổi Lúa – Tôm trước khi đưa nước mặn vào."
            }
        }
    },

    # =========================================================================
    # NHOM C: VUNG VEN BIEN NHIEM MAN (COASTAL SALINE ZONE - 4 KICH BAN)
    # =========================================================================
    {
        "scenario_id": "DBSCL_09_VENBIEN_BACLIEU",
        "vung_sinh_thai": "Vùng luân canh Lúa - Tôm bán đảo Cà Mau",
        "thang_quan_trac": "Tháng 1 (Chuyển giao từ vụ Lúa mùa mưa sang vụ Tôm nước lợ mùa khô)",
        "input_farmer": {
            "lat": 9.425,
            "lon": 105.455,
            "tinh_thanh": "Bạc Liêu (Huyện Phước Long)",
            "cay_dang_trong": "Vừa thu hoạch Lúa ST25 trong vuông tôm, chuẩn bị lấy nước mặn thả Tôm sú / Tôm thẻ",
            "phan_bon_dang_dung": "Vụ lúa vừa rồi dùng NPK 20-20-15, Urê; chuẩn bị bón vôi CaCO3 cho vụ tôm",
            "thuoc_tru_sau_dang_dung": "Cách đây 3 tuần có phun thuốc trừ sâu cuốn lá Cypermethrin + Abamectin và rải thuốc ốc Niclosamide đầu vụ",
            "muc_tieu_nong_dan": "Muốn lấy nước lợ ngoài kênh vào vuông và thả tôm giống ngay tuần tới để kịp bán tôm cỡ lớn đầu mùa giá cao"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.39 m3/m3 (đất trảng ruộng còn ướt bùn sau khi gặt lúa), sm_wetness = 0.84",
            "ECOSTRESS_C2": "LST_Day = 31.4°C, ESI = 0.68",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày giảm mạnh còn 18 mm (mùa mưa đã kết thúc hoàn toàn)",
            "Landsat89_MODIS": "NDVI giảm về 0.21 (còn gốc rạ dày), MNDWI kênh rạch xung quanh tăng (+0.28), MODIS biên độ nhiệt ngày-đêm thấp (5.8°C)",
            "NASA_POWER_AG": "T2M_MAX = 32.2°C, T2M_MIN = 23.5°C, Bức xạ mặt trời cao = 19.8 MJ/m2/ngày (nắng tốt để phơi đáy vuông)",
            "GRACE_FO_CRI": "lwe_thickness = -7.4 cm (nước ngọt nội đồng rút nhanh, nước mặn 10–15‰ đã tràn vào kênh Phước Long)",
            "SRTM_NASADEM": "Độ cao = 0.6 m, HAND = 0.3 m (vùng trũng ven biển chịu tác động trực tiếp của thủy triều)",
            "SoilGrids_250m": "Đất mặn - phèn tiềm tàng (Salic/Thionic Fluvisols), Clay = 54%, SOC = 3.1% (nhiều mùn hữu cơ bùn đáy), pH_H2O = 5.6"
        },
        "ai_diagnosis_simple": "Khoan thả tôm giống ngay tuần tới bà con ơi! Vệ tinh cho thấy nền đất trảng ruộng của mình đang còn ướt bùn và rất giàu mùn sét (54% sét), nên thuốc trừ sâu Cypermethrin và Abamectin bà con xịt cách đây 3 tuần vẫn đang bám cực chặt trong lớp bùn mặt chưa phân hủy kịp! Nếu bà con lấy nước mặn vào thả tôm giống ngay bây giờ, thuốc sâu từ bùn sẽ tan ra nước và ngấm vào thức ăn đáy làm đàn tôm bị tê liệt thần kinh, mềm vỏ và chết rải rác sau 7–10 ngày thả!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên dự định (Lấy nước mặn vào vuông và thả tôm giống ngay không qua phơi đáy rửa độc)",
                "ly_do_de_xuat": "Nông dân muốn tranh thủ thời điểm nước mặn 10–15‰ vừa vào kênh để thả tôm sớm.",
                "bang_chung_ve_tinh_tho_nhuong": "Mưa GPM đã dứt (18 mm/tháng) và nhiệt độ nước MODIS ổn định thuận lợi cho tôm nước lợ.",
                "loi_ich_du_kien": "Rút ngắn thời gian chờ đợi 2 tuần nếu may mắn không bị nhiễm độc.",
                "khoang_trong_thong_tin": "Vệ tinh không đo được nồng độ phần tỷ (ppb) của hoạt chất Cypermethrin và Abamectin còn tồn lưu trong bùn đáy vuông.",
                "rui_ro_can_kiem_tra": "Cực kỳ rủi ro: Tôm là loài giáp xác nhạy cảm gấp 1,000 lần cá với nhóm Cúc tổng hợp (Cypermethrin) và Abamectin; đồng thời gốc rạ tươi ngâm nước mặn sẽ thối rữa sinh khí độc H2S và NH3 làm chết 70–100% tôm post."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Quy trình Cải tạo đáy sinh học – Quang phân hủy độc chất trước khi thả tôm (Phơi nắng 12 ngày + Vi sinh Bacillus)",
                "ly_do_de_xuat": "Tận dụng bức xạ mặt trời tự nhiên để phá hủy vòng hóa học của thuốc trừ sâu tồn dư và khoáng hóa gốc rạ thành thức ăn tự nhiên (trùng chỉ, ốc gạo) cho tôm.",
                "bang_chung_ve_tinh_tho_nhuong": "NASA POWER báo bức xạ nắng đạt 19.8 MJ/m2/ngày và không mưa (GPM = 18 mm) — điều kiện lý tưởng để phơi khô mặt trảng ruộng (từ sm_surface 0.39 về 0.22 m3/m3) giúp tia UV phân hủy Abamectin/Cypermethrin.",
                "loi_ich_du_kien": "Sau khi cắt sát rạ, phơi nắng 10–12 ngày (đến khi mặt bùn vừa rạn chân chim, không phơi quá khô tránh xì phèn), lấy nước vào ngâm vôi CaCO3 3 ngày rồi xả bỏ 1 lần và đánh men vi sinh Bacillus giúp tỷ lệ sống của tôm đạt > 85%.",
                "khoang_trong_thong_tin": "Cần kiểm tra thực tế bằng thử nghiệm sinh học (Bio-assay) trước khi thả đại trà.",
                "rui_ro_can_kiem_tra": "Bắt buộc thực hiện bước kiểm tra tại chỗ: Đặt 1 giai lưới nhỏ thả thử 50–100 con tôm giống xuống sát đáy vuông trong 48 giờ; nếu tôm bơi khỏe, búng mạnh và đạt tỷ lệ sống > 95% mới thả toàn bộ đàn giống."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Chuyển đổi sang Chu trình Lúa – Tôm Sinh thái Hữu cơ (Không hóa chất BVTV vụ lúa + Nuôi ghép Tôm – Cua – Cá kèo)",
                "ly_do_de_xuat": "Giải quyết tận gốc xung đột hóa chất giữa cây lúa và con tôm trong các chu kỳ năm tiếp theo để đạt chứng nhận Tôm - Lúa hữu cơ/ASC.",
                "bang_chung_ve_tinh_tho_nhuong": "Đất giàu mùn hữu cơ (SOC = 3.1%) và địa hình trũng ven biển (0.6 m) của Phước Long là vùng lõi lý tưởng nhất cho mô hình Tôm – Lúa sinh thái.",
                "loi_ich_du_kien": "Ở vụ lúa mùa mưa tới, chỉ dùng nấm xanh Metarhizium/Beauveria và phân hữu cơ vi sinh (nhờ bùn tôm để lại đã giảm được 50% phân bón), giúp vụ tôm kế tiếp thả giống ngay không sợ ngộ độc, giá bán tôm và gạo ST25 tăng 15–25%.",
                "khoang_trong_thong_tin": "Chưa rõ nguồn cung chế phẩm sinh học nấm xanh và liên kết bao tiêu lúa hữu cơ tại xã.",
                "rui_ro_can_kiem_tra": "Cần đắp bờ bao vuông tôm đủ cao và lót lưới ngăn cua thất thoát cũng như ngăn nước từ các ruộng lân cận có xịt thuốc hóa học tràn sang."
            }
        }
    },
    {
        "scenario_id": "DBSCL_10_VENBIEN_SOCTRANG",
        "vung_sinh_thai": "Vùng ven biển cửa sông Hậu (Chịu xâm nhập mặn gay gắt mùa khô)",
        "thang_quan_trac": "Tháng 2 (Cao điểm xâm nhập mặn - Vụ Lúa Đông Xuân muộn)",
        "input_farmer": {
            "lat": 9.495,
            "lon": 106.125,
            "tinh_thanh": "Sóc Trăng (Huyện Trần Đề)",
            "cay_dang_trong": "Lúa Đông Xuân muộn (Vụ 3 cố làm thêm, lúa đang giai đoạn làm đòng 45 ngày tuổi)",
            "phan_bon_dang_dung": "Chuẩn bị bón thúc đón đòng bằng Urê + Kali đỏ (KCl)",
            "thuoc_tru_sau_dang_dung": "Thuốc trị đạo ôn & lem lép hạt Propiconazole + Difenoconazole (dạng nhũ dầu EC)",
            "muc_tieu_nong_dan": "Lúa đang bị vàng cháy chóp lá và còi cọc do nước kênh nhiễm mặn ~2.5‰; muốn biết có nên bón phân đón đòng tiếp không và vụ sau nên trồng gì"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.19 m3/m3, sm_rootzone = 0.21 m3/m3 (Z-score = -1.8, hạn đất nghiêm trọng)",
            "ECOSTRESS_C2": "LST_Day = 37.9°C trên mặt ruộng lúa (quá nóng đối với ruộng lúa), ESI = 0.34 (lúa bị stress mặn - hạn cực nặng)",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 2 mm (hạn kiệt hoàn toàn), SPI-3 = -1.9",
            "Landsat89_MODIS": "NDVI chỉ đạt 0.38 ở tuổi 45 ngày (bình thường phải > 0.65), BSI tăng (+0.12 do lá lúa héo rũ lộ đất mặt nứt nẻ)",
            "NASA_POWER_AG": "T2M_MAX = 35.8°C, RH2M = 56%, VPD = 2.25 kPa",
            "GRACE_FO_CRI": "lwe_thickness = -14.2 cm (kỷ lục thiếu hụt nước ngọt mùa khô, nước mặn 4 g/L xâm nhập sâu 50 km)",
            "SRTM_NASADEM": "Độ cao = 0.9 m, HAND = 0.5 m (vùng ven biển cửa sông Trần Đề)",
            "SoilGrids_250m": "Đất phù sa nhiễm mặn theo mùa (Salic Fluvisols), Clay = 49%, pH_H2O = 5.8, độ dẫn điện ECe cao"
        },
        "ai_diagnosis_simple": "Cảnh báo khẩn cấp cho bà con ở Trần Đề: Vệ tinh ECOSTRESS và Landsat cho thấy trà lúa 45 ngày của mình đang bị 'khát nước và ngộ độc mặn' rất nặng (nhiệt độ ruộng vọt lên gần 38°C và độ xanh giảm một nửa)! Bà con tuyệt đối KHÔNG được rải phân Urê và Kali đỏ (KCl) lúc này vì Kali đỏ chứa nhiều gốc Clo (muối) sẽ cộng thêm mặn làm cháy khô rễ lúa ngay lập tức, đồng thời phải ngưng xịt thuốc nấm nhóm Azole dạng nhũ dầu (EC) vì sẽ làm lúa lùn nghẹt đòng không trổ thoát được!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Bón thúc Urê + Kali đỏ KCl và bơm nước kênh 2.5‰ vào cứu lúa)",
                "ly_do_de_xuat": "Nông dân tiếc công đầu tư 45 ngày đầu vụ nên cố bón phân đón đòng theo lịch.",
                "bang_chung_ve_tinh_tho_nhuong": "Không có bằng chứng vệ tinh nào ủng hộ phương án này (mọi chỉ số SMAP, ECOSTRESS, GRACE đều ở mức báo động đỏ).",
                "loi_ich_du_kien": "Không có lợi ích thực tế trong điều kiện độ mặn > 2.0‰ ở giai đoạn làm đòng.",
                "khoang_trong_thong_tin": "Vệ tinh không biết được trong vùng có giếng nước ngọt tầng nông hoặc kênh nội đồng nào còn kẹt nước ngọt < 1.0‰ hay không.",
                "rui_ro_can_kiem_tra": "Cây lúa giai đoạn làm đòng – trổ bông chỉ chịu được mặn tối đa 1.0–1.2‰; nếu bơm nước 2.5‰ kết hợp rải KCl và Urê sẽ làm tăng áp suất thẩm thấu, rút ngược nước từ trong rễ lúa ra ngoài gây cháy khô toàn bộ ruộng (mất trắng 100%)."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Cứu lúa giảm thiểu thiệt hại hiện tại + Chuyển đổi sang Luân canh 2 Lúa (Mùa mưa) – 1 Màu/Đậu hoặc Hành tím (Đông Xuân sớm)",
                "ly_do_de_xuat": "Trước mắt ngưng mọi phân bón gốc chứa muối (Urê, KCl), chỉ phun qua lá Kali Sunfat (K2SO4) + Brassinosteroid + Silic + Canxi vào chiều mát để tăng sức chịu mặn cho tế bào lúa; từ năm sau tuyệt đối cắt bỏ vụ lúa Đông Xuân muộn.",
                "bang_chung_ve_tinh_tho_nhuong": "Chuỗi dữ liệu GRACE (-14.2 cm) và GPM (mưa tháng 2 = 2 mm) cho thấy tháng 1–4 tại Trần Đề không đủ nước ngọt cho lúa, nhưng tháng 11–12 đất còn ẩm ngọt trồng được Đậu xanh, Bắp nếp hoặc Hành tím/Dưa hấu.",
                "loi_ich_du_kien": "Giữ lại được 40–60% năng suất trà lúa hiện tại nếu có nguồn nước ngọt bơm cầm chừng; từ năm sau trồng cây màu ngắn ngày thu hoạch trước Tết giúp né 100% hạn mặn tháng 2–4 và cải tạo đất.",
                "khoang_trong_thong_tin": "Cần kiểm tra ngay độ mặn nước mương nội đồng vào lúc triều kiệt (nước ròng).",
                "rui_ro_can_kiem_tra": "Nếu sau 7 ngày không tìm được nguồn nước ngọt < 1.5‰ để tưới nhấp, nông dân nên cắt lúa non làm thức ăn gia súc (bò/dê) để thu hồi một phần vốn thay vì tốn thêm tiền thuốc BVTV."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Nghỉ đất có kiểm soát mùa khô hạn mặn hoặc Chuyển sang Lúa thơm chịu mặn (ST24/ST25) – Thủy sản nước lợ",
                "ly_do_de_xuat": "Thích ứng thuận thiên dài hạn với xu thế xâm nhập mặn cửa sông Hậu.",
                "bang_chung_ve_tinh_tho_nhuong": "Địa hình thấp (0.9 m, HAND = 0.5 m) và chỉ số ESI cực thấp (0.34) vào mùa khô chứng minh việc cố trồng lúa vụ 3 gây thâm hụt kinh tế và làm mặn hóa tầng đất canh tác.",
                "loi_ich_du_kien": "Chuyển sang làm 2 vụ lúa chất lượng cao trong mùa mưa ngọt (tháng 6 – tháng 12) và nghỉ đất hoặc nuôi thủy sản/trồng cây chịu hạn mùa khô giúp tiết kiệm 100% chi phí bơm tát chống hạn.",
                "khoang_trong_thong_tin": "Quy hoạch phân vùng mặn – ngọt của hệ thống thủy lợi Long Phú – Tiếp Nhựt tại xã.",
                "rui_ro_can_kiem_tra": "Tuyệt đối không tự ý đưa nước mặn vào ruộng nuôi tôm nếu xung quanh vẫn là vùng quy hoạch chuyên lúa ngọt của xã vì sẽ làm nhiễm mặn thẩm thấu sang ruộng kế bên."
            }
        }
    },
    {
        "scenario_id": "DBSCL_11_VENBIEN_CAMAU",
        "vung_sinh_thai": "Vùng Lúa - Tôm sinh thái bán đảo Cà Mau (Chỉ dùng nước trời)",
        "thang_quan_trac": "Tháng 6 (Đầu mùa mưa - Giai đoạn rửa mặn chuẩn bị xuống giống vụ Lúa trên đất tôm)",
        "input_farmer": {
            "lat": 9.355,
            "lon": 105.095,
            "tinh_thanh": "Cà Mau (Huyện Thới Bình)",
            "cay_dang_trong": "Đang thu hoạch đợt Tôm cuối mùa khô, chuẩn bị cải tạo trảng ruộng để gieo sạ Lúa ST24",
            "phan_bon_dang_dung": "Dự kiến bón vôi nông nghiệp (CaCO3) và Lân nung chảy để rửa mặn",
            "thuoc_tru_sau_dang_dung": "Không dùng thuốc hóa học, chỉ dùng men vi sinh Bacillus và saponin diệt cá tạp",
            "muc_tieu_nong_dan": "Muốn biết lượng mưa hiện tại đã đủ rửa mặn mặt ruộng để gieo sạ lúa ngay trong tháng 6 chưa hay phải chờ thêm"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.37 m3/m3, sm_wetness = 0.78 (mặt ruộng đã bắt đầu ngấm nước mưa)",
            "ECOSTRESS_C2": "LST_Day = 30.8°C, ESI = 0.72",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày qua mới đạt 115 mm (thấp hơn ngưỡng chuẩn rửa mặn là 200 mm do ảnh hưởng El Nino làm mùa mưa đến muộn); dự báo 15 ngày tới có khoảng 60 mm mưa kèm 1 đợt hạn Bà Chằng (nắng gián đoạn 10 ngày)",
            "Landsat89_MODIS": "MNDWI = +0.22 (nước trong vuông đang được tháo bớt để phơi rửa trảng), NDVI bờ vuông = 0.45",
            "NASA_POWER_AG": "T2M_MAX = 33.4°C, RH2M = 79%, VPD = 1.45 kPa, Bức xạ = 18.5 MJ/m2/ngày",
            "GRACE_FO_CRI": "lwe_thickness = -4.2 cm (đang phục hồi chậm từ đáy mùa khô)",
            "SRTM_NASADEM": "Độ cao = 0.5 m, HAND = 0.3 m (vùng trũng bán đảo Cà Mau, không có nguồn nước ngọt từ sông Mê Kông, phụ thuộc 100% nước mưa)",
            "SoilGrids_250m": "Đất mặn - phèn tiềm tàng giàu hữu cơ (Clay = 55%, SOC = 3.5%, pH_H2O = 5.2), độ mặn trong bùn mặt sau 6 tháng nuôi tôm còn cao (~6–8‰)"
        },
        "ai_diagnosis_simple": "Bà con ở Thới Bình khoan vội gieo sạ lúa ngay trong tháng 6 này nhé! Vệ tinh mưa GPM của NASA đo được tổng lượng mưa 1 tháng qua ở vùng mình mới đạt 115 mm (chỉ mới bằng một nửa lượng nước mưa cần thiết để đẩy hết muối mặn ra khỏi lớp đất sét dày), lại sắp có đợt nắng 'hạn Bà Chằng' kéo dài gần 10 ngày. Nếu sạ lúa sớm lúc này, khi gặp nắng hạn Bà Chằng muối mặn từ dưới bùn sâu sẽ bốc ngược lên mặt ruộng làm chết rụi toàn bộ mạ non!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên dự định (Rửa mặn sơ sài 1 lần rồi gieo sạ thẳng Lúa ST24 ngay giữa tháng 6)",
                "ly_do_de_xuat": "Nông dân thấy có vài trận mưa đầu mùa nên nôn nóng xuống giống sớm.",
                "bang_chung_ve_tinh_tho_nhuong": "SMAP báo mặt đất đã ẩm (0.37 m3/m3) dễ tạo cảm giác đất đã ngọt hóa.",
                "loi_ich_du_kien": "Thu hoạch lúa sớm vào tháng 10 nếu mưa thuận gió hòa liên tục.",
                "khoang_trong_thong_tin": "Vệ tinh không đo được độ mặn thực tế (‰) trong nước bùn vắt ra từ tầng đất 0–15 cm.",
                "rui_ro_can_kiem_tra": "Do Thới Bình không có nước ngọt sông Hậu mà chỉ trông chờ 100% nước mưa (GPM mới đạt 115 mm < ngưỡng 200 mm), muối NaCl còn tích tụ rất nhiều trong keo sét 55%; khi gặp nắng gián đoạn (hạn Bà Chằng), hiện tượng mao dẫn sẽ kéo mặn lên làm cháy rễ mạ phải sạ đi sạ lại 2–3 lần."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Quy trình Rửa mặn 3 bước bằng Vôi + Lân và Chờ đủ ngưỡng mưa GPM > 200 mm (Lùi lịch sạ/cấy sang cuối tháng 7 - đầu tháng 8)",
                "ly_do_de_xuat": "Sử dụng ion Canxi (Ca2+) trong vôi CaCO3 và thạch cao/Lân để đẩy ion Natri (Na+ gây mặn) ra khỏi keo đất sét, kết hợp hứng trọn các đợt mưa tháng 7 để xả bỏ mặn triệt để.",
                "bang_chung_ve_tinh_tho_nhuong": "Đất sét nặng (Clay = 55%) giữ muối rất chặt; cần chờ tổng mưa GPM tích lũy vượt 200–250 mm và SMAP sm_wetness > 0.85 mới rửa mặn tầng mặt về < 2.0‰.",
                "loi_ich_du_kien": "Trong 1 tháng chờ mưa, bà con gieo mạ trên nền đất ngọt hoặc khay (để cấy thay vì sạ thẳng) giúp cây mạ khỏe gấp 3 lần, chịu được mặn tới 3–4‰ và tận dụng lớp bùn hữu cơ (SOC = 3.5%) giảm 60% phân hóa học.",
                "khoang_trong_thong_tin": "Cần bút đo độ mặn và pH kiểm tra nước trên mặt trảng sau mỗi đợt mưa lớn xả cống.",
                "rui_ro_can_kiem_tra": "Chỉ xuống giống khi đo độ mặn nước đọng trên mặt trảng ruộng sau khi ngâm 2 ngày đạt dưới 1.5–2.0‰."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Xen canh Tôm càng xanh nước lợ nhạt cùng Lúa chịu mặn (Mô hình Lúa ST24/Một Bụi Đỏ + Tôm càng xanh trong mương bao)",
                "ly_do_de_xuat": "Biến thời gian chờ rửa mặn và toàn bộ mùa mưa thành vụ nuôi Tôm càng xanh kết hợp trồng lúa sinh thái.",
                "bang_chung_ve_tinh_tho_nhuong": "Địa hình trũng (NASADEM 0.5 m) và mương bao xung quanh trảng ruộng (Landsat MNDWI = +0.22) giữ nước lợ nhạt (2–6‰) cực kỳ phù hợp cho Tôm càng xanh phát triển cùng cây lúa.",
                "loi_ich_du_kien": "Tôm càng xanh ăn sâu bọ, rầy nâu và ốc trên ruộng lúa; bà con không tốn một đồng thuốc BVTV nào (hiện đang dùng Bacillus rất chuẩn), cuối năm thu hoạch kép cả lúa sạch lẫn tôm càng xanh thương phẩm.",
                "khoang_trong_thong_tin": "Độ sâu của mương bao quanh trảng ruộng (cần sâu tối thiểu 1.0–1.2 m để tôm trú ẩn khi tháo nước rửa mặn mặt trảng).",
                "rui_ro_can_kiem_tra": "Tuyệt đối không dùng saponin liều cao sát ngày xuống giống lúa và phải giữ mực nước mương bao ổn định để không làm xì phèn bờ vuông."
            }
        }
    },
    {
        "scenario_id": "DBSCL_12_VENBIEN_TRAVINH",
        "vung_sinh_thai": "Vùng đất giồng cát ven biển (Khai thác nước ngầm tưới màu)",
        "thang_quan_trac": "Tháng 3 (Cao điểm mùa khô - Cạn kiệt nước ngầm tầng nông)",
        "input_farmer": {
            "lat": 9.785,
            "lon": 106.445,
            "tinh_thanh": "Trà Vinh (Huyện Cầu Ngang)",
            "cay_dang_trong": "Bắp nếp & Hành tím (Trồng trên đất giồng cát, bơm nước giếng khoan tưới hàng ngày)",
            "phan_bon_dang_dung": "NPK 16-16-8, Urê, phân chuồng chưa ủ hoai kỹ",
            "thuoc_tru_sau_dang_dung": "Emamectin benzoate (trị sâu đục thân/bắp), Mancozeb, thuốc cỏ Pendimethalin",
            "muc_tieu_nong_dan": "Giếng khoan bắt đầu hụt nước và có vị lợ nhẹ, đất cát quá nóng và nhanh khô sau khi tưới 2 tiếng; muốn tìm cây trồng và cách canh tác giữ nước cho vụ tới"
        },
        "input_nasa_and_soil_context": {
            "SMAP_SPL4SMGP": "sm_surface = 0.14 m3/m3 (cực khô trên đất giồng cát), sm_rootzone = 0.18 m3/m3 (Z-score = -1.6)",
            "ECOSTRESS_C2": "LST_Day = 39.4°C (mặt đất cát phơi nắng nóng bỏng lúc 13h30), ESI = 0.36",
            "GPM_IMERG_V07": "Mưa tích lũy 30 ngày = 5 mm (không có mưa bổ cập)",
            "Landsat89_MODIS": "BSI = +0.26 (phản xạ cát khô rất mạnh), MODIS LST biên độ nhiệt ngày-đêm = 14.8°C (cao nhất ĐBSCL)",
            "NASA_POWER_AG": "T2M_MAX = 35.6°C, RH2M = 58%, VPD = 2.20 kPa, Bức xạ = 21.6 MJ/m2/ngày, gió chướng ven biển mạnh",
            "GRACE_FO_CRI": "lwe_thickness = -13.5 cm, xu thế 12 tháng = -3.2 cm/năm (báo động đỏ về suy giảm túi nước ngầm ngọt dưới các giồng cát ven biển Trà Vinh)",
            "SRTM_NASADEM": "Độ cao = 3.2 m, HAND = 2.4 m (địa hình giồng cát cao hình cánh cung ven biển, không giữ được nước mặt)",
            "SoilGrids_250m": "Đất cát pha giồng biển (Arenosols), Sand = 76%, Clay = 8%, SOC = 0.6% (rất nghèo mùn hữu cơ và khả năng giữ nước/phân cực thấp), pH_H2O = 6.2"
        },
        "ai_diagnosis_simple": "Bà con ở vùng giồng cát Cầu Ngang lưu ý gấp: Vệ tinh GRACE và ECOSTRESS phát hiện túi nước ngầm ngọt dưới lòng đất vùng mình đang cạn kiệt nhanh làm nước mặn ngấm vào giếng khoan, trong khi mặt đất cát buổi trưa nóng lên tới gần 40°C! Vì đất giồng có tới 76% là cát và rất nghèo chất mùn (chỉ 0.6%), nên nước tưới và phân Urê bà con rải xuống đều bị tuột thẳng xuống sâu hoặc bốc hơi mất sau 2 tiếng, còn bón phân chuồng tươi chưa ủ hoai lúc đất nóng đang sinh nhiệt làm cháy rễ hành và phát sinh nấm bệnh!",
        "ai_solutions_comparison": {
            "phuong_an_1_giu_nguyen_hien_trang": {
                "ten_phuong_an": "Giữ nguyên hiện trạng (Tiếp tục khoan giếng sâu hơn để bơm tưới tràn và rải phân Urê/NPK trên mặt cát trần)",
                "ly_do_de_xuat": "Đất giồng cát cao ráo (3.2 m) dễ làm đất và không bao giờ bị ngập úng.",
                "bang_chung_ve_tinh_tho_nhuong": "Bức xạ mặt trời NASA POWER cao (21.6 MJ/m2/ngày) giúp củ hành và bắp tích lũy đường nhanh nếu đủ nước.",
                "loi_ich_du_kien": "Không tốn chi phí đầu tư cải tạo đất và hệ thống tưới tiết kiệm ban đầu.",
                "khoang_trong_thong_tin": "Vệ tinh không đo được trực tiếp độ mặn và lưu lượng của từng giếng khoan hộ gia đình.",
                "rui_ro_can_kiem_tra": "Khai thác kiệt túi nước ngầm ngọt (GRACE = -13.5 cm) sẽ hút nước mặn từ tầng vây quanh vào làm hỏng vĩnh viễn giếng khoan và làm mặn hóa đất giồng cát; thất thoát > 70% lượng nước và phân đạm."
            },
            "phuong_an_2_luan_canh_cai_tao_dat_co_dinh_dam": {
                "ten_phuong_an": "Luân canh tạo đệm mùn giữ nước & cố định đạm (Trồng Đậu phộng / Lạc hoặc Đậu xanh phủ rơm + Bón Than sinh học Biochar & Phân ủ hoai)",
                "ly_do_de_xuat": "Tăng hàm lượng mùn hữu cơ (SOC đang chỉ có 0.6%) và độ che phủ mặt cát để biến đất cát rời rạc thành đất giữ ẩm tốt.",
                "bang_chung_ve_tinh_tho_nhuong": "SoilGrids chỉ ra Sand = 76% và SOC = 0.6% là nguyên nhân gốc rễ làm SMAP sm_surface tụt xuống 0.14 m3/m3 và LST vọt lên 39.4°C; cây Đậu phộng (Lạc) cực kỳ hợp đất giồng cát Trà Vinh.",
                "loi_ich_du_kien": "Tán lá đậu phộng bò sát mặt cát kết hợp vùi thân lá + Biochar (than trấu) giúp giảm nhiệt độ mặt cát 6–8°C, tăng khả năng giữ ẩm tầng rễ thêm 40%, cố định 60 kg N/ha và không lo bị ngộ độc phân chuồng tươi.",
                "khoang_trong_thong_tin": "Cần kiểm tra tồn dư thuốc trừ cỏ Pendimethalin trước khi chuyển đổi cơ cấu cây trồng kế tiếp.",
                "rui_ro_can_kiem_tra": "Phân chuồng bắt buộc phải ủ hoai mục với nấm Trichoderma ít nhất 45 ngày trước khi bón vào đất cát để diệt hạt cỏ và nấm Aspergillus flavus (gây độc tố aflatoxin trên đậu phộng)."
            },
            "phuong_an_3_luan_canh_tiet_kiem_nuoc_thich_ung_bdkh": {
                "ten_phuong_an": "Thích ứng cạn kiệt nước ngầm (Trồng Măng tây xanh / Củ cải / Mè chịu hạn + Tưới nhỏ giọt chôn ngầm kết hợp Trữ nước mưa mùa mưa)",
                "ly_do_de_xuat": "Giảm tối đa lượng nước hút từ giếng khoan mùa khô và tận dụng lượng mưa mùa mưa (tháng 6–11) thu gom vào ao lót bạt HDPE trên giồng cát.",
                "bang_chung_ve_tinh_tho_nhuong": "Chênh lệch cực lớn giữa mùa mưa (GPM > 250 mm/tháng) và mùa khô (5 mm/tháng) trên địa hình cao (HAND = 2.4 m) đòi hỏi phải thu trữ nước mưa tại chỗ và dùng tưới nhỏ giọt để chống bốc hơi khi VPD = 2.20 kPa.",
                "loi_ich_du_kien": "Tiết kiệm 60–75% lượng nước giếng khoan, phân bón hòa tan đi thẳng vào rễ qua dây nhỏ giọt giúp tăng hiệu suất sử dụng phân từ 30% lên 85%, bảo vệ túi nước ngầm ngọt lâu dài.",
                "khoang_trong_thong_tin": "Vệ tinh không thấy được diện tích mặt mái nhà/sân hoặc góc đất trũng của hộ nông dân có thể tận dụng đào ao lót bạt trữ nước mưa.",
                "rui_ro_can_kiem_tra": "Khi dùng nước giếng khoan có hàm lượng sắt/vôi tưới nhỏ giọt cần có bầu lọc đĩa và xả cặn định kỳ để tránh tắc nghẽn mắt nhỏ giọt."
            }
        }
    }
]

output_dir = r"C:\Users\Admin\.gemini\antigravity\scratch\mekong-nasa-ai-dataset"
os.makedirs(output_dir, exist_ok=True)
jsonl_path = os.path.join(output_dir, "mekong_ai_assistant_dataset.jsonl")

with open(jsonl_path, "w", encoding="utf-8") as f:
    for item in scenarios:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

print(f"Successfully wrote {len(scenarios)} scenarios to {jsonl_path}")
