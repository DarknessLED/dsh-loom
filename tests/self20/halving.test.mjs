// Successive halving already ran inside a round; nothing pinned it.
//
// The schedule is the standard one: pay for the cheap screening verifier on
// every candidate, pay for the real attempt only on the survivors (half by
// default). Three properties matter and none were tested: screening is off
// unless the task declares a `screen`, a passing screen outranks a failing one,
// and the keep count is deterministic so two identical rounds buy the same
// number of real attempts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { screenEnabled, pickSurvivors } from '../../src/runtime/halving.js'

const cfg = (enabled = true) => ({ halving: { enabled } })
const task = { screen: { cmd: 'node -e "process.exit(0)"' } }

test('screening needs a task that declared a screen', () => {
  assert.equal(screenEnabled({ task, config: cfg(), candidates: 2 }), true)
  assert.equal(screenEnabled({ task: {}, config: cfg(), candidates: 2 }), false)
  assert.equal(screenEnabled({ task: { screen: { cmd: '  ' } }, config: cfg(), candidates: 2 }), false)
})

test('screening is off when the policy says so, or with one candidate', () => {
  assert.equal(screenEnabled({ task, config: cfg(false), candidates: 2 }), false)
  assert.equal(screenEnabled({ task, config: cfg(), candidates: 1 }), false)
})

test('a passing screen outranks a higher score', () => {
  const out = pickSurvivors([
    { id: 'a', ok: false, score: 9 },
    { id: 'b', ok: true, score: 0 },
  ], { keepRatio: 0.5 })
  assert.deepEqual(out.survivors, ['b'])
  assert.deepEqual(out.dropped, ['a'])
})

test('the keep count is the same on every run at the same size', () => {
  const four = [{ id: 'a', ok: true }, { id: 'b', ok: true }, { id: 'c', ok: false }, { id: 'd', ok: false }]
  assert.deepEqual(pickSurvivors(four, { keepRatio: 0.5 }).survivors, ['a', 'b'])
  assert.deepEqual(pickSurvivors(four, { keepRatio: 0.5 }).keep, 2)
})

test('an empty round keeps nothing and does not throw', () => {
  assert.deepEqual(pickSurvivors([], {}), { survivors: [], dropped: [], keep: 0 })
})
