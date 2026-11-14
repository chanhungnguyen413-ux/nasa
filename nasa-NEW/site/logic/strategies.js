// Ba chiến lược luân canh (blueprint mục 4.5), CHỌN BẰNG TÍNH TOÁN từ kết quả rankRotations():
//   1. Cơ sở: kiểu nông dân đang làm (mặc định A, cho đổi).
//   2. Tiết kiệm nước, chống hạn: ứng viên cần ít nước tưới nhất ở năm khô (extraMm + dryPenaltyMm),
//      bằng nhau thì xét năm thường (extraMm).
//   3. Phục hồi đất, ngắt chu kỳ sâu bệnh: ứng viên có soilPoints cao nhất (cây màu + họ đậu + rễ sâu),
//      bằng nhau thì ứng viên cần ít nước hơn.
// Ứng viên cho 2 và 3 là các kiểu KHÁC kiểu đang làm (giữ nguyên cách cũ không phải là một sự thay đổi).
// Một ứng viên thắng cả 2 và 3: hiện nó ở ô 2 với hai nhãn, ô 3 lấy ứng viên kế tiếp về đất.
// Hàm thuần: không đụng giao diện.

export const STRATEGY_KINDS = ['base', 'water', 'soil']

const stDryYear = (r) => r.measures.extraMm + r.measures.dryPenaltyMm

/**
 * result: kết quả rankRotations() (rankable) · currentId: kiểu đang làm.
 * Trả về [{ kind, rot, alsoWins?: 'soil', runnerUp?: true, metric }] theo thứ tự base, water, soil; null nếu không đủ ứng viên.
 */
export function pickStrategies(result, currentId = 'A') {
  if (!result?.rankable) return null
  const base = result.rotations.find((r) => r.id === currentId) ?? result.rotations.find((r) => r.baseline)
  const others = result.rotations.filter((r) => r.id !== base.id)
  if (others.length < 2) return null
  const byWater = [...others].sort((a, b) => stDryYear(a) - stDryYear(b) || a.measures.extraMm - b.measures.extraMm || a.id.localeCompare(b.id))
  const bySoil = [...others].sort((a, b) => b.measures.soilPoints - a.measures.soilPoints || stDryYear(a) - stDryYear(b) || a.id.localeCompare(b.id))
  const water = byWater[0]
  const soilFirst = bySoil[0]
  const metricOf = (r) => ({ extraMm: r.measures.extraMm, dryYearMm: stDryYear(r), soilPoints: r.measures.soilPoints })
  const out = [{ kind: 'base', rot: base, metric: metricOf(base) }]
  if (water.id === soilFirst.id) {
    out.push({ kind: 'water', rot: water, alsoWins: 'soil', metric: metricOf(water) })
    const next = bySoil.find((r) => r.id !== water.id)
    out.push({ kind: 'soil', rot: next, runnerUp: true, metric: metricOf(next) })
  } else {
    out.push({ kind: 'water', rot: water, metric: metricOf(water) })
    out.push({ kind: 'soil', rot: soilFirst, metric: metricOf(soilFirst) })
  }
  return out
}
