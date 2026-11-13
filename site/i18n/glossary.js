// Plain-language explanations shown when a term is clicked.

export const GLOSSARY = {
  vi: {
    ndvi: {
      title: 'NDVI – Chỉ số thực vật',
      short: 'Đo độ xanh và sức khỏe của cây từ ảnh vệ tinh, trên thang từ −1 đến 1. Càng cao, lá càng dày và khỏe.',
      detail: [
        'Dưới 0,2: đất trống',
        '0,2–0,4: cây thưa hoặc yếu',
        '0,4–0,6: khá',
        'Trên 0,6: dày và khỏe',
        'Dải mùa vụ coi NDVI dưới 0,3 là ruộng trống hoặc ngập (ngưỡng nhóm chọn; nước cũng cho NDVI thấp)',
      ],
      source: 'Vệ tinh MODIS của NASA',
    },
    moisture: {
      title: 'Độ ẩm đất',
      short: 'Lượng nước có trong lớp đất mặt. Chế độ Demo tính theo % thể tích đất; chế độ NASA trực tiếp tính theo % bão hòa.',
      detail: ['Dưới ngưỡng cây cần: nên tưới', 'Thấp hơn nhiều: cần tưới ngay', 'Trên ngưỡng: chưa cần tưới'],
      source: 'NASA POWER (ước tính mô hình, không phải số đo vệ tinh SMAP)',
    },
    drought: {
      title: 'Rủi ro hạn hán',
      short: 'Khả năng ruộng bị thiếu nước trong 1–2 tuần tới, tính từ độ ẩm đất, số ngày không mưa, dự báo mưa và nhiệt độ.',
      detail: ['5 mức: Thấp → Trung bình → Trung bình - Cao → Cao → Rất cao', 'Từ mức Trung bình - Cao: nên tưới tiết kiệm và theo dõi hằng ngày'],
      source: 'Tổng hợp từ NASA và dự báo thời tiết',
    },
    drip: {
      title: 'Tưới nhỏ giọt',
      short: 'Nước chảy chậm qua ống có lỗ nhỏ, thấm thẳng xuống gốc cây thay vì làm ngập cả ruộng.',
      detail: ['Ít bốc hơi, ít cỏ dại'],
    },
    sprinkler: {
      title: 'Tưới phun mưa',
      short: 'Nước được phun thành hạt nhỏ như mưa, phủ đều lên luống rau.',
      detail: ['Hợp với rau màu trồng dày', 'Nên tưới lúc mát để giảm bốc hơi'],
    },
    smap: {
      title: 'SMAP',
      short: 'Soil Moisture Active Passive – vệ tinh của NASA chuyên đo độ ẩm đất.',
      detail: ['Đo bằng sóng vi ba nên nhìn xuyên được mây', 'Đo lại toàn Trái Đất mỗi 2–3 ngày', 'Ô lưới khoảng 9 km', 'Bản này chưa dùng dữ liệu SMAP'],
    },
    modis: {
      title: 'MODIS',
      short: 'Máy chụp ảnh trên hai vệ tinh Terra và Aqua của NASA, dùng để tính NDVI.',
      detail: ['Chụp toàn cầu mỗi 1–2 ngày', 'NDVI có độ phân giải 250 m', 'Ảnh tổng hợp 16 ngày để loại bỏ mây'],
    },
    power: {
      title: 'NASA POWER',
      short: 'Dịch vụ miễn phí của NASA cung cấp số liệu thời tiết và độ ẩm đất hằng ngày cho nông nghiệp, ở bất kỳ tọa độ nào.',
      detail: ['Dựa trên mô hình MERRA-2 kết hợp số liệu vệ tinh', 'Ô lưới khoảng 50 km', 'Thường trễ vài ngày so với hôm nay'],
    },
    saturation: {
      title: 'Độ bão hòa đất',
      short: 'Đất đang chứa bao nhiêu phần trăm lượng nước tối đa nó có thể giữ. 100% là đất ngập nước.',
      detail: ['NASA POWER gọi là GWETTOP (lớp đất mặt)', 'Lúa nước cần độ bão hòa cao hơn cây trồng cạn'],
    },
    forecast: {
      title: 'Dự báo thời tiết',
      short: 'Dự báo mưa và nhiệt độ 7 ngày tới. Nếu sắp có mưa lớn, nên chờ mưa thay vì tưới.',
      detail: ['Chế độ NASA trực tiếp dùng dự báo miễn phí của Open-Meteo', 'Chế độ Demo dùng dự báo mẫu'],
    },
    et: {
      title: 'Bốc thoát hơi nước',
      short: 'Nước mất đi khi bay hơi từ mặt đất và từ lá cây.',
      detail: [
        'Mạnh nhất khoảng 11:00–15:00',
        'Tưới lúc chiều tối giữ nước trong đất lâu hơn',
        '“Nhu cầu nước” của cây trong phần luân canh là lượng bốc thoát hơi nước của cây trong cả vụ',
      ],
      source: 'FAO-56; FAO Training Manual 3',
    },
    rotation: {
      title: 'Luân canh',
      short: 'Trồng lần lượt các loại cây khác nhau trên cùng một thửa qua các vụ, thay vì trồng mãi một loại.',
      detail: [
        'Ví dụ: lúa – đậu xanh – lúa thay cho lúa – lúa – lúa',
        'Thí nghiệm 10 năm ở Cai Lậy (Tiền Giang): luân canh với cây màu cải thiện đất và tăng năng suất lúa 32–36%',
        'Trang này so sánh bốn kiểu, nhưng không thay thế ý kiến của nông dân và cán bộ khuyến nông',
      ],
      source: 'Linh et al. 2014',
    },
    legume: {
      title: 'Cây họ đậu',
      short: 'Nhóm cây có quả dạng đậu, như đậu xanh, đậu nành, đậu phộng. Rễ có nốt sần chứa vi khuẩn có ích.',
      detail: ['Vi khuẩn trong nốt sần giúp cây cố định đạm', 'Trong trang này, cây họ đậu là đậu xanh'],
      source: 'FAO, Soils and pulses',
    },
    nfix: {
      title: 'Cố định đạm',
      short: 'Vi khuẩn trong nốt sần ở rễ cây họ đậu biến khí đạm (N₂) trong không khí thành dạng đạm cây dùng được.',
      detail: [
        'Một phần lượng đạm này còn lại cho cây trồng vụ sau',
        'Trang này chưa có số liệu cho biết bớt được bao nhiêu phân đạm ở ĐBSCL',
      ],
      source: 'FAO, Soils and pulses',
    },
  },
  en: {
    ndvi: {
      title: 'NDVI – Vegetation index',
      short: 'Measures how green and healthy plants are from satellite images, on a scale from −1 to 1. Higher means denser, healthier leaves.',
      detail: [
        'Below 0.2: bare soil',
        '0.2–0.4: sparse or weak plants',
        '0.4–0.6: fair',
        'Above 0.6: dense and healthy',
        'The season strip treats NDVI below 0.3 as bare or flooded (the team’s threshold; water also gives low NDVI)',
      ],
      source: "NASA's MODIS instrument",
    },
    moisture: {
      title: 'Soil moisture',
      short: 'How much water is in the top layer of soil. Demo mode uses % of soil volume; Live NASA mode uses % of saturation.',
      detail: ['Below what the crop needs: should water', 'Far below: water now', 'Above: no watering needed'],
      source: 'NASA POWER (model estimate, not a SMAP satellite measurement)',
    },
    drought: {
      title: 'Drought risk',
      short: 'The chance the field runs short of water in the next 1–2 weeks, from soil moisture, days without rain, the rain forecast and temperature.',
      detail: ['5 levels: Low → Moderate → Medium–High → High → Severe', 'From Medium–High: water efficiently and check daily'],
      source: 'Combined from NASA data and the weather forecast',
    },
    drip: {
      title: 'Drip irrigation',
      short: 'Water flows slowly through pipes with small holes, straight to the roots, instead of flooding the whole field.',
      detail: ['Less evaporation and fewer weeds'],
    },
    sprinkler: {
      title: 'Sprinkler irrigation',
      short: 'Water is sprayed in fine drops like rain, covering vegetable beds evenly.',
      detail: ['Suits densely planted vegetables', 'Water when it is cool to reduce evaporation'],
    },
    smap: {
      title: 'SMAP',
      short: "Soil Moisture Active Passive – NASA's satellite that measures soil moisture.",
      detail: ['Uses microwaves, so it sees through clouds', 'Covers the whole Earth every 2–3 days', 'Grid cells of about 9 km', 'This version does not use SMAP data yet'],
    },
    modis: {
      title: 'MODIS',
      short: "A camera on NASA's Terra and Aqua satellites, used to calculate NDVI.",
      detail: ['Images the whole planet every 1–2 days', 'NDVI at 250 m resolution', '16-day composites remove clouds'],
    },
    power: {
      title: 'NASA POWER',
      short: 'A free NASA service giving daily weather and soil moisture data for agriculture at any coordinates.',
      detail: ['Built on the MERRA-2 model combined with satellite data', 'Grid cells of about 50 km', 'Usually a few days behind today'],
    },
    saturation: {
      title: 'Soil saturation',
      short: 'How full of water the soil is, as a percentage of the most it can hold. 100% means waterlogged.',
      detail: ['NASA POWER calls it GWETTOP (topsoil)', 'Paddy rice needs higher saturation than dry-land crops'],
    },
    forecast: {
      title: 'Weather forecast',
      short: 'Rain and temperature for the next 7 days. If heavy rain is coming, wait for it instead of watering.',
      detail: ['Live NASA mode uses the free Open-Meteo forecast', 'Demo mode uses a sample forecast'],
    },
    et: {
      title: 'Evapotranspiration',
      short: 'Water lost as it evaporates from the soil and from plant leaves.',
      detail: [
        'Strongest around 11:00–15:00',
        'Watering at dusk keeps water in the soil longer',
        'A crop’s “water need” in the rotation section is its evapotranspiration over the whole season',
      ],
      source: 'FAO-56; FAO Training Manual 3',
    },
    rotation: {
      title: 'Crop rotation',
      short: 'Growing different crops one after another on the same plot across seasons, instead of always the same crop.',
      detail: [
        'Example: rice – mung bean – rice instead of rice – rice – rice',
        '10-year trial at Cai Lậy (Tiền Giang): rotating with upland crops improved the soil and raised rice yield 32–36%',
        'This page compares four rotations but does not replace farmers and extension officers',
      ],
      source: 'Linh et al. 2014',
    },
    legume: {
      title: 'Legume',
      short: 'Plants that grow pods, such as mung bean, soybean and peanut. Their roots carry nodules with helpful bacteria.',
      detail: ['The bacteria in the nodules let the plant fix nitrogen', 'On this page, the legume is mung bean'],
      source: 'FAO, Soils and pulses',
    },
    nfix: {
      title: 'Nitrogen fixation',
      short: 'Bacteria in the root nodules of legumes turn nitrogen gas (N₂) from the air into a form plants can use.',
      detail: [
        'Part of this nitrogen is left for the next crop',
        'This page has no data on how much nitrogen fertiliser it saves in the Mekong Delta',
      ],
      source: 'FAO, Soils and pulses',
    },
  },
}
