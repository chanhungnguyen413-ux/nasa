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

/**
 * Lịch vụ cấp TỈNH: chọn năm MỚI NHẤT mà nhóm k-means của năm đó có đủ 3 đỉnh vụ (đủ để xếp lịch 3 vụ);
 * không năm nào đủ 3 vụ → giữ năm cuối (trang sẽ báo "chưa đủ lịch 3 vụ" kèm số vụ/năm thật).
 *   kmeansByYear: { '2021': { cluster, distance }, ... } (province_calendars.json) · clusters: calendar_kmeans.json
 * Vì sao: tâm tỉnh là 1 ô 250 m; năm cuối có thể rơi vào năm bỏ vụ / cây khác, trong khi các năm trước vẫn 3 vụ.
 */
export function provinceCalendarYear(kmeansByYear, clusters) {
  const years = Object.keys(kmeansByYear ?? {}).map(Number).filter(Number.isFinite).sort((a, b) => b - a)
  if (!years.length) return null
  const peaksOf = (y) => clusters.find((c) => c.cluster === kmeansByYear[y]?.cluster)?.shape?.peaks ?? 0
  const y3 = years.find((y) => peaksOf(y) === 3)
  const year = y3 ?? years[0]
  return { year, cluster: kmeansByYear[year].cluster, rule: y3 != null ? 'latest3' : 'last', lastYear: years[0], lastPeaks: peaksOf(years[0]) }
}
