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
const apiKey = env.GEMINI_API_KEY?.trim()
const models = [env.GEMINI_MODEL?.trim() || 'gemini-flash-latest', 'gemini-flash-lite-latest']
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
  vi: `Bạn là trợ lý nông nghiệp của dự án sinh viên Mùa Vụ Mekong (dùng dữ liệu công khai của NASA, không phải sản phẩm của NASA), nói chuyện với nông dân Việt Nam.
Trả lời bằng tiếng Việt, ngắn gọn (tối đa khoảng 120 từ), dễ hiểu, không dùng thuật ngữ khó mà không giải thích.
Chỉ dựa vào số liệu ruộng bên dưới; không bịa thêm số liệu. Nếu số liệu là mô phỏng, có thể nhắc nhẹ.
Không đưa liều lượng hóa chất hay thuốc bảo vệ thực vật cụ thể; khi cần, khuyên hỏi cán bộ khuyến nông địa phương.
Không dùng markdown phức tạp; có thể dùng gạch đầu dòng đơn giản.`,
  en: `You are the farm assistant for Mekong Seasons, a student project that uses public NASA data (not a NASA product), talking with smallholder farmers.
Answer in English, briefly (about 120 words at most), in plain words; explain any technical term you use.
Rely only on the farm data below; never invent numbers. If the data is simulated, you may mention it.
Do not give specific chemical or pesticide doses; when needed, suggest asking a local extension officer.
Avoid heavy markdown; simple bullet points are fine.`,
}

// AI 2 tầng (khi trang gửi kèm dữ kiện thửa có LOẠI số liệu: context.facts):
//   Tầng 1 (TIER1): đọc toàn bộ dữ liệu tĩnh của thửa → viết đề xuất luân canh ngắn (không gửi cho người dùng).
//   Tầng 2 (TIER2): đối chiếu ngược đề xuất với dữ liệu gốc + bảng kiểm tra deterministic (context.twoTier, tính
//   bằng đúng ngưỡng của suitability.js / rotation.js) → câu trả lời cuối có cờ đo thực địa / xấp xỉ / thiếu / mâu thuẫn.
// Trang vẫn kiểm từng con số (asstVerifyReply); số lạ → thay bằng câu trả lời 2 tầng offline.
const TIER1 = {
  vi: `Bạn là TẦNG 1 (xử lý & đề xuất) của trợ lý Mùa Vụ Mekong. Đọc dữ liệu thửa (JSON) gồm đất, mặn, khí hậu NASA POWER, lịch vụ, cây hiện tại và kết quả xếp hạng chiến lược.
Viết đề xuất luân canh cụ thể cho thửa trong tối đa 80 từ: phương án nào, chuỗi cây theo vụ, vì sao. Chỉ dùng số có trong JSON. Không bịa số.`,
  en: `You are TIER 1 (processing & proposal) of the Mekong Seasons assistant. Read the field data (JSON): soil, salinity, NASA POWER climate, crop calendar, current crop and the strategy ranking.
Write a concrete rotation proposal for this field in at most 80 words: which option, the crop sequence by season, and why. Use only numbers present in the JSON. Never invent numbers.`,
}
const TIER2 = {
  vi: `Bạn là TẦNG 2 (kiểm tra minh bạch) của trợ lý Mùa Vụ Mekong. Bạn nhận: dữ liệu thửa (JSON, mỗi dữ kiện có "kind": ground = đo tại ruộng, satellite = vệ tinh, model = mô hình xấp xỉ tĩnh, missing = thiếu), bảng kiểm tra "twoTier" đã tính bằng ngưỡng FAO của ứng dụng, và đề xuất của Tầng 1.
Trả lời người nông dân bằng tiếng Việt, tối đa khoảng 160 từ, đúng 2 phần:
1. Đề xuất (tóm tắt Tầng 1, sửa lại nếu nó trái với twoTier).
2. Kiểm tra: nêu rõ mục nào đo tại ruộng [Cao], mục nào vệ tinh [Trung bình] hay mô hình tĩnh [Tham khảo], mục nào thiếu, mục nào mâu thuẫn. Sai nói sai, thiếu nói thiếu. Không bao giờ gọi số vệ tinh/mô hình là đo trực tiếp.
Nếu thiếu pH hoặc độ mặn, gợi ý tự đo bằng bút đo cầm tay theo hướng dẫn của dụng cụ rồi nhập vào Cài đặt vườn để nâng lên [Cao]. Chỉ dùng số có trong JSON. Kết thúc bằng lời nhắc kết hợp kinh nghiệm bà con và cán bộ khuyến nông. Không markdown phức tạp.`,
  en: `You are TIER 2 (transparency check) of the Mekong Seasons assistant. You receive: field data (JSON; each fact has "kind": ground = measured on the field, satellite, model = static approximation, missing), the "twoTier" check table computed with the app's FAO thresholds, and the Tier 1 proposal.
Answer the farmer in English, about 160 words at most, in exactly 2 parts:
1. Proposal (summarise Tier 1; correct it if it contradicts twoTier).
2. Check: say which items are field-measured [High], satellite [Medium] or static model [Reference], which are missing, and which conflict. Say wrong when wrong, missing when missing. Never call satellite/model values direct measurements.
If pH or salinity is missing, suggest measuring with a handheld meter following the tool's instructions and entering it in Garden settings to reach [High]. Use only numbers present in the JSON. End by reminding to combine farmers' experience and the extension officer. Avoid heavy markdown.`,
}

// Tầng 1: một lượt KHÔNG stream; trả về chữ đề xuất hoặc null nếu mọi model đều lỗi.
async function tier1Proposal(lang, context, question) {
  for (const model of models) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: question.slice(0, 1500) }] }],
        config: { systemInstruction: `${TIER1[lang]}\n\nField data (JSON):\n${JSON.stringify(context).slice(0, 8000)}`, temperature: 0.3, maxOutputTokens: 400 },
      })
      if (r.text?.trim()) return r.text.trim()
    } catch (err) {
      console.error(`[assistant tier1] ${model}:`, err?.message ?? err)
    }
  }
  return null
}

// AI BRAINSTORM chiến thuật luân canh (POST /api/strategies): Gemini đọc mô tả tự do của bà con + dữ kiện thửa
// (có LOẠI số liệu) + tín hiệu lớp bản đồ + các chuỗi đã chấm sẵn, rồi đề xuất thêm chuỗi/chiến thuật MỚI.
// Trang KHÔNG tin ngay: chấm lại từng chuỗi bằng suitAssess (rgCheckAi) và bỏ lời giải thích có số lạ.
const BRAINSTORM = {
  vi: `Bạn là chuyên gia luân canh ở Đồng bằng sông Cửu Long, làm việc cho dự án sinh viên Mùa Vụ Mekong (dùng dữ liệu công khai của NASA, không phải sản phẩm của NASA).
Đọc: mô tả tự do của nông dân, dữ kiện thửa (JSON; "kind": ground = đo tại ruộng, satellite = vệ tinh, model = mô hình xấp xỉ, missing = thiếu), tín hiệu các lớp bản đồ, và các chuỗi 3 vụ đã được chấm bằng bảng FAO.
Hãy BRAINSTORM tối đa 4 chiến thuật luân canh khác nhau cho 3 vụ Đông Xuân → Hè Thu → Thu Đông, kể cả ý tưởng không có trong danh sách (cây khác, xen canh, lúa–thủy sản, bỏ hóa/cây phân xanh…), phù hợp mong muốn của nông dân.
Trả về DUY NHẤT JSON: {"strategies":[{"title":"tên ngắn","crops":["cây vụ 1","cây vụ 2","cây vụ 3"],"rationale":"vì sao, dựa vào dữ kiện nào (tối đa 60 từ)","tactics":["việc cụ thể ngắn"]}]}.
Tên cây bằng tiếng Việt thông dụng. Chỉ dùng con số có trong dữ liệu; không bịa số; không ghi liều phân/thuốc. Nói rõ khi dữ kiện là ước tính vệ tinh/mô hình.`,
  en: `You are a rotation expert for the Mekong Delta, working for Mekong Seasons, a student project using public NASA data (not a NASA product).
Read: the farmer's free-text description, field facts (JSON; "kind": ground = measured on the field, satellite, model = approximate model, missing), map-layer signals, and 3-season sequences already graded with FAO tables.
BRAINSTORM up to 4 different rotation strategies for Winter–Spring → Summer–Autumn → Autumn–Winter, including ideas outside the list (other crops, intercropping, rice–aquaculture, fallow/green manure…), matching the farmer's wishes.
Return ONLY JSON: {"strategies":[{"title":"short name","crops":["season 1 crop","season 2 crop","season 3 crop"],"rationale":"why, based on which facts (max 60 words)","tactics":["short concrete action"]}]}.
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
        config: { systemInstruction: BRAINSTORM[lang], temperature: 0.8, maxOutputTokens: 1500, responseMimeType: 'application/json' },
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
  // Có dữ kiện thửa → chạy 2 tầng: Tầng 1 đề xuất (ẩn), Tầng 2 kiểm tra rồi mới stream câu trả lời.
  if (Array.isArray(body.context?.facts)) {
    const proposal = await tier1Proposal(lang, body.context, contents[contents.length - 1].parts[0].text)
    if (!proposal) {
      res.statusCode = 502
      return res.end()
    }
    systemInstruction = `${TIER2[lang]}\n\nField data (JSON):\n${JSON.stringify(body.context).slice(0, 8000)}\n\nTier 1 proposal:\n${proposal.slice(0, 2000)}`
  }

  // When the main model is busy (Google returns 503 "high demand"), try the lighter one before giving up;
  // the page falls back to its rule-based answers if both fail.
  for (const model of models) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction, temperature: 0.4, maxOutputTokens: 800 },
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
