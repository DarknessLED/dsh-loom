// Wave 21 / p4: the second candidate nobody measured.
//
// Two candidates ship by default, and the second one is 55% of the round wall
// clock for a demonstrably small gain: it only pays when the first candidate is
// likely to fail. That is an expected-value question with two inputs the loop
// already has -- how often a candidate solves this task, and how much of the
// round budget the tail would eat.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hedgeDecision } from '../../src/loop/candidates.js'

const base = { pSolve: 0.5, gainIfSolved: 1, extraCostUsd: 0.05, tailMs: 300_000, budgetLeftMs: 1_200_000 }

test('a coin-flip task with a cheap tail buys the hedge', () => {
  const out = hedgeDecision(base)
  assert.equal(out.buy, true)
  assert.equal(out.reason, 'expected-value')
})

test('a task that usually solves does not pay for a second try', () => {
  const out = hedgeDecision({ ...base, pSolve: 0.95 })
  assert.equal(out.buy, false)
  assert.equal(out.reason, 'negative-ev')
})

test('no tail room means no hedge, whatever the odds', () => {
  const out = hedgeDecision({ ...base, tailMs: 900_000, budgetLeftMs: 1_200_000 })
  assert.equal(out.buy, false)
  assert.equal(out.reason, 'no-tail-room')
})

test('an already solved task is not hedged', () => {
  const out = hedgeDecision({ ...base, pSolve: 1 })
  assert.equal(out.buy, false)
  assert.equal(out.reason, 'solved')
})

test('the decision says what it was worth, not just yes or no', () => {
  const out = hedgeDecision(base)
  assert.ok(Math.abs(out.expectedGain - 0.25) < 1e-9, '(1 - 0.5) * 0.5 * 1')
  assert.ok(typeof out.note === 'string' && out.note.length > 0)
})
