// A checkpoint raised at 03:00 must reach the human at 08:00, not wake them up.
// Returning "quiet hours, did not deliver" is only half the promise: something
// has to remember the message and deliver it once the window closes.
//
//   node tests/self4/deferred-delivery.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'

const notify = await import('../../src/runtime/notify.js')

let failed = 0
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok - ${name}`)
  else {
    failed += 1
    console.log(`not ok - ${name}${detail ? ` (${detail})` : ''}`)
  }
}

const home = mkdtempSync(join(tmpdir(), 'loom-deferred-'))
const config = normalizeConfig({ checkpoint: { quietHours: { start: '23:00', end: '07:00' } } })
const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
const view = runtime.create({ id: 'deferred-campaign', objective: 'x', workspace: home, initiator: 'session-main' })
runtime.append(view, 'campaign.status', { status: 'running' })

const prompts = []
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

// 03:00 — inside quiet hours. The notification is remembered, not sent.
const at3 = new Date('2026-11-07T03:00:00+08:00').getTime()
const first = await notify.notifyCheckpoint(ctx, {
  view: runtime.get('deferred-campaign'),
  kind: 'gate',
  payload: { checkpoint: 'cp-test', message: 'a patch is waiting' },
  config,
  now: at3,
})
check('quiet hours are not delivered immediately', first.delivered === false)
check('the reason says why', first.reason === 'quiet-hours', JSON.stringify(first))
check('nothing was sent to the session yet', prompts.length === 0, `got ${prompts.length}`)
check('the delivery time is recorded', typeof first.deferredUntil === 'number' && first.deferredUntil > at3, JSON.stringify(first.deferredUntil))

check('flushDeferred exists', typeof notify.flushDeferred === 'function')

// 06:00 — still inside the window: nothing may be sent.
if (typeof notify.flushDeferred === 'function') {
  const at6 = new Date('2026-11-07T06:00:00+08:00').getTime()
  await notify.flushDeferred(ctx, { view: runtime.get('deferred-campaign'), config, now: at6, log: () => {} })
  check('before the window closes nothing is sent', prompts.length === 0, `got ${prompts.length}`)

  // 07:30 — window closed: exactly one delivery.
  const at730 = new Date('2026-11-07T07:30:00+08:00').getTime()
  const flushed = await notify.flushDeferred(ctx, { view: runtime.get('deferred-campaign'), config, now: at730, log: () => {} })
  check('the held message is delivered after the window', prompts.length === 1, `got ${prompts.length}`)
  check('flush reports what it delivered', Array.isArray(flushed?.delivered) && flushed.delivered.length === 1, JSON.stringify(flushed))
  check('the delivered text is the held checkpoint', String(prompts[0]?.content?.[0]?.text || '').includes('a patch is waiting'))

  // A second flush must not send it twice.
  await notify.flushDeferred(ctx, { view: runtime.get('deferred-campaign'), config, now: at730 + 60_000, log: () => {} })
  check('a second flush does not resend', prompts.length === 1, `got ${prompts.length}`)
}

// Outside quiet hours the message goes out immediately, as before.
const promptsBefore = prompts.length
const at10 = new Date('2026-11-07T10:00:00+08:00').getTime()
const direct = await notify.notifyCheckpoint(ctx, {
  view: runtime.get('deferred-campaign'),
  kind: 'gate',
  payload: { checkpoint: 'cp-test-2', message: 'daytime notice' },
  config,
  now: at10,
})
check('outside quiet hours delivery is immediate', direct.delivered === true, JSON.stringify(direct))
check('the daytime notice reached the session', prompts.length === promptsBefore + 1)

assert.ok(true)
console.log(failed === 0 ? '\ndeferred delivery: ok' : `\ndeferred delivery: ${failed} failed`)
process.exitCode = failed === 0 ? 0 : 1
