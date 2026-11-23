// Across eight surveys, a work two directions cite is a fact about agents and a
// work one direction cites is a fact about that direction. These pin the
// distinctions that make the difference visible instead of averaging it away.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  bridges,
  crossDirection,
  pairMatrix,
  readingCoverage,
  renderSynthesis,
  splitShared,
  workIndex,
} from '../../src/research/synthesis.js'

function work(arxivId, title, cites, extra = {}) {
  return { arxivId, title, citedByPapers: cites, year: 2024, inCorpus: false, ...extra }
}

function survey(works) {
  return { agg: { corpus: [], works } }
}

const surveyA = survey([
  work('1111.11111', 'Shared Prior.', 10),
  work('2222.22222', 'Only In A.', 9),
  work('3333.33333', 'Read Already.', 8),
])
const surveyB = survey([
  work('1111.11111', 'Shared Prior.', 4),
  work('4444.44444', 'Only In B.', 3),
])
const surveyC = survey([work('1111.11111', 'Shared Prior.', 6)])

test('a work cited by several directions is one row carrying all of them', () => {
  const cross = crossDirection({ a: surveyA, b: surveyB, c: surveyC })
  const shared = cross.byId.get('1111.11111')
  assert.deepEqual(shared.directions.sort(), ['a', 'b', 'c'])
  assert.equal(shared.count, 3)
  assert.equal(shared.strength.a, 10, 'each direction keeps its own citation count')
  assert.equal(shared.strength.b, 4)
})

test('rows sort by how many directions cite, not by how hard one cites', () => {
  const cross = crossDirection({ a: surveyA, b: surveyB, c: surveyC })
  assert.equal(cross.rows[0].id, '1111.11111')
  // Only-In-A is cited 9 times by one direction; that must not outrank a work
  // three directions independently landed on.
  assert.equal(cross.rows[1].id, '2222.22222')
})

test('works with no arXiv id are not silently counted as shared', () => {
  const cross = crossDirection({
    a: survey([work(null, 'No Id.', 30), work('1111.11111', 'Shared Prior.', 2)]),
    b: survey([work('1111.11111', 'Shared Prior.', 1)]),
  })
  assert.equal(cross.totals.union, 1)
  assert.equal(cross.byId.has('1111.11111'), true)
})

test('a work cited by nobody in the corpus is not an edge', () => {
  const index = workIndex(survey([work('1111.11111', 'Zero.', 0)]))
  assert.equal(index.size, 0)
})

test('the pair matrix says which directions are the same direction', () => {
  const cross = crossDirection({ a: surveyA, b: surveyB, c: surveyC })
  const matrix = pairMatrix(cross, { top: 2 })
  const ab = matrix.cells.find((c) => c.a === 'a' && c.b === 'b')
  assert.equal(ab.shared, 1)
  assert.deepEqual(ab.ids, ['1111.11111'])
  assert.equal(matrix.cells.length, 3, 'one cell per unordered pair')
})

test('a direction that shares nothing with any other is named, not averaged', () => {
  const lonelyB = survey([work('9999.99999', 'Alone.', 5)])
  const cross = crossDirection({ a: surveyA, b: lonelyB })
  const matrix = pairMatrix(cross, { top: 1 })
  // Both sides of a disjoint pair are disjoint from the other: naming only one
  // of them would imply the other has a partner it does not have.
  assert.deepEqual(matrix.lonely.map((l) => l.direction), ['a', 'b'])
})

test('a bridge is cited by many directions and has not been read', () => {
  const cross = crossDirection({
    a: survey([work('1111.11111', 'Shared Prior.', 10)]),
    b: survey([work('1111.11111', 'Shared Prior.', 5)]),
    c: survey([work('1111.11111', 'Shared Prior.', 4)]),
    d: survey([work('1111.11111', 'Shared Prior.', 3)]),
  })
  assert.equal(bridges(cross, { minDirections: 4 }).length, 1)
  assert.equal(bridges(cross, { minDirections: 4, readIds: new Set(['1111.11111']) }).length, 0)
})

test('coverage counts what this direction cites most against what has a body note', () => {
  const cross = crossDirection({ a: surveyA })
  const coverage = readingCoverage(cross, new Set(['3333.33333']), { top: 3 })
  assert.equal(coverage.a.top, 3)
  assert.equal(coverage.a.read, 1)
  assert.deepEqual(coverage.a.missing, ['1111.11111', '2222.22222'])
})

test('the document says co-citation is not endorsement, and omits nothing quietly', () => {
  const cross = crossDirection({ a: surveyA, b: surveyB, c: surveyC })
  const matrix = pairMatrix(cross, { top: 2 })
  const text = renderSynthesis({
    cross,
    matrix,
    bridgeRows: bridges(cross, { minDirections: 2 }),
    coverage: readingCoverage(cross, new Set(), { top: 3 }),
    generated: '2026-11-23',
    reading: '# 手写的判断\n\n正文',
  })
  assert.match(text, /not\*\* evidence the work is right|not\*\* evidence/)
  assert.match(text, /2026-11-23/)
  assert.match(text, /# 手写的判断/, 'the hand-written half is carried through verbatim')
  assert.match(text, /Which directions are the same direction/, 'the pair matrix is in the document')
})

test('a direction nobody cites alongside is called out in the document', () => {
  const cross = crossDirection({ a: surveyA, b: survey([work('9999.99999', 'Alone.', 5)]) })
  const text = renderSynthesis({
    cross,
    matrix: pairMatrix(cross, { top: 1 }),
    bridgeRows: [],
    coverage: readingCoverage(cross, new Set(), { top: 2 }),
    generated: '2026-11-23',
  })
  assert.match(text, /Shares nothing with any other direction/)
})

test('a shared technical report is shared infrastructure, not a shared idea', () => {
  const cross = crossDirection({
    a: survey([work('1111.11111', 'Qwen3 Technical Report.', 10), work('2222.22222', 'Concrete Problems in AI Safety.', 8)]),
    b: survey([work('1111.11111', 'Qwen3 Technical Report.', 5), work('2222.22222', 'Concrete Problems in AI Safety.', 4)]),
    c: survey([work('1111.11111', 'Qwen3 Technical Report.', 3), work('2222.22222', 'Concrete Problems in AI Safety.', 2)]),
  })
  const split = splitShared(cross, { minDirections: 3 })
  assert.deepEqual(split.infrastructure.map((r) => r.id), ['1111.11111'])
  assert.deepEqual(split.ideas.map((r) => r.id), ['2222.22222'])
  // The split must not lose rows: every shared row lands on exactly one side.
  assert.equal(split.infrastructure.length + split.ideas.length, cross.rows.filter((r) => r.count >= 3).length)
})

test('a benchmark everyone runs on counts as infrastructure too', () => {
  const cross = crossDirection({
    a: survey([work('3333.33333', 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?', 9)]),
    b: survey([work('3333.33333', 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?', 6)]),
  })
  assert.equal(splitShared(cross, { minDirections: 2 }).infrastructure.length, 1)
})
