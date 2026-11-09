// Seen live (2026-11-10, loom-acc2 and loom-acc1): of ten new child sessions,
// five ended with a *turn* error — four of them the provider emitting two
// tool-call JSON objects glued together ("Tool call \"read\": Unexpected
// non-whitespace character after JSON at position 123"), one a context-length
// 400. None of that reached the dispatcher: it saw `{stopReason:'error'}` with no
// diagnostic, at 15–30 s, so the round recorded `failureKind:'died'` and charged
// the task for a broken model layer.
//
// The existing rule only retried a silent error delivered in under three seconds,
// on the theory that a fast silence means a dead parent. But silence is silence:
// a turn that ended in error without saying anything is not evidence about the
// task at any duration, and the attempt it destroys costs ten minutes of wall
// clock. Retry it once.
import assert from 'node:assert/strict'

import { Dispatcher } from '../../src/dispatch/session.js'

function fakeCtx({ behaviors }) {
  const calls = []
  let parents = 0
  const services = {
    sessionController: { resolveAgent: () => null },
    agentLoop: {
      createAgent: async () => {
        parents += 1
        return { agent: { id: `parent-${parents}` }, dispose: async () => {} }
      },
    },
    subagents: {
      startActivation(spec) {
        const behavior = behaviors[calls.length] ?? behaviors[behaviors.length - 1]
        calls.push({ parent: spec.request?.parent?.id, label: spec.label })
        return {
          childId: `child-${calls.length}`,
          result:
            behavior.delayMs > 0
              ? new Promise((resolve) => setTimeout(() => resolve(behavior.result), behavior.delayMs))
              : Promise.resolve(behavior.result),
          dispose() {},
        }
      },
      interrupt() {},
    },
  }
  return { ctx: { get: (name) => services[name] }, calls, parents: () => parents }
}

const okResult = { output: [{ type: 'text', text: 'done' }], stopReason: 'completed' }
const silentError = { output: [], stopReason: 'error' }

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. A slow silent error is retried once: fifteen seconds of work that ended with
//    no reason is a broken model layer, not a wrong answer, and the round must not
//    be charged for it.
{
  const { ctx, calls } = fakeCtx({
    behaviors: [
      { delayMs: 3200, result: silentError },
      { delayMs: 0, result: okResult },
    ],
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'go' }], { cwd: '/tmp' })
  assert.equal(res.stopReason, 'completed', 'the retry produced work')
  assert.equal(res.infraRetry, true, 'the result says the first dispatch was infrastructure')
  assert.equal(calls.length, 2, 'exactly one retry')
  assert.equal(calls[0].label, calls[1].label, 'and it is the same attempt, retried - not a second attempt')
  ok('a slow silent error is retried once')
  await d.dispose()
}

// 2. Silence twice is still a failure, said out loud, and not retried a third time.
{
  const { ctx, calls } = fakeCtx({ behaviors: [{ delayMs: 3200, result: silentError }] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'go' }], { cwd: '/tmp' })
  assert.equal(res.failureKind, 'died')
  assert.equal(calls.length, 2, 'one retry, then stop')
  assert.ok(res.error && /no diagnostic/.test(res.error), 'the failure names the silence')
  ok('silence twice fails once, with a reason')
  await d.dispose()
}

// 3. A diagnosed failure is still not retried: the child told us what went wrong,
//    and retrying a broken patch only doubles the bill.
{
  const { ctx, calls } = fakeCtx({
    behaviors: [{ delayMs: 3200, result: { output: [], stopReason: 'error', diagnostic: 'child process exited with code 3' } }],
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'go' }], { cwd: '/tmp' })
  assert.equal(res.failureKind, 'died')
  assert.equal(calls.length, 1, 'a diagnosed crash is not retried')
  assert.equal(res.error, 'child process exited with code 3')
  ok('a diagnosed crash is not retried')
  await d.dispose()
}

// 4. The retry is paid once per attempt, not once per model in the chain: a
//    two-model chain that dies silently on the first model must not retry it twice.
{
  const { ctx, calls } = fakeCtx({ behaviors: [{ delayMs: 3200, result: silentError }] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'go' }], { cwd: '/tmp', models: ['m-a', 'm-b'] })
  assert.equal(res.failureKind, 'died')
  assert.equal(calls.length, 2, `two dispatches total, got ${calls.length}`)
  ok('the retry budget is per attempt, not per model')
  await d.dispose()
}

console.log(`\n${pass}/${pass} passed`)
