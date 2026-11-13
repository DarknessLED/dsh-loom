// The round now refuses a second candidate when its own record says the second
// opinion is not worth its tail (loom-ab). That decision is recorded per round,
// but nothing counts it: the triangle still cannot answer "how much of our
// candidate time does the first candidate make unnecessary?".
//
// This spec puts the count on the triangle, and refuses to invent a number when
// nothing was decided.
import assert from 'node:assert/strict'

import {
  campaignTriangle,
  estimatedRoundCost,
  estimatedRoundTokens,
  recordedRoundTokens,
} from '../../src/runtime/triangle.js'

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

// Planning is a measurement only when a round recorded it, and the planner
// counters must stay disjoint buckets: a zeroed `planMs` is measured, a negative
// one cannot subtract time, and a planner that handed over nothing is `failed`
// unless it actually timed out.
{
  const rounds = [
    { n: 1, status: 'promoted', durationMs: 1_000, planMs: 0, planUsable: true, promoted: true },
    { n: 2, status: 'no-gain', durationMs: 1_000, planMs: -400, planUsable: false, promoted: false },
  ]
  const tri = campaignTriangle(rounds)
  assert.equal(tri.planMs, 0, 'a recorded zero is measured and a negative is clamped out')
  assert.equal(tri.planning.rounds, 2, 'both rounds recorded a planning measurement')
  assert.equal(tri.planning.usable, 1)
  assert.equal(tri.planning.failed, 1, 'an unusable plan that did not time out is a silent failure')
  assert.equal(tri.planning.timedOut, 0, 'a round that never recorded planTimedOut did not time out')
  assert.equal(tri.planShare, 0, 'measured zero planning is a 0 share, not unknown')
  assert.equal(tri.attemptWindowMs, 2_000, 'wall time minus planning and holdout is the candidate window')
  ok('planning counters separate zero, negative and unmeasured rounds')
}

// No round recorded `planMs`: planning, the window it would define and the
// share it would take are all unknown. Zero would read as "planned nothing".
{
  const rounds = [{ n: 1, status: 'promoted', durationMs: 1_000, attemptMs: 500, tokens: 10 }]
  const tri = campaignTriangle(rounds)
  assert.equal(tri.planMs, null, 'planning was never measured')
  assert.equal(tri.planShare, null, 'unmeasured planning has no share')
  assert.equal(tri.attemptWindowMs, null, 'no planning measurement, no candidate window')
  assert.equal(tri.planAwareFactor, tri.parallelFactor, 'with no window the plain factor is the answer')
  assert.equal(tri.parallelFactor, 0.5, 'and that plain factor is attempt over wall time')
  ok('a campaign that never measured planning reports unknowns, not zeros')
}

// A window of zero has no denominator: the factor is null, not a NaN or Infinity
// that would print as a number.
{
  const tri = campaignTriangle([{ n: 1, status: 'promoted', durationMs: 0, tokens: 5 }])
  assert.equal(tri.parallelFactor, null, 'no denominator means no factor')
  ok('a zeroed denominator does not become Infinity')
}

// "Not measured" and "spent nothing" are different claims in the cost ledger
// too: a null price is excluded from the mean rather than averaged in as free,
// and a measured zero is a measurement.
{
  assert.equal(estimatedRoundCost([{ costUsd: 2 }, { costUsd: 4 }]), 3)
  assert.equal(estimatedRoundCost([{ costUsd: null }, { costUsd: 4 }]), 4, 'a null price is not a zero price')
  assert.equal(estimatedRoundCost([null, { costUsd: 4 }]), 4, 'a non-object round is skipped, not dereferenced')
  pass += 1
  console.log(`ok ${pass} - the cost mean excludes silence instead of averaging it in`)
}
{
  assert.equal(estimatedRoundTokens([{ tokens: 0 }, { tokens: 10 }]), 5, 'zero tokens is a measured round')
  assert.equal(estimatedRoundTokens([{ tokens: null }, { tokens: 10 }]), 10, 'a null token count is not a zero')
  assert.equal(recordedRoundTokens([{ tokens: 0 }, { tokens: 10 }]), 10)
  pass += 1
  console.log(`ok ${pass} - the token mean keeps measured zeroes and drops silence`)
}

// Spending with no promotion has no per-promotion price: null, not zero, which
// would read as "the promotion was free". A campaign whose rounds recorded no
// tokens likewise has no tokens-per-round figure; null, not "spent nothing".
{
  const tri = campaignTriangle([{ n: 1, status: 'no-gain', durationMs: 1_000, planMs: 0, costUsd: 1 }])
  assert.equal(tri.usdPerPromotion, null, 'no promotion means no price per promotion')
  assert.equal(tri.tokensPerRound, null, 'no measured tokens means no per-round token figure')
  ok('a campaign with no promotions does not report a free one')
}

// The ratio guard refuses to report a factor whose numerator overflowed the
// counter: `null` is "no usable number", Infinity is a number that would be
// printed and compared as if it meant something.
{
  const huge = Number.MAX_VALUE
  const rounds = [
    { n: 1, status: 'promoted', durationMs: 1_000, planMs: 0, attemptMs: huge },
    { n: 2, status: 'promoted', durationMs: 1_000, planMs: 0, attemptMs: huge },
  ]
  const tri = campaignTriangle(rounds)
  assert.equal(tri.attemptMs, Infinity, 'the accumulator really did overflow')
  assert.equal(tri.parallelFactor, null, 'a non-finite factor is unknown, not Infinity')
  ok('a non-finite ratio is reported as unknown rather than as Infinity')
}

console.log(`\n${pass}/${pass} passed`)
