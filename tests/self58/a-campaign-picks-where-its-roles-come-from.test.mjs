// A campaign can pick where its role list comes from, for the same reason it can
// pick whether to execute arms: the two answers must be comparable inside one
// install without editing the install.
import test from 'node:test'
import assert from 'node:assert/strict'

import { effectivePolicy, normalizePolicy, validatePolicyOverride } from '../../src/loop/policy.js'

test('static is the default, and the other word is ssf', () => {
  assert.equal(normalizePolicy({}).planSource, 'static')
  assert.equal(validatePolicyOverride({ planSource: 'ssf' }).planSource, 'ssf')
  assert.equal(validatePolicyOverride({ planSource: 'static' }).planSource, 'static')
  assert.throws(() => validatePolicyOverride({ planSource: 'dynamic' }), /invalid policy\.planSource/)
})

test('the install can set it, and a campaign can overrule the install', () => {
  const config = { session: { dispatch: { planSource: 'ssf' } } }
  assert.equal(effectivePolicy({ state: {}, config }).planSource, 'ssf')

  const campaign = { policy: { planSource: 'static' } }
  assert.equal(effectivePolicy({ state: campaign, config }).planSource, 'static')
})

test('a word that is not a plan source never reaches a round', () => {
  const config = { session: { dispatch: { planSource: 'sometimes' } } }
  assert.equal(effectivePolicy({ state: {}, config }).planSource, 'static')
})
