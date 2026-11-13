// L1 runs without a person, and that is a visible default rather than a call
// site nobody reads.
//
// The goal asks the loop to stop asking a human about every promotion: 60 of 60
// checkpoints were answered anyway, median wait 22 minutes, longest 76 hours --
// a queue, not a review. The person's decision point moves up to L2 (adopting a
// chain version), and a chain that genuinely wants a reviewer per round says so
// in its human node, which outranks the default.
//
// The failure this pins is duller than it sounds: the default used to be
// "absent" (`config.loopPolicy.autoApply` was never in DEFAULT_CONFIG, so the
// call site's `|| false` decided it). A default that lives only at its call site
// cannot be found by reading the config table -- the same shape as
// `checkpoint.window` living in round.js until it was put in the table.
import assert from 'node:assert/strict'

import { DEFAULT_CONFIG, normalizeConfig } from '../src/core/config.js'
import { humanGate } from '../src/runtime/round.js'

let pass = 0
const ok = (name, cond, detail) => {
  assert.equal(cond, true, `${name}${detail ? ` :: ${detail}` : ''}`)
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

ok('the config table says L1 applies promotions without asking', DEFAULT_CONFIG.loopPolicy.autoApply === true, String(DEFAULT_CONFIG.loopPolicy.autoApply))
ok('the default survives normalization', normalizeConfig({}).loopPolicy.autoApply === true)
ok('an install can still turn it off', normalizeConfig({ loopPolicy: { autoApply: false } }).loopPolicy.autoApply === false)
ok('turning it off does not disturb the rest of loopPolicy', normalizeConfig({ loopPolicy: { autoApply: false } }).loopPolicy.humanGate === true)

// humanGate takes the active chain spec, not the campaign's chain block.
const chain = (when) => ({ name: 'quick', version: 1, nodes: [{ id: 'work', type: 'agent' }, { id: 'h', type: 'human', name: 'review', when }] })
ok('a human node saying always is reported as such', humanGate(chain('always'))?.when === 'always')
ok('a human node saying never is reported as such', humanGate(chain('never'))?.when === 'never')
ok('a chain with no human node reports none', humanGate({ nodes: [{ id: 'work', type: 'agent' }] }) === null)
ok('no human node is not the same thing as always', humanGate(chain(undefined))?.when !== 'always')

console.log(`\nok - l1-unattended ${pass}/${pass}`)
