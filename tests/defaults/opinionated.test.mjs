// Defaults are the product. A new user does not read config.js; they run one
// campaign and form an opinion from what it did.
//
// Planning used to be bought by default (`'full'`, then `'auto'`) because it looked
// like the cheap way to give a worker a place to start. The measurement moved it:
// on four mutation tasks the planner moved no endpoint and spent 580 s of 2,289 s
// of round clock (25.3%), and 36 of 195 planner runs across the corpus aborted
// having returned nothing. On 2026-11-14 the operator asked for the other order:
// off by default, switchable from the workbench, and "add planning" available in
// a conversation. `'auto'` is still supported for an install that wants the
// ledger to decide -- the history rule below is unchanged.
//
// The second default this file guards is unchanged: an exhausted provider budget
// raises a checkpoint, so a campaign that stops for lack of models says why.
import assert from 'node:assert/strict'

import { DEFAULT_CONFIG, normalizeConfig } from '../../src/core/config.js'
import { planModeFor } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

assert.equal(DEFAULT_CONFIG.loopPolicy.planMode, 'off', 'the default does not buy planning')
assert.equal(planModeFor([], DEFAULT_CONFIG.loopPolicy), 'off', 'and a fresh campaign does not plan either')
assert.equal(
  planModeFor(
    [
      { n: 1, status: 'promoted', promoted: true, planTimedOut: true },
      { n: 2, status: 'promoted', promoted: true, planTimedOut: true },
    ],
    { planMode: 'auto' },
  ),
  'off',
  'an install that chose auto can still let the record turn it off',
)
ok('the default does not plan, and an install that opts into auto keeps the history rule')

for (const kind of ['gate', 'budget_50', 'anomaly', 'plateau', 'holdout', 'stuck', 'exhausted']) {
  assert.equal(DEFAULT_CONFIG.checkpoint.on.includes(kind), true, `a new user is told about ${kind}`)
}
ok('a campaign that runs out of models raises a checkpoint a new user will see')

const explicit = normalizeConfig({ loopPolicy: { planMode: 'off' } })
assert.equal(explicit.loopPolicy.planMode, 'off', 'an explicit policy still wins over the default')
const bare = normalizeConfig({})
assert.equal(bare.loopPolicy.planMode, 'off')
assert.equal(bare.loopPolicy.replayOnly, DEFAULT_CONFIG.loopPolicy.replayOnly, 'normalizing keeps the rest of the section')
ok('an explicit planMode is not overwritten when config is normalized')

console.log(`\n${pass}/${pass} passed`)
