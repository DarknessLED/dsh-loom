// Defaults are the product. A new user does not read config.js; they run one
// campaign and form an opinion from what it did.
//
// Two defaults are wrong for that first run: planning is bought unconditionally
// (`planMode: 'full'`) even though it costs 17-44% of every round and has timed
// out at 240s on most small-change tasks we measured; and an exhausted provider
// budget raises no checkpoint, so a campaign can stop for lack of models and
// leave nothing on the record that says why.
//
// So: start opinionated, let evidence move it. `auto` plans until the record says
// planning has twice timed out on rounds that WON - never on a loss, and never
// without history.
import assert from 'node:assert/strict'

import { DEFAULT_CONFIG, normalizeConfig } from '../../src/core/config.js'
import { planModeFor } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

assert.equal(DEFAULT_CONFIG.loopPolicy.planMode, 'auto', 'the default buys planning until the record says otherwise')
assert.equal(planModeFor([], DEFAULT_CONFIG.loopPolicy), 'full', 'no history is not a reason to skip planning')
assert.equal(
  planModeFor(
    [
      { n: 1, status: 'promoted', promoted: true, planTimedOut: true },
      { n: 2, status: 'promoted', promoted: true, planTimedOut: true },
    ],
    DEFAULT_CONFIG.loopPolicy,
  ),
  'off',
  'and the record can turn it off',
)
ok('the default plans, and evidence can stop it')

for (const kind of ['gate', 'budget_50', 'anomaly', 'plateau', 'holdout', 'stuck', 'exhausted']) {
  assert.equal(DEFAULT_CONFIG.checkpoint.on.includes(kind), true, `a new user is told about ${kind}`)
}
ok('a campaign that runs out of models raises a checkpoint a new user will see')

const explicit = normalizeConfig({ loopPolicy: { planMode: 'off' } })
assert.equal(explicit.loopPolicy.planMode, 'off', 'an explicit policy still wins over the default')
const bare = normalizeConfig({})
assert.equal(bare.loopPolicy.planMode, 'auto')
assert.equal(bare.loopPolicy.replayOnly, DEFAULT_CONFIG.loopPolicy.replayOnly, 'normalizing keeps the rest of the section')
ok('an explicit planMode is not overwritten when config is normalized')

console.log(`\n${pass}/${pass} passed`)
