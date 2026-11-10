// A campaign that stopped buying plans must not buy them again just because the
// round it skipped planning in went fine.
//
// `planModeFor` reads the last two rounds. A round that ran with planning switched
// off records `planMode: 'off'`, `planMs: 0` and no `planTimedOut`/`planUsable` —
// none of which looks "wasted". So the very round that proves the loop can work
// without a plan is the one that flips the decision back, and the campaign pays a
// planner every other round for as long as it runs. Measured here: the rule fired
// exactly once (loom-ui8 r3) out of 66 campaigns, and the next round would have
// reverted to `full`.
//
// The rule this pins: once planning is off, it stays off while the unplanned
// rounds keep landing, and one unplanned round that fails is enough to buy a plan
// again — planning comes back when there is something to plan for.

import assert from 'node:assert/strict'
import { planModeFor } from 'file:///C:/Projects/RSI/src/runtime/round.js'

let pass = 0
function ok(name, cond = true, detail) {
  if (cond) {
    pass += 1
    console.log('ok  ', name)
  } else {
    console.log('FAIL', name, detail === undefined ? '' : detail)
    process.exitCode = 1
  }
}

const wastedWon = (n) => ({
  n,
  status: 'promoted',
  promoted: true,
  planMode: 'full',
  planMs: 180_000,
  planTimedOut: true,
  planUsable: false,
})
const plannedWon = (n) => ({
  n,
  status: 'promoted',
  promoted: true,
  planMode: 'full',
  planMs: 30_000,
  planTimedOut: false,
  planUsable: true,
})
const unplanned = (n, { promoted = true } = {}) => ({
  n,
  status: promoted ? 'promoted' : 'no-gain',
  promoted,
  planMode: 'off',
  planMs: 0,
  planTimedOut: false,
  planUsable: null,
})

const auto = { planMode: 'auto' }

// 0. Explicit modes are still obeyed verbatim.
ok('an explicit off stays off', planModeFor([], { planMode: 'off' }) === 'off')
ok('an explicit full stays full', planModeFor([wastedWon(1), wastedWon(2)], { planMode: 'full' }) === 'full')

// 1. The existing trigger still fires: two wasted plans that both still won.
ok(
  'two wasted wins turn planning off',
  planModeFor([wastedWon(1), wastedWon(2)], auto) === 'off',
  planModeFor([wastedWon(1), wastedWon(2)], auto),
)
ok(
  'a wasted plan that lost is not evidence planning is worthless',
  planModeFor([wastedWon(1), { ...wastedWon(2), status: 'no-gain', promoted: false }], auto) === 'full',
)
ok(
  'one wasted win alone does not turn planning off',
  planModeFor([plannedWon(1), wastedWon(2)], auto) === 'full',
)

// 2. The decision survives the round that was run without a plan.
{
  const history = [wastedWon(1), wastedWon(2), unplanned(3)]
  ok('a winning unplanned round does not re-buy planning', planModeFor(history, auto) === 'off', planModeFor(history, auto))
}
{
  const history = [wastedWon(1), wastedWon(2), unplanned(3), unplanned(4), unplanned(5)]
  ok('and it keeps holding while they keep landing', planModeFor(history, auto) === 'off', planModeFor(history, auto))
}

// 3. Something finally failing is a reason to plan again.
{
  const history = [wastedWon(1), wastedWon(2), unplanned(3), unplanned(4, { promoted: false })]
  ok('an unplanned round that failed buys a plan back', planModeFor(history, auto) === 'full', planModeFor(history, auto))
}
{
  // ...but only once: after planning resumes and still wastes its window on a
  // win, the two-round trigger has to be able to fire again.
  const history = [wastedWon(1), wastedWon(2), unplanned(3), unplanned(4, { promoted: false }), wastedWon(5), wastedWon(6)]
  ok('the trigger can fire again after planning resumed', planModeFor(history, auto) === 'off', planModeFor(history, auto))
}

// 4. A ledger that never planned at all is not "off by evidence".
ok('no history means full', planModeFor([], auto) === 'full')
ok('one round means full', planModeFor([wastedWon(1)], auto) === 'full')

// 5. Ledgers from before `promoted` existed keep the win-blind rule they were
// judged by: absence of the field must not be read as a loss.
{
  const legacy = (n) => ({ n, status: 'no-gain', planMs: 180_000, planTimedOut: true })
  ok('legacy rounds still use the win-blind rule', planModeFor([legacy(1), legacy(2)], auto) === 'off')
}

console.log(`\n${pass} passed`)
assert.ok(pass > 0)
