// A graded task's verdict is a metric, not an exit code.
//
// loom-graded's verifier prints `QUALITY=<n>` and exits 0 in every state, on
// purpose: that is what "graded" means, the only signal is the number. The
// differential oracle that landed in 6bc00e1 compares exit codes, so on that
// campaign the base "passes" from round 1 onward, `baseFailed` stays false, and
// `earned` is false forever -- the gate discarded three rounds in which QUALITY
// went 0.500 -> 1.000. The oracle was right about patch-shaped tasks and blind to
// metric-shaped ones.
//
// Rule: when the base already passes, the evidence must be a metric that moved by
// at least minGain. When there is no metric to compare, the verdict says nothing
// about the patch and the round must not promote on it. When the base was never
// measured, stay permissive: a missing measurement is not a finding.
import assert from 'node:assert/strict'
import { earnedByDifferential } from '../../src/gate/earned.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

// 1. The plain case: red before, green now. That is work.
{
  const v = earnedByDifferential({ baseFailed: true })
  assert.equal(v.earned, true)
  assert.equal(v.reason, 'red-to-green')
  ok('a red base that went green earned the verdict')
}

// 2. Base green, candidate green, metric improved past the threshold: the
//    loom-graded shape, and the case the exit-code oracle got wrong.
{
  const v = earnedByDifferential({
    baseFailed: false,
    baseMetrics: { quality: 0.5 },
    candidateMetrics: { quality: 1.0 },
    minGain: 0.05,
  })
  assert.equal(v.earned, true, 'a metric that moved is evidence of work')
  assert.equal(v.reason, 'metric-improved')
  assert.equal(v.metric, 'quality')
  assert.equal(v.from, 0.5)
  assert.equal(v.to, 1.0)
  ok('base green but QUALITY 0.500 -> 1.000 is earned')
}

// 3. Base green and the metric did not move: no work, no promotion. This is the
//    case the oracle used to catch and must keep catching.
{
  const v = earnedByDifferential({
    baseFailed: false,
    baseMetrics: { quality: 1.0 },
    candidateMetrics: { quality: 1.0 },
    minGain: 0.05,
  })
  assert.equal(v.earned, false)
  assert.equal(v.reason, 'metric-did-not-improve')
  ok('a metric that did not move earns nothing')
}

// 4. Base green, metric moved the wrong way: a regression does not earn a
//    promotion even if every other check passes.
{
  const v = earnedByDifferential({
    baseFailed: false,
    baseMetrics: { quality: 1.0 },
    candidateMetrics: { quality: 0.75 },
    minGain: 0.05,
  })
  assert.equal(v.earned, false)
  ok('a metric that regressed earns nothing')
}

// 5. The threshold is the task's own: a 0.03 move clears minGain 0.01 and not
//    minGain 0.05. Using the policy's number here is what makes this comparable
//    to the promotion rule rather than a second, invented one.
{
  const base = { baseFailed: false, baseMetrics: { quality: 0.5 }, candidateMetrics: { quality: 0.53 } }
  assert.equal(earnedByDifferential({ ...base, minGain: 0.01 }).earned, true, 'clears a small threshold')
  assert.equal(earnedByDifferential({ ...base, minGain: 0.05 }).earned, false, 'does not clear a large one')
  ok('minGain decides, and the same numbers move with it')
}

// 6. Base green, no metric anywhere: the exit code says green either way, so the
//    verdict is not evidence. This is the case that must never be permissive.
{
  const v = earnedByDifferential({ baseFailed: false })
  assert.equal(v.earned, false)
  assert.equal(v.reason, 'base-already-green')
  ok('a green base with no metric earns nothing')
}

// 7. Unmeasured base stays permissive: the same reason a failed baseline is
//    logged as skipped rather than treated as a rejection. A verifier that could
//    not run must not be able to block every promotion.
{
  for (const baseFailed of ['skipped', undefined, null]) {
    const v = earnedByDifferential({ baseFailed })
    assert.equal(v.earned, true, 'an unmeasured base must not block work')
    assert.equal(v.reason, 'base-unmeasured')
  }
  ok('an unmeasured base is permissive, never a rejection')
}

// 8. Garbage inputs are permissive, not fatal: this runs inside a round, and a
//    throw here would lose the round's work.
{
  assert.equal(earnedByDifferential(undefined).earned, true)
  assert.equal(earnedByDifferential({ baseFailed: false, baseMetrics: 'x', candidateMetrics: 'y' }).earned, false)
  assert.equal(earnedByDifferential({ baseFailed: false, baseMetrics: { quality: NaN }, candidateMetrics: { quality: 1 } }).earned, false)
  ok('malformed checks never throw and never invent evidence')
}

console.log(`\n${pass}/8 passed`)
assert.equal(pass, 8)
