// Unit tests for src/knowledge/select.js: no test framework, no dependencies.
// Run: node tests/select.test.mjs
import process from 'node:process'

import {
  isExpired,
  matchReason,
  pruneLessons,
  scoreLesson,
  selectLessons,
} from '../src/knowledge/select.js'

// ---------------------------------------------------------------------------
// tiny assertion harness (same shape as the repo's other tests)
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

function deepEqual(actual, expected) {
  if (Object.is(actual, expected)) return true
  if (typeof actual !== 'object' || typeof expected !== 'object') return false
  if (actual === null || expected === null) return false
  if (Array.isArray(actual) !== Array.isArray(expected)) return false
  const actualKeys = Object.keys(actual)
  const expectedKeys = Object.keys(expected)
  if (actualKeys.length !== expectedKeys.length) return false
  return actualKeys.every((key) => deepEqual(actual[key], expected[key]))
}

function deepEq(actual, expected, name) {
  total += 1
  if (deepEqual(actual, expected)) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function approx(actual, expected, name, epsilon = 1e-9) {
  total += 1
  if (Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected approximately ${expected}, got ${actual}`)
  }
}

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------
function makeLesson(overrides = {}) {
  return {
    id: 'lsn-base',
    family: 'src/parser',
    taskIds: [],
    tags: [],
    kind: 'fact',
    claim: 'The parser rejects X because Y',
    evidence: 'round 3 verifier: passed',
    confidence: 0.6,
    status: 'active',
    createdRound: 0,
    ttlRounds: 12,
    useCount: 0,
    gainSum: 0,
    harmCount: 0,
    lastUsedRound: null,
    ...overrides,
  }
}

const TASK = { id: 'task-1', family: 'src/parser', tags: ['rewrite', 'parser'] }
const CALL = { round: 3, task: TASK, phase: 'exploit' }

// ---------------------------------------------------------------------------
// 1. exploration never receives prior guidance
// ---------------------------------------------------------------------------
{
  const lessons = [
    makeLesson({ id: 'great-1', confidence: 1, gainSum: 50, useCount: 1 }),
    makeLesson({ id: 'great-2', confidence: 0.99, gainSum: 10, useCount: 0 }),
  ]
  deepEq(
    selectLessons(lessons, { ...CALL, phase: 'explore' }),
    [],
    'explore phase returns [] even when great lessons exist',
  )
}

// ---------------------------------------------------------------------------
// 2. only active lessons
// ---------------------------------------------------------------------------
{
  const lessons = [
    makeLesson({ id: 'active', status: 'active' }),
    makeLesson({ id: 'quarantined', status: 'quarantined', confidence: 0.99 }),
    makeLesson({ id: 'retired', status: 'retired', confidence: 0.99 }),
  ]
  deepEq(
    selectLessons(lessons, CALL).map((lesson) => lesson.id),
    ['active'],
    'quarantined and retired lessons are excluded',
  )
}

// ---------------------------------------------------------------------------
// 3. expiry and the exact TTL boundary
// ---------------------------------------------------------------------------
{
  eq(
    isExpired(makeLesson({ createdRound: 0, ttlRounds: 5 }), { round: 5 }),
    false,
    'isExpired is false exactly at the TTL boundary',
  )
  eq(
    isExpired(makeLesson({ createdRound: 0, ttlRounds: 5 }), { round: 6 }),
    true,
    'isExpired is true one round past the TTL',
  )
  eq(
    isExpired(makeLesson({ createdRound: 0, ttlRounds: undefined }), { round: 12 }),
    false,
    'isExpired defaults ttlRounds to 12',
  )

  const atTtl = makeLesson({ id: 'at-ttl', createdRound: 2, ttlRounds: 5, confidence: 0.4 })
  const pastTtl = makeLesson({ id: 'past-ttl', createdRound: 2, ttlRounds: 4, confidence: 0.9 })
  deepEq(
    selectLessons([pastTtl, atTtl], { ...CALL, round: 7 }).map((lesson) => lesson.id),
    ['at-ttl'],
    'lesson at createdRound + ttl is included; expired lesson is excluded',
  )
}

// ---------------------------------------------------------------------------
// 4. holdout isolation via excludeFamilies
// ---------------------------------------------------------------------------
{
  const parser = makeLesson({ id: 'parser', family: 'src/parser' })
  const lexer = makeLesson({ id: 'lexer', family: 'src/lexer', tags: ['rewrite'] })

  deepEq(
    selectLessons([parser, lexer], { ...CALL, excludeFamilies: ['src/parser'] }).map(
      (lesson) => lesson.id,
    ),
    ['lexer'],
    'excludeFamilies removes the lesson family and keeps other families',
  )
  deepEq(
    selectLessons([parser, lexer], CALL).map((lesson) => lesson.id),
    ['lexer', 'parser'],
    'without exclusions both families survive',
  )
}

// ---------------------------------------------------------------------------
// 5. matchReason and its priority order
// ---------------------------------------------------------------------------
{
  eq(
    matchReason(makeLesson({ family: 'src/parser' }), TASK),
    'family',
    'matchReason reports family',
  )
  eq(
    matchReason(makeLesson({ family: 'src/other', taskIds: ['task-1'] }), TASK),
    'task',
    'matchReason reports task',
  )
  eq(
    matchReason(makeLesson({ family: 'src/other', tags: ['rewrite'] }), TASK),
    'tag',
    'matchReason reports tag',
  )
  eq(
    matchReason(makeLesson({ family: '*', tags: [] }), TASK),
    'wildcard',
    'matchReason reports wildcard',
  )
  eq(
    matchReason(makeLesson({ family: 'src/other', tags: ['unrelated'] }), TASK),
    null,
    'matchReason reports null when nothing matches',
  )
  eq(
    matchReason(makeLesson({ family: 'src/parser', tags: ['rewrite'] }), TASK),
    'family',
    'family wins over tag',
  )
  eq(
    matchReason(makeLesson({ family: 'src/parser', taskIds: ['task-1'] }), TASK),
    'family',
    'family wins over task',
  )
  eq(
    matchReason(makeLesson({ family: '*', tags: ['rewrite'] }), TASK),
    'tag',
    'tag wins over wildcard',
  )
  eq(
    matchReason(makeLesson({ family: '*', taskIds: ['task-1'] }), TASK),
    'task',
    'task wins over wildcard',
  )
}

// ---------------------------------------------------------------------------
// 6. phase-specific kinds
// ---------------------------------------------------------------------------
{
  const lessons = [
    makeLesson({ id: 'fact', kind: 'fact', confidence: 0.5 }),
    makeLesson({ id: 'hazard', kind: 'hazard', confidence: 0.4 }),
    makeLesson({ id: 'recipe', kind: 'recipe', confidence: 0.9 }),
  ]

  deepEq(
    selectLessons(lessons, { ...CALL, phase: 'repair' }).map((lesson) => lesson.id),
    ['fact', 'hazard'],
    'repair excludes recipes but keeps facts and hazards',
  )
  deepEq(
    selectLessons(lessons, { ...CALL, phase: 'exploit' }).map((lesson) => lesson.id),
    ['recipe', 'fact', 'hazard'],
    'exploit keeps recipes',
  )
}

// ---------------------------------------------------------------------------
// 7. limit, score ordering, and tie breaks
// ---------------------------------------------------------------------------
{
  const lessons = [1, 2, 3, 4, 5].map((n) =>
    makeLesson({ id: `l${n}`, confidence: n / 10 }),
  )

  const picked = selectLessons(lessons, { ...CALL, limit: 3 })
  eq(picked.length, 3, 'limit is respected')
  deepEq(
    picked.map((lesson) => lesson.id),
    ['l5', 'l4', 'l3'],
    'ordering is score descending',
  )
  ok(
    picked[0].score >= picked[1].score && picked[1].score >= picked[2].score,
    'selected scores are non-increasing',
  )

  const tieA = makeLesson({ id: 'a', confidence: 0.5, createdRound: 2 })
  const tieB = makeLesson({ id: 'b', confidence: 0.5, createdRound: 2 })
  deepEq(
    selectLessons([tieB, tieA], CALL).map((lesson) => lesson.id),
    ['a', 'b'],
    'equal scores and rounds break by id ascending',
  )

  const older = makeLesson({ id: 'older', confidence: 0.5, createdRound: 2 })
  const newer = makeLesson({ id: 'z-newer', confidence: 0.5, createdRound: 4 })
  deepEq(
    selectLessons([older, newer], CALL).map((lesson) => lesson.id),
    ['z-newer', 'older'],
    'equal scores break by newer createdRound first',
  )

  eq(selectLessons(lessons, { ...CALL, limit: 0 }).length, 0, 'limit 0 returns nothing')
  eq(selectLessons(lessons, { ...CALL, limit: 99 }).length, 5, 'limit above the pool returns all')
}

// ---------------------------------------------------------------------------
// 8. scoreLesson: formula, staleness, NaN safety
// ---------------------------------------------------------------------------
{
  eq(
    scoreLesson(makeLesson({ confidence: 0.5, createdRound: 0 }), { round: 0 }),
    0.5,
    'score starts from confidence',
  )
  eq(
    scoreLesson(makeLesson({ confidence: 0.5, gainSum: 2, useCount: 1 }), { round: 0 }),
    1.5,
    'gainSum / (useCount + 1) is added',
  )
  eq(
    scoreLesson(makeLesson({ confidence: 0.5, harmCount: 2 }), { round: 0 }),
    -0.5,
    '0.5 * harmCount is subtracted',
  )
  ok(
    scoreLesson(makeLesson({ confidence: 0.2 }), { round: 0 }) <
      scoreLesson(makeLesson({ confidence: 0.2, gainSum: 1, useCount: 1 }), { round: 0 }),
    'gain raises the score',
  )
  ok(
    scoreLesson(makeLesson({ confidence: 0.8, harmCount: 1 }), { round: 0 }) <
      scoreLesson(makeLesson({ confidence: 0.8 }), { round: 0 }),
    'harm lowers the score',
  )

  const fresh = scoreLesson(makeLesson({ confidence: 0.5, createdRound: 0 }), { round: 0 })
  const stale = scoreLesson(makeLesson({ confidence: 0.5, createdRound: 0 }), { round: 12 })
  eq(stale, 0.35, 'staleness subtracts 0.15 after 12 rounds')
  ok(stale < fresh, 'staleness reduces the score')

  approx(
    scoreLesson(makeLesson({ confidence: 0.1, gainSum: 1, useCount: 2 }), { round: 0 }),
    0.433333,
    'scores are rounded to 6 decimals',
  )

  const nanScore = scoreLesson(
    makeLesson({
      confidence: NaN,
      gainSum: NaN,
      useCount: NaN,
      harmCount: NaN,
      createdRound: NaN,
    }),
    { round: 0 },
  )
  eq(Number.isFinite(nanScore), true, 'NaN inputs produce a finite score')
  eq(nanScore, 0, 'NaN-only inputs score 0')
  eq(Number.isFinite(scoreLesson(null)), true, 'scoreLesson(null) is finite')
}

// ---------------------------------------------------------------------------
// 9. returned lessons are copies
// ---------------------------------------------------------------------------
{
  const input = [makeLesson({ id: 'copy-me', claim: 'original', tags: ['keep'] })]
  const picked = selectLessons(input, CALL)

  ok(picked[0] !== input[0], 'returned lesson is a different object')
  picked[0].claim = 'mutated'
  picked[0].tags.push('mutated')
  eq(input[0].claim, 'original', 'mutating the copy leaves the input claim untouched')
  deepEq(input[0].tags, ['keep'], 'mutating a copied array leaves the input tags untouched')
  ok(!('score' in input[0]), 'score is not written back to the input lesson')
}

// ---------------------------------------------------------------------------
// 10. pruneLessons
// ---------------------------------------------------------------------------
{
  const expired = makeLesson({ id: 'expired', createdRound: 0, ttlRounds: 5 })
  const neverGained = makeLesson({ id: 'never-gained', useCount: 5, gainSum: 0 })
  const gained = makeLesson({ id: 'gained', useCount: 5, gainSum: 0.4 })
  const lightUse = makeLesson({ id: 'light-use', useCount: 4, gainSum: -3 })
  const fresh = makeLesson({ id: 'fresh', createdRound: 6 })

  const input = [expired, neverGained, gained, lightUse, fresh]
  const before = input.slice()
  const result = pruneLessons(input, { round: 10, max: 200 })

  deepEq(
    result.retired,
    ['expired', 'never-gained'],
    'prune retires expired and used-5-times-never-gained lessons',
  )
  deepEq(
    result.kept.map((lesson) => lesson.id),
    ['fresh', 'gained', 'light-use'],
    'prune keeps the rest, newest createdRound first then id',
  )
  eq(input.length, 5, 'prune does not drop input entries')
  ok(
    input.every((lesson, index) => lesson === before[index]),
    'prune neither mutates nor reorders the input array',
  )
  eq(result.kept[0], fresh, 'prune returns the original lesson references')
}

{
  const series = [1, 2, 3, 4, 5].map((n) =>
    makeLesson({ id: `c${n}`, createdRound: n }),
  )
  const before = series.slice()
  const result = pruneLessons(series, { round: 0, max: 2 })

  deepEq(
    result.kept.map((lesson) => lesson.id),
    ['c5', 'c4'],
    'prune caps at max, keeping the newest by createdRound',
  )
  deepEq(result.retired, [], 'entries beyond max are not reported as retired')
  ok(
    series.every((lesson, index) => lesson === before[index]),
    'capped prune does not reorder the input array',
  )
  eq(pruneLessons(series, { round: 0 }).kept.length, 5, 'prune keeps everything under the default max')
}

// ---------------------------------------------------------------------------
// 11. malformed input never throws
// ---------------------------------------------------------------------------
{
  for (const bad of [null, undefined, 42, 'lessons', {}, []]) {
    let selected
    let threw = false
    try {
      selected = selectLessons(bad, CALL)
    } catch {
      threw = true
    }
    eq(threw, false, `selectLessons(${JSON.stringify(bad)}) does not throw`)
    deepEq(selected, [], `selectLessons(${JSON.stringify(bad)}) returns []`)
  }

  const mixed = [
    null,
    42,
    'lesson',
    {},
    { id: 'no-status', family: 'src/parser' },
    { id: 'missing-family', status: 'active' },
    makeLesson({ id: 'good' }),
  ]
  deepEq(
    selectLessons(mixed, CALL).map((lesson) => lesson.id),
    ['good'],
    'selectLessons skips malformed entries and keeps the valid one',
  )
  deepEq(
    selectLessons([makeLesson({ id: 'opts' })], null),
    [],
    'selectLessons tolerates a null options object',
  )

  eq(Number.isFinite(scoreLesson(undefined)), true, 'scoreLesson(undefined) is finite')
  eq(typeof isExpired(null), 'boolean', 'isExpired(null) returns a boolean')
  eq(matchReason(null, null), null, 'matchReason(null, null) returns null')
  eq(matchReason({}, null), null, 'matchReason({}, null) returns null')

  let pruned
  let pruneThrew = false
  try {
    pruned = pruneLessons(null)
  } catch {
    pruneThrew = true
  }
  eq(pruneThrew, false, 'pruneLessons(null) does not throw')
  deepEq(pruned, { kept: [], retired: [] }, 'pruneLessons(null) returns empty buckets')

  const pruneMixed = pruneLessons(
    [null, 42, 'lesson', {}, { id: 'good-1' }, { id: 'good-2', createdRound: 1 }],
    { round: 0 },
  )
  deepEq(
    pruneMixed.kept.map((lesson) => lesson.id),
    ['good-2', 'good-1'],
    'pruneLessons skips entries without ids',
  )
  deepEq(pruneMixed.retired, [], 'pruneLessons does not retire malformed-but-id-bearing entries')
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
console.log('')
console.log(`${passed}/${total} passed`)
process.exitCode = failed === 0 ? 0 : 1
