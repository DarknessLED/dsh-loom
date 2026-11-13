// Spec: a checkpoint must respect the human's quiet hours.
//
// The loop is supposed to protect human attention. Waking someone at 03:00 for
// a patch review is exactly the failure this product is meant to avoid, so the
// notifier must refuse to deliver inside the configured window and say why.
//
// Required: notifyCheckpoint(ctx, { view, kind, payload, config, now }) where
// config.checkpoint.quietHours = { start: 'HH:MM', end: 'HH:MM' } (overnight
// windows wrap past midnight). Inside the window: { delivered: false,
// reason: 'quiet-hours' } and sessionController.prompt is never called.
// Outside it (or with no quietHours configured): delivered as before.
//
// A held checkpoint is not dropped: it is written to the campaign log as
// `checkpoint.deferred` and flushDeferred() sends it once the window closes,
// recording `checkpoint.notified` so it can never leave twice.
import { notifyCheckpoint, flushDeferred } from '../../src/runtime/notify.js'

let pass = 0
let fail = 0
function ok(cond, name, extra) {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  } else {
    fail += 1
    console.log(`not ok ${pass + fail} - ${name}`)
    if (extra !== undefined) console.log('   ', extra)
  }
}

function harness() {
  const calls = []
  const ctx = {
    sessionController: {
      async prompt(req) {
        calls.push(req)
        return { accepted: true }
      },
    },
  }
  const view = { state: { id: 'c1', status: 'running', rounds: [], budget: { rounds: 10, usd: 5, spentUsd: 0.2 }, initiator: 'sess-1' } }
  return { ctx, calls, view, payload: { id: 'cp-1', patch: 'a.patch' } }
}

function ledgerHarness(promptImpl) {
  const events = []
  const calls = []
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
        calls.push(req)
        if (promptImpl) return promptImpl(req)
        return { accepted: true }
      },
    },
  }
  const view = {
    ledger,
    state: { id: 'c1', status: 'running', rounds: [], budget: { rounds: 10, usd: 5, spentUsd: 0.2 }, initiator: 'sess-1' },
  }
  return { ctx, calls, view, events, ledger }
}

function at(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2026, 0, 15, h, m, 0, 0)
  return d.getTime()
}

const overnight = { checkpoint: { quietHours: { start: '23:00', end: '07:00' } } }

{
  const h = harness()
  const r = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: h.payload, config: overnight, now: at('03:00') })
  ok(r.delivered === false, 'overnight window blocks delivery')
  ok(r.reason === 'quiet-hours', 'reason names the quiet hours', r.reason)
  ok(h.calls.length === 0, 'no prompt is queued while quiet')
}

{
  const h = harness()
  const r = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: h.payload, config: overnight, now: at('09:30') })
  ok(r.delivered === true, 'outside the window it delivers')
  ok(h.calls.length === 1, 'exactly one prompt queued')
}

{
  const h = harness()
  const day = { checkpoint: { quietHours: { start: '12:00', end: '13:00' } } }
  const r = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: h.payload, config: day, now: at('12:30') })
  ok(r.delivered === false && r.reason === 'quiet-hours', 'same-day window blocks delivery')
}

{
  const h = harness()
  const r = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: h.payload, config: { checkpoint: {} }, now: at('03:00') })
  ok(r.delivered === true, 'no quietHours configured still delivers')
}

{
  const h = harness()
  const r = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: h.payload, now: at('03:00') })
  ok(r.delivered === true, 'missing config argument keeps working')
}

// A delivered checkpoint is announced with the human label for its kind and a
// prompt the human can act on; an unnamed checkpoint still gets a stable id.
{
  const h = ledgerHarness()
  const r = await notifyCheckpoint(h.ctx, { view: h.view, kind: 'budget', payload: { message: 'cap reached' }, config: {}, now: 5000 })
  ok(r.delivered === true, 'an unnamed checkpoint still delivers')
  const req = h.calls[0]
  ok(/^loom-cp-[a-z0-9]+-[a-z0-9]+$/.test(req.requestId), 'an unnamed checkpoint gets a generated id', req.requestId)
  const text = req.content[0].text
  ok(text.includes('the campaign hit its spending cap'), 'the prompt uses the human label for the kind', text.split('\n')[0])
  ok(text.includes('campaign: c1 · running · round 0/10 · spend $0.200/$5'), 'the prompt carries the campaign budget line')
  ok(text.includes('cap reached'), 'the prompt carries the message')
  ok(text.includes('Use rsi_status / rsi_report / rsi_control to act.'), 'a non-gate prompt names the tools to act with')
  ok(req.mode === 'queue' && req.sessionId === 'sess-1', 'the prompt is queued on the initiator session')
}

// --- held records and the flush that sends them ---

{
  const h = ledgerHarness()
  const now = at('03:00')
  const r = await notifyCheckpoint(h.ctx, {
    view: h.view,
    kind: 'gate',
    payload: { id: 'cp-1', patch: 'a.patch' },
    config: overnight,
    now,
  })
  ok(r.delivered === false && r.reason === 'quiet-hours', 'a held checkpoint reports why it is held')
  ok(r.deferredUntil === at('07:00'), 'the hold ends when the quiet window closes', r.deferredUntil)
  const held = h.events.filter((e) => e.type === 'checkpoint.deferred')
  ok(held.length === 1, 'exactly one deferred record is written')
  const rec = held[0]?.data ?? {}
  ok(held[0]?.actor === 'system', 'the log says the loop wrote the record')
  ok(rec.id === 'loom-cp-cp-1', 'the notification id is derived from the checkpoint id', rec.id)
  ok(rec.checkpointId === 'cp-1', 'the record keeps the checkpoint id', rec.checkpointId)
  ok(rec.sessionId === 'sess-1', 'the record remembers which session asked', rec.sessionId)
  ok(rec.kind === 'gate' && rec.payload?.patch === 'a.patch', 'the record keeps kind and payload')
  ok(rec.deferredUntil === at('07:00') && rec.at === now, 'the record stamps both instants')

  const early = await flushDeferred(h.ctx, { view: h.view, config: overnight, now: now + 1000 })
  ok(early.delivered.length === 0 && h.calls.length === 0, 'a flush before the window closes sends nothing')

  const out = await flushDeferred(h.ctx, { view: h.view, config: overnight, now: at('07:00') })
  ok(out.delivered.length === 1, 'a flush after the window delivers the held checkpoint', JSON.stringify(out))
  ok(out.delivered[0].id === 'loom-cp-cp-1' && out.delivered[0].checkpointId === 'cp-1', 'the flush reports what it sent')
  ok(h.calls.length === 1 && h.calls[0].requestId === 'loom-cp-cp-1', 'the held prompt keeps its notification id', h.calls[0]?.requestId)
  ok(h.calls[0].content[0].text.includes('a passing patch is waiting for review'), 'the flushed prompt names the reason')
  ok(h.calls[0].content[0].text.includes('patch: a.patch'), 'the flushed prompt carries the patch')
  const notified = h.events.filter((e) => e.type === 'checkpoint.notified')
  ok(
    notified.length === 1 && notified[0].data.id === 'loom-cp-cp-1' && notified[0].data.checkpointId === 'cp-1',
    'the flush records that it went out',
  )
  ok(notified[0].data.at === at('07:00'), 'the notified record is stamped with the flush instant')
  const again = await flushDeferred(h.ctx, { view: h.view, config: overnight, now: at('09:00') })
  ok(again.delivered.length === 0 && h.calls.length === 1, 'a checkpoint leaves exactly once')
}

{
  // A failed delivery stays held and is retried on a later tick.
  const h = ledgerHarness(() => {
    throw new Error('ui down')
  })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-1' }, config: overnight, now: at('03:00') })
  const failed = await flushDeferred(h.ctx, { view: h.view, config: overnight, now: at('07:00') })
  ok(failed.delivered.length === 0, 'a failed flush reports nothing delivered')
  ok(h.events.filter((e) => e.type === 'checkpoint.notified').length === 0, 'a failed flush does not mark the checkpoint notified')
  ok(h.events.some((e) => e.type === 'checkpoint.deferred'), 'the checkpoint is still held for a later tick')
  ok(h.calls.length === 1, 'the flush did try to deliver')
}

{
  // Batching is on too: two held checkpoints that came due together leave as
  // one digest, and the window opens again so the next one waits.
  const h = ledgerHarness()
  const cfg = { checkpoint: { quietHours: { start: '23:00', end: '07:00' }, batch: { windowMs: 60_000 } } }
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-1' }, config: cfg, now: at('03:00') })
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'budget', payload: { id: 'cp-2' }, config: cfg, now: at('03:10') })
  ok(h.calls.length === 0, 'nothing is delivered during quiet hours even with batching')
  const out = await flushDeferred(h.ctx, { view: h.view, config: cfg, now: at('07:00') })
  ok(out.delivered.length === 2, 'a batched flush sends everything due at once', JSON.stringify(out))
  ok(h.calls.length === 1, 'two held checkpoints leave as one prompt')
  const text = h.calls[0].content[0].text
  ok(text.includes('cp-1') && text.includes('cp-2'), 'the digest names both held checkpoints')
  ok(
    text.includes('a passing patch is waiting for review') && text.includes('the campaign hit its spending cap'),
    'the digest labels every kind',
  )
  ok(text.includes('2 waiting, one digest'), 'the digest says how many it covers')
  ok(
    h.calls[0].requestId === `loom-cp-digest-${at('07:00').toString(36)}-3`,
    'the digest request id counts the log',
    h.calls[0].requestId,
  )
  const win = h.events.filter((e) => e.type === 'checkpoint.window')
  ok(
    win.length === 1 &&
      win[0].data.openedAt === at('07:00') &&
      win[0].data.until === at('07:00') + 60_000 &&
      win[0].data.count === 2,
    'a digest opens the next attention window',
    JSON.stringify(win[0]?.data),
  )
  ok(h.events.filter((e) => e.type === 'checkpoint.notified').length === 2, 'both flushed checkpoints are marked notified')
}

{
  // One due record with batching on leaves on its own, then opens the window.
  const h = ledgerHarness()
  const cfg = { checkpoint: { quietHours: { start: '23:00', end: '07:00' }, batch: { windowMs: 60_000 } } }
  await notifyCheckpoint(h.ctx, { view: h.view, kind: 'gate', payload: { id: 'cp-1' }, config: cfg, now: at('03:00') })
  const out = await flushDeferred(h.ctx, { view: h.view, config: cfg, now: at('07:00') })
  ok(out.delivered.length === 1 && h.calls.length === 1, 'a single due checkpoint is delivered on its own')
  ok(h.calls[0].requestId === 'loom-cp-cp-1', 'the single delivery keeps its own id')
  const win = h.events.filter((e) => e.type === 'checkpoint.window')
  ok(win.length === 1 && win[0].data.count === 1, 'even a single flush opens the attention window')
}

{
  // Records of other events, and checkpoints already announced, are not resent.
  const h = ledgerHarness()
  h.events.push({ type: 'round.start', data: {}, actor: 'system' })
  h.events.push({ type: 'checkpoint.notified', data: { id: 'loom-cp-cp-9', checkpointId: 'cp-9' }, actor: 'system' })
  h.events.push({
    type: 'checkpoint.deferred',
    data: { id: 'loom-cp-cp-9', checkpointId: 'cp-9', kind: 'gate', payload: {}, sessionId: 'sess-1', deferredUntil: 0, at: 0 },
    actor: 'system',
  })
  const out = await flushDeferred(h.ctx, { view: h.view, config: {}, now: at('09:00') })
  ok(out.delivered.length === 0 && h.calls.length === 0, 'a checkpoint already announced is never sent twice')
}

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
