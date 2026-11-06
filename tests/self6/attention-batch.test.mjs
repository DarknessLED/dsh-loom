// Human attention is the scarce resource. A campaign that raises three gate
// checkpoints in five minutes must not send three wake-ups: the loop batches them
// into one digest per window and says so, while a checkpoint raised after the
// window still leaves immediately.
import assert from 'node:assert/strict'
import { notifyCheckpoint } from '../src/runtime/notify.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function harness({ batch } = {}) {
  const events = []
  const prompts = []
  const ledger = {
    all: () => events.map((e, i) => ({ ...e, seq: i + 1 })),
    append: (type, data, actor) => {
      events.push({ type, data, actor })
      return { seq: events.length, type, data, actor }
    },
  }
  const ctx = {
    get(name) {
      if (name !== 'sessionController') return undefined
      return {
        async prompt(req) {
          prompts.push(req)
          return { accepted: true }
        },
      }
    },
  }
  const view = {
    dir: '/tmp/loom-attention',
    ledger,
    state: {
      id: 'attn',
      status: 'running',
      initiator: 'sess-main',
      checkpoints: [
        { id: 'cp-a', kind: 'gate', status: 'open', payload: { patch: '/tmp/a.patch' } },
        { id: 'cp-b', kind: 'gate', status: 'open', payload: { patch: '/tmp/b.patch' } },
        { id: 'cp-c', kind: 'gate', status: 'open', payload: { patch: '/tmp/c.patch' } },
      ],
    },
  }
  const config = { checkpoint: { ...(batch ? { batch } : {}) } }
  return { ctx, view, config, prompts, events }
}

// 1. without batching each checkpoint wakes the human
{
  const h = harness()
  const first = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  const second = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-b' }, config: h.config, now: 2000 })
  assert.equal(first.delivered, true)
  assert.equal(second.delivered, true)
  assert.equal(h.prompts.length, 2)
  ok('without a batch window every checkpoint is delivered')
}

// 2. with a window the second one inside it is held back
{
  const h = harness({ batch: { windowMs: 60_000 } })
  const first = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  assert.equal(first.delivered, true, 'the first checkpoint still wakes the human')
  const second = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-b' }, config: h.config, now: 2000 })
  assert.equal(second.delivered, false, 'a second checkpoint inside the window waits')
  assert.equal(second.reason, 'batched')
  assert.equal(h.prompts.length, 1, 'only one wake-up went out')
  ok('a checkpoint inside the window is batched, not delivered')
}

// 3. once the window has passed the next delivery carries a digest of everything open
{
  const h = harness({ batch: { windowMs: 60_000 } })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-b' }, config: h.config, now: 2000 })
  const third = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-c' }, config: h.config, now: 62_000 })
  assert.equal(third.delivered, true, 'the window reopened')
  assert.equal(h.prompts.length, 2)
  const text = h.prompts[1].content[0].text
  for (const id of ['cp-a', 'cp-b', 'cp-c']) assert.ok(text.includes(id), `the digest mentions ${id}`)
  ok('the next delivery is a digest of every open checkpoint')
}

console.log(`\n${pass}/${pass} passed`)
