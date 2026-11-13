// L2 adoption is the one decision a person makes.
//
// A chain change alters what every later round does, and the loop cannot un-run
// those rounds: once v2 has produced four rounds, the fact that v1 was replaced is
// in the ledger forever. `rsi_chain(action:"promote")` already raises a checkpoint
// before it activates, but `activate` was a raw switch — a version could be made
// current with no evidence and no person, which is exactly how a "human in the
// loop" becomes decoration.
//
// Rule: activating a *different* version above 1 raises a checkpoint and leaves the
// active version alone. Two exemptions, both of them real: the first version (there
// is nothing to replace) and an explicit `confirm:true` from whoever is answering.
//   node tests/l2-requires-human.test.mjs
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { registerTools } from '../src/tools/index.js'
import { Ledger } from '../src/core/ledger.js'
import { reduce } from '../src/core/reduce.js'
import { campaignDir, ok, done } from './chaos/fixture.mjs'

function harness(config = {}) {
  const dir = campaignDir()
  const ledger = new Ledger(join(dir, 'events.jsonl'))
  const events = []
  const views = new Map()
  const runtime = {
    create(opts) {
      const id = opts.id || 'l2'
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
    get(id) { return views.get(id) },
    listCampaigns() { return [...views.keys()] },
    ensureOwner() { return true },
    enabled() { return true },
    switchState() { return { enabled: true, at: null, by: 'config', reason: 'default' } },
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

const v1 = { name: 'code-fix', version: 1, nodes: [{ id: 'work', type: 'agent', prompt: 'do it' }] }
const v2 = { name: 'code-fix', version: 2, nodes: [{ id: 'work', type: 'agent', prompt: 'do it' }] }

// 1. The first version needs no permission: there is nothing to replace.
{
  const h = harness()
  const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
  h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
  const r = await h.tools.get('rsi_chain').execute({ id: 'c', action: 'activate', version: 1 })
  assert.equal(r.active, 1, 'v1 activates')
  assert.equal(h.events.filter((e) => e.type === 'checkpoint.raised').length, 0, 'no question for the first version')
  ok('the first chain version activates without asking')
}

// 2. Replacing it does not happen on an agent's say-so.
{
  const h = harness()
  const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
  h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
  h.runtime.append(view, 'chain.activated', { version: 1 }, 'system')
  h.runtime.append(view, 'chain.proposed', { version: 2, spec: v2 }, 'agent')
  const r = await h.tools.get('rsi_chain').execute({ id: 'c', action: 'activate', version: 2 })
  const raised = h.events.find((e) => e.type === 'checkpoint.raised')
  assert.equal(r.active, 1, 'the active chain is unchanged')
  assert.equal(r.pending, raised?.data?.id, 'the answer names the checkpoint that asks')
  assert.equal(raised?.data?.kind, 'chain', 'and the checkpoint is a chain decision')
  assert.equal(raised?.data?.payload?.chainVersion, 2, 'about this version')
  assert.equal(raised?.data?.payload?.reason, 'activate-requires-confirmation', 'and says why it is asking')
  assert.equal(h.runtime.get('c').state.chain.activeVersion, 1, 'nothing in the ledger moved the chain')
  ok('activating a different version raises a chain checkpoint and changes nothing')
}

// 3. A person answering it activates the version, and the actor says so.
{
  const h = harness()
  const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
  h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
  h.runtime.append(view, 'chain.activated', { version: 1 }, 'system')
  h.runtime.append(view, 'chain.proposed', { version: 2, spec: v2 }, 'agent')
  const pending = await h.tools.get('rsi_chain').execute({ id: 'c', action: 'activate', version: 2 })
  const decided = await h.tools.get('rsi_decide').execute({ id: 'c', checkpoint: pending.pending, decision: 'approve' })
  assert.equal(decided.answered, pending.pending, 'the decision answers that checkpoint')
  assert.equal(h.runtime.get('c').state.chain.activeVersion, 2, 'and the chain is now v2')
  const activation = h.events.filter((e) => e.type === 'chain.activated').pop()
  assert.equal(activation?.data?.version, 2, 'the activation is recorded')
  ok('approving the checkpoint activates the version')
}

// 4. Refusing leaves the old chain running.
{
  const h = harness()
  const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
  h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
  h.runtime.append(view, 'chain.activated', { version: 1 }, 'system')
  h.runtime.append(view, 'chain.proposed', { version: 2, spec: v2 }, 'agent')
  const pending = await h.tools.get('rsi_chain').execute({ id: 'c', action: 'activate', version: 2 })
  await h.tools.get('rsi_decide').execute({ id: 'c', checkpoint: pending.pending, decision: 'reject' })
  assert.equal(h.runtime.get('c').state.chain.activeVersion, 1, 'a rejected activation changes nothing')
  ok('rejecting the checkpoint leaves the chain where it was')
}

// 5. `confirm:true` is the explicit shortcut, and the ledger records a human act.
{
  const h = harness()
  const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
  h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
  h.runtime.append(view, 'chain.activated', { version: 1 }, 'system')
  h.runtime.append(view, 'chain.proposed', { version: 2, spec: v2 }, 'agent')
  const r = await h.tools.get('rsi_chain').execute({ id: 'c', action: 'activate', version: 2, confirm: true })
  assert.equal(r.active, 2, 'an explicit confirmation activates')
  assert.equal(h.events.filter((e) => e.type === 'checkpoint.raised').length, 0, 'and asks nothing')
  ok('an explicit confirmation is the shortcut, and it is the only one')
}

// 6. A campaign can turn the question off; the default is to ask.
{
  const h = harness({ loopPolicy: { humanGate: false } })
  const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
  h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
  h.runtime.append(view, 'chain.activated', { version: 1 }, 'system')
  h.runtime.append(view, 'chain.proposed', { version: 2, spec: v2 }, 'agent')
  const r = await h.tools.get('rsi_chain').execute({ id: 'c', action: 'activate', version: 2 })
  assert.equal(r.active, 2, 'with the gate off it activates')
  ok('the question can be turned off for an installation that wants that')
}

done('l2-requires-human')
