// Spec: the promotion gate must know how noisy its own measurement is.
//
// `loom-noise` measured spreadMax 0.100 and pooled sd 0.029 on repeated runs of
// the same tree; the gate still promotes on any delta >= minGain, so a 0.02
// "gain" that is pure repetition noise counts as progress. Measured noise is
// the error bar: a delta inside it is not a gain, however it compares to
// minGain.
//
// Input additions (both optional, so every existing caller keeps working):
//   config.noiseMultiplier  default 1, the error bar is noiseSpread * multiplier
//   evidence.noiseSpread    a finite number from a repeatability measurement
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decidePromotion } from '../../src/gate/gate.js'

function input(extra = {}) {
  return {
    candidate: { score: 0.62, holdoutScore: null },
    incumbent: { score: 0.6, holdoutScore: null },
    config: { minGain: 0.02, holdoutSlack: 0, minTasks: 1 },
    evidence: { tasksEvaluated: 4, holdoutEvaluated: 0, complete: true },
    ...extra,
  }
}

test('without a noise measurement the gate behaves exactly as before', () => {
  const r = decidePromotion(input())
  assert.equal(r.promote, true)
  assert.notEqual(r.checks.noise, false)
})

test('a delta inside the measured noise is not a gain', () => {
  const r = decidePromotion(input({ evidence: { tasksEvaluated: 4, holdoutEvaluated: 0, complete: true, noiseSpread: 0.1 } }))
  assert.equal(r.promote, false)
  assert.match(r.reason, /within measured noise/i)
  assert.equal(r.checks.noise, false)
})

test('a delta beyond the noise bars still promotes', () => {
  const r = decidePromotion(
    input({
      candidate: { score: 0.72, holdoutScore: null },
      evidence: { tasksEvaluated: 4, holdoutEvaluated: 0, complete: true, noiseSpread: 0.1 },
    }),
  )
  assert.equal(r.promote, true)
  assert.equal(r.checks.noise, true)
})

test('noiseMultiplier widens the bar', () => {
  const inNoise = input({
    candidate: { score: 0.68, holdoutScore: null },
    config: { minGain: 0.02, holdoutSlack: 0, minTasks: 1, noiseMultiplier: 2 },
    evidence: { tasksEvaluated: 4, holdoutEvaluated: 0, complete: true, noiseSpread: 0.05 },
  })
  assert.equal(decidePromotion(inNoise).promote, false)
})

test('a zero or junk noise measurement is ignored', () => {
  for (const noiseSpread of [0, null, undefined, Number.NaN, 'x']) {
    const r = decidePromotion(input({ evidence: { tasksEvaluated: 4, holdoutEvaluated: 0, complete: true, noiseSpread } }))
    assert.equal(r.promote, true, `noiseSpread=${String(noiseSpread)}`)
  }
})

test('the first baseline is not held hostage to noise', () => {
  const r = decidePromotion({
    candidate: { score: 0.3, holdoutScore: null },
    incumbent: null,
    config: { minGain: 0.02, holdoutSlack: 0, minTasks: 1 },
    evidence: { tasksEvaluated: 4, holdoutEvaluated: 0, complete: true, noiseSpread: 0.5 },
  })
  assert.equal(r.promote, true)
})

test('incomplete evidence still wins over the noise check', () => {
  const r = decidePromotion(input({ evidence: { tasksEvaluated: 0, holdoutEvaluated: 0, complete: false, noiseSpread: 0.1 } }))
  assert.equal(r.promote, false)
  assert.match(r.reason, /incomplete/i)
})
