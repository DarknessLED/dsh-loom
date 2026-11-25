// A rule is not a measurement.
//
// `researchModeFor` answers "read or not" from the previous round's outcome, so
// any statistic computed over its rounds is conditioned on the outcome -- the
// arms are selected, and "reading rounds promote less often" is an artefact of
// the rule, not a finding about reading.
//
// The only design that answers it assigns the arm before the round runs and
// compares what happened. These checks pin the three properties that make such a
// trial usable: the assignment is re-derivable from the ledger, the two arms are
// counted from what happened rather than from what was intended, and an
// unresolvable difference is reported as unresolvable.

import test from 'node:test'
import assert from 'node:assert/strict'

import { assignArm, compareResearchArms } from '../../src/loop/research-trial.js'

const ok = (name) => console.log(`ok ${name}`)

test('the arm is derivable from the ledger, not from memory', () => {
  const a = assignArm({ campaign: 'c1', round: 1 })
  const b = assignArm({ campaign: 'c1', round: 1 })
  assert.equal(a, b, 'the same round must land in the same arm every time')
  assert.ok(a === 'full' || a === 'off')
  ok('the arm is derivable from the ledger, not from memory')
})

test('a different seed gives a different assignment, so the trial is repeatable but not fixed', () => {
  const rounds = Array.from({ length: 20 }, (_, i) => i + 1)
  const one = rounds.map((round) => assignArm({ seed: 's1', campaign: 'c', round }))
  const two = rounds.map((round) => assignArm({ seed: 's2', campaign: 'c', round }))
  assert.notDeepEqual(one, two, 'a seed that does not change anything is not a seed')
  // Both seeds must actually use both arms, or the trial measures nothing.
  for (const arms of [one, two]) {
    assert.ok(arms.includes('full') && arms.includes('off'), `seed produced one arm only: ${arms.join(',')}`)
  }
  ok('a different seed gives a different assignment, so the trial is repeatable but not fixed')
})

test('the split is roughly even over a hundred rounds', () => {
  const arms = Array.from({ length: 100 }, (_, i) => assignArm({ campaign: 'balance', round: i + 1 }))
  const full = arms.filter((a) => a === 'full').length
  assert.ok(full >= 35 && full <= 65, `100 rounds split ${full}/${100 - full}, which is not a coin`)
  ok('the split is roughly even over a hundred rounds')
})

test('rounds that were never judged are not evidence about reading', () => {
  const rounds = [
    { n: 1, promoted: true, status: 'promoted', researchTrial: { arm: 'full' }, costUsd: 0.01 },
    { n: 2, promoted: false, status: 'interrupted', researchTrial: { arm: 'off' }, costUsd: 0.01 },
    { n: 3, promoted: false, status: 'no-gain', researchTrial: { arm: 'off' }, costUsd: 0.01 },
  ]
  const out = compareResearchArms({ rounds })
  assert.equal(out.arms.full.n, 1)
  assert.equal(out.arms.off.n, 1, 'a stopped round was never judged, so it cannot count against an arm')
  ok('rounds that were never judged are not evidence about reading')
})

test('arm membership comes from the round, not from whether it read', () => {
  // Both rounds are in the "read" arm, but one of them failed to read (no web).
  // Counting by `research.mode` would move it to the other arm after the fact.
  const rounds = [
    { n: 1, promoted: true, status: 'promoted', researchTrial: { arm: 'full' }, research: { mode: 'off', skipped: 'web-unavailable' }, costUsd: 0.01 },
    { n: 2, promoted: false, status: 'no-gain', researchTrial: { arm: 'off' }, research: { mode: 'full' }, costUsd: 0.02 },
  ]
  const out = compareResearchArms({ rounds })
  assert.equal(out.arms.full.n, 1)
  assert.equal(out.arms.off.n, 1)
  assert.equal(out.arms.full.promoted, 1)
  ok('arm membership comes from the round, not from whether it read')
})

test('a small difference over few rounds is reported as unresolvable, not as no effect', () => {
  // Three of four read rounds promoted against two of four that skipped: a real
  // 25-point gap that eight rounds cannot resolve. A fixture with perfect
  // separation would be resolvable even at n=8, so it would prove nothing here.
  const rounds = []
  for (let i = 1; i <= 8; i += 1) {
    const arm = i % 2 === 0 ? 'full' : 'off'
    const promoted = arm === 'full' ? i !== 8 : i % 4 === 1
    rounds.push({ n: i, promoted, status: promoted ? 'promoted' : 'no-gain', researchTrial: { arm }, costUsd: 0.01 })
  }
  const out = compareResearchArms({ rounds })
  assert.equal(out.verdict, 'cannot-distinguish')
  assert.match(out.sentence, /not "no effect"/i)
  assert.ok(out.mde > 0, 'a design that claims infinite sensitivity is lying')
  ok('a small difference over few rounds is reported as unresolvable, not as no effect')
})

test('a large separation over enough rounds is named', () => {
  const rounds = []
  for (let i = 1; i <= 120; i += 1) {
    const arm = i % 2 === 0 ? 'full' : 'off'
    const promoted = arm === 'full' ? i % 10 !== 0 : i % 10 < 3
    rounds.push({ n: i, promoted, status: promoted ? 'promoted' : 'no-gain', researchTrial: { arm }, costUsd: 0.01 })
  }
  const out = compareResearchArms({ rounds })
  assert.equal(out.verdict, 'full-better')
  assert.ok(out.delta > 0)
  assert.ok(out.arms.full.interval.low > out.arms.off.interval.high)
  ok('a large separation over enough rounds is named')
})

test('one round in an arm is not a direction', () => {
  const rounds = [
    { n: 1, promoted: true, status: 'promoted', researchTrial: { arm: 'full' }, costUsd: 0.01 },
    { n: 2, promoted: false, status: 'no-gain', researchTrial: { arm: 'off' }, costUsd: 0.01 },
  ]
  const out = compareResearchArms({ rounds })
  assert.equal(out.ready, false)
  assert.equal(out.verdict, 'cannot-distinguish')
  ok('one round in an arm is not a direction')
})

test('cost per arm is reported, because the trial charges the reading arm', () => {
  const rounds = [
    { n: 1, promoted: true, status: 'promoted', researchTrial: { arm: 'full' }, costUsd: 0.02 },
    { n: 2, promoted: true, status: 'promoted', researchTrial: { arm: 'full' }, costUsd: 0.04 },
    { n: 3, promoted: true, status: 'promoted', researchTrial: { arm: 'off' }, costUsd: 0.01 },
  ]
  const out = compareResearchArms({ rounds })
  assert.equal(out.arms.full.usdTotal, 0.06)
  assert.equal(out.arms.off.usdTotal, 0.01)
  assert.ok(Math.abs(out.arms.full.usdPerRound - 0.03) < 1e-9)
  ok('cost per arm is reported, because the trial charges the reading arm')
})

test('an empty ledger says the trial has not started', () => {
  const out = compareResearchArms({ rounds: [] })
  assert.equal(out.n, 0)
  assert.match(out.sentence, /not started/i)
  ok('an empty ledger says the trial has not started')
})
