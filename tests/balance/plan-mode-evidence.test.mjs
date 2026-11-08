// `planMode:auto` currently turns planning off after two rounds that *timed out*.
// But a timed-out plan in a round that then LOST proves nothing: the round may have
// lost precisely because nobody finished planning it.
//
// The only rounds that prove planning is not load-bearing are the ones that won
// while the planner never finished. So `auto` must require both facts:
//
//   planTimedOut === true  AND  the round was promoted
//
// Everything else keeps the plan. Unknown is not evidence, and neither is failure.
import assert from 'node:assert/strict'

import { planModeFor } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const round = (n, status, planTimedOut) => ({ n, status, planTimedOut, promoted: status === 'promoted' })

// Two rounds won even though planning never finished: planning is not paying off.
{
  const rounds = [round(1, 'promoted', true), round(2, 'promoted', true)]
  assert.equal(planModeFor(rounds, { planMode: 'auto' }), 'off', 'won-despite-timeout twice is evidence against planning')
  ok('two wins without a finished plan switch planning off')
}

// The same two timeouts, but the rounds lost: the plan cannot be blamed, so keep it.
{
  const rounds = [round(1, 'no-gain', true), round(2, 'no-gain', true)]
  assert.equal(planModeFor(rounds, { planMode: 'auto' }), 'full', 'a timed-out plan in a losing round proves nothing')
  ok('timeouts in rounds that lost are not evidence')
}

// A finished plan is still not evidence against planning, however the round ended.
{
  const rounds = [round(1, 'promoted', false), round(2, 'promoted', false)]
  assert.equal(planModeFor(rounds, { planMode: 'auto' }), 'full', 'planning finished and the round won')
  ok('a plan that finished is never evidence against planning')
}

// One win and one loss is not a pattern.
{
  const rounds = [round(1, 'promoted', true), round(2, 'no-gain', true)]
  assert.equal(planModeFor(rounds, { planMode: 'auto' }), 'full', 'mixed outcomes do not justify switching off')
  ok('a mixed record keeps the plan')
}

// No history at all: do not gamble.
{
  assert.equal(planModeFor([], { planMode: 'auto' }), 'full', 'no history is not evidence')
  assert.equal(planModeFor([round(1, 'promoted', true)], { planMode: 'auto' }), 'full', 'one round is not a pattern')
  ok('nothing known yet means planning stays on')
}

// Explicit policy always wins, including against the evidence.
{
  const rounds = [round(1, 'promoted', true), round(2, 'promoted', true)]
  assert.equal(planModeFor(rounds, { planMode: 'full' }), 'full', 'the operator asked for a plan')
  assert.equal(planModeFor(rounds, { planMode: 'off' }), 'off', 'the operator asked for none')
  ok('an explicit planMode is never overruled by the record')
}

console.log(`\n${pass}/${pass} passed`)
