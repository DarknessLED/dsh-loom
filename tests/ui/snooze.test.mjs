// The panel offers 暂缓 on every checkpoint row, and the host has never agreed to
// it: `rsi_decide` accepts only approve/reject/stop/continue, while the panel path
// quietly records 暂缓 as an *answer*, closing the checkpoint the human meant to
// postpone. Two doors, two different meanings, and the button that looks safest
// is the one that silently destroys the question.
//
// Required: hold is a real decision in both doors, it postpones without closing,
// and it shows up in the queue as deferred rather than as "waiting since forever".
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { registerTools } from '../../src/tools/index.js'
import { panelAction } from '../../src/panel/api.js'
import { reduce } from '../../src/core/reduce.js'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const NOW = 1_800_000_000_000

function fakeRuntime(cp) {
  const events = []
  const view = {
    id: 'c',
    state: {
      id: 'c',
      status: 'running',
      objective: 'demo',
      workspace: '/tmp/demo',
      rounds: [],
      lessons: [],
      budget: { usd: 1, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1' }], holdout: [] },
      checkpoints: [...cp],
    },
  }
  const runtime = {
    get: () => view,
    listCampaigns: () => ['c'],
    ensureOwner: () => true,
    ownership: () => ({ owner: { pid: 1 }, mine: true }),
    liveAttempts: () => [],
    control: () => {},
    append: (v, type, data) => {
      events.push({ type, data })
      if (type === 'checkpoint.answered') {
        const c = v.state.checkpoints.find((x) => x.id === (data.checkpoint ?? data.id))
        if (c) c.status = 'answered'
      }
      return v.state
    },
  }
  return { runtime, events, view }
}

function toolHarness(runtime) {
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
  registerTools(ctx, { runtime, config: { verify: { timeoutMs: 1000 } } })
  return tools
}

const openCp = () => ({ id: 'cp-1', kind: 'gate', status: 'open', at: NOW - 60_000, payload: { score: 0.5 } })

// 1. The tool door accepts hold, and it postpones instead of answering.
{
  const { runtime, events, view } = fakeRuntime([openCp()])
  const tools = toolHarness(runtime)
  const decide = tools.get('rsi_decide')
  assert.ok(decide, 'rsi_decide is registered')
  const enumValues = decide.parameters?.properties?.decision?.enum ?? []
  assert.ok(enumValues.includes('hold'), 'the schema must admit hold, not just the panel')

  const res = await decide.execute({ id: 'c', checkpoint: 'cp-1', decision: 'hold' })
  assert.equal(res.deferred, true, 'the tool reports the deferral')
  assert.equal(res.answered, 'cp-1')
  assert.ok(Number(res.until) > Date.now(), 'and when it becomes worth reading again')

  assert.equal(events.filter((e) => e.type === 'checkpoint.answered').length, 0, 'holding is not answering')
  const held = events.filter((e) => e.type === 'checkpoint.held')
  assert.equal(held.length, 1, 'one held event')
  assert.equal(held[0].data.checkpoint, 'cp-1')
  assert.equal(view.state.checkpoints[0].status, 'open', 'the question is still open')
  ok('the tool can postpone a checkpoint without answering it')
}

// 2. The panel door means the same thing by the same word.
{
  const { runtime, events, view } = fakeRuntime([openCp()])
  const out = panelAction({ runtime }, { campaign: 'c', action: 'decide', checkpoint: 'cp-1', decision: 'hold' })
  assert.equal(out.ok, true)
  assert.equal(out.deferred, true, 'the panel reports the deferral too')
  assert.equal(events.filter((e) => e.type === 'checkpoint.answered').length, 0, 'the panel must not answer while holding')
  assert.equal(events.filter((e) => e.type === 'checkpoint.held').length, 1)
  assert.equal(view.state.checkpoints[0].status, 'open')
  ok('the panel button means the same thing the tool does')
}

// 3. The ledger folds a hold onto the checkpoint it postpones.
{
  const state = reduce(
    [
      { seq: 1, type: 'campaign.created', data: { id: 'c', workspace: '/tmp/x' } },
      { seq: 2, type: 'checkpoint.raised', data: { id: 'cp-1', kind: 'gate', payload: {} } },
      { seq: 3, type: 'checkpoint.held', data: { checkpoint: 'cp-1', until: NOW + 3_600_000 } },
    ],
    'c',
  )
  const cp = state.checkpoints.find((c) => c.id === 'cp-1')
  assert.equal(cp.status, 'open', 'a held checkpoint stays open')
  assert.equal(cp.held?.until, NOW + 3_600_000, 'and remembers until when')
  ok('the ledger keeps a held checkpoint open with its deferral')
}

// 4. The queue shows a postponed item as postponed, and stops shouting about it.
{
  const panel = await loadPanel()
  const data = {
    campaigns: [
      { id: 'a', status: 'running', open: 1, openCheckpoints: [{ id: 'cp-a', kind: 'gate', at: NOW - 90_000, risk: 'normal' }] },
      {
        id: 'b',
        status: 'running',
        open: 1,
        openCheckpoints: [
          { id: 'cp-b', kind: 'gate', at: NOW - 600_000, risk: 'normal', held: { until: NOW + 3_600_000 } },
        ],
      },
    ],
  }
  const rows = panel.pending(data, { now: NOW })
  assert.equal(rows.length, 2, 'both checkpoints are still listed')
  const held = rows.find((r) => r.id === 'cp-b')
  assert.equal(held.deferred, true, 'the postponed one says so')
  assert.equal(held.deferUntil, NOW + 3_600_000)
  assert.equal(rows[0].id, 'cp-a', 'and it no longer outranks something that needs a person now')
  ok('the queue separates postponed work from work that is waiting on you')
}

console.log(`\n${pass}/${pass} passed`)
