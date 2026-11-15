// Ưu tiên của nông dân CHỈ sắp thứ tự cây TRONG CÙNG MỘT HẠNG (blueprint 4.4): không bao giờ đẩy cây Đỏ lên trên cây Xanh.
//   'water'  ít nước: cây cần tưới thêm ít hơn (năm thường) đứng trước
//   'soil'   cải tạo đất: điểm đất cao hơn đứng trước (cây màu, cây họ đậu, rễ sâu hơn lúa: mỗi thứ 1 điểm,
//            cùng luật với trang Luân canh)
//   'market' dễ bán: KHÔNG có dữ liệu giá, nên không đổi thứ tự; trang hiện đây là khoảng trống thông tin.
import { CROP_LIBRARY } from '../data/cropLibrary.js'

export const CP_PRIORITIES = ['water', 'market', 'soil']
const CP_GRADE_ORDER = ['green', 'yellow', 'red', 'gray']

/** Điểm cải tạo đất của một cây (0–3), cùng luật với soilPoints() của site/logic/rotation.js. */
export function cpSoilPoints(cropId) {
  const info = CROP_LIBRARY[cropId]
  return (info.upland ? 1 : 0) + (info.legume ? 1 : 0) + (info.rootM[1] > CROP_LIBRARY.rice.rootM[1] ? 1 : 0)
}

/** Nước cần tưới thêm năm thường (mm) từ tiêu chí nước đã chấm; chưa tính được → Infinity (xếp cuối). */
const cpDeficit = (r) => r.criteria.find((c) => c.key === 'water')?.numbers?.deficitNormal ?? Infinity

/**
 * results: mảng suitAssess(). priority: null | 'water' | 'market' | 'soil'.
 * Trả về mảng mới: theo hạng chung trước, rồi theo ưu tiên trong cùng hạng; còn lại giữ thứ tự thư viện (sắp xếp ổn định).
 */
export function cpSort(results, priority = null) {
  const keyed = results.map((r, i) => ({ r, i }))
  keyed.sort((a, b) => {
    const g = CP_GRADE_ORDER.indexOf(a.r.overall) - CP_GRADE_ORDER.indexOf(b.r.overall)
    if (g !== 0) return g
    if (priority === 'water') {
      const d = cpDeficit(a.r) - cpDeficit(b.r)
      if (d !== 0 && Number.isFinite(d)) return d
      if (!Number.isFinite(cpDeficit(a.r)) !== !Number.isFinite(cpDeficit(b.r))) return Number.isFinite(cpDeficit(a.r)) ? -1 : 1
    }
    if (priority === 'soil') {
      const s = cpSoilPoints(b.r.crop) - cpSoilPoints(a.r.crop)
      if (s !== 0) return s
    }
    return a.i - b.i
  })
  return keyed.map((k) => k.r)
}
