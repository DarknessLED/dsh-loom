// A model that burns its whole slice without answering must not spend the round.
//
// Seen live (loom-acc6 rounds 4-9): twelve attempts on
// `open-design/deepseek-v4.1-flash` each ran the full 600 s and reported
// `failureKind: 'timeout'`, while `command-code/deepseek/deepseek-v4.1-flash` sat
// unused in `campaign.policy.models.fallback`. Five of those twelve had already
// written a patch; the loop cancelled them after the slow provider never returned.
//
// The dispatcher used to treat `timeout` as "not a model problem", because a
// fallback used to start with a fresh full budget - the bill doubles and the
// round deadline is already gone. Both halves of that reasoning have an answer:
// the attempt's own wall clock becomes the ceiling for the whole chain, and the
// round discards a late win either way. So a timeout belongs with `context` and
// `tokens`: this model could not be used.
//
// The four rules this file pins:
//   1. without a reserve the first model owns the clock, and a hung one is
//      reported as a timeout - never silently upgraded into a second child that
//      has no time to work
//   2. with `session.fallbackReserveMs` the first model is cut short, leaving the
//      next one a slice it can actually finish in
//   3. one attempt never costs more than `timeoutMs`, no matter how long the chain
//   4. a chain that ends in timeouts still reports `timeout` with `timedOut: true`,
//      so pause and retry accounting keep seeing it as a real timeout
import assert from 'node:assert/strict'

import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const prompt = [{ type: 'text', text: 'do it' }]

// The dispatcher's own deadline timer is `unref()`d on purpose: a background loop
// must not hold the host open. In a test that leaves the event loop empty, so the
// deadline would never fire and the await would never settle. One interval keeps
// the loop alive for the duration of this file and is cleared at the end.
const keepAlive = setInterval(() => {}, 1000)

// Numbers of seconds, not milliseconds, because `#one` clamps every slice to at
// least 1000 ms (a child cannot usefully be given less). These budgets are the
// smallest that keep the clamp out of the way while the test still runs in ~2 s.
const MIN = 500

// Each model either hangs until its slice expires or answers immediately.
function host(byModel) {
  const calls = []
  const services = {
    sessionController: { resolveAgent: () => ({ agent: { id: 'parent' } }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'parent' }, dispose: async () => {} }) },
    subagents: {
      startActivation(spec) {
        const model = spec.request?.agentOptions?.model ?? null
        const behaviour = byModel[model] ?? 'hang'
        calls.push({ model })
        const result = new Promise((resolve) => {
          if (behaviour === 'work') {
            resolve({ output: [{ type: 'text', text: 'done' }], stopReason: 'completed' })
            return
          }
          spec.signal?.addEventListener?.('abort', () => resolve({ output: [], stopReason: 'aborted', timedOut: true }))
        })
        return { childId: `child-${calls.length}`, result, dispose() {} }
      },
      interrupt() {},
    },
  }
  return { ctx: { get: (name) => services[name] }, calls }
}

// 1. No reserve, the first model hangs: the attempt is a timeout and the second
//    model is never spawned, because it would have had no usable slice.
{
  const { ctx, calls } = host({ 'm-a': 'hang', 'm-b': 'work' })
  const d = new Dispatcher({ ctx, config: { models: {} }, log: () => {} })
  const started = Date.now()
  const res = await d.run(prompt, { cwd: '/tmp', models: ['m-a', 'm-b'], timeoutMs: 1200 })
  const elapsed = Date.now() - started
  assert.equal(res.timedOut, true, 'the attempt is a timeout, not a silent death')
  assert.equal(res.failureKind, 'timeout')
  assert.deepEqual(res.modelsTried, ['m-a'], 'with no reserve there is no slice left to give m-b')
  assert.ok(
    calls.every((c) => c.model !== 'm-b'),
    'the second model was never dispatched, because it would have had no time to work',
  )
  assert.ok(elapsed < 3000, `one attempt costs one budget, not one per model (took ${elapsed}ms)`)
  ok('without a reserve a hung first model reports a timeout and does not spawn a doomed child')
  await d.dispose()
}

// 2. With a reserve the first model is cut short, leaving the next one a real slice.
{
  const { ctx, calls } = host({ 'm-a': 'hang', 'm-b': 'work' })
  const d = new Dispatcher({
    ctx,
    config: { models: {}, session: { fallbackReserveMs: 1200, minFalloverMs: MIN } },
    log: () => {},
  })
  const started = Date.now()
  const res = await d.run(prompt, { cwd: '/tmp', models: ['m-a', 'm-b'], timeoutMs: 3000 })
  const elapsed = Date.now() - started
  assert.equal(res.stopReason, 'completed', 'the second model finished the work')
  assert.equal(res.model, 'm-b', 'and it says which model did the work')
  assert.deepEqual(res.modelsTried, ['m-a', 'm-b'], 'the ledger keeps the whole path')
  assert.deepEqual(res.modelSwitch, { from: 'm-a', to: 'm-b' })
  assert.ok(
    calls.some((c) => c.model === 'm-b'),
    'the reserving model was actually dispatched',
  )
  assert.ok(elapsed < 4500, `the fallover happens inside one budget (took ${elapsed}ms)`)
  ok('a reserve lets a hung provider fall over inside the same wall clock')
  await d.dispose()
}

// 3. Every model hangs: the chain is exhausted, the answer is still a timeout, and
//    the elapsed wall clock stays inside one budget rather than one per model.
{
  const { ctx, calls } = host({ 'm-a': 'hang', 'm-b': 'hang' })
  const d = new Dispatcher({
    ctx,
    config: { models: {}, session: { fallbackReserveMs: 1200, minFalloverMs: MIN } },
    log: () => {},
  })
  const started = Date.now()
  const res = await d.run(prompt, { cwd: '/tmp', models: ['m-a', 'm-b'], timeoutMs: 3000 })
  const elapsed = Date.now() - started
  assert.equal(res.timedOut, true, 'the attempt is a timeout')
  assert.equal(res.failureKind, 'timeout', 'not "exhausted": no model budget ran out')
  assert.equal(res.modelsTried.length, 2, 'both models were tried')
  assert.ok(calls.length >= 2, 'two children were spawned')
  assert.ok(elapsed < 4500, `every model shares the one budget (took ${elapsed}ms, budget 3000ms)`)
  ok('a chain of timeouts still reports a timeout, inside one budget')
  await d.dispose()
}

// 4. The floor: a fallover with less than `minFalloverMs` left is not worth
//    starting, so the second model must not be spawned at all.
{
  const { ctx, calls } = host({ 'm-a': 'hang', 'm-b': 'work' })
  const d = new Dispatcher({
    ctx,
    config: { models: {}, session: { fallbackReserveMs: 1200, minFalloverMs: 60_000 } },
    log: () => {},
  })
  const res = await d.run(prompt, { cwd: '/tmp', models: ['m-a', 'm-b'], timeoutMs: 2500 })
  assert.equal(res.timedOut, true)
  assert.deepEqual(res.modelsTried, ['m-a'], 'the second model was not given a hopeless slice')
  assert.ok(
    calls.every((c) => c.model !== 'm-b'),
    'no child was spawned that could not have produced a first token',
  )
  ok('a slice below the floor is not offered to another model')
  await d.dispose()
}

clearInterval(keepAlive)
console.log(`\n${pass}/4 passed`)
