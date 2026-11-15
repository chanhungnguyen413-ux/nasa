// Test trợ lý nông trại: kiểm tra trích số từ sổ bằng chứng, chặn số bịa đặt của AI, và trả lời mẫu ngoại tuyến.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evidence } from '../../site/core/evidence.js'
import { assistantContext, asstLedgerNumbers, asstVerifyReply, fallbackAnswer } from '../../site/logic/assistantFallback.js'

const ev = (value, unit = 'mm') => evidence({ value, unit, kind: 'model', source: 'powerDaily' })

const sampleData = {
  wb: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    rain: ev(i < 4 ? 25 : 210),
    et0: ev(130),
    balance: ev(i < 4 ? -105 : 80),
    deficit: i < 4,
    isDry: i < 4,
  })),
  user: {
    soil: {
      ec: evidence({ value: 2.4, unit: 'dS/m', kind: 'farmer', source: 'farmerInput' }),
      ecType: 'ece',
      ph: evidence({ value: 5.5, unit: '', kind: 'farmer', source: 'farmerInput' }),
    },
  },
}

const sampleEval = {
  strategies: [
    { strategyId: 'B', kind: 'water', crops: ['rice', 'mungbean', 'rice'], eligibility: 'eligible', riskLevel: 'conditional', rank: 1, score: 78, missingFields: [] },
    { strategyId: 'A', kind: 'base', crops: ['rice', 'rice', 'rice'], eligibility: 'eligible', riskLevel: 'high', rank: 2, score: 54, missingFields: [] },
  ],
}

test('asstVerifyReply cho phép câu trả lời dùng đúng số trong ngữ cảnh & sổ bằng chứng', () => {
  const ctx = assistantContext({ loc: { name: 'Cờ Đỏ', lat: 10.1, lon: 105.43 }, data: sampleData, evalResult: sampleEval, areaM2: 15000, polygon: [[10.1, 105.4], [10.1, 105.41], [10.11, 105.41]] })
  const ledger = new Map([['ev1', evidence({ value: 2.4, unit: 'dS/m', kind: 'farmer', source: 'farmerInput' })]])
  const allowed = asstLedgerNumbers(ctx, ledger)
  const good = 'Tại Cờ Đỏ, phương án B đạt 78/100 điểm. Độ mặn hiện đo 2,4 dS/m và diện tích 1,5 ha.'
  const res = asstVerifyReply(good, allowed)
  assert.equal(res.ok, true)
  assert.deepEqual(res.unverified, [])
})

test('asstVerifyReply chặn câu trả lời AI bịa số không có trong sổ bằng chứng', () => {
  const ctx = assistantContext({ loc: { name: 'Cờ Đỏ', lat: 10.1, lon: 105.43 }, data: sampleData, evalResult: sampleEval })
  const allowed = asstLedgerNumbers(ctx)
  const hallucinated = 'Ruộng bạn cần tưới 350 mm và lợi nhuận sẽ tăng 42% trong 90 ngày tới.'
  const res = asstVerifyReply(hallucinated, allowed)
  assert.equal(res.ok, false)
  assert.ok(res.unverified.includes('350'))
  assert.ok(res.unverified.includes('42'))
  assert.ok(res.unverified.includes('90'))
})

test('fallbackAnswer trả lời đúng dữ liệu ruộng và luôn kèm khuyến cáo khuyến nông', () => {
  const ctx = assistantContext({ loc: { name: 'Cờ Đỏ', lat: 10.1, lon: 105.43 }, data: sampleData, evalResult: sampleEval })
  const viAns = fallbackAnswer('Tháng nào thiếu nước?', ctx, 'vi')
  assert.match(viAns, /105/)
  assert.match(viAns, /khuyến nông/i)

  const enAns = fallbackAnswer('Which rotation strategy leads?', ctx, 'en')
  assert.match(enAns, /78\/100/)
  assert.match(enAns, /extension officer/i)
})
