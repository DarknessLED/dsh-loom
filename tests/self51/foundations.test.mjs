// The reading list a survey already knew about but never used.
//
// `cls.foundations` ranks the works a direction cites by how many of its read
// papers cite them. The survey documents print that table; nothing read the
// papers in it. This spec pins the selection rules, each of which was a way to
// get a list that looks reasonable and is not:
//
//   * a work without an arXiv id cannot be fetched, so it must be dropped
//     instead of retried on every direction;
//   * ties must break on title, or the same corpus yields different lists on
//     different runs and the document stops being reproducible;
//   * a paper in more than one direction is one paper (the ledger would
//     otherwise store the same bytes twice under two ids);
//   * `sota` entries carry no citation count, so they are appended after the
//     ranking rather than sorted into it with a zero.
import assert from 'node:assert/strict'
import test from 'node:test'

import { selectReadingList } from '../../src/research/foundations.js'

const work = (arxivId, cites, title, year = 2024) => ({ arxivId, citedByPapers: cites, title, year, key: `title:${title}` })
const survey = (foundations, sota = []) => ({ cls: { foundations, sota } })

test('the list is ordered by how many papers in the corpus cite the work', () => {
  const list = selectReadingList(
    survey([work('2401.00001', 3, 'Few'), work('2401.00002', 30, 'Many'), work('2401.00003', 12, 'Some')]),
    { top: 3 },
  )
  assert.deepEqual(list.map((p) => p.id), ['2401.00002', '2401.00003', '2401.00001'])
  assert.equal(list[0].cites, 30)
  assert.equal(list[0].why, 'foundation')
  // The basis is part of the answer: this is a count inside the corpus, not a
  // field-wide citation count, and the caller must be able to say which.
  assert.match(list[0].basis, /in this corpus/)
})

test('a work with no arXiv id is dropped, not ranked', () => {
  const list = selectReadingList(survey([work('', 99, 'Book with no arXiv page'), work('2401.00001', 2, 'Findable')]), { top: 5 })
  assert.deepEqual(list.map((p) => p.id), ['2401.00001'])
})

test('ties break on title so two runs of the same corpus agree', () => {
  const a = selectReadingList(survey([work('2401.00002', 5, 'Bravo'), work('2401.00001', 5, 'Alpha')]), { top: 2 })
  const b = selectReadingList(survey([work('2401.00001', 5, 'Alpha'), work('2401.00002', 5, 'Bravo')]), { top: 2 })
  assert.deepEqual(a.map((p) => p.id), b.map((p) => p.id))
  assert.deepEqual(a.map((p) => p.id), ['2401.00001', '2401.00002'])
})

test('a work cited once is below the floor and a repeated one is not', () => {
  const list = selectReadingList(survey([work('2401.00001', 1, 'Once'), work('2401.00002', 2, 'Twice')]), { top: 5, minCited: 2 })
  assert.deepEqual(list.map((p) => p.id), ['2401.00002'])
})

test('an excluded id is never selected, and a duplicate direction does not double it', () => {
  const list = selectReadingList(survey([work('2401.00001', 9, 'A'), work('2401.00001', 9, 'A again'), work('2401.00002', 1, 'B')]), {
    top: 5,
    exclude: ['2401.00002'],
  })
  assert.deepEqual(list.map((p) => p.id), ['2401.00001'])
})

test('sota papers fill what the ranking leaves, marked as such', () => {
  const list = selectReadingList(
    survey([work('2401.00001', 9, 'A')], [{ id: '2405.00009', title: 'Recent', year: 2025 }]),
    { top: 2 },
  )
  assert.equal(list.length, 2)
  assert.equal(list[1].why, 'sota')
  assert.equal(list[1].cites, 0)
  assert.match(list[1].basis, /recent/)
})

test('titles lose the quotes and the trailing period a bibliography adds', () => {
  const list = selectReadingList(survey([work('2401.00001', 4, '“Hyperband: A Novel Bandit-Based Approach.”')]), { top: 1 })
  assert.equal(list[0].title, 'Hyperband: A Novel Bandit-Based Approach')
})

test('an empty survey yields an empty list rather than a throw', () => {
  assert.deepEqual(selectReadingList({}, { top: 3 }), [])
  assert.deepEqual(selectReadingList(null, { top: 3 }), [])
})
