// Lấy đầu vào cho rankRotations() của một huyện từ các file JSON đã tính sẵn bằng Python.
// PRE = { climate: climate_monthly.json, kmeans: calendar_kmeans.json, comparison: method_comparison.json }

export function districtInputs(PRE, id) {
  // Lịch vụ cấp tỉnh (tâm tỉnh, cùng phương pháp, gán vào nhóm k-means đã lưu — không chạy lại k-means).
  const prov = PRE.provinceCal?.find((p) => p.id === id)
  if (prov) {
    const cluster = PRE.kmeans.clusters.find((c) => c.cluster === prov.calendarCluster)
    return {
      climate: prov.climate,
      peakDays: cluster.shape.peakDayOfYear,
      sensitivity: { min: prov.sensitivity.min, max: prov.sensitivity.max },
      calendarCluster: prov.calendarCluster,
      calendarYear: prov.calendarYear,
    }
  }
  const climate = PRE.climate.districts.find((d) => d.id === id).months
  // Lịch vụ: nhóm k-means của NĂM GẦN NHẤT của huyện (Mỹ Tú đổi nhóm từ 2023)
  const lastYear = PRE.kmeans.clusters
    .flatMap((c) => c.members)
    .filter((m) => m.id === id)
    .reduce((y, m) => Math.max(y, m.year), 0)
  const cluster = PRE.kmeans.clusters.find((c) => c.members.some((m) => m.id === id && m.year === lastYear))
  const sens = PRE.comparison.sensitivity.districts[id]
  return {
    climate,
    peakDays: cluster.shape.peakDayOfYear,
    sensitivity: { min: sens.min, max: sens.max },
    calendarCluster: cluster.cluster,
    calendarYear: lastYear,
  }
}
