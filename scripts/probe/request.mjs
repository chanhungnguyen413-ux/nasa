// Gọi một địa chỉ web có hạn giờ, và ghi lại đúng những thứ trình duyệt sẽ quan tâm:
// mã HTTP, thời gian chờ, và header CORS `access-control-allow-origin`.
import http from 'node:http'

// Địa chỉ của trang khi chạy `npm start`. Gửi kèm để máy chủ trả lời như đang nói chuyện với trang của ta.
export const ORIGIN = 'http://localhost:5173'
export const LIMIT_MS = 15000 // hạn theo docs/blueprint/phase-0.md
export const SLOW_LIMIT_MS = 60000 // lần thử thứ hai, chỉ để phân biệt "chậm" với "chết"

export async function timedFetch(url, { timeoutMs = LIMIT_MS, headers = {}, origin = ORIGIN, binary = false } = {}) {
  const started = performance.now()
  const elapsed = () => Math.round(performance.now() - started)
  try {
    const res = await fetch(url, { headers: { Origin: origin, ...headers }, signal: AbortSignal.timeout(timeoutMs) })
    const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text()
    return {
      url,
      ok: res.ok,
      status: res.status,
      ms: elapsed(),
      cors: res.headers.get('access-control-allow-origin'),
      contentType: res.headers.get('content-type'),
      bytes: binary ? body.length : Buffer.byteLength(body),
      body,
    }
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError'
    const reason = timedOut ? `quá ${timeoutMs / 1000} giây không trả lời xong` : `${err.name}: ${err.cause?.code ?? err.cause?.message ?? err.message}`
    return { url, ok: false, status: null, ms: elapsed(), cors: null, timedOut, error: reason }
  }
}

/** Gọi với hạn 15 giây. Nếu quá hạn thì thử lại MỘT lần với 60 giây và đánh dấu `slow`. */
export async function probe(url, options = {}) {
  const first = await timedFetch(url, options)
  if (!first.timedOut) return first
  const second = await timedFetch(url, { ...options, timeoutMs: SLOW_LIMIT_MS })
  return { ...second, slow: true, firstTryMs: first.ms }
}

export function parseJson(result) {
  try {
    return JSON.parse(result.body)
  } catch {
    return null
  }
}

// Trình duyệt chỉ cho trang đọc phản hồi khi header này là "*" hoặc đúng bằng địa chỉ của trang.
export const corsAllows = (value, origin = ORIGIN) => value === '*' || value === origin

/**
 * Tự kiểm tra: Node có thật sự gửi header Origin đi không?
 * Vì sao cần: nếu Node lặng lẽ bỏ header này thì mọi kết luận về CORS bên dưới đều vô nghĩa.
 * Cách làm: mở một máy chủ nhỏ ngay trên máy, tự gọi nó, xem nó nhận được gì.
 */
export async function originHeaderIsSent() {
  const server = http.createServer((req, res) => res.end(req.headers.origin ?? ''))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const res = await timedFetch(`http://127.0.0.1:${server.address().port}/`, { timeoutMs: 3000 })
    return res.body === ORIGIN
  } finally {
    server.close()
  }
}
