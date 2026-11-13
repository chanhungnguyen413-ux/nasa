// Đọc phản hồi của NASA POWER monthly và rút ra những dữ kiện mà Phase 1 cần biết chắc:
// tham số nào có, đơn vị ghi trong chính phản hồi, giá trị rỗng, dạng khoá thời gian, mưa là mm/ngày hay mm/tháng.
// Không dữ kiện nào ở đây được viết từ trí nhớ: tất cả đọc hoặc tính từ phản hồi.

const MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length

export function analysePowerMonthly(json, requested) {
  const param = json?.properties?.parameter
  if (!param) return null
  const fill = json.header?.fill_value
  const returned = Object.keys(param)
  const keys = Object.keys(param[returned[0]]).sort()
  const years = [...new Set(keys.map((k) => k.slice(0, 4)))]
  const isReal = (v) => v !== undefined && v !== null && v !== fill
  // "Năm đủ" = năm mà cả 12 tháng của MỌI tham số đều có số (không phải giá trị rỗng).
  const fullYear = (y) => returned.every((name) => MONTH_KEYS.every((m) => isReal(param[name][`${y}${m}`])))
  const lastFullYear = [...years].reverse().find(fullYear) ?? null

  const rows = returned.map((name) => {
    const monthly = keys.filter((k) => !k.endsWith('13'))
    return {
      name,
      units: json.parameters?.[name]?.units ?? '(phản hồi không ghi)',
      longname: json.parameters?.[name]?.longname ?? '',
      fillCount: monthly.filter((k) => !isReal(param[name][k])).length,
      monthCount: monthly.length,
      key13: lastFullYear ? describeKey13(param[name], lastFullYear, isReal) : 'không kiểm tra được',
    }
  })

  return {
    returned,
    notReturned: requested.filter((name) => !returned.includes(name)),
    rows,
    fill,
    keyExamples: keys.slice(0, 14),
    hasKey13: keys.some((k) => k.endsWith('13')),
    firstYear: years[0],
    lastYear: years[years.length - 1],
    lastFullYear,
    timeStandard: json.header?.time_standard ?? null,
    sources: json.header?.sources ?? null,
    apiVersion: json.header?.api?.version ?? null,
  }
}

// Khoá "YYYY13" là gì? So nó với trung bình và với tổng của 12 tháng cùng năm, xem khớp bên nào.
function describeKey13(series, year, isReal) {
  const v13 = series[`${year}13`]
  if (!isReal(v13)) return 'không có'
  const months = MONTH_KEYS.map((m) => series[`${year}${m}`])
  const close = (a, b) => Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 0.03)
  if (close(v13, mean(months))) return 'trung bình 12 tháng'
  if (v13 === Math.max(...months)) return 'giá trị CAO NHẤT trong 12 tháng'
  if (v13 === Math.min(...months)) return 'giá trị THẤP NHẤT trong 12 tháng'
  if (close(v13, months.reduce((a, b) => a + b, 0))) return 'tổng 12 tháng'
  return `không khớp trung bình, cực trị hay tổng (giá trị ${v13})`
}

/**
 * Giá trị THÁNG của mỗi tham số là gì so với dữ liệu NGÀY của cùng năm: trung bình, cao nhất, thấp nhất hay tổng?
 * Vì sao cần: FAO-56 tính ET0 từ nhiệt độ cao nhất và thấp nhất TRUNG BÌNH của tháng. Nếu API trả nhiệt độ
 * cao nhất TUYỆT ĐỐI của tháng mà ta tưởng là trung bình, ET0 sẽ bị tính quá cao mà không ai hay.
 */
export function monthlyMeaning(monthlyJson, dailyJson, year) {
  const fill = dailyJson?.header?.fill_value
  const daily = dailyJson?.properties?.parameter
  const monthly = monthlyJson?.properties?.parameter
  if (!daily || !monthly) return null
  const close = (a, b) => Math.abs(a - b) <= Math.max(0.06, Math.abs(b) * 0.01)
  const meaning = {}
  for (const name of Object.keys(monthly)) {
    if (!daily[name]) {
      meaning[name] = 'không có dữ liệu ngày để so'
      continue
    }
    const hits = { mean: 0, max: 0, min: 0, sum: 0 }
    let months = 0
    for (const m of MONTH_KEYS) {
      const values = Object.keys(daily[name]).filter((k) => k.startsWith(`${year}${m}`)).map((k) => daily[name][k]).filter((v) => v !== fill)
      const monthValue = monthly[name][`${year}${m}`]
      if (values.length < 25 || monthValue === undefined || monthValue === fill) continue
      months += 1
      if (close(monthValue, mean(values))) hits.mean += 1
      if (close(monthValue, Math.max(...values))) hits.max += 1
      if (close(monthValue, Math.min(...values))) hits.min += 1
      if (close(monthValue, values.reduce((a, b) => a + b, 0))) hits.sum += 1
    }
    if (months === 0) meaning[name] = 'không so được'
    else if (hits.mean === months) meaning[name] = 'trung bình các ngày'
    else if (hits.max === months) meaning[name] = 'giá trị CAO NHẤT trong tháng (không phải trung bình)'
    else if (hits.min === months) meaning[name] = 'giá trị THẤP NHẤT trong tháng (không phải trung bình)'
    else if (hits.sum === months) meaning[name] = 'tổng các ngày'
    else meaning[name] = `không khớp hẳn (số tháng khớp: trung bình ${hits.mean}, cao nhất ${hits.max}, thấp nhất ${hits.min}, trên ${months} tháng)`
  }
  return meaning
}

/**
 * Mưa tháng của POWER là mm/ngày hay mm/tháng? Kiểm chứng bằng số, không tin riêng chuỗi đơn vị.
 * So với tổng mưa tháng đã tính từ dữ liệu NGÀY (climate_monthly.json, cùng điểm, cùng các năm):
 * tỉ số ≈ số ngày trong tháng (28–31) → API trả mm/ngày; tỉ số ≈ 1 → API trả mm/tháng.
 */
export function rainUnitCheck(json, climateMonths, [firstYear, lastYear]) {
  const rain = json?.properties?.parameter?.PRECTOTCORR
  if (!rain) return null
  const fill = json.header?.fill_value
  const ratios = climateMonths.map((c, i) => {
    const values = []
    for (let y = firstYear; y <= lastYear; y++) {
      const v = rain[`${y}${MONTH_KEYS[i]}`]
      if (v !== undefined && v !== fill) values.push(v)
    }
    return values.length ? c.rainMm.mean / mean(values) : null
  })
  const real = ratios.filter((r) => r !== null)
  if (real.length < 12) return { conclusion: 'không đủ số liệu để kiểm chứng', ratios }
  const [min, max] = [Math.min(...real), Math.max(...real)]
  let conclusion = 'không rõ (tỉ số không gần 1 và không gần số ngày trong tháng)'
  if (min > 26 && max < 33) conclusion = 'mm/ngày (muốn có mm/tháng phải nhân với số ngày của tháng)'
  else if (min > 0.9 && max < 1.1) conclusion = 'mm/tháng'
  return { conclusion, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, years: [firstYear, lastYear] }
}
