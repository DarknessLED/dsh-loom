// The planner is the loop's most expensive habit: a pre-map agent node runs
// before every round, it is bounded by `session.planTimeoutMs` (240s by
// default), and on the campaigns measured so far it hit that bound in 18 of 75
// instrumented rounds. The ledger already records `planTimedOut` per round, but
// the triangle — the one place a reader argues about the trade — never says what
// the planner bought or cost. That is the question `planMode: 'auto'` was
// supposed to answer and cannot, because it only looks at whether rounds won.
//
// Required: `campaignTriangle(rounds)` also reports a `planning` block:
//   planning: {
//     rounds,          // rounds that recorded a planMs (the measurement base)
//     timedOut,        // of those, how many hit the bound
//     timedOutRate,    // timedOut / rounds, null when nothing was measured
//     ms,              // total planning ms actually spent (measured rounds only)
//     meanMs,          // mean per measured round, null when unmeasured
//     promotedWhenTimedOut, // { rounds, promoted, rate } over timed-out rounds
//     promotedWhenPlanned,  // { rounds, promoted, rate } over rounds that finished planning
//   }
// A round that never recorded planMs is not counted at all (silence is not
// zero); rate is null rather than 0 when its denominator is empty, so "never
// measured" and "never won" stay distinguishable.
import assert from 'node:assert/strict'

import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const round = (over) => ({
  n: 1,
  status: 'promoted',
  promoted: true,
  durationMs: 600000,
  attemptMs: 400000,
  verifierMs: 5000,
  tokens: 2000,
  costUsd: 0.001,
  ...over,
})

{
  // Two timed-out wins, one finished-and-won, one finished-and-lost, one legacy
  // round with no planning measurement at all.
  const rounds = [
    round({ n: 1, planMs: 241000, planTimedOut: true }),
    round({ n: 2, planMs: 240000, planTimedOut: true }),
    round({ n: 3, planMs: 120000, planTimedOut: false }),
    round({ n: 4, planMs: 30000, planTimedOut: false, status: 'no-gain', promoted: false }),
    round({ n: 5, planMs: undefined, planTimedOut: undefined }),
  ]
  const t = campaignTriangle(rounds)
  assert.ok(t.planning, 'the triangle reports a planning block')
  assert.equal(t.planning.rounds, 4, 'only rounds with a planMs measurement count')
  assert.equal(t.planning.timedOut, 2, 'two of them hit the bound')
  assert.equal(t.planning.timedOutRate, 0.5, 'and the rate is over measured rounds')
  assert.equal(t.planning.ms, 241000 + 240000 + 120000 + 30000, 'planning ms is the measured total')
  assert.equal(t.planning.meanMs, Math.round((241000 + 240000 + 120000 + 30000) / 4), 'mean over measured rounds')
  assert.deepEqual(
    t.planning.promotedWhenTimedOut,
    { rounds: 2, promoted: 2, rate: 1 },
    'timed-out rounds are counted with their own win rate',
  )
  assert.deepEqual(
    t.planning.promotedWhenPlanned,
    { rounds: 2, promoted: 1, rate: 0.5 },
    'rounds that finished planning are counted separately',
  )
}
ok('the triangle says what planning bought and cost')

{
  // Nothing measured: the block still exists (so a reader can tell "no planner
  // in this chain" from "a planner nobody measured") and its rates are null.
  const t = campaignTriangle([round({ n: 1, planMs: undefined, planTimedOut: undefined })])
  assert.equal(t.planning.rounds, 0, 'no measured rounds')
  assert.equal(t.planning.ms, 0, 'nothing spent as far as the ledger knows')
  assert.equal(t.planning.meanMs, null, 'a mean with no denominator is unknown, not zero')
  assert.equal(t.planning.timedOutRate, null, 'and so is the timeout rate')
  assert.equal(t.planning.promotedWhenTimedOut.rate, null, 'no timed-out rounds: unknown, not 0%')
  assert.equal(t.planning.promotedWhenTimedOut.rounds, 0, 'the empty count is still a count')
}
ok('unmeasured planning stays unknown instead of becoming zero')

{
  assert.doesNotThrow(() => campaignTriangle([]), 'an empty ledger is not a crash')
  const t = campaignTriangle([])
  assert.equal(t.planning.rounds, 0, 'with no rounds there is nothing to measure')
  assert.equal(t.planning.promotedWhenPlanned.rounds, 0, 'and both halves are empty, not missing')
}
ok('an empty campaign is tolerated')

console.log(`\n${pass}/${pass} passed`)
