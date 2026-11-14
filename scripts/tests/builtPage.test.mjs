// Kiểm tra file index.html đã build: mọi <script> phải đúng cú pháp JavaScript.
//   npm run build   (trước)
//   npm test
//
// Vì sao cần: scripts/build-site.mjs xoá import/export rồi nối MỌI module vào MỘT phạm vi chung.
// Chỉ cần hai file cùng khai báo một tên ở cấp cao nhất (ví dụ `const round`), trình duyệt báo
// SyntaxError và cả trang trắng xoá, trong khi `npm run build` vẫn chạy xong bình thường.
// Test này nhờ Node đọc cú pháp từng <script> (KHÔNG chạy code) để bắt lỗi đó trước khi commit.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const indexPath = fileURLToPath(new URL('../../index.html', import.meta.url))
const isModule = (attrs) => /type="module"/.test(attrs)

test('index.html đã build: các chỗ giữ chỗ đã được thay hết', () => {
  assert.ok(existsSync(indexPath), 'Chưa có index.html. Hãy chạy `npm run build` trước.')
  const html = readFileSync(indexPath, 'utf8')
  for (const mark of ['/*__LOGIC__*/', '/*__CSS__*/', '/*__FONTS__*/', '/*__ICONS__*/ {}']) {
    assert.ok(!html.includes(mark), `index.html còn nguyên chỗ giữ chỗ ${mark}: build chưa chạy trọn vẹn`)
  }
})

test('index.html đã build: mọi <script> đúng cú pháp (không trùng tên biến cấp cao nhất)', () => {
  assert.ok(existsSync(indexPath), 'Chưa có index.html. Hãy chạy `npm run build` trước.')
  const html = readFileSync(indexPath, 'utf8')
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .map((m) => ({ attrs: m[1], code: m[2] }))
    .filter((s) => s.code.trim() !== '')
  assert.ok(scripts.some((s) => isModule(s.attrs)), 'Không tìm thấy <script type="module"> trong index.html')

  const dir = mkdtempSync(join(tmpdir(), 'muavu-kiem-tra-'))
  try {
    scripts.forEach((s, i) => {
      // .mjs = module (như <script type="module">), .cjs = script thường
      const file = join(dir, `script-${i + 1}.${isModule(s.attrs) ? 'mjs' : 'cjs'}`)
      writeFileSync(file, s.code)
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
      const firstLines = String(result.stderr).split('\n').slice(0, 8).join('\n')
      assert.equal(result.status, 0, `<script> thứ ${i + 1} trong index.html sai cú pháp. Thường là do hai module khai báo trùng tên.\n${firstLines}`)
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
