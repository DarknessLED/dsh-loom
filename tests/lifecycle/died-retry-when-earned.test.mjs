// The rebuild-and-retry on a silent death was a coin flip nobody measured.
//
// After a host restart the dispatcher assumed a stale parent handle was the
// problem, rebuilt it, and re-sent the same prompt to the same model. Across 22
// campaigns that fired 32 times and converted a silent death into a working child
// exactly never. What the ledger does show is a shape: of the 145 silent deaths,
// 93 lasted under three seconds -- a provider refusing before the child did any
// work -- and 47 ran for ten seconds or more, which is a turn that wedged.
//
// Rule: the rebuild is only spent where it can plausibly help. A death that
// happened before `session.diedRetryMs` of work was refused, not wedged, and gets
// no second child. `diedRetryMs: 0` restores the unconditional retry.
import assert from 'node:assert/strict'
import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const SILENT = { output: [], stopReason: 'error', diagnostic: null }
const DONE = { output: [{ type: 'text', text: 'ok' }], stopReason: 'completed' }

/**
 * A child whose own clock we control. `delays[i]` is how long the i-th child lives
 * before it answers -- the dispatcher measures that, so a fake that answers
 * instantly looks like a refusal every time, which is a different scenario.
 */
function fakeCtx({ results, delays = [] }) {
  const calls = []
  let i = 0
  const root = { id: 'root' }
  const services = {
    sessionController: { resolveAgent: async () => ({ agent: root }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'owned' + calls.length }, dispose() {} }) },
    subagents: {
      startActivation: async (spec) => {
        calls.push({ agentOptions: spec.request.agentOptions })
        const out = results[Math.min(i, results.length - 1)]
        const delay = Number(delays[Math.min(i, delays.length - 1)] ?? 0) || 0
        i += 1
        const result = delay > 0 ? new Promise((r) => setTimeout(() => r(out), delay)) : Promise.resolve(out)
        return { childId: 'child-' + i, result, dispose() {} }
      },
    },
  }
  return { calls, ctx: { get: (n) => services[n] } }
}

// Run one attempt and report how long the dispatcher believed each child lived.
async function runOnce({ results, config, models, delays }) {
  const { ctx, calls } = fakeCtx({ results, delays })
  const d = new Dispatcher({ ctx, config, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt', ...(models ? { models } : { model: 'only-model' }) })
  return { res, calls }
}

// 1. A death that lasted a moment is a refusal, and is not re-asked. The default
//    gate is 60 s; this child gave up immediately.
{
  const { res, calls } = await runOnce({
    results: [SILENT, DONE],
    delays: [0],
    config: { session: { diedRetryMs: 60_000 } },
  })
  assert.equal(calls.length, 1, 'a one-second refusal buys one child, not two')
  assert.equal(res.failureKind, 'died', 'and it is still reported as a death')
  assert.equal(res.infraRetry, undefined, 'no rebuild was paid for')
  ok('a death too quick to be a wedge is not retried')
}

// 2. A death after the gate is a wedged turn, so the one retry is spent -- and it
//    says so on the result.
{
  const { res, calls } = await runOnce({
    results: [SILENT, DONE],
    // A child that worked for a moment before dying, judged against a 1 ms gate.
    delays: [35],
    config: { session: { diedRetryMs: 1 } },
  })
  assert.equal(calls.length, 2, 'a wedged turn gets its retry')
  assert.equal(res.stopReason, 'completed', 'and the retry is what returned')
  assert.equal(res.infraRetry, true, 'the retry is labelled infrastructure')
  ok('a death after real work keeps its one retry')
}

// 3. The knob is a permission, not a policy: 0 restores the old unconditional
//    retry, which is the escape hatch if the gate ever misfires.
{
  const { calls } = await runOnce({
    results: [SILENT, DONE],
    delays: [0],
    config: { session: { diedRetryMs: 0 } },
  })
  assert.equal(calls.length, 2, 'zero disables the gate')
  ok('diedRetryMs: 0 keeps the unconditional retry available')
}

// 4. A chain with somewhere else to go still goes there instead of rebuilding --
//    the gate must not re-open the blind retry for chained models.
{
  const { calls } = await runOnce({
    results: [SILENT, DONE],
    config: { session: { diedRetryMs: 0 } },
    models: ['a/one', 'b/two'],
  })
  assert.equal(calls.length, 2, 'one child per model')
  assert.deepEqual(calls.map((c) => c.agentOptions?.model), ['one', 'two'], 'the second child is the other model')
  ok('a chain with another model never spends the retry on the dead one')
}

console.log(`\n${pass}/4 passed`)
assert.equal(pass, 4)
