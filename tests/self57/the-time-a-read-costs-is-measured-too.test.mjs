// The cost axis shipped with a structural bias: the reading arm's money is
// recorded as zero.
//
// Measured 2026-11-26 on `trial-agg`: `research.costUsd` was 0 on every one of
// the ten rounds, because the web capability is not in the pricing table that
// `pricingFor` reads. So the money comparison was comparing six rounds that cost
// money plus a free search against four rounds that cost money -- it can only
// ever understate reading, and it will do so on every campaign.
//
// The leg does report what it actually spent in the one currency it can measure:
// wall clock. `research.ms` was 4836, 13507, 17345 and 31098 on the four rounds
// that read, against a round that takes 47,628-79,935 ms in total. That is six to
// thirty per cent of a round, invisible in the money axis and completely
// unmeasured by it.
//
// So the cost comparison gets a second metric: read time per round. Same
// discipline -- interval, floor, refusal to name a direction from overlap -- and
// the same refusal to treat a missing measurement as zero.
//
//   node tests/self57/the-time-a-read-costs-is-measured-too.test.mjs
import assert from 'node:assert/strict'

import { compareArmMetric, compareResearchArms } from '../../src/loop/research-trial.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const round = (arm, ms) => ({
  n: 1,
  status: 'promoted',
  promoted: true,
  score: 1,
  scoreSource: 'killRate',
  costUsd: 0.01,
  research: ms == null ? { mode: arm === 'off' ? 'off' : 'full' } : { mode: 'full', ms },
  researchTrial: { arm },
})

const readMs = (r) => (r.research && Number.isFinite(r.research.ms) ? r.research.ms : null)

ok('reading that spends more wall clock is named as spending more', () => {
  const full = [round('full', 30000), round('full', 28000), round('full', 31000), round('full', 29000)]
  const off = [round('off', 100), round('off', 120), round('off', 90), round('off', 110)]
  const cmp = compareArmMetric({ full, off, pick: readMs, basis: 'read time per round' })
  assert.equal(cmp.verdict, 'reading-costs-more')
  assert.ok(cmp.delta > 28000)
  assert.equal(cmp.basis, 'read time per round')
})

ok('both arms at zero is not a difference', () => {
  const full = [round('full', 0), round('full', 0), round('full', 0), round('full', 0)]
  const off = [round('off', 0), round('off', 0), round('off', 0), round('off', 0)]
  const cmp = compareArmMetric({ full, off, pick: readMs, basis: 'read time per round' })
  assert.equal(cmp.verdict, 'cannot-distinguish')
})

ok('a round that recorded no time at all is missing, not zero', () => {
  // The `off` arm never buys a leg, so it records no `ms`. Counting those as
  // zero would make "not reading" look infinitely cheap and hand the comparison
  // a direction it did not earn.
  const full = [round('full', 20000), round('full', 22000)]
  const off = [round('off', null), round('off', null)]
  assert.equal(compareArmMetric({ full, off, pick: readMs, basis: 'read time per round' }), null)
})

ok('the missing side is reported, not silently dropped', () => {
  const full = [round('full', 20000), round('full', 22000), round('full', 21000)]
  const off = [round('off', null), round('off', 0), round('off', 0)]
  const cmp = compareArmMetric({ full, off, pick: readMs, basis: 'read time per round' })
  assert.equal(cmp.arms.off.n, 2, 'the off arm has two measured zeros, which is a real price')
  assert.equal(cmp.arms.full.n, 3)
})

ok('the trial carries the time axis next to money', () => {
  const full = [round('full', 30000), round('full', 28000), round('full', 31000)]
  const off = [round('off', 0), round('off', 0), round('off', 0)]
  const cmp = compareResearchArms({ rounds: [...full, ...off] })
  assert.ok(cmp.cost, 'money axis')
  assert.ok(cmp.time, 'time axis')
  assert.equal(cmp.time.verdict, 'reading-costs-more')
})

ok('the money axis keeps its own name when time is decided', () => {
  const rounds = [
    { ...round('full', 30000), costUsd: 0.02 },
    { ...round('full', 28000), costUsd: 0.021 },
    { ...round('full', 31000), costUsd: 0.019 },
    { ...round('off', 0), costUsd: 0.01 },
    { ...round('off', 0), costUsd: 0.0101 },
    { ...round('off', 0), costUsd: 0.0099 },
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.cost.verdict, 'reading-costs-more')
  assert.equal(cmp.time.verdict, 'reading-costs-more')
  assert.notEqual(cmp.cost.basis, cmp.time.basis, 'two axes must not answer under one label')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
