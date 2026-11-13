// Dò các nguồn dữ liệu mở mà project định dùng, rồi ghi kết quả ra docs/API_STATUS.md.
//   npm run probe
// Vì sao cần: trước khi xây tính năng trên một API, phải biết chắc nó còn sống, trình duyệt gọi thẳng
// được không (CORS), và nó trả đơn vị gì. Kết quả phụ thuộc mạng, nên chạy lại tại nơi thi.
import { readFileSync, writeFileSync } from 'node:fs'
import { GIBS_CAPABILITIES, GIBS_GROUPS, findLayers, parseCapabilities, tileUrl } from './probe/gibs.mjs'
import { analysePowerMonthly, monthlyMeaning, rainUnitCheck } from './probe/power.mjs'
import { VERDICT, buildReport, table } from './probe/report.mjs'
import { LIMIT_MS, SLOW_LIMIT_MS, corsAllows, originHeaderIsSent, parseJson, probe, timedFetch } from './probe/request.mjs'

const POINT = { name: 'Cần Thơ · Cờ Đỏ', lat: 10.1, lon: 105.43 } // cùng toạ độ với PROVINCES trong site/data/demo.js
const FAR_POINT = { name: 'một điểm ở Đắk Lắk, ngoài ĐBSCL', lat: 12.67, lon: 108.04 }
const LAST_YEAR = new Date().getFullYear() - 1 // "năm đủ gần nhất" dự kiến; script kiểm tra lại bằng số liệu
const POWER_PARAMS = ['T2M', 'T2M_MAX', 'T2M_MIN', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN', 'PRECTOTCORR', 'GWETROOT', 'GWETTOP']
const OUT_FILE = new URL('../docs/API_STATUS.md', import.meta.url)
const readPrecomputed = (name) => JSON.parse(readFileSync(new URL(`../site/data/precomputed/${name}`, import.meta.url), 'utf8'))

/** Quy tắc ra phán quyết, dùng chung cho mọi nguồn. */
function decide({ result, valid, hasSavedCopy = false, needsCors = true }) {
  if (result.ok && valid) return !needsCors || corsAllows(result.cors) ? VERDICT.browser : VERDICT.server
  return hasSavedCopy ? VERDICT.saved : VERDICT.dead
}

// Máy chủ có thể "lặp lại" đúng Origin ta gửi thay vì trả "*". Khi đó phải thử thêm `Origin: null`,
// vì trang mở bằng nhấp đúp (file://) gửi Origin là null.
async function nullOriginCors(result, options) {
  if (!result.cors || result.cors === '*') return undefined
  return (await timedFetch(result.url, { ...options, origin: 'null' })).cors
}

const failNotes = (result) => [`Không dùng được phản hồi: ${result.error ?? `HTTP ${result.status}`}.`]

/* ---------------------------------------------------------------
 * NASA POWER monthly (nguồn chính của Phase 1)
 * --------------------------------------------------------------- */
const powerMonthlyUrl = ({ lat, lon }, endYear) =>
  `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${POWER_PARAMS.join(',')}&community=AG&longitude=${lon}&latitude=${lat}&start=2001&end=${endYear}&format=JSON`

async function powerMonthly(point, { shortName, compareWithDaily }) {
  let endYear = LAST_YEAR
  let result = await probe(powerMonthlyUrl(point, endYear))
  const notes = []
  if (!result.ok && result.status >= 400 && result.status < 500) {
    notes.push(`Gọi tới năm ${endYear} bị từ chối (HTTP ${result.status}); đã gọi lại tới năm ${endYear - 1}.`)
    endYear -= 1
    result = await probe(powerMonthlyUrl(point, endYear))
  }
  const json = result.ok ? parseJson(result) : null
  const info = analysePowerMonthly(json, POWER_PARAMS)
  const source = {
    shortName,
    name: `${shortName} · ${point.name} (${point.lat}; ${point.lon})`,
    docs: 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/',
    result,
    // Bản lưu hiện có (climate_monthly.json) chỉ có mưa, số ngày nóng, ẩm vùng rễ: KHÔNG đủ biến để tính ET0.
    verdict: decide({ result, valid: Boolean(info), hasSavedCopy: false }),
    notes,
  }
  if (!info) return { ...source, summary: result.error ?? `HTTP ${result.status}`, notes: [...notes, ...failNotes(result)] }

  source.corsNullOrigin = await nullOriginCors(result)
  notes.push(`Tham số trả về: ${info.returned.length}/${POWER_PARAMS.length}${info.notReturned.length ? ` (THIẾU: ${info.notReturned.join(', ')})` : ''}.`)
  notes.push(`Giá trị rỗng (fill) ghi trong phản hồi: \`${info.fill}\`.`)
  notes.push(`Khoá thời gian dạng \`YYYYMM\`, ví dụ: ${info.keyExamples.map((k) => `\`${k}\``).join(', ')}. Có khoá "tháng 13": **${info.hasKey13 ? 'có' : 'không'}** (xem cột cuối của bảng để biết nó là gì).`)
  notes.push(`Năm có trong phản hồi: ${info.firstYear}–${info.lastYear}. Năm gần nhất đủ 12 tháng cho mọi tham số: **${info.lastFullYear ?? 'không có'}**.`)
  notes.push(`Chuẩn thời gian: ${info.timeStandard}; nguồn ghi trong phản hồi: ${JSON.stringify(info.sources)}; phiên bản API: ${info.apiVersion}.`)
  let summary = `${info.returned.length}/${POWER_PARAMS.length} tham số, đủ đến năm ${info.lastFullYear}`
  if (compareWithDaily) {
    const climate = readPrecomputed('climate_monthly.json')
    const months = climate.districts.find((d) => d.lat === point.lat && d.lon === point.lon)?.months
    const years = [Math.max(2001, climate.years[0]), Math.min(Number(info.lastFullYear ?? endYear), climate.years[1])]
    const check = months ? rainUnitCheck(json, months, years) : null
    const unitText = info.rows.find((r) => r.name === 'PRECTOTCORR')?.units
    if (check) {
      notes.push(
        `**Mưa tháng (PRECTOTCORR):** chuỗi đơn vị trong phản hồi là \`${unitText}\`. Kiểm chứng bằng số: tổng mưa tháng tính từ dữ liệu NGÀY (\`climate_monthly.json\`, ${check.years?.join('–')}) chia cho giá trị tháng của API cho tỉ số từ ${check.min} đến ${check.max} qua 12 tháng → **${check.conclusion}**.`,
      )
      summary += `; mưa: ${check.conclusion.split(' ')[0]}`
    }
  }

  // Giá trị tháng là trung bình hay cực trị? So với dữ liệu NGÀY của năm đủ gần nhất (thêm 1 lần gọi).
  let meaning = null
  if (compareWithDaily && info.lastFullYear) {
    const y = info.lastFullYear
    const dailyUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${POWER_PARAMS.join(',')}&community=AG&latitude=${point.lat}&longitude=${point.lon}&start=${y}0101&end=${y}1231&format=JSON`
    const daily = await probe(dailyUrl)
    meaning = daily.ok ? monthlyMeaning(json, parseJson(daily), y) : null
    if (meaning) {
      const extremes = Object.entries(meaning).filter(([, text]) => /CAO NHẤT|THẤP NHẤT/.test(text)).map(([name]) => `\`${name}\``)
      notes.push(`So giá trị tháng với dữ liệu NGÀY của năm ${y} (cột "Giá trị tháng là gì" trong bảng): tham số là **cực trị của cả tháng, không phải trung bình ngày**: ${extremes.length ? extremes.join(', ') : 'không có'}.`)
      if (extremes.length) {
        notes.push(`**Hệ quả cho ET0 (FAO-56):** công thức cần nhiệt độ cao nhất/thấp nhất TRUNG BÌNH của tháng. Không được đưa thẳng ${extremes.join(', ')} của điểm cuối monthly vào công thức; phải gom từ dữ liệu ngày (\`/api/temporal/daily/point\`), hoặc ghi rõ phương án thay thế và nguồn.`)
        summary += `; ${extremes.join(', ')} tháng là cực trị, KHÔNG phải trung bình`
      }
    } else notes.push(`Không so được với dữ liệu ngày năm ${y}: ${daily.error ?? `HTTP ${daily.status}`}.`)
  }

  source.table = table(
    ['Tham số', 'Đơn vị (nguyên văn trong phản hồi)', 'Tên dài trong phản hồi', 'Ô rỗng / số tháng', 'Giá trị tháng là gì (so với dữ liệu ngày)', 'Khoá "13" là gì'],
    info.rows.map((r) => [`\`${r.name}\``, `\`${r.units}\``, r.longname, `${r.fillCount} / ${r.monthCount}`, meaning?.[r.name] ?? 'không kiểm tra ở điểm này', r.key13]),
  )
  return { ...source, summary }
}

/* ---------------------------------------------------------------
 * Các nguồn đang dùng trong site/data/live.js (giữ đúng dạng địa chỉ ở đó)
 * --------------------------------------------------------------- */
async function powerDaily({ lat, lon }) {
  const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 864e5)
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETTOP,GWETROOT,PRECTOTCORR,T2M_MAX&community=AG&latitude=${lat}&longitude=${lon}&start=${ymd(start)}&end=${ymd(end)}&format=JSON`
  const result = await probe(url)
  const json = result.ok ? parseJson(result) : null
  const param = json?.properties?.parameter
  const source = { shortName: 'NASA POWER daily', name: 'NASA POWER daily (đang dùng trong site/data/live.js)', docs: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/', result }
  // Có bản lưu: climate_monthly.json được tính từ chính dữ liệu ngày này (2001–2025, 5 huyện).
  source.verdict = decide({ result, valid: Boolean(param), hasSavedCopy: true })
  if (!param) return { ...source, summary: result.error ?? `HTTP ${result.status}`, notes: failNotes(result) }
  const fill = json.header?.fill_value
  const days = Object.keys(param.PRECTOTCORR).sort()
  const lastReal = [...days].reverse().find((d) => Object.keys(param).every((name) => param[name][d] !== fill))
  const lagDays = lastReal ? Math.round((end - new Date(`${lastReal.slice(0, 4)}-${lastReal.slice(4, 6)}-${lastReal.slice(6, 8)}T00:00:00Z`)) / 864e5) : null
  return {
    ...source,
    corsNullOrigin: await nullOriginCors(result),
    summary: `ngày có đủ số liệu gần nhất: ${lastReal} (trễ ${lagDays} ngày)`,
    notes: [
      `Đơn vị trong phản hồi: ${Object.keys(param).map((name) => `\`${name}\` = \`${json.parameters?.[name]?.units}\``).join(', ')}.`,
      `Giá trị rỗng: \`${fill}\`. Hỏi ${days.length} ngày; ngày gần nhất có đủ mọi tham số: **${lastReal ?? 'không có'}** (trễ khoảng ${lagDays} ngày so với hôm nay).`,
    ],
  }
}

async function openMeteoForecast({ lat, lon }) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=8`
  const result = await probe(url)
  const json = result.ok ? parseJson(result) : null
  const days = json?.daily?.time?.length ?? 0
  const source = { shortName: 'Open-Meteo forecast', name: 'Open-Meteo forecast (đang dùng trong site/data/live.js)', docs: 'https://open-meteo.com/en/docs', result }
  source.verdict = decide({ result, valid: days >= 7 })
  if (days < 7) return { ...source, summary: result.error ?? `HTTP ${result.status}`, notes: failNotes(result) }
  return {
    ...source,
    corsNullOrigin: await nullOriginCors(result),
    summary: `${days} ngày dự báo`,
    notes: [`Đơn vị trong phản hồi (\`daily_units\`): ${Object.entries(json.daily_units).map(([k, v]) => `\`${k}\` = \`${v}\``).join(', ')}.`, 'Không phải dữ liệu NASA. Nhãn trên trang phải ghi đúng là Open-Meteo.'],
  }
}

/* ---------------------------------------------------------------
 * Độ cao
 * --------------------------------------------------------------- */
async function openMeteoElevation({ lat, lon }) {
  const result = await probe(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
  const json = result.ok ? parseJson(result) : null
  const value = Array.isArray(json?.elevation) ? json.elevation[0] : undefined
  const source = { shortName: 'Open-Meteo elevation', name: 'Open-Meteo elevation', docs: 'https://open-meteo.com/en/docs/elevation-api', result }
  source.verdict = decide({ result, valid: typeof value === 'number' })
  if (typeof value !== 'number') return { ...source, summary: result.error ?? `HTTP ${result.status}`, notes: failNotes(result) }
  return {
    ...source,
    corsNullOrigin: await nullOriginCors(result),
    summary: `độ cao tại điểm thử: ${value} m`,
    notes: [
      `Giá trị trả về tại điểm thử: **${value}** (phản hồi không kèm chuỗi đơn vị; trang tài liệu ghi là mét).`,
      'Theo trang tài liệu của Open-Meteo: dữ liệu là Copernicus DEM, bản phát hành 2021, GLO-90, độ phân giải 90 m. **Không phải SRTM**, nên nhãn phải ghi "Copernicus DEM GLO-90 qua Open-Meteo".',
      'Cũng theo trang đó: người dùng phải ghi công chương trình Copernicus và dẫn tới Open-Meteo; mỗi lần gọi tối đa 100 toạ độ.',
    ],
  }
}

async function openTopoData({ lat, lon }) {
  const result = await probe(`https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`)
  const json = result.ok ? parseJson(result) : null
  const first = json?.status === 'OK' ? json.results?.[0] : null
  const source = { shortName: 'OpenTopoData srtm30m', name: 'OpenTopoData srtm30m (dịch vụ độ cao SRTM công khai)', docs: 'https://www.opentopodata.org/api/', result }
  source.verdict = decide({ result, valid: typeof first?.elevation === 'number' })
  if (typeof first?.elevation !== 'number') return { ...source, summary: result.error ?? `HTTP ${result.status}`, notes: failNotes(result) }
  return {
    ...source,
    corsNullOrigin: await nullOriginCors(result),
    summary: `độ cao tại điểm thử: ${first.elevation} m (bộ \`${first.dataset}\`)`,
    notes: [
      `Giá trị trả về: **${first.elevation}**, tên bộ dữ liệu trong phản hồi: \`${first.dataset}\`.`,
      'Điều khoản của API công khai (trang chủ https://www.opentopodata.org/, mục "Public API"): tối đa 100 toạ độ mỗi lần gọi, 1 lần gọi mỗi giây, 1000 lần gọi mỗi ngày.',
      'Cũng theo trang đó, CORS chỉ có ở gói trả phí. Khớp với kết quả dò: không có header CORS, nên trình duyệt không gọi thẳng được.',
      'Trang chủ ghi bộ `srtm30m`: độ phân giải khoảng 30 m, phủ vĩ độ −60 đến 60, nguồn USGS.',
    ],
  }
}

/* ---------------------------------------------------------------
 * Đất: SoilGrids
 * --------------------------------------------------------------- */
async function soilGrids({ lat, lon }) {
  const properties = ['phh2o', 'soc', 'clay', 'sand', 'silt']
  const depths = ['0-5cm', '5-15cm', '15-30cm']
  const query = [...properties.map((p) => `property=${p}`), ...depths.map((d) => `depth=${d}`), 'value=mean'].join('&')
  const result = await probe(`https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&${query}`)
  const json = result.ok ? parseJson(result) : null
  const layers = json?.properties?.layers ?? []
  const source = { shortName: 'SoilGrids v2.0', name: 'SoilGrids REST v2.0 properties/query (pH, carbon hữu cơ, sét, cát, limon; 0–30 cm)', docs: 'https://rest.isric.org/soilgrids/v2.0/docs', result }
  source.verdict = decide({ result, valid: layers.length > 0 })
  if (layers.length === 0) return { ...source, summary: result.error ?? `HTTP ${result.status}`, notes: failNotes(result) }
  const hasValues = layers.some((l) => l.depths?.some((d) => d.values?.mean !== null && d.values?.mean !== undefined))
  return {
    ...source,
    corsNullOrigin: await nullOriginCors(result),
    summary: hasValues ? `${layers.length} tính chất đất có số` : 'trả lời được nhưng MỌI giá trị đều rỗng tại điểm thử',
    notes: [hasValues ? 'Giá trị là số nguyên đã nhân hệ số; chia cho hệ số ở cột 3 để ra đơn vị ở cột 4.' : 'Mọi giá trị `mean` đều là null tại điểm thử (thường gặp ở ô lưới bị che là mặt nước hoặc đô thị).'],
    table: table(
      ['Tính chất', 'Đơn vị lưu (mapped_units)', 'Hệ số chia (d_factor)', 'Đơn vị sau khi chia (target_units)', ...depths],
      layers.map((l) => [`\`${l.name}\``, l.unit_measure?.mapped_units, l.unit_measure?.d_factor, l.unit_measure?.target_units, ...depths.map((d) => l.depths?.find((x) => x.label === d)?.values?.mean ?? 'null')]),
    ),
  }
}

/* ---------------------------------------------------------------
 * MODIS NDVI qua ORNL DAAC (đang dùng)
 * --------------------------------------------------------------- */
async function modisOrnl({ lat, lon }) {
  const headers = { Accept: 'application/json' }
  const date = `A${LAST_YEAR}001` // một mốc ảnh duy nhất để máy chủ trả lời nhanh
  const url = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=${lat}&longitude=${lon}&band=250m_16_days_NDVI&startDate=${date}&endDate=${date}&kmAboveBelow=1&kmLeftRight=1`
  const result = await probe(url, { headers })
  const json = result.ok ? parseJson(result) : null
  const source = { shortName: 'MODIS ORNL subset', name: 'MODIS MOD13Q1 qua ORNL DAAC subset (đang dùng)', docs: 'https://modis.ornl.gov/data/modis_webservice.html', result }
  // Có bản lưu: ndvi_raw.json (2021–2025, 5 huyện) và lịch vụ đã tính từ đó.
  source.verdict = decide({ result, valid: (json?.subset?.length ?? 0) > 0, hasSavedCopy: true })
  if (!json?.subset?.length) return { ...source, summary: result.error ?? `HTTP ${result.status}`, notes: failNotes(result) }
  const dates = await probe(`https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates?latitude=${lat}&longitude=${lon}`, { headers })
  const list = dates.ok ? (parseJson(dates)?.dates ?? []) : []
  const latest = list.length ? list[list.length - 1].calendar_date : null
  return {
    ...source,
    corsNullOrigin: await nullOriginCors(result, { headers }),
    summary: `ảnh mới nhất: ${latest ?? 'không lấy được danh sách ngày'}`,
    notes: [
      `Phản hồi ghi: đơn vị \`${json.units}\`, hệ số nhân \`${json.scale}\`, lưới ${json.nrows} × ${json.ncols} ô, mỗi ô ${Math.round(Number(json.cellsize))} m.`,
      `Danh sách ngày ảnh (\`/dates\`): ${dates.ok ? `${list.length} mốc, mới nhất **${latest}**, mất ${(dates.ms / 1000).toFixed(1)} s` : `không lấy được (${dates.error ?? `HTTP ${dates.status}`})`}.`,
      'Yêu cầu thử chỉ hỏi 1 mốc ảnh. Hỏi 10 mốc (giới hạn mỗi lần gọi) chậm hơn nhiều, nên trang nên dùng bản tính sẵn cho 5 huyện.',
    ],
  }
}

/* ---------------------------------------------------------------
 * NASA GIBS: đọc danh mục lớp, rồi thử tải 1 ô ảnh của TỪNG lớp tìm được
 * --------------------------------------------------------------- */
async function gibsLayers(point) {
  // File danh mục nặng khoảng 6 MB nên cho hẳn 60 giây (khác hạn 15 giây chung; đã ghi vào STATE.md).
  const result = await timedFetch(GIBS_CAPABILITIES, { timeoutMs: SLOW_LIMIT_MS })
  const source = { shortName: 'NASA GIBS (ảnh)', docs: 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/', result, groups: [], notes: [] }
  if (!result.ok || !result.body.includes('<Layer>')) return { ...source, verdict: VERDICT.dead, summary: result.error ?? `HTTP ${result.status}`, notes: failNotes(result) }

  const { layers } = parseCapabilities(result.body)
  let tilesOk = 0
  let tileCors = null
  for (const group of GIBS_GROUPS) {
    const found = findLayers(layers, group)
    for (const layer of found) {
      const url = tileUrl(layer, point.lat, point.lon)
      if (!url) continue
      const tile = await timedFetch(url, { binary: true })
      layer.tile = { ...tile, body: undefined, ok: tile.ok && String(tile.contentType).startsWith('image/') }
      if (layer.tile.ok) tilesOk += 1
      tileCors ??= tile.cors
    }
    source.groups.push({ ...group, layers: found })
  }
  const total = source.groups.reduce((n, g) => n + g.layers.length, 0)
  return {
    ...source,
    // Ảnh nền bản đồ tải bằng thẻ <img>, không cần CORS; chỉ cần ô ảnh tải được.
    verdict: tilesOk > 0 ? VERDICT.browser : VERDICT.dead,
    summary: `${layers.length} lớp trong danh mục; ${total} lớp khớp từ khoá; ${tilesOk}/${total} lớp tải được ô ảnh thử`,
    notes: [
      `Danh mục có ${layers.length} lớp. Tìm theo từ khoá được ${total} lớp trong 4 nhóm; thử tải 1 ô ảnh (zoom ≤ 6, ngày mặc định của lớp) tại điểm thử: ${tilesOk}/${total} lớp tải được.`,
      `Header CORS của ô ảnh: ${tileCors ? `\`${tileCors}\`` : 'không có'}. Bản đồ tải ảnh bằng thẻ \`<img>\` nên không cần CORS; blueprint cũng cấm đọc số từ màu ảnh.`,
      'Theo tài liệu GIBS, file danh mục chỉ liệt kê 100 mốc thời gian gần nhất của mỗi lớp, nên bảng dưới không ghi "ngày bắt đầu".',
      'Ô ảnh thử rất nhỏ (vài trăm byte) thường là ô trong suốt: lớp có ảnh nhưng ngày đó không phủ điểm thử.',
      'Các bảng xếp theo: lớp theo ngày/tháng trước lớp theo giờ, rồi ảnh mới nhất trước. Việc chọn lớp nào cho từng nút là của Phase 1.',
    ],
  }
}

/* ---------------------------------------------------------------
 * Chạy lần lượt (không gọi song song, để không dồn tải lên máy chủ miễn phí)
 * --------------------------------------------------------------- */
const originSent = await originHeaderIsSent()
const steps = [
  () => powerMonthly(POINT, { shortName: 'NASA POWER monthly', compareWithDaily: true }),
  () => powerDaily(POINT),
  () => openMeteoForecast(POINT),
  () => openMeteoElevation(POINT),
  () => openTopoData(POINT),
  () => soilGrids(POINT),
  () => modisOrnl(POINT),
  () => powerMonthly(FAR_POINT, { shortName: 'NASA POWER monthly (ngoài ĐBSCL)', compareWithDaily: false }),
]
const sources = []
for (const step of steps) {
  const source = await step()
  sources.push(source)
  console.log(`${source.verdict.padEnd(22)} ${source.shortName}: ${source.summary}`)
}
const gibs = await gibsLayers(POINT)
console.log(`${gibs.verdict.padEnd(22)} ${gibs.shortName}: ${gibs.summary}`)

const report = buildReport({
  generatedAt: `${new Date().toLocaleString('sv-SE')} (giờ của máy chạy)`,
  point: POINT,
  originSent,
  sources,
  gibs,
  limitSeconds: LIMIT_MS / 1000,
  slowLimitSeconds: SLOW_LIMIT_MS / 1000,
})
writeFileSync(OUT_FILE, report)
console.log(`\nNode có gửi header Origin: ${originSent ? 'có' : 'KHÔNG'}\nĐã ghi docs/API_STATUS.md`)
