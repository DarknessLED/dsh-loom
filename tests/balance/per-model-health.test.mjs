// The model chain is a bet, and nobody was keeping the score.
//
// Every attempt record already names the model that ran it (`model`), whether it
// worked (`failureKind`), and how long it took (`durationMs`). Pooled across the
// campaign those four fields answer the only question that matters when choosing
// a fallback: which refs actually finish work, and which ones quietly time out.
//
// The ledger has an answer today and nobody could read it: `modelsTried` was
// recorded on 420 attempts and `modelsTried.length > 1` appeared zero times, which
// is the fact that started all of this. Per-model numbers are how a chain stops
// being folklore.
//
// Rule: the triangle carries `perModel`, keyed by model ref, with the counts and
// the two latency percentiles that a chain decision needs. A ref with no measured
// duration reports null percentiles; an attempt with no model is `unknown`, not
// dropped, because dropping them would make the totals lie.
import assert from 'node:assert/strict'
import { modelHealth } from '../../src/runtime/model-health.js'
import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const rounds = [
  {
    n: 1,
    status: 'promoted',
    promoted: true,
    durationMs: 1000,
    attempts: [
      { id: 'r1a1', model: 'open-design/deepseek-v4.1-flash', failureKind: 'ok', durationMs: 400, verifierOk: true },
      { id: 'r1a2', model: 'open-design/deepseek-v4.1-flash', failureKind: 'ok', durationMs: 600, verifierOk: false },
    ],
  },
  {
    n: 2,
    status: 'no-gain',
    promoted: false,
    durationMs: 2000,
    attempts: [
      { id: 'r2a1', model: 'command-code/deepseek/deepseek-v4.1-flash', failureKind: 'timeout', durationMs: 900 },
      { id: 'r2a2', failureKind: 'died', durationMs: 1 },
    ],
  },
]

// 1. Every ref that ran is a row, with the counts a chain decision needs.
{
  const health = modelHealth(rounds)
  assert.equal(typeof health, 'object')
  const primary = health['open-design/deepseek-v4.1-flash']
  assert.ok(primary, 'the primary ref has a row')
  assert.equal(primary.attempts, 2, 'both attempts are counted')
  assert.equal(primary.ok, 2, 'two completed turns')
  assert.equal(primary.timeouts, 0)
  assert.equal(primary.died, 0)
  assert.equal(primary.verified, 1, 'only one of them passed the verifier')
  assert.equal(primary.died, 0, 'neither of them died')
  const fallback = health['command-code/deepseek/deepseek-v4.1-flash']
  assert.equal(fallback.timeouts, 1, 'the timeout is attributed to the ref that spent it, not to the chain')
  ok('a ref is counted by what it did, not by which link it was')
}

// 2. An attempt that named no model is `unknown`, not silently dropped -- the
//    totals have to add up or the table lies about the campaign.
{
  const health = modelHealth(rounds)
  assert.ok(health.unknown, 'attempts with no model still get a row')
  assert.equal(health.unknown.attempts, 1)
  assert.equal(health.unknown.died, 1)
  const total = Object.values(health).reduce((sum, row) => sum + row.attempts, 0)
  // Four attempts in the fixture above; the second case adds its own row.
  assert.equal(total, 4, 'every attempt is in exactly one row')
  ok('an unattributed attempt is reported as unknown rather than vanished')
}

// 3. Percentiles come from measured durations only, and a row with none says so.
{
  const health = modelHealth([
    { n: 1, status: 'no-gain', attempts: [{ id: 'a', model: 'm/a' }] },
    { n: 2, status: 'no-gain', attempts: [{ id: 'b', model: 'm/a', durationMs: null }] },
  ])
  const row = health['m/a']
  assert.equal(row.attempts, 2)
  assert.equal(row.measured, 0, 'neither attempt reported a duration')
  assert.equal(row.p50Ms, null, 'no measurement is null, never zero')
  assert.equal(row.p90Ms, null)
  ok('latency percentiles are null when nothing was measured')
}

// 4. Percentiles are over the attempts that did report, and p90 is the tail a
//    deadline has to clear.
{
  const attempts = [100, 200, 300, 400, 5000].map((ms, i) => ({ id: 'x' + i, model: 'm/b', durationMs: ms, failureKind: 'ok' }))
  const health = modelHealth([{ n: 1, status: 'promoted', attempts }])
  const row = health['m/b']
  assert.equal(row.measured, 5)
  assert.equal(row.p50Ms, 300, 'p50 is the middle of the measured set')
  assert.equal(row.p90Ms, 5000, 'p90 is the tail that a 600 s deadline would clip')
  ok('percentiles are computed over the durations that exist')
}

// 5. The triangle carries the table, so the panel and the report read one source.
{
  const tri = campaignTriangle(rounds)
  assert.ok(tri.perModel, 'the triangle exposes perModel')
  assert.equal(tri.perModel['open-design/deepseek-v4.1-flash'].attempts, 2)
  assert.deepEqual(Object.keys(tri.perModel).sort(), [
    'command-code/deepseek/deepseek-v4.1-flash',
    'open-design/deepseek-v4.1-flash',
    'unknown',
  ])
  ok('the triangle carries per-model health')
}

// 6. No attempts at all is not a table of zeros: an empty ledger has nothing to
//    say, so the field is empty rather than full of fake rows.
{
  const tri = campaignTriangle([])
  assert.deepEqual(tri.perModel, {}, 'an empty campaign has no model rows')
  ok('an unmeasured campaign reports no model rows')
}

console.log(`\n${pass}/6 passed`)
assert.equal(pass, 6)
