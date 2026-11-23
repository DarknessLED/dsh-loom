// Halving that keeps its savings is a screen; halving that keeps the same
// budget is a prefilter, and the difference has to be written down.
//
// What we do today: screen all candidates, keep `keepRatio` of them, run the
// real attempt on the survivors, and spend the rest of the round's ceiling on
// whatever the survivors ask for — that is, the budget freed by dropping a
// candidate is *not* returned to anybody. Successive halving would return it
// (more attempts on the survivors, a higher rung for the winner), so calling
// what we do "successive halving" is a naming error that flatters the result.
//
// `halvingPlan` makes the schedule explicit — η and the rungs are parameters,
// not constants hidden in `keepRatio` — and prices every rung, so a round can
// say what it dropped and where that money went. When nothing is returned the
// plan says `kind: 'prefilter'` instead of pretending.
import assert from 'node:assert/strict'
import { halvingPlan } from '../../src/runtime/halving.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// Four candidates, η = 2: 4 → 2 → 1. The last rung is the ordinary gate, so it
// is not a screening stage and does not appear as one.
const plan = halvingPlan({ candidates: 4, eta: 2, maxUsd: 0.4 })
assert.deepEqual(plan.rungs.map((r) => r.keep), [4, 2, 1])
assert.deepEqual(plan.rungs.map((r) => r.drop), [0, 2, 1])
assert.equal(plan.eta, 2)
assert.equal(plan.candidates, 4)
ok('a plan is a ladder of rungs, not a single cut')

// Every rung above the last is paid for. The money a rung frees is the shares of
// the candidates it dropped, and that number is the whole point: with no
// reallocation the plan must report zero returned.
assert.ok(plan.rungs[0].costUsd > 0, 'the first rung costs something')
assert.ok(plan.rungs[1].costUsd <= plan.rungs[0].costUsd, 'a later rung cannot cost more per candidate than the first')
const freed = plan.rungs[1].freedUsd
assert.ok(freed > 0, 'dropping two of four candidates frees their share of the ceiling')
assert.equal(plan.returnedUsd, 0, 'nothing is handed back to the survivors today, and the plan says so')
assert.equal(plan.kind, 'prefilter', 'a plan that returns nothing is a prefilter, not successive halving')
ok('the plan prices what it dropped and admits it keeps the money')

// η is a parameter. η = 3 on nine candidates is 9 → 3 → 1, and a plan that
// cannot halve down to one still says what it will run.
const wide = halvingPlan({ candidates: 9, eta: 3, maxUsd: 0.9 })
assert.deepEqual(wide.rungs.map((r) => r.keep), [9, 3, 1])
const single = halvingPlan({ candidates: 1, eta: 2, maxUsd: 0.5 })
assert.equal(single.rungs.length, 1, 'one candidate has one rung and no screening')
assert.equal(single.kind, 'none', 'and it is not a prefilter: there is nothing to prefilter')
ok('the schedule follows eta rather than a hard-coded half')

// A ceiling of zero must not produce negative or NaN prices: a campaign without
// a budget still runs, it just cannot report a saving.
const free = halvingPlan({ candidates: 4, eta: 2, maxUsd: 0 })
assert.ok(free.rungs.every((r) => Number.isFinite(r.costUsd) && r.costUsd >= 0))
assert.equal(free.rungs[1].freedUsd, 0)
assert.equal(free.kind, 'none', 'with nothing to spend there is no schedule worth naming')
ok('a zero ceiling is priced at zero instead of producing nonsense')

// The share a rung keeps is what actually happens in a round: the plan is a
// declaration, and `keepRatio` remains the knob the round reads.
const ratio = halvingPlan({ candidates: 4, eta: 2, maxUsd: 0.4, keepRatio: 0.75 })
assert.equal(ratio.rungs[1].keep, 3, 'an explicit keepRatio overrides the eta-derived count')
ok('an explicit ratio wins over the derived schedule')
