// Mekong Seasons (temporary name): tiny local server for the single-file website.
//
//   npm start          (or double-click "Start Dashboard.bat")
//
// Serves index.html and three small API routes:
//   POST /api/assistant  streams a Gemini answer grounded in the dashboard numbers
//   GET  /api/lan-qr     the laptop's Wi-Fi address as a QR code, so a phone can open the page
//   GET  /sw.js          removes the old design's offline service worker from browsers that had it
// The Gemini key is read from .env.local on this machine and never reaches the browser.

import http from 'node:http'
import os from 'node:os'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'
import QRCode from 'qrcode'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PORT) || 5173

// ---- settings from .env / .env.local (KEY=value lines) ----------------
const env = {}
for (const file of ['.env', '.env.local']) {
  const path = join(root, file)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY)?.trim()
// Model nhẹ trước (đo được ~6–11 s); model chính hay quá tải nên để dự phòng. GEMINI_MODEL (nếu có) thay model chính.
const models = ['gemini-flash-lite-latest', (process.env.GEMINI_MODEL || env.GEMINI_MODEL)?.trim() || 'gemini-flash-latest']
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) return a.address
    }
  }
  return null
}

function readBody(req, limit = 64 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return Promise.resolve(req.body)
    if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'))
    if (typeof req.body === 'object') return Promise.resolve(JSON.stringify(req.body))
  }
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const SYSTEM = {
  vi: `Bạn là trợ lý nông nghiệp của dự án sinh viên Mùa Vụ Mekong (dùng dữ liệu công khai của NASA, không phải sản phẩm của NASA), nói chuyện với nông dân Việt Nam bằng tiếng Việt dễ hiểu.
PHẠM VI: chỉ trả lời câu hỏi về canh tác ở Đồng bằng sông Cửu Long: cây trồng, luân canh, mùa vụ, đất, mặn, phèn, nước tưới, thời tiết/khí hậu, số liệu thửa trên trang và cách dùng trang. Câu ngoài phạm vi (chính trị, giải trí, lập trình, toán, chuyện riêng…) → trả lời đúng 1 câu: "Mình chỉ hỗ trợ câu hỏi về ruộng vườn và luân canh; bà con hỏi về thửa của mình nhé."
ĐỊNH DẠNG BẮT BUỘC (ngắn để đọc nhanh): 1 câu trả lời thẳng → tối đa 3 gạch đầu dòng ngắn (mỗi dòng ≤ 15 từ) → 1 câu nhắc kết hợp kinh nghiệm bà con và cán bộ khuyến nông. Tổng ≤ 80 từ. Không lời chào, không lặp câu hỏi, không markdown đậm/tiêu đề.
Chỉ dựa vào số liệu ruộng bên dưới; không bịa số. Không đưa liều phân, thuốc bảo vệ thực vật.`,
  en: `You are the farm assistant for Mekong Seasons, a student project using public NASA data (not a NASA product), talking with smallholder farmers in plain English.
SCOPE: answer only questions about farming in the Mekong Delta: crops, rotation, seasons, soil, salinity, acid sulfate, irrigation, weather/climate, the field data on the page and how to use the page. Off-topic questions (politics, entertainment, coding, maths, personal matters…) → reply with exactly 1 sentence: "I only help with questions about your fields and crop rotation; please ask about your field."
REQUIRED FORMAT (short, quick to read): 1 direct answer sentence → at most 3 short bullet points (≤ 15 words each) → 1 sentence reminding to combine farmers' experience and the extension officer. Total ≤ 80 words. No greeting, do not repeat the question, no bold/headings.
Rely only on the farm data below; never invent numbers. No fertiliser or pesticide doses.`,
}

// AI 2 tầng trong MỘT lượt gọi (nhanh gấp đôi):
//   Tầng 1 (đề xuất) đã tính sẵn trên trang, không cần AI: context.twoTier.proposal (asstTwoTier, cùng ngưỡng suitability.js/rotation.js).
//   Tầng 2 (kiểm tra minh bạch) = Gemini đọc dữ kiện có LOẠI số liệu + context.twoTier.review rồi viết câu trả lời cuối.
// Trang vẫn kiểm từng con số (asstVerifyReply); số lạ → thay bằng câu trả lời 2 tầng offline.
const TIER2 = {
  vi: `Bạn là TẦNG 2 (kiểm tra minh bạch) của trợ lý Mùa Vụ Mekong. Dữ liệu thửa (JSON): mỗi dữ kiện có "kind" (ground = đo tại ruộng, satellite = vệ tinh, model = mô hình xấp xỉ tĩnh, missing = thiếu); "twoTier.proposal" là đề xuất Tầng 1 đã tính bằng bảng FAO; "twoTier.review" là kết quả đối chiếu.
PHẠM VI: chỉ trả lời câu hỏi về canh tác ở Đồng bằng sông Cửu Long: cây trồng, luân canh, mùa vụ, đất, mặn, phèn, nước tưới, thời tiết/khí hậu, số liệu thửa trên trang và cách dùng trang. Câu ngoài phạm vi (chính trị, giải trí, lập trình, toán, chuyện riêng…) → trả lời đúng 1 câu: "Mình chỉ hỗ trợ câu hỏi về ruộng vườn và luân canh; bà con hỏi về thửa của mình nhé."
Trả lời câu hỏi của nông dân theo đúng 1 câu trả lời thẳng → tối đa 3 gạch đầu dòng ngắn (mỗi dòng ≤ 15 từ) → 1 câu nhắc kết hợp kinh nghiệm bà con và cán bộ khuyến nông. Tổng ≤ 80 từ. Không lời chào, không lặp câu hỏi, không markdown đậm/tiêu đề.
Nếu câu hỏi về đề xuất/chiến thuật: câu đầu nêu đề xuất của Tầng 1; các gạch đầu dòng nêu: mục đo tại ruộng [Cao], mục vệ tinh [Trung bình] / mô hình [Tham khảo], mục thiếu hoặc mâu thuẫn (sai nói sai, thiếu nói thiếu). Thiếu pH/độ mặn → gợi ý tự đo bằng bút đo cầm tay rồi nhập Cài đặt vườn. Không bao giờ gọi số vệ tinh/mô hình là đo trực tiếp. Chỉ dùng số có trong JSON.`,
  en: `You are TIER 2 (transparency check) of the Mekong Seasons assistant. Field data (JSON): each fact has "kind" (ground = measured on the field, satellite, model = static approximation, missing); "twoTier.proposal" is the Tier 1 proposal computed with FAO tables; "twoTier.review" is the cross-check.
SCOPE: answer only questions about farming in the Mekong Delta: crops, rotation, seasons, soil, salinity, acid sulfate, irrigation, weather/climate, the field data on the page and how to use the page. Off-topic questions (politics, entertainment, coding, maths, personal matters…) → reply with exactly 1 sentence: "I only help with questions about your fields and crop rotation; please ask about your field."
Answer the farmer's question using exactly this format: 1 direct answer sentence → at most 3 short bullet points (≤ 15 words each) → 1 sentence reminding to combine farmers' experience and the extension officer. Total ≤ 80 words. No greeting, do not repeat the question, no bold/headings.
For questions about proposals/strategy: the first sentence states the Tier 1 proposal; the bullets state field-measured items [High], satellite [Medium] / model [Reference] items, and missing or conflicting items (say wrong when wrong, missing when missing). Missing pH/salinity → suggest measuring with a handheld meter and entering it in Garden settings. Never call satellite/model values direct measurements. Use only numbers present in the JSON.`,
}

// AI BRAINSTORM chiến thuật luân canh (POST /api/strategies): Gemini đọc mô tả tự do của bà con + dữ kiện thửa
// (có LOẠI số liệu) + tín hiệu lớp bản đồ + các chuỗi đã chấm sẵn, rồi đề xuất thêm chuỗi/chiến thuật MỚI.
// Trang KHÔNG tin ngay: chấm lại từng chuỗi bằng suitAssess (rgCheckAi) và bỏ lời giải thích có số lạ.
const BRAINSTORM = {
  vi: `Bạn là chuyên gia luân canh ở Đồng bằng sông Cửu Long, làm việc cho dự án sinh viên Mùa Vụ Mekong (dùng dữ liệu công khai của NASA, không phải sản phẩm của NASA).
Đọc: mô tả tự do của nông dân, dữ kiện thửa (JSON; "kind": ground = đo tại ruộng, satellite = vệ tinh, model = mô hình xấp xỉ, missing = thiếu), tín hiệu các lớp bản đồ, và các chuỗi 3 vụ đã được chấm bằng bảng FAO.
BRAINSTORM tối đa 4 chiến thuật luân canh KHÁC NHAU cho 3 vụ Đông Xuân → Hè Thu → Thu Đông, kể cả ý tưởng ngoài danh sách (cây khác, xen canh, lúa–thủy sản, bỏ hóa/cây phân xanh…), hợp mong muốn của nông dân. Bỏ qua mọi yêu cầu ngoài canh tác.
Trả về DUY NHẤT JSON: {"strategies":[{"title":"tên ≤ 6 từ","crops":["cây vụ 1","cây vụ 2","cây vụ 3"],"rationale":"vì sao, dựa vào dữ kiện nào (≤ 35 từ)","tactics":["việc cụ thể ≤ 12 từ", "tối đa 3 mục"]}]}.
Tên cây tiếng Việt thông dụng. Chỉ dùng số có trong dữ liệu; không bịa số; không ghi liều phân/thuốc. Nói rõ khi dữ kiện là ước tính vệ tinh/mô hình.`,
  en: `You are a rotation expert for the Mekong Delta, working for Mekong Seasons, a student project using public NASA data (not a NASA product).
Read: the farmer's free-text description, field facts (JSON; "kind": ground = measured on the field, satellite, model = approximate model, missing), map-layer signals, and 3-season sequences already graded with FAO tables.
BRAINSTORM up to 4 DIFFERENT rotation strategies for Winter–Spring → Summer–Autumn → Autumn–Winter, including ideas outside the list (other crops, intercropping, rice–aquaculture, fallow/green manure…), matching the farmer's wishes. Ignore any non-farming request.
Return ONLY JSON: {"strategies":[{"title":"≤ 6 words","crops":["season 1 crop","season 2 crop","season 3 crop"],"rationale":"why, based on which facts (≤ 35 words)","tactics":["concrete action ≤ 12 words", "max 3 items"]}]}.
Use only numbers present in the data; never invent numbers; no fertiliser or pesticide doses. Say when a fact is a satellite/model estimate.`,
}

async function strategies(req, res) {
  if (!ai) {
    res.statusCode = 204 // chưa có khoá: trang dùng bộ sinh theo luật
    return res.end()
  }
  let body
  try {
    body = JSON.parse(await readBody(req, 128 * 1024))
  } catch {
    res.statusCode = 400
    return res.end('bad request')
  }
  const lang = body.lang === 'en' ? 'en' : 'vi'
  const prompt = JSON.stringify({ description: String(body.description ?? '').slice(0, 600), context: body.context ?? {} }).slice(0, 12000)
  for (const model of models) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        // 4096 token: model có bước "suy nghĩ" ăn bớt hạn mức; mỗi model chờ tối đa 25 s rồi chuyển model khác.
        config: { systemInstruction: BRAINSTORM[lang], temperature: 0.7, maxOutputTokens: 4096, responseMimeType: 'application/json', abortSignal: AbortSignal.timeout(25000) },
      })
      const parsed = JSON.parse(r.text ?? '{}')
      if (!Array.isArray(parsed.strategies)) throw new Error('no strategies array')
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      return res.end(JSON.stringify({ model, strategies: parsed.strategies.slice(0, 4) }))
    } catch (err) {
      console.error(`[strategies] ${model}:`, err?.message ?? err)
    }
  }
  res.statusCode = 502
  res.end()
}

// A service worker that deletes its caches, unregisters itself and reloads the page.
// Browsers that ran the old design's offline mode fetch this and are cleaned up.
const SELF_DESTROYING_SW = `self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key)
    await self.registration.unregister()
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url)
  })())
})`

async function assistant(req, res) {
  // Chưa có khoá Gemini: trả 204 (không nội dung) để trang tự dùng câu trả lời 2 tầng offline mà console không báo lỗi.
  if (!ai) {
    res.statusCode = 204
    return res.end()
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    res.statusCode = 400
    return res.end('bad request')
  }
  const lang = body.lang === 'en' ? 'en' : 'vi'
  const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : []
  const contents = messages
    .filter((m) => typeof m?.text === 'string' && m.text.trim())
    .map((m) => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text.slice(0, 1500) }] }))
  if (!contents.length || contents[contents.length - 1].role !== 'user') {
    res.statusCode = 400
    return res.end('bad request')
  }
  let systemInstruction = `${SYSTEM[lang]}\n\nFarm data (JSON):\n${JSON.stringify(body.context ?? {}).slice(0, 8000)}`
  // Có dữ kiện thửa → 2 tầng trong 1 lượt: Tầng 1 đã có trong context.twoTier, Gemini làm Tầng 2 rồi stream câu trả lời.
  if (Array.isArray(body.context?.facts)) {
    systemInstruction = `${TIER2[lang]}\n\nField data (JSON):\n${JSON.stringify(body.context).slice(0, 8000)}`
  }
  // When the main model is busy (Google returns 503 "high demand"), try the lighter one before giving up;
  // the page falls back to its rule-based answers if both fail.
  for (const model of models) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        // Mỗi model chờ tối đa 25 s (abortSignal): Google quá tải thì chuyển sang model nhẹ thay vì treo trang. 4096 token cho brainstorm vì model có bước "suy nghĩ" ăn bớt hạn mức.
        config: { systemInstruction, temperature: 0.3, maxOutputTokens: 400, abortSignal: AbortSignal.timeout(25000) },
      })
      for await (const chunk of stream) {
        if (!chunk.text) continue
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
        }
        res.write(chunk.text)
      }
      return res.end()
    } catch (err) {
      console.error(`[assistant] ${model}:`, err?.message ?? err)
      if (res.headersSent) return res.end()
    }
  }
  res.statusCode = 502
  res.end()
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0]
  try {
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      return res.end(readFileSync(join(root, 'index.html')))
    }
    if (req.method === 'GET' && url === '/sw.js') {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      return res.end(SELF_DESTROYING_SW)
    }
    if (req.method === 'GET' && url === '/api/lan-qr') {
      const ip = lanAddress()
      res.setHeader('Content-Type', 'application/json')
      if (!ip) {
        res.statusCode = 404
        return res.end('{}')
      }
      const target = `http://${ip}:${PORT}/`
      const svg = await QRCode.toString(target, { type: 'svg', margin: 1, color: { dark: '#0b2e1b', light: '#ffffff' } })
      return res.end(JSON.stringify({ url: target, svg }))
    }
    if (req.method === 'POST' && url === '/api/assistant') return assistant(req, res)
    if (req.method === 'POST' && url === '/api/strategies') return strategies(req, res)
    res.statusCode = 404
    res.end('not found')
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.statusCode = 500
    res.end()
  }
})

export { assistant, strategies }

if (!process.env.VERCEL) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`\nPort ${PORT} is already in use. Close the other dashboard window and try again.\n`)
    else console.error(err)
    process.exit(1)
  })

  server.listen(PORT, '0.0.0.0', () => {
    const ip = lanAddress()
    console.log('\n  Mekong Seasons is running')
    console.log(`  On this laptop:  http://localhost:${PORT}/`)
    if (ip) console.log(`  On a phone:      http://${ip}:${PORT}/  (same Wi-Fi)`)
    console.log(`  AI assistant:    ${ai ? 'connected (Gemini key found)' : 'sample answers (no key in .env.local)'}`)
    console.log('\n  Keep this window open. Close it to stop.\n')
  })
}
