// A second candidate is an option, not a habit.
//
// Research note research/balance-2026-11.md (§2): with p the chance the first
// candidate lands and W the round's wall time, the second candidate is worth
// buying only when p(1-p)·W > tail, where tail is what the second candidate costs
// at the tail (it does not shorten the round; it delays the gate). Our measured
// tails are 179 / 145 / 19 s and the break-even sits at 43-120 s, so the second
// candidate is already a loss on most rounds - and the more confident the first
// candidate is, the worse it gets (p=0.9 -> EV is negative).
//
// The decision must be a function someone can argue with, not a mood.
import assert from 'node:assert/strict'

import { admitSecondCandidate } from '../../src/runtime/candidates.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. A coin-flip candidate with a modest round and a small tail is worth hedging.
{
  const d = admitSecondCandidate({ p: 0.5, roundMs: 700, tailMs: 100 })
  assert.equal(d.admit, true)
  assert.equal(d.reason, 'worth-hedging')
  assert.equal(Math.round(d.ev), 75, 'EV = p(1-p)W - tail = 175 - 100')
  ok('a coin flip with a cheap tail is worth hedging')
}

// 2. A confident first candidate with an expensive tail is not: hedging a
//    near-certain answer pays the tail to learn nothing.
{
  const d = admitSecondCandidate({ p: 0.9, roundMs: 700, tailMs: 145 })
  assert.equal(d.admit, false)
  assert.equal(d.reason, 'tail-exceeds-ev')
  assert.ok(d.ev < 0, 'the expected value is negative')
  ok('a confident candidate with an expensive tail is not hedged')
}

// 3. Degenerate inputs are measured answers, not crashes: a candidate that never
//    wins has nothing to hedge, and missing numbers are not a yes.
{
  assert.equal(admitSecondCandidate({ p: 0, roundMs: 700, tailMs: 10 }).admit, false)
  assert.equal(admitSecondCandidate({ p: 1, roundMs: 700, tailMs: 10 }).admit, false, 'a certain winner needs no hedge')
  assert.equal(admitSecondCandidate({}).admit, false, 'unknown is not permission')
  assert.equal(admitSecondCandidate({ p: 0.5, roundMs: 700, tailMs: 100, marginMs: 120 }).admit, false, 'a margin makes it stricter, never looser')
  ok('degenerate and unknown inputs are refusals, not exceptions')
}

console.log(`\n${pass}/${pass} passed`)
