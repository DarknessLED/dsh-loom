// The two deadlines were set by feel and then measured against the wrong thing.
//
// The attempt cap is ten minutes. Of the 420 attempts in the ledger, 24 died in
// the 600-605 s band -- pinned against the cap, not against the work -- while the
// 570-600 s band holds exactly one. A cap that 24 attempts pile up on and one
// attempt approaches is a checkpoint in the code, not a percentile of the task, so
// widening it costs only the failures it was manufacturing. Successful attempts
// have p95 = 659 s, so 780 s puts the cap above the tail instead of inside it.
//
// The planning cap goes the other way. Planning is reconnaissance: a planner that
// has not named its files in three minutes is wandering, and the ledger's healthy
// plans finish well inside it. The old four-minute ceiling was never even enforced
// (see tests/lifecycle/deadline-covers-setup.test.mjs); now that it is, it should
// be a number the round can afford.
//
// These are defaults, not laws: a campaign states its own. The value of pinning
// them is that the reasoning survives the next person who tunes them by feel.
import assert from 'node:assert/strict'

import { DEFAULT_CONFIG, normalizeConfig } from '../../src/core/config.js'
import { planBudgetMs } from '../../src/runtime/plan-budget.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

// 1. An attempt gets longer than the tail of the attempts that succeeded.
{
  assert.equal(DEFAULT_CONFIG.session.attemptTimeoutMs, 780_000, 'the attempt cap clears the measured tail')
  // The cap has to be above the point where real attempts pile up (600 s) and
  // below the point where waiting stops being cheaper than a retry (900 s).
  assert.ok(DEFAULT_CONFIG.session.attemptTimeoutMs > 600_000, 'past the checkpoint attempts were dying on')
  assert.ok(DEFAULT_CONFIG.session.attemptTimeoutMs <= 900_000, 'still inside a round the budget can afford')
  ok('an attempt is allowed to finish the work a healthy one does')
}

// 2. Planning is bounded more tightly than an attempt, and by a number the round
//    can actually spend on reconnaissance.
{
  assert.equal(DEFAULT_CONFIG.session.planTimeoutMs, 180_000, 'planning gets three minutes, not four')
  assert.ok(DEFAULT_CONFIG.session.planTimeoutMs < DEFAULT_CONFIG.session.attemptTimeoutMs, 'planning is cheaper than work')
  // A planner that keeps timing out has its budget halved rather than zeroed: a
  // campaign still gets reconnaissance, just cheaper.
  const learned = planBudgetMs([], { ceiling: DEFAULT_CONFIG.session.planTimeoutMs })
  assert.ok(learned > 0 && learned <= DEFAULT_CONFIG.session.planTimeoutMs, 'the learned budget stays inside the ceiling')
  ok('planning is bounded by a number the round can spend')
}

// 3. A campaign can still say otherwise, and the normalized config keeps it.
{
  const custom = normalizeConfig({ session: { attemptTimeoutMs: 300_000, planTimeoutMs: 90_000 } })
  assert.equal(custom.session.attemptTimeoutMs, 300_000)
  assert.equal(custom.session.planTimeoutMs, 90_000)
  const untouched = normalizeConfig({})
  assert.equal(untouched.session.attemptTimeoutMs, 780_000, 'the default survives normalization')
  ok('the defaults are defaults, not laws')
}

clearInterval()
console.log(`\n${pass}/3 passed`)
assert.equal(pass, 3)
