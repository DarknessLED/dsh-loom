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
import { notifyCheckpoint } from '../../src/runtime/notify.js'

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

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
