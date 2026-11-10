// Spending the retry on the model that just died is spending it on the wrong thing.
//
// After a host restart the dispatcher rebuilds its parent agent and re-sends the
// same prompt to the same model, on the theory that a stale parent handle was the
// problem. The ledger says otherwise: across 22 campaigns, `infra:true` appears 32
// times and `infraRetry:true` 32 times, and every one of the 32 carries the same
// empty-diagnostic error -- the retry never once converted a silent death into a
// working child. It did spawn 32 extra children for nothing.
//
// Rule: when the chain holds another model, a silent death moves to it instead of
// re-asking the same one. The retry is reserved for the case where it is the last
// thing the attempt has, which is also the only case where a stale parent is the
// remaining suspect.
import assert from 'node:assert/strict'
import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const SILENT = { output: [], stopReason: 'error', diagnostic: null }
const DONE = { output: [{ type: 'text', text: 'ok' }], stopReason: 'completed' }

function fakeCtx({ results }) {
  const calls = []
  let i = 0
  const root = { id: 'root' }
  const services = {
    sessionController: { resolveAgent: async () => ({ agent: root }) },
    agentLoop: {
      createAgent: async () => ({ agent: { id: 'owned' + calls.length }, dispose() {} }),
    },
    subagents: {
      startActivation: async (spec) => {
        calls.push({ agentOptions: spec.request.agentOptions })
        const out = results[Math.min(i, results.length - 1)]
        i += 1
        return { childId: 'child-' + i, result: Promise.resolve(out), dispose() {} }
      },
    },
  }
  return { calls, ctx: { get: (n) => services[n] } }
}

// 1. With a second model in the chain, a silent death goes there -- not back to
//    the same model, and not through a parent rebuild.
{
  const { ctx, calls } = fakeCtx({ results: [SILENT, DONE] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', {
    cwd: 'C:/tmp',
    timeoutMs: 5000,
    label: 'attempt',
    models: ['open-design/deepseek-v4.1-flash', 'command-code/deepseek/deepseek-v4.1-flash'],
  })
  assert.equal(calls.length, 2, 'exactly one child per model: the dead one is not re-asked')
  assert.deepEqual(
    calls.map((c) => c.agentOptions?.model),
    ['deepseek-v4.1-flash', 'deepseek/deepseek-v4.1-flash'],
    'the second child belongs to the other model',
  )
  assert.equal(res.stopReason, 'completed')
  assert.equal(res.infraRetry, undefined, 'no parent rebuild was paid for')
  ok('a silent death moves to the next model instead of re-asking the same one')
}

// 2. With only one model, the retry is all the attempt has, so it stays.
{
  const { ctx, calls } = fakeCtx({ results: [SILENT, DONE] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt', model: 'only-model' })
  assert.equal(calls.length, 2, 'the single-model attempt still gets its one retry')
  assert.deepEqual(calls.map((c) => c.agentOptions?.model), ['only-model', 'only-model'])
  assert.equal(res.stopReason, 'completed')
  assert.equal(res.infraRetry, true, 'and it says the retry was an infrastructure retry')
  ok('a lone model keeps its one retry')
}

// 3. Every model silent: the attempt still reports one child per model, and the
//    retry is not spent twice on the way out.
{
  const { ctx, calls } = fakeCtx({ results: [SILENT] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', {
    cwd: 'C:/tmp',
    timeoutMs: 5000,
    label: 'attempt',
    models: ['a/one', 'b/two'],
  })
  assert.equal(calls.length, 2, 'two models, two children, no hidden third')
  assert.equal(res.failureKind, 'died')
  assert.equal(res.infra, true, 'a silent death stays an infrastructure fact')
  assert.deepEqual(res.modelsTried, ['a/one', 'b/two'])
  ok('a chain where everything is silent costs one child per model')
}

console.log(`\n${pass}/3 passed`)
assert.equal(pass, 3)
