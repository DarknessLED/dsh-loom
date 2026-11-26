// The trial counts promotions because promotions are what the gate emits, and
// that makes it very expensive: a proportion needs hundreds of rounds to resolve
// ten points. The loop already measures something finer -- every attempt records
// a score, and when the score came from a kill rate it is continuous. Throwing
// that away to count coin flips is the same mistake R2 names: a binary verdict
// is a lossy readout of a number the verifier already printed.
//
// These checks pin the second reading: when both arms carry finite scores, the
// comparison reports the mean difference with its own interval and MDE, and says
// which reading it used. Promotions stay, because a campaign where nothing was
// solved is not a campaign whose scores mean anything.

import test from 'node:test'
import assert from 'node:assert/strict'

import { compareResearchArms } from '../../src/loop/research-trial.js'

const ok = (name) => console.log(`ok ${name}`)

const round = (n, arm, score, promoted = score >= 0.5) => ({
  n,
  status: promoted ? 'promoted' : 'no-gain',
  promoted,
  score,
  researchTrial: { arm },
  costUsd: 0.01,
})

test('a continuous reading is reported alongside the count', () => {
  const rounds = [
    round(1, 'full', 0.9),
    round(2, 'full', 0.8),
    round(3, 'full', 0.85),
    round(4, 'off', 0.4),
    round(5, 'off', 0.5),
    round(6, 'off', 0.45),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.ok(cmp.score, 'a comparison over continuous scores must report the mean reading')
  assert.equal(cmp.score.basis, 'mean score')
  assert.ok(Math.abs(cmp.score.arms.full.mean - 0.85) < 1e-9, `full arm mean ${cmp.score.arms.full.mean}`)
  assert.ok(Math.abs(cmp.score.arms.off.mean - 0.45) < 1e-9, `off arm mean ${cmp.score.arms.off.mean}`)
  assert.ok(cmp.score.delta > 0.39 && cmp.score.delta < 0.41, `delta ${cmp.score.delta}`)
  assert.ok(cmp.score.interval.low > 0, `an interval that contains zero cannot support the delta: ${JSON.stringify(cmp.score.interval)}`)
  ok('a continuous reading is reported alongside the count')
})

test('the continuous reading names its own direction, separately from the count', () => {
  const rounds = [
    round(1, 'full', 0.9),
    round(2, 'full', 0.8),
    round(3, 'full', 0.85),
    round(4, 'off', 0.4),
    round(5, 'off', 0.5),
    round(6, 'off', 0.45),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.verdict, 'full-better', 'the count cannot see six rounds, and must not be the only reading')
  assert.equal(cmp.score.verdict, 'full-better')
  assert.match(cmp.sentence, /score/i, 'the sentence must say which reading it is reporting')
  ok('the continuous reading names its own direction, separately from the count')
})

test('a nudge below the noise is not a direction in either reading', () => {
  const rounds = [
    round(1, 'full', 0.51),
    round(2, 'full', 0.49),
    round(3, 'full', 0.5),
    round(4, 'off', 0.5),
    round(5, 'off', 0.51),
    round(6, 'off', 0.49),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.score.verdict, 'cannot-distinguish')
  assert.equal(cmp.verdict, 'cannot-distinguish')
  ok('a nudge below the noise is not a direction in either reading')
})

test('without finite scores the reading falls back to counting and says so', () => {
  const rounds = [
    { n: 1, status: 'promoted', promoted: true, researchTrial: { arm: 'full' }, costUsd: 0.01 },
    { n: 2, status: 'promoted', promoted: true, researchTrial: { arm: 'off' }, costUsd: 0.01 },
    { n: 3, status: 'promoted', promoted: false, researchTrial: { arm: 'full' }, costUsd: 0.01 },
    { n: 4, status: 'promoted', promoted: false, researchTrial: { arm: 'off' }, costUsd: 0.01 },
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.score, null, 'a missing score must not be read as a zero score')
  assert.equal(cmp.verdict, 'cannot-distinguish')
  ok('without finite scores the reading falls back to counting and says so')
})

test('a score that is really a binary verdict is not treated as a fine measurement', () => {
  const rounds = [
    { n: 1, status: 'promoted', promoted: true, score: 1, scoreSource: 'binary', researchTrial: { arm: 'full' } },
    { n: 2, status: 'promoted', promoted: true, score: 1, scoreSource: 'binary', researchTrial: { arm: 'full' } },
    { n: 3, status: 'promoted', promoted: false, score: 0, scoreSource: 'binary', researchTrial: { arm: 'full' } },
    { n: 4, status: 'promoted', promoted: false, score: 0, scoreSource: 'binary', researchTrial: { arm: 'off' } },
    { n: 5, status: 'promoted', promoted: true, score: 1, scoreSource: 'binary', researchTrial: { arm: 'off' } },
    { n: 6, status: 'promoted', promoted: false, score: 0, scoreSource: 'binary', researchTrial: { arm: 'off' } },
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.score, null, 'a 0/1 score read as a continuous one invents precision the verifier never printed')
  ok('a score that is really a binary verdict is not treated as a fine measurement')
})
