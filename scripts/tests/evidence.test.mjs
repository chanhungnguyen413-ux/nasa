// Test hợp đồng bằng chứng: thiếu thì lan truyền thiếu, mô phỏng thì lan truyền mô phỏng, không có số nào tự sinh ra.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evDerive, evidence, evIsMissing, evMissing } from '../../site/core/evidence.js'

const a = evidence({ value: 10, unit: 'mm', kind: 'model', source: 'powerDaily' })
const b = evidence({ value: 4, unit: 'mm', kind: 'ground' })
const sum = (inputs, optional = []) => evDerive({ inputs, optional, compute: (v) => (v.a ?? 0) + (v.b ?? 0), unit: 'mm', formula: 'a + b' })

test('evidence() từ chối giá trị không phải số và loại không hợp lệ', () => {
  assert.throws(() => evidence({ value: null, kind: 'model' }))
  assert.throws(() => evidence({ value: Number.NaN, kind: 'model' }))
  assert.throws(() => evidence({ value: 1, kind: 'đoán' }))
  assert.throws(() => evidence({ value: 1, kind: 'missing' }), 'giá trị thiếu phải tạo bằng evMissing()')
})

test('evMissing() luôn có lý do và việc cần làm, không có giá trị', () => {
  const m = evMissing({ reason: 'chưa đo', need: 'measure' })
  assert.equal(m.value, null)
  assert.equal(m.kind, 'missing')
  assert.equal(m.note, 'chưa đo')
  assert.equal(m.need, 'measure')
})

test('đủ đầu vào → "derived", giữ đủ danh sách đầu vào để truy ngược', () => {
  const r = sum({ a, b })
  assert.equal(r.value, 14)
  assert.equal(r.kind, 'derived')
  assert.deepEqual(r.inputs.map((i) => i.inputName), ['a', 'b'])
  assert.equal(r.inputs[0].source, 'powerDaily')
})

test('thiếu một đầu vào bắt buộc → "missing", KHÔNG có số', () => {
  for (const r of [sum({ a, b: evMissing({ reason: 'x', need: 'measure' }) }), sum({ a, b: undefined }), sum({ a, b: null })]) {
    assert.equal(r.kind, 'missing')
    assert.equal(r.value, null)
    assert.ok(evIsMissing(r))
  }
  assert.equal(sum({ a, b: evMissing({ reason: 'x', need: 'measure' }) }).need, 'measure', 'việc cần làm được truyền theo')
})

test('đầu vào tuỳ chọn bị thiếu thì vẫn tính được', () => {
  const r = sum({ a, b: evMissing({ reason: 'x' }) }, ['b'])
  assert.equal(r.value, 10)
  assert.equal(r.kind, 'derived')
})

test('một đầu vào "simulated" → kết quả "simulated"', () => {
  const sim = { ...b, kind: 'simulated' }
  assert.equal(sum({ a, b: sim }).kind, 'simulated')
  assert.equal(sum({ a: sum({ a, b: sim }), b }).kind, 'simulated', 'lan truyền qua nhiều tầng')
})

test('compute trả về NaN/Infinity → "missing" chứ không in số rác', () => {
  const r = evDerive({ inputs: { a }, compute: () => Number.NaN })
  assert.equal(r.kind, 'missing')
})
