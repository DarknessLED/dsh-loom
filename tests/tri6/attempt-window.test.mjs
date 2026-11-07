/**
 * The plan-aware factor still divides by a window it does not own.
 *
 * `planAwareFactor = attemptMs / (durationMs - planMs)` credits candidates only
 * against the part of the round that could host them — but the holdout gate is
 * also paid after the candidates are done, and it is counted as candidate time.
 * A round that spent 4s on candidates, 2s planning and 3s proving the holdout
 * reports a factor of 0.57 and reads as serial.
 *
 * The rule: name the window, subtract everything that is not candidate time
 * (planning and the holdout gate), and report no factor when the window is 0.
 */
import assert from 'node:assert/strict'
import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

{
  // 2s planning, 2s of candidates overlapping, 4s of work: a factor of two.
  const t = campaignTriangle([{ durationMs: 4000, planMs: 2000, attemptMs: 4000, verifierMs: 100, verifierRuns: 1 }])
  assert.equal(t.attemptWindowMs, 2000, 'the window is the round minus planning')
  assert.equal(t.planAwareFactor, 2, 'two candidates in two seconds is a factor of two')
  ok('the plan-aware factor is measured over the attempt window')
}

{
  // The holdout gate is not candidate time either, so it must not shrink the window.
  const t = campaignTriangle([{ durationMs: 9000, planMs: 2000, holdoutMs: 3000, attemptMs: 4000 }])
  assert.equal(t.attemptWindowMs, 4000, 'planning and the holdout gate are outside the window')
  assert.equal(t.planAwareFactor, 1, 'four seconds of work in four seconds of window is serial')
  ok('the holdout gate is not counted as candidate time')
}

{
  const t = campaignTriangle([{ durationMs: 1000, planMs: 2000, attemptMs: 500 }])
  assert.equal(t.attemptWindowMs, 0, 'a broken round cannot produce a negative window')
  assert.equal(t.planAwareFactor, null, 'and no factor is manufactured from nothing')
  ok('a window of zero reports no factor, not infinity')
}

{
  // A round with no timing at all is unmeasured, not serial.
  const t = campaignTriangle([{ n: 1, status: 'promoted', score: 1 }])
  assert.equal(t.attemptWindowMs, null, 'no window can be claimed without measurements')
  assert.equal(t.planAwareFactor, t.parallelFactor, 'the fallback is the plain factor, as before')
  ok('an unmeasured round keeps the previous fallback')
}

console.log(`${pass}/4 passed`)
assert.ok(pass > 0)
