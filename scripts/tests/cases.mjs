// Các ca kiểm tra dùng chung cho test hồi quy và cho scripts/update-golden.mjs.
//
// Vì sao tách riêng file này: file test và file ghi "ảnh chụp" (golden) phải tính ĐÚNG CÙNG MỘT THỨ.
// Nếu mỗi bên tự dựng ca của mình, chúng có thể lệch nhau mà không ai biết.
import { readFileSync } from 'node:fs'
import { DEFAULT_PRIORITIES, DEFAULT_WHAT_IF, rankRotations, seasonWindows } from '../../site/logic/rotation.js'
import { districtInputs } from '../../site/logic/rotationInputs.js'
import { seasonStrip } from '../../site/logic/seasonStrip.js'

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'))

/** Dữ liệu đã tính sẵn bằng Python (scripts/python/*), cùng các file mà trang web dùng. */
export function loadPrecomputed() {
  const pre = (name) => readJson(`../../site/data/precomputed/${name}`)
  return {
    climate: pre('climate_monthly.json'),
    kmeans: pre('calendar_kmeans.json'),
    comparison: pre('method_comparison.json'),
    rule: pre('calendar_rule.json'),
  }
}

export const GOLDEN_DIR = new URL('./golden/', import.meta.url)
export const readGolden = (name) => readJson(`./golden/${name}`)

// Ba kịch bản theo docs/blueprint/phase-0.md: mặc định, một bộ ưu tiên lệch, và mưa mùa khô giảm 30%.
export const SCENARIOS = {
  'mac-dinh': { priorities: DEFAULT_PRIORITIES, whatIf: DEFAULT_WHAT_IF },
  'uu-tien-lech': { priorities: { water: 100, soil: 0, income: 20, risk: 60 }, whatIf: DEFAULT_WHAT_IF },
  'mua-kho-giam-30': { priorities: DEFAULT_PRIORITIES, whatIf: { dryRainPct: -30 } },
}

// Đổi sang JSON rồi đọc lại: bỏ các trường undefined và đổi -0 thành 0,
// giống hệt những gì file ảnh chụp lưu được. Nhờ vậy so sánh không báo lỗi giả.
export const plain = (value) => JSON.parse(JSON.stringify(value))

export const districtIds = (PRE) => PRE.climate.districts.map((d) => d.id)
export const caseName = (districtId, scenarioName) => `${districtId} | ${scenarioName}`

export function runRotation(PRE, districtId, scenario) {
  return plain(rankRotations({ ...districtInputs(PRE, districtId), ...scenario }))
}

/** 5 huyện × 3 kịch bản = 15 ca, khoá dạng "angiang | mac-dinh". */
export function rotationCases(PRE) {
  const cases = {}
  for (const id of districtIds(PRE)) {
    for (const [name, scenario] of Object.entries(SCENARIOS)) cases[caseName(id, name)] = runRotation(PRE, id, scenario)
  }
  return cases
}

export function runSeasonStrip(PRE, districtId) {
  const inputs = districtInputs(PRE, districtId)
  const monthly = PRE.rule.districts.find((d) => d.id === districtId).monthly
  return plain(seasonStrip({ climate: inputs.climate, monthly, windows: seasonWindows(inputs.peakDays) }))
}

/** 5 huyện, mỗi huyện 12 ô tháng. */
export function seasonStripCases(PRE) {
  const cases = {}
  for (const id of districtIds(PRE)) cases[id] = runSeasonStrip(PRE, id)
  return cases
}

// Câu nhắc in kèm khi kết quả khác ảnh chụp, để người sửa code biết phải làm gì.
export const GOLDEN_HINT =
  'Kết quả đã KHÁC ảnh chụp trong scripts/tests/golden/.\n' +
  '- Nếu bạn KHÔNG cố ý đổi logic: đây là lỗi hồi quy, hãy sửa lại code.\n' +
  '- Nếu bạn CỐ Ý đổi: chạy `node scripts/update-golden.mjs`, đọc bảng in ra, thấy hợp lý rồi commit ảnh chụp mới.\n'

// Liệt kê từng chỗ khác nhau giữa hai giá trị JSON, kèm "đường đi" tới chỗ đó (vd. rotations.0.total).
// Vì sao tự viết: bản so sánh mặc định của Node in ra hàng trăm dòng, rất khó tìm chỗ sai.
function listDifferences(actual, expected, path = '') {
  if (Object.is(actual, expected)) return []
  const bothObjects = actual !== null && expected !== null && typeof actual === 'object' && typeof expected === 'object'
  if (!bothObjects || Array.isArray(actual) !== Array.isArray(expected)) return [{ path: path || '(gốc)', expected, actual }]
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
  return [...keys].flatMap((key) => listDifferences(actual[key], expected[key], path ? `${path}.${key}` : key))
}

/** So sánh với ảnh chụp. Khi lệch: báo câu nhắc và tối đa 10 chỗ khác, mỗi chỗ một dòng. */
export function assertMatchesGolden(assert, actual, expected) {
  const diffs = listDifferences(actual, expected)
  if (diffs.length > 0) {
    const lines = diffs.slice(0, 10).map((d) => `  ${d.path}: ảnh chụp = ${JSON.stringify(d.expected)}, bây giờ = ${JSON.stringify(d.actual)}`)
    assert.fail(`${GOLDEN_HINT}Có ${diffs.length} chỗ khác (hiện tối đa 10):\n${lines.join('\n')}`)
  }
  assert.deepEqual(actual, expected) // chốt chặn thứ hai, phòng khi hàm liệt kê ở trên bỏ sót
}
