// The planner is bought before anything else can succeed, and then nothing reads
// whether it delivered.
//
// `planUsable` was written on every round and consulted by exactly one consumer:
// the triangle's counter. `planModeFor` decided "plan or not" from timeouts and
// wins only, so a planner could hand back an empty transcript for round after
// round at 118 s a turn and the next round would buy another one at the same
// price. The ledger says this is not hypothetical: of 132 planned rounds, 85 got
// no text back, and 24 % of the campaign's wall clock went into the plan stage.
//
// Rule: a plan that names nothing is evidence against planning, and it counts the
// same way a timed-out plan does -- `planModeFor` turns planning off once the last
// two rounds both failed to produce a usable plan, whether they failed by timing
// out or by answering with nothing. A mixed record (one empty, one usable) is not
// a pattern. An explicit `planMode` still outranks the record.
import assert from 'node:assert/strict'
import { planModeFor } from '../../src/runtime/round.js'

let pass = 0
const ok = (n) => {
  pass += 1
  console.log('ok ' + n)
}

// A round that planned and won, with a plan that named files.
const good = (n) => ({ n, promoted: true, planTimedOut: false, planUsable: true })
// A round that planned and won, but the planner handed back nothing.
const emptyPlanWin = (n) => ({ n, promoted: true, planTimedOut: false, planUsable: false })
// A round that planned, timed out, and still won.
const timeoutWin = (n) => ({ n, promoted: true, planTimedOut: true, planUsable: false })

// 1. Two rounds that won while the planner produced nothing is the same evidence
//    as two rounds that won while the planner timed out: planning is not
//    load-bearing here, so stop paying for it.
{
  assert.equal(planModeFor([emptyPlanWin(1), emptyPlanWin(2)], { planMode: 'auto' }), 'off')
  ok('two empty plans in a row stop the buying')
}

// 2. Two timeouts keep behaving as they did: the behaviour that already existed
//    must not regress while the new case is added.
{
  assert.equal(planModeFor([timeoutWin(1), timeoutWin(2)], { planMode: 'auto' }), 'off')
  ok('two timed-out plans still stop the buying')
}

// 3. An empty plan followed by a usable one is a bad day, not a pattern. Turning
//    planning off on mixed evidence would defund a step that just worked.
{
  assert.equal(planModeFor([emptyPlanWin(1), good(2)], { planMode: 'auto' }), 'full')
  assert.equal(planModeFor([good(1), emptyPlanWin(2)], { planMode: 'auto' }), 'full')
  ok('one empty plan among usable ones is not a pattern')
}

// 4. A round that lost proves nothing about planning: the loss may be because
//    nobody followed the plan. Only rounds that won *despite* the planner are
//    evidence, and that rule holds for the empty case too.
{
  assert.equal(
    planModeFor(
      [
        { n: 1, promoted: false, planTimedOut: false, planUsable: false },
        { n: 2, promoted: false, planTimedOut: false, planUsable: false },
      ],
      { planMode: 'auto' },
    ),
    'full',
  )
  ok('losing rounds do not defund planning')
}

// 5. An explicit mode always wins over the record, and a ledger too short to have
//    a pattern keeps planning on.
{
  assert.equal(planModeFor([emptyPlanWin(1), emptyPlanWin(2)], { planMode: 'full' }), 'full')
  assert.equal(planModeFor([emptyPlanWin(1), emptyPlanWin(2)], { planMode: 'off' }), 'off')
  assert.equal(planModeFor([emptyPlanWin(1)], { planMode: 'auto' }), 'full')
  ok('explicit modes and short histories keep their meaning')
}

// 6. A round recorded before `planUsable` existed cannot say the plan was empty.
//    Reading absence as failure would silently defund planning on every old
//    ledger, which is the same conflation the diagnostics script was fixed for.
{
  const old = (n) => ({ n, promoted: true, planTimedOut: false })
  assert.equal(planModeFor([old(1), old(2)], { planMode: 'auto' }), 'full')
  assert.equal(
    planModeFor([{ n: 1, promoted: true, planTimedOut: true }, { n: 2, promoted: true, planTimedOut: true }], {
      planMode: 'auto',
    }),
    'off',
  )
  ok('an unrecorded plan outcome is not an empty plan')
}

console.log(`\n${pass}/6 passed`)
assert.equal(pass, 6)
