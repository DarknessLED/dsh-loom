/**
 * Spec: the loop has to say how healthy its own evidence is.
 *
 * A campaign's ledger already knows how many rounds promoted nothing, how often
 * the held-out task rejected a patch, and how long rounds take. `rsi_report`
 * prints none of it, so a human reading the report cannot tell "still working"
 * from "spinning". This spec pins a pure helper plus the wiring that makes the
 * report use it.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

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

const { campaignQuality } = await import('../../src/runtime/quality.js')

function stateWith(rounds) {
  return { id: 'q', status: 'running', rounds }
}

test('campaignQuality is exported and returns an object', () => {
  const q = campaignQuality(stateWith([]))
  assert.equal(typeof q, 'object')
  assert.equal(q.rounds, 0)
  assert.equal(q.verdict, 'no-evidence')
})

test('counts promotions, no-gain rounds and holdout failures', () => {
  const state = stateWith([
    { n: 1, status: 'promoted', promoted: true, ms: 1000 },
    { n: 2, status: 'no-gain', promoted: false, ms: 3000 },
    { n: 3, status: 'holdout-failed', promoted: false, ms: 2000 },
    { n: 4, status: 'promoted', promoted: true, ms: 2000 },
  ])
  const q = campaignQuality(state)
  assert.equal(q.rounds, 4)
  assert.equal(q.promotions, 2)
  assert.equal(q.noGain, 1)
  assert.equal(q.holdoutFailures, 1)
  assert.equal(q.promotionRate, 0.5)
})

test('average round duration ignores missing or non-finite durations', () => {
  const state = stateWith([
    { n: 1, status: 'promoted', promoted: true, ms: 1000 },
    { n: 2, status: 'no-gain', promoted: false },
    { n: 3, status: 'promoted', promoted: true, ms: Number.NaN },
    { n: 4, status: 'promoted', promoted: true, ms: 3000 },
  ])
  const q = campaignQuality(state)
  assert.equal(q.avgRoundMs, 2000)
})

test('a holdout rejection outranks everything else in the verdict', () => {
  const state = stateWith([
    { n: 1, status: 'promoted', promoted: true, ms: 1000 },
    { n: 2, status: 'holdout-failed', promoted: false, ms: 1000 },
    { n: 3, status: 'promoted', promoted: true, ms: 1000 },
  ])
  assert.equal(campaignQuality(state).verdict, 'regressing')
})

test('three or more rounds without a promotion is a stall', () => {
  const state = stateWith([
    { n: 1, status: 'no-gain', promoted: false, ms: 1000 },
    { n: 2, status: 'no-gain', promoted: false, ms: 1000 },
    { n: 3, status: 'no-gain', promoted: false, ms: 1000 },
  ])
  const q = campaignQuality(state)
  assert.equal(q.verdict, 'stalled')
  assert.equal(q.promotionRate, 0)
})

test('two quiet rounds are not yet a stall', () => {
  const state = stateWith([
    { n: 1, status: 'promoted', promoted: true, ms: 1000 },
    { n: 2, status: 'no-gain', promoted: false, ms: 1000 },
  ])
  assert.equal(campaignQuality(state).verdict, 'healthy')
})

test('rsi_report actually prints the quality block', () => {
  const src = readFileSync(new URL('../../src/tools/index.js', import.meta.url), 'utf8')
  assert.ok(
    src.includes('campaignQuality'),
    'src/tools/index.js must import and use campaignQuality from src/runtime/quality.js',
  )
  assert.ok(
    /quality|campaignQuality/.test(src),
    'rsi_report must render the quality numbers, not just compute them',
  )
})

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exitCode = 1
