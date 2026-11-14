// Planning is optional, and off until asked for.
//
// Measured on 2026-11-14: on four mutation tasks the planner moved no endpoint and
// spent 580 s of 2,289 s of round clock (25.3%); across the corpus 36 of 195 planner
// runs aborted having returned nothing. So the default stops buying it. It is not
// removed, because "where to look" is exactly what a task with an unlocalised
// failure needs, and the four measured tasks all handed that to the worker in
// `verify.scope.editable`.
//
// Three ways to ask for it, weakest first: `loopPolicy.planMode` in config, the
// workbench toggle (`<home>/settings.json`), and a campaign's own policy (what
// `rsi_control(action:"plan", id)` — "add planning" in a conversation — writes).
// The planner node stays in the template so a toggle can turn it back on: a node
// that was deleted cannot be switched on by a setting.
//   node tests/plan-default.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readSettings, roundConfigWithSettings, settingsLogPath, settingsPath, writeSettings } from '../src/core/settings.js'
import { DEFAULT_CONFIG, normalizeConfig } from '../src/core/config.js'
import { effectivePolicy } from '../src/loop/policy.js'
import { planModeFor } from '../src/runtime/round.js'
import { CODE_FIX } from '../src/chain/templates.js'
import { panelAction, panelState } from '../src/panel/api.js'
import { registerTools } from '../src/tools/index.js'
import { Ledger } from '../src/core/ledger.js'
import { reduce } from '../src/core/reduce.js'
import { campaignDir, ok, done } from './chaos/fixture.mjs'

const home = () => mkdtempSync(join(tmpdir(), 'loom-set-'))

// 1. The default no longer buys planning, and the node is still there to buy.
{
  assert.equal(DEFAULT_CONFIG.loopPolicy.planMode, 'off', 'the shipped default does not plan')
  assert.equal(planModeFor([], { planMode: 'off' }), 'off', 'and a round with no history does not plan either')
  assert.equal(normalizeConfig({}).loopPolicy.planMode, 'off', 'normalizing config keeps it')
  assert.equal(normalizeConfig({ loopPolicy: { planMode: 'full' } }).loopPolicy.planMode, 'full', 'an install that wants it still can')
  assert.equal(CODE_FIX.nodes[0].id, 'recon', 'the planner node stays in the template, so a setting can turn it back on')
  ok('planning is off by default, and the planner node is still in the template')
}

// 2. A missing file means "never set": the configured default applies, and nothing
//    is invented on the way.
{
  const h = home()
  const s = readSettings(h)
  assert.equal(s.plan, null, 'nothing is set')
  assert.equal(s.by, 'config', 'and the answer says so')
  assert.equal(s.reason, 'default', 'with the reason a reader needs')
  assert.equal(roundConfigWithSettings({ loopPolicy: { planMode: 'off' } }, h).loopPolicy.planMode, 'off', 'config applies untouched')
  assert.equal(roundConfigWithSettings({ loopPolicy: { planMode: 'auto' } }, h).loopPolicy.planMode, 'auto', 'whatever the install chose')
  ok('a missing settings file leaves the configured default alone')
}

// 3. The toggle wins over config, and it is audited.
{
  const h = home()
  writeSettings(h, { plan: true }, { by: 'human:panel', reason: 'task needs a planner' })
  const s = readSettings(h)
  assert.equal(s.plan, true, 'the toggle is read back')
  assert.equal(s.by, 'human:panel', 'and remembers who flipped it')
  const line = JSON.parse(readFileSync(settingsLogPath(h), 'utf8').trim().split('\n').pop())
  assert.deepEqual(line.patch, { plan: true }, 'the audit line records the patch, not just the result')
  assert.equal(line.reason, 'task needs a planner', 'and the reason given')
  assert.equal(roundConfigWithSettings({ loopPolicy: { planMode: 'off' } }, h).loopPolicy.planMode, 'full', 'the toggle outranks config')
  assert.deepEqual(
    roundConfigWithSettings({ loopPolicy: { planMode: 'off', humanGate: false } }, h).loopPolicy,
    { planMode: 'full', humanGate: false },
    'and it overrides only planMode, leaving the rest of the policy alone',
  )
  writeSettings(h, { plan: false })
  assert.equal(readSettings(h).plan, false, 'and it flips back')
  assert.equal(readFileSync(settingsLogPath(h), 'utf8').trim().split('\n').length, 2, 'one audit line per write')
  ok('the workbench toggle outranks config, and every write is audited')
}

// 4. Refusals are named, and an unreadable file does not silently flip behaviour.
{
  const h = home()
  assert.throws(() => writeSettings(h, { planning: true }), /unknown setting/, 'a typo is refused by name')
  assert.throws(() => writeSettings(h, { plan: 'false' }), /must be a boolean/, 'a string is not coerced into a boolean')
  writeFileSync(settingsPath(h), '{ not json')
  const broken = readSettings(h)
  assert.equal(broken.plan, null, 'a broken file answers "not set"')
  assert.equal(broken.reason, 'unreadable', 'and says why')
  assert.equal(roundConfigWithSettings({ loopPolicy: { planMode: 'off' } }, h).loopPolicy.planMode, 'off', 'so the configured default still applies')
  ok('bad input is refused by name; a broken file never flips the default')
}

// 5. A campaign's own word outranks the install default.
{
  const state = { policy: { planMode: 'full' } }
  const p = effectivePolicy({ state, config: { loopPolicy: { planMode: 'off' } } })
  assert.equal(p.planMode, 'full', 'the campaign that asked for planning gets it')
  const quiet = effectivePolicy({ state: {}, config: { loopPolicy: { planMode: 'off' } } })
  assert.equal(quiet.planMode, 'off', 'and one that said nothing does not')
  ok('campaign policy outranks the install default')
}

function harness(config = {}) {
  const dir = campaignDir()
  const ledger = new Ledger(join(dir, 'events.jsonl'))
  const events = []
  const views = new Map()
  const runtime = {
    home: dir,
    create(opts) {
      const id = opts.id || 'plan'
      const view = { id, dir, ledger, state: null }
      views.set(id, view)
      runtime.append(view, 'campaign.created', {
        id,
        objective: opts.objective,
        workspace: opts.workspace ?? null,
        budget: opts.budget || {},
        actor: opts.actor || 'human',
      })
      return view
    },
    append(view, type, data, actor = 'system') {
      view.ledger.append(type, data, actor)
      view.state = reduce(view.ledger.all(), view.id)
      events.push({ type, data })
      return view.state
    },
    control(id, action, data, actor = 'human') {
      const view = views.get(id)
      if (action === 'policy') {
        runtime.append(view, 'campaign.policy', data, actor)
        return { policy: data.policy }
      }
      throw new Error(`fixture does not implement control(${action})`)
    },
    get(id) { return views.get(id) },
    listCampaigns() { return [...views.keys()] },
    ensureOwner() { return true },
    enabled() { return true },
    switchState() { return { enabled: true, at: null, by: 'config', reason: 'default' } },
    settingsState() { return readSettings(runtime.home) },
    setSettings(patch, opts = {}) {
      const written = writeSettings(runtime.home, patch, { by: 'human:panel', ...opts })
      return { ...readSettings(runtime.home), written }
    },
    ownership() { return { owner: null, mine: true } },
    liveAttempts() { return [] },
  }
  const tools = new Map()
  const ctx = {
    effect(fn) { fn(); return () => {} },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
    get: () => undefined,
  }
  registerTools(ctx, { runtime, config: { verify: { timeoutMs: 30_000 }, ...config } })
  return { dir, runtime, tools, events, views }
}

// 6. "Add planning" in a conversation writes the campaign's policy, and it takes
//    effect as a policy rather than a chain change: no checkpoint, no new version.
{
  const h = harness()
  const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
  const r = await h.tools.get('rsi_control').execute({ id: 'c', action: 'plan', enabled: true })
  assert.equal(r.scope, 'campaign', 'the campaign is the scope when an id is given')
  assert.equal(r.planMode, 'full', 'and it turns planning on')
  assert.equal(h.runtime.get('c').state.policy.planMode, 'full', 'recorded as a campaign policy')
  assert.equal(h.events.filter((e) => e.type === 'checkpoint.raised').length, 0, 'a policy is not a chain change, so nobody is asked')
  assert.equal(h.events.filter((e) => e.type === 'chain.proposed').length, 0, 'and no version was invented')
  const off = await h.tools.get('rsi_control').execute({ id: 'c', action: 'plan', enabled: false })
  assert.equal(off.planMode, 'off', 'and it turns back off')
  assert.equal(h.runtime.get('c').state.policy.planMode, 'off', 'the latest word wins')
  ok('rsi_control plan with an id records a campaign policy and asks nobody')
}

// 7. Without an id it is the install default — the same value the panel writes.
{
  const h = harness()
  const r = await h.tools.get('rsi_control').execute({ action: 'plan', enabled: true })
  assert.equal(r.scope, 'install', 'no id means the default')
  assert.equal(r.planMode, 'full', 'and it turns planning on for campaigns that say nothing')
  assert.equal(readSettings(h.dir).plan, true, 'written where the panel reads it')
  assert.equal(roundConfigWithSettings({ loopPolicy: { planMode: 'off' } }, h.dir).loopPolicy.planMode, 'full', 'and a round now buys a plan')
  ok('rsi_control plan without an id writes the install default')
}

// 8. The panel shows the value in force, where it came from, and flips it.
{
  const h = harness()
  const before = panelState({ runtime: h.runtime, config: { loopPolicy: { planMode: 'off' } } })
  assert.equal(before.planning.on, false, 'the panel starts with planning off')
  assert.equal(before.planning.by, 'config', 'and says the file has never been written')
  const on = panelAction({ runtime: h.runtime, config: { loopPolicy: { planMode: 'off' } } }, { action: 'plan', enabled: true })
  assert.equal(on.planning.on, true, 'the toggle answers with the new value')
  assert.equal(on.planning.by, 'human:panel', 'and who set it')
  const after = panelState({ runtime: h.runtime, config: { loopPolicy: { planMode: 'off' } } })
  assert.equal(after.planning.on, true, 'and the panel state reflects it')
  assert.equal(readSettings(h.dir).plan, true, 'the file is the single source, not panel memory')
  ok('the panel reports and flips the planning default')
}

done()
