// A round that never reads is a round that only learns by failing. The loop has
// a research system on disk (ten directions, 352 evidence snapshots, an open
// question ledger) and, measured 2026-11-26, not one line of `src/runtime/*.js`
// calls it: `grep -rn "research" src/runtime/*.js` is comments only.
//
// The balance between reading and working is a policy, not an instinct, so it
// lives in the same place as `planMode` -- which already proved the shape: a
// three-state field (`off | full | auto`), an override whitelist that refuses
// unknown values, and a reader that decides per round. This file pins the field
// itself; `when-to-read-and-when-to-work.test.mjs` pins the reader.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  POLICY_DEFAULTS,
  POLICY_FIELDS,
  diffPolicy,
  effectivePolicy,
  normalizePolicy,
  validatePolicyOverride,
} from '../../src/loop/policy.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

ok('the field exists and defaults to auto', () => {
  assert.ok(POLICY_FIELDS.includes('researchMode'), `researchMode is not in POLICY_FIELDS: ${POLICY_FIELDS.join(', ')}`)
  assert.equal(POLICY_DEFAULTS.researchMode, 'auto')
})

ok('the three modes survive normalization, anything else falls back', () => {
  assert.equal(normalizePolicy({ researchMode: 'off' }).researchMode, 'off')
  assert.equal(normalizePolicy({ researchMode: 'full' }).researchMode, 'full')
  assert.equal(normalizePolicy({ researchMode: 'auto' }).researchMode, 'auto')
  // An unknown value is not a mode; the base wins, exactly as planMode does.
  assert.equal(normalizePolicy({ researchMode: 'sometimes' }, { ...POLICY_DEFAULTS, researchMode: 'off' }).researchMode, 'off')
})

ok('a campaign may override it, and a typo is refused by name', () => {
  const accepted = validatePolicyOverride({ researchMode: 'off' })
  assert.equal(accepted.researchMode, 'off')
  assert.throws(
    () => validatePolicyOverride({ researchMode: 'sometimes' }),
    /invalid policy\.researchMode[\s\S]*off \| full \| auto/,
    'the refusal must name the field and the legal values',
  )
})

ok('the campaign override beats the install config', () => {
  const config = { research: { enabled: false }, loopPolicy: { planMode: 'full' } }
  const fromConfig = effectivePolicy({ state: {}, config })
  assert.equal(fromConfig.researchMode, 'off', 'config.research.enabled:false must read as off')
  const overridden = effectivePolicy({ state: { policy: { researchMode: 'full' } }, config })
  assert.equal(overridden.researchMode, 'full', 'the operator’s latest word wins')
})

ok('a promoted policy that is silent on reading does not turn it off', () => {
  // Same trap the knowledge flag had: a promoted record written before the field
  // existed must fall back to config, not to `undefined`.
  const config = { research: { enabled: true } }
  const state = { policy: { policy: { minGain: 0.1 } } }
  assert.equal(effectivePolicy({ state, config }).researchMode, 'auto')
})

ok('the audit trail can say the balance changed', () => {
  const diff = diffPolicy({ researchMode: 'off' }, { researchMode: 'auto' })
  assert.deepEqual(diff.researchMode, { from: 'off', to: 'auto' })
  assert.deepEqual(diffPolicy({ researchMode: 'auto' }, { researchMode: 'auto' }), {})
})

ok('the config block it reads has a default', () => {
  const config = readFileSync(new URL('../../src/core/config.js', import.meta.url), 'utf8')
  assert.match(config, /research\s*:\s*\{/, 'DEFAULT_CONFIG needs a research block for research.enabled to read')
  assert.match(config, /enabled\s*:\s*true/, 'research must default to on; an off-by-default knob is a rumour')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
