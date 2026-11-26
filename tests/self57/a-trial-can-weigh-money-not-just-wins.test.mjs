// The trial can only see promotions, and ten rounds of the last probe promoted
// every single round on both arms.
//
// Measured 2026-11-26 on campaign `trial-agg` (12 derived integers per task,
// the hardest endpoint this series has): 10 rounds, 6 reading and 4 not, every
// one promoted with score 1.0000. `compareResearchArms` reported
// `cannot-distinguish` for both readings -- the count because both arms were
// 100%, and the mean score because both arms had zero variance. Its own sentence
// said it: "every round in both arms scored the same: the endpoint did not move,
// so there is no effect size to estimate."
//
// So in this regime the trial is blind, and it is blind in the one direction a
// person cares about. The rounds do still differ in what they cost: $0.0106 a
// round when reading, $0.0100 when not, over the same 10 rounds -- the reading
// arm paid about six tenths of a cent a round and bought nothing visible.
//
// "Bought nothing" is exactly the claim the trial cannot currently make, because
// it only ever compares outcomes. Money is the other half of the balance the
// round is supposed to strike, and it is measurable whether or not the endpoint
// saturates. This spec adds the second axis: cost per round, with the same
// honesty the score axis has (an interval, a floor, and the refusal to call
// overlap a finding).
//
//   node tests/self57/a-trial-can-weigh-money-not-just-wins.test.mjs
import assert from 'node:assert/strict'

import { compareArmCost, compareResearchArms } from '../../src/loop/research-trial.js'

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

const round = (arm, costUsd, score = 1) => ({
  n: 1,
  status: 'promoted',
  promoted: true,
  score,
  scoreSource: 'killRate',
  costUsd,
  researchTrial: { arm },
})

ok('reading that costs more per round is named as costing more', () => {
  const full = [round('full', 0.02), round('full', 0.021), round('full', 0.019), round('full', 0.0205)]
  const off = [round('off', 0.01), round('off', 0.0101), round('off', 0.0099), round('off', 0.01)]
  const cmp = compareArmCost({ full, off })
  assert.equal(cmp.verdict, 'reading-costs-more')
  assert.ok(cmp.delta > 0.009 && cmp.delta < 0.011, `delta was ${cmp.delta}`)
  assert.ok(cmp.interval.low > 0, 'the interval must exclude zero before a direction is named')
  assert.match(cmp.sentence, /reading/i)
  assert.match(cmp.sentence, /per round/i)
})

ok('two arms that cost the same are not called different', () => {
  const full = [round('full', 0.01), round('full', 0.012), round('full', 0.008), round('full', 0.011)]
  const off = [round('off', 0.0105), round('off', 0.0095), round('off', 0.0115), round('off', 0.0085)]
  const cmp = compareArmCost({ full, off })
  assert.equal(cmp.verdict, 'cannot-distinguish')
  assert.ok(cmp.interval.low < 0 && cmp.interval.high > 0, 'overlapping intervals cannot name a direction')
  assert.match(cmp.sentence, /cannot tell|below|overlap/i)
})

ok('a cheaper reading arm is a finding too, in the other direction', () => {
  const full = [round('full', 0.005), round('full', 0.0051), round('full', 0.0049)]
  const off = [round('off', 0.02), round('off', 0.0201), round('off', 0.0199)]
  const cmp = compareArmCost({ full, off })
  assert.equal(cmp.verdict, 'reading-costs-less')
  assert.ok(cmp.delta < 0)
})

ok('one round in an arm is not a cost comparison', () => {
  const cmp = compareArmCost({ full: [round('full', 0.02)], off: [round('off', 0.01), round('off', 0.01)] })
  assert.equal(cmp, null, 'a single round has no spread, so it cannot support an interval')
})

ok('a round that never recorded a cost is not a zero', () => {
  const full = [round('full', 0.02), round('full', null), round('full', 0.021), round('full', 0.019)]
  const off = [round('off', 0.01), round('off', 0.0101), round('off', 0.0099), round('off', 0.01)]
  const cmp = compareArmCost({ full, off })
  assert.equal(cmp.arms.full.n, 3, 'a null cost is a missing measurement, not a free round')
  assert.equal(cmp.arms.off.n, 4)
})

ok('the trial reports both axes, and says which one is talking', () => {
  const rounds = [
    round('full', 0.02), round('full', 0.021), round('full', 0.019),
    round('off', 0.01), round('off', 0.0101), round('off', 0.0099),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.ok(cmp.cost, 'the trial must carry the cost axis alongside the count')
  assert.equal(cmp.cost.verdict, 'reading-costs-more')
  // The score axis is blind here (every round scored the same), so the sentence
  // a person reads has to be the cost sentence rather than "no effect size".
  assert.match(cmp.sentence, /cost|per round/i)
})

ok('when both axes are blind, the sentence still shows the price', () => {
  // The live `trial-agg` case: every round promoted at score 1.0 and the cost
  // difference is inside the noise. Neither axis can name a direction, and a
  // reader still needs the two prices -- "cannot tell" about a question nobody
  // printed the numbers for is not a measurement, it is a shrug.
  const rounds = [
    round('full', 0.02), round('full', 0.019), round('full', 0.021),
    round('off', 0.0195), round('off', 0.0205), round('off', 0.0201),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.verdict, 'cannot-distinguish')
  assert.equal(cmp.cost.verdict, 'cannot-distinguish')
  assert.match(cmp.sentence, /per round|a round/i, 'the blindness sentence must print what each arm cost')
})

ok('the cost sentence does not overrule a decided score finding', () => {
  const rounds = [
    { ...round('full', 0.02, 0.9), scoreSource: 'killRate' },
    { ...round('full', 0.02, 0.9), scoreSource: 'killRate' },
    { ...round('full', 0.02, 0.9), scoreSource: 'killRate' },
    { ...round('off', 0.01, 0.2), scoreSource: 'killRate' },
    { ...round('off', 0.01, 0.2), scoreSource: 'killRate' },
    { ...round('off', 0.01, 0.05), scoreSource: 'killRate' },
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.verdict, 'full-better', 'a decided outcome still wins the headline')
  assert.ok(cmp.cost, 'and the cost axis is still reported beside it')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
