// Kho dữ liệu của người dùng, lưu NGAY TRÊN MÁY (localStorage; không gửi đi đâu):
//   field   ruộng đang xem { lat, lon, id?, name?, polygon? }
//   uploads file đã nhận { id, passport, records: [[ngày, giá trị, vĩ độ, kinh độ]], anchor, createdAt }
//   soil    số đo đất { id, date, where, lat, lon, ph, ec, ecType, om, soilType }
//   marks   đánh dấu của nông dân { id, type, lat, lon, date }
// Lưu không được (bộ nhớ đầy hoặc bị chặn): vẫn dùng trong phiên này và trang nói rõ là chưa lưu.
const DS_KEY = 'mvm-data-v1'

export const DS = { field: null, gardens: [], activeGardenId: null, uploads: [], soil: [], marks: [], saved: true }

const dsStore = () => (typeof localStorage === 'undefined' ? null : localStorage)
const dsActiveKey = () => (typeof auStorageKey === 'function' ? auStorageKey() : DS_KEY)

export function dsSnapshot() {
  return {
    field: DS.field,
    gardens: DS.gardens,
    activeGardenId: DS.activeGardenId,
    uploads: DS.uploads,
    soil: DS.soil,
    marks: DS.marks,
  }
}

export function dsApplySnapshot(data = null) {
  Object.assign(DS, {
    field: data?.field ?? null,
    gardens: Array.isArray(data?.gardens) ? data.gardens : [],
    activeGardenId: data?.activeGardenId ?? null,
    uploads: Array.isArray(data?.uploads) ? data.uploads : [],
    soil: Array.isArray(data?.soil) ? data.soil : [],
    marks: Array.isArray(data?.marks) ? data.marks : [],
  })
  return DS
}

export function dsResetToDefault() {
  dsApplySnapshot(null)
  try {
    dsStore()?.removeItem(DS_KEY)
    DS.saved = true
  } catch {
    DS.saved = false
  }
  return DS
}

export function dsLoad() {
  try {
    const raw = dsStore()?.getItem(dsActiveKey())
    if (!raw) return dsApplySnapshot(null)
    dsApplySnapshot(JSON.parse(raw))
  } catch {
    /* dữ liệu hỏng: bắt đầu lại từ rỗng, không làm chết trang */
    dsApplySnapshot(null)
  }
  return DS
}

/** Ghi kho xuống máy và đồng bộ lên tài khoản (nếu đã đăng nhập). Trả về true nếu lưu được. */
export function dsSave() {
  try {
    dsStore()?.setItem(dsActiveKey(), JSON.stringify(dsSnapshot()))
    DS.saved = true
    if (typeof auSyncToCloud === 'function') auSyncToCloud()
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

export function dsSaveGarden(garden) {
  const now = new Date().toISOString()
  const id = garden.id || dsNewId()
  const idx = DS.gardens.findIndex((g) => g.id === id)
  const entry = {
    ...(idx >= 0 ? DS.gardens[idx] : { createdAt: now }),
    ...garden,
    id,
    updatedAt: now,
  }
  if (idx >= 0) DS.gardens[idx] = entry
  else DS.gardens.push(entry)
  DS.activeGardenId = id
  DS.field = {
    lat: entry.lat,
    lon: entry.lon,
    id: entry.districtId ?? null,
    name: entry.districtName ?? entry.name ?? null,
    polygon: entry.polygon ? entry.polygon.map((p) => [...p]) : null,
  }
  dsSave()
  return entry
}

export function dsSelectGarden(id) {
  const g = DS.gardens.find((x) => x.id === id)
  if (!g) return null
  DS.activeGardenId = g.id
  DS.field = {
    lat: g.lat,
    lon: g.lon,
    id: g.districtId ?? null,
    name: g.districtName ?? g.name ?? null,
    polygon: g.polygon ? g.polygon.map((p) => [...p]) : null,
  }
  dsSave()
  return g
}

export function dsDeleteGarden(id) {
  DS.gardens = DS.gardens.filter((g) => g.id !== id)
  if (DS.activeGardenId === id) {
    const next = DS.gardens[0] ?? null
    DS.activeGardenId = next?.id ?? null
    DS.field = next
      ? {
          lat: next.lat,
          lon: next.lon,
          id: next.districtId ?? null,
          name: next.districtName ?? next.name ?? null,
          polygon: next.polygon ? next.polygon.map((p) => [...p]) : null,
        }
      : null
  }
  return dsSave()
}
