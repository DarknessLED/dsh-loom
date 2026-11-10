// The quality verdict has a duration leg, and it has been null in every
// campaign the ledger ever recorded.
//
// `campaignQuality` is what the status card says about whether a loop is still
// working. Its `avgRoundMs` came from `round.ms`, but the materializer has only
// ever written `durationMs` (see the field list in src/core/reduce.js), so a
// campaign with three timed rounds still reported `mean round -`. The number was
// not missing from the data; it was looked up under the wrong name.
import assert from 'node:assert/strict'
import { campaignQuality, qualityLine } from '../../src/runtime/quality.js'

let pass = 0
function ok(name, cond = true, detail) {
  if (!cond) {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`)
    return
  }
  pass += 1
  console.log(`  ok   ${name}`)
}

// A round as the loop actually records it: durationMs, never ms.
{
  const q = campaignQuality({
    rounds: [
      { n: 1, status: 'promoted', promoted: true, durationMs: 1000 },
      { n: 2, status: 'no-gain', promoted: false, durationMs: 3000 },
    ],
  })
  ok('a round timed in durationMs is counted', q.avgRoundMs === 2000, `got ${q.avgRoundMs}`)
  ok('the rendered line carries the mean', qualityLine(q).includes('mean round 2000ms'), qualityLine(q))
}

// Older ledgers wrote `ms`; that spelling must keep working rather than being
// silently dropped now that the newer one is preferred.
{
  const q = campaignQuality({ rounds: [{ n: 1, status: 'promoted', ms: 2000 }] })
  ok('the old ms field still reads', q.avgRoundMs === 2000, `got ${q.avgRoundMs}`)
}

// durationMs wins when both are present: it is the field the loop maintains.
{
  const q = campaignQuality({ rounds: [{ n: 1, status: 'promoted', ms: 5, durationMs: 9000 }] })
  ok('durationMs outranks the old field', q.avgRoundMs === 9000, `got ${q.avgRoundMs}`)
}

// One untimed round must not turn the whole leg null when others are timed, and
// a negative or NaN record must not poison the mean.
{
  const q = campaignQuality({
    rounds: [
      { n: 1, status: 'promoted', durationMs: 1000 },
      { n: 2, status: 'no-gain' },
      { n: 3, status: 'no-gain', durationMs: -4 },
      { n: 4, status: 'no-gain', durationMs: 'fast' },
    ],
  })
  ok('an untimed round is skipped, not averaged as zero', q.avgRoundMs === 1000, `got ${q.avgRoundMs}`)
}

// The whole-leg case: nothing timed at all is still honestly null.
{
  const q = campaignQuality({ rounds: [{ n: 1, status: 'promoted' }] })
  ok('no measurement stays null', q.avgRoundMs === null, `got ${q.avgRoundMs}`)
  ok('and the line says so instead of 0ms', qualityLine(q).includes('mean round -'), qualityLine(q))
}

console.log(`\n${pass}/7 passed`)
assert.ok(pass === 7, `expected 7 passing checks, got ${pass}`)
