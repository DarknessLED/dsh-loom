/**
 * The parallel factor the dashboard reports is `candidate time / wall time`,
 * which counts planning as if it were a serialised candidate. On a campaign
 * where planning is a third of the round the number is structurally deflated:
 * two candidates on two workers read as "1.0, not parallel" when the attempt
 * phase itself is running at 2×.
 *
 * `planAwareFactor` is the honest ratio — candidate time over the part of the
 * round that could actually host candidates — and it must never be produced
 * from a denominator it does not have:
 *   • planning measured on both sides  → candidates / (wall − planning)
 *   • planning never measured          → the plain factor, unchanged
 *   • everything was planning          → null, not Infinity
 */
import assert from 'node:assert/strict'
import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const round = (over = {}) => ({
  n: 1,
  status: 'promoted',
  promoted: true,
  durationMs: 600000,
  planMs: 300000,
  attemptMs: 600000,
  verifierMs: 4000,
  attemptCount: 2,
  tokens: 4000,
  costUsd: 0.002,
  ...over,
})

{
  const t = campaignTriangle([round()])
  assert.equal(t.parallelFactor, 1, 'plain factor counts planning as serial work')
  assert.equal(t.planAwareFactor, 2, 'two candidates on two workers is 2× once planning is out of the denominator')
  ok('planning is removed from the denominator')
}

{
  const t = campaignTriangle([round({ planMs: undefined, durationMs: 400000, attemptMs: 800000 })])
  assert.equal(t.planAwareFactor, t.parallelFactor, 'without a planning measurement the factor must not invent one')
  assert.equal(t.planAwareFactor, 2)
  ok('falls back to the plain factor when planning was never measured')
}

{
  const t = campaignTriangle([round({ planMs: 300000, durationMs: 300000, attemptMs: 0 })])
  assert.equal(t.planAwareFactor, null, 'a round that was all planning has no candidate phase to divide by')
  ok('an empty candidate phase is null, not Infinity')
}

console.log(`${pass}/3 passed`)
assert.ok(pass > 0)
