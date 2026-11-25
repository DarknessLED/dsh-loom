/**
 * Spec: a lesson the loop derives has to say where it stops applying.
 *
 * `knowledge.json` holds 153 lessons. The ones folded in from research carry a
 * `notWhen` because `src/research/sink.js` refuses a fact lesson without one:
 * "a fact lesson needs a notWhen boundary; without one it is an over-general
 * rule". The ones the loop derives from its own round (`deriveLesson` in
 * `src/knowledge/impact.js`) carried nothing, so the brief printed them to the
 * next worker as if they were true everywhere. A statement measured on one task,
 * with one verifier, under one scoring instrument is a statement about those
 * three things — and the next worker is the only reader who can skip it.
 *
 * So: derive the boundary from what the round actually measured (the task, the
 * verifier, the instrument), mark a lesson that genuinely cannot state one, give
 * old records the same treatment through a migration that never overwrites a
 * stated boundary, and make sure the brief cannot print a claim without it.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { deriveLesson, NO_BOUNDARY_MARKER } from '../../src/knowledge/impact.js'
import { backfillLessonBoundary, readGlobalLessons } from '../../src/knowledge/store.js'
import { buildWorkerBrief } from '../../src/dispatch/brief.js'

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

// ---------------------------------------------------------------------------
// 1. A derived lesson states the task, the verifier and the instrument
// ---------------------------------------------------------------------------
const graded = deriveLesson({
  attempt: {
    id: 'r3a2',
    verifierOk: true,
    score: 0.62,
    scoreSource: 'killRate',
    metrics: { killRate: 0.62 },
    report: {
      lesson: 'the gate reads the tree before it applies the patch',
      changed: ['src/gate/gate.js'],
      confidence: 0.7,
    },
  },
  task: { id: 't-holdout', family: 'gate', verify: { cmd: 'node scripts/check.mjs' } },
  round: 3,
})

assert.ok(Array.isArray(graded.notWhen), 'a derived lesson carries a boundary field at all')
assert.ok(graded.notWhen.length >= 1, 'and the boundary is not empty')
const stated = graded.notWhen.join(' | ').toLowerCase()
assert.ok(stated.includes('t-holdout'), `the boundary names the task it was measured on: ${stated}`)
assert.ok(
  stated.includes('node scripts/check.mjs'),
  `the boundary names the verifier that judged it: ${stated}`,
)
assert.ok(stated.includes('kill rate'), `the boundary names the scoring instrument: ${stated}`)
assert.ok(
  !graded.notWhen.includes(graded.claim),
  'the boundary is not a restatement of the claim',
)
assert.ok(
  !stated.replace(/\s+/g, ' ').includes(graded.claim.toLowerCase()),
  'the boundary says where the claim stops, not what the claim is',
)
assert.ok(
  graded.notWhen.every((entry) => typeof entry === 'string' && entry.trim() && entry.length <= 200),
  'each boundary sentence is a bounded, non-empty string',
)
ok('a derived lesson says which task, verifier and instrument it came from')

// A binary verdict is a different instrument from a measured kill rate, and the
// boundary has to say which one the claim was earned under.
const binary = deriveLesson({
  attempt: {
    id: 'r4a1',
    verifierOk: true,
    score: 1,
    scoreSource: 'binary',
    metrics: {},
    report: { lesson: 'the fixture starts from a genuinely failing base' },
  },
  task: { id: 't-fixture', family: 'fixture', verify: { cmd: 'node tests/check.mjs' } },
  round: 4,
})
const binaryBoundary = binary.notWhen.join(' | ').toLowerCase()
assert.ok(binaryBoundary.includes('pass/fail'), `a binary verdict says so: ${binaryBoundary}`)
assert.ok(
  !/measured kill rate \(\d/.test(binaryBoundary),
  'a binary verdict is not described as a measured kill rate',
)
ok('a lesson earned on a pass/fail verdict names that instrument, not a kill rate')

// The verifier may be withheld from the worker. What the loop can still state is
// that the verifier was hidden; inventing a command would be a false boundary.
const hidden = deriveLesson({
  attempt: { id: 'r5a1', verifierOk: true, report: { lesson: 'hidden verifiers punish guesses' } },
  task: { id: 't-hidden', family: 'hidden', verify: { hidden: true } },
  round: 5,
})
assert.ok(
  hidden.notWhen.join(' ').toLowerCase().includes('hidden verifier'),
  `a hidden verifier is named as such: ${hidden.notWhen.join(' | ')}`,
)
ok('a hidden verifier is described, not guessed')

// ---------------------------------------------------------------------------
// 2. A lesson that cannot state a boundary says so instead of saying nothing
// ---------------------------------------------------------------------------
// No task, no verifier, no verdict: the record proves one round happened and
// nothing about where its claim holds. Silence is what made the old lessons read
// as universal, so the honest answer is a sentence, not an empty array.
const bare = deriveLesson({ attempt: { id: 'r9', report: { lesson: 'the cache outlives the round' } } })
assert.equal(
  NO_BOUNDARY_MARKER,
  'no boundary measured: one round, one task',
  'the marker is the one fixed sentence the whole tree shares',
)
assert.deepEqual(
  bare.notWhen,
  [NO_BOUNDARY_MARKER],
  'an unmeasurable boundary is marked, not left empty',
)
ok('a lesson with no measurable boundary is marked as unmeasured')

// ---------------------------------------------------------------------------
// 3. The migration fills only what is empty, and lands in the same place twice
// ---------------------------------------------------------------------------
const home = mkdtempSync(join(tmpdir(), 'rsi-boundary-'))
const file = join(home, 'knowledge.json')
const legacy = [
  // Derived before the field existed: no key at all.
  { id: 'lsn-old-1', kind: 'fact', claim: 'the gate reads the tree early', origin: 'self-observed', trust: 'observed' },
  // Derived with an empty list, which is the same silence written differently.
  { id: 'lsn-old-2', kind: 'fact', claim: 'the fixture must fail first', notWhen: [], origin: 'self-observed', trust: 'observed' },
  // A boundary it already states is the one thing the migration must not touch.
  {
    id: 'lsn-kept',
    kind: 'fact',
    claim: 'restart the worker when the link stalls',
    notWhen: ['only measured on task t-9'],
    origin: 'self-observed',
    trust: 'observed',
  },
  // Research lessons have a stated boundary and a different origin; they are not
  // the loop's own claims and the migration leaves them alone as well.
  {
    id: 'lsn-paper',
    kind: 'fact',
    claim: 'a rate must be measured against a paired baseline',
    notWhen: ['when no baseline was measured'],
    source: 'research',
    origin: 'research-claim',
    trust: 'verified',
  },
]
writeFileSync(file, `${JSON.stringify(legacy, null, 1)}\n`)

const first = backfillLessonBoundary(home)
assert.equal(first.updated, 2, 'only the two records without a boundary are filled')
assert.equal(first.kept, 2, 'the two records that already state one are kept')

const after = readGlobalLessons(home)
const byId = Object.fromEntries(after.map((lesson) => [lesson.id, lesson]))
assert.deepEqual(
  byId['lsn-old-1'].notWhen,
  [NO_BOUNDARY_MARKER],
  'a record that predates the field is marked, not left silent',
)
assert.deepEqual(byId['lsn-old-2'].notWhen, [NO_BOUNDARY_MARKER], 'an empty list is filled the same way')
assert.deepEqual(
  byId['lsn-kept'].notWhen,
  ['only measured on task t-9'],
  'a stated boundary is never overwritten',
)
assert.deepEqual(
  byId['lsn-paper'].notWhen,
  ['when no baseline was measured'],
  'a research boundary is never overwritten either',
)
assert.deepEqual(
  after.map((lesson) => lesson.claim),
  legacy.map((lesson) => lesson.claim),
  'the migration rewrites boundaries, never claims',
)
ok('the backfill fills only the lessons that have no boundary')

const beforeSecond = readFileSync(file, 'utf8')
const second = backfillLessonBoundary(home)
assert.equal(second.updated, 0, 'a second run changes nothing')
assert.equal(second.kept, 4, 'and now keeps every record it finds')
assert.equal(readFileSync(file, 'utf8'), beforeSecond, 'the second run does not even rewrite the file')
assert.deepEqual(backfillLessonBoundary(mkdtempSync(join(tmpdir(), 'rsi-boundary-empty-'))), {
  updated: 0,
  kept: 0,
})
ok('the backfill is idempotent, and a home with no store is a no-op')

// ---------------------------------------------------------------------------
// 4. The brief cannot print a claim without saying where it stops
// ---------------------------------------------------------------------------
const withBoundary = buildWorkerBrief({
  objective: 'fix the gate',
  task: { id: 't-holdout', prompt: 'WORKER: fix it', verify: { cmd: 'node scripts/check.mjs' } },
  lessons: [graded],
})
const gradedLine = withBoundary
  .split(/\r?\n/)
  .find((line) => line.includes(graded.claim) && line.startsWith('- ['))
assert.ok(gradedLine, 'the derived lesson is rendered as a lesson line')
assert.ok(
  gradedLine.toLowerCase().includes('t-holdout') && gradedLine.includes('node scripts/check.mjs'),
  `the rendered line carries the boundary: ${gradedLine}`,
)
assert.ok(
  /kill rate/i.test(gradedLine),
  `the rendered line says which instrument judged the claim: ${gradedLine}`,
)
ok('the brief prints the boundary next to the claim it limits')

const unmeasured = buildWorkerBrief({
  objective: 'fix the gate',
  task: { id: 't-holdout', prompt: 'WORKER: fix it' },
  lessons: [
    { kind: 'fact', claim: 'the cache outlives the round', origin: 'self-observed', trust: 'observed' },
    { kind: 'fact', claim: 'an old claim with an empty list', notWhen: [], origin: 'self-observed', trust: 'observed' },
  ],
})
const unmeasuredLines = unmeasured
  .split(/\r?\n/)
  .filter((line) => line.startsWith('- ['))
assert.equal(unmeasuredLines.length, 2, 'both lessons are rendered')
for (const line of unmeasuredLines) {
  assert.ok(
    line.includes(NO_BOUNDARY_MARKER),
    `a lesson with no boundary is marked as unmeasured, not printed as universal: ${line}`,
  )
}
ok('the brief marks a lesson whose boundary was never measured')
ok('a lesson without a boundary is not printed as if it were universal')

rmSync(home, { recursive: true, force: true })
console.log(`\n${passed}/${passed} passed`)
