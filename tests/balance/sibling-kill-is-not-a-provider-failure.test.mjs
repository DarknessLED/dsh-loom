// An attempt stopped on purpose is not evidence about the model.
//
// When two candidates run in parallel and one of them solves the task outright,
// the round aborts the sibling through the dispatcher's own hook. That abort
// surfaces as `stopReason: 'aborted'` and the dispatcher classifies it `died` --
// which is true about the child and false about the provider: nothing was wrong
// with the model, we simply stopped paying for an answer we already had.
//
// The record already knows this. `attempt.abandoned: true` plus
// `reason: 'solved-by-sibling'` is written by the round, and `abandonedVerdict`
// already reports `measured: false`. What did not follow was the scoreboard:
// every campaign that ran two candidates showed the primary provider dying once
// per round, so `modelHealth` rated a perfectly good ref at 50% and
// `demoteChain` would eventually bench it -- for winning too early.
//
// loom-ui8 is the concrete case. Its three rounds each record
//   r1a1 fk=died ms=594335   r1a2 fk=ok ms=593273
//   r2a1 fk=died ms=339633   r2a2 fk=ok ms=338367
//   r3a1 fk=died ms=558762   r3a2 fk=ok ms=557560
// one to two seconds apart on every single round, one ref, `modelsTried` of
// length one. A provider death does not wait politely for its sibling to finish.
//
// So: an abandoned attempt gets its own column, out of the win rate and out of
// the demotion streak, and a ref whose only non-abandoned work is fine keeps its
// place at the front of the chain.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelHealth, demoteChain } from '../../src/runtime/model-health.js'

function attempt(model, extra = {}) {
  return { id: 'r1a1', model, verifierOk: false, score: 0, durationMs: 1000, ...extra }
}

// The exact shape loom-ui8 wrote: a sibling kill recorded as `died`.
function siblingKilled(model, extra = {}) {
  return attempt(model, {
    failureKind: 'died',
    abandoned: true,
    reason: 'solved-by-sibling',
    stopReason: 'aborted',
    ...extra,
  })
}

test('a sibling kill is filed under abandoned, not died', () => {
  const health = modelHealth([
    { n: 1, attempts: [siblingKilled('m/a'), attempt('m/a', { failureKind: 'ok', verifierOk: true })] },
  ])
  assert.equal(health['m/a'].attempts, 2)
  assert.equal(health['m/a'].abandoned, 1, 'the stopped attempt is counted, and named as stopped')
  assert.equal(health['m/a'].died, 0, 'the provider did not die')
  assert.equal(health['m/a'].ok, 1)
})

test('a campaign of wins looks like a campaign of wins', () => {
  // loom-ui8 shape: three rounds, one abandoned sibling and one winner each.
  const health = modelHealth([
    { n: 1, attempts: [siblingKilled('m/a'), attempt('m/a', { failureKind: 'ok', verifierOk: true })] },
    { n: 2, attempts: [siblingKilled('m/a'), attempt('m/a', { failureKind: 'ok', verifierOk: true })] },
    { n: 3, attempts: [siblingKilled('m/a'), attempt('m/a', { failureKind: 'ok', verifierOk: true })] },
  ])
  assert.equal(health['m/a'].attempts, 6)
  assert.equal(health['m/a'].ok, 3)
  assert.equal(health['m/a'].died, 0)
})

test('a real death still counts as one, abandoned flag or not', () => {
  const health = modelHealth([
    { n: 1, attempts: [attempt('m/a', { failureKind: 'died' })] },
  ])
  assert.equal(health['m/a'].died, 1)
  assert.equal(health['m/a'].abandoned, 0)
})

test('being stopped early does not bench a healthy ref', () => {
  const rounds = [1, 2, 3].map((n) => ({
    n,
    attempts: [siblingKilled('m/a'), attempt('m/a', { failureKind: 'ok', verifierOk: true })],
  }))
  const out = demoteChain(['m/a', 'm/b'], rounds, { after: 2 })
  assert.deepEqual(out.chain, ['m/a', 'm/b'], 'the front of the chain did not move')
  assert.deepEqual(out.demoted, [])
})

test('an interrupted attempt is likewise not a verdict on the provider', () => {
  const health = modelHealth([
    { n: 1, attempts: [attempt('m/a', { failureKind: 'died', abandoned: true, reason: 'interrupted' })] },
  ])
  assert.equal(health['m/a'].abandoned, 1)
  assert.equal(health['m/a'].died, 0)
})

test('the row still adds up: every attempt lands in exactly one bucket', () => {
  const rounds = [
    {
      n: 1,
      attempts: [
        siblingKilled('m/a'),
        attempt('m/a', { failureKind: 'ok', verifierOk: true }),
        attempt('m/a', { failureKind: 'timeout' }),
        attempt('m/a', { failureKind: 'died' }),
        attempt('m/a', { failureKind: 'crash' }),
        attempt('m/a', { failureKind: 'exhausted' }),
      ],
    },
  ]
  const h = modelHealth(rounds)['m/a']
  const buckets = h.ok + h.timeouts + h.died + h.exhausted + h.context + h.crash + h.other + h.abandoned
  assert.equal(buckets, h.attempts, 'the columns sum to the row')
  assert.equal(h.attempts, 6)
})
