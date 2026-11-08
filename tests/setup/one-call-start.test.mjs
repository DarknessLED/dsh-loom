// Starting a campaign takes five tool calls: create, register the eval set,
// propose a chain, activate it, arm autopilot. Every one of them can be forgotten,
// and the failure mode is quiet — a campaign that sits in `planning` forever while
// the operator believes it is running. (I have shipped a campaign with no
// workspace for exactly this reason; it raised the same setup question every tick.)
//
// So `rsi_start` also takes the work: given `tasks` it registers the eval set, and
// given `auto:true` it activates the proposed chain, arms autopilot and starts.
// Without `auto` it stops at `planning` on purpose, so a human can read the chain
// before anything runs. A bad task is rejected by name *before* anything is
// written — a half-created campaign is worse than none.
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { registerTools } from '../../src/tools/index.js'
import { Ledger } from '../../src/core/ledger.js'
import { reduce } from '../../src/core/reduce.js'
import { campaignDir, ok, done } from '../chaos/fixture.mjs'

function harness() {
  const dir = campaignDir()
  const ledger = new Ledger(join(dir, 'events.jsonl'))
  const events = []
  const views = new Map()
  const runtime = {
    create(opts) {
      const id = opts.id || 'auto'
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
    get(id) {
      return views.get(id)
    },
    listCampaigns() {
      return [...views.keys()]
    },
    ensureOwner() {
      return true
    },
    enabled() {
      return true
    },
    switchState() {
      return { enabled: true, at: null, by: 'config', reason: 'default' }
    },
  }
  const tools = new Map()
  const ctx = {
    effect(fn) {
      fn()
      return () => {}
    },
    tools: {
      register(def) {
        tools.set(def.name, def)
        return () => {}
      },
    },
    get: () => undefined,
  }
  registerTools(ctx, { runtime, config: { verify: { timeoutMs: 30_000 } } })
  return { dir, runtime, tools, events, views }
}

const tasks = [
  { id: 'first', prompt: 'make the first check pass', verify: { cmd: 'exit 0' } },
  { id: 'second', prompt: 'make the second check pass', verify: { cmd: 'exit 0' } },
]

// One call, armed: the campaign is running with a chain, an eval set and autopilot.
{
  const h = harness()
  const res = await h.tools.get('rsi_start').execute({
    id: 'one-call',
    objective: 'make both checks pass',
    workspace: 'C:/tmp/repo',
    tasks,
    holdout: [],
    template: 'code-fix',
    auto: true,
    guard: '"node" scripts/test-all.mjs',
  })

  assert.equal(res.status, 'running', 'one call is enough to start it')
  assert.equal(res.evalset?.tasks, 2, 'the eval set it was given is on the campaign')
  assert.equal(res.chain?.version, 1, 'the template became chain v1')
  assert.equal(res.autopilot?.enabled, true, 'autopilot is armed')

  const order = h.events.map((e) => e.type)
  const at = (type) => order.indexOf(type)
  assert.ok(at('campaign.created') >= 0 && at('evalset.registered') > at('campaign.created'), 'the eval set lands after the campaign')
  assert.ok(at('chain.proposed') > 0 && at('chain.activated') > at('chain.proposed'), 'a chain is proposed before it is activated')
  assert.ok(at('campaign.status') > at('chain.activated'), 'the campaign starts only after it has a chain')

  const state = h.runtime.get('one-call').state
  assert.equal(state.status, 'running')
  assert.equal(state.chain.activeVersion, 1)
  assert.equal(state.evalset.tasks.length, 2)
  assert.equal(state.autopilot.enabled, true)
  ok('one call creates, registers, activates and starts a campaign')
}

// Without auto it stops at planning: the chain is readable before anything runs.
{
  const h = harness()
  const res = await h.tools.get('rsi_start').execute({
    id: 'review-first',
    objective: 'review me',
    workspace: 'C:/tmp/repo',
    tasks,
    template: 'code-fix',
  })

  assert.equal(res.status, 'planning', 'auto is opt-in')
  assert.equal(res.autopilot?.enabled ?? false, false, 'nothing is armed')
  assert.equal(h.events.some((e) => e.type === 'campaign.status' && e.data?.status === 'running'), false, 'and nothing is started')
  assert.equal(h.events.some((e) => e.type === 'chain.activated'), false)
  ok('without auto the campaign waits for a human to look at the chain')
}

// A malformed task is rejected by name, before anything is written.
{
  const h = harness()
  let threw = null
  try {
    await h.tools.get('rsi_start').execute({
      id: 'bad',
      objective: 'bad task',
      workspace: 'C:/tmp/repo',
      tasks: [{ id: 'no-verify', prompt: 'x' }],
      template: 'code-fix',
      auto: true,
    })
  } catch (err) {
    threw = err
  }
  assert.ok(threw, 'a task without a verifier is refused')
  assert.match(String(threw.message), /no-verify/, 'and the message names the task')
  assert.equal(h.events.filter((e) => e.type === 'campaign.created').length, 0, 'nothing was created')
  ok('a bad task is refused before the campaign exists')
}

done()
