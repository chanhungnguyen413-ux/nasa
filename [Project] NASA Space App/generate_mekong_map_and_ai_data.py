#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_mekong_map_and_ai_data.py
Generates ready-to-use geospatial and AI training files for the Mekong Delta (DBSCL) Mobile App:
1. mekong_interactive_layers.geojson
2. mekong_charts_timeseries.json
3. mekong_spatial_ai_training.jsonl
"""

import json
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))


def build_geojson():
    """
    Builds a valid GeoJSON FeatureCollection covering 6 core agro-ecological sub-regions
    of the Mekong Delta, each containing full attributes, hex colors, farmer-friendly
    legends, and recommended crop rotations for ALL 9 NASA/Local environmental factors.
    """
    features = [
        # 1. Thượng nguồn Phù sa Ngọt (Cần Thơ - An Giang - Vĩnh Long)
        {
            "type": "Feature",
            "id": "ZONE_01_ALLUVIAL_FRESHWATER",
            "properties": {
                "zone_id": "ZONE_01_ALLUVIAL_FRESHWATER",
                "zone_name_vi": "Tiểu vùng Phù sa Ngọt Trung tâm (Cần Thơ - An Giang - Vĩnh Long)",
                "zone_name_en": "Central Freshwater Alluvial Zone (Can Tho - An Giang - Vinh Long)",
                "provinces": ["Cần Thơ", "An Giang", "Vĩnh Long", "Đồng Tháp (Nam sông Tiền)"],
                "layers": {
                    "1_soil_type": {
                        "value": "Đất phù sa ngọt (Fluvisols), pH = 5.6, Clay = 46%, Độ mặn < 0.5‰",
                        "color_hex": "#2E7D32",
                        "color_label": "Xanh lá đậm (Đất ngọt màu mỡ)",
                        "legend_vi": "Đất thịt phù sa ngọt quanh năm, giữ nước và dinh dưỡng rất tốt, nhưng dễ bị nén chặt tầng đế cày nếu làm 3 vụ lúa liên tiếp.",
                        "legend_en": "Nutrient-rich freshwater alluvial soil year-round; prone to plow-pan compaction under continuous triple-rice cropping.",
                        "recommended_crops": "Luân canh 2 Lúa (Đông Xuân, Thu Đông) + 1 Đậu nành/Đậu xanh/Bắp (Xuân Hè) hoặc Cây ăn trái có lên liếp."
                    },
                    "2_heat_stress": {
                        "value": "ECOSTRESS LST = 35.8°C, NASA POWER T2M_MAX = 35.5°C, VPD = 2.15 kPa (Tháng 3–4)",
                        "color_hex": "#FB8C00",
                        "color_label": "Cam nóng (Cảnh báo nắng gắt mùa khô)",
                        "legend_vi": "Mặt ruộng nóng gần 36°C vào trưa tháng 3–4; phun thuốc nhũ dầu (EC) hoặc rải Urê lúc nắng trưa dễ làm cháy lá và bốc hơi mất 40% phân đạm.",
                        "legend_en": "Midday surface temperature reaches ~36°C in Mar–Apr; applying EC pesticides or Urea at noon causes leaf burn and 40% N volatilization.",
                        "recommended_crops": "Trồng Đậu xanh, Mè (Vừng), hoặc Bắp phủ rơm gốc trong vụ Xuân Hè để hạ nhiệt mặt đất 4–5°C."
                    },
                    "3_cold_frost_risk": {
                        "value": "NASA POWER T2M_MIN = 18.5°C (Đợt lạnh đêm tháng 12 – tháng 1), MODIS LST_Night = 17.8°C",
                        "color_hex": "#00ACC1",
                        "color_label": "Xanh lơ (Đêm se lạnh kèm sương mù nhẹ)",
                        "legend_vi": "Đêm và sáng sớm dịp cuối năm trời trở lạnh dưới 19°C kèm sương mù ẩm; lúa Đông Xuân đang trổ dễ bị nghẹt đòng và nhiễm nấm đạo ôn cổ bông.",
                        "legend_en": "Nighttime lows drop below 19°C in Dec–Jan with morning fog; booting rice risks panicle choking and neck blast fungus.",
                        "recommended_crops": "Giữ mực nước ruộng 5–7 cm ban đêm để giữ ấm gốc lúa Đông Xuân; rất thuận lợi trồng Dưa hấu, Bắp cải, Rau màu vụ Tết."
                    },
                    "4_extreme_rainfall": {
                        "value": "GPM IMERG Mưa năm = 1,650 mm; Mưa cực đoan Rx1day = 72 mm/ngày (Tháng 8–10)",
                        "color_hex": "#1565C0",
                        "color_label": "Xanh dương đậm (Mưa lớn cuối vụ Hè Thu - Thu Đông)",
                        "legend_vi": "Tháng 8–10 thường có mưa dông cực to trên 60 mm/ngày làm trôi phân bón và gây ngập úng hoa màu nếu không có rãnh thoát.",
                        "legend_en": "Heavy convective storms (>60 mm/day) in Aug–Oct cause fertilizer runoff and waterlogging on upland crops.",
                        "recommended_crops": "Mùa mưa (T8–T11) ưu tiên trồng Lúa nước kết hợp thả cá ruộng; ngưng trồng khoai lang/đậu trên chân ruộng thấp."
                    },
                    "5_smap_soil_moisture": {
                        "value": "SMAP sm_surface = 0.22 m³/m³, sm_rootzone = 0.28 m³/m³ (Mùa khô T3); 0.41 m³/m³ (Mùa mưa)",
                        "color_hex": "#C0CA33",
                        "color_label": "Vàng xanh (Ẩm tầng rễ vừa đủ cho cây màu mùa khô)",
                        "legend_vi": "Cuối vụ Đông Xuân mặt đất ráo nhưng tầng rễ sâu 0–100 cm vẫn còn giữ ẩm 28%, vừa đẹp để tỉa đậu mà không tốn tiền bơm nước.",
                        "legend_en": "Post-Winter-Spring harvest soil retains 28% root-zone moisture—ideal for residual-moisture legume relay cropping.",
                        "recommended_crops": "Tỉa Đậu xanh / Đậu nành ngay sau gặt lúa Đông Xuân (sau khi cày phơi 10–14 ngày khử tồn dư thuốc cỏ Quinclorac)."
                    },
                    "6_ecostress_esi": {
                        "value": "ECOSTRESS ESI = 0.52 (Mùa khô) -> 0.81 (Mùa mưa)",
                        "color_hex": "#FBC02D",
                        "color_label": "Vàng (Thiếu nước nhẹ cuối mùa khô)",
                        "legend_vi": "Cây trồng cạn hoặc lúa Xuân Hè bắt đầu khát nước nhẹ vào tháng 4; cần tưới tiết kiệm hoặc tủ rơm giữ ẩm.",
                        "legend_en": "Moderate evaporative stress in April; mulching with rice straw is recommended to conserve root-zone moisture.",
                        "recommended_crops": "Đậu nành, Đậu phộng, Bắp ngọt tưới rãnh tiết kiệm nước."
                    },
                    "7_ndvi_bare_soil": {
                        "value": "Landsat/MODIS EVI đỉnh = 0.68; Đất trống BSI > 0.16 vào Tháng 3 và Tháng 7 (giữa 2 vụ)",
                        "color_hex": "#1B5E20",
                        "color_label": "Xanh lục đậm (3 đỉnh sinh khối cao trong năm)",
                        "legend_vi": "Cánh đồng xanh tốt quanh năm nhưng có 2 khoảng đất trống ngắn lúc vừa gặt xong; đỉnh xanh vụ 3 đang giảm nhẹ do đất mỏi mệt.",
                        "legend_en": "High vegetation vigor with two short bare-soil windows post-harvest; slight multi-year EVI decline indicates soil fatigue.",
                        "recommended_crops": "Xen 1 vụ Cây họ đậu/Cây phân xanh vào khoảng đất trống tháng 3–5 để phục hồi sức khỏe đất."
                    },
                    "8_grace_groundwater": {
                        "value": "GRACE-FO lwe_thickness = -6.5 cm (Mùa khô) đến +10.2 cm (Mùa lũ); Xu thế = -1.1 cm/năm",
                        "color_hex": "#81C784",
                        "color_label": "Xanh lá nhạt (Nguồn nước mặt & nước ngầm tương đối ổn định)",
                        "legend_vi": "Nhờ nằm gần sông Tiền và sông Hậu nên nguồn nước ngọt khá dồi dào, nhưng mùa khô mực nước vẫn rút thấp hơn trung bình 6.5 cm.",
                        "legend_en": "Relatively stable freshwater storage buffered by the Tien and Hau rivers, with moderate dry-season drawdown (-6.5 cm).",
                        "recommended_crops": "Lúa chất lượng cao (Đài Thơm 8, OM18) luân canh Đậu nành/Bắp."
                    },
                    "9_srtm_elevation": {
                        "value": "NASADEM Cao độ = 1.4 m, HAND = 1.1 m (Bình địa phù sa có đê bao)",
                        "color_hex": "#66BB6A",
                        "color_label": "Xanh lá (Bình địa trung bình, chủ động tưới tiêu)",
                        "legend_vi": "Nền đất cao trung bình 1.4 mét, có bờ bao nên dễ chủ động bơm tưới và tháo nước khi mưa lớn.",
                        "legend_en": "Medium floodplain terrace (1.4 m elevation, HAND 1.1 m) with active dike and drainage control.",
                        "recommended_crops": "Luân canh linh hoạt Lúa – Màu (Đậu, Bắp, Rau thực phẩm)."
                    }
                }
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [105.25, 10.65], [105.85, 10.65], [105.95, 10.00],
                    [105.45, 9.95], [105.20, 10.25], [105.25, 10.65]
                ]]
            }
        },

        # 2. Vùng Trũng Phèn Đồng Tháp Mười (Đồng Tháp - Long An - Tiền Giang)
        {
            "type": "Feature",
            "id": "ZONE_02_ACID_SULFATE_DTM",
            "properties": {
                "zone_id": "ZONE_02_ACID_SULFATE_DTM",
                "zone_name_vi": "Tiểu vùng Trũng Phèn Đồng Tháp Mười (Đồng Tháp - Long An)",
                "zone_name_en": "Dong Thap Muoi Acid Sulfate Floodplain (Dong Thap - Long An)",
                "provinces": ["Đồng Tháp (Tam Nông, Tháp Mười)", "Long An (Tân Thạnh, Mộc Hóa, Vĩnh Hưng)"],
                "layers": {
                    "1_soil_type": {
                        "value": "Đất phèn hoạt động & tiềm tàng (Thionic Fluvisols), pH = 3.9–4.5, Fe2+/Al3+ cao",
                        "color_hex": "#8E24AA",
                        "color_label": "Tím cam (Đất phèn chua dưới sâu)",
                        "legend_vi": "Đất có tầng sinh phèn chua (pH dưới 4.5); tuyệt đối không phơi ruộng quá khô nứt nẻ mùa nắng kẻo mưa đầu mùa làm xì phèn đen rễ.",
                        "legend_en": "Active/potential acid sulfate soil (pH 3.9–4.5); severe cracking in dry season oxidizes pyrite and triggers toxic Fe/Al release.",
                        "recommended_crops": "2 vụ Lúa chịu phèn (OM5451, IR50404) + Trồng Sen / Xả lũ nuôi cá mùa nước nổi, hoặc trồng Khóm (Dứa) trên liếp."
                    },
                    "2_heat_stress": {
                        "value": "ECOSTRESS LST = 37.2°C (Khi phơi ruộng khô T4), NASA POWER T2M_MAX = 36.2°C, VPD = 2.25 kPa",
                        "color_hex": "#D32F2F",
                        "color_label": "Đỏ rực (Nắng nóng gay gắt làm bốc phèn mặt ruộng)",
                        "legend_vi": "Tháng 4–5 nắng nóng trên 37°C làm nước ruộng bốc hơi cạn, kéo độc chất phèn sắt và nhôm từ dưới sâu lên mặt bùn làm cháy rễ lúa non.",
                        "legend_en": "Extreme surface heating (>37°C) drives upward capillary rise of acidic Fe2+/Al3+ salts into the root zone.",
                        "recommended_crops": "Giữ lớp rơm rạ che phủ mặt đất và trồng Mè đen / Đậu xanh làm đất tối thiểu để giữ mát mặt ruộng."
                    },
                    "3_cold_frost_risk": {
                        "value": "NASA POWER T2M_MIN = 17.5°C (Vùng trũng nội đồng bức xạ nhiệt ban đêm mạnh vào T12–T1)",
                        "color_hex": "#1E88E5",
                        "color_label": "Xanh đậm (Lạnh ban đêm & Sương mù dày trên đồng trũng)",
                        "legend_vi": "Đồng trũng rộng nên đêm tháng Chạp lạnh xuống 17–18°C kèm sương mù dày tới 8h sáng, rất dễ bùng phát bệnh đạo ôn lá và cổ bông.",
                        "legend_en": "Open inland depression experiences strong nocturnal radiative cooling (17.5°C) and heavy morning dew, favoring rice blast.",
                        "recommended_crops": "Ngưng bón thừa đạm Urê khi trời trở lạnh đêm; bổ sung Silic và Canxi giúp lá lúa đứng và kháng nấm đạo ôn."
                    },
                    "4_extreme_rainfall": {
                        "value": "GPM IMERG Mưa đầu mùa T5 = 95–120 mm/đợt; Đỉnh mưa lũ T9–T10 = 310 mm/tháng",
                        "color_hex": "#AD1457",
                        "color_label": "Tím hồng (Mưa đầu mùa kích hoạt xì phèn & Mưa thu gây ngập lũ)",
                        "legend_vi": "Đám mưa to đầu mùa tháng 5 sau chuỗi ngày nắng hạn sẽ đẩy nước phèn chua từ bờ kênh tràn xuống ruộng; cần tháo bỏ nước đầu mùa ngay!",
                        "legend_en": "First heavy May rains flush concentrated sulfuric acid and Al3+ from canal banks into paddies; flush surface water immediately.",
                        "recommended_crops": "Bón lót Vôi + Lân nung chảy đầu mùa mưa; tháng 8–11 mở cống xả lũ đón phù sa nuôi cá/tôm càng xanh."
                    },
                    "5_smap_soil_moisture": {
                        "value": "SMAP sm_rootzone biến thiên mạnh: 0.17 m³/m³ (Tháng 4) -> 0.44 m³/m³ (Tháng 9 ngập lũ)",
                        "color_hex": "#0277BD",
                        "color_label": "Xanh biển (Ngập lũ bão hòa mùa mưa, dễ khô kiệt cuối mùa nắng)",
                        "legend_vi": "Không được để độ ẩm tầng rễ tụt xuống vùng Đỏ (< 0.18) vào mùa khô vì không khí sẽ lọt xuống đốt cháy tầng phèn ngầm.",
                        "legend_en": "Keep root-zone soil moisture above 0.22 m³/m³ in dry season to prevent oxygen penetration into the pyrite layer.",
                        "recommended_crops": "Trồng Sen lấy ngó/gương (giữ ngập ẩm quanh năm ém phèn) hoặc Đậu xanh phủ rơm giữ ẩm."
                    },
                    "6_ecostress_esi": {
                        "value": "ECOSTRESS ESI = 0.42 (Khi lúa bị ngộ độc phèn bó rễ đầu vụ Hè Thu)",
                        "color_hex": "#C62828",
                        "color_label": "Đỏ (Cây khát nước giả tạo do rễ bị bó phèn)",
                        "legend_vi": "Ruộng vẫn có nước nhưng vệ tinh báo cây bị khát (ESI Đỏ) vì rễ lúa đã bị phèn làm đen thui không hút nước được; đừng rải DAP lúc này!",
                        "legend_en": "Low ESI despite standing water indicates physiological drought caused by iron/aluminum root toxicity.",
                        "recommended_crops": "Thay nước ruộng + bón Vôi & Lân nung chảy cho lúa ra rễ trắng mới trước khi bón thúc."
                    },
                    "7_ndvi_bare_soil": {
                        "value": "Landsat MNDWI = +0.34 (Tháng 8–11 mùa nước nổi); MODIS EVI vụ 3 trong đê bao giảm 12% sau 6 năm",
                        "color_hex": "#039BE5",
                        "color_label": "Xanh lam (Vùng trữ nước mùa lũ & Rửa phèn tự nhiên)",
                        "legend_vi": "Những ô bao làm 3 vụ lúa liên tục đất đang yếu dần; mở cống cho nước nổi tràn vào 3 tháng giúp rửa sạch phèn và nhận 4 tấn phù sa/ha.",
                        "legend_en": "Seasonal flood inundation (Aug–Nov) naturally flushes acidity and deposits 3–5 tons/ha of fertile silt.",
                        "recommended_crops": "Chu kỳ 2 vụ Lúa (Đông Xuân, Hè Thu sớm) + 1 vụ Xả lũ nuôi thủy sản / Trồng Ấu, Bông súng, Sen."
                    },
                    "8_grace_groundwater": {
                        "value": "GRACE-FO lwe_thickness dao động lớn nhất ĐBSCL: -6.0 cm (Tháng 4) đến +16.4 cm (Tháng 10)",
                        "color_hex": "#1976D2",
                        "color_label": "Xanh dương (Túi trữ nước ngọt mùa lũ của toàn vùng)",
                        "legend_vi": "Vùng Đồng Tháp Mười là túi trữ nước lũ tự nhiên khổng lồ vào tháng 9–11 giúp bổ cập nước ngầm cho cả miền Tây.",
                        "legend_en": "Acts as the primary natural flood retention and groundwater recharge basin of the Mekong Delta during Sep–Nov.",
                        "recommended_crops": "Canh tác thuận thiên dựa vào lũ: Lúa – Cá/Tôm càng xanh, Sen, Tràm."
                    },
                    "9_srtm_elevation": {
                        "value": "NASADEM Cao độ = 0.8 m, HAND = 0.4 m (Lòng chảo trũng thấp)",
                        "color_hex": "#0D47A1",
                        "color_label": "Xanh chàm (Trũng ngập sâu mùa lũ, khó tiêu thoát nước đáy)",
                        "legend_vi": "Địa hình trũng như lòng chảo (chỉ cao hơn mặt kênh 4 tấc) nên nước lũ về ngập sâu và nước phèn ở đáy ruộng rất khó tháo kiệt.",
                        "legend_en": "Low-lying basin depression (HAND 0.4 m) prone to deep seasonal flooding and slow subsurface acid drainage.",
                        "recommended_crops": "Không trồng cây ăn trái mẫn cảm ngập (như sầu riêng) nếu không lên liếp đê bao cao; ưu tiên Lúa – Sen – Thủy sản."
                    }
                }
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [105.35, 10.95], [106.15, 10.95], [106.15, 10.45],
                    [105.60, 10.45], [105.35, 10.70], [105.35, 10.95]
                ]]
            }
        },

        # 3. Vùng Cây Ăn Trái & Phù Sa Cửa Sông (Tiền Giang - Bến Tre - Vĩnh Long)
        {
            "type": "Feature",
            "id": "ZONE_03_ORCHARD_ESTUARINE",
            "properties": {
                "zone_id": "ZONE_03_ORCHARD_ESTUARINE",
                "zone_name_vi": "Tiểu vùng Cây Ăn Trái Lên Liếp & Ven Sông Tiền (Tiền Giang - Bến Tre)",
                "zone_name_en": "Upper Estuarine Orchard & Alluvial Terrace (Tien Giang - Ben Tre)",
                "provinces": ["Tiền Giang (Cai Lậy, Châu Thành)", "Bến Tre (Chợ Lách, Châu Thành)", "Vĩnh Long (Long Hồ)"],
                "layers": {
                    "1_soil_type": {
                        "value": "Đất phù sa cổ lên liếp vườn, Clay = 50%, pH mô đất = 4.6 (chua hóa do phân bón & Paclobutrazol), nhạy cảm mặn mùa khô",
                        "color_hex": "#2E7D32",
                        "color_label": "Xanh lá pha Vàng (Đất phù sa lên liếp nhưng nhạy cảm mặn mùa khô)",
                        "legend_vi": "Đất phù sa tốt nhưng mô liếp trồng sầu riêng/bưởi lâu năm đang bị chua hóa (pH 4.6) và chai cứng do tồn dư thuốc xử lý ra hoa Paclobutrazol.",
                        "legend_en": "Raised-bed alluvial soil suffering from acidification (pH 4.6) and root-stunting Paclobutrazol residue.",
                        "recommended_crops": "Chuyên canh Cây ăn trái (Sầu riêng, Bưởi da xanh, Chôm chôm) kết hợp trồng Cỏ lạc dại (cỏ đậu) phủ kín mặt liếp."
                    },
                    "2_heat_stress": {
                        "value": "ECOSTRESS LST = 36.6°C trên liếp cạo sạch cỏ vs 31.8°C trên liếp có cỏ đậu; VPD = 2.30 kPa",
                        "color_hex": "#FB8C00",
                        "color_label": "Cam nóng (Sốc nhiệt mặt liếp & Khô không khí gây rụng bông/trái non)",
                        "legend_vi": "Giữa mùa khô không khí rất hanh (VPD = 2.30 kPa), vườn nào cạo trọc cỏ mặt liếp bị nóng hơn 4–5°C làm sầu riêng rụng bông và trái non hàng loạt.",
                        "legend_en": "Bare soil beds heat up 4–5°C higher than cover-cropped beds under high VPD (2.30 kPa), triggering severe fruitlet drop.",
                        "recommended_crops": "Trồng thảm Cỏ lạc dại / Đậu xanh giữ mát mặt liếp + Tưới phun sương dưới tán sáng sớm và đổi thuốc nhũ dầu EC sang SC/WG."
                    },
                    "3_cold_frost_risk": {
                        "value": "NASA POWER T2M_MIN = 19.5°C (Tháng 1), chênh lệch nhiệt ngày-đêm 12°C kích thích phân hóa mầm hoa",
                        "color_hex": "#4CAF50",
                        "color_label": "Xanh lá (Tiểu khí hậu đêm mát thuận lợi kích bông cây ăn trái)",
                        "legend_vi": "Tiết trời se lạnh ban đêm tháng Chạp – tháng Giêng giúp cây ăn trái (xoài, nhãn, sầu riêng) dễ phân hóa mầm hoa tự nhiên nhưng cần ngừa nấm phấn trắng.",
                        "legend_en": "Cool nighttime temperatures (~19.5°C) in Jan aid natural floral induction in mango and durian but require powdery mildew monitoring.",
                        "recommended_crops": "Giảm phụ thuộc hóa chất Paclobutrazol, tận dụng tiết lạnh tự nhiên kết hợp Lân – Kali để làm bông an toàn."
                    },
                    "4_extreme_rainfall": {
                        "value": "GPM IMERG Mưa cực đoan tháng 9–10 = 65–80 mm/ngày làm sầu riêng dễ bị sốc nước nứt trái và thối rễ Phytophthora",
                        "color_hex": "#1565C0",
                        "color_label": "Xanh dương (Mưa dông lớn gây úng rãnh mương và nứt trái)",
                        "legend_vi": "Mưa to dồn dập sau đợt nắng làm cây hút nước đột ngột gây nứt trái, sượng cơm sầu riêng và nấm Phytophthora tấn công cổ rễ.",
                        "legend_en": "Sudden heavy downpours cause rapid water uptake, fruit cracking, wet core in durian, and Phytophthora root rot.",
                        "recommended_crops": "Xẻ rãnh xương cá trên mặt liếp thoát nước mưa nhanh và bón nấm đối kháng Trichoderma + Phosphorous acid ngừa thối rễ."
                    },
                    "5_smap_soil_moisture": {
                        "value": "SMAP sm_rootzone = 0.25 m³/m³ (Mùa khô T2–T4, cần tưới giữ ẩm đều)",
                        "color_hex": "#C0CA33",
                        "color_label": "Vàng xanh (Cần duy trì độ ẩm ổn định, tránh khô-ướt đột ngột)",
                        "legend_vi": "Cây ăn trái đang nuôi trái non cần độ ẩm tầng rễ ổn định; không để đất khô kiệt rồi mới tưới đẫm sẽ làm rụng trái.",
                        "legend_en": "Fruit trees require steady root-zone moisture during fruit setting; avoid abrupt dry-wet cycles.",
                        "recommended_crops": "Hệ thống tưới phun mưa cục bộ dưới tán kết hợp thảm cỏ họ đậu giữ ẩm."
                    },
                    "6_ecostress_esi": {
                        "value": "ECOSTRESS ESI = 0.41 (Báo động sớm khi nước mương chớm nhiễm mặn > 0.5‰ làm rễ sầu riêng ngừng hút nước)",
                        "color_hex": "#C62828",
                        "color_label": "Đỏ (Cảnh báo sớm cháy lá sầu riêng do hạn mặn)",
                        "legend_vi": "Chỉ số ESI chuyển Đỏ báo hiệu rễ sầu riêng đang bị tổn thương do mặn hoặc thiếu nước ngọt trước khi chóp lá kịp chuyển sang màu vàng cháy!",
                        "legend_en": "ESI drops below 0.45 as an early warning of salinity-induced osmotic root stress 10–14 days before leaf-tip burn appears.",
                        "recommended_crops": "Đo độ mặn nước mương trước mỗi lần tưới (< 0.3‰ cho sầu riêng); nếu thiếu nước ngọt phải tỉa bớt trái non để cứu cây mẹ."
                    },
                    "7_ndvi_bare_soil": {
                        "value": "Landsat EVI quanh năm = 0.52–0.60; giảm đột ngột về 0.42 khi bị hạn mặn lịch sử",
                        "color_hex": "#1B5E20",
                        "color_label": "Xanh lục đậm (Tán vườn cây lâu năm xanh quanh năm)",
                        "legend_vi": "Vườn cây ăn trái khỏe mạnh có màu xanh đậm ổn định quanh năm trên bản đồ; những chòm chuyển sang màu Vàng là nơi cây đang bị suy kiệt rễ.",
                        "legend_en": "Healthy perennial orchards maintain high EVI (>0.50) year-round; localized yellow patches pinpoint root rot or salinity damage.",
                        "recommended_crops": "Bón phục hồi Humic + Hữu cơ vi sinh + Vôi Dolomite ngay tại các ô vườn bị sụt giảm chỉ số xanh EVI."
                    },
                    "8_grace_groundwater": {
                        "value": "GRACE-FO lwe_thickness = -12.4 cm vào Tháng 2–4 (Đẩy ranh mặn 1–4 g/L từ biển lấn sâu 50–70 km theo sông Tiền, sông Hàm Luông)",
                        "color_hex": "#B71C1C",
                        "color_label": "Đỏ sẫm (Báo động thiếu nước ngọt mùa khô đẩy mặn xâm nhập sâu)",
                        "legend_vi": "Khi bản đồ GRACE chuyển sang màu Đỏ vào đầu mùa khô, nước mặn từ biển sẽ tràn sâu lên tới Cai Lậy – Chợ Lách sớm hơn bình thường 1 tháng!",
                        "legend_en": "Severe terrestrial water storage deficit (-12.4 cm) allows 1–4 g/L saltwater intrusion to penetrate 50–70 km inland.",
                        "recommended_crops": "Bơm trữ nước ngọt vào mương liếp/túi trữ nước bạt HDPE ngay từ tháng 11–12 và thả lục bình che mặt mương giảm bốc hơi."
                    },
                    "9_srtm_elevation": {
                        "value": "NASADEM Cao độ = 1.6 m, HAND = 1.2 m (Vùng gờ đất ven sông lên liếp)",
                        "color_hex": "#66BB6A",
                        "color_label": "Xanh lá (Chân đất cao vừa nhưng chịu ảnh hưởng thủy triều sông lớn)",
                        "legend_vi": "Vườn nằm ven sông lớn nên khi triều cường rằm tháng 9–10 âm lịch dâng cao rất dễ tràn qua bờ bao thấp.",
                        "legend_en": "Riverine levee terraces subject to semidiurnal spring-tide overtopping during Oct–Nov peak tides.",
                        "recommended_crops": "Gia cố bờ bao + van một chiều ngăn triều cường và cống đóng kín ngăn mặn mùa khô."
                    }
                }
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [105.95, 10.45], [106.55, 10.45], [106.60, 10.05],
                    [106.00, 10.05], [105.95, 10.45]
                ]]
            }
        },

        # 4. Vùng Trũng Phèn Nội Đồng Tây Sông Hậu (Hậu Giang - Kiên Giang TGLX)
        {
            "type": "Feature",
            "id": "ZONE_04_WEST_HAU_ACID_BASIN",
            "properties": {
                "zone_id": "ZONE_04_WEST_HAU_ACID_BASIN",
                "zone_name_vi": "Tiểu vùng Trũng Phèn Tây Sông Hậu & Tứ Giác Long Xuyên (Hậu Giang - Kiên Giang)",
                "zone_name_en": "West Hau River & Long Xuyen Quadrangle Acid Basin (Hau Giang - Kien Giang)",
                "provinces": ["Hậu Giang (Phụng Hiệp, Vị Thủy, Long Mỹ)", "Kiên Giang (Hòn Đất, Kiên Lương, Giồng Riềng)"],
                "layers": {
                    "1_soil_type": {
                        "value": "Đất phèn tiềm tàng nông & phèn mặn (Sulfaquepts), tầng Pyrite sâu 40 cm, pH = 4.1–4.5, Clay = 50%",
                        "color_hex": "#8E24AA",
                        "color_label": "Tím cam (Đất phèn nông dễ xì phèn khi khô hạn)",
                        "legend_vi": "Ngay dưới mặt ruộng 40 cm là tầng phèn tiềm tàng; nếu cày lật sâu và phơi đất nứt nẻ mùa khô sẽ biến phèn tiềm tàng thành axit sunfuric cực độc.",
                        "legend_en": "Shallow sulfidic pyrite layer (~40 cm depth); deep plowing and dry-season desiccation trigger extreme soil acidification.",
                        "recommended_crops": "Lúa Đông Xuân sớm -> Đậu xanh/Mè (làm đất tối thiểu phủ rơm giữ ẩm) -> Lúa Hè Thu, hoặc trồng Khóm Cầu Đúc / Mía chịu phèn."
                    },
                    "2_heat_stress": {
                        "value": "ECOSTRESS LST = 35.4°C, NASA POWER T2M_MAX = 35.1°C, VPD = 1.95 kPa",
                        "color_hex": "#FDD835",
                        "color_label": "Vàng ấm (Cần che phủ rơm rạ chống nứt nẻ mặt đất phèn)",
                        "legend_vi": "Nắng mùa khô tháng 3–4 làm mặt đất sét 50% nhanh chóng nứt chân chim sâu xuống tầng phèn nếu không có rơm hay cây màu che phủ.",
                        "legend_en": "Dry-season solar heating cracks heavy clay soils (50% clay), exposing subsurface pyrite to atmospheric oxygen.",
                        "recommended_crops": "Trồng Đậu xanh / Đậu nành phủ rơm ngay trên gốc rạ ẩm không cần cày lật."
                    },
                    "3_cold_frost_risk": {
                        "value": "NASA POWER T2M_MIN = 18.8°C (Tháng 12–1)",
                        "color_hex": "#00ACC1",
                        "color_label": "Xanh lơ (Sương lạnh ban đêm đầu vụ Đông Xuân)",
                        "legend_vi": "Giai đoạn lúa Đông Xuân đẻ nhánh – làm đòng tháng 12–1 có sương lạnh sáng sớm, cần chú ý phòng bệnh đạo ôn trên chân đất phèn thiếu Silic.",
                        "legend_en": "Cool dewy nights in Dec–Jan increase rice blast susceptibility on silicon-deficient acid sulfate soils.",
                        "recommended_crops": "Bón Lân nung chảy giàu Silic và Canxi ngay từ đầu vụ Đông Xuân."
                    },
                    "4_extreme_rainfall": {
                        "value": "GPM IMERG Mưa năm = 1,950 mm; mưa dông kết hợp triều biển Tây gây ngập úng kéo dài tháng 9–11",
                        "color_hex": "#1565C0",
                        "color_label": "Xanh dương đậm (Mưa lớn tiêu thoát chậm ở vùng trũng)",
                        "legend_vi": "Lượng mưa lớn gần 2,000 mm/năm dồn về vùng trũng Phụng Hiệp – Long Mỹ làm ngập úng lâu nếu trồng cây ăn trái hoặc hoa màu mùa mưa.",
                        "legend_en": "High annual rainfall (~1,950 mm) pools in low-lying depressions with sluggish drainage during Sep–Nov.",
                        "recommended_crops": "Mùa mưa chỉ canh tác Lúa nước chịu ngập/phèn hoặc nuôi Cá đồng ruộng trũng."
                    },
                    "5_smap_soil_moisture": {
                        "value": "SMAP sm_rootzone = 0.30 m³/m³ (Cuối vụ Đông Xuân T2–T3) -> 0.43 m³/m³ (Mùa mưa)",
                        "color_hex": "#00897B",
                        "color_label": "Xanh ngọc (Đất giữ ẩm tầng rễ tốt để nhốt phèn)",
                        "legend_vi": "Độ ẩm tầng rễ cuối vụ Đông Xuân đạt 30% rất lý tưởng để gieo hạt đậu/mè vừa có thu nhập vừa giữ ẩm ém phèn dưới sâu.",
                        "legend_en": "30% root-zone moisture in Feb–Mar supports relay-cropped mungbean/sesame while keeping the underlying pyrite layer saturated.",
                        "recommended_crops": "Đậu xanh, Mè đen, Bắp nếp ngắn ngày vụ Xuân Hè."
                    },
                    "6_ecostress_esi": {
                        "value": "ECOSTRESS ESI = 0.51 (Mùa khô) -> 0.80 (Mùa mưa)",
                        "color_hex": "#FBC02D",
                        "color_label": "Vàng (Stress nhẹ cuối mùa khô ở vùng xa kênh trục)",
                        "legend_vi": "Những ruộng xa kênh chính bắt đầu thiếu nước ngọt vào cuối tháng 3–4 và bị nước phèn/mặn từ hướng Kiên Lương – Vị Thanh ép vào.",
                        "legend_en": "Moderate evaporative stress in late dry season as canal water levels drop and acidity/salinity encroaches.",
                        "recommended_crops": "Sạ Lúa Đông Xuân sớm từ tháng 10–11 để thu hoạch gọn trước cuối tháng 2."
                    },
                    "7_ndvi_bare_soil": {
                        "value": "Landsat MNDWI giảm từ +0.35 về +0.08 vào đầu tháng 11 (Báo hiệu nước rút để xuống giống Đông Xuân)",
                        "color_hex": "#1B5E20",
                        "color_label": "Xanh lục (Canh tác 2 vụ Lúa chắc ăn + 1 vụ Màu/Thủy sản)",
                        "legend_vi": "Khi bản đồ mặt nước MNDWI rút xuống vào đầu tháng 11 là thời điểm vàng để bà con xuống giống đồng loạt vụ Đông Xuân né hạn mặn cuối vụ.",
                        "legend_en": "Floodwater recession in early November (MNDWI dropping below 0.10) marks the optimal sowing window for Winter-Spring rice.",
                        "recommended_crops": "Lúa thơm ST24, ST25, Đài Thơm 8 vụ Đông Xuân sớm."
                    },
                    "8_grace_groundwater": {
                        "value": "GRACE-FO lwe_thickness = -9.1 cm (Mùa khô), xu thế giảm -2.5 cm/năm",
                        "color_hex": "#F57C00",
                        "color_label": "Cam (Suy giảm trữ lượng nước ngọt mùa khô gây nguy cơ mặn - phèn kép)",
                        "legend_vi": "Nước ngọt mùa khô đang cạn nhanh hơn các năm trước, làm cả nước phèn nội đồng và nước mặn biển Tây cùng lấn vào ruộng.",
                        "legend_en": "Declining dry-season water storage (-9.1 cm) exacerbates dual acid-saline intrusion in western basins.",
                        "recommended_crops": "Khóm (Dứa) Cầu Đúc, Mía, hoặc Luân canh Lúa – Đậu xanh / Lúa – Tôm càng xanh."
                    },
                    "9_srtm_elevation": {
                        "value": "NASADEM Cao độ = 0.7 m, HAND = 0.4 m (Trũng thấp nội đồng)",
                        "color_hex": "#0D47A1",
                        "color_label": "Xanh chàm (Vùng trũng phèn thấp, tiêu nước đáy rất chậm)",
                        "legend_vi": "Nền đất thấp chỉ 0.7 mét nên khi lên liếp trồng khóm/cây ăn trái phải giữ nước trong mương ổn định và không đắp đất phèn đáy mương lên mặt liếp.",
                        "legend_en": "Low elevation (0.7 m) requires careful ditch-and-dike water table management to prevent pyrite oxidation.",
                        "recommended_crops": "Mô hình Mương – Liếp trồng Khóm/Tràm kết hợp nuôi cá đồng."
                    }
                }
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [104.75, 10.35], [105.45, 10.15], [105.75, 9.65],
                    [105.20, 9.60], [104.75, 10.00], [104.75, 10.35]
                ]]
            }
        },

        # 5. Vùng Ven Biển Lúa - Tôm Bán Đảo Cà Mau (Bạc Liêu - Cà Mau - Sóc Trăng - Kiên Giang)
        {
            "type": "Feature",
            "id": "ZONE_05_COASTAL_RICE_SHRIMP",
            "properties": {
                "zone_id": "ZONE_05_COASTAL_RICE_SHRIMP",
                "zone_name_vi": "Tiểu vùng Ven Biển Lúa – Tôm Bán Đảo Cà Mau (Bạc Liêu - Cà Mau - Sóc Trăng)",
                "zone_name_en": "Ca Mau Peninsula Coastal Rice-Shrimp Zone (Bac Lieu - Ca Mau - Soc Trang)",
                "provinces": ["Cà Mau (Thới Bình, U Minh)", "Bạc Liêu (Phước Long, Hồng Dân)", "Sóc Trăng (Mỹ Xuyên, Trần Đề)", "Kiên Giang (An Biên, An Minh)"],
                "layers": {
                    "1_soil_type": {
                        "value": "Đất mặn - phèn tiềm tàng giàu mùn (Salic/Thionic Fluvisols), Clay = 54%, SOC = 3.2%, mặn mùa khô 8–25‰",
                        "color_hex": "#C62828",
                        "color_label": "Đỏ mận (Đất nhiễm mặn mùa khô, ngọt hóa mùa mưa)",
                        "legend_vi": "Đất sét giàu mùn hữu cơ dưới đáy vuông tôm; mùa khô nhiễm mặn nặng (trên 10 phần ngàn) nhưng mùa mưa rửa mặn trồng lúa ST24/ST25 cực kỳ ngon.",
                        "legend_en": "Organic-rich coastal saline clay (SOC 3.2%); brackish in dry season (8–25‰) and rain-flushed in wet season for specialty fragrant rice.",
                        "recommended_crops": "Luân canh thuận thiên: Tôm sú / Tôm thẻ / Cua (Mùa khô T1–T6) <-> Lúa ST24, ST25, Một Bụi Đỏ + Tôm càng xanh (Mùa mưa T8–T12)."
                    },
                    "2_heat_stress": {
                        "value": "ECOSTRESS LST = 37.9°C trên ruộng lúa muộn thiếu nước; 31.2°C trên vuông tôm giữ nước sâu; VPD = 2.25 kPa",
                        "color_hex": "#FB8C00",
                        "color_label": "Cam nóng (Nắng gắt làm tăng độ mặn nước vuông tôm & bốc mặn mặt ruộng)",
                        "legend_vi": "Nắng nóng tháng 2–4 làm nước trong vuông tôm bốc hơi nhanh khiến độ mặn tăng vọt và phân tầng nhiệt; nếu cố trồng lúa Đông Xuân muộn sẽ bị cháy khô lá.",
                        "legend_en": "High dry-season heat increases pond salinity via evaporation and causes fatal osmotic scorching on late dry-season rice.",
                        "recommended_crops": "Tuyệt đối không trồng lúa vụ Đông Xuân muộn (T1–T4); giữ mực nước vuông tôm sâu > 1.2 m ở mương bao để chống nóng cho tôm."
                    },
                    "3_cold_frost_risk": {
                        "value": "NASA POWER T2M_MIN = 19.0°C (Đợt gió mùa Đông Bắc tháng 12–1 làm nhiệt độ nước vuông tôm hạ thấp về đêm)",
                        "color_hex": "#00ACC1",
                        "color_label": "Xanh lơ (Đêm lạnh gió chướng làm tôm giảm ăn & dễ đốm trắng)",
                        "legend_vi": "Tháng Chạp – tháng Giêng gió chướng thổi mạnh làm nước vuông lạnh dưới 22°C về đêm, tôm giống mới thả dễ bị co cơ, bỏ ăn và bùng bệnh đốm trắng.",
                        "legend_en": "Northeast monsoon cold snaps in Dec–Jan chill shallow shrimp ponds, triggering white spot syndrome (WSSV) and reduced feeding.",
                        "recommended_crops": "Thả giống tôm ở mương ươm sâu có che lưới cản gió chướng và giảm 30–50% lượng thức ăn vào những ngày đêm lạnh."
                    },
                    "4_extreme_rainfall": {
                        "value": "GPM IMERG Mưa tích lũy 30 ngày > 200 mm (Tháng 6–7) là ngưỡng kích hoạt rửa mặn; mưa lớn đột ngột mùa khô gây sốc pH tôm",
                        "color_hex": "#1565C0",
                        "color_label": "Xanh dương đậm (Nước mưa vàng để rửa mặn trồng lúa)",
                        "legend_vi": "Vùng bán đảo Cà Mau chỉ có nước mưa để rửa mặn: Phải chờ tổng mưa GPM trên 200 mm kết hợp bón vôi đẩy muối rồi mới gieo cấy lúa để không bị hạn Bà Chằng làm chết mạ!",
                        "legend_en": "Relying 100% on rainfall for desalinization: wait until cumulative 30-day GPM rainfall exceeds 200 mm before transplanting rice.",
                        "recommended_crops": "Chỉ xuống giống Lúa ST24/ST25 khi mưa tích lũy > 200 mm và độ mặn nước mặt trảng < 2.0‰."
                    },
                    "5_smap_soil_moisture": {
                        "value": "SMAP sm_surface = 0.39 m³/m³ (Bùn đáy ướt giữ chặt tồn dư thuốc sâu vụ lúa nếu không phơi đáy)",
                        "color_hex": "#0277BD",
                        "color_label": "Xanh biển (Đất trảng ướt bùn giàu mùn giữ tồn dư hóa chất lâu)",
                        "legend_vi": "Sau khi gặt lúa tháng 1, nếu vụ lúa có xịt thuốc sâu Cypermethrin/Abamectin thì hóa chất vẫn bám chặt trong bùn ướt; phải phơi nắng mặt trảng 10–12 ngày mới được thả tôm!",
                        "legend_en": "Wet organic clay sediment strongly adsorbs pyrethroid/abamectin residues from the rice crop; 10–12 days of UV sun-drying is mandatory before stocking shrimp.",
                        "recommended_crops": "Áp dụng Lúa – Tôm sinh thái hữu cơ (chỉ dùng nấm xanh Metarhizium và men vi sinh Bacillus, 0% thuốc sâu hóa học)."
                    },
                    "6_ecostress_esi": {
                        "value": "ECOSTRESS ESI = 0.34 (Trên các ruộng cố làm lúa Đông Xuân muộn tại Trần Đề/Mỹ Xuyên bị nhiễm mặn 2.5‰)",
                        "color_hex": "#C62828",
                        "color_label": "Đỏ (Cảnh báo lúa ngộ độc mặn - Tuyệt đối ngưng rải Kali đỏ KCl & Urê)",
                        "legend_vi": "Khi lúa đang bị ngộ độc mặn (ESI Đỏ), nếu rải thêm phân Kali đỏ (KCl chứa gốc muối Clo) và Urê sẽ rút cạn nước trong rễ làm lúa cháy khô trắng đồng!",
                        "legend_en": "Applying muriate of potash (KCl) or Urea onto salt-stressed rice (ESI < 0.40) intensifies chloride toxicity and kills the crop.",
                        "recommended_crops": "Ngưng phân bón gốc, chỉ phun lá K2SO4 + Silic + Canxi; từ năm sau chuyển sang Lúa – Tôm hoặc 2 Lúa mùa mưa – 1 Màu sớm."
                    },
                    "7_ndvi_bare_soil": {
                        "value": "Chu kỳ kép trên Landsat: MNDWI > 0.25 (Mặt nước nuôi tôm T1–T6) <-> EVI > 0.55 (Thảm lúa xanh T8–T12)",
                        "color_hex": "#039BE5",
                        "color_label": "Xanh lam chuyển Xanh lục theo mùa (Chu trình Tôm – Lúa chuẩn)",
                        "legend_vi": "Bản đồ vệ tinh phân biệt rõ 6 tháng mặt nước nuôi tôm và 5 tháng ruộng lúa xanh mướt; tuyệt đối không bỏ vụ lúa vì rễ lúa giúp hút sạch chất bẩn đáy vuông tôm.",
                        "legend_en": "Distinctive bimodal spectral signature alternating between brackish aquaculture water (MNDWI) and rainfed fragrant rice (EVI).",
                        "recommended_crops": "Giữ vững luân canh 1 vụ Tôm – 1 vụ Lúa (rễ lúa làm sạch đáy ao giúp tôm vụ sau trúng mùa)."
                    },
                    "8_grace_groundwater": {
                        "value": "GRACE-FO lwe_thickness = -14.2 cm, xu thế sụt giảm -3.0 cm/năm do bơm nước ngầm pha loãng nước nuôi tôm và sinh hoạt",
                        "color_hex": "#B71C1C",
                        "color_label": "Đỏ sẫm (Báo động đỏ cạn kiệt nước ngầm & sụt lún đất ven biển)",
                        "legend_vi": "Trữ lượng nước ngầm dưới lòng đất bán đảo Cà Mau – Sóc Trăng đang rút xuống mức báo động đỏ làm mặt đất sụt lún 2–4 cm/năm!",
                        "legend_en": "Critical groundwater depletion (-14.2 cm anomaly) driving land subsidence of 2–4 cm/year across the coastal peninsula.",
                        "recommended_crops": "Không bơm nước ngầm để pha ngọt nuôi tôm hoặc tưới lúa mùa khô; tuân thủ lịch thời vụ thuận thiên theo nước trời."
                    },
                    "9_srtm_elevation": {
                        "value": "NASADEM Cao độ = 0.5–0.8 m, HAND = 0.3 m (Trũng thấp ven biển chịu triều Biển Đông & Biển Tây)",
                        "color_hex": "#0D47A1",
                        "color_label": "Xanh chàm (Vùng trũng thấp ven biển chịu tác động trực tiếp thủy triều)",
                        "legend_vi": "Đất thấp sát mực nước biển (chỉ cao 0.5–0.8 mét) nên rất thuận lợi lấy nước thủy triều nuôi tôm cua nhưng cần bờ vuông cao chống tràn khi triều cường.",
                        "legend_en": "Low coastal plain (0.5–0.8 m elevation) ideal for tidal brackish water exchange in rice-shrimp polders.",
                        "recommended_crops": "Mô hình Lúa thơm ST24/ST25 trên trảng + Tôm sú / Tôm càng xanh / Cua biển dưới mương bao."
                    }
                }
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [104.80, 9.65], [106.25, 9.65], [106.15, 9.10],
                    [104.85, 8.60], [104.70, 9.15], [104.80, 9.65]
                ]]
            }
        },

        # 6. Vùng Đất Giồng Cát Ven Biển (Trà Vinh - Sóc Trăng - Bến Tre)
        {
            "type": "Feature",
            "id": "ZONE_06_COASTAL_SAND_RIDGE",
            "properties": {
                "zone_id": "ZONE_06_COASTAL_SAND_RIDGE",
                "zone_name_vi": "Tiểu vùng Đất Giồng Cát Ven Biển (Trà Vinh - Sóc Trăng - Bến Tre)",
                "zone_name_en": "Coastal Sand Ridge Upland Zone (Tra Vinh - Soc Trang - Ben Tre)",
                "provinces": ["Trà Vinh (Cầu Ngang, Duyên Hải)", "Sóc Trăng (Vĩnh Châu)", "Bến Tre (Ba Tri, Thạnh Phú)"],
                "layers": {
                    "1_soil_type": {
                        "value": "Đất cát pha giồng biển (Arenosols), Sand = 76%, Clay = 8%, SOC = 0.6% (Rất nghèo mùn, thoát nước cực nhanh)",
                        "color_hex": "#F9A825",
                        "color_label": "Vàng nghệ (Đất giồng cát cao ráo nhưng nghèo mùn, mau khô)",
                        "legend_vi": "Đất giồng có tới 76% là cát và rất ít chất mùn (0.6%), nên tưới nước hay rải phân Urê xuống chỉ 2 tiếng sau là nước và phân bị tuột thẳng xuống sâu!",
                        "legend_en": "Coastal sandy ridge soil (76% sand, 0.6% SOC) with extremely low water-holding capacity and rapid nutrient leaching.",
                        "recommended_crops": "Đậu phộng (Lạc), Hành tím Vĩnh Châu, Củ cải, Măng tây xanh, Dưa hấu kết hợp bón Than sinh học (Biochar) & phân ủ hoai."
                    },
                    "2_heat_stress": {
                        "value": "ECOSTRESS LST = 39.4°C (Mặt cát phơi nắng nóng nhất ĐBSCL lúc 13h30), MODIS biên độ nhiệt ngày-đêm = 14.8°C",
                        "color_hex": "#D32F2F",
                        "color_label": "Đỏ rực (Mặt đất cát nóng bỏng gần 40°C vào buổi trưa)",
                        "legend_vi": "Mặt cát trần buổi trưa nắng nóng tới gần 40°C! Nếu bón phân chuồng tươi chưa ủ hoai vào cát nóng sẽ sinh nhiệt đốt cháy rễ hành tím và đậu phộng.",
                        "legend_en": "Exposed sandy surface reaches 39.4°C at midday; applying uncomposted manure generates heat and fungal root rot.",
                        "recommended_crops": "Trồng Đậu phộng bò kín mặt cát + Phủ rơm rạ/màng phủ sinh học và chỉ dùng phân hữu cơ đã ủ hoai với nấm Trichoderma."
                    },
                    "3_cold_frost_risk": {
                        "value": "NASA POWER T2M_MIN = 19.2°C, cát nguội nhanh ban đêm giúp củ hành tím và củ cải phình to",
                        "color_hex": "#4CAF50",
                        "color_label": "Xanh lá (Đêm mát trên đất cát rất hợp cây lấy củ)",
                        "legend_vi": "Đất cát ban đêm nguội nhanh tạo chênh lệch nhiệt độ ngày–đêm lớn, rất thuận lợi kích thích hành tím, củ cải, khoai lang xuống củ chắc và ngọt.",
                        "legend_en": "Rapid nocturnal cooling on sandy ridges promotes bulb/tuber formation in purple shallots, radish, and sweet potato.",
                        "recommended_crops": "Hành tím, Tỏi, Củ cải trắng, Khoai lang, Đậu phộng vụ Đông Xuân."
                    },
                    "4_extreme_rainfall": {
                        "value": "GPM IMERG Mưa lớn mùa mưa > 250 mm/tháng trôi sạch phân bón trên cát nhưng mùa khô chỉ có 5 mm/tháng",
                        "color_hex": "#D7CCC8",
                        "color_label": "Nâu vàng mùa khô / Xanh đậm mùa mưa (Cần thu trữ nước mưa)",
                        "legend_vi": "Mùa mưa nước mưa thấm tuột hết, mùa khô lại không có giọt mưa nào; bà con nên lót bạt HDPE ở góc trũng để hứng trữ nước mưa mùa mưa để dành tưới mùa khô!",
                        "legend_en": "Extreme seasonal rainfall contrast; harvesting wet-season rainwater in HDPE-lined farm ponds is essential for dry-season irrigation.",
                        "recommended_crops": "Chia nhỏ lượng phân bón làm nhiều lần hoặc hòa phân tưới qua dây nhỏ giọt để chống rửa trôi."
                    },
                    "5_smap_soil_moisture": {
                        "value": "SMAP sm_surface = 0.14 m³/m³, sm_rootzone = 0.18 m³/m³ (Mùa khô T2–T4 khô kiệt rất nhanh)",
                        "color_hex": "#E65100",
                        "color_label": "Đỏ cam (Đất cát giữ ẩm kém nhất ĐBSCL)",
                        "legend_vi": "Độ ẩm đất giồng cát mùa nắng tụt xuống mức thấp nhất miền Tây (14%); tưới tràn mặt cát vừa tốn điện vừa bốc hơi mất hết 70% nước.",
                        "legend_en": "Lowest soil moisture retention in the delta (0.14 m³/m³); flood/overhead irrigation loses 70% of water to evaporation and deep percolation.",
                        "recommended_crops": "Lắp dây tưới nhỏ giọt chôn sát gốc kết hợp trồng Đậu phộng, Mè, Măng tây xanh tiết kiệm 70% nước."
                    },
                    "6_ecostress_esi": {
                        "value": "ECOSTRESS ESI = 0.36 (Trên các rẫy bắp/màu tưới giếng khoan bị hụt nước mùa khô)",
                        "color_hex": "#C62828",
                        "color_label": "Đỏ (Cây màu trên giồng cát khát nước gay gắt vào tháng 3–4)",
                        "legend_vi": "Cây bắp và rau màu trồng trên cát trần bị héo rũ buổi trưa; cần bổ sung chất giữ ẩm tự nhiên (than trấu Biochar, mụn dừa, phân trùn quế) vào rãnh trồng.",
                        "legend_en": "Severe midday wilting on unmulched sandy beds; amending planting furrows with rice-husk biochar and coco-peat boosts moisture retention by 40%.",
                        "recommended_crops": "Luân canh Bắp/Hành tím -> Đậu phộng/Đậu xanh vùi thân lá làm phân xanh giữ ẩm."
                    },
                    "7_ndvi_bare_soil": {
                        "value": "Landsat BSI = +0.26 (Phản xạ cát khô rất mạnh khi để đất trống mùa nắng)",
                        "color_hex": "#8D6E63",
                        "color_label": "Nâu sáng (Đất cát trống dễ bị gió chướng thổi bay màu đất)",
                        "legend_vi": "Để mặt giồng cát trống không vào tháng 2–4 sẽ bị gió biển thổi bay hết lớp đất mặt màu mỡ và làm nóng rẫy.",
                        "legend_en": "High Bare Soil Index (BSI +0.26) indicates exposed sand vulnerable to coastal wind erosion and thermal baking.",
                        "recommended_crops": "Trồng cây họ đậu bò sát đất (Đậu phộng, Đậu xanh, Cỏ đậu) giữ chặt lớp cát mặt."
                    },
                    "8_grace_groundwater": {
                        "value": "GRACE-FO lwe_thickness = -13.5 cm, xu thế -3.2 cm/năm (Túi nước ngầm ngọt dưới giồng cát đang cạn kiệt nhanh)",
                        "color_hex": "#B71C1C",
                        "color_label": "Đỏ sẫm (Báo động giếng khoan hụt nước & nhiễm mặn tầng ngầm)",
                        "legend_vi": "Dưới mỗi giồng cát là một túi nước ngọt mỏng nổi trên nền nước mặn; bơm giếng khoan tưới tràn quá mức sẽ hút ngược nước mặn vào làm hỏng giếng vĩnh viễn!",
                        "legend_en": "Freshwater lenses beneath coastal sand ridges are rapidly depleting (-13.5 cm); over-pumping induces irreversible saltwater upconing into wells.",
                        "recommended_crops": "Chuyển đổi sang cây siêu tiết kiệm nước (Đậu phộng, Mè, Măng tây) + Tưới nhỏ giọt + Ao bạt trữ nước mưa."
                    },
                    "9_srtm_elevation": {
                        "value": "NASADEM Cao độ = 2.5–4.0 m, HAND = 2.4 m (Giồng cát cao hình cánh cung ven biển)",
                        "color_hex": "#FFA000",
                        "color_label": "Vàng nâu (Địa hình giồng cao nhất vùng ven biển, không bao giờ ngập lũ)",
                        "legend_vi": "Đất giồng cao từ 2.5 đến 4 mét nên mưa bão không sợ ngập úng, nhưng nước mưa chảy tràn xuống trũng rất nhanh nếu không có bờ giữ nước.",
                        "legend_en": "Elevated coastal beach ridges (2.5–4.0 m) immune to flooding but subject to rapid surface runoff.",
                        "recommended_crops": "Canh tác theo đường đồng mức trên giồng cát, kết hợp đào ao lót bạt ở chân giồng để hứng nước mưa."
                    }
                }
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [106.25, 10.05], [106.70, 10.05], [106.60, 9.45],
                    [106.15, 9.45], [106.25, 10.05]
                ]]
            }
        }
    ]

    return {
        "type": "FeatureCollection",
        "name": "Mekong_Delta_NASA_Interactive_AgroEcological_Layers",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "bbox": [104.5, 8.5, 106.8, 11.0],
        "features": features
    }


def build_charts_timeseries():
    """
    Builds a clean JSON dataset containing 12-month seasonal curves and 5-year historical
    trends for all 9 environmental factors across the Mekong Delta agro-ecological zones
    so the mobile app can render interactive charts when a farmer taps on the map.
    """
    return {
        "metadata": {
            "region": "Mekong Delta, Vietnam (8.5N-11.0N, 104.5E-106.8E)",
            "months_labels_vi": ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
            "years_labels_5y": [2021, 2022, 2023, 2024, 2025]
        },
        "factors_chart_data": {
            "1_soil_type": {
                "chart_type": "radar_and_multiyear_ph_ec_trend",
                "title_vi": "Hồ sơ Lý Hóa Đất & Xu hướng Độ Mặn / Độ Chua 5 năm",
                "unit_primary": "pH & ECe (dS/m)",
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "radar_metrics": {"do_ngot_ph_score": 82, "do_toi_xop_score": 75, "chat_mun_soc_score": 78, "an_toan_man_score": 95},
                        "monthly_salinity_ppt_12m": [0.2, 0.3, 0.5, 0.6, 0.3, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2],
                        "historical_soil_ph_5y": [5.6, 5.5, 5.4, 5.3, 5.3]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "radar_metrics": {"do_ngot_ph_score": 38, "do_toi_xop_score": 60, "chat_mun_soc_score": 85, "an_toan_man_score": 92},
                        "monthly_salinity_ppt_12m": [0.1, 0.2, 0.3, 0.4, 0.3, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
                        "historical_soil_ph_5y": [4.3, 4.2, 4.1, 3.9, 4.0]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "radar_metrics": {"do_ngot_ph_score": 68, "do_toi_xop_score": 65, "chat_mun_soc_score": 92, "an_toan_man_score": 30},
                        "monthly_salinity_ppt_12m": [8.5, 14.0, 18.5, 21.0, 15.0, 6.5, 2.8, 1.5, 1.0, 0.8, 1.2, 4.5],
                        "historical_soil_ph_5y": [5.5, 5.6, 5.5, 5.4, 5.6]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "radar_metrics": {"do_ngot_ph_score": 80, "do_toi_xop_score": 90, "chat_mun_soc_score": 25, "an_toan_man_score": 60},
                        "monthly_salinity_ppt_12m": [1.2, 2.1, 3.2, 3.5, 2.0, 0.8, 0.5, 0.4, 0.4, 0.4, 0.6, 0.9],
                        "historical_soil_ph_5y": [6.3, 6.2, 6.2, 6.1, 6.2]
                    }
                }
            },
            "2_heat_stress": {
                "chart_type": "dual_line_12m_and_hotdays_5y",
                "title_vi": "Nhiệt độ Bề mặt Ruộng (ECOSTRESS LST) & Độ Khô Khí Quyển (VPD)",
                "unit_primary": "°C / kPa",
                "threshold_danger_c": 35.0,
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "monthly_lst_day_c_12m": [31.2, 33.4, 35.8, 36.5, 34.2, 31.8, 30.9, 30.5, 30.2, 30.4, 30.8, 30.6],
                        "monthly_vpd_kpa_12m": [1.45, 1.80, 2.15, 2.30, 1.75, 1.30, 1.20, 1.15, 1.10, 1.15, 1.25, 1.35],
                        "historical_days_gt35c_5y": [28, 31, 42, 54, 46]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "monthly_lst_day_c_12m": [31.0, 33.8, 36.4, 37.5, 34.8, 32.0, 31.0, 29.5, 28.8, 29.0, 29.8, 30.4],
                        "monthly_vpd_kpa_12m": [1.50, 1.85, 2.20, 2.40, 1.80, 1.35, 1.22, 1.12, 1.05, 1.10, 1.20, 1.38],
                        "historical_days_gt35c_5y": [32, 35, 48, 61, 52]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "monthly_lst_day_c_12m": [30.5, 32.0, 34.2, 35.1, 33.5, 31.5, 30.6, 30.2, 29.9, 30.0, 30.2, 30.1],
                        "monthly_vpd_kpa_12m": [1.40, 1.70, 2.05, 2.15, 1.65, 1.28, 1.18, 1.15, 1.10, 1.12, 1.22, 1.32],
                        "historical_days_gt35c_5y": [22, 25, 36, 47, 39]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "monthly_lst_day_c_12m": [32.8, 35.6, 38.9, 39.4, 36.0, 33.2, 32.0, 31.5, 31.0, 31.2, 31.8, 32.0],
                        "monthly_vpd_kpa_12m": [1.55, 1.90, 2.20, 2.35, 1.85, 1.40, 1.28, 1.22, 1.18, 1.20, 1.30, 1.45],
                        "historical_days_gt35c_5y": [40, 44, 58, 72, 63]
                    }
                }
            },
            "3_cold_frost_risk": {
                "chart_type": "diurnal_range_area_12m",
                "title_vi": "Nhiệt độ Tối thiểu Ban Đêm (T2M_MIN) & Biên độ Nhiệt Ngày–Đêm",
                "unit_primary": "°C",
                "threshold_cold_stress_c": 19.0,
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "monthly_tmin_c_12m": [18.5, 20.2, 22.5, 24.5, 25.0, 24.6, 24.2, 24.0, 24.0, 23.8, 22.2, 19.4],
                        "historical_cold_nights_lt19c_5y": [9, 7, 11, 6, 10]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "monthly_tmin_c_12m": [17.5, 19.4, 22.0, 24.2, 24.8, 24.4, 24.0, 23.8, 23.8, 23.5, 21.6, 18.6],
                        "historical_cold_nights_lt19c_5y": [14, 11, 16, 9, 15]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "monthly_tmin_c_12m": [19.0, 20.8, 23.0, 24.8, 25.2, 24.8, 24.5, 24.3, 24.2, 24.0, 22.8, 20.1],
                        "historical_cold_nights_lt19c_5y": [6, 4, 8, 3, 7]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "monthly_tmin_c_12m": [19.2, 20.5, 22.8, 24.6, 25.0, 24.5, 24.2, 24.0, 24.0, 23.8, 22.5, 19.8],
                        "historical_cold_nights_lt19c_5y": [7, 5, 9, 4, 8]
                    }
                }
            },
            "4_extreme_rainfall": {
                "chart_type": "combo_bar_monthly_and_max1d_line",
                "title_vi": "Tổng Lượng Mưa Tháng & Đỉnh Mưa Cực Đoan 1 Ngày (GPM IMERG)",
                "unit_primary": "mm",
                "threshold_desalinization_mm": 200.0,
                "threshold_extreme_1d_mm": 60.0,
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "monthly_rain_sum_mm_12m": [12, 6, 14, 48, 165, 210, 225, 260, 285, 270, 125, 30],
                        "monthly_rx1day_max_mm_12m": [8, 5, 10, 28, 52, 58, 62, 68, 74, 70, 42, 15],
                        "historical_annual_rain_mm_5y": [1720, 1890, 1540, 1480, 1690]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "monthly_rain_sum_mm_12m": [10, 5, 16, 55, 175, 220, 240, 275, 310, 295, 130, 25],
                        "monthly_rx1day_max_mm_12m": [6, 4, 12, 32, 58, 64, 66, 72, 82, 78, 45, 14],
                        "historical_annual_rain_mm_5y": [1780, 1950, 1590, 1510, 1750]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "monthly_rain_sum_mm_12m": [18, 8, 20, 65, 190, 265, 290, 320, 340, 315, 165, 45],
                        "monthly_rx1day_max_mm_12m": [10, 6, 14, 35, 60, 72, 78, 85, 92, 88, 55, 22],
                        "historical_annual_rain_mm_5y": [2150, 2320, 1890, 1810, 2080]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "monthly_rain_sum_mm_12m": [8, 3, 5, 38, 145, 195, 215, 240, 265, 255, 110, 22],
                        "monthly_rx1day_max_mm_12m": [5, 3, 5, 25, 48, 55, 60, 65, 70, 68, 38, 12],
                        "historical_annual_rain_mm_5y": [1520, 1680, 1360, 1290, 1500]
                    }
                }
            },
            "5_smap_soil_moisture": {
                "chart_type": "stacked_area_surface_vs_rootzone_12m",
                "title_vi": "Độ Ẩm Đất Bề Mặt (0–5 cm) vs Tầng Rễ (0–100 cm) từ Vệ tinh SMAP",
                "unit_primary": "m³/m³",
                "optimal_legume_range": [0.20, 0.32],
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "monthly_sm_surface_12m": [0.34, 0.26, 0.21, 0.20, 0.31, 0.37, 0.39, 0.41, 0.42, 0.42, 0.39, 0.36],
                        "monthly_sm_rootzone_12m": [0.36, 0.31, 0.27, 0.25, 0.33, 0.38, 0.40, 0.42, 0.43, 0.43, 0.40, 0.38],
                        "historical_dry_season_min_rz_5y": [0.28, 0.29, 0.26, 0.24, 0.27]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "monthly_sm_surface_12m": [0.36, 0.25, 0.18, 0.16, 0.35, 0.39, 0.41, 0.43, 0.45, 0.45, 0.42, 0.39],
                        "monthly_sm_rootzone_12m": [0.38, 0.30, 0.23, 0.19, 0.36, 0.40, 0.42, 0.44, 0.46, 0.46, 0.43, 0.40],
                        "historical_dry_season_min_rz_5y": [0.22, 0.24, 0.19, 0.16, 0.20]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "monthly_sm_surface_12m": [0.39, 0.35, 0.32, 0.30, 0.34, 0.38, 0.41, 0.43, 0.44, 0.44, 0.42, 0.40],
                        "monthly_sm_rootzone_12m": [0.40, 0.37, 0.34, 0.32, 0.36, 0.39, 0.42, 0.43, 0.44, 0.44, 0.43, 0.41],
                        "historical_dry_season_min_rz_5y": [0.33, 0.34, 0.31, 0.29, 0.32]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "monthly_sm_surface_12m": [0.20, 0.16, 0.14, 0.13, 0.24, 0.28, 0.30, 0.32, 0.33, 0.32, 0.27, 0.22],
                        "monthly_sm_rootzone_12m": [0.24, 0.20, 0.18, 0.17, 0.26, 0.30, 0.32, 0.34, 0.35, 0.34, 0.29, 0.25],
                        "historical_dry_season_min_rz_5y": [0.19, 0.20, 0.17, 0.15, 0.18]
                    }
                }
            },
            "6_ecostress_esi": {
                "chart_type": "early_warning_threshold_line_12m",
                "title_vi": "Chỉ số Căng thẳng Khát nước Cây trồng (ECOSTRESS ESI)",
                "unit_primary": "Tỷ số ET/PET (0.0 - 1.0)",
                "threshold_stress_alert": 0.45,
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "monthly_esi_12m": [0.74, 0.65, 0.48, 0.46, 0.62, 0.76, 0.80, 0.82, 0.81, 0.78, 0.75, 0.76],
                        "historical_min_esi_5y": [0.49, 0.52, 0.45, 0.41, 0.46]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "monthly_esi_12m": [0.76, 0.62, 0.45, 0.40, 0.44, 0.72, 0.78, 0.82, 0.84, 0.82, 0.78, 0.77],
                        "historical_min_esi_5y": [0.44, 0.47, 0.41, 0.36, 0.40]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "monthly_esi_12m": [0.68, 0.42, 0.35, 0.34, 0.50, 0.72, 0.78, 0.83, 0.85, 0.84, 0.79, 0.72],
                        "historical_min_esi_5y": [0.39, 0.42, 0.36, 0.31, 0.34]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "monthly_esi_12m": [0.60, 0.46, 0.36, 0.35, 0.55, 0.68, 0.72, 0.75, 0.76, 0.74, 0.68, 0.62],
                        "historical_min_esi_5y": [0.40, 0.43, 0.37, 0.32, 0.35]
                    }
                }
            },
            "7_ndvi_bare_soil": {
                "chart_type": "phenology_wave_evi_bsi_mndwi_12m",
                "title_vi": "Sóng Mùa Vụ Thực Vật (EVI), Đất Trống (BSI) & Mặt Nước (MNDWI)",
                "unit_primary": "Chỉ số (-1.0 đến +1.0)",
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "monthly_evi_12m": [0.66, 0.58, 0.24, 0.42, 0.62, 0.54, 0.22, 0.45, 0.60, 0.48, 0.26, 0.52],
                        "monthly_bsi_12m": [-0.18, -0.10, 0.18, 0.02, -0.15, -0.08, 0.16, -0.02, -0.14, -0.06, 0.12, -0.08],
                        "historical_peak_evi_5y": [0.71, 0.70, 0.69, 0.67, 0.66]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "monthly_evi_12m": [0.68, 0.60, 0.22, 0.28, 0.48, 0.62, 0.35, 0.18, 0.15, 0.16, 0.28, 0.54],
                        "monthly_bsi_12m": [-0.20, -0.12, 0.20, 0.24, -0.04, -0.15, 0.05, -0.25, -0.32, -0.30, -0.10, -0.12],
                        "historical_peak_evi_5y": [0.70, 0.69, 0.67, 0.64, 0.62]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "monthly_evi_12m": [0.21, 0.15, 0.12, 0.12, 0.14, 0.18, 0.28, 0.45, 0.62, 0.65, 0.58, 0.35],
                        "monthly_mndwi_water_12m": [0.25, 0.32, 0.35, 0.34, 0.30, 0.22, 0.15, 0.08, -0.05, -0.08, -0.02, 0.12],
                        "historical_peak_evi_5y": [0.61, 0.63, 0.64, 0.63, 0.65]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "monthly_evi_12m": [0.48, 0.38, 0.22, 0.20, 0.35, 0.46, 0.50, 0.52, 0.54, 0.48, 0.42, 0.46],
                        "monthly_bsi_12m": [-0.02, 0.12, 0.26, 0.28, 0.10, -0.02, -0.05, -0.06, -0.08, -0.04, 0.02, -0.01],
                        "historical_peak_evi_5y": [0.55, 0.54, 0.52, 0.50, 0.51]
                    }
                }
            },
            "8_grace_groundwater": {
                "chart_type": "multiyear_anomaly_bar_and_seasonal_curve",
                "title_vi": "Biến động Trữ lượng Nước Ngọt & Nước Ngầm (GRACE / GRACE-FO)",
                "unit_primary": "cm (Bề dày lớp nước tương đương lwe_thickness)",
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "monthly_lwe_cm_12m": [1.5, -3.2, -6.5, -8.5, -4.0, 1.2, 4.8, 8.5, 11.2, 12.0, 8.2, 4.5],
                        "historical_dry_season_lwe_cm_5y": [-4.5, -3.0, -6.8, -9.5, -8.5]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "monthly_lwe_cm_12m": [2.2, -2.8, -5.8, -7.5, -3.2, 2.5, 6.8, 12.0, 15.8, 16.4, 11.5, 6.0],
                        "historical_dry_season_lwe_cm_5y": [-3.8, -2.2, -5.5, -8.2, -5.8]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "monthly_lwe_cm_12m": [-4.5, -8.8, -12.5, -14.2, -9.5, -4.2, 0.5, 3.8, 6.2, 6.8, 2.5, -1.5],
                        "historical_dry_season_lwe_cm_5y": [-8.2, -7.5, -11.4, -15.0, -14.2]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "monthly_lwe_cm_12m": [-4.0, -8.2, -11.8, -13.5, -8.8, -3.5, 1.0, 4.2, 6.5, 7.0, 3.0, -1.0],
                        "historical_dry_season_lwe_cm_5y": [-7.5, -6.8, -10.8, -14.2, -13.5]
                    }
                }
            },
            "9_srtm_elevation": {
                "chart_type": "cross_section_elevation_vs_water_level",
                "title_vi": "Mặt cắt Cao độ Ruộng (NASADEM) so với Mực Nước Đỉnh Lũ / Triều Cường",
                "unit_primary": "m (so với mực nước biển trung bình)",
                "zones": {
                    "ZONE_01_ALLUVIAL_FRESHWATER": {
                        "field_elevation_m": 1.4,
                        "hand_above_canal_m": 1.1,
                        "dike_crest_m": 2.6,
                        "monthly_canal_water_level_m_12m": [0.6, 0.4, 0.3, 0.3, 0.5, 0.8, 1.1, 1.5, 1.9, 2.1, 1.6, 1.0]
                    },
                    "ZONE_02_ACID_SULFATE_DTM": {
                        "field_elevation_m": 0.8,
                        "hand_above_canal_m": 0.4,
                        "dike_crest_m": 2.8,
                        "monthly_canal_water_level_m_12m": [0.5, 0.3, 0.2, 0.2, 0.5, 0.9, 1.4, 2.1, 2.6, 2.7, 2.0, 1.1]
                    },
                    "ZONE_05_COASTAL_RICE_SHRIMP": {
                        "field_elevation_m": 0.6,
                        "hand_above_canal_m": 0.3,
                        "dike_crest_m": 1.6,
                        "monthly_canal_water_level_m_12m": [0.7, 0.6, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 1.2, 0.9]
                    },
                    "ZONE_06_COASTAL_SAND_RIDGE": {
                        "field_elevation_m": 3.2,
                        "hand_above_canal_m": 2.4,
                        "dike_crest_m": 3.5,
                        "monthly_canal_water_level_m_12m": [0.6, 0.5, 0.4, 0.4, 0.6, 0.8, 0.9, 1.1, 1.3, 1.5, 1.3, 0.9]
                    }
                }
            }
        }
    }


def build_spatial_ai_training_examples():
    """
    Builds 10 spatial AI training examples teaching the AI Assistant how to interpret
    a farmer's map tap (coordinates + active_map_layer + farmer's crop/fertilizer/pesticide)
    and explain the map color, chart trend, and 3 crop rotation options in simple
    Vietnamese and English.
    """
    return [
        # Example 1: Soil Type Layer Tap (Dong Thap Muoi Acid Sulfate)
        {
            "example_id": "MAP_TAP_01_SOIL_ACID_SULFATE",
            "map_tap_event": {
                "lat": 10.612,
                "lon": 105.955,
                "zone_id": "ZONE_02_ACID_SULFATE_DTM",
                "active_map_layer": "1_soil_type",
                "tapped_color_hex": "#8E24AA",
                "tapped_color_name": "Tím cam (Purple-Orange)",
                "month": 3,
                "farmer_profile": {
                    "current_crop": "Lúa Đông Xuân vừa gặt (Just harvested Winter-Spring Rice)",
                    "fertilizer_used": "Urê, DAP",
                    "pesticide_used": "Thuốc trừ cỏ Butachlor, thuốc ốc Niclosamide"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Bà con vừa chạm vào vùng màu Tím cam (#8E24AA) ở Tân Thạnh (Long An): Đây là vùng đất có tầng sinh phèn tiềm tàng nằm ngay dưới sâu 40 cm (pH chỉ đạt 3.9–4.1). Biểu đồ 5 năm bên dưới cho thấy mỗi khi phơi đất quá khô vào tháng 3–4, độ chua pH lại tụt sâu hơn; nếu lúc này bà con cày lật sâu và bón phân DAP sẽ bị sắt/nhôm trong phèn khóa chặt làm mất 80% tác dụng của phân!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Phơi ruộng khô kiệt rồi sạ lúa Hè Thu): Rủi ro xì phèn cực nặng khi mưa đầu mùa tháng 5 đổ xuống làm thối đen rễ lúa.",
                    "2. Luân canh cải tạo đất & cố định đạm (Trồng Đậu xanh / Đậu nành phủ rơm không cày sâu): Tận dụng độ ẩm tầng rễ 30% để nuôi đậu và 'nhốt' tầng phèn dưới sâu không cho tiếp xúc oxy, đồng thời bổ sung 50 kg đạm tự nhiên/ha.",
                    "3. Luân canh tiết kiệm nước & thích ứng BĐKH (2 vụ Lúa + 1 vụ Sen hoặc Xả lũ nuôi cá): Giữ mặt đất luôn ngập ẩm ém phèn và đón phù sa rửa chua tự nhiên vào mùa lũ."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "You tapped a Purple-Orange zone (#8E24AA) in Tan Thanh (Long An), indicating shallow Acid Sulfate Soil (pH 3.9–4.1). The 5-year chart shows worsening acidification after dry-season droughts; deep plowing now will oxidize subsurface pyrite into sulfuric acid, and applying DAP fertilizer will result in 80% phosphate fixation by toxic Fe/Al ions.",
                "rotation_options": [
                    "1. Status Quo (Deep plow, sun-bake, and sow Summer-Autumn Rice): High risk of acute acid flush in May causing root necrosis.",
                    "2. Soil-Improving Legume Rotation (Zero-till Mungbean/Soybean with rice straw mulch): Uses residual moisture while keeping the pyrite layer sealed from oxygen, fixing 50 kg N/ha.",
                    "3. Water-Saving Climate Adaptation (2 Rice crops + Lotus or Floodplain Aquaculture): Maintains soil saturation to suppress acid generation and flushes toxins naturally."
                ]
            }
        },

        # Example 2: Heat Stress Layer Tap (An Giang Chili/Watermelon)
        {
            "example_id": "MAP_TAP_02_HEAT_STRESS_LST",
            "map_tap_event": {
                "lat": 10.538,
                "lon": 105.402,
                "zone_id": "ZONE_01_ALLUVIAL_FRESHWATER",
                "active_map_layer": "2_heat_stress",
                "tapped_color_hex": "#D32F2F",
                "tapped_color_name": "Đỏ rực (Bright Red)",
                "month": 4,
                "farmer_profile": {
                    "current_crop": "Ớt chỉ thiên đang ra bông (Flowering Chili Pepper)",
                    "fertilizer_used": "NPK 16-16-16, Kali đỏ (KCl)",
                    "pesticide_used": "Thuốc nấm gốc Đồng (Copper Hydroxide), Imidacloprid"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Vị trí rẫy của bà con ở Chợ Mới đang hiện màu Đỏ rực (#D32F2F) trên bản đồ Nhiệt độ ECOSTRESS vì mặt đất buổi trưa đã vọt lên 38.2°C và biểu đồ đường đôi cho thấy độ khô không khí (VPD = 2.45 kPa) vượt vạch báo động suốt 5 ngày liền! Phun thuốc nấm gốc Đồng và phân bón lá lúc nắng nóng này sẽ làm cháy táp cánh hoa và rụng bông hàng loạt.",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Trồng tiếp ớt chuyên canh và phun thuốc gốc Đồng): Nguy cơ rụng > 50% bông và bùng phát bệnh héo xanh vi khuẩn khi có mưa dông chuyển mùa.",
                    "2. Luân canh cải tạo đất & cố định đạm (Trồng Bắp ngọt xen Đậu phộng/Đậu xanh): Tán bắp và đậu che mát mặt đất giúp hạ nhiệt độ mặt liếp 4–5°C, phục hồi vi sinh vật đất đã bị thuốc gốc Đồng tiêu diệt.",
                    "3. Luân canh tiết kiệm nước & thích ứng BĐKH (Đưa 1 vụ Lúa nước vào mùa mưa tới): Ngâm nước rửa sạch muối phân NPK tích tụ và diệt 90% vi khuẩn héo xanh trong đất."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "Your field in Cho Moi displays Bright Red (#D32F2F) on the ECOSTRESS Heat Stress layer (midday LST 38.2°C) and the dual-line chart shows atmospheric VPD exceeding 2.45 kPa for 5 consecutive days. Spraying Copper Hydroxide or foliar fertilizers in this heat causes severe flower abortion and leaf scorching.",
                "rotation_options": [
                    "1. Status Quo (Continuous chili monoculture with copper sprays): High risk of >50% blossom drop and bacterial wilt outbreak.",
                    "2. Soil-Improving Legume Rotation (Sweet Corn intercropped with Peanut/Mungbean): Shades the soil to lower LST by 4–5°C and restores beneficial microbes.",
                    "3. Water-Saving Climate Adaptation (Rotate with 1 season of Paddy Rice in the wet season): Floods the soil to leach accumulated fertilizer salts and eradicate aerobic bacterial wilt."
                ]
            }
        },

        # Example 3: Cold/Frost Risk Layer Tap (Winter-Spring Rice Booting Stage)
        {
            "example_id": "MAP_TAP_03_COLD_NIGHT_RISK",
            "map_tap_event": {
                "lat": 10.745,
                "lon": 105.525,
                "zone_id": "ZONE_02_ACID_SULFATE_DTM",
                "active_map_layer": "3_cold_frost_risk",
                "tapped_color_hex": "#1E88E5",
                "tapped_color_name": "Xanh đậm (Deep Blue)",
                "month": 1,
                "farmer_profile": {
                    "current_crop": "Lúa Đông Xuân đang làm đòng 50 ngày (Booting Winter-Spring Rice)",
                    "fertilizer_used": "Đang tính rải thúc nhiều Urê đón đòng",
                    "pesticide_used": "Tricyclazole (ngừa đạo ôn)"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Bản đồ Cảnh báo Lạnh đêm đang hiện màu Xanh đậm (#1E88E5) tại Tam Nông vì nhiệt độ ban đêm tụt xuống 17.5°C kèm sương mù dày, tạo ra dải biên độ nhiệt Ngày–Đêm rộng tới 14°C trên biểu đồ! Nếu bà con rải thừa phân Urê lúc trời lạnh và nhiều sương mù này, lá lúa sẽ mềm yếu làm nấm đạo ôn bùng phát mạnh và bông lúa bị nghẹt đòng không trổ thoát được!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Bón nặng Urê và rút cạn nước ruộng): Lúa dễ bị lạnh gốc, trổ nghẹt và nhiễm đạo ôn cổ bông nặng.",
                    "2. Canh tác bảo vệ & Luân canh cải tạo đất (Giữ nước ấm 5–7 cm ban đêm, giảm Urê tăng Kali/Canxi-Silic; vụ Xuân Hè chuyển sang Đậu nành): Nước ruộng giữ ấm gốc lúa qua đêm lạnh, còn vụ đậu kế tiếp giúp cắt mầm bệnh đạo ôn.",
                    "3. Luân canh thích ứng tiết lạnh (Trồng Rau màu ưa mát vụ Tết như Dưa hấu, Bắp nếp, Cải trên chân ruộng gò cao): Tận dụng tiết lạnh đêm tháng Chạp để cây màu kết trái ngọt và bán giá cao dịp Tết."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "The Cold Night Risk map shows Deep Blue (#1E88E5) in Tam Nong as nighttime lows drop to 17.5°C with heavy morning fog and a 14°C diurnal range on the chart. Applying excess Urea now will make rice leaves succulent and highly vulnerable to neck blast fungus and cold-induced panicle choking.",
                "rotation_options": [
                    "1. Status Quo (Heavy Urea topdressing with shallow water): High risk of panicle choking and severe rice blast infection.",
                    "2. Protective Management & Legume Rotation (Maintain 5–7 cm water depth at night as a thermal buffer, apply K + Ca-Si, then rotate to Soybean in Spring-Summer): Protects booting rice from cold shock and breaks blast disease cycles.",
                    "3. Climate-Adapted Cool-Season Rotation (Grow Watermelon, Waxy Corn, or Brassicas on higher terraces): Capitalizes on cool January nights for high-value Tet market produce."
                ]
            }
        },

        # Example 4: Extreme Rainfall Layer Tap (Ca Mau Rice-Shrimp Desalinization)
        {
            "example_id": "MAP_TAP_04_GPM_RAINFALL_DESALINIZATION",
            "map_tap_event": {
                "lat": 9.355,
                "lon": 105.095,
                "zone_id": "ZONE_05_COASTAL_RICE_SHRIMP",
                "active_map_layer": "4_extreme_rainfall",
                "tapped_color_hex": "#4FC3F7",
                "tapped_color_name": "Xanh nhạt (Light Blue - Chưa đủ ngưỡng rửa mặn)",
                "month": 6,
                "farmer_profile": {
                    "current_crop": "Vừa thu hoạch Tôm, chuẩn bị sạ Lúa ST24 (Transitioning from Shrimp to Rice)",
                    "fertilizer_used": "Vôi CaCO3, Lân nung chảy",
                    "pesticide_used": "Men vi sinh Bacillus (Không dùng thuốc hóa học)"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Vuông tôm-lúa của bà con ở Thới Bình (Cà Mau) mới chỉ hiện màu Xanh nhạt (#4FC3F7) trên bản đồ mưa GPM, và đường tích lũy trên biểu đồ 30 ngày mới đạt 115 mm — vẫn nằm dưới vạch chuẩn rửa mặn 200 mm! Do đất sét mặn còn ngậm nhiều muối sau 6 tháng nuôi tôm, nếu bà con vội gieo sạ lúa ngay tuần này thì khi gặp nắng hạn Bà Chằng mặn sẽ xì lên làm chết mạ non!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Gieo sạ thẳng Lúa ST24 ngay trong tháng 6): Nguy cơ chết giống 60–80% do mưa chưa đủ rửa mặn tầng đất mặt.",
                    "2. Cải tạo rửa mặn & Gieo mạ cấy (Bón Vôi + Lân đẩy muối Na+, chờ biểu đồ mưa GPM vượt vạch 200 mm vào cuối tháng 7 rồi đem mạ khỏe ra cấy): Đảm bảo lúa sống 95% và tận dụng lớp bùn tôm giảm 60% phân hóa học.",
                    "3. Luân canh/Xen canh thích ứng BĐKH (Thả ghép Tôm càng xanh trong mương bao cùng Lúa ST24): Tôm càng xanh chịu được nước lợ nhạt (2–6‰), ăn hết sâu rầy giúp lúa sạch bệnh và tăng gấp đôi thu nhập."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "Your field in Thoi Binh (Ca Mau) shows Light Blue (#4FC3F7) on the GPM Rainfall map, and the 30-day cumulative curve on the chart is at 115 mm—well below the 200 mm desalinization threshold. Sowing rice now risks severe seedling mortality when residual salt wicks up during mid-season dry spells.",
                "rotation_options": [
                    "1. Status Quo (Direct-seed ST24 rice immediately in June): 60–80% seedling mortality risk from residual soil salinity.",
                    "2. Gypsum/Lime Desalinization & Transplanting (Apply CaCO3 + fused magnesium phosphate, wait until the GPM chart crosses 200 mm in late July, and transplant nursery seedlings): Ensures >95% survival and cuts chemical fertilizer by 60%.",
                    "3. Climate-Resilient Co-Culture (Stock Giant Freshwater Prawns in perimeter trenches alongside ST24 Rice): Prawns thrive in légèrement brackish water (2–6‰), control rice pests naturally, and double farm income."
                ]
            }
        },

        # Example 5: Extreme Rainfall Downpour Warning (Vinh Long Sweet Potato / Rice)
        {
            "example_id": "MAP_TAP_05_GPM_EXTREME_STORM",
            "map_tap_event": {
                "lat": 10.095,
                "lon": 105.762,
                "zone_id": "ZONE_01_ALLUVIAL_FRESHWATER",
                "active_map_layer": "4_extreme_rainfall",
                "tapped_color_hex": "#AD1457",
                "tapped_color_name": "Tím hồng (Magenta - Mưa dông cực đoan)",
                "month": 8,
                "farmer_profile": {
                    "current_crop": "Khoai lang tím vừa thu hoạch, định trồng tiếp Khoai vụ 3",
                    "fertilizer_used": "Urê, DAP, NPK 20-20-15",
                    "pesticide_used": "Thuốc trị sùng khoai Diazinon, nấm Metalaxyl"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Bản đồ Mưa GPM đang phát cảnh báo màu Tím hồng (#AD1457) tại Bình Tân (Vĩnh Long) và biểu đồ cột báo hiệu có những trận mưa cực đoan vượt vạch đỏ 65 mm/ngày! Rải phân Urê/NPK hay lên luống trồng khoai lang lúc đất đã sũng nước này sẽ bị mưa rửa trôi mất 70% tiền phân, củ khoai bị thối nhũn và thuốc trị sùng tồn dư bị tràn ra mương rạch!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Lên luống trồng tiếp Khoai lang vụ 3): Nguy cơ ngập rãnh thối dây khoai và sùng hà đục hỏng > 50% củ.",
                    "2. Luân canh cải tạo đất & cắt dịch hại (Chuyển sang trồng 1 vụ Lúa nước Thu Đông): Ngâm nước ruộng lúa làm chết ngạt 100% ổ sùng khoai lang và cây lúa sẽ hút sạch lượng phân Lân/NPK còn dư từ vụ khoai trước.",
                    "3. Canh tác thích ứng mưa lớn (Trồng Đậu tương rau trên liếp cao phủ màng hoặc Xả lũ đón phù sa 45 ngày): Chống rửa trôi phân bón và làm sạch mầm bệnh trong đất trước vụ Đông Xuân."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "The GPM Rainfall layer highlights Binh Tan (Vinh Long) in Magenta (#AD1457), with the bar chart showing extreme daily downpours exceeding 65 mm/day. Planting a 3rd consecutive sweet potato crop or broadcasting Urea/NPK now will result in 70% fertilizer runoff, tuber rot, and weevil pesticide leaching.",
                "rotation_options": [
                    "1. Status Quo (Plant a 3rd consecutive Sweet Potato crop): High risk of waterlogging rot and >50% sweet potato weevil damage.",
                    "2. Soil-Cleansing Rotation (Switch to 1 season of Autumn-Winter Paddy Rice): Flooding the field drowns 100% of soil-borne weevils and utilizes residual NPK from previous vegetable crops.",
                    "3. Storm-Resilient Adaptation (Plastic-mulched Vegetable Soybean on high beds or 45-day silt-trapping fallow): Prevents nutrient runoff and sanitizes the soil for Winter-Spring."
                ]
            }
        },

        # Example 6: SMAP Soil Moisture Layer Tap (Can Tho Residual Moisture for Legumes)
        {
            "example_id": "MAP_TAP_06_SMAP_ROOTZONE_MOISTURE",
            "map_tap_event": {
                "lat": 10.062,
                "lon": 105.558,
                "zone_id": "ZONE_01_ALLUVIAL_FRESHWATER",
                "active_map_layer": "5_smap_soil_moisture",
                "tapped_color_hex": "#C0CA33",
                "tapped_color_name": "Vàng xanh (Yellow-Green)",
                "month": 3,
                "farmer_profile": {
                    "current_crop": "Lúa OM18 vừa gặt xong (Post-harvest OM18 Rice)",
                    "fertilizer_used": "Urê, DAP, Kali đỏ",
                    "pesticide_used": "Thuốc trừ cỏ Quinclorac + Pretilachlor"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Ruộng của bà con ở Thới Lai (Cần Thơ) đang hiện màu Vàng xanh (#C0CA33) trên bản đồ Độ ẩm đất SMAP: Biểu đồ 2 tầng đất cho thấy lớp đất mặt (0–5 cm) đã ráo (21%) nhưng tầng đất sâu nuôi rễ (0–100 cm) vẫn còn giữ ẩm 27%! Lượng ẩm này nếu bơm nước sạ lúa sẽ rất thiếu và tốn dầu bơm, nhưng lại là 'độ ẩm vàng' để tỉa đậu xanh hoặc đậu nành mà không cần tưới đợt đầu — chỉ cần lưu ý xử lý tồn dư thuốc cỏ Quinclorac trước khi gieo!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Bơm nước sạ tiếp Lúa vụ 2): Tốn gấp đôi chi phí bơm nước và dễ bị ngộ độc hữu cơ do rơm rạ tươi ngập nước lúc nắng nóng.",
                    "2. Luân canh cải tạo đất & cố định đạm (Cày phơi 12 ngày + bón Vôi/Trichoderma khử thuốc cỏ Quinclorac rồi tỉa Đậu xanh/Đậu nành): Tận dụng 100% ẩm tầng rễ SMAP, tiết kiệm 65% nước và trả lại 60 kg đạm tự nhiên/ha cho đất.",
                    "3. Luân canh siêu tiết kiệm nước (Gieo Mè/Vừng hoặc Bắp phủ rơm rạ): Lớp rơm giữ chặt độ ẩm 27% dưới tầng rễ suốt mùa nắng hạn tháng 3–4."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "Your field in Thoi Lai (Can Tho) is Yellow-Green (#C0CA33) on the SMAP Soil Moisture map: the 2-layer chart shows dry surface soil (0.21 m³/m³) but 0.27 m³/m³ moisture in the 0–100 cm root zone. This is insufficient for flooded rice without heavy pumping, but ideal for residual-moisture legumes—provided you detoxify Quinclorac herbicide residues first.",
                "rotation_options": [
                    "1. Status Quo (Pump water for a 2nd Rice crop): High pumping costs and organic acid toxicity from decomposing straw.",
                    "2. Soil-Improving Legume Rotation (12-day sun aeration + Lime/Trichoderma to degrade Quinclorac, then sow Mungbean/Soybean): Captures SMAP root-zone moisture, saves 65% water, and fixes 60 kg N/ha.",
                    "3. Drought-Tolerant Mulched Rotation (Sesame or Maize with rice-straw mulch): Locks in root-zone moisture through the peak dry season."
                ]
            }
        },

        # Example 7: ECOSTRESS ESI Layer Tap (Tien Giang Durian Salinity/Root Stress)
        {
            "example_id": "MAP_TAP_07_ECOSTRESS_ESI_ALERT",
            "map_tap_event": {
                "lat": 10.385,
                "lon": 106.115,
                "zone_id": "ZONE_03_ORCHARD_ESTUARINE",
                "active_map_layer": "6_ecostress_esi",
                "tapped_color_hex": "#C62828",
                "tapped_color_name": "Đỏ (Red Alert)",
                "month": 2,
                "farmer_profile": {
                    "current_crop": "Sầu riêng Ri6 đang mang trái non (Fruiting Durian Orchard)",
                    "fertilizer_used": "NPK 12-12-17, Lân tạo mầm",
                    "pesticide_used": "Paclobutrazol tồn dư gốc, thuốc sâu nhũ dầu EC"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Bản đồ Chỉ số Khát nước ECOSTRESS ESI tại vườn sầu riêng Cai Lậy của bà con đã chuyển sang màu Đỏ (#C62828) và đường biểu đồ 8 tuần đang cắm xuống mức 0.41 (dưới vạch báo động 0.45)! Điều này có nghĩa là bộ rễ cám của sầu riêng đã bị tồn dư thuốc Paclobutrazol và nước tưới chớm nhiễm mặn làm nghẹt rễ không hút nước lên làm mát lá được nữa; nếu tiếp tục xịt thuốc sâu nhũ dầu (EC) sẽ làm rụng trái non hàng loạt chỉ trong tuần tới!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Để mặt liếp trống, tưới nước mương chưa đo độ mặn và phun thuốc EC): Nguy cơ cháy lá, rụng 50–80% trái non và chết nhánh.",
                    "2. Xen canh thảm che phủ cố định đạm & Giải độc rễ (Trồng Cỏ lạc dại/Đậu xanh phủ kín mặt liếp + Tưới Humic & Vôi Dolomite): Hạ nhiệt mặt liếp 4°C, phân giải Paclobutrazol và giúp rễ tơ phục hồi.",
                    "3. Thích ứng hạn mặn khẩn cấp (Đo độ mặn nước < 0.3‰ trước khi tưới, thả lục bình giữ ngọt mương vườn, đổi thuốc EC sang SC/WG phun chiều mát): Giữ ẩm tiểu khí hậu vườn và cứu đợt trái non."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "The ECOSTRESS ESI layer over your Cai Lay durian orchard is Red (#C62828), with the 8-week trend line dropping to 0.41. Even before leaf-tip burn is visible, your trees are suffering hidden root stress from Paclobutrazol residue and low-level salinity; spraying EC-formulated pesticides now will trigger massive fruitlet drop.",
                "rotation_options": [
                    "1. Status Quo (Bare soil beds, unmonitored canal irrigation, EC sprays): 50–80% fruit drop and branch dieback risk.",
                    "2. Cover-Crop Intercropping & Root Detox (Plant Arachis pintoi/Mungbean living mulch + apply Humic acid & Dolomite lime): Lowers bed temperature by 4°C, degrades Paclobutrazol, and regenerates feeder roots.",
                    "3. Emergency Salinity & Microclimate Adaptation (Verify irrigation water <0.3‰, cover storage ditches with water hyacinth, switch EC to SC/WG sprays after 16:30): Protects fruit set through peak drought."
                ]
            }
        },

        # Example 8: Landsat/MODIS NDVI & Bare Soil / Water Layer Tap (Bac Lieu Rice-Shrimp Transition)
        {
            "example_id": "MAP_TAP_08_LANDSAT_MNDWI_RICE_SHRIMP",
            "map_tap_event": {
                "lat": 9.425,
                "lon": 105.455,
                "zone_id": "ZONE_05_COASTAL_RICE_SHRIMP",
                "active_map_layer": "7_ndvi_bare_soil",
                "tapped_color_hex": "#8D6E63",
                "tapped_color_name": "Nâu sáng chuyển Xanh lam (Post-harvest Wet Mud to Shrimp Water)",
                "month": 1,
                "farmer_profile": {
                    "current_crop": "Vừa gặt Lúa ST25, chuẩn bị lấy nước mặn thả Tôm sú",
                    "fertilizer_used": "NPK 20-20-15, Urê",
                    "pesticide_used": "Xịt thuốc sâu Cypermethrin + Abamectin cách đây 3 tuần"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Trên bản đồ Sức khỏe thực vật & Đất trống Landsat, vuông của bà con ở Phước Long (Bạc Liêu) vừa chuyển sang màu Nâu sáng (#8D6E63 - vừa gặt lúa xong) và biểu đồ Sóng mùa vụ cho thấy sắp bước vào chu kỳ mặt nước nuôi tôm (MNDWI tăng). Tuy nhiên, vì bà con vừa xịt thuốc sâu Cypermethrin và Abamectin cách đây 3 tuần trên nền bùn sét ướt, nếu lấy nước vào thả tôm ngay mà không phơi đáy sẽ làm tôm giống ngộ độc thần kinh chết rải rác!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Bơm nước mặn vào thả tôm giống ngay lập tức): Nguy cơ hao hụt 70–100% tôm giống do tồn dư Cypermethrin/Abamectin và khí độc H2S từ gốc rạ tươi.",
                    "2. Quy trình Cải tạo đáy Quang phân hủy & Vi sinh (Cắt sát gốc rạ, phơi nắng mặt trảng 12 ngày cho tia UV phân hủy thuốc sâu + Ngâm xả vôi CaCO3 + Đánh vi sinh Bacillus & Thả thử giai tôm 48h): Đảm bảo tỷ lệ sống của tôm > 85%.",
                    "3. Chuyển đổi sang Lúa – Tôm Sinh thái Hữu cơ (Vụ lúa năm tới dùng 100% Nấm xanh Metarhizium và phân hữu cơ vi sinh thay cho thuốc hóa học): Xóa bỏ hoàn toàn rủi ro ngộ độc tôm và bán lúa-tôm giá cao hơn 20%."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "On the Landsat Phenology map, your polder in Phuoc Long (Bac Lieu) shows Light Brown (#8D6E63, post-rice harvest) transitioning toward the shrimp-water phase on the 12-month curve. Because Cypermethrin and Abamectin were sprayed 3 weeks ago, their residues remain bound to the wet clay mud and will kill shrimp post-larvae if flooded immediately.",
                "rotation_options": [
                    "1. Status Quo (Flood immediately and stock shrimp post-larvae): 70–100% shrimp mortality risk from pyrethroid toxicity and H2S gas.",
                    "2. UV Photodegradation & Probiotic Pond Prep (Sun-dry the platform for 12 days, flush with CaCO3 lime, inoculate Bacillus probiotics, and run a 48-hour net-cage bioassay): Achieves >85% shrimp survival.",
                    "3. Organic Rice-Shrimp Transition (Replace chemical insecticides with Metarhizium bio-fungi in the next rice crop): Eliminates chemical carry-over and qualifies for a 20% organic price premium."
                ]
            }
        },

        # Example 9: GRACE Groundwater Depletion Layer Tap (Tra Vinh Coastal Sand Ridge)
        {
            "example_id": "MAP_TAP_09_GRACE_GROUNDWATER_DEPLETION",
            "map_tap_event": {
                "lat": 9.785,
                "lon": 106.445,
                "zone_id": "ZONE_06_COASTAL_SAND_RIDGE",
                "active_map_layer": "8_grace_groundwater",
                "tapped_color_hex": "#B71C1C",
                "tapped_color_name": "Đỏ sẫm (Dark Red - Báo động cạn nước ngầm)",
                "month": 3,
                "farmer_profile": {
                    "current_crop": "Bắp nếp & Hành tím tưới bằng giếng khoan",
                    "fertilizer_used": "Urê, NPK 16-16-8, phân chuồng chưa hoai",
                    "pesticide_used": "Emamectin benzoate, thuốc cỏ Pendimethalin"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Vùng giồng cát Cầu Ngang (Trà Vinh) của bà con đang hiện màu Đỏ sẫm (#B71C1C) trên bản đồ Nước ngầm GRACE-FO, và biểu đồ xu hướng đa năm cho thấy túi nước ngọt dưới lòng đất đã sụt giảm tới -13.5 cm (tốc độ cạn -3.2 cm/năm)! Nếu tiếp tục bơm giếng khoan tưới tràn trên nền đất cát 76% nghèo mùn, nước và phân Urê sẽ tuột mất 70%, đồng thời nước mặn xung quanh sẽ bị hút ngược vào làm hỏng vĩnh viễn giếng khoan!",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Khoan giếng sâu hơn để bơm tưới tràn và bón phân chuồng tươi): Làm mặn hóa túi nước ngầm, cháy rễ hành tím do phân tươi sinh nhiệt và mất 70% phân đạm.",
                    "2. Luân canh tạo đệm mùn giữ nước & cố định đạm (Trồng Đậu phộng / Lạc phủ rơm + Bón Than trấu Biochar & Phân chuồng ủ hoai nấm Trichoderma): Giữ ẩm đất cát tăng thêm 40%, hạ nhiệt mặt cát 6°C và cố định 60 kg đạm/ha.",
                    "3. Canh tác siêu tiết kiệm nước thích ứng BĐKH (Trồng Mè / Măng tây xanh + Lắp tưới nhỏ giọt hòa phân + Đào ao lót bạt HDPE trữ nước mưa mùa mưa): Giảm 70% lượng nước hút từ giếng khoan và tăng hiệu suất phân bón lên 85%."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "Your coastal sand ridge in Cau Ngang (Tra Vinh) shows Dark Red (#B71C1C) on the GRACE-FO Groundwater map, with the multi-year trend chart plunging to -13.5 cm (-3.2 cm/year). Flood-irrigating 76% sandy soil from boreholes wastes 70% of water and Urea fertilizer while drawing saltwater into the freshwater lens.",
                "rotation_options": [
                    "1. Status Quo (Drill deeper wells for flood irrigation and apply raw manure): Causes irreversible borehole salinization and root burn.",
                    "2. Moisture-Retaining Legume & Biochar Rotation (Plant Peanut/Mungbean with straw mulch + rice-husk Biochar & Trichoderma-composted manure): Boosts sand water retention by 40%, cools soil by 6°C, and fixes 60 kg N/ha.",
                    "3. Groundwater-Saving Adaptation (Grow Sesame/Asparagus with subsurface drip fertigation + HDPE rainwater harvesting pond): Cuts groundwater pumping by 70% and raises fertilizer efficiency to 85%."
                ]
            }
        },

        # Example 10: SRTM/NASADEM Elevation & Flood Risk Layer Tap (Dong Thap / Kien Giang Low Basin)
        {
            "example_id": "MAP_TAP_10_SRTM_ELEVATION_FLOOD_PROFILE",
            "map_tap_event": {
                "lat": 10.745,
                "lon": 105.525,
                "zone_id": "ZONE_02_ACID_SULFATE_DTM",
                "active_map_layer": "9_srtm_elevation",
                "tapped_color_hex": "#0D47A1",
                "tapped_color_name": "Xanh chàm (Indigo Blue - Trũng ngập sâu)",
                "month": 7,
                "farmer_profile": {
                    "current_crop": "Lúa Hè Thu sắp gặt, đang phân vân có nên sạ tiếp Lúa vụ 3 (Thu Đông)",
                    "fertilizer_used": "NPK 16-16-8, Urê tăng 25% do đất bạc màu",
                    "pesticide_used": "Tricyclazole, Pymetrozine (trị rầy nâu)"
                }
            },
            "ai_response_vi": {
                "map_color_and_chart_explanation": "Ruộng của bà con đang nằm trong vùng màu Xanh chàm (#0D47A1) trên bản đồ Độ cao NASADEM: Biểu đồ Mặt cắt Địa hình cho thấy mặt ruộng chỉ cao 0.8 mét (cao hơn mặt kênh có 0.4 mét), trong khi đường mực nước lũ tháng 9–10 dự báo dâng cao tới 2.6 mét! Làm lúa vụ 3 đóng đê bao kín suốt 6 năm đã làm đất kiệt quệ phù sa, tốn thêm 25% phân thuốc mà lại đối mặt nguy cơ ngập úng và dịch rầy nâu rất lớn.",
                "rotation_options": [
                    "1. Giữ nguyên hiện trạng (Đóng cống bơm tát sạ tiếp Lúa vụ 3 Thu Đông): Tốn kém chi phí bơm tiêu úng, lúa dễ đổ ngã và bùng phát đạo ôn, rầy nâu.",
                    "2. Luân canh phục hồi độ phì thuận thiên (2 vụ Lúa -> Mở cống Xả lũ đón phù sa + Nuôi Cá/Tôm càng xanh mùa nước nổi T8–T11): Nhận miễn phí 3–5 tấn phù sa giàu dinh dưỡng/ha, rửa sạch phèn và diệt sạch chuột, cỏ dại, giúp vụ Đông Xuân kế tiếp giảm 40% phân thuốc.",
                    "3. Luân canh 2 Lúa – 1 Màu ngắn ngày trước lũ (Lúa Đông Xuân -> Đậu nành/Mè vụ Xuân Hè thu hoạch trước tháng 6 -> Đón lũ sớm): Vừa có đạm sinh học từ rễ đậu, vừa né được hoàn toàn rủi ro lũ sớm làm ngập lúa Hè Thu."
                ]
            },
            "ai_response_en": {
                "map_color_and_chart_explanation": "Your paddy is in the Indigo Blue zone (#0D47A1) on the NASADEM Elevation map: the Cross-Section Profile chart shows your field elevation is only 0.8 m (HAND 0.4 m above canal), while peak Sep–Oct flood levels reach 2.6 m. Continuous triple-rice inside closed dikes has starved the soil of natural silt, requiring 25% more fertilizer while facing high flood and brown planthopper risks.",
                "rotation_options": [
                    "1. Status Quo (Pump water and sow 3rd-season Autumn-Winter Rice inside closed dikes): High pumping costs, lodging risk, and severe pest/blast pressure.",
                    "2. Nature-Based Floodplain Rotation (2 Rice crops -> Open sluices for seasonal flood silt deposition & Floodplain Fish/Prawn culture in Aug–Nov): Gains 3–5 tons/ha of free nutrient-rich silt, flushes acidity, drowns weeds/rodents, and cuts next season's fertilizer by 40%.",
                    "3. Pre-Flood Legume Rotation (Winter-Spring Rice -> Spring-Summer Soybean/Sesame harvested by June -> Early flood retention): Combines biological nitrogen fixation with zero flood-damage risk."
                ]
            }
        }
    ]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Generate mekong_interactive_layers.geojson
    geojson_data = build_geojson()
    geojson_path = os.path.join(OUTPUT_DIR, "mekong_interactive_layers.geojson")
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Generated {geojson_path} ({len(geojson_data['features'])} agro-ecological zones, 9 layers each)")

    # 2. Generate mekong_charts_timeseries.json
    charts_data = build_charts_timeseries()
    charts_path = os.path.join(OUTPUT_DIR, "mekong_charts_timeseries.json")
    with open(charts_path, "w", encoding="utf-8") as f:
        json.dump(charts_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Generated {charts_path} ({len(charts_data['factors_chart_data'])} environmental chart series)")

    # 3. Generate mekong_spatial_ai_training.jsonl
    training_data = build_spatial_ai_training_examples()
    training_path = os.path.join(OUTPUT_DIR, "mekong_spatial_ai_training.jsonl")
    with open(training_path, "w", encoding="utf-8") as f:
        for record in training_data:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(f"[OK] Generated {training_path} ({len(training_data)} spatial AI training examples)")


if __name__ == "__main__":
    main()
