// Bộ sinh VƯỜN / THỬA DEMO cho buổi trình bày trước ban giám khảo (hàm thuần, không đụng giao diện, không gọi mạng).
//
// Vì sao có file này: giám khảo cần thấy ngay mọi màn hình có đủ dữ liệu (13 tỉnh, nhiều loại đất, nhiều chuỗi cây),
// mà không phải ngồi vẽ từng thửa. Nhưng bất biến 1 & 4 (CLAUDE.md) vẫn giữ:
//   - Số nào CÓ dữ liệu tĩnh tại vị trí thửa (pH SoilGrids, độ mặn Wang 2025, nhóm đất FAO, lịch vụ MODIS) thì LẤY từ đó,
//     chỉ lệch nhẹ ngẫu nhiên để các thửa không giống hệt nhau.
//   - Phần không có nguồn (nguồn tưới, chất hữu cơ, ý muốn đổi cây, ngày đo, điểm đánh dấu) là số NGẪU NHIÊN.
//   - MỌI thửa demo mang cờ `demo: true` + nhóm có chữ "Mô phỏng giả định"; trang hiện nhãn "Mô phỏng giả định"
//     thay cho nhãn "Cao" của số bà con tự đo. Xóa được toàn bộ bằng một nút.
import { MEKONG_PROVINCES_GEO, mekongFindProvince } from '../data/mekongBoundaries.js'
import { CROP_LIBRARY } from '../data/cropLibrary.js'
import { ROTATIONS } from '../data/rotationCrops.js'
import { FI_MARK_TYPES } from '../sources/farmerInput.js'
import { rgParseWish } from './rotationGen.js'
import { SF_CHOICES, sfCropForSeason } from './smartFill.js'

// Khoảng ngẫu nhiên do nhóm chọn CHỈ để làm demo (không phải ngưỡng nông học, không dùng để chấm điểm thật).
export const DM_PARAMS = {
  perProvince: [1, 2], // số thửa mỗi tỉnh
  areaHa: [0.4, 3], // diện tích một thửa
  jitterDeg: 0.05, // lệch quanh tâm tỉnh (~5 km)
  phJitter: 0.3, // lệch quanh pH ô 5 km
  ecFactor: [0.8, 1.2], // nhân quanh độ mặn ô 5 km
  phFallback: [4.5, 7], // khi ô không có dữ liệu pH
  ecFallback: [0.3, 2.5], // khi ô không có dữ liệu độ mặn (dS/m)
  omPct: [1.5, 6], // chất hữu cơ (%) — không có lớp số tại chỗ, nên ngẫu nhiên
  measuredDaysAgo: [7, 120],
  marks: [1, 3],
  // Tháng gieo khi ô không có lịch MODIS: khung vụ phổ biến do nhóm chọn cho demo.
  sowingFallback: { dx: [11, 12, 1], ht: [4, 5], td: [8, 9] },
}

// Nhóm vườn demo theo tiểu vùng sinh thái (zoneId của mekongBoundaries.js); tên đã gắn nhãn mô phỏng.
export const DM_ZONE_GROUPS = {
  ZONE_01_ALLUVIAL_FRESHWATER: { name: 'Demo · Phù sa ngọt (Mô phỏng giả định)', color: '#588849', soil: ['alluvial', 'loam'] },
  ZONE_02_ACID_SULFATE_DTM: { name: 'Demo · Đồng Tháp Mười (Mô phỏng giả định)', color: '#d18a38', soil: ['acidSulfate', 'clay'] },
  ZONE_03_ORCHARD_ESTUARINE: { name: 'Demo · Ven sông Tiền (Mô phỏng giả định)', color: '#238d9b', soil: ['alluvial', 'loam'] },
  ZONE_04_WEST_HAU_ACID_BASIN: { name: 'Demo · Tây sông Hậu (Mô phỏng giả định)', color: '#b064bf', soil: ['acidSulfate', 'peat'] },
  ZONE_05_COASTAL_RICE_SHRIMP: { name: 'Demo · Ven biển lúa – tôm (Mô phỏng giả định)', color: '#c85e79', soil: ['saline', 'clay'] },
  ZONE_06_COASTAL_SAND_RIDGE: { name: 'Demo · Giồng cát ven biển (Mô phỏng giả định)', color: '#627cdb', soil: ['sandy', 'loam'] },
}

export const DM_NOTE = 'Mô phỏng giả định · dữ liệu demo cho buổi trình bày, không phải số đo thật / Simulated demo data, not real measurements.'

// Chuỗi cây "đang làm" để chọn ngẫu nhiên: 4 mẫu A–D + vài chuỗi khác trong thư viện 9 cây (đủ cây màu, rau).
const DM_EXTRA_CHAINS = [
  ['rice', 'soybean', 'rice'],
  ['rice', 'groundnut', 'maize'],
  ['maize', 'mungbean', 'rice'],
  ['rice', 'chili', 'rice'],
  ['rice', 'onion', 'cabbage'],
  ['tomato', 'rice', 'mungbean'],
  ['cabbage', 'rice', 'chili'],
]
const DM_WISHES = ['', ', muốn ít tưới', ', muốn tốt cho đất', ', muốn đa dạng cây', '']

/** Số ngẫu nhiên lặp lại được theo seed (mulberry32), để demo mỗi lần nạp cùng seed ra cùng dữ liệu. */
export function dmRng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const dmRound = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const dmBetween = (r, [a, b]) => a + r() * (b - a)
const dmInt = (r, [a, b]) => a + Math.floor(r() * (b - a + 1))
const dmPick = (r, list) => list[Math.floor(r() * list.length)]

/** Ngày YYYY-MM-DD lùi `days` ngày so với `today` (YYYY-MM-DD). */
function dmDaysAgo(today, days) {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Một điểm trong tỉnh: thử lệch quanh tâm, giữ điểm nào nằm đúng ranh tỉnh; không được thì trả null. */
function dmPointIn(r, prov, find) {
  for (let i = 0; i < 40; i++) {
    const lat = prov.center[0] + (r() * 2 - 1) * DM_PARAMS.jitterDeg * (1 + i / 10)
    const lon = prov.center[1] + (r() * 2 - 1) * DM_PARAMS.jitterDeg * (1 + i / 10)
    if (find(lat, lon)?.code === prov.code) return [dmRound(lat, 5), dmRound(lon, 5)]
  }
  return null
}

/** Ranh thửa hình chữ nhật xoay ngẫu nhiên, diện tích areaHa, tâm (lat, lon). */
export function dmRectangle(lat, lon, areaHa, ratio, angle) {
  const m2 = areaHa * 10000
  const w = Math.sqrt(m2 * ratio)
  const h = m2 / w
  const mLat = 111320
  const mLon = 111320 * Math.cos((lat * Math.PI) / 180)
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => {
    const rx = x * Math.cos(angle) - y * Math.sin(angle)
    const ry = x * Math.sin(angle) + y * Math.cos(angle)
    return [dmRound(lat + ry / mLat, 6), dmRound(lon + rx / mLon, 6)]
  })
}

/**
 * Sinh bộ vườn demo.
 *   seed: số nguyên · today: 'YYYY-MM-DD' · fillFor({ profile, lat, lon }) → kết quả sfFill (dữ liệu tĩnh tại vị trí)
 *   provinces / find: mặc định 13 tỉnh ĐBSCL + mekongFindProvince
 * Trả về { groups, gardens, marks } đúng hợp đồng DS (gardens chưa chuẩn hóa; dataStore sẽ chuẩn hóa khi nạp).
 */
export function dmBuildDemo({ seed = 2026, today, fillFor, provinces = MEKONG_PROVINCES_GEO, find = mekongFindProvince } = {}) {
  if (!today || typeof fillFor !== 'function') throw new Error('dmBuildDemo cần today và fillFor')
  const r = dmRng(seed)
  const groups = new Map()
  const gardens = []
  const marks = []
  for (const prov of provinces) {
    const zone = DM_ZONE_GROUPS[prov.zoneId] ?? DM_ZONE_GROUPS.ZONE_01_ALLUVIAL_FRESHWATER
    const groupId = `demo-grp-${prov.zoneId ?? 'other'}`
    if (!groups.has(groupId)) groups.set(groupId, { id: groupId, name: zone.name, color: zone.color, demo: true })
    const count = dmInt(r, DM_PARAMS.perProvince)
    for (let n = 1; n <= count; n++) {
      const pt = dmPointIn(r, prov, find)
      if (!pt) continue
      const [lat, lon] = pt
      const fill = fillFor({ profile: {}, lat, lon })?.fields ?? {}
      const auto = (k) => (fill[k]?.origin === 'auto' ? fill[k] : null)

      // Chuỗi cây đang làm + mong muốn (chữ tự do như bà con gõ).
      const chain = r() < 0.45 ? dmPick(r, ROTATIONS).crops : dmPick(r, DM_EXTRA_CHAINS)
      const currentText = chain.map((c) => CROP_LIBRARY[c].name.vi.toLowerCase()).join(' - ') + dmPick(r, DM_WISHES)
      const ids = rgParseWish(currentText).crops.map((c) => c.id)
      const currentId = ROTATIONS.find((rt) => rt.crops.length === ids.length && rt.crops.every((c, i) => c === ids[i]))?.id ?? null

      // Mùa vụ + tháng gieo: lịch MODIS tại chỗ nếu có, không thì khung demo.
      const season = auto('season')?.value ?? dmPick(r, SF_CHOICES.season)
      const sowing = auto('season') ? auto('sowing')?.value ?? auto('season').months?.[0] : dmPick(r, DM_PARAMS.sowingFallback[season])
      const seasonIdx = SF_CHOICES.season.indexOf(season)
      const cropId = sfCropForSeason(currentText, seasonIdx)?.id ?? chain[0]

      // pH / độ mặn: lấy ô 5 km (SoilGrids, Wang 2025) rồi lệch nhẹ; không có ô → khoảng demo.
      const ph = auto('ph') ? dmRound(Math.min(8.5, Math.max(3.5, auto('ph').value + (r() * 2 - 1) * DM_PARAMS.phJitter))) : dmRound(dmBetween(r, DM_PARAMS.phFallback))
      const ec = auto('ec') ? dmRound(Math.max(0.1, auto('ec').value * dmBetween(r, DM_PARAMS.ecFactor))) : dmRound(dmBetween(r, DM_PARAMS.ecFallback))
      const soilType = auto('soilType')?.value ?? dmPick(r, zone.soil)

      const areaHa = dmBetween(r, DM_PARAMS.areaHa)
      const polygon = dmRectangle(lat, lon, areaHa, dmBetween(r, [0.5, 2]), r() * Math.PI)
      const id = `demo-${seed}-${prov.code}-${n}`
      gardens.push({
        id,
        name: `${prov.vi} · Thửa ${n}`,
        groupId,
        demo: true,
        lat,
        lon,
        polygon,
        areaM2: Math.round(areaHa * 10000),
        districtName: prov.vi,
        profile: {
          cropId,
          cropName: null,
          currentText,
          currentId,
          season,
          sowing,
          irrigation: dmPick(r, SF_CHOICES.irrigation),
          ph,
          ec,
          ecType: 'ece', // giả định đo bằng chiết bão hòa (ECe) để demo đủ đường chấm điểm độ mặn
          om: dmRound(dmBetween(r, DM_PARAMS.omPct)),
          soilType,
          measuredAt: dmDaysAgo(today, dmInt(r, DM_PARAMS.measuredDaysAgo)),
          notes: DM_NOTE,
          cropChange: dmPick(r, ['yes', 'partial', 'no']),
        },
      })
      // Điểm đánh dấu trong thửa (hay ngập / khô nhanh / phèn-mặn / đất tốt).
      const k = dmInt(r, DM_PARAMS.marks)
      for (let i = 0; i < k; i++) {
        const a = polygon[0], b = polygon[1], d = polygon[3]
        const u = 0.2 + r() * 0.6, v = 0.2 + r() * 0.6
        marks.push({
          id: `${id}-m${i}`,
          gardenId: id,
          type: i === 0 ? 'flood' : dmPick(r, FI_MARK_TYPES), // điểm đầu luôn là "hay ngập" để dòng Điểm hay ngập có số
          lat: dmRound(a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v, 6),
          lon: dmRound(a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v, 6),
          date: dmDaysAgo(today, dmInt(r, [1, 90])),
          demo: true,
        })
      }
    }
  }
  return { groups: [...groups.values()], gardens, marks }
}

/** Gỡ mọi thứ demo khỏi một bản chụp DS (thửa, nhóm, điểm đánh dấu, phiếu đất của thửa demo). Hàm thuần. */
export function dmStripDemo(snapshot) {
  const demoIds = new Set((snapshot.gardens ?? []).filter((g) => g.demo).map((g) => g.id))
  const keep = (list) => (list ?? []).filter((x) => !x.demo && !demoIds.has(x.gardenId))
  return {
    ...snapshot,
    gardens: (snapshot.gardens ?? []).filter((g) => !g.demo),
    gardenGroups: (snapshot.gardenGroups ?? []).filter((g) => !g.demo),
    marks: keep(snapshot.marks),
    soil: keep(snapshot.soil),
    uploads: keep(snapshot.uploads),
    activeGardenId: demoIds.has(snapshot.activeGardenId) ? null : snapshot.activeGardenId ?? null,
  }
}
