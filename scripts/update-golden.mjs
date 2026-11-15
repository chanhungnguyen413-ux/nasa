// Ghi lại "ảnh chụp" kết quả (golden) cho test hồi quy. CHỈ chạy khi bạn CỐ Ý đổi logic.
//   node scripts/update-golden.mjs
// Sau khi chạy: đọc hai bảng in ra bên dưới. Thấy hợp lý mới commit các file trong scripts/tests/golden/.
//
// Vì sao file này nằm NGOÀI scripts/tests/: để `npm test` không bao giờ tự ghi đè ảnh chụp.
// Một test tự sửa đáp án của chính nó thì không còn bắt được lỗi nào.
import { mkdirSync, writeFileSync } from 'node:fs'
import { GOLDEN_DIR, loadPrecomputed, rotationCases, seasonStripCases } from './tests/cases.mjs'

const NOTE =
  'Ảnh chụp kết quả của code tại thời điểm ghi. KHÔNG sửa tay. ' +
  'Chỉ ghi lại bằng `node scripts/update-golden.mjs` khi cố ý đổi logic và đã đọc bảng kiểm tra in ra.'

function save(name, cases) {
  const body = { _ghiChu: NOTE, cases }
  writeFileSync(new URL(name, GOLDEN_DIR), `${JSON.stringify(body, null, 1)}\n`)
}

const PRE = loadPrecomputed()
const rotation = rotationCases(PRE)
const strips = seasonStripCases(PRE)
mkdirSync(GOLDEN_DIR, { recursive: true })
save('rotation.json', rotation)
save('seasonStrip.json', strips)

// ---- Bảng 1: điểm tổng từng ca, để so bằng mắt với trang Luân canh ----
console.log('LUÂN CANH (điểm tổng, xếp từ cao xuống thấp)')
for (const [name, result] of Object.entries(rotation)) {
  const line = result.rankable
    ? `${result.rotations.map((r) => `${r.id} ${r.total}`).join(' · ')}   (lịch vụ: ${result.calendarConfidence}; nước tưới thêm: ${result.rotations
        .map((r) => `${r.id} ${r.measures.extraMm}`)
        .join(', ')} mm)`
    : `không xếp hạng: ${result.reason.code}, ${result.reason.peaks} đỉnh`
  console.log(`  ${name.padEnd(28)} ${line}`)
}

// ---- Bảng 2: tháng trống và tháng dễ tổn thương của từng huyện ----
const months = (cells) => cells.map((c) => `T${c.month}`).join(' ') || '(không có)'
console.log('\nDẢI MÙA VỤ')
for (const [id, strip] of Object.entries(strips)) {
  const peaks = strip.filter((c) => c.isPeak).map((c) => `${c.season} T${c.month}`).join(', ') || 'không có lịch vụ'
  console.log(`  ${id.padEnd(10)} trống: ${months(strip.filter((c) => c.isBare)).padEnd(14)} dễ tổn thương: ${months(strip.filter((c) => c.isVulnerable)).padEnd(14)} đỉnh vụ: ${peaks}`)
}

console.log('\nĐã ghi scripts/tests/golden/rotation.json và seasonStrip.json')
