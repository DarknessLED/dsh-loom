/**
 * The parallel factor was dividing by the wrong number.
 *
 * `parallelFactor = attemptMs / durationMs` counts the planning node and the
 * holdout gate as if they were round work, so a loop that runs two candidates
 * truly concurrently reports ~1.0 and looks serial. The number that means
 * "did the candidates overlap" is attempt time over the window in which
 * candidates were actually running.
 *
 * The rule: report the attempt window, and compute the factor over it.
 */
import assert from 'node:assert/strict'
import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

{
  // 2s of planning, then two candidates that overlap for 2s of wall clock and
  // consume 4s of work between them: they ran in parallel.
  const t = campaignTriangle([{ durationMs: 4000, planMs: 2000, attemptMs: 4000, verifierMs: 100, verifierRuns: 1 }])
  assert.equal(t.attemptWindowMs, 2000, 'the window is the round minus planning')
  assert.equal(t.parallelFactor, 2, 'two candidates in two seconds is a factor of two')
  ok('the parallel factor is measured over the attempt window')
}

{
  // The same round, run serially: the window and the work are the same number.
  const t = campaignTriangle([{ durationMs: 6000, planMs: 2000, attemptMs: 4000 }])
  assert.equal(t.parallelFactor, 1, 'four seconds of work in four seconds of window is serial')
  ok('a serial round reads as serial')
}

{
  // A holdout gate is not attempt work either, so it must not shrink the window.
  const t = campaignTriangle([{ durationMs: 9000, planMs: 2000, holdoutMs: 3000, attemptMs: 4000 }])
  assert.equal(t.attemptWindowMs, 4000, 'planning and the holdout gate are outside the window')
  assert.equal(t.parallelFactor, 1)
  ok('the holdout gate is not counted as candidate time')
}

{
  const t = campaignTriangle([{ durationMs: 1000, planMs: 2000, attemptMs: 500 }])
  assert.equal(t.attemptWindowMs, 0, 'a broken round cannot produce a negative window')
  assert.equal(t.parallelFactor, null, 'and no factor is manufactured from nothing')
  ok('a window of zero reports no factor, not infinity')
}

console.log(`${pass}/4 passed`)
assert.ok(pass > 0)
