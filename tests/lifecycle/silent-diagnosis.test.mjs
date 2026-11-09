// A child session that ends in error usually *does* have a diagnosis — it is
// just not on the object `subagents.startActivation` hands back. The child's own
// session log records it: `turn/end` carries `reason.error.message`.
//
// Seen live (loom-acc3/acc4/acc5, 30+ attempts): the model emits two tool-call
// JSON objects glued together and the turn dies with
//
//   Tool call "read": Unexpected non-whitespace character after JSON at position 117
//
// while the dispatcher records only
//
//   child session ended in error with no diagnostic (parent or provider unavailable)
//
// so every round looks like a dead parent, the operator has nothing to act on,
// and a model-limit failure cannot even be classified as one (which means the
// model fallback chain never fires).
//
// Required: when a child ends in error without a diagnostic, the dispatcher
// reads the child's own session log and adopts the last `turn/end` error
// message as its `error`. The attempt stays `infra` (the provider broke, the
// task was never attempted), but it is no longer unexplained.
import assert from 'node:assert/strict'

import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const GLUED = 'Tool call "read": Unexpected non-whitespace character after JSON at position 117 (line 1 column 118)'

function harness({ events = [], result = null, results = null } = {}) {
  const calls = []
  let n = 0
  const services = {
    subagents: {
      startActivation: async (spec) => {
        calls.push({ spec })
        const childId = `child-${(n += 1)}`
        const payload = results
          ? results[Math.min(calls.length - 1, results.length - 1)]
          : result ?? { output: [], stopReason: 'error', diagnostic: null }
        return { childId, result: Promise.resolve(payload), dispose: async () => {} }
      },
      interrupt: () => {},
    },
    sessions: {
      get: (id) => ({
        seq: events.length,
        snapshotEvents: () => events,
        // The session log is per-child; a child with no events says nothing.
        id,
      }),
    },
    agentLoop: {
      createAgent: async () => ({ agent: { id: 'parent-agent' }, dispose: async () => {} }),
    },
    sessionController: {},
  }
  const ctx = { get: (name) => services[name] }
  const dispatcher = new Dispatcher({ ctx, config: { models: { worker: 'm-a' } }, log: () => {} })
  return { dispatcher, calls }
}

const turnEnd = (message) => ({
  type: 'turn/end',
  data: { turn: 1, reason: { kind: 'error', error: { message, code: 'MALFORMED_RESPONSE' } } },
})

// ---------------------------------------------------------------------------
// 1. The child's own log supplies the diagnosis
// ---------------------------------------------------------------------------
{
  const h = harness({ events: [{ type: 'step/start', data: {} }, turnEnd(GLUED)] })
  const res = await h.dispatcher.run('do the thing', { cwd: '.', timeoutMs: 60000, label: 'a' })
  assert.equal(res.stopReason, 'error', 'the child ended in error')
  assert.equal(res.infra, true, 'a provider that breaks mid-turn is still infrastructure, not a task verdict')
  assert.match(
    String(res.error),
    /Unexpected non-whitespace character after JSON/,
    'the real message from the child session replaces "no diagnostic"',
  )
  assert.ok(
    !/no diagnostic/.test(String(res.error)),
    `the useless placeholder must not survive a recoverable diagnosis (${res.error})`,
  )
}
ok('a silent death adopts the diagnosis recorded in the child session')

// ---------------------------------------------------------------------------
// 2. With no diagnosis anywhere, the placeholder is honest about that
// ---------------------------------------------------------------------------
{
  const h = harness({ events: [] })
  const res = await h.dispatcher.run('do the thing', { cwd: '.', timeoutMs: 60000, label: 'a' })
  assert.equal(res.infra, true, 'still infrastructure')
  assert.match(
    String(res.error),
    /no diagnostic/,
    'a child that truly said nothing must keep saying so — silence must not be dressed up',
  )
}
ok('a child with nothing to say keeps the honest placeholder')

// ---------------------------------------------------------------------------
// 3. A recovered model-limit message makes the fallback chain reachable
// ---------------------------------------------------------------------------
{
  const limit = "This model's maximum context length is 65536 tokens"
  const silent = { output: [], stopReason: 'error', diagnostic: null }
  // One silent death, one silent retry on the rebuilt parent, then the fallback
  // model answers. Three children is the budget: the per-attempt retry, then the
  // next model in the chain.
  const h = harness({
    events: [turnEnd(limit)],
    results: [silent, silent, { output: [{ type: 'text', text: 'done' }], stopReason: 'completed', diagnostic: null }],
  })
  const res = await h.dispatcher.run('do the thing', {
    cwd: '.',
    timeoutMs: 60000,
    label: 'a',
    models: ['m-a', 'm-b'],
  })
  assert.equal(res.model, 'm-b', 'a context-limit failure recovered from the child log falls over to the next model')
  assert.equal(res.failureKind, 'ok', 'and the second model succeeds')
  assert.deepEqual(res.modelsTried, ['m-a', 'm-b'], 'the ledger names both models that were spent')
}
ok('a diagnosis recovered from the child log lets the model chain work')

// ---------------------------------------------------------------------------
// 4. The diagnosis is read only for silent deaths, never to overwrite a real one
// ---------------------------------------------------------------------------
{
  const h = harness({
    events: [turnEnd(GLUED)],
    result: { output: [], stopReason: 'error', diagnostic: 'the verifier command is wrong' },
  })
  const res = await h.dispatcher.run('do the thing', { cwd: '.', timeoutMs: 60000, label: 'a' })
  assert.equal(res.error, 'the verifier command is wrong', 'a diagnosis the child already gave is not overwritten')
  assert.ok(!res.infra, 'and a diagnosed failure is a verdict on the work, not infrastructure')
}
ok('a real diagnosis is never replaced by the session log')

console.log(`\n${pass}/${pass} passed`)
