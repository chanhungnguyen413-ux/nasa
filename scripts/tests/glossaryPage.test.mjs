// Trang Thuật ngữ (#/thuat-ngu): nhóm hợp lệ, tìm kiếm không dấu, và số trong thuật ngữ mới khớp nguồn của app.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GLOSSARY } from '../../site/i18n/glossary.js'
import { CROP_LIBRARY } from '../../site/data/cropLibrary.js'
import { GP_CATS, gpFilter, gpFold } from '../../site/pages/glossaryPage.js'

test('Mọi thuật ngữ (VI và EN) có category thuộc 3 nhóm lọc', () => {
  for (const lang of ['vi', 'en']) {
    for (const [id, e] of Object.entries(GLOSSARY[lang])) assert.ok(GP_CATS.includes(e.category), `${lang}.${id}`)
    assert.ok(Object.keys(GLOSSARY[lang]).length >= 22)
  }
})

test('Tìm kiếm: gõ không dấu vẫn ra, lọc nhóm đúng, từ viết tắt khớp', () => {
  const vi = Object.entries(GLOSSARY.vi)
  assert.equal(gpFold('Đất phèn'), 'dat phen')
  assert.ok(gpFilter(vi, { query: 'dat phen' }).some(([id]) => id === 'soiltype'))
  assert.ok(gpFilter(vi, { query: 'ECe' }).some(([id]) => id === 'ece'))
  assert.ok(gpFilter(vi, { query: 'ndvi' }).some(([id]) => id === 'ndvi'))
  const soil = gpFilter(vi, { cat: 'soilWater' })
  assert.ok(soil.length > 0 && soil.every(([, e]) => e.category === 'soilWater'))
  assert.equal(gpFilter(vi, { query: 'zzzz-khong-co' }).length, 0)
  assert.equal(gpFilter(vi, {}).length, vi.length)
})

test('Số trong thuật ngữ ECe và pH chép đúng từ cropLibrary (FAO-29, FAO Ecocrop), không viết từ trí nhớ', () => {
  const { rice, maize, mungbean } = CROP_LIBRARY
  assert.equal(rice.salinityEce, 3.0)
  assert.equal(maize.salinityEce, 1.7)
  assert.equal(mungbean.salinityEce, null) // thuật ngữ nói "FAO-29 không có dòng đậu xanh"
  assert.deepEqual(rice.ph.optimal, [5.5, 7])
  assert.deepEqual(rice.ph.absolute, [4.5, 9])
  assert.ok(GLOSSARY.vi.ece.detail.some((d) => d.includes('3,0 dS/m') && d.includes('1,7 dS/m')))
  assert.ok(GLOSSARY.en.ece.detail.some((d) => d.includes('3.0 dS/m') && d.includes('1.7 dS/m')))
  assert.ok(GLOSSARY.vi.ph.detail.some((d) => d.includes('5,5–7') && d.includes('4,5–9')))
  assert.ok(GLOSSARY.en.ph.detail.some((d) => d.includes('5.5–7') && d.includes('4.5–9')))
})
