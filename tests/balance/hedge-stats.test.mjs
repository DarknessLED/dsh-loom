// The round now refuses a second candidate when its own record says the second
// opinion is not worth its tail (loom-ab). That decision is recorded per round,
// but nothing counts it: the triangle still cannot answer "how much of our
// candidate time does the first candidate make unnecessary?".
//
// This spec puts the count on the triangle, and refuses to invent a number when
// nothing was decided.
import assert from 'node:assert/strict'

import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// Three rounds: two bought the second candidate, one refused it.
{
  const rounds = [
    { n: 1, status: 'promoted', timed: true, durationMs: 600_000, planMs: 0, attemptMs: 900_000, candidatesPlanned: 2 },
    { n: 2, status: 'promoted', timed: true, durationMs: 600_000, planMs: 0, attemptMs: 900_000, candidatesPlanned: 2 },
    { n: 3, status: 'promoted', timed: true, durationMs: 600_000, planMs: 0, attemptMs: 500_000, candidatesPlanned: 1, secondCandidate: { admit: false, reason: 'no-signal' } },
  ]
  const tri = campaignTriangle(rounds)
  assert.ok(tri.hedge, 'the triangle reports what it decided about hedging')
  assert.equal(tri.hedge.refused, 1, 'one round refused the second opinion')
  assert.equal(tri.hedge.planned, 2, 'two rounds bought it')
  assert.equal(tri.hedge.refusedShare, 0.333, 'the share is rounded to three places')
  ok('the triangle counts refused second candidates')
}

// Nothing decided yet: a null share, not a zero that reads as "never refused".
{
  const rounds = [{ n: 1, status: 'promoted', timed: true, durationMs: 600_000, planMs: 0, attemptMs: 900_000 }]
  const tri = campaignTriangle(rounds)
  assert.equal(tri.hedge.refused, 0)
  assert.equal(tri.hedge.planned, 0)
  assert.equal(tri.hedge.refusedShare, null, 'no decision is not a 0% refusal rate')
  ok('a campaign that never decided reports null, not zero')
}

// A round that planned two candidates counts as planned even when it later
// aborted one on the sibling's success: the money was budgeted either way.
{
  const rounds = [
    { n: 1, status: 'promoted', timed: true, durationMs: 600_000, planMs: 0, attemptMs: 1_000_000, candidatesPlanned: 2, abortedCandidates: 1 },
  ]
  const tri = campaignTriangle(rounds)
  assert.equal(tri.hedge.planned, 1, 'an aborted sibling was still planned')
  assert.equal(tri.hedge.refused, 0)
  ok('an aborted sibling was still a second opinion that got paid for')
}

console.log(`\n${pass}/${pass} passed`)
