// Answers built from the dashboard numbers, used when the AI model is not
// reachable (no API key, offline, or an error). Keeps the chat useful in any demo.

import { T } from '../i18n/strings.js'
import { bannerText, dayLabel, fmt } from './adviceText.js'

export function fallbackAnswer(question, { farm, plans, selectedText }, lang) {
  const q = question.toLowerCase()
  const t = T[lang]
  const vi = lang === 'vi'
  const crop = t.crops[farm.crop].toLowerCase()
  const driest = [...farm.plots].sort((a, b) => a.moisture - b.moisture)[0]
  const wettest = [...farm.plots].sort((a, b) => b.moisture - a.moisture)[0]
  const rainDay = farm.forecast?.find((f) => f.rain >= 10)
  const rainText = rainDay ? dayLabel(rainDay.date, lang) : null
  const has = (...words) => words.some((w) => q.includes(w))

  if (has('bón', 'phân', 'fertil')) {
    const dry = farm.avg.moisture < farm.need
    return vi
      ? `${dry ? `Đất đang khô (${farm.avg.moisture}% so với mức ${farm.need}% ${crop} cần), nên chưa bón phân: rễ khó hút và dễ bị cháy lá. Hãy tưới trước, bón sau 1–2 ngày khi đất đủ ẩm.` : 'Độ ẩm đất đang đủ, có thể bón phân.'}${rainText ? ` Tránh bón ngay trước đợt mưa lớn ${rainText} để phân không bị rửa trôi.` : ''} Nếu cần liều lượng cụ thể, hãy hỏi cán bộ khuyến nông địa phương.`
      : `${dry ? `The soil is dry (${farm.avg.moisture}% vs the ${farm.need}% ${crop} needs), so hold off on fertiliser: roots can't take it up and leaves may burn. Water first, then fertilise 1–2 days later.` : 'Soil moisture is adequate, so fertilising is fine.'}${rainText ? ` Avoid fertilising right before the heavy rain on ${rainText}, or it will wash away.` : ''} For exact doses, ask your local extension officer.`
  }

  if (has('vì sao', 'tại sao', 'why', 'khô hơn', 'drier')) {
    return vi
      ? `Thửa ${driest.id} khô nhất (${driest.moisture}%), còn thửa ${wettest.id} ẩm nhất (${wettest.moisture}%). Chênh lệch thường do vị trí xa cống, đất giữ nước kém hơn, hoặc ống tưới bị rò. NDVI thửa ${driest.id} là ${fmt(driest.ndvi, lang)}, thấp hơn các thửa khác, cho thấy cây đã bắt đầu thiếu nước. Nên kiểm tra ống nhỏ giọt và bờ ruộng ở thửa này trước.`
      : `Plot ${driest.id} is the driest (${driest.moisture}%) and plot ${wettest.id} the wettest (${wettest.moisture}%). Gaps like this usually come from distance to the gate, soil that holds less water, or a leaking line. Plot ${driest.id}'s NDVI is ${fmt(driest.ndvi, lang)}, lower than the others, so the plants are starting to feel it. Check its drip lines and bunds first.`
  }

  if (has('mưa', 'rain', 'dự báo', 'forecast', 'thời tiết', 'weather')) {
    return vi
      ? `48 giờ tới dự báo ${farm.weather.rain48h} mm mưa. ${rainText ? `Đợt mưa lớn đầu tiên dự kiến ${rainText} (${rainDay.rain} mm).` : 'Chưa thấy đợt mưa lớn nào trong 7 ngày tới.'} Nhiệt độ cao nhất hôm nay khoảng ${farm.weather.tMax}°C.`
      : `${farm.weather.rain48h} mm of rain is forecast in the next 48 hours. ${rainText ? `The first heavy rain is expected ${rainText} (${rainDay.rain} mm).` : 'No heavy rain in the next 7 days.'} Today's high is about ${farm.weather.tMax}°C.`
  }

  if (has('ndvi', 'xanh', 'green', 'khỏe', 'health')) {
    return vi
      ? `NDVI trung bình là ${fmt(farm.avg.ndvi, lang)}: ${farm.avg.ndvi >= 0.6 ? 'cây xanh và khỏe' : 'cây đang yếu đi'}. NDVI đo độ xanh của lá từ ảnh vệ tinh MODIS; trên 0,6 là tốt. Thửa ${driest.id} thấp nhất với ${fmt(driest.ndvi, lang)}.`
      : `Average NDVI is ${fmt(farm.avg.ndvi, lang)}: ${farm.avg.ndvi >= 0.6 ? 'plants are green and healthy' : 'plants are weakening'}. NDVI measures leaf greenness from MODIS satellite images; above 0.6 is good. Plot ${driest.id} is lowest at ${fmt(driest.ndvi, lang)}.`
  }

  if (has('hạn', 'drought')) {
    return vi
      ? `Rủi ro hạn hán đang ở mức ${t.droughtLevels[farm.level]} (${farm.level + 1}/5): ${farm.weather.dryDays} ngày chưa có mưa, nắng tới ${farm.weather.tMax}°C, độ ẩm trung bình ${farm.avg.moisture}% so với mức ${farm.need}% cần.`
      : `Drought risk is ${t.droughtLevels[farm.level]} (${farm.level + 1}/5): ${farm.weather.dryDays} days without rain, highs of ${farm.weather.tMax}°C, average moisture ${farm.avg.moisture}% vs ${farm.need}% needed.`
  }

  if (has('tưới', 'water', 'irrigat', 'tối nay', 'tonight')) {
    return `${bannerText(plans, farm, lang)}. ${selectedText.summary}`
  }

  return vi
    ? `Tóm tắt hôm nay: ${bannerText(plans, farm, lang)}. Bạn có thể hỏi về tưới nước, mưa, NDVI, hạn hán hoặc bón phân.`
    : `Today in short: ${bannerText(plans, farm, lang)}. You can ask about watering, rain, NDVI, drought or fertiliser.`
}

/** Compact snapshot of the dashboard for the AI model's instructions. */
export function assistantContext({ farm, plans, source, provinceName }) {
  return {
    mode: source === 'live' ? `live NASA POWER data, ${provinceName}` : 'demo farm (simulated data)',
    crop: farm.crop,
    moistureUnit: farm.unit === 'sat' ? '% saturation (GWETTOP)' : '% volumetric',
    cropNeeds: farm.need,
    dataDate: farm.dataDate,
    averages: farm.avg,
    droughtLevel: `${farm.level + 1}/5`,
    weather: farm.weather,
    plots: farm.plots.map((p) => ({ id: p.id, moisture: p.moisture, ndvi: p.ndvi, droughtLevel: p.level + 1 })),
    forecast: farm.forecast,
    todaysPlan: plans.map((p) => ({ plot: p.plot.id, action: p.type, minutes: p.type === 'water' ? p.minutes : 0, at: '18:00' })),
    ndviSimulated: farm.ndviSimulated,
  }
}
