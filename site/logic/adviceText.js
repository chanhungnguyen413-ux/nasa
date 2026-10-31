// Turns an engine plan into plain words in the viewer's language.

import { T } from '../i18n/strings.js'

export const fmt = (n, lang, digits = 2) =>
  n.toLocaleString(T[lang].locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export function dayLabel(isoDate, lang) {
  const d = new Date(`${isoDate}T00:00:00`)
  return `${T[lang].weekday[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

const METHOD = {
  vi: { drip: { noun: 'tưới nhỏ giọt', verb: 'Tưới nhỏ giọt', term: 'drip' }, sprinkler: { noun: 'tưới phun mưa', verb: 'Tưới phun mưa', term: 'sprinkler' } },
  en: { drip: { noun: 'drip irrigation', verb: 'Drip irrigate', term: 'drip' }, sprinkler: { noun: 'sprinkler irrigation', verb: 'Run sprinklers on', term: 'sprinkler' } },
}

export const methodInfo = (method, lang) => METHOD[lang][method]

export function adviceText(plan, farm, lang) {
  const t = T[lang]
  const { plot, minutes } = plan
  const crop = t.crops[farm.crop]
  const cropLower = lang === 'vi' ? crop.toLowerCase() : crop.toLowerCase()
  const unit = farm.unit === 'sat' ? (lang === 'vi' ? '% bão hòa' : '% saturation') : '%'
  const m = `${plot.moisture}${unit}`
  const need = `${farm.need}${unit}`
  const risk = t.droughtLevels[farm.level]
  const ndvi = fmt(plot.ndvi, lang)
  const time = hhmm(plan.start)
  const meth = methodInfo(plan.method, lang)
  const { dryDays, tMax, rain48h } = farm.weather
  const rainDay = plan.nextRain ? dayLabel(plan.nextRain.date, lang) : null
  const nextCheck = lang === 'vi' ? 'khi có số liệu vệ tinh mới' : 'when new satellite data arrives'

  if (lang === 'vi') {
    if (plan.type === 'fine') {
      return {
        headline: `Thửa ${plot.id} chưa cần tưới`,
        summary: `Độ ẩm ${m} vẫn trên mức ${need} mà ${cropLower} cần. Kiểm tra lại sau 2 ngày để tiết kiệm nước.`,
        reasons: [
          { icon: 'drop', text: `Độ ẩm thửa ${plot.id} là ${m}, cao hơn mức ${need}.` },
          { icon: 'leaf', text: `NDVI ${ndvi}: cây ${plot.ndvi >= 0.6 ? 'khỏe' : 'cần theo dõi thêm'}.` },
          { icon: 'sun', text: `Rủi ro hạn hán: ${risk}.` },
        ],
        steps: ['Không mở van hôm nay.', `Kiểm tra lại độ ẩm sau 2 ngày hoặc ${nextCheck}.`],
      }
    }
    if (plan.type === 'wait') {
      return {
        headline: `Chưa tưới thửa ${plot.id}: chờ mưa ${rain48h} mm`,
        summary: `Dự báo có khoảng ${rain48h} mm mưa trong 48 giờ tới, đủ bù phần thiếu. Nếu mưa không tới, tưới ${minutes} phút lúc ${time} ngày mai.`,
        reasons: [
          { icon: 'drop', text: `Thửa ${plot.id} còn ${m}, dưới mức ${need} ${cropLower} cần.` },
          { icon: 'cloud', text: `Dự báo mưa ${rain48h} mm trong 48 giờ tới.`, term: 'forecast' },
          { icon: 'sun', text: `Rủi ro hạn hán: ${risk}.` },
        ],
        steps: ['Khơi thông rãnh thoát nước để tránh úng khi mưa lớn.', `Sáng mai xem lại dự báo; nếu không mưa, tưới ${minutes} phút lúc ${time}.`],
      }
    }
    return {
      headline: `${meth.verb} thửa ${plot.id} trong ${minutes} phút, lúc ${time} chiều nay`,
      summary:
        farm.level >= 2
          ? `Độ ẩm đất thấp và rủi ro hạn hán tăng. Khuyên dùng: ${meth.noun} ${minutes} phút vào lúc ${time} chiều nay để tiết kiệm nước.`
          : `Độ ẩm đất thấp hơn mức ${cropLower} cần. Khuyên dùng: ${meth.noun} ${minutes} phút vào lúc ${time} chiều nay.`,
      reasons: [
        { icon: 'drop', text: `Thửa ${plot.id} chỉ còn ${m}, dưới mức ${need} mà ${cropLower} cần (cả ruộng trung bình ${farm.avg.moisture}${unit}).` },
        {
          icon: 'sun',
          text: dryDays > 0 ? `Rủi ro hạn hán ${risk}: ${dryDays} ngày chưa có mưa, nắng nóng tới ${tMax}°C.` : `Rủi ro hạn hán ${risk}, nắng tới ${tMax}°C.`,
        },
        { icon: 'leaf', text: `NDVI ${ndvi}: ${plot.ndvi >= 0.6 ? 'cây vẫn khỏe, tưới ngay giúp giữ năng suất.' : 'cây bắt đầu yếu đi, nên tưới sớm.'}` },
        {
          icon: 'cloud',
          text: `48 giờ tới gần như không mưa (${rain48h} mm)${rainDay ? `; mưa lớn dự kiến ${rainDay}.` : '.'}`,
          term: 'forecast',
        },
        { icon: 'clock', text: `Tưới lúc ${time} tránh giờ bốc hơi mạnh nhất (11:00–15:00).`, term: 'et' },
      ],
      steps: [
        plan.method === 'sprinkler'
          ? `Kiểm tra béc phun ở thửa ${plot.id}: phun đều, không nghẹt.`
          : `Kiểm tra ống nhỏ giọt ở thửa ${plot.id}: không tắc, không rò.`,
        `Mở van lúc ${time}, tưới ${minutes} phút rồi đóng van.`,
        `Sáng mai xem lại độ ẩm đất ${nextCheck}.`,
      ],
    }
  }

  if (plan.type === 'fine') {
    return {
      headline: `Plot ${plot.id} doesn't need water yet`,
      summary: `Moisture is ${m}, still above the ${need} ${cropLower} needs. Check again in 2 days to save water.`,
      reasons: [
        { icon: 'drop', text: `Plot ${plot.id} is at ${m}, above ${need}.` },
        { icon: 'leaf', text: `NDVI ${ndvi}: plants ${plot.ndvi >= 0.6 ? 'are healthy' : 'need watching'}.` },
        { icon: 'sun', text: `Drought risk: ${risk}.` },
      ],
      steps: ["Don't open the valve today.", `Check moisture again in 2 days or ${nextCheck}.`],
    }
  }
  if (plan.type === 'wait') {
    return {
      headline: `Hold off on plot ${plot.id}: ${rain48h} mm of rain is coming`,
      summary: `About ${rain48h} mm of rain is forecast in the next 48 hours, enough to cover the shortfall. If it doesn't come, water for ${minutes} minutes at ${time} tomorrow.`,
      reasons: [
        { icon: 'drop', text: `Plot ${plot.id} is at ${m}, below the ${need} ${cropLower} needs.` },
        { icon: 'cloud', text: `${rain48h} mm of rain forecast in the next 48 hours.`, term: 'forecast' },
        { icon: 'sun', text: `Drought risk: ${risk}.` },
      ],
      steps: ['Clear the drainage channels so heavy rain does not flood the plot.', `Check the forecast tomorrow morning; if no rain, water ${minutes} minutes at ${time}.`],
    }
  }
  return {
    headline: `${meth.verb} plot ${plot.id} for ${minutes} minutes at ${time} this evening`,
    summary:
      farm.level >= 2
        ? `Soil moisture is low and drought risk is rising. Recommended: ${meth.noun} for ${minutes} minutes at ${time} this evening to save water.`
        : `Soil moisture is below what ${cropLower} needs. Recommended: ${meth.noun} for ${minutes} minutes at ${time} this evening.`,
    reasons: [
      { icon: 'drop', text: `Plot ${plot.id} is down to ${m}, below the ${need} ${cropLower} needs (farm average ${farm.avg.moisture}${unit}).` },
      {
        icon: 'sun',
        text: dryDays > 0 ? `Drought risk is ${risk}: no rain for ${dryDays} days, heat up to ${tMax}°C.` : `Drought risk is ${risk}, highs of ${tMax}°C.`,
      },
      { icon: 'leaf', text: `NDVI ${ndvi}: ${plot.ndvi >= 0.6 ? 'plants are still healthy, so watering now protects the yield.' : 'plants are starting to weaken; water soon.'}` },
      {
        icon: 'cloud',
        text: `Almost no rain in the next 48 hours (${rain48h} mm)${rainDay ? `; heavy rain expected ${rainDay}.` : '.'}`,
        term: 'forecast',
      },
      { icon: 'clock', text: `Watering at ${time} avoids the hours of strongest evaporation (11:00–15:00).`, term: 'et' },
    ],
    steps: [
      plan.method === 'sprinkler'
        ? `Check the sprinkler heads in plot ${plot.id}: even spray, no clogs.`
        : `Check the drip lines in plot ${plot.id}: no blockages, no leaks.`,
      `Open the valve at ${time}, water for ${minutes} minutes, then close it.`,
      `Check soil moisture again tomorrow morning ${nextCheck}.`,
    ],
  }
}

/** One line for the top banner, covering the whole farm. */
export function bannerText(plans, farm, lang) {
  const water = plans.filter((p) => p.type === 'water')
  const wait = plans.filter((p) => p.type === 'wait')
  const time = hhmm(18 * 60)
  if (water.length) {
    const [first, ...rest] = water
    const meth = methodInfo(first.method, lang)
    const others = rest.map((p) => `${p.plot.id} ${p.minutes}′`).join(', ')
    return lang === 'vi'
      ? `${meth.verb} thửa ${first.plot.id} · ${first.minutes} phút · ${time}${others ? `  (thêm ${others})` : ''}`
      : `${meth.verb} plot ${first.plot.id} · ${first.minutes} min · ${time}${others ? `  (also ${others})` : ''}`
  }
  if (wait.length) {
    return lang === 'vi'
      ? `Chờ mưa: dự báo ${farm.weather.rain48h} mm trong 48 giờ tới, chưa cần tưới`
      : `Wait for rain: ${farm.weather.rain48h} mm forecast in 48 hours, no watering yet`
  }
  return lang === 'vi' ? 'Ruộng đủ ẩm, hôm nay chưa cần tưới' : 'Soil is moist enough; no watering needed today'
}
