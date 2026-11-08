// policyFor() can read an override, but nothing can write one. A policy that only
// a hand-edited log can set is a policy nobody sets, and an experiment nobody can
// run is not evidence.
//
// So the campaign gets an operator-facing setter: it appends one event, the
// campaign's own log is the record of "this campaign ran without the planner",
// and reopening the runtime must remember it. An override that is not understood
// is refused before anything is written - a typo must not look like an experiment.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-policy-'))
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

const config = normalizeConfig({ home, rsi: { enabled: false } })
const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
const task = { id: 't1', prompt: 'do it', verify: { cmd: `"${NODE}" -e "process.exit(1)"`, timeoutMs: 30_000 } }
const a = runtime.create({ id: 'pol-a', objective: 'run without the planner', workspace: repo, initiator: null })
runtime.append(a, 'evalset.registered', { tasks: [task], holdout: [] })
runtime.create({ id: 'pol-b', objective: 'untouched', workspace: repo, initiator: null })

// 1. Setting a policy writes one event and reports what it accepted.
{
  const res = runtime.setPolicy('pol-a', { planMode: 'off' })
  assert.equal(res.id, 'pol-a')
  assert.equal(res.policy.planMode, 'off')
  const view = runtime.get('pol-a')
  assert.equal(view.state.policy.planMode, 'off', 'the folded state carries it')
  const log = readFileSync(join(home, 'campaigns', 'pol-a', 'events.jsonl'), 'utf8')
  assert.equal(log.includes('"type":"campaign.policy"'), true, 'the campaign log is the record')
  ok('a policy override is one event in the campaign it belongs to')
}

// 2. The other campaign is untouched: a policy is not a global switch.
{
  const other = runtime.get('pol-b')
  assert.equal(other.state.policy, undefined, 'a sibling campaign keeps no override')
  ok('the override stays inside the campaign it was set on')
}

// 3. An unreadable override is refused *before* anything is written, so the log
//    never claims an experiment that did not happen.
{
  const before = readFileSync(join(home, 'campaigns', 'pol-a', 'events.jsonl'), 'utf8')
  assert.throws(() => runtime.setPolicy('pol-a', { planMode: 'sometimes' }), /planMode/)
  const after = readFileSync(join(home, 'campaigns', 'pol-a', 'events.jsonl'), 'utf8')
  assert.equal(after, before, 'a rejected override writes nothing')
  ok('a rejected override writes nothing')
}

// 4. It survives a restart: the log is the truth, not the process.
{
  const again = new Runtime({ ctx: {}, home, config, log: () => {} })
  again.open('pol-a')
  again.open('pol-b')
  assert.equal(again.get('pol-a').state.policy.planMode, 'off', 'reopening reads it back off the log')
  assert.equal(again.get('pol-b').state.policy, undefined)
  ok('the override survives reopening the campaign')
}

console.log(`\n${pass}/${pass} passed`)
rmSync(root, { recursive: true, force: true })
