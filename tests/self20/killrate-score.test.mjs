// Wave 23 / p6: the score the gate should have been reading.
//
// A verifier answers 1 or 0, so a round that barely passes and a round that
// passes with room to spare are the same number, and a task already green in the
// base scores 1 without doing anything. The kill-rate harness measures something
// continuous (0.3114 mean over 22 tasks) and the metric now reaches the attempt.
// The gate must prefer it when it exists, and say which one it used.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreOf } from '../../src/gate/score.js'
import { decidePromotion } from '../../src/gate/gate.js'

test('a graded attempt is scored by its kill rate', () => {
  const out = scoreOf({ verifierOk: true, metrics: { killRate: 0.62 } })
  assert.equal(out.score, 0.62)
  assert.equal(out.source, 'killRate')
})

test('an ungraded attempt still scores its verdict', () => {
  const out = scoreOf({ verifierOk: true, metrics: {} })
  assert.equal(out.score, 1)
  assert.equal(out.source, 'binary')
  assert.equal(scoreOf({ verifierOk: false, metrics: {} }).score, 0)
})

test('a kill rate of zero is a real zero, not a missing metric', () => {
  const out = scoreOf({ verifierOk: true, metrics: { killRate: 0 } })
  assert.equal(out.score, 0)
  assert.equal(out.source, 'killRate')
})

test('the decision carries the metric and where the score came from', () => {
  const out = decidePromotion({
    config: { minGain: 0.05, minTasks: 6 },
    candidate: { verifierOk: true, metrics: { killRate: 0.7 } },
    incumbent: { verifierOk: true, metrics: { killRate: 0.5 } },
    evidence: { complete: true, tasks: 22 },
    policy: { minGain: 0.05 },
  })
  assert.equal(out.promote, true)
  assert.equal(out.metrics.killRate, 0.7)
  assert.equal(out.scoreSource, 'killRate')
})

test('a metric the base never had cannot be compared', () => {
  const out = decidePromotion({
    config: { minGain: 0.05, minTasks: 6 },
    candidate: { verifierOk: true, metrics: { killRate: 0.7 } },
    incumbent: { verifierOk: true, metrics: {} },
    evidence: { complete: true, tasks: 22 },
    policy: { minGain: 0.05 },
  })
  assert.equal(out.promote, true, 'nothing to beat, and the candidate is green')
  assert.equal(out.scoreSource, 'killRate')
})
