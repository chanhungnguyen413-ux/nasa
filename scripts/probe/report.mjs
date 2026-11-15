// Viết kết quả dò API thành file Markdown (docs/API_STATUS.md). Chỉ lo phần trình bày, không gọi mạng.

export const VERDICT = {
  browser: 'TRÌNH DUYỆT GỌI ĐƯỢC',
  server: 'PHẢI QUA SERVER',
  saved: 'CHỈ DÙNG BẢN LƯU',
  dead: 'KHÔNG DÙNG ĐƯỢC',
}

const cell = (v) => String(v ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ')
export const table = (headers, rows) =>
  [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n')

const seconds = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`
const httpText = (r) => (r.status ? String(r.status) : `lỗi: ${r.error}`)
const corsText = (r) => (r.cors ? `\`${r.cors}\`` : 'không có')
const timeText = (r) => `${seconds(r.ms)}${r.slow ? ' (CHẬM: quá 15 s ở lần gọi đầu)' : ''}`

function sourceSection(s) {
  const lines = [`### ${s.name}`, '', `**Phán quyết: ${s.verdict}**`, '', `- Địa chỉ đã gọi: \`${s.result.url}\``, `- Tài liệu chính thức: ${s.docs}`]
  lines.push(`- Mã HTTP: ${httpText(s.result)} · thời gian: ${timeText(s.result)} · CORS: ${corsText(s.result)}`)
  if (s.corsNullOrigin !== undefined) {
    // Máy chủ này lặp lại Origin thay vì trả "*". Trang mở bằng nhấp đúp gửi "Origin: null", nên phải thử riêng.
    const allowed = s.corsNullOrigin === 'null' || s.corsNullOrigin === '*'
    lines.push(`- Máy chủ lặp lại đúng Origin được gửi (không trả \`*\`). Thử thêm với \`Origin: null\` (trang mở bằng nhấp đúp): máy chủ trả \`${s.corsNullOrigin ?? 'không có'}\` → ${allowed ? 'vẫn gọi được' : '**KHÔNG gọi được khi mở bằng nhấp đúp**'}.`)
  }
  for (const note of s.notes ?? []) lines.push(`- ${note}`)
  if (s.table) lines.push('', s.table)
  return lines.join('\n')
}

function gibsSection(gibs) {
  const lines = ['### NASA GIBS (ảnh nền vệ tinh, chỉ để nhìn)', '', `**Phán quyết: ${gibs.verdict}**`, '']
  lines.push(`- Địa chỉ đã gọi: \`${gibs.result.url}\``, `- Tài liệu chính thức: ${gibs.docs}`)
  lines.push(`- Mã HTTP: ${httpText(gibs.result)} · thời gian: ${timeText(gibs.result)} · CORS: ${corsText(gibs.result)} · dung lượng: ${Math.round((gibs.result.bytes ?? 0) / 1024)} KB`)
  for (const note of gibs.notes) lines.push(`- ${note}`)
  for (const group of gibs.groups) {
    lines.push('', `#### ${group.label}: ${group.layers.length} lớp`, '')
    if (group.layers.length === 0) {
      lines.push('Không tìm thấy lớp nào khớp từ khoá. Phase 1 không tạo nút cho nhóm này.')
      continue
    }
    lines.push(
      table(
        ['Định danh (dùng nguyên văn)', 'Tiêu đề trong capabilities', 'TileMatrixSet', 'Zoom tối đa', 'Chu kỳ', 'Ngày mới nhất', 'Ngày mặc định', 'Định dạng', 'Thử 1 ô ảnh tại điểm thử', 'Chú giải màu'],
        group.layers.map((l) => [
          `\`${l.id}\``,
          l.title,
          l.tileMatrixSet,
          l.maxZoom,
          l.period,
          l.latestDate,
          l.defaultDate,
          l.formats.join(', '),
          l.tile ? (l.tile.ok ? `được (${l.tile.status}, ${l.tile.bytes} byte, ${seconds(l.tile.ms)})` : `KHÔNG (${httpText(l.tile)})`) : 'không thử',
          l.legendUrl ?? 'không có',
        ]),
      ),
    )
    lines.push('', `Mẫu địa chỉ ô ảnh (của lớp đầu bảng): \`${group.layers[0].tileTemplate}\``)
  }
  return lines.join('\n')
}

export function buildReport({ generatedAt, point, originSent, sources, gibs, limitSeconds, slowLimitSeconds }) {
  const summaryRows = [...sources, gibs].map((s) => [s.shortName, `**${s.verdict}**`, httpText(s.result), timeText(s.result), corsText(s.result), s.summary ?? ''])
  return [
    '# Trạng thái nguồn dữ liệu (API_STATUS)',
    '',
    `File này do \`scripts/probe-apis.mjs\` sinh ra lúc **${generatedAt}**. Không sửa tay: chạy lại bằng \`npm run probe\`.`,
    '',
    `- Điểm thử: ${point.name} (vĩ độ ${point.lat}, kinh độ ${point.lon}).`,
    `- Mỗi lần gọi gửi kèm header \`Origin: http://localhost:5173\` để đọc header CORS \`access-control-allow-origin\`. Tự kiểm tra "Node có thật sự gửi header Origin": **${originSent ? 'có' : 'KHÔNG (kết luận CORS bên dưới không đáng tin)'}**.`,
    `- Hạn mỗi lần gọi: ${limitSeconds} giây. Quá hạn thì thử lại một lần với ${slowLimitSeconds} giây, chỉ để phân biệt "chậm" với "chết".`,
    '- Kết quả phản ánh mạng của máy này tại lúc chạy. **Nên chạy lại tại nơi thi.**',
    '',
    '## Bốn phán quyết',
    '',
    `- **${VERDICT.browser}**: gọi được và máy chủ cho phép trang web đọc phản hồi (có CORS), hoặc là ảnh tải bằng thẻ \`<img>\` (không cần CORS).`,
    `- **${VERDICT.server}**: gọi được nhưng không có CORS, nên phải đi qua \`server/server.mjs\`. Khi đó trang mở bằng nhấp đúp sẽ không có nguồn này.`,
    `- **${VERDICT.saved}**: lúc dò không gọi được, nhưng repo đã có bản tính sẵn đủ dùng trong \`site/data/precomputed/\`.`,
    `- **${VERDICT.dead}**: lúc dò không gọi được và không có bản lưu nào.`,
    '',
    '## Tóm tắt',
    '',
    table(['Nguồn', 'Phán quyết', 'HTTP', 'Thời gian', 'CORS', 'Ghi chú'], summaryRows),
    '',
    '## Chi tiết từng nguồn',
    '',
    sources.map(sourceSection).join('\n\n'),
    '',
    gibsSection(gibs),
    '',
  ].join('\n')
}
