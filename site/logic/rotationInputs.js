// Lấy đầu vào cho rankRotations() của một huyện từ các file JSON đã tính sẵn bằng Python.
// PRE = { climate: climate_monthly.json, kmeans: calendar_kmeans.json, comparison: method_comparison.json }

export function districtInputs(PRE, id) {
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
