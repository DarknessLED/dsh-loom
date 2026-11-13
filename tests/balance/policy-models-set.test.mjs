// A chain any campaign can name, but only through a path that refuses typos.
//
// `policyFor` can now resolve a model chain. That is only useful if an operator
// can actually set one, and only safe if a malformed one is refused *before* it
// is written: a campaign log that says "this ran on m-b" while the dispatcher
// used the config's model is worse than no override at all.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'
import { validatePolicyOverride } from '../../src/loop/policy.js'
import { modelsFor, policyFor } from '../../src/runtime/round.js'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-policymodels-'))
const repo = join(root, 'repo')
const home = join(root, 'home')
mkdirSync(repo, { recursive: true })
mkdirSync(home, { recursive: true })
writeFileSync(join(repo, 'a.txt'), 'a\n')
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true })
git('init', '-q')
git('config', 'user.email', 'loom@example.com')
git('config', 'user.name', 'loom')
git('add', '.')
git('commit', '-q', '-m', 'init')

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. Shape checking happens at the door, by field name.
{
  assert.deepEqual(validatePolicyOverride({ models: { worker: 'm-a', fallback: ['m-b'] } }), {
    models: { worker: 'm-a', fallback: ['m-b'] },
  })
  assert.throws(() => validatePolicyOverride({ models: { worker: 42 } }), /models/)
  assert.throws(() => validatePolicyOverride({ models: { fallback: ['m-b', 7] } }), /models/)
  assert.throws(() => validatePolicyOverride({ models: {} }), /models/, 'an empty chain names nothing')
  assert.throws(() => validatePolicyOverride({ models: ['m-a'] }), /models/, 'a bare list is not a chain')
  ok('a chain must name at least one model and may not carry garbage')
}

// 2. Setting it writes one event, and the round that reads the campaign back
//    resolves the campaign's chain over the config's.
{
  const config = normalizeConfig({ home, models: { worker: 'cfg-w', fallback: ['cfg-f'] }, rsi: { enabled: false } })
  const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
  const view = runtime.create({ id: 'pm-a', objective: 'run on another provider', workspace: repo, initiator: null })
  runtime.append(view, 'evalset.registered', { tasks: [{ id: 't', prompt: 'p', verify: { cmd: 'exit 1' } }], holdout: [] })
  const res = runtime.setPolicy('pm-a', { models: { worker: 'm-a', fallback: ['m-b'] } })
  assert.deepEqual(res.policy.models, { worker: 'm-a', fallback: ['m-b'] })

  const reopened = new Runtime({ ctx: {}, home, config, log: () => {} })
  reopened.open('pm-a')
  const policy = policyFor({ config, campaign: reopened.get('pm-a').state })
  assert.equal(policy.sources.models, 'campaign')
  assert.deepEqual(modelsFor(policy), ['m-a', 'm-b'])
  ok('a campaign chain is written once and read back off the log')
}

// 3. Without an override the config chain is what the dispatcher gets, and a
//    config with no models reports that honestly instead of inventing one.
{
  const config = normalizeConfig({ home, models: { worker: 'cfg-w' }, rsi: { enabled: false } })
  const bare = policyFor({ config, campaign: { policy: {} } })
  assert.equal(bare.sources.models, 'config')
  // The config chain is the worker followed by whatever fallbacks it carries --
  // including the default one, which names another provider on purpose.
  assert.deepEqual(modelsFor(bare), ['cfg-w', ...config.models.fallback])
  // An operator who wants none says so, and is obeyed.
  const alone = normalizeConfig({ home, models: { worker: 'cfg-w', fallback: [] }, rsi: { enabled: false } })
  assert.deepEqual(modelsFor(policyFor({ config: alone, campaign: { policy: {} } })), ['cfg-w'])

  // "No chain at all" means the operator removed the fallback too. With a fallback
  // in force the config does carry a chain, and saying `default` would hide it.
  const none = policyFor({
    config: normalizeConfig({ home, models: { fallback: [] }, rsi: { enabled: false } }),
    campaign: {},
  })
  assert.equal(none.sources.models, 'default')
  assert.equal(modelsFor(none), undefined)
  ok('with no override the config chain stands, and silence is not a model')
}

// 4. A refused override leaves the log byte-identical: no half-applied chain.
{
  const config = normalizeConfig({ home, rsi: { enabled: false } })
  const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
  const view = runtime.create({ id: 'pm-b', objective: 'typos are refused', workspace: repo, initiator: null })
  runtime.setPolicy('pm-b', { models: { worker: 'm-a' } })
  const before = readFileSync(join(home, 'campaigns', 'pm-b', 'events.jsonl'), 'utf8')
  assert.throws(() => runtime.setPolicy('pm-b', { models: { worker: 'm-a', fallback: ['ok', 3] } }), /models/)
  assert.throws(() => runtime.setPolicy('pm-b', { models: { fallback: ['m-b'], worker: '' } }), /models/)
  const after = readFileSync(join(home, 'campaigns', 'pm-b', 'events.jsonl'), 'utf8')
  assert.equal(after, before, 'a rejected chain writes nothing')
  ok('a malformed chain is refused before anything is written')
}

console.log(`\n${pass}/${pass} passed`)
rmSync(root, { recursive: true, force: true })


// --- value-level assertions (added while proving the graded instrument moves) ---
//
// The two specs above test this file's original subject: that a model chain can
// be named and that a malformed one is refused. They leave the policy's numeric
// edges untested, which is what the kill-rate reading reports. These assertions
// pin the boundaries: a clamp that is off by one, a `<=` that became `<`, a
// `null` that became `0`, and a one-sided `||` that became `&&`.
{
  const { validatePolicyOverride, normalizePolicy, effectivePolicy, diffPolicy, POLICY_DEFAULTS } = await import('../../src/loop/policy.js')

  // Boundaries are asserted on both sides: inside passes, just outside throws.
  assert.deepEqual(validatePolicyOverride({ minGain: 0 }), { minGain: 0 })
  assert.deepEqual(validatePolicyOverride({ minGain: 1 }), { minGain: 1 })
  assert.throws(() => validatePolicyOverride({ minGain: -0.0001 }), /invalid policy\.minGain/)
  assert.throws(() => validatePolicyOverride({ minGain: 1.0001 }), /invalid policy\.minGain/)
  assert.deepEqual(validatePolicyOverride({ candidates: 1 }), { candidates: 1 })
  assert.deepEqual(validatePolicyOverride({ candidates: 4 }), { candidates: 4 })
  assert.throws(() => validatePolicyOverride({ candidates: 0 }), /invalid policy\.candidates/)
  assert.throws(() => validatePolicyOverride({ candidates: 5 }), /invalid policy\.candidates/)
  assert.deepEqual(validatePolicyOverride({ holdoutSlack: 0 }), { holdoutSlack: 0 })
  assert.deepEqual(validatePolicyOverride({ minGain: '0.2' }), { minGain: 0.2 })

  // normalizePolicy clamps rather than throwing, on both ends.
  assert.equal(normalizePolicy({ minGain: -5 }).minGain, 0)
  assert.equal(normalizePolicy({ minGain: 5 }).minGain, 1)
  assert.equal(normalizePolicy({ holdoutSlack: 9 }).holdoutSlack, 1)
  assert.equal(normalizePolicy({ holdoutSlack: -9 }).holdoutSlack, 0)
  assert.equal(normalizePolicy({ candidates: 0 }).candidates, 1)
  assert.equal(normalizePolicy({ candidates: 9 }).candidates, 4)

  // `null` and `undefined` mean "not set" and must fall back to the base; `0` is
  // a value and must be clamped instead. Collapsing the two is invisible unless
  // the base is not the clamp floor.
  assert.equal(normalizePolicy({ candidates: null }, { ...POLICY_DEFAULTS, candidates: 3 }).candidates, 3)
  assert.equal(normalizePolicy({ candidates: undefined }, { ...POLICY_DEFAULTS, candidates: 3 }).candidates, 3)
  assert.equal(normalizePolicy({ candidates: 0 }, { ...POLICY_DEFAULTS, candidates: 3 }).candidates, 1)

  // A non-boolean is not a boolean: the fallback is the base, not the truthy value.
  assert.equal(normalizePolicy({ knowledge: 1 }).knowledge, POLICY_DEFAULTS.knowledge)
  assert.equal(normalizePolicy({ halving: 'yes' }).halving, POLICY_DEFAULTS.halving)
  assert.equal(normalizePolicy({ knowledge: false }).knowledge, false)

  // An unknown plan mode falls back; a known one survives.
  assert.equal(normalizePolicy({ planMode: 'off' }).planMode, 'off')
  assert.equal(normalizePolicy({ planMode: 'bogus' }).planMode, POLICY_DEFAULTS.planMode)

  // effectivePolicy: the promoted policy wins per-field, everything unset comes
  // from config -- mixing the two the wrong way round is invisible in a default
  // where both agree.
  const eff = effectivePolicy({
    state: { policy: { policy: { minGain: 0.5 } } },
    config: { gate: { minGain: 0.1 }, knowledge: { enabled: false }, halving: { enabled: false }, loopPolicy: { planMode: 'auto' } },
  })
  assert.equal(eff.minGain, 0.5)
  assert.equal(eff.knowledge, false)
  assert.equal(eff.planMode, 'auto')
  assert.equal(effectivePolicy({}).minGain, POLICY_DEFAULTS.minGain)

  // diffPolicy names the fields that changed and stays silent about the rest.
  assert.deepEqual(diffPolicy({ minGain: 0.1 }, { minGain: 0.2 }), { minGain: { from: 0.1, to: 0.2 } })
  assert.deepEqual(diffPolicy({ minGain: 0.1 }, { minGain: 0.1 }), {})
}
