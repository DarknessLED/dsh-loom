// Seen live (loom-acc2, rounds 11-18): every attempt died in 1-2 s with
// `child session ended in error with no diagnostic`. The child's own transcript
// shows why - the model emitted two tool-call JSON objects glued together
// (`{"file_path": ...}{"file_path": ...}`) and the parser rejected the turn:
//
//   Tool call "read": Unexpected non-whitespace character after JSON at position 121
//
// That is a provider failure, not a verdict on the task. `Dispatcher` already
// rebuilds the parent and retries once for it - but the budget is a single flag on
// the dispatcher, not per attempt, so after the first retry the campaign had no
// retries left: eight consecutive rounds died instantly and bought nothing.
//
// A retry budget belongs to the attempt that needs it. One retry per `run()` keeps
// the cost bounded (two children, not a loop) while letting a flaky minute not
// poison every later round of the campaign.

import assert from 'node:assert/strict'
import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + pass + ' - ' + name)
}
const done = () => console.log('\n' + pass + '/' + pass + ' passed')

// A host whose children die silently: no diagnostic, no output, instantly. This
// is exactly what the ledger recorded for sixteen consecutive attempts. `fails(n)`
// decides whether the nth child dies, so a host can go bad again later.
function silentHost({ fails = () => true }) {
  const calls = []
  const services = {
    sessionController: { resolveAgent: () => ({ agent: { id: 'parent' } }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'parent' }, dispose: async () => {} }) },
    subagents: {
      startActivation(spec) {
        calls.push({ label: spec.label, parent: spec.request?.parent })
        const n = calls.length
        const failed = fails(n)
        return {
          childId: `child-${n}`,
          result: Promise.resolve({
            output: failed ? [] : [{ type: 'text', text: 'done' }],
            stopReason: failed ? 'error' : 'completed',
            diagnostic: failed ? undefined : null,
          }),
          dispose() {},
        }
      },
      interrupt() {},
    },
  }
  return { ctx: { get: (name) => services[name] }, calls }
}

const config = { models: {} }

// 1. One attempt, one retry: the first child dies silently, the rebuilt parent's
//    child succeeds.
{
  const { ctx, calls } = silentHost({ fails: (n) => n === 1 })
  const d = new Dispatcher({ ctx, config, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'do it' }], { cwd: '/tmp' })
  assert.equal(res.stopReason, 'completed', 'the retry finished the work')
  assert.equal(res.infraRetry, true, 'the result says it needed a rebuilt parent')
  assert.equal(calls.length, 2, 'one retry, not a loop')
  assert.notEqual(calls[0].parent, calls[1].parent, 'the retry runs under a fresh parent')
  ok('a silent child failure is retried once, under a rebuilt parent')
  await d.dispose()
}

// 2. The budget is per attempt, not per dispatcher. This is the regression: a
//    campaign whose first round spent the retry got none for the next eight.
{
  const { ctx, calls } = silentHost({ fails: (n) => n === 1 || n === 3 })
  const d = new Dispatcher({ ctx, config, log: () => {} })
  const first = await d.run([{ type: 'text', text: 'first' }], { cwd: '/tmp' })
  assert.equal(first.stopReason, 'completed')

  const before = calls.length
  const second = await d.run([{ type: 'text', text: 'second' }], { cwd: '/tmp' })
  assert.equal(calls.length - before, 2, 'the second attempt also gets its own retry')
  assert.equal(typeof second.stopReason, 'string')
  ok('the retry budget is per attempt, not per dispatcher')
  await d.dispose()
}

// 3. Two silent failures in a row is still a failure: the retry is one shot.
{
  const { ctx, calls } = silentHost({ fails: () => true })
  const d = new Dispatcher({ ctx, config, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'do it' }], { cwd: '/tmp' })
  assert.equal(res.stopReason, 'error')
  assert.equal(res.failureKind, 'died', 'a silent child is a dead child, not a task verdict')
  assert.ok(res.error && res.error.length > 0, 'and it carries text, never a null diagnostic')
  assert.equal(calls.length, 2, 'two children, then it stops')
  ok('a second silent failure fails the attempt instead of looping')
  await d.dispose()
}

// 4. A failure that does carry a diagnostic is not an infrastructure failure, so
//    it must not be retried at all - a broken task is not a broken parent.
{
  const calls = []
  const services = {
    sessionController: { resolveAgent: () => ({ agent: { id: 'parent' } }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'parent' }, dispose: async () => {} }) },
    subagents: {
      startActivation(spec) {
        calls.push({ label: spec.label })
        return {
          childId: `child-${calls.length}`,
          result: Promise.resolve({ output: [], stopReason: 'error', diagnostic: 'the verifier command does not exist' }),
          dispose() {},
        }
      },
      interrupt() {},
    },
  }
  const d = new Dispatcher({ ctx: { get: (n) => services[n] }, config, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'do it' }], { cwd: '/tmp' })
  assert.equal(res.failureKind, 'died')
  assert.equal(calls.length, 1, 'a diagnosed failure is evidence, not noise to retry')
  ok('a diagnosed failure is never retried')
  await d.dispose()
}

done()
