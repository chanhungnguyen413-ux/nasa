import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { EM_AVAILABLE_KEYS, EM_ELEV_BUCKETS, EM_FILTER_GROUPS, EM_FILTER_META, emCellAt, emDescribeCell, emElevTier, emLayerStats, emSpectrumBands, emSynthesizeGardenStack } from '../../site/logic/envMapData.js'
import { MEKONG_ENV_LAYER_KEYS } from '../../site/data/mekongBoundaries.js'

test('EM_FILTER_META phủ đủ 9 bộ lọc ĐBSCL với nguồn, URL và đánh dấu grace thiếu chi tiết 5 km', () => {
  for (const key of MEKONG_ENV_LAYER_KEYS) {
    const meta = EM_FILTER_META[key]
    assert.ok(meta, `Thiếu metadata cho ${key}`)
    assert.ok(meta.url?.startsWith('https://'), `Thiếu URL cho ${key}`)
    assert.ok(meta.badge?.vi && meta.badge?.en, `Thiếu badge song ngữ cho ${key}`)
    assert.ok(meta.dateLabel?.vi && meta.dateLabel?.en, `Thiếu ngày dữ liệu cho ${key}`)
    assert.ok(meta.caveat?.vi && meta.caveat?.en, `Thiếu giới hạn dữ liệu cho ${key}`)
  }
  assert.equal(EM_FILTER_META.grace.status, 'insufficient')
  assert.equal(EM_FILTER_META.soilType.scope, 'dbscl')
  assert.equal(EM_FILTER_META.elev.scope, 'dbscl')
})

test('emElevTier phân tầng cao độ chuẩn Hòn Dấu không sinh số giả', () => {
  assert.equal(emElevTier(0.2)?.hex, EM_ELEV_BUCKETS[0].hex)
  assert.equal(emElevTier(0.8)?.hex, EM_ELEV_BUCKETS[1].hex)
  assert.equal(emElevTier(1.25)?.hex, EM_ELEV_BUCKETS[2].hex)
  assert.equal(emElevTier(2.1)?.hex, EM_ELEV_BUCKETS[3].hex)
  assert.equal(emElevTier(3.4)?.hex, EM_ELEV_BUCKETS[4].hex)
  assert.equal(emElevTier(null), null)
})

test('emCellAt đọc đúng dữ liệu thực 5 km, ô thiếu trả missing=true, grace trả insufficient', () => {
  const elevRaw = JSON.parse(readFileSync('site/data/precomputed/mekong_elevation_5km.json', 'utf8'))
  const soilRaw = JSON.parse(readFileSync('site/data/precomputed/mekong_soil_5km.json', 'utf8'))
  const dLat = soilRaw.grid.dLat
  const dLon = soilRaw.grid.dLon
  const rec = elevRaw.records[10]
  const soilCell = soilRaw.cells[5]
  const soilClassIdx = new Map(soilRaw.classes.map((c, idx) => [c.code, idx]))
  const mockEnvMap = {
    grid: { dLat, dLon, totalDeltaCells: soilRaw.totalDeltaCells },
    layers: {
      elev: { kind: 'elev', coveredCells: 1, distinctColors: 5, minElevM: rec.elevation, maxElevM: rec.elevation, cells: [[rec.i, rec.j, rec.elevation, rec.sampleCount]] },
      soilType: { kind: 'soilType', coveredCells: 1, distinctColors: 1, classes: soilRaw.classes, cells: [[soilCell[0], soilCell[1], soilClassIdx.get(soilCell[2])]] },
      ndvi: { kind: 'raster', coveredCells: 1, distinctColors: 1, palette: ['#2e7d32'], cells: [[rec.i, rec.j, 0]] },
      grace: { kind: 'insufficient', coveredCells: 0, distinctColors: 3 },
    },
  }
  const hitElev = emCellAt(mockEnvMap, 'elev', (rec.i + 0.5) * dLat, (rec.j + 0.5) * dLon)
  assert.equal(hitElev.missing, false)
  assert.equal(hitElev.elevM, rec.elevation)
  assert.equal(hitElev.sampleCount, rec.sampleCount)

  const hitSoil = emCellAt(mockEnvMap, 'soilType', (soilCell[0] + 0.5) * dLat, (soilCell[1] + 0.5) * dLon)
  assert.equal(hitSoil.missing, false)
  assert.equal(hitSoil.soilClass.code, soilCell[2])

  const miss = emCellAt(mockEnvMap, 'ndvi', 21.02, 105.85)
  assert.equal(miss.missing, true)
  assert.equal(miss.hex, null)

  const graceRes = emCellAt(mockEnvMap, 'grace', 10.03, 105.78)
  assert.equal(graceRes.status, 'insufficient')
  assert.equal(graceRes.missing, true)
  assert.equal(emLayerStats(mockEnvMap, 'elev').missingCells, soilRaw.totalDeltaCells - 1)
})

test('EM_AVAILABLE_KEYS và EM_FILTER_GROUPS phủ đủ 22 lớp, có bandIndex/totalBands cho mọi lớp mới', () => {
  assert.equal(EM_AVAILABLE_KEYS.length, 22)
  assert.ok(!EM_AVAILABLE_KEYS.includes('grace'))
  assert.deepEqual(EM_FILTER_GROUPS.map((g) => g.keys.length), [6, 6, 10])
  const groupedKeys = EM_FILTER_GROUPS.flatMap((g) => g.keys)
  assert.equal(new Set(groupedKeys).size, 22)
  for (const key of EM_AVAILABLE_KEYS) {
    assert.ok(groupedKeys.includes(key), `Thiếu nhóm cho ${key}`)
    const meta = EM_FILTER_META[key]
    assert.ok(meta && meta.url?.startsWith('https://'), `Thiếu metadata/URL cho ${key}`)
    const bands = emSpectrumBands(key)
    assert.ok(bands.length >= 3, `Thiếu phổ màu cho ${key}`)
    for (const b of bands) {
      assert.ok(b.hex?.startsWith('#') && b.label?.vi && b.label?.en && b.desc?.vi && b.desc?.en)
    }
  }
  const soilDeepBlue = emDescribeCell('soil', { missing: false, hex: '#0024ff' })
  assert.ok(soilDeepBlue)
  assert.ok(!soilDeepBlue.title.vi.includes('#0024'))
  assert.match(soilDeepBlue.title.vi, /Xanh dương đậm/)
  assert.match(soilDeepBlue.title.en, /Deep blue/)
  assert.equal(soilDeepBlue.hex, '#1D4ED8')
  assert.equal(soilDeepBlue.bandIndex, 2)
  assert.equal(soilDeepBlue.totalBands, 5)

  for (const key of EM_AVAILABLE_KEYS) {
    const bands = emSpectrumBands(key)
    const uniqueHexes = new Set(bands.map((b) => String(b.hex).toUpperCase()))
    assert.equal(uniqueHexes.size, bands.length, `Bảng màu ${key} có màu trùng nhau`)
  }

  const newRasterChecks = [
    ['soilPh', '#D62828', 0, 6],
    ['soilPh', '#ebe51a', 0, 6],
    ['soilPh', '#F77F00', 1, 6],
    ['soilPh', '#FCBF49', 2, 6],
    ['soilPh', '#80B918', 3, 6],
    ['soilPh', '#2A9D8F', 4, 6],
    ['soilPh', '#1D6FA5', 5, 6],
    ['soilPh', '#54b93a', 5, 6],
    ['soilSoc', '#cdbbb7', 0, 5],
    ['soilSoc', '#b2968f', 1, 5],
    ['soilSoc', '#C86D51', 2, 5],
    ['soilSoc', '#7F4F24', 3, 5],
    ['soilSoc', '#926b60', 4, 5],
    ['soilClay', '#cd9155', 0, 5],
    ['soilClay', '#c1854a', 1, 5],
    ['soilClay', '#C85A32', 2, 5],
    ['soilClay', '#7F2B1D', 3, 5],
    ['soilClay', '#ac743b', 4, 5],
    ['soilNitrogen', '#d7f0d1', 0, 5],
    ['soilNitrogen', '#94D2BD', 1, 5],
    ['soilNitrogen', '#2A9D8F', 2, 5],
    ['soilNitrogen', '#bee6b8', 3, 5],
    ['soilNitrogen', '#97d593', 4, 5],
    ['soilRoot', '#00a6ff', 0, 5],
    ['soilRoot', '#001eff', 1, 5],
    ['soilRoot', '#505050', 4, 5],
    ['evi', '#b4a595', 0, 5],
    ['evi', '#bfde78', 1, 5],
    ['evi', '#083D27', 4, 5],
    ['lai', '#fff249', 0, 5],
    ['lai', '#0B3C49', 4, 5],
    ['fpar', '#ffc900', 1, 5],
    ['fpar', '#065F46', 4, 5],
    ['gpp', '#ce0000', 0, 5],
    ['gpp', '#3dff00', 4, 5],
    ['landCover', '#faef73', 0, 9],
    ['landCover', '#4783b5', 5, 9],
    ['biomass', '#000000', 0, 5],
    ['biomass', '#083D27', 4, 5],
    ['flood3d', '#afafaf', 0, 4],
    ['flood3d', '#fa1e24', 3, 4],
    ['floodHaz', '#e1e4e5', 0, 4],
    ['floodHaz', '#b2c4de', 3, 4],
    ['lst', '#2A9D8F', 0, 5],
    ['lst', '#D62828', 4, 5],
    ['cold', '#1D6FA5', 0, 5],
    ['cold', '#EE964B', 4, 5],
    ['soilTemp', '#ff7e00', 0, 5],
    ['soilTemp', '#ff6000', 4, 5],
  ]
  for (const [k, hex, expIdx, expTot] of newRasterChecks) {
    const out = emDescribeCell(k, { missing: false, hex })
    assert.ok(out, `emDescribeCell thiếu cho ${k} ${hex}`)
    assert.equal(out.bandIndex, expIdx, `${k} ${hex} bandIndex`)
    assert.equal(out.totalBands, expTot, `${k} ${hex} totalBands`)
  }
})

test('PRECOMPUTED.envMap chứa đủ 22 lớp phủ ĐBSCL và emSynthesizeGardenStack kết hợp hồ sơ vườn', () => {
  const html = readFileSync('index.html', 'utf8')
  const match = html.match(/^const PRECOMPUTED = (\{.*\})$/m)
  assert.ok(match, 'Thiếu PRECOMPUTED trong index.html đã build')
  const pre = JSON.parse(match[1])
  assert.ok(pre.envMap?.layers)
  for (const key of EM_AVAILABLE_KEYS) {
    const layer = pre.envMap.layers[key]
    assert.ok(layer, `PRECOMPUTED thiếu lớp ${key}`)
    assert.ok(layer.coveredCells >= 1000, `Lớp ${key} phủ ${layer.coveredCells} ô (< 1000)`)
  }
  assert.equal(pre.envMap.layers.grace?.kind, 'insufficient')

  const distinctHexByLayer = Object.fromEntries(EM_AVAILABLE_KEYS.map((k) => [k, new Set()]))
  for (let lat = 8.6; lat <= 11.0; lat += 0.08) {
    for (let lon = 104.5; lon <= 106.8; lon += 0.08) {
      const sample = emSynthesizeGardenStack(pre.envMap, lat, lon, {}, 0, 'vi')
      if (!sample) continue
      for (const k of EM_AVAILABLE_KEYS) {
        if (sample.items[k]?.hex) distinctHexByLayer[k].add(sample.items[k].hex.toUpperCase())
      }
    }
  }
  const minDistinct = {
    soilPh: 5,
    soilSoc: 4,
    soilClay: 4,
    soilNitrogen: 4,
    lst: 4,
    cold: 4,
    soilTemp: 4,
    soil: 4,
    soilRoot: 4,
    ndvi: 4,
    evi: 4,
    lai: 4,
    fpar: 4,
    gpp: 4,
  }
  for (const [k, minCount] of Object.entries(minDistinct)) {
    assert.ok(
      distinctHexByLayer[k].size >= minCount,
      `Lớp ${k} chỉ có ${distinctHexByLayer[k].size} màu hiển thị phân biệt (cần >= ${minCount})`,
    )
  }

  const syn = emSynthesizeGardenStack(
    pre.envMap,
    10.15,
    105.97,
    { profile: { ph: 5.1, ec: 2.8, ecType: 'ece', om: 1.2, soilType: 'acidSulfate', irrigation: 'limited' } },
    2,
    'vi',
  )
  assert.ok(syn)
  assert.equal(syn.totalLayers, 22)
  assert.ok(syn.readCount >= 20, `Vĩnh Long readCount=${syn.readCount} quá thấp`)
  assert.equal(syn.cloudCount, 1, 'MODIS flood3d tại Vĩnh Long bị mây che phải đếm riêng ở cloudCount')
  assert.equal(syn.domains.length, 3)
  assert.ok(syn.tactics.length >= 3, 'Phải giữ đồng thời cả cảnh báo ngập/thoát nước và thiếu nước mùa khô (limited)')
  assert.ok(syn.tactics.every((t) => t.isHeuristic && t.basis?.vi && t.basis?.en), 'Mọi chiến thuật gợi ý phải có nhãn nguồn/giả định')
  assert.ok(syn.methodologyNote?.vi && syn.methodologyNote?.en)
  assert.ok(syn.profileCount >= 5)
  assert.ok(syn.tactics.some((t) => t.drivers?.includes('soilPh') || t.drivers?.includes('floodHaz')))
  assert.ok(syn.tactics.some((t) => t.drivers?.includes('esi')), 'Không được nuốt cảnh báo thiếu nước tưới khi có ngập lịch sử floodHaz')

  // Đảm bảo default profile ('unknown') không cộng khống profileCount và EC ngoài ECe không quy đổi mặn giả
  const uncal = emSynthesizeGardenStack(
    pre.envMap,
    10.15,
    105.97,
    { profile: { ec: 3.2, ecType: 'ecw', soilType: 'unknown', irrigation: 'no' } },
    0,
    'vi',
  )
  assert.equal(uncal.ecUncalibrated, true)
  assert.equal(uncal.profileCount, 2, 'unknown soilType không được tính vào profileCount')
  assert.ok(uncal.tactics.some((t) => t.title.includes('ECe')), 'Phải cảnh báo rõ EC nước chưa quy đổi được sang ECe')
  assert.ok(uncal.tactics.some((t) => t.drivers?.includes('esi')), 'irrigation=no vẫn phải hiện cảnh báo mùa khô kể cả trên nền floodHaz lịch sử')

  // Kiểm chứng hồi quy null <= N: ô thiếu dữ liệu (đô thị/ngoài phủ) không được bật isAcid/isOpenWindow giả
  const sparseEnv = {
    grid: pre.envMap.grid,
    layers: {
      ndvi: { kind: 'raster', palette: ['#1B7F5C'], cells: [[Math.floor(10.04 / pre.envMap.grid.dLat), Math.floor(105.78 / pre.envMap.grid.dLon), 0]] },
    },
  }
  const sparseSyn = emSynthesizeGardenStack(sparseEnv, 10.04, 105.78, {}, 0, 'vi')
  assert.equal(sparseSyn.readCount, 1)
  assert.ok(!sparseSyn.tactics.some((t) => t.drivers?.includes('soilPh')), 'Thiếu soilPh không được kích hoạt cảnh báo phèn giả (lỗi null <= 2)')
  assert.ok(!sparseSyn.tactics.some((t) => t.title.includes('thoáng')), 'Thiếu EVI/GPP không được kích hoạt cửa sổ gieo thoáng giả (lỗi null <= 1)')

  const urban = emSynthesizeGardenStack(pre.envMap, 10.04, 105.78, {}, 0, 'vi')
  assert.ok(urban && urban.readCount > 0 && urban.readCount < 22, 'Đô thị thiếu dữ liệu đất không được bịa đủ 22/22')
})
