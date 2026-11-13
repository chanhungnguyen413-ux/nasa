// Kho dữ liệu của người dùng, lưu NGAY TRÊN MÁY (localStorage; không gửi đi đâu):
//   field   ruộng đang xem { lat, lon, id?, name?, polygon? }
//   uploads file đã nhận { id, passport, records: [[ngày, giá trị, vĩ độ, kinh độ]], anchor, createdAt }
//   soil    số đo đất { id, date, where, lat, lon, ph, ec, ecType, om, soilType }
//   marks   đánh dấu của nông dân { id, type, lat, lon, date }
// Lưu không được (bộ nhớ đầy hoặc bị chặn): vẫn dùng trong phiên này và trang nói rõ là chưa lưu.
const DS_KEY = 'mvm-data-v1'

export const DS = { field: null, uploads: [], soil: [], marks: [], saved: true }

const dsStore = () => (typeof localStorage === 'undefined' ? null : localStorage)

export function dsLoad() {
  try {
    const raw = dsStore()?.getItem(DS_KEY)
    if (!raw) return DS
    const data = JSON.parse(raw)
    Object.assign(DS, { field: data.field ?? null, uploads: data.uploads ?? [], soil: data.soil ?? [], marks: data.marks ?? [] })
  } catch {
    /* dữ liệu hỏng: bắt đầu lại từ rỗng, không làm chết trang */
  }
  return DS
}

/** Ghi kho xuống máy. Trả về true nếu lưu được. */
export function dsSave() {
  try {
    dsStore()?.setItem(DS_KEY, JSON.stringify({ field: DS.field, uploads: DS.uploads, soil: DS.soil, marks: DS.marks }))
    DS.saved = true
  } catch {
    DS.saved = false
  }
  return DS.saved
}

export const dsNewId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Bản ghi gọn để lưu (mảng thay cho đối tượng: file lớn vẫn vừa bộ nhớ) và đọc lại. */
export const dsPackRecords = (records) => records.map((r) => [r.date, r.value, r.lat, r.lon])
export const dsUnpackRecords = (rows) => rows.map(([date, value, lat, lon]) => ({ date, value, lat, lon }))

export function dsAdd(kind, item) {
  DS[kind].push({ id: dsNewId(), ...item })
  return dsSave()
}

export function dsRemove(kind, id) {
  DS[kind] = DS[kind].filter((x) => x.id !== id)
  return dsSave()
}

export function dsSetField(field) {
  DS.field = field
  return dsSave()
}
