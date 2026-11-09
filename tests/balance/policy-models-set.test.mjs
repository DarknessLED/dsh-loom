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
  assert.deepEqual(modelsFor(bare), ['cfg-w'])

  const none = policyFor({ config: normalizeConfig({ home, rsi: { enabled: false } }), campaign: {} })
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
