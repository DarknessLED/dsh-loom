// The operator surface for the second-candidate instruction.
//
// T3 ran into this: `src/runtime/round.js` advertises `loopPolicy.secondCandidate:
// 'always'` as "an instruction the statistics may never overrule", but no
// campaign-level surface could set it — `rsi_control policy` rejected the key.
// A knob only a shipped config file can turn is not an operator knob.

import assert from 'node:assert/strict'
import test from 'node:test'

import { validatePolicyOverride, effectivePolicy, normalizePolicy, POLICY_FIELDS } from '../../src/loop/policy.js'

test('a campaign may pin the second candidate, and only to a real mode', () => {
  assert.ok(POLICY_FIELDS.includes('secondCandidate'), 'the field is part of the audited policy')
  assert.deepEqual(validatePolicyOverride({ secondCandidate: 'always' }), { secondCandidate: 'always' })
  assert.deepEqual(validatePolicyOverride({ secondCandidate: 'auto' }), { secondCandidate: 'auto' })
  assert.throws(() => validatePolicyOverride({ secondCandidate: 'sometimes' }), /invalid policy\.secondCandidate/)
})

test('the campaign override outranks the install config, and the default stays "price it"', () => {
  const config = { loopPolicy: { secondCandidate: 'auto' } }
  const state = { policy: { secondCandidate: 'always' } }
  assert.equal(effectivePolicy({ state, config }).secondCandidate, 'always')
  assert.equal(effectivePolicy({ config }).secondCandidate, 'auto')
  assert.equal(effectivePolicy({ config: {} }).secondCandidate, null, 'no setting means the gate prices it')
  assert.equal(normalizePolicy({}).secondCandidate, null)
})
