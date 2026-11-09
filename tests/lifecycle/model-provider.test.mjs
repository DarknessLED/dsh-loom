// A model chain that cannot change provider is a chain that cannot escape a bad
// provider — which is exactly what a fallback is for.
//
// The host spawns a child with `agentOptions: {provider?, model?}`, two separate
// fields. This dispatcher only ever set `model`, so a fallback entry naming a
// model that lives on another provider was still dispatched to the default
// provider: the log said "tried m-b", the bill said "asked the same provider
// twice". Today's provider ended turns with glued-together tool-call JSON, so
// the fallback is the one mechanism that could have carried the loop through it.
//
// Rule: a chain entry is either a bare model name (the host's default provider
// stands, unchanged) or `provider/model`, and the second form must reach
// agentOptions as two fields.
import assert from 'node:assert/strict'
import { Dispatcher, parseModelRef } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

// 1. Parsing is unambiguous, and silence is not a provider.
{
  assert.deepEqual(parseModelRef('deepseek-v4.1-flash'), { provider: null, model: 'deepseek-v4.1-flash' })
  assert.deepEqual(parseModelRef('open-design/deepseek-v4.1-flash'), {
    provider: 'open-design',
    model: 'deepseek-v4.1-flash',
  })
  // A model id may itself contain a slash (command-code's ids look like
  // `deepseek/deepseek-v4.1-flash`), so only the *first* segment is the provider
  // when a provider is named explicitly with two parts.
  assert.deepEqual(parseModelRef('command-code/deepseek/deepseek-v4.1-flash'), {
    provider: 'command-code',
    model: 'deepseek/deepseek-v4.1-flash',
  })
  assert.deepEqual(parseModelRef(''), { provider: null, model: null })
  assert.deepEqual(parseModelRef(null), { provider: null, model: null })
  assert.deepEqual(parseModelRef('/model'), { provider: null, model: 'model' })
  assert.deepEqual(parseModelRef('provider/'), { provider: null, model: null })
  ok('a ref is provider/model, and a bare name keeps the default provider')
}

// A fake host: one spawn per call, recording exactly what it was asked for.
function fakeCtx({ results }) {
  const calls = []
  const parents = []
  let i = 0
  const root = { id: 'root' }
  return {
    calls,
    parents,
    ctx: {
      get: (name) => {
        if (name === 'sessionController') return { resolveAgent: async () => ({ agent: root }) }
        // A silent death makes the dispatcher forget its parent and build a new
        // one, so the fake has to be able to hand out a second, distinct agent —
        // otherwise the retry cannot happen at all.
        if (name === 'agentLoop') {
          return {
            createAgent: async () => {
              const agent = { id: 'owned-' + (parents.length + 1) }
              parents.push(agent)
              return { agent, dispose() {} }
            },
          }
        }
        if (name === 'subagents') {
          return {
            startActivation: async (spec) => {
              calls.push({ label: spec.label, agentOptions: spec.request.agentOptions, parent: spec.request.parent })
              const out = results[Math.min(i, results.length - 1)]
              i += 1
              return {
                childId: 'child-' + i,
                result: Promise.resolve(out),
                dispose() {},
              }
            },
          }
        }
        return undefined
      },
    },
  }
}

// 2. A cross-provider fallback reaches the host as two fields.
{
  const { ctx, calls } = fakeCtx({
    results: [
      { output: [], stopReason: 'error', diagnostic: null }, // silent death -> one retry on the same model
      { output: [], stopReason: 'error', diagnostic: null }, // still dead -> this model is unusable
      { output: [{ type: 'text', text: 'done' }], stopReason: 'completed' }, // the next provider works
    ],
  })
  const d = new Dispatcher({ ctx, config: { models: { worker: 'default-w' } }, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', {
    cwd: 'C:/tmp',
    timeoutMs: 5000,
    label: 'attempt',
    models: ['open-design/deepseek-v4.1-flash', 'command-code/deepseek/deepseek-v4.1-flash'],
  })
  assert.equal(res.stopReason, 'completed')
  assert.deepEqual(
    calls.map((c) => c.agentOptions),
    [
      { provider: 'open-design', model: 'deepseek-v4.1-flash' },
      { provider: 'open-design', model: 'deepseek-v4.1-flash' },
      { provider: 'command-code', model: 'deepseek/deepseek-v4.1-flash' },
    ],
    'the second model must go to the provider that actually hosts it',
  )
  assert.deepEqual(res.modelsTried, ['open-design/deepseek-v4.1-flash', 'command-code/deepseek/deepseek-v4.1-flash'])
  ok('a cross-provider fallback is dispatched to the provider that hosts it')
}

// 3. A bare name must not grow a provider: an invented provider is a silent
//    redirect, and the host default is the only correct answer there.
{
  const { ctx, calls } = fakeCtx({ results: [{ output: [], stopReason: 'completed' }] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt', model: 'plain-model' })
  assert.deepEqual(calls[0].agentOptions, { model: 'plain-model' })
  ok('a bare model name leaves the provider to the host')
}

// 4. No model at all still means "whatever the host defaults to" — the
//    agentOptions must be absent rather than empty, which the API treats as
//    "nothing to say" instead of "no options".
{
  const { ctx, calls } = fakeCtx({ results: [{ output: [], stopReason: 'completed' }] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt' })
  assert.equal(calls[0].agentOptions, undefined)
  ok('with no model the host keeps its own default')
}

console.log(`\n${pass}/4 passed`)
assert.ok(pass === 4)
