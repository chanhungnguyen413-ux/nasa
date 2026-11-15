// Trang "Thuật ngữ" (#/thuat-ngu): toàn bộ GLOSSARY, lọc theo nhóm và tìm kiếm tức thì.
// Vì sao một trang riêng: trang Luân canh cần gọn (prompt 03), nhưng bà con vẫn phải tra được mọi từ khó ở một chỗ.
// Mỗi thẻ chỉ có 4 thứ: tên · 1 câu giải thích · các mốc đọc số / ví dụ · nhóm + nguồn.
// Dùng tiện ích của template ($, esc, icon, S, pageHref) vì build gộp mọi module; mọi top-level có tiền tố gp / GP.
import { GLOSSARY } from '../i18n/glossary.js'
import { REDESIGN_TEXT } from '../i18n/redesignText.js'

// cat: nhóm đang lọc ('all' hoặc một category) · query: chữ đang tìm · focus: id thuật ngữ cần cuộn tới khi vào trang
const GP = { cat: 'all', query: '', focus: null }
export const GP_CATS = ['cultivation', 'soilWater', 'satelliteWeather']
const GP_CAT_ICON = { cultivation: 'sprout', soilWater: 'droplets', satelliteWeather: 'satellite' }
const gpT = () => REDESIGN_TEXT[S.lang].glossaryPage

/** Bỏ dấu tiếng Việt và viết thường, để gõ "man" vẫn tìm ra "mặn", "dat phen" ra "đất phèn". */
export function gpFold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
}

/**
 * Lọc danh sách [id, entry] theo nhóm và chữ tìm (tìm trong id, tên, câu ngắn, các mốc và nguồn).
 * Hàm thuần, không đụng giao diện, để test được bằng Node.
 */
export function gpFilter(entries, { cat = 'all', query = '' } = {}) {
  const q = gpFold(query).trim()
  return entries.filter(([id, e]) => {
    if (cat !== 'all' && e.category !== cat) return false
    if (!q) return true
    return gpFold([id, e.title, e.short, ...(e.detail ?? []), e.source ?? ''].join(' ')).includes(q)
  })
}

// Thứ tự hiện: theo nhóm (Canh tác → Đất & nước → Vệ tinh); trong nhóm, từ hay gặp nhất trên trang Luân canh lên trước.
// Từ mới thêm vào GLOSSARY mà chưa có trong danh sách này vẫn hiện, chỉ xếp sau cùng nhóm của nó.
const GP_ORDER = ['rotation', 'seasons', 'legume', 'nfix', 'drip', 'sprinkler', 'ece', 'ph', 'soiltype', 'et', 'et0', 'wbalance', 'moisture', 'saturation', 'drought', 'ndvi', 'modis', 'power', 'smap', 'modelsat', 'dryyear', 'forecast']
const gpRank = (id) => (GP_ORDER.includes(id) ? GP_ORDER.indexOf(id) : GP_ORDER.length)
const gpEntries = () => {
  const all = Object.entries(GLOSSARY[S.lang]).sort(([a], [b]) => gpRank(a) - gpRank(b))
  return GP_CATS.flatMap((c) => all.filter(([, e]) => e.category === c))
}

function gpCardHtml([id, e], i) {
  const T = gpT()
  return `<article id="term-${id}" class="gp-card" data-reveal="gp-card-${esc(id)}" style="--gp-i:${Math.min(i, 10)}">
      <h3 class="gp-title">${esc(e.title)}</h3>
      <p class="gp-short">${esc(e.short)}</p>
      ${e.detail?.length ? `<ul class="gp-detail">${e.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      <p class="gp-meta">
        <span class="gp-tag gp-tag-${e.category}">${icon(GP_CAT_ICON[e.category], 'size-3.5')}${esc(T.categories[e.category])}</span>
        <span class="gp-source">${icon(e.source ? 'book-open' : 'info', 'size-3.5')}<span>${e.source ? `${esc(T.sourceLabel)}: ${esc(e.source)}` : esc(T.noSource)}</span></span>
      </p>
    </article>`
}

/** Chỉ vẽ lại danh sách + số đếm + trạng thái chip, để ô tìm kiếm không mất con trỏ khi đang gõ. */
function gpRenderList({ animate = true } = {}) {
  const list = document.getElementById('gp-list')
  if (!list) return
  const T = gpT()
  const all = gpEntries()
  const shown = gpFilter(all, GP)
  list.classList.toggle('gp-anim', animate)
  list.innerHTML = shown.length
    ? shown.map(gpCardHtml).join('')
    : `<div class="gp-empty"><p>${esc(T.empty(GP.query))}</p><button type="button" data-gp="clear" class="gp-chip">${esc(T.clear)}</button></div>`
  document.getElementById('gp-count').textContent = T.count(shown.length, all.length)
  for (const b of document.querySelectorAll('[data-gp-cat]')) b.setAttribute('aria-pressed', String(b.dataset.gpCat === GP.cat))
  const clear = document.getElementById('gp-clear')
  if (clear) clear.hidden = !GP.query
  if (typeof wireMotion === 'function') wireMotion()
}

/** Vẽ cả trang Thuật ngữ. showPage('glossary') và renderAll() (đổi VI/EN) gọi hàm này. */
export function renderGlossary() {
  const box = typeof document !== 'undefined' ? document.getElementById('glossary') : null
  if (!box) return
  const T = gpT()
  const chip = (cat, label, ic) =>
    `<button type="button" data-gp-cat="${cat}" aria-pressed="${GP.cat === cat}" class="gp-chip">${ic ? icon(ic, 'size-4') : ''}${esc(label)}</button>`
  box.innerHTML = `
    <header class="mk-page-head mk-tech-grid" data-reveal="gp-head">
      <p class="mk-eyebrow"><span class="mk-live-dot"></span><span class="mk-code">03</span> · ${esc(REDESIGN_TEXT[S.lang].glossaryEyebrow)}<span class="mk-coord" aria-hidden="true">${typeof mkRegionCoord === 'function' ? mkRegionCoord() : ''}</span></p>
      <h2 class="mk-page-title">${esc(T.title)}</h2>
      <p class="mk-page-sub">${esc(T.sub)}</p>
      <span class="mk-page-scan" aria-hidden="true"></span>
    </header>
    <div class="gp-tools" data-reveal="gp-tools">
      <label class="gp-search">
        <span class="sr-only">${esc(T.searchLabel)}</span>
        ${icon('search', 'size-5 gp-search-icon')}
        <input id="gp-search" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(T.searchPlaceholder)}" value="${esc(GP.query)}" />
        <button type="button" id="gp-clear" data-gp="clear" class="gp-clear" aria-label="${esc(T.clear)}" ${GP.query ? '' : 'hidden'}>${icon('x', 'size-4')}</button>
      </label>
      <div class="gp-chips" role="group" aria-label="${esc(T.searchLabel)}">
        ${chip('all', T.all, null)}${GP_CATS.map((c) => chip(c, T.categories[c], GP_CAT_ICON[c])).join('')}
      </div>
    </div>
    <p id="gp-count" class="mt-6 text-sm font-bold text-muted" aria-live="polite"></p>
    <div id="gp-list" class="gp-grid"></div>`
  gpRenderList()
  // Đến từ nút "Xem tất cả thuật ngữ" trong popover: cuộn tới đúng từ vừa xem và làm nó sáng lên một nhịp.
  if (GP.focus) {
    const el = document.getElementById(`term-${GP.focus}`)
    GP.focus = null
    if (el) {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      // setTimeout thay vì requestAnimationFrame: chạy cả khi trình duyệt tạm không vẽ khung hình.
      setTimeout(() => {
        el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
        el.classList.add('is-in', 'gp-flash')
        if (typeof revealedKeys !== 'undefined' && el.dataset.reveal) revealedKeys.add(el.dataset.reveal)
      }, 60)
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'gp-search') return
    GP.query = e.target.value
    gpRenderList({ animate: false }) // gõ chữ: không chạy lại hiệu ứng xuất hiện, tránh nhấp nháy
  })
  document.addEventListener('click', (e) => {
    const cat = e.target.closest('[data-gp-cat]')
    if (cat) {
      GP.cat = cat.dataset.gpCat
      return gpRenderList()
    }
    if (e.target.closest('[data-gp="clear"]')) {
      GP.query = ''
      const input = document.getElementById('gp-search')
      if (input) { input.value = ''; input.focus() }
      return gpRenderList()
    }
    // Link trong popover thuật ngữ: nhớ từ đang xem, bỏ bộ lọc để chắc chắn thấy nó; trình duyệt tự đổi địa chỉ.
    const open = e.target.closest('[data-gp-open]')
    if (open) {
      GP.focus = open.dataset.gpOpen
      GP.cat = 'all'
      GP.query = ''
    }
  })
}
