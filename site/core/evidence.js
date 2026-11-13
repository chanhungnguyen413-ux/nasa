// Hợp đồng bằng chứng (mục 3 của docs/blueprint/00-BLUEPRINT.md).
// Mọi con số đi vào logic hoặc ra màn hình là một đối tượng Evidence: giá trị + đơn vị + LOẠI + nguồn + dấu vết.
// Vì sao: để không con số nào xuất hiện mà người xem không truy ngược được nó từ đâu ra.
//
// Hai quy tắc cứng nằm trong evDerive():
//  1. Một đầu vào BẮT BUỘC bị thiếu → kết quả là 'missing' (không có giá trị thay thế).
//  2. Một đầu vào là 'simulated' → kết quả là 'simulated'.

export const EV_KINDS = ['satellite', 'model', 'ground', 'farmer', 'reference', 'derived', 'simulated', 'missing']

/**
 * Chữ song ngữ cho các trường mô tả (note, formula, period, resolution, lý do thiếu).
 * Vì sao: logic là hàm thuần, không biết trang đang ở tiếng nào; trang chọn vi/en lúc hiển thị.
 */
export const evText = (vi, en) => ({ vi, en })

/** Tạo một Evidence có giá trị. `kind` phải nằm trong EV_KINDS và không được là 'missing'. */
export function evidence({ value, unit = '', kind, source = null, period = null, resolution = null, fetchedAt = null, formula = null, inputs = [], note = null, label = null }) {
  if (!EV_KINDS.includes(kind) || kind === 'missing') throw new Error(`evidence(): kind không hợp lệ: ${kind}`)
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`evidence(): value phải là số hữu hạn (nhận ${value}). Thiếu số thì dùng evMissing().`)
  return { value, unit, kind, source, period, resolution, fetchedAt, formula, inputs, note, label }
}

/**
 * Tạo một Evidence "thiếu dữ liệu". Luôn kèm lý do và việc cần làm, để trang nói được với người dùng.
 * need: 'measure' (đo tại ruộng) | 'upload' (tải file) | 'retry' (thử lại) | 'answer' (trả lời câu hỏi) | 'source' (cần nguồn có số)
 */
export function evMissing({ reason, need = 'source', unit = '', inputs = [], label = null, source = null }) {
  return { value: null, unit, kind: 'missing', source, period: null, resolution: null, fetchedAt: null, formula: null, inputs, note: reason, need, label }
}

export const evIsMissing = (ev) => !ev || ev.kind === 'missing'

/**
 * Tính một con số mới từ các Evidence khác, giữ nguyên dấu vết.
 *   inputs:   { tên: Evidence }  — mọi đầu vào đều BẮT BUỘC, trừ tên nằm trong `optional`
 *   compute:  hàm nhận { tên: số (hoặc null nếu đầu vào tuỳ chọn bị thiếu) } và trả về một số
 * Kết quả: kind 'derived', hoặc 'simulated' nếu có đầu vào mô phỏng, hoặc 'missing' nếu thiếu đầu vào bắt buộc
 * (hoặc compute trả về không phải số hữu hạn).
 */
export function evDerive({ inputs, optional = [], compute, unit = '', formula = null, label = null, note = null, source = null }) {
  const list = Object.entries(inputs).map(([name, ev]) => ({ ...(ev ?? evMissing({ reason: evText(`không có đầu vào "${name}"`, `no input "${name}"`) })), inputName: name }))
  const lacking = list.filter((ev) => evIsMissing(ev) && !optional.includes(ev.inputName))
  if (lacking.length > 0) {
    // Không ghép tên đầu vào vào câu: danh sách đầu vào (kèm tên đã dịch) hiện ngay bên dưới trong sổ bằng chứng.
    return evMissing({ reason: evText(`thiếu ${lacking.length} đầu vào (xem danh sách đầu vào)`, `${lacking.length} input(s) missing (see the input list)`), need: lacking[0].need ?? 'source', unit, inputs: list, label, source })
  }
  const values = Object.fromEntries(list.map((ev) => [ev.inputName, evIsMissing(ev) ? null : ev.value]))
  const value = compute(values)
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return evMissing({ reason: evText('không tính được từ các đầu vào hiện có', 'cannot be computed from the available inputs'), need: 'source', unit, inputs: list, label, source })
  }
  const kind = list.some((ev) => ev.kind === 'simulated') ? 'simulated' : 'derived'
  return { value, unit, kind, source, period: null, resolution: null, fetchedAt: null, formula, inputs: list, note, label }
}

/** Đổi giá trị của một Evidence đã có (vd. làm tròn) mà vẫn giữ toàn bộ dấu vết. */
export const evWithValue = (ev, value) => (evIsMissing(ev) ? ev : { ...ev, value })
