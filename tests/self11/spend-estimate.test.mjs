/**
 * Spec: a campaign's dollar figure must stop being decorative.
 *
 * Tonight every campaign reported `$0.00` no matter how many rounds ran, because
 * the child sessions carry no `usage` block and no token meter is installed in
 * this host. A budget that cannot be exceeded is not a budget: the loop happily
 * ignores `budget.usd` because spend never rises.
 *
 * The honest fallback does not need a meter — the transcripts exist. Estimate
 * from the message text and say so (`estimated: true`), so a human reading the
 * report knows the number is an estimate rather than a measurement.
 */
import assert from 'node:assert/strict'

let passed = 0
let failed = 0
function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n').join('\n  ')}`)
  }
}

const { usageOfSession } = await import('../../src/runtime/cost.js')

const PRICING = { inputPerMTok: 0.28, outputPerMTok: 0.42, cacheReadPerMTok: 0.028 }

function ctxWith(events) {
  return {
    sessions: {
      get: () => ({ snapshotEvents: () => events }),
    },
  }
}

const assistantText = (text) => ({
  type: 'assistant/message',
  data: { message: { role: 'assistant', content: [{ type: 'text', text }] } },
})

test('no usage block and no meter still yields a non-zero estimate', () => {
  const text = 'x'.repeat(4000) // ~1000 tokens at 4 chars per token
  const out = usageOfSession(ctxWith([assistantText(text)]), 's1', PRICING)
  assert.ok(out.outputTokens > 0, 'output tokens must be estimated from the transcript')
  assert.ok(out.usd > 0, 'a campaign that ran must cost something')
  assert.equal(out.estimated, true, 'the number must be marked as an estimate')
})

test('the estimate scales with the amount of text', () => {
  const small = usageOfSession(ctxWith([assistantText('y'.repeat(400))]), 's1', PRICING)
  const big = usageOfSession(ctxWith([assistantText('y'.repeat(40000))]), 's1', PRICING)
  assert.ok(big.usd > small.usd, 'more text must cost more')
  assert.ok(big.usd / small.usd > 50, `expected roughly 100x, got ${big.usd / small.usd}`)
})

test('an empty transcript stays at zero and is not marked estimated', () => {
  const out = usageOfSession(ctxWith([]), 's1', PRICING)
  assert.equal(out.usd, 0)
  assert.notEqual(out.estimated, true)
})

test('a session that cannot be read degrades to zero instead of throwing', () => {
  const ctx = { sessions: { get: () => { throw new Error('gone') } } }
  const out = usageOfSession(ctx, 's1', PRICING)
  assert.equal(out.usd, 0)
})

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exitCode = 1
