// Seen live (loom-life, 14 rounds): every attempt came back
// `{stopReason:'error', failureKind:'died', error:null}` in about 900 ms, and the
// recon node in about 500 ms. Nothing in the ledger said why, and the campaign
// spent its whole round budget charging the task for an infrastructure fault -
// after a host restart the cached parent agent stays addressable while every child
// it spawns dies immediately.
//
// An error with nothing to say, delivered fast, is not a failed task. The
// dispatcher must rebuild its parent once and retry, and must never record a null
// reason.
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

// 1. A silent, instant error is an infrastructure fault: rebuild the parent and
//    retry once. The round gets a real answer instead of a 0.
{
  const { ctx, calls, parents } = fakeCtx({
    behaviors: [
      { delayMs: 0, result: silentError },
      { delayMs: 0, result: okResult },
    ],
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'go' }], { cwd: '/tmp' })
  assert.equal(res.stopReason, 'completed', 'the retry produced work')
  assert.equal(res.infraRetry, true, 'the result says the first attempt was infrastructure')
  assert.equal(calls.length, 2, 'exactly one retry')
  assert.equal(parents(), 2, 'the parent was rebuilt before the retry')
  assert.notEqual(calls[0].parent, calls[1].parent, 'and it is a different parent')
  ok('a silent instant error rebuilds the parent and retries once')
  await d.dispose()
}

// 2. If the retry also dies silently, the attempt fails - but with a reason
//    someone can act on, and without looping forever.
{
  const { ctx, calls } = fakeCtx({ behaviors: [{ delayMs: 0, result: silentError }] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'go' }], { cwd: '/tmp' })
  assert.equal(res.stopReason, 'error')
  assert.equal(res.failureKind, 'died')
  assert.equal(calls.length, 2, 'one retry, not an infinite loop')
  assert.ok(res.error, 'the failure carries a reason instead of null')
  ok('a repeat infrastructure failure is reported with a reason, once')
  await d.dispose()
}

// 3. A real error that took time and said something is not retried: retrying a
//    broken patch would just double the bill.
{
  const { ctx, calls } = fakeCtx({
    behaviors: [{ delayMs: 30, result: { output: [], stopReason: 'error', diagnostic: 'child process exited with code 3' } }],
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'go' }], { cwd: '/tmp' })
  assert.equal(res.failureKind, 'died')
  assert.equal(calls.length, 1, 'a diagnosed crash is not retried')
  assert.equal(res.error, 'child process exited with code 3')
  ok('a diagnosed crash is not retried')
  await d.dispose()
}

console.log(`\n${pass}/${pass} passed`)
