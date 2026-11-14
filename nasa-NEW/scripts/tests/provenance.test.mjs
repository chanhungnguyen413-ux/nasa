// Cổng nguồn gốc chạy trong npm test: thư viện cây phải có nguồn, URL và trích dẫn cho mọi số.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkProvenance } from '../check-provenance.mjs'

test('cổng nguồn gốc: mọi số trong cropLibrary và rotationCrops có nguồn, URL và trích nguyên văn', () => {
  assert.deepEqual(checkProvenance(), [])
})
