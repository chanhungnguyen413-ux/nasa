// Tìm địa danh ĐBSCL cho ô "Tìm ở đây": hàm thuần, không đụng giao diện (test được bằng Node).
// Vì sao cần: nông dân hay gõ thiếu dấu, sai dấu ("Cân Thơ"), gõ nhầm 1 chữ ("Cần Thư") hoặc đảo 2 chữ ("An Giagn").
// Cách làm: bỏ dấu + bỏ tiền tố hành chính → khớp đúng / khớp đầu / khớp chứa → khoảng cách Damerau-Levenshtein có ngưỡng.

// Tiền tố hành chính bỏ đi trước khi so (đã bỏ dấu). Cụm 2 chữ đặt trước để "thanh pho" không bị cắt thành "pho".
const PS_PREFIXES = ['thanh pho', 'thi xa', 'tp', 'tinh', 'huyen', 'quan', 'tx']

// Chuẩn hóa: chữ thường, bỏ dấu tiếng Việt (NFD + đ → d), mọi ký tự không phải chữ/số thành khoảng trắng.
export function psNormalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function psStripPrefix(norm) {
  let out = norm
  for (let changed = true; changed; ) {
    changed = false
    for (const p of PS_PREFIXES) {
      if (out === p) return ''
      if (out.startsWith(p + ' ')) {
        out = out.slice(p.length + 1).trim()
        changed = true
      }
    }
  }
  return out
}

// Khoảng cách Damerau-Levenshtein (bản "optimal string alignment"): thêm/bớt/thay 1 ký tự hoặc đảo 2 ký tự liền kề = 1.
export function psDamerau(a, b) {
  const n = a.length
  const m = b.length
  if (!n) return m
  if (!m) return n
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)])
  for (let j = 0; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[n][m]
}

// Ngưỡng an toàn theo độ dài chuỗi gõ (đã bỏ khoảng trắng): < 4 ký tự không sửa lỗi, 4–6 cho phép 1, ≥ 7 cho phép 2.
function psMaxDistance(len) {
  if (len >= 7) return 2
  if (len >= 4) return 1
  return 0
}

// Các cụm từ liên tiếp của tên (vd "can tho co do" → "can", "can tho", "tho co", ... ) để so với một phần của tên dài.
function psTokenWindows(norm) {
  const toks = norm.split(' ').filter(Boolean)
  const out = []
  for (let i = 0; i < toks.length; i++) {
    for (let j = i + 1; j <= toks.length; j++) out.push(toks.slice(i, j).join(''))
  }
  return out
}

/**
 * Tìm địa danh khớp nhất trong danh mục.
 * @param {string} raw chữ người dùng gõ
 * @param {Array<{name?:string, vi?:string, en?:string, code?:string, id?:string}>} catalog
 * @returns phần tử khớp nhất của catalog, hoặc null nếu không đủ chắc (chuỗi < 2 ký tự, chuỗi rác).
 */
export function mwFuzzySearchPlace(raw, catalog) {
  const q = psStripPrefix(psNormalize(raw))
  const qc = q.replace(/ /g, '')
  if (qc.length < 2 || !Array.isArray(catalog)) return null
  const maxD = psMaxDistance(qc.length)
  let best = null
  let bestScore = Infinity
  for (const item of catalog) {
    const names = [item.name, item.vi, item.en, item.code, item.id].filter((x) => typeof x === 'string' && x)
    let score = Infinity
    for (const nm of names) {
      const k = psStripPrefix(psNormalize(nm))
      const kc = k.replace(/ /g, '')
      if (!kc) continue
      if (kc === qc) score = Math.min(score, 0)
      else if (kc.startsWith(qc)) score = Math.min(score, 0.5)
      else if (qc.length >= 3 && psTokenWindows(k).some((w) => w.startsWith(qc))) score = Math.min(score, 0.8)
      else if (maxD > 0) {
        const dist = Math.min(...psTokenWindows(k).map((w) => psDamerau(qc, w)), psDamerau(qc, kc))
        if (dist <= maxD) score = Math.min(score, 2 + dist)
      }
    }
    if (score < bestScore) {
      bestScore = score
      best = item
    }
  }
  return best
}

/**
 * Danh mục địa danh cho ô tìm kiếm: 5 huyện mẫu (có id khí hậu tính sẵn) + 13 tỉnh ĐBSCL.
 * Tỉnh chỉ mang id khi id đó có trong PROVINCES; tỉnh khác để id undefined để không gọi districtInputs với id lạ.
 */
export function mwPlaceCatalog(provinces, provincesGeo, lang = 'vi') {
  const dist = provinces.map((p) => ({ id: p.id, name: p.name, vi: p.name, en: p.name, lat: p.lat, lon: p.lon, zoom: 12 }))
  const prov = provincesGeo.map((p) => ({
    id: provinces.some((d) => d.id === p.code) ? p.code : undefined,
    code: p.code,
    vi: p.vi,
    en: p.en,
    name: p[lang] ?? p.vi,
    lat: p.center[0],
    lon: p.center[1],
    zoom: 10,
  }))
  return [...dist, ...prov]
}
