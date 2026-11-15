// Cross-domain knowledge: advice when the scope matches, inspiration when only
// the difficulty shape matches, and offline consolidation that merges what has
// become the same lesson and asks about what contradicts.
import test from 'node:test'
import assert from 'node:assert/strict'
import { transferRoute, findAnalogies } from '../../src/knowledge/cross.js'
import { consolidate } from '../../src/knowledge/dream.js'

const lessonA = {
  id: 'lsn-a',
  family: 'docs',
  taskIds: ['readme-fix'],
  tags: ['editing'],
  signature: ['cheap-filter', 'editing'],
  claim: 'a cheap screen before the full attempt removes most dead candidates',
  confidence: 0.7,
  status: 'active',
  createdRound: 3,
  ttlRounds: 12,
  useCount: 1,
  gainSum: 0.2,
  harmCount: 0,
  subject: 'src/screen.js',
}

test('same scope is advice, not inspiration', () => {
  const r = transferRoute(lessonA, { family: 'docs', id: 'other-doc', tags: [], signature: [] })
  assert.equal(r.route, 'direct')
  assert.equal(r.advice, true)
  assert.ok(r.score >= 0.9)
  assert.ok(r.reasons.some((x) => /same family|same task|shared tag/.test(x)))
})

test('different domain but same difficulty shape is an analogy, never advice', () => {
  const r = transferRoute(lessonA, {
    family: 'code',
    id: 'perf-task',
    tags: [],
    signature: ['cheap-filter', 'noise'],
  })
  assert.equal(r.route, 'analogy')
  assert.equal(r.advice, false)
  assert.ok(r.score > 0 && r.score < 1)
  const text = r.reasons.join(' ')
  assert.match(text, /different domain/)
  assert.match(text, /cheap-filter/)
})

test('no shared scope and no shared shape is nothing', () => {
  const r = transferRoute(lessonA, { family: 'code', id: 'x', tags: ['db'], signature: ['caching'] })
  assert.equal(r.route, 'none')
  assert.equal(r.advice, false)
})

test('findAnalogies ranks only cross-domain matches and respects limit', () => {
  const lessons = [
    lessonA,
    { ...lessonA, id: 'lsn-b', family: 'docs', signature: ['caching'], claim: 'cache warm reads' },
    { ...lessonA, id: 'lsn-c', family: 'infra', signature: ['cheap-filter'], claim: 'sample before measuring' },
  ]
  // lsn-c has exactly the target shape (score 1); lsn-a shares only one of two
  // shape tags (score 0.5), so the sharper analogy must rank first.
  const out = findAnalogies({ family: 'code', tags: [], signature: ['cheap-filter'] }, lessons, { limit: 1 })
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 'lsn-c')
  assert.equal(out[0].from, 'infra')
  assert.ok(out[0].score > 0)
  const all = findAnalogies({ family: 'code', tags: [], signature: ['cheap-filter'] }, lessons, { limit: 5 })
  assert.equal(all.length, 2)
  assert.deepEqual(all.map((x) => x.id), ['lsn-c', 'lsn-a'])
})

test('consolidate merges near-duplicates and keeps their evidence', () => {
  const dup = { ...lessonA, id: 'lsn-a2', claim: 'a cheap screen before the full attempt removes most dead candidates.', confidence: 0.6 }
  const { lessons, merged } = consolidate([lessonA, dup], { round: 4 })
  assert.equal(merged.length, 1)
  assert.equal(lessons.length, 1)
  assert.deepEqual(merged[0].mergedFrom.sort(), ['lsn-a', 'lsn-a2'])
  assert.equal(lessons[0].gainSum, 0.4)
  assert.equal(lessons[0].useCount, 2)
})

test('consolidate raises a question when two active lessons pull opposite ways', () => {
  const up = { ...lessonA, id: 'lsn-up', subject: 'screen.js', claim: 'screening raises the promoted score' }
  const down = { ...lessonA, id: 'lsn-down', subject: 'screen.js', claim: 'screening lowers the promoted score' }
  const { questions } = consolidate([up, down], { round: 4 })
  assert.equal(questions.length, 1)
  assert.equal(questions[0].kind, 'contradiction')
  assert.match(questions[0].question, /screen\.js/)
  assert.deepEqual([questions[0].a, questions[0].b].sort(), ['lsn-down', 'lsn-up'])
})

test('consolidate retires expired lessons instead of silently keeping them', () => {
  const old = { ...lessonA, id: 'lsn-old', createdRound: 0, ttlRounds: 2 }
  const { lessons, retired } = consolidate([old], { round: 5 })
  assert.equal(lessons.length, 0)
  assert.deepEqual(retired, ['lsn-old'])
})

test('consolidate is deterministic', () => {
  const input = [lessonA, { ...lessonA, id: 'lsn-a2', claim: lessonA.claim }]
  assert.deepEqual(consolidate(input, { round: 4 }), consolidate(input, { round: 4 }))
})
