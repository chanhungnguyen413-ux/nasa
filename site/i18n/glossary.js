// Plain-language explanations shown when a term is clicked.

export const GLOSSARY = {
  vi: {
    ndvi: {
      title: 'NDVI – Chỉ số thực vật',
      short: 'Đo độ xanh và sức khỏe của cây từ ảnh vệ tinh, trên thang từ −1 đến 1. Càng cao, lá càng dày và khỏe.',
      detail: ['Dưới 0,2: đất trống', '0,2–0,4: cây thưa hoặc yếu', '0,4–0,6: khá', 'Trên 0,6: dày và khỏe'],
      source: 'Vệ tinh MODIS của NASA',
    },
    moisture: {
      title: 'Độ ẩm đất',
      short: 'Lượng nước có trong lớp đất mặt. Chế độ Demo tính theo % thể tích đất; chế độ NASA trực tiếp tính theo % bão hòa.',
      detail: ['Dưới ngưỡng cây cần: nên tưới', 'Thấp hơn nhiều: cần tưới ngay', 'Trên ngưỡng: chưa cần tưới'],
      source: 'Vệ tinh SMAP / NASA POWER',
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
      detail: ['Tiết kiệm khoảng 30–50% nước so với tưới tràn', 'Ít bốc hơi, ít cỏ dại'],
    },
    sprinkler: {
      title: 'Tưới phun mưa',
      short: 'Nước được phun thành hạt nhỏ như mưa, phủ đều lên luống rau.',
      detail: ['Hợp với rau màu trồng dày', 'Nên tưới lúc mát để giảm bốc hơi'],
    },
    smap: {
      title: 'SMAP',
      short: 'Soil Moisture Active Passive – vệ tinh của NASA chuyên đo độ ẩm đất.',
      detail: ['Đo bằng sóng vi ba nên nhìn xuyên được mây', 'Đo lại toàn Trái Đất mỗi 2–3 ngày', 'Ô lưới khoảng 9 km'],
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
      detail: ['Mạnh nhất khoảng 11:00–15:00', 'Tưới lúc chiều tối giữ nước trong đất lâu hơn'],
    },
  },
  en: {
    ndvi: {
      title: 'NDVI – Vegetation index',
      short: 'Measures how green and healthy plants are from satellite images, on a scale from −1 to 1. Higher means denser, healthier leaves.',
      detail: ['Below 0.2: bare soil', '0.2–0.4: sparse or weak plants', '0.4–0.6: fair', 'Above 0.6: dense and healthy'],
      source: "NASA's MODIS instrument",
    },
    moisture: {
      title: 'Soil moisture',
      short: 'How much water is in the top layer of soil. Demo mode uses % of soil volume; Live NASA mode uses % of saturation.',
      detail: ['Below what the crop needs: should water', 'Far below: water now', 'Above: no watering needed'],
      source: "NASA's SMAP satellite / NASA POWER",
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
      detail: ['Uses about 30–50% less water than flooding', 'Less evaporation and fewer weeds'],
    },
    sprinkler: {
      title: 'Sprinkler irrigation',
      short: 'Water is sprayed in fine drops like rain, covering vegetable beds evenly.',
      detail: ['Suits densely planted vegetables', 'Water when it is cool to reduce evaporation'],
    },
    smap: {
      title: 'SMAP',
      short: "Soil Moisture Active Passive – NASA's satellite that measures soil moisture.",
      detail: ['Uses microwaves, so it sees through clouds', 'Covers the whole Earth every 2–3 days', 'Grid cells of about 9 km'],
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
      detail: ['Strongest around 11:00–15:00', 'Watering at dusk keeps water in the soil longer'],
    },
  },
}
