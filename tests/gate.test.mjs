// Unit tests for src/gate/gate.js: no test framework, no dependencies.
// Run: node tests/gate.test.mjs
import process from 'node:process'

import { decidePromotion, rankAttempts, scoreAttempt } from '../src/gate/gate.js'

// ---------------------------------------------------------------------------
// tiny assertion harness
// ---------------------------------------------------------------------------
let passed = 0
let failed = 0
let total = 0

function fail(name, detail) {
  failed += 1
  console.log(`not ok ${total} - ${name}`)
  if (detail) console.log(`  ${String(detail).split('\n').join('\n  ')}`)
}

function ok(cond, name, detail) {
  total += 1
  if (cond) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, detail ?? 'expected a truthy value')
  }
}

function eq(actual, expected, name) {
  total += 1
  if (Object.is(actual, expected)) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function throwsNot(fn, name) {
  total += 1
  try {
    fn()
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } catch (error) {
    fail(name, `threw: ${error?.stack ?? error}`)
  }
}

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------
const EVIDENCE_OK = { tasksEvaluated: 6, holdoutEvaluated: 5, complete: true }
const CONFIG = { minGain: 0.05, holdoutSlack: 0.02, minTasks: 6 }

// ---------------------------------------------------------------------------
// scoreAttempt
// ---------------------------------------------------------------------------
eq(
  scoreAttempt({ attemptId: 'a', verifierOk: true, taskScores: { t1: 1, t2: 0.5, t3: 0 } }),
  0.5,
  'scoreAttempt: mean of taskScores is the base score',
)

eq(
  scoreAttempt({
    attemptId: 'a',
    verifierOk: false,
    taskScores: { t1: 1, t2: 1 },
    metrics: { quality: 1 },
  }),
  0,
  'scoreAttempt: verifierOk=false zeroes the score (even with perfect tasks/quality)',
)

eq(
  scoreAttempt({ attemptId: 'a', taskScores: { t1: 1 } }),
  0,
  'scoreAttempt: missing verifierOk counts as not verified',
)

eq(
  scoreAttempt({ attemptId: 'a', verifierOk: true }),
  1,
  'scoreAttempt: no taskScores + verified falls back to 1',
)

eq(
  scoreAttempt({ attemptId: 'a', verifierOk: true, taskScores: {} }),
  1,
  'scoreAttempt: empty taskScores + verified falls back to 1',
)

eq(
  scoreAttempt({ attemptId: 'a', verifierOk: false }),
  0,
  'scoreAttempt: no taskScores + not verified falls back to 0',
)

eq(
  scoreAttempt({
    attemptId: 'a',
    verifierOk: true,
    taskScores: { t1: 1, t2: 0 },
    metrics: { quality: 1 },
  }),
  0.85,
  'scoreAttempt: quality blends 0.7 quality / 0.3 pass rate',
)

eq(
  scoreAttempt({ attemptId: 'a', verifierOk: true, metrics: { quality: 0.5 } }),
  0.65,
  'scoreAttempt: quality without taskScores blends against the verified pass rate (1)',
)

eq(
  scoreAttempt({ attemptId: 'a', verifierOk: true, metrics: { quality: 2 } }),
  1,
  'scoreAttempt: out-of-range quality is clamped',
)

eq(
  scoreAttempt({ attemptId: 'a', verifierOk: true, taskScores: { t1: 1, t2: 0, t3: 0 } }),
  0.333333,
  'scoreAttempt: result is rounded to 6 decimals',
)

eq(
  scoreAttempt({
    attemptId: 'a',
    verifierOk: true,
    taskScores: { t1: Number.NaN, t2: 0.5, t3: 'nope', t4: null },
  }),
  0.5,
  'scoreAttempt: non-finite taskScores entries are ignored',
)

for (const bad of [null, undefined, 42, 'attempt']) {
  throwsNot(() => scoreAttempt(bad), `scoreAttempt: malformed input ${JSON.stringify(bad)} does not throw`)
}
eq(scoreAttempt(null), 0, 'scoreAttempt: null input returns 0')

// ---------------------------------------------------------------------------
// rankAttempts
// ---------------------------------------------------------------------------
const emptyRanking = rankAttempts([])
eq(emptyRanking.best, null, 'rankAttempts: empty list yields best=null')
eq(emptyRanking.ranked.length, 0, 'rankAttempts: empty list yields empty ranked array')

{
  const attempts = [
    { id: 'a', score: 0.4, verifierOk: true },
    { id: 'b', score: 0.9, verifierOk: true },
    { id: 'c', score: 0.6, verifierOk: true },
  ]
  const { best, ranked } = rankAttempts(attempts)
  eq(best, attempts[1], 'rankAttempts: best is the highest-scoring attempt')
  eq(
    ranked.map((attempt) => attempt.id).join(','),
    'b,c,a',
    'rankAttempts: sorted by score descending',
  )
  eq(best, ranked[0], 'rankAttempts: best === ranked[0]')
}

{
  const attempts = [
    { id: 'z', score: 0.5, verifierOk: true },
    { id: 'y', score: 0.5, verifierOk: false },
    { id: 'x', score: 0.5, verifierOk: true },
  ]
  const { ranked } = rankAttempts(attempts)
  eq(
    ranked.map((attempt) => attempt.id).join(','),
    'x,z,y',
    'rankAttempts: ties prefer verifierOk, then id lexicographically',
  )
}

{
  const attempts = [
    { id: 'bad', score: Number.NaN, verifierOk: true },
    { id: 'good', score: 0.1, verifierOk: true },
    { id: 'missing', verifierOk: true },
  ]
  const { best, ranked } = rankAttempts(attempts)
  eq(best.id, 'good', 'rankAttempts: missing/NaN scores rank last')
  eq(ranked.length, 3, 'rankAttempts: malformed entries are kept in ranked')
  eq(ranked[1].id, 'bad', 'rankAttempts: NaN score sorts after finite scores')
  eq(ranked[2].id, 'missing', 'rankAttempts: missing score sorts after finite scores')
}

for (const bad of [null, undefined, 'nope', 7]) {
  throwsNot(
    () => rankAttempts(bad),
    `rankAttempts: malformed input ${JSON.stringify(bad)} does not throw`,
  )
}
eq(rankAttempts(null).best, null, 'rankAttempts: null input yields best=null')

// ---------------------------------------------------------------------------
// decidePromotion — rule order and each rule
// ---------------------------------------------------------------------------
{
  const result = decidePromotion({
    candidate: { score: 0.99, holdoutScore: 0.99 },
    incumbent: { score: 0.1, holdoutScore: 0.1 },
    config: CONFIG,
    evidence: { tasksEvaluated: 0, holdoutEvaluated: 0, complete: false },
  })
  eq(result.promote, false, 'decidePromotion: incomplete evidence rejects')
  eq(result.reason, 'incomplete evidence', 'decidePromotion: incomplete evidence reason')
  eq(result.checks.complete, false, 'decidePromotion: checks.complete=false')
}

{
  const result = decidePromotion({
    candidate: { score: 0.9, holdoutScore: 0.9 },
    incumbent: { score: 0.1, holdoutScore: 0.1 },
    config: CONFIG,
    evidence: { tasksEvaluated: 5, holdoutEvaluated: 5, complete: true },
  })
  eq(result.promote, false, 'decidePromotion: fewer than minTasks rejects')
  eq(result.reason, 'insufficient tasks', 'decidePromotion: insufficient tasks reason')
  eq(result.checks.enoughTasks, false, 'decidePromotion: checks.enoughTasks=false')
}

{
  const result = decidePromotion({
    candidate: { score: 0.7, holdoutScore: null },
    incumbent: null,
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.promote, true, 'decidePromotion: first round with score > 0 promotes')
  eq(result.delta, 0.7, 'decidePromotion: delta equals candidate.score when no incumbent')
  eq(result.checks.baseline, true, 'decidePromotion: checks.baseline=true')
  ok(
    result.reason.includes('delta=0.700000'),
    'decidePromotion: baseline promote reason carries delta',
    result.reason,
  )
}

{
  const result = decidePromotion({
    candidate: { score: 0, holdoutScore: null },
    incumbent: null,
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.promote, false, 'decidePromotion: first round with score = 0 rejects')
  eq(result.delta, 0, 'decidePromotion: baseline rejection delta is 0')
  eq(result.reason, 'baseline score not positive', 'decidePromotion: baseline rejection reason')
}

// THE boundary required by the contract: only delta < minGain rejects, so
// delta === minGain must promote.
{
  const result = decidePromotion({
    candidate: { score: 0.15, holdoutScore: null },
    incumbent: { score: 0.1, holdoutScore: null },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.delta, 0.05, 'decidePromotion: delta exactly equals minGain')
  eq(result.checks.gain, true, 'decidePromotion: delta === minGain passes checks.gain')
  eq(result.promote, true, 'decidePromotion: delta === minGain promotes (not rejects)')
  eq(result.reason.includes('delta=0.050000'), true, 'decidePromotion: promote reason carries delta')
}

// Float noise must not flip the equal-threshold case.
{
  const result = decidePromotion({
    candidate: { score: 0.3, holdoutScore: null },
    incumbent: { score: 0.2, holdoutScore: null },
    config: { ...CONFIG, minGain: 0.1 },
    evidence: EVIDENCE_OK,
  })
  eq(result.delta, 0.1, 'decidePromotion: 0.3 - 0.2 is normalized to 0.1')
  eq(result.promote, true, 'decidePromotion: float noise at the boundary still promotes')
}

{
  const result = decidePromotion({
    candidate: { score: 0.149999, holdoutScore: null },
    incumbent: { score: 0.1, holdoutScore: null },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.delta, 0.049999, 'decidePromotion: just-below-threshold delta is preserved')
  eq(result.checks.gain, false, 'decidePromotion: delta < minGain fails checks.gain')
  eq(result.promote, false, 'decidePromotion: delta < minGain rejects')
  eq(result.reason, 'gain below threshold', 'decidePromotion: gain rejection reason')
}

{
  const result = decidePromotion({
    candidate: { score: 0.9, holdoutScore: 0.7 },
    incumbent: { score: 0.8, holdoutScore: 0.9 },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.promote, false, 'decidePromotion: holdout regression rejects')
  eq(result.checks.holdout, false, 'decidePromotion: checks.holdout=false')
  eq(result.checks.gain, true, 'decidePromotion: holdout rejection still has enough gain')
  eq(result.reason, 'holdout regression', 'decidePromotion: holdout rejection reason')
}

{
  const result = decidePromotion({
    candidate: { score: 0.9, holdoutScore: 0.89 },
    incumbent: { score: 0.8, holdoutScore: 0.9 },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.promote, true, 'decidePromotion: holdout within slack promotes')
  eq(result.checks.holdout, true, 'decidePromotion: checks.holdout=true when within slack')
  eq(result.reason.includes('0.890000'), true, 'decidePromotion: promote reason carries candidate holdout')
  eq(result.reason.includes('0.900000'), true, 'decidePromotion: promote reason carries incumbent holdout')
}

{
  const result = decidePromotion({
    candidate: { score: 0.9, holdoutScore: 0.88 },
    incumbent: { score: 0.8, holdoutScore: 0.9 },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(
    result.promote,
    true,
    'decidePromotion: holdout exactly at (incumbent - slack) promotes',
  )
}

{
  const result = decidePromotion({
    candidate: { score: 0.9, holdoutScore: 0.5 },
    incumbent: { score: 0.8, holdoutScore: null },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.promote, true, 'decidePromotion: holdout check skipped when one side is null')
  eq(result.checks.holdout, true, 'decidePromotion: skipped holdout check is vacuously true')
}

{
  const result = decidePromotion({
    candidate: { score: 0.9, holdoutScore: 0.9 },
    incumbent: { score: 0.1, holdoutScore: 0.85 },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(
    Object.keys(result.checks).sort().join(','),
    'baseline,complete,enoughTasks,gain,holdout',
    'decidePromotion: checks exposes one key per sub-decision',
  )
  ok(
    Object.values(result.checks).every((value) => typeof value === 'boolean'),
    'decidePromotion: every checks value is a boolean',
  )
}

// ---------------------------------------------------------------------------
// decidePromotion — defensive handling
// ---------------------------------------------------------------------------
throwsNot(() => decidePromotion(null), 'decidePromotion: null input does not throw')
{
  const result = decidePromotion(null)
  eq(result.promote, false, 'decidePromotion: null input rejects')
  eq(result.reason, 'incomplete evidence', 'decidePromotion: null input reports incomplete evidence')
  eq(result.delta, 0, 'decidePromotion: null input delta is 0')
  ok(
    Object.values(result.checks).every((value) => typeof value === 'boolean'),
    'decidePromotion: null input still returns all boolean checks',
  )
}

throwsNot(
  () => decidePromotion({ candidate: { score: Number.NaN }, incumbent: {}, evidence: {} }),
  'decidePromotion: undefined config/evidence and NaN scores do not throw',
)

{
  const result = decidePromotion({
    candidate: { score: Number.NaN, holdoutScore: Number.NaN },
    incumbent: { score: Number.NaN, holdoutScore: Number.NaN },
    config: CONFIG,
    evidence: EVIDENCE_OK,
  })
  eq(result.promote, false, 'decidePromotion: NaN scores never promote')
  eq(result.delta, 0, 'decidePromotion: NaN scores normalize delta to 0')
  eq(result.checks.gain, false, 'decidePromotion: NaN scores fail the gain check')
}

{
  const result = decidePromotion({
    candidate: { score: 0.9, holdoutScore: 0.9 },
    incumbent: { score: 0.1, holdoutScore: 0.1 },
    evidence: EVIDENCE_OK,
  })
  eq(result.promote, false, 'decidePromotion: missing config cannot promote')
  eq(result.checks.enoughTasks, false, 'decidePromotion: missing minTasks counts as unsatisfiable')
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
console.log('')
console.log(`${passed}/${total} passed`)
process.exitCode = failed === 0 ? 0 : 1
