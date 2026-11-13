// Human attention is the scarce resource. A campaign that raises three gate
// checkpoints in five minutes must not send three wake-ups: the loop batches them
// into one digest per window and says so, while a checkpoint raised after the
// window still leaves immediately.
import assert from 'node:assert/strict'
import { notifyCheckpoint, flushDeferred } from '../../src/runtime/notify.js'

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
      rounds: [],
      budget: { rounds: 10, usd: 5, spentUsd: 0.25 },
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
  assert.equal(first.digest, undefined, 'a lone checkpoint is not reported as a digest')
  assert.ok(h.prompts[0].content[0].text.startsWith('🛠 RSI checkpoint [cp-a]'), 'the first prompt is a plain checkpoint')
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
  assert.equal(second.until, 61_000, 'the hold names when the window closes')
  assert.equal(h.prompts.length, 1, 'only one wake-up went out')
  const held = h.events.filter((e) => e.type === 'checkpoint.batched')
  assert.equal(held.length, 1, 'the held checkpoint is recorded')
  assert.equal(held[0].data.checkpointId, 'cp-b')
  assert.equal(held[0].data.windowUntil, 61_000, 'the record names the window it waits for')
  ok('a checkpoint inside the window is batched, not delivered')
}

// 3. once the window has passed the next delivery carries a digest of everything open
{
  const h = harness({ batch: { windowMs: 60_000 } })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-b' }, config: h.config, now: 2000 })
  const third = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-c' }, config: h.config, now: 62_000 })
  assert.equal(third.delivered, true, 'the window reopened')
  assert.equal(third.digest, true, 'the wake-up is a digest')
  assert.equal(third.checkpoints, 3, 'the digest covers every open checkpoint')
  assert.equal(h.prompts.length, 2)
  const text = h.prompts[1].content[0].text
  for (const id of ['cp-a', 'cp-b', 'cp-c']) assert.ok(text.includes(id), `the digest mentions ${id}`)
  assert.equal(h.prompts[1].requestId, `loom-cp-digest-${(62000).toString(36)}-3`, 'the digest request id counts the log')
  const notified = h.events.filter((e) => e.type === 'checkpoint.notified')
  assert.deepEqual(notified.map((e) => e.data.checkpointId), ['cp-b'], 'the held checkpoint is marked notified')
  assert.equal(notified[0].data.id, 'loom-cp-cp-b', 'the notified record keeps the held notification id')
  ok('the next delivery is a digest of every open checkpoint')
}

// 4. `batch: true` uses the five-minute default window
{
  const h = harness({ batch: true })
  const first = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  assert.equal(first.delivered, true)
  const second = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-b' }, config: h.config, now: 60_000 })
  assert.equal(second.delivered, false, 'inside the default window it waits')
  assert.equal(second.reason, 'batched')
  assert.equal(second.until, 1000 + 5 * 60_000, 'the default window is five minutes')
  const third = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-c' }, config: h.config, now: 301_000 })
  assert.equal(third.delivered, true, 'after five minutes it wakes again')
  assert.equal(third.digest, true)
  assert.equal(third.checkpoints, 3)
  const text = h.prompts[1].content[0].text
  assert.ok(text.includes('a passing patch is waiting for review'), 'the digest carries the human label for the kind')
  assert.ok(text.includes('3 waiting, one digest'), 'the digest says how many it covers')
  assert.ok(text.includes('🛠 RSI checkpoints'), 'the digest is titled as a digest')
  ok('batch: true batches for five minutes by default')
}

// 5. a malformed or non-positive window disables batching instead of holding forever
for (const windowMs of [-5, 0, 'soon', null]) {
  const h = harness({ batch: { windowMs } })
  const a = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  const b = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-b' }, config: h.config, now: 2000 })
  assert.equal(a.delivered, true, `windowMs ${windowMs}: the first still delivers`)
  assert.equal(b.delivered, true, `windowMs ${windowMs} must not batch`)
  assert.equal(b.digest, undefined, `windowMs ${windowMs}: the second is not a digest`)
  assert.ok(h.prompts[1].content[0].text.startsWith('🛠 RSI checkpoint ['), `windowMs ${windowMs}: a plain prompt`)
}
ok('a non-positive or malformed window means no batching')

// 6. the digest names every entry with its label and its evidence
{
  const h = harness({ batch: { windowMs: 60_000 } })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  await notifyCheckpoint(h.ctx, {
    view: h.view,
    kind: 'gate',
    payload: { id: 'cp-x', message: 'please review', attempt: 2, score: 0.75, detail: 'diff --git a/x b/x' },
    config: h.config,
    now: 2000,
  })
  const third = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-c' }, config: h.config, now: 62_000 })
  assert.equal(third.delivered, true)
  const text = h.prompts[1].content[0].text
  assert.ok(text.includes('• [cp-x] a passing patch is waiting for review'), 'the entry names its human label')
  assert.ok(text.includes('please review'), 'the entry carries the message')
  assert.ok(text.includes('attempt: 2 · score 0.75'), 'the entry carries the attempt and score')
  assert.ok(text.includes('detail:') && text.includes('diff --git a/x b/x'), 'the entry carries the detail block')
  assert.ok(text.includes('patch: /tmp/a.patch'), 'open checkpoints keep their patch line')
  assert.ok(text.includes('Reply rsi_decide with apply | reject | hold.'), 'the digest tells the human how to act')
  ok('the digest carries every entry and its evidence')
}

// 7. the window record says when attention opens again
{
  const h = harness({ batch: { windowMs: 60_000 } })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-a' }, config: h.config, now: 1000 })
  const win = h.events.filter((e) => e.type === 'checkpoint.window')
  assert.equal(win.length, 1, 'the first wake-up opens a window')
  assert.deepEqual(
    { openedAt: win[0].data.openedAt, until: win[0].data.until, count: win[0].data.count },
    { openedAt: 1000, until: 61_000, count: 1 },
    'the window records when it opened, when it closes and what it covered',
  )
  assert.equal(win[0].actor, 'system', 'the loop opened the window')
  ok('the window record says when attention opens again')
}

// 8. flushDeferred: checkpoints held past their window leave once
function flushHarness() {
  const events = []
  const prompts = []
  const ledger = {
    all: () => events.map((e, i) => ({ ...e, seq: i + 1 })),
    append: (type, data, actor) => {
      events.push({ type, data, actor })
      return { seq: events.length }
    },
  }
  const ctx = {
    sessionController: {
      async prompt(req) {
        prompts.push(req)
        return { accepted: true }
      },
    },
  }
  const view = {
    ledger,
    state: { id: 'attn', status: 'running', initiator: 'sess-main', rounds: [], budget: { rounds: 10, usd: 5, spentUsd: 0.25 }, checkpoints: [] },
  }
  return { ctx, view, prompts, events }
}

{
  const h = flushHarness()
  const now = 100_000
  h.events.push({ type: 'checkpoint.deferred', actor: 'system', data: { id: 'loom-cp-cp-1', checkpointId: 'cp-1', kind: 'gate', payload: { patch: '/tmp/a.patch' }, sessionId: 'sess-main', deferredUntil: now - 10, at: now - 1000 } })
  h.events.push({ type: 'checkpoint.deferred', actor: 'system', data: { id: 'loom-cp-cp-2', checkpointId: 'cp-2', kind: 'budget', payload: {}, sessionId: 'sess-main', deferredUntil: now - 5, at: now - 900 } })
  const out = await flushDeferred(h.ctx, { view: h.view, config: { checkpoint: { batch: { windowMs: 60_000 } } }, now })
  assert.equal(out.delivered.length, 2, 'both due checkpoints are delivered')
  assert.equal(h.prompts.length, 1, 'they leave as one digest')
  const text = h.prompts[0].content[0].text
  assert.ok(text.includes('cp-1') && text.includes('cp-2'), 'the digest names both held checkpoints')
  assert.ok(text.includes('a passing patch is waiting for review'), 'the digest labels the kinds')
  assert.equal(h.prompts[0].requestId, `loom-cp-digest-${now.toString(36)}-3`, 'the digest request id counts the log')
  const win = h.events.filter((e) => e.type === 'checkpoint.window')
  assert.equal(win.length, 1)
  assert.equal(win[0].data.count, 2, 'the window covers both flushed checkpoints')
  const notified = h.events.filter((e) => e.type === 'checkpoint.notified')
  assert.deepEqual(notified.map((e) => e.data.checkpointId).sort(), ['cp-1', 'cp-2'], 'both are marked notified')
  const again = await flushDeferred(h.ctx, { view: h.view, config: { checkpoint: { batch: { windowMs: 60_000 } } }, now: now + 1000 })
  assert.equal(again.delivered.length, 0, 'a flushed checkpoint never leaves twice')
  ok('held checkpoints that came due together leave as one digest')
}

// 9. flushDeferred leaves a checkpoint that is not due yet
{
  const h = flushHarness()
  const now = 50_000
  h.events.push({ type: 'checkpoint.deferred', actor: 'system', data: { id: 'loom-cp-cp-1', checkpointId: 'cp-1', kind: 'gate', payload: {}, sessionId: 'sess-main', deferredUntil: now + 60_000, at: now - 1000 } })
  const early = await flushDeferred(h.ctx, { view: h.view, config: { checkpoint: { batch: { windowMs: 60_000 } } }, now })
  assert.equal(early.delivered.length, 0, 'nothing leaves before its window closes')
  assert.equal(h.prompts.length, 0)
  const due = await flushDeferred(h.ctx, { view: h.view, config: { checkpoint: { batch: { windowMs: 60_000 } } }, now: now + 60_000 })
  assert.equal(due.delivered.length, 1, 'it leaves when its window closes')
  assert.equal(h.prompts[0].requestId, 'loom-cp-cp-1', 'a single flush keeps the held notification id')
  assert.equal(due.delivered[0].checkpointId, 'cp-1')
  ok('flushDeferred leaves a checkpoint that is not due yet')
}

console.log(`\n${pass}/${pass} passed`)
