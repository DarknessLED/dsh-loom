// Wave 20 / p1: the ledger says what actually happened.
//
// Two rounds told the wrong story. Round 17 promoted a candidate whose patch was
// empty (`hasPatch:false, noop:true, diff.files 0`) and then the selector kept
// buying the same solved task. Round 15's `r15a1` was aborted because its sibling
// had solved the task first, and the ledger wrote `failureKind:'died'` -- a
// successful hand-off filed under crash.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { noopDecision } from '../../src/gate/gate.js'
import { attemptOutcome } from '../../src/runtime/round.js'

test('an empty patch is not a promotion, whatever the verifier said', () => {
  const out = noopDecision({ hasPatch: false, verifierOk: true, score: 1 })
  assert.equal(out.promote, false)
  assert.equal(out.reason, 'no-patch')
})

test('a real patch still goes through the ordinary gate', () => {
  const out = noopDecision({ hasPatch: true, verifierOk: true, score: 1 })
  assert.equal(out.reason !== 'no-patch', true, 'the no-op rule must not swallow real work')
})

test('a sibling hand-off is an outcome of its own, not a death', () => {
  const out = attemptOutcome({ stopReason: 'aborted', solvedBy: 'r15a2', verifierOk: false, score: 0 })
  assert.equal(out.failureKind, 'solved-by-sibling')
  assert.notEqual(out.failureKind, 'died')
})

test('a real crash keeps saying died', () => {
  const out = attemptOutcome({ stopReason: 'error', solvedBy: null, verifierOk: false, score: 0, error: 'boom' })
  assert.equal(out.failureKind, 'died')
})

test('an ordinary success is not dressed as either', () => {
  const out = attemptOutcome({ stopReason: 'completed', solvedBy: null, verifierOk: true, score: 1 })
  assert.equal(out.failureKind, 'ok')
})
