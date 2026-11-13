// Test đọc file tải lên: ba định dạng, đoán cột, loại dòng ngoài giới hạn vật lý, đổi đơn vị theo định nghĩa.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { uploadGuessMapping, uploadNormUnit, uploadParse, uploadParseDate, uploadParseNumber, uploadValidate } from '../../site/sources/upload.js'
import { hzField } from '../../site/core/harmonize.js'

test('CSV: tự nhận dấu chấm phẩy, bỏ dòng mô tả đầu file, đọc dấu phẩy thập phân', () => {
  const text = ['Nguồn: số đo ruộng nhà A', 'Ngày lấy: 01/11/2026', '', 'ngay;ph;ec (dS/m)', '01/10/2026;5,6;1,2', '15/10/2026;5,8;1,4'].join('\n')
  const p = uploadParse(text, 'do-dat.csv')
  assert.equal(p.format, 'csv')
  assert.equal(p.separator, ';')
  assert.equal(p.skippedLines, 2)
  assert.deepEqual(p.columns, ['ngay', 'ph', 'ec (dS/m)'])
  assert.equal(p.rows.length, 2)
  assert.equal(uploadParseNumber(p.rows[0].ph, p.decimalComma), 5.6)
})

test('CSV có ngoặc kép và dòng sai số ô bị đếm là badRow', () => {
  const p = uploadParse('date,value,note\n2025-01-01,0.5,"a, b"\n2025-01-17,0.6\n2025-02-02,0.7,x', 'x.csv')
  assert.equal(p.rows.length, 2)
  assert.equal(p.rows[0].note, 'a, b')
  assert.equal(p.badRows, 1)
})

test('JSON: mảng bản ghi, hoặc một đối tượng chứa đúng một mảng bản ghi', () => {
  const a = uploadParse('[{"date":"2025-01","rain":12.5},{"date":"2025-02","rain":3}]', 'r.json')
  assert.equal(a.format, 'json')
  assert.deepEqual(a.columns, ['date', 'rain'])
  const b = uploadParse('{"meta":{"x":1},"records":[{"date":"2025-01","rain":1}]}', 'r.json')
  assert.equal(b.rows.length, 1)
  assert.equal(uploadParse('{"a":1}', 'x.json').error, 'jsonNotRecords')
  assert.equal(uploadParse('{bad json', 'x.json').error, 'badJson')
})

test('GeoJSON: điểm lấy tọa độ, đa giác lấy tâm; thuộc tính thành cột', () => {
  const gj = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [105.43, 10.1] }, properties: { date: '2025-10-16', ndvi: 0.71 } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[105, 10], [105.2, 10], [105.2, 10.2], [105, 10.2]]] }, properties: { date: '2025-10-16', ndvi: 0.5 } },
      { type: 'Feature', geometry: null, properties: { ndvi: 1 } },
    ],
  }
  const p = uploadParse(JSON.stringify(gj), 'n.geojson')
  assert.equal(p.format, 'geojson')
  assert.equal(p.rows.length, 2)
  assert.equal(p.badRows, 1)
  assert.equal(p.rows[0].__lat, 10.1)
  assert.ok(Math.abs(p.rows[1].__lon - 105.1) < 1e-9)
  const g = uploadGuessMapping(p.columns)
  assert.equal(g.lat, '__lat')
  assert.equal(g.lon, '__lon')
  assert.equal(g.value, 'ndvi')
  assert.equal(g.variable, 'ndvi')
})

test('đoán cột: ngày, vĩ độ, kinh độ, biến và đơn vị trong tên cột', () => {
  const g = uploadGuessMapping(['Date', 'Latitude', 'Longitude', 'precipitation (mm/day)'])
  assert.deepEqual([g.date, g.lat, g.lon, g.value, g.variable, g.unit], ['Date', 'Latitude', 'Longitude', 'precipitation (mm/day)', 'rain', 'mm/day'])
  assert.equal(uploadNormUnit('m^3/m^3'), 'm3/m3')
  assert.equal(uploadNormUnit('degC'), '°c')
  assert.equal(uploadNormUnit('pH'), '')
})

test('ngày: nhiều kiểu viết; ngày không có thật → null', () => {
  assert.equal(uploadParseDate('2025-03-07'), '2025-03-07')
  assert.equal(uploadParseDate('20250307'), '2025-03-07')
  assert.equal(uploadParseDate('07/03/2025'), '2025-03-07') // ngày/tháng/năm
  assert.equal(uploadParseDate('2025-03'), '2025-03')
  assert.equal(uploadParseDate('A2025001'), '2025-01-01')
  assert.equal(uploadParseDate('2025-02-30'), null)
  assert.equal(uploadParseDate('hôm qua'), null)
})

test('loại dòng ngoài giới hạn vật lý và dòng không phải số; không dòng hỏng nào lọt vào bản ghi', () => {
  const p = uploadParse('date,ndvi\n2025-01-01,0.5\n2025-01-17,1.7\n2025-02-02,-3\n2025-02-18,abc\n2025-13-01,0.4\n2025-03-06,0.62', 'n.csv')
  const r = uploadValidate(p, { date: 'date', value: 'ndvi' }, { variable: 'ndvi', unit: '', origin: 'modis', fileName: 'n.csv' })
  assert.deepEqual(r.records.map((x) => x.value), [0.5, 0.62])
  assert.equal(r.rejected.outOfRange, 2)
  assert.equal(r.rejected.notNumber, 1)
  assert.equal(r.rejected.badDate, 1)
  assert.equal(r.passport.accepted, 2)
  assert.equal(r.passport.rejectedTotal, 4)
  assert.equal(r.passport.kind, 'satellite')
  assert.equal(r.passport.dateFrom, '2025-01-01')
})

test('đổi đơn vị theo định nghĩa trước khi kiểm giới hạn: µS/cm → dS/m, K → °C, % → m³/m³', () => {
  const ec = uploadValidate(uploadParse('ec\n1500\n-2', 'e.csv'), { value: 'ec' }, { variable: 'ec', unit: 'µS/cm', origin: 'ground' })
  assert.deepEqual(ec.records.map((x) => x.value), [1.5])
  assert.equal(ec.rejected.outOfRange, 1)
  const lst = uploadValidate(uploadParse('date,lst\n2025-01-01,300.15', 'l.csv'), { date: 'date', value: 'lst' }, { variable: 'lst', unit: 'K', origin: 'ecostress' })
  assert.equal(lst.records[0].value, 27)
  const sm = uploadValidate(uploadParse('date,sm\n2025-01-01,35\n2025-01-02,120', 's.csv'), { date: 'date', value: 'sm' }, { variable: 'soilMoisture', unit: '%', origin: 'smap' })
  assert.deepEqual(sm.records.map((x) => x.value), [0.35])
  assert.equal(sm.rejected.outOfRange, 1)
})

test('lỗi cả file được báo rõ: sai đơn vị, thiếu cột ngày cho chuỗi thời gian, thiếu cột giá trị', () => {
  const p = uploadParse('a,b\n1,2', 'x.csv')
  assert.equal(uploadValidate(p, { value: 'b' }, { variable: 'rain', unit: 'inch', origin: 'gpm' }).error, 'badUnit')
  assert.equal(uploadValidate(p, { value: 'b' }, { variable: 'rain', unit: 'mm/day', origin: 'gpm' }).error, 'needDate')
  assert.equal(uploadValidate(p, { value: null }, { variable: 'ph', unit: '', origin: 'ground' }).error, 'noValueColumn')
})

test('tọa độ: đếm điểm trong và ngoài ruộng đã khoanh; tọa độ vô lý bị loại', () => {
  const polygon = [[10.1, 105.43], [10.1, 105.432], [10.102, 105.432], [10.102, 105.43]]
  const field = hzField({ polygon })
  const p = uploadParse('lat,lon,ph\n10.101,105.431,5.5\n10.2,105.5,6\n95,105,6', 'p.csv')
  const r = uploadValidate(p, { lat: 'lat', lon: 'lon', value: 'ph' }, { variable: 'ph', unit: '', origin: 'ground', field })
  assert.equal(r.rejected.badCoords, 1)
  assert.equal(r.passport.inField, 1)
  assert.equal(r.passport.outField, 1)
})

/* ---------------- File mẫu thật trong samples/ (sinh bằng scripts/make-samples.mjs) ---------------- */
import { readFileSync } from 'node:fs'
const sample = (name) => readFileSync(new URL(`../../samples/${name}`, import.meta.url), 'utf8')

test('file mẫu: CSV NDVI MODIS đọc đủ, tự đoán đúng cột; JSON mưa POWER đoán đúng đơn vị mm/tháng', () => {
  const csv = uploadParse(sample('ndvi_modis_co-do.csv'), 'ndvi_modis_co-do.csv')
  const g = uploadGuessMapping(csv.columns)
  const r = uploadValidate(csv, g, { variable: g.variable, unit: g.unit ?? '', origin: 'modis' })
  assert.equal(g.variable, 'ndvi')
  assert.equal(r.passport.accepted, csv.rows.length)
  assert.equal(r.passport.rejectedTotal, 0)
  const json = uploadParse(sample('mua_nasa_power_co-do_theo_thang.json'), 'x.json')
  const gj = uploadGuessMapping(json.columns)
  assert.deepEqual([gj.variable, gj.unit], ['rain', 'mm/month'])
  const rj = uploadValidate(json, gj, { variable: 'rain', unit: gj.unit, origin: 'model' })
  assert.equal(rj.passport.accepted, 300)
})

test('file mẫu hỏng cố ý: mọi dòng bị loại kèm lý do, không dòng nào lọt vào tính toán', () => {
  const p = uploadParse(sample('file_hong_de_thu.csv'), 'file_hong_de_thu.csv')
  const g = uploadGuessMapping(p.columns)
  const r = uploadValidate(p, g, { variable: 'ndvi', unit: '', origin: 'modis' })
  assert.equal(r.records.length, 0)
  assert.equal(r.rejected.outOfRange, 2)
  assert.equal(r.rejected.badDate, 2)
  assert.equal(r.rejected.notNumber, 1)
})
