// Test hình học thửa ruộng (công cụ khoanh thửa thế hệ 2).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  geoAreaM2, geoEdgeLengthsM, geoFromGeoJSON, geoInsertVertex, geoMoveVertex, geoNearestPlace, geoParseLatLon,
  geoRectangle, geoRemoveVertex, geoSelfIntersects, geoToGeoJSON, geoValidate,
} from '../../site/logic/geometry.js'

// Hình vuông cạnh khoảng 100 m ở vĩ độ 10°: 1 độ vĩ ≈ 111 320 m; 1 độ kinh nhân thêm cos(vĩ độ).
const LAT = 10.1
const dLat = 100 / 111320
const dLon = 100 / (111320 * Math.cos((LAT * Math.PI) / 180))
const SQUARE = [[LAT, 105.6], [LAT + dLat, 105.6], [LAT + dLat, 105.6 + dLon], [LAT, 105.6 + dLon]]

test('hình vuông 100 m × 100 m có diện tích ≈ 1 ha và bốn cạnh ≈ 100 m', () => {
  assert.ok(Math.abs(geoAreaM2(SQUARE) - 10000) < 50, `diện tích ${geoAreaM2(SQUARE)}`)
  for (const m of geoEdgeLengthsM(SQUARE)) assert.ok(Math.abs(m - 100) < 1, `cạnh ${m}`)
})

test('hình nơ bướm (hai cạnh cắt nhau) bị phát hiện; hình vuông thì không', () => {
  const bowtie = [SQUARE[0], SQUARE[2], SQUARE[1], SQUARE[3]]
  assert.equal(geoSelfIntersects(bowtie), true)
  assert.equal(geoSelfIntersects(SQUARE), false)
  assert.equal(geoValidate(bowtie).problem, 'selfIntersect')
})

test('kiểm tra thửa: ít hơn 3 góc → tooFew; lớn hơn ngưỡng nhóm chọn → tooBig; hợp lệ → ok', () => {
  assert.equal(geoValidate(SQUARE.slice(0, 2)).problem, 'tooFew')
  assert.equal(geoValidate(SQUARE, { maxHa: 0.5 }).problem, 'tooBig')
  const v = geoValidate(SQUARE)
  assert.equal(v.ok, true)
  assert.ok(v.areaM2 > 0)
})

test('chèn, kéo, xóa góc trả về mảng mới, đúng thứ tự, không sửa mảng cũ', () => {
  const mid = [LAT, 105.6 + dLon / 2]
  const five = geoInsertVertex(SQUARE, 3, mid) // chèn vào cạnh cuối (góc 3 → góc 0)
  assert.equal(five.length, 5)
  assert.deepEqual(five[4], mid)
  assert.equal(SQUARE.length, 4)
  const moved = geoMoveVertex(SQUARE, 1, [LAT + 2 * dLat, 105.6])
  assert.deepEqual(moved[1], [LAT + 2 * dLat, 105.6])
  assert.deepEqual(SQUARE[1], [LAT + dLat, 105.6])
  assert.equal(geoRemoveVertex(five, 4).length, 4)
  assert.equal(geoRemoveVertex(SQUARE.slice(0, 3), 0).length, 3, 'thửa 3 góc không xóa thêm được')
})

test('hình chữ nhật từ hai góc chéo: 4 góc, không tự cắt, đúng diện tích', () => {
  const r = geoRectangle(SQUARE[2], SQUARE[0])
  assert.equal(r.length, 4)
  assert.equal(geoSelfIntersects(r), false)
  assert.ok(Math.abs(geoAreaM2(r) - geoAreaM2(SQUARE)) < 1e-6)
})

test('GeoJSON: xuất ra [kinh độ, vĩ độ] với vòng khép kín; đọc lại được đúng thửa', () => {
  const f = geoToGeoJSON(SQUARE, { name: 'thửa' })
  const ring = f.geometry.coordinates[0]
  assert.equal(ring.length, 5)
  assert.deepEqual(ring[0], ring[4])
  assert.deepEqual(ring[0], [105.6, LAT])
  assert.deepEqual(geoFromGeoJSON({ type: 'FeatureCollection', features: [f] }), SQUARE)
})

test('GeoJSON không có đa giác hoặc tọa độ vô lý → null (không đoán)', () => {
  assert.equal(geoFromGeoJSON({ type: 'Point', coordinates: [105.6, 10.1] }), null)
  assert.equal(geoFromGeoJSON({ type: 'Polygon', coordinates: [[[105, 95], [106, 95], [106, 96], [105, 95]]] }), null)
  assert.equal(geoFromGeoJSON(null), null)
})

test('nhập tọa độ bằng tay: nhiều kiểu viết; sai hoặc ngoài giới hạn → null', () => {
  assert.deepEqual(geoParseLatLon('10.12, 105.6'), { lat: 10.12, lon: 105.6 })
  assert.deepEqual(geoParseLatLon('10.12 105.6'), { lat: 10.12, lon: 105.6 })
  assert.deepEqual(geoParseLatLon('10,12; 105,6'), { lat: 10.12, lon: 105.6 })
  assert.equal(geoParseLatLon('10,12, 105,6'), null, 'dấu phẩy mập mờ thì không đoán')
  assert.equal(geoParseLatLon('95, 105'), null)
  assert.equal(geoParseLatLon('Cờ Đỏ'), null)
})

test('huyện gần nhất chỉ tính trong bán kính do nhóm chọn', () => {
  const places = [{ id: 'a', lat: 10.1, lon: 105.6 }, { id: 'b', lat: 10.5, lon: 105.6 }]
  assert.equal(geoNearestPlace([10.11, 105.6], places, 15).id, 'a')
  assert.equal(geoNearestPlace([11.5, 105.6], places, 15), null)
})
