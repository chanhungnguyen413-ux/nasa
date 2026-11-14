// Kho dữ liệu của người dùng: localStorage, đồng bộ tài khoản qua authStore khi đã đăng nhập.
//   gardenGroups: tên/màu; gardenView: bộ lọc; gardens[].profile: chỉ số riêng của vườn con.
//   field   ruộng đang xem { lat, lon, id?, name?, polygon? }
//   uploads file đã nhận { id, passport, records: [[ngày, giá trị, vĩ độ, kinh độ]], anchor, createdAt }
//   soil    số đo đất { id, date, where, lat, lon, ph, ec, ecType, om, soilType }
//   marks   đánh dấu của nông dân { id, type, lat, lon, date }
// Lưu không được (bộ nhớ đầy hoặc bị chặn): vẫn dùng trong phiên này và trang nói rõ là chưa lưu.
import { gmColor, gmMigrateRecords, gmNormalizeGarden, gmNormalizeSnapshot } from '../logic/gardenModel.js'
const DS_KEY = 'mvm-data-v1'

export const DS = { field: null, gardens: [], gardenGroups: [], gardenView: { mode: 'group', id: null }, activeGardenId: null, uploads: [], soil: [], marks: [], saved: true }

const dsStore = () => (typeof localStorage === 'undefined' ? null : localStorage)
const dsActiveKey = () => (typeof auStorageKey === 'function' ? auStorageKey() : DS_KEY)

export function dsSnapshot() {
  return {
    field: DS.field,
    gardens: DS.gardens,
    gardenGroups: DS.gardenGroups,
    gardenView: DS.gardenView,
    activeGardenId: DS.activeGardenId,
    uploads: DS.uploads,
    soil: DS.soil,
    marks: DS.marks,
  }
}

export function dsApplySnapshot(data = null) {
  const normalized=gmNormalizeSnapshot(data)
  Object.assign(DS, {
    field: data?.field ?? null,
    ...normalized,
    activeGardenId: data?.activeGardenId ?? null,
    uploads: gmMigrateRecords(Array.isArray(data?.uploads) ? data.uploads : [],normalized.gardens),
    soil: gmMigrateRecords(Array.isArray(data?.soil) ? data.soil : [],normalized.gardens),
    marks: gmMigrateRecords(Array.isArray(data?.marks) ? data.marks : [],normalized.gardens),
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
  DS[kind].push({ id: dsNewId(), gardenId: DS.activeGardenId ?? null, ...item })
  // Phiếu đo mới cho cả vườn cũng cập nhật settings, để hai màn hình dùng cùng một hồ sơ hiện hành.
  const g=DS.gardens.find(g=>g.id===(item.gardenId ?? DS.activeGardenId))
  if(kind==='soil' && item.where==='field' && g) {
    const profile={...g.profile}
    for(const key of ['ph','ec','om']) if(typeof item[key]==='number')profile[key]=item[key]
    if(typeof item.ec==='number')profile.ecType=item.ecType ?? 'unknown'
    if(item.date)profile.measuredAt=item.date
    if(item.soilType && item.soilType!=='unknown')profile.soilType=item.soilType
    g.profile=gmNormalizeGarden({...g,profile}).profile
  }
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
  const entry = gmNormalizeGarden({
    ...(idx >= 0 ? DS.gardens[idx] : { createdAt: now }),
    ...garden,
    id,
    updatedAt: now,
  })
  if (idx >= 0) DS.gardens[idx] = entry
  else DS.gardens.push(entry)
  DS.activeGardenId = id
  DS.field = Number.isFinite(entry.lat) && Number.isFinite(entry.lon) ? {
    lat: entry.lat,
    lon: entry.lon,
    id: entry.districtId ?? null,
    name: entry.districtName ?? entry.name ?? null,
    polygon: entry.polygon ? entry.polygon.map((p) => [...p]) : null,
  } : null
  dsSave()
  return entry
}

export function dsSelectGarden(id) {
  const g = DS.gardens.find((x) => x.id === id)
  if (!g) return null
  DS.activeGardenId = g.id
  DS.field = Number.isFinite(g.lat) && Number.isFinite(g.lon) ? {
    lat: g.lat,
    lon: g.lon,
    id: g.districtId ?? null,
    name: g.districtName ?? g.name ?? null,
    polygon: g.polygon ? g.polygon.map((p) => [...p]) : null,
  } : null
  dsSave()
  return g
}

export function dsDeleteGarden(id) {
  DS.gardens = DS.gardens.filter((g) => g.id !== id)
  for (const kind of ['soil', 'marks', 'uploads']) DS[kind] = DS[kind].filter(item => item.gardenId !== id)
  if (DS.gardenView.mode === 'garden' && DS.gardenView.id === id) DS.gardenView = { mode: 'group', id: DS.gardenGroups[0]?.id ?? null }
  if (DS.activeGardenId === id) {
    const next = DS.gardens[0] ?? null
    DS.activeGardenId = next?.id ?? null
    DS.field = next && Number.isFinite(next.lat) && Number.isFinite(next.lon)
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

export function dsSaveGroup(group) {
  const now = new Date().toISOString()
  const id = group.id || dsNewId()
  const old = DS.gardenGroups.find(g => g.id === id)
  const entry = { ...old, ...group, id, color: gmColor(group.color ?? old?.color), updatedAt: now, createdAt: old?.createdAt ?? now }
  const idx = DS.gardenGroups.findIndex(g => g.id === id)
  if (idx >= 0) DS.gardenGroups[idx] = entry
  else DS.gardenGroups.push(entry)
  if (!DS.gardenView.id) DS.gardenView = { mode: 'group', id }
  dsSave()
  return entry
}
