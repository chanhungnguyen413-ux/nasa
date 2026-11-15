// Mô hình nhóm/vườn và đánh giá thuần: không dùng giao diện hoặc kho trình duyệt.
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { fdField } from './fieldData.js'
import { fiCheck } from '../sources/farmerInput.js'
import { suitWindow } from './suitability.js'
import { znAssess } from './zones.js'
import { hzPointInPolygon } from '../core/harmonize.js'

export const GARDEN_COLORS = ['#627cdb', '#b064bf', '#238d9b', '#d18a38', '#c85e79', '#588849']
export const GARDEN_GRADES = { gray: '#9aa59e', green: '#5b8c1a', yellow: '#c58a12', red: '#a43c28' }
export const gmProfileDefaults = () => ({ cropId: null, cropName: null, useEstimates: true, currentText: null, season: null, sowing: null, irrigation: null, ph: null, ec: null, ecType: 'unknown', om: null, soilType: 'unknown', measuredAt: null, notes: '', cropChange: null, currentId: null })
export const gmColor = (color) => /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : GARDEN_COLORS[0]

// Bỏ dấu + chữ thường để so tên cây gõ tay với tên trong thư viện ("Dau xanh" khớp "Đậu xanh").
const gmFold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Đổi chữ nông dân gõ ở ô "Cây trồng" thành { cropId, cropName }.
 * Khớp tên VI/EN hoặc mã cây trong CROP_LIBRARY → cropId; không khớp → giữ tên tự do (cropId null) để báo thiếu tham số FAO.
 */
export function gmResolveCrop(text, library = CROP_LIBRARY) {
  const raw = String(text ?? '').trim().slice(0, 60)
  if (!raw) return { cropId: null, cropName: null }
  const key = gmFold(raw)
  for (const [id, crop] of Object.entries(library)) {
    if (key === gmFold(id) || key === gmFold(crop.name?.vi) || key === gmFold(crop.name?.en)) return { cropId: id, cropName: null }
  }
  return { cropId: null, cropName: raw }
}

/** Tên cây để hiển thị: tên thư viện theo ngôn ngữ, hoặc tên tự nhập; custom = true nếu ngoài thư viện. */
export function gmCropLabel(profile, lang = 'vi', library = CROP_LIBRARY) {
  if (profile?.cropId && library[profile.cropId]) return { name: library[profile.cropId].name[lang], custom: false }
  if (profile?.cropName) return { name: profile.cropName, custom: true }
  return null
}

// Tab nào vẽ thửa vườn lên bản đồ. Tab 4 "Chiến thuật" PHẢI giữ thửa + vùng đánh dấu (bug cũ: bị xóa khi chuyển tab).
// Chỉ Tab 2 "Cây phù hợp" ẩn thửa vì nó tô màu theo cả tỉnh.
export const gmTabDrawsGardens = (tab) => tab === 'field' || tab === 'cond' || tab === 'compare'

export function gmNormalizeGarden(garden) {
  const p = { ...gmProfileDefaults(), ...garden.profile }
  // Chuyển bản vườn cũ; không lấy cây hay chỉ số từ trạng thái giao diện chung.
  if (!garden.profile) {
    p.season = garden.season ?? null
    p.sowing = garden.sowing ?? null
    p.irrigation = garden.irrigation ?? null
    p.cropChange = garden.cropChange ?? null
    p.currentId = garden.currentId ?? null
  }
  p.cropId = CROP_LIBRARY[p.cropId] ? p.cropId : null
  // Tên cây tự nhập (ngoài thư viện FAO): giữ nguyên chữ của nông dân, cắt khoảng trắng, tối đa 60 ký tự.
  p.cropName = !p.cropId && typeof p.cropName === 'string' && p.cropName.trim() ? p.cropName.trim().slice(0, 60) : null
  p.useEstimates = p.useEstimates !== false
  // Cách đang làm gõ tự do (vd "ngô - đậu phộng - lúa"): giữ nguyên chữ của bà con, tối đa 160 ký tự.
  p.currentText = typeof p.currentText === 'string' && p.currentText.trim() ? p.currentText.trim().slice(0, 160) : null
  for (const key of ['ph', 'ec', 'om']) {
    const n = fiCheck(key, p[key])
    p[key] = n === 'out' ? null : n
  }
  p.sowing = Number.isInteger(p.sowing) && p.sowing >= 1 && p.sowing <= 12 ? p.sowing : null
  p.irrigation = ['yes', 'limited', 'no'].includes(p.irrigation) ? p.irrigation : null
  p.season = ['dx', 'ht', 'td'].includes(p.season) ? p.season : null
  p.ecType = ['ece', 'ecw', 'ec15', 'unknown'].includes(p.ecType) ? p.ecType : 'unknown'
  p.soilType = ['unknown','alluvial','acidSulfate','saline','clay','loam','sandy','peat'].includes(p.soilType) ? p.soilType : 'unknown'
  return { ...garden, profile: p }
}

export function gmNormalizeSnapshot(data = null) {
  const gardens = (Array.isArray(data?.gardens) ? data.gardens : []).map(gmNormalizeGarden)
  const groups = (Array.isArray(data?.gardenGroups) ? data.gardenGroups : []).map(g => ({ ...g, color: gmColor(g.color) }))
  if (gardens.some(g => !groups.some(group => group.id === g.groupId))) {
    const legacy = { id: 'legacy-gardens', name: 'Vườn của tôi', color: GARDEN_COLORS[0] }
    if (!groups.some(g => g.id === legacy.id)) groups.push(legacy)
    gardens.forEach(g => { if (!groups.some(group => group.id === g.groupId)) g.groupId = legacy.id })
  }
  const view = data?.gardenView ?? { mode: 'group', id: groups[0]?.id ?? null }
  const mode = view.mode === 'garden' ? 'garden' : 'group'
  const valid = view.id === '*' || (mode === 'group' ? groups : gardens).some(g => g.id === view.id)
  return { gardens, gardenGroups: groups, gardenView: valid ? { mode, id: view.id } : { mode:'group', id:groups[0]?.id ?? null } }
}

export function gmVisibleGardens(gardens, view) {
  if (!view?.id) return []
  if (view.id === '*') return gardens
  return gardens.filter(g => view.mode === 'garden' ? g.id === view.id : g.groupId === view.id)
}

// Bộ lọc chỉ xác định vườn cần tô chi tiết; các vườn còn lại vẫn là ngữ cảnh trên bản đồ.
export function gmMapPresentation(gardens,view,editingId=null) {
  const focused=new Set(gmVisibleGardens(gardens,view).map(g=>g.id))
  return gardens.filter(gmHasBoundary).map(g=>({garden:g,focused:focused.has(g.id),editing:g.id===editingId}))
    .sort((a,b)=>Number(a.focused)-Number(b.focused))
}

// Kiểu vẽ một vườn trên bản đồ: màu nền LUÔN là mức phù hợp thật của chính vườn đó (kể cả khi không được chọn
// hay đang lọc nhóm khác). Vườn đang chọn / đang lọc chỉ khác ở độ dày viền và độ đậm, không bị ép về xám.
export function gmMapStyle({ grade, active = false, focused = false }) {
  const g = GARDEN_GRADES[grade] ? grade : 'gray'
  return {
    grade: g,
    fillColor: GARDEN_GRADES[g],
    weight: active ? 4 : focused ? 2.8 : 2,
    fillOpacity: active ? 0.58 : focused ? 0.45 : 0.32,
    dashArray: g === 'gray' ? '6 4' : null,
  }
}

export const gmHasBoundary = g => Array.isArray(g?.polygon) && g.polygon.length >= 3 && Number.isFinite(g.lat) && Number.isFinite(g.lon)
export const gmScopeRecords = (records, garden) => records.filter(r => r.gardenId === garden.id)

// Chỉ nhận quyền sở hữu bản ghi cũ khi vị trí xác định được đúng một vườn.
// Bản ghi mơ hồ vẫn được giữ trong kho, không tự dùng khoảng cách 1 km để gán cho mọi vườn lân cận.
export function gmMigrateRecords(records, gardens) {
  return records.map(record => {
    if (record.gardenId) return record
    const at=record.anchor ?? record
    if (!Number.isFinite(at.lat) || !Number.isFinite(at.lon)) return record
    const matches=gardens.filter(g => gmHasBoundary(g) && hzPointInPolygon([at.lat,at.lon],g.polygon))
    return matches.length === 1 ? { ...record, gardenId:matches[0].id } : record
  })
}

export function gmProfileSoil(garden) {
  const p = garden.profile ?? gmProfileDefaults()
  if (![p.ph, p.ec, p.om].some(v => typeof v === 'number')) return []
  return [{ id: `profile-${garden.id}`, gardenId: garden.id, where: 'field', lat: garden.lat, lon: garden.lon, date: p.measuredAt ?? garden.updatedAt?.slice(0, 10) ?? '', ph: p.ph, ec: p.ec, ecType: p.ecType, om: p.om, soilType: p.soilType }]
}

// Settings là giá trị hiện hành của cả vườn. Lịch sử đo không được ghi đè sau khi người dùng vừa lưu.
// Điểm đo môi trường chỉ tạo vùng riêng cho chỉ tiêu chưa được đặt trong settings.
export function gmSoilInputs(garden, soil = []) {
  const p=garden.profile ?? gmProfileDefaults()
  const points=gmScopeRecords(soil,garden).filter(s=>s.where==='point').map(s=>({
    ...s,
    ph:typeof p.ph==='number'?null:s.ph,
    ec:typeof p.ec==='number'?null:s.ec,
  })).filter(s=>typeof s.ph==='number'||typeof s.ec==='number')
  return [...gmProfileSoil(garden),...points]
}

export function gmAssessmentKey({garden,climate=null,windows=null,soil=[],marks=[],estimates=null}) {
  const ordered=records=>[...records].sort((a,b)=>String(a.id).localeCompare(String(b.id)))
  return JSON.stringify({
    garden:{id:garden.id,lat:garden.lat,lon:garden.lon,polygon:garden.polygon,profile:garden.profile},
    climate,windows,soil:ordered(gmSoilInputs(garden,soil)),marks:ordered(gmScopeRecords(marks,garden)),
    estimates:estimates?{ph:estimates.ph?.value??null,ec:estimates.ec?.value??null}:null,
  })
}

export function gmAssessGarden({ garden, climate = null, windows = null, soil = [], marks = [], estimates = null }) {
  const p = garden.profile ?? gmProfileDefaults()
  const empty = reason => ({ grade: 'gray', reason, zones: null, result: null, field: null })
  // Cây tự nhập ngoài thư viện: giữ tên, báo thiếu tham số FAO (không ép thành "chưa chọn cây").
  if (!p.cropId && p.cropName) return empty('cropNotInLibrary')
  if (!p.cropId) return empty('noCrop')
  if (!gmHasBoundary(garden)) return empty('noBoundary')
  if (!climate) return empty('noClimate')
  const ndviWindow = windows?.find(w => w.season === p.season) ?? null
  if (!ndviWindow && !p.sowing) return empty('noSeason')
  const field = fdField({ lat: garden.lat, lon: garden.lon }, garden.polygon, garden.id)
  const window = suitWindow({ ndviWindow, sowingMonth: p.sowing, crop: p.cropId })
  const scopedSoil = gmSoilInputs(garden, soil)
  const zones = znAssess({ crop: p.cropId, window, climate, irrigation: p.irrigation, field, soil: scopedSoil, marks: gmScopeRecords(marks, garden), estimates })
  // Những thửa quá hẹp không chứa tâm ô vẫn phải giữ xám thay vì tạo vùng giả.
  if (!zones.cells.length) return empty('noCells')
  const order = ['green', 'yellow', 'red']
  const grades = zones.cells.map(c => c.result.overall)
  const grade = grades.includes('gray') ? 'gray' : grades.reduce((a,b) => order.indexOf(b) > order.indexOf(a) ? b : a, 'green')
  const representative=zones.zones.find(z=>z.result.overall===grade) ?? zones.zones[0]
  return { grade, reason: grade === 'gray' ? 'missingData' : 'assessed', zones, field, window, result: representative?.result ?? null }
}
