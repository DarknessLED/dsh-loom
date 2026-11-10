// Which model actually did the work — said out loud, not just computed.
//
// `modelHealth` was written because the fallback chain was a bet nobody could
// score: 420 attempts in the ledger carried `modelsTried.length === 1`, so the
// question "is the second provider worth its price" had no answer. The module
// computes the answer per campaign. Nothing rendered it. A number nobody reads is
// the same as no number: the panel kept showing one blended "spend" figure and
// the digest never mentioned that every promotion in a campaign came from the
// fallback while the primary died 40 times.
//
// So this file pins the reader, not the calculator: one line per model ref, in a
// fixed order, with "not measured" kept distinct from zero.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { campaignDigest, DIGEST_MAX_LINES } from '../../src/report/digest.js'
import { campaignTriangle } from '../../src/runtime/triangle.js'

function round(n, attempts, extra = {}) {
  return { n, status: 'promoted', score: 1, attempts, ...extra }
}

function attempt(model, extra = {}) {
  return { id: 'r1a1', model, verifierOk: true, score: 1, durationMs: 1000, ...extra }
}

test('the digest names the model that did the work', () => {
  const state = { id: 'camp', status: 'running', rounds: [round(1, [attempt('open-design/deepseek-v4.1-flash')])] }
  const text = campaignDigest(state)
  assert.match(text, /open-design\/deepseek-v4\.1-flash/)
})

test('a model that only ever died is named too — silence is the finding', () => {
  const state = {
    id: 'camp',
    status: 'running',
    rounds: [
      round(1, [{ id: 'r1a1', model: 'dead/provider', failureKind: 'died', score: 0, verifierOk: false }]),
      round(2, [attempt('ok/provider')]),
    ],
  }
  const text = campaignDigest(state)
  assert.match(text, /dead\/provider/)
})

test('an unmeasured model says so instead of reading as zero', () => {
  // No durationMs at all: p90Ms is null, and the line must not print "0 ms",
  // because a provider that answered instantly and one nobody timed are very
  // different findings.
  const state = { id: 'camp', status: 'running', rounds: [round(1, [{ id: 'r1a1', model: 'm/a', verifierOk: true, score: 1 }])] }
  const text = campaignDigest(state)
  assert.match(text, /m\/a/)
  assert.doesNotMatch(text, /0 ms/)
})

test('the digest stays inside its line budget with many models', () => {
  const attempts = []
  for (let i = 0; i < 6; i += 1) attempts.push(attempt(`p${i}/m`))
  const state = { id: 'camp', status: 'running', rounds: [round(1, attempts)] }
  const text = campaignDigest(state)
  const lines = text.split('\n').filter(Boolean)
  assert.ok(lines.length <= DIGEST_MAX_LINES, `got ${lines.length} lines`)
  assert.ok(lines.every((l) => l.length <= 120), 'every line is clipped')
})

test('the triangle exposes the same rows the digest reads', () => {
  const tri = campaignTriangle([round(1, [attempt('m/a'), attempt('m/b')])])
  assert.ok(tri.perModel && typeof tri.perModel === 'object', 'perModel is present')
  assert.deepEqual(Object.keys(tri.perModel).sort(), ['m/a', 'm/b'])
  assert.equal(tri.perModel['m/a'].attempts, 1)
})

test('a stopped attempt is not counted against the ref that ran it', () => {
  // loom-ui8: three rounds, each one sibling killed a second before its brother
  // won. The old line read "3/6", which is what a coin-flip provider looks like.
  const rounds = [1, 2, 3].map((n) => ({
    n,
    status: 'promoted',
    score: 1,
    attempts: [
      { id: `r${n}a1`, model: 'm/a', verifierOk: false, score: 0, failureKind: 'died', abandoned: true, reason: 'solved-by-sibling', durationMs: 594000 },
      { id: `r${n}a2`, model: 'm/a', verifierOk: true, score: 1, failureKind: 'ok', durationMs: 593000 },
    ],
  }))
  const text = campaignDigest({ id: 'camp', status: 'running', rounds })
  assert.match(text, /m\/a 3\/3/, 'three judged attempts, all of them won')
  assert.match(text, /\+3 stopped/, 'and the stopped ones are named, not hidden')
  assert.doesNotMatch(text, /m\/a 3\/6/, 'the old reading counted wins as losses')
})

test('a ref with nothing stopped says nothing about stopping', () => {
  const state = { id: 'camp', status: 'running', rounds: [round(1, [attempt('ok/provider')])] }
  assert.doesNotMatch(campaignDigest(state), /stopped/)
})
