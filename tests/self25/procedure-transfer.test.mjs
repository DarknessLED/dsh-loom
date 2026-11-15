// The transfer channel, end to end:
//
//   1. a lesson that names a `notWhen` condition is not shown when that
//      condition holds -- the field exists to stop negative transfer, so it
//      must be consulted at selection time, not written down and ignored;
//   2. a lesson from another family is shown only as an *analogy* (allowed by
//      the caller, marked on the copy), never as ordinary advice;
//   3. procedures are scarce: at most one per brief, none during repair;
//   4. the global store lets a lesson earned in one campaign reach another,
//      deduped by id and tolerant of a missing/corrupt file;
//   5. being shown and being credited are counted per lesson, and the verdict
//      ("drop after 20 showings that did not win") is mechanical.

import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { selectLessons } from '../../src/knowledge/select.js'
import { trialVerdict } from '../../src/knowledge/cross.js'
import { appendGlobalLesson, readGlobalLessons } from '../../src/knowledge/store.js'
import { shapeOf } from '../../src/knowledge/impact.js'
import { reduce } from '../../src/core/reduce.js'

const base = (over) => ({
  id: 'lsn-a',
  family: 'code',
  taskIds: [],
  tags: ['fix'],
  kind: 'fact',
  claim: 'a claim',
  status: 'active',
  createdRound: 1,
  ttlRounds: 12,
  useCount: 0,
  gainSum: 0,
  harmCount: 0,
  confidence: 0.5,
  ...over,
})

test('a lesson whose notWhen condition holds is not shown', () => {
  const lessons = [
    base({ id: 'lsn-flaky', claim: 'trust the verifier', notWhen: ['flaky'] }),
    base({ id: 'lsn-ok', claim: 'read the failing case first' }),
  ]
  const task = { family: 'code', tags: ['fix'], text: 'the flaky suite timed out again' }
  const shown = selectLessons(lessons, { task, round: 4 })
  assert.deepEqual(shown.map((l) => l.id), ['lsn-ok'])
})

test('a cross-family lesson is an analogy, and only when the caller allows it', () => {
  const lessons = [
    base({ id: 'lsn-docs', family: 'docs', shape: ['near-miss'], claim: 'the last failing case is the one that matters' }),
  ]
  const task = { family: 'code', tags: [], shape: ['near-miss'] }
  assert.equal(selectLessons(lessons, { task, round: 4 }).length, 0)
  const shown = selectLessons(lessons, { task, round: 4, allowAnalogies: true })
  assert.equal(shown.length, 1)
  assert.equal(shown[0].id, 'lsn-docs')
  assert.equal(shown[0].analogy, true, 'an analogy must be marked as one')
})

test('procedures are scarce and never shown during repair', () => {
  const lessons = [
    base({ id: 'lsn-p1', kind: 'procedure', createdRound: 1 }),
    base({ id: 'lsn-p2', kind: 'procedure', createdRound: 2 }),
    base({ id: 'lsn-f1', claim: 'f1' }),
    base({ id: 'lsn-f2', claim: 'f2' }),
  ]
  const task = { family: 'code', tags: ['fix'] }
  const shown = selectLessons(lessons, { task, round: 4, limit: 3, allowProcedures: true })
  assert.equal(shown.length, 3)
  assert.equal(shown.filter((l) => l.kind === 'procedure').length, 1, 'one procedure per brief')
  const repair = selectLessons(lessons, { task, round: 4, phase: 'repair', allowProcedures: true })
  assert.equal(repair.filter((l) => l.kind === 'procedure').length, 0)
})

test('the global store round-trips, dedupes by id and tolerates a bad file', () => {
  const home = mkdtempSync(join(tmpdir(), 'loom-store-'))
  assert.deepEqual(readGlobalLessons(home), [])
  const one = base({ id: 'lsn-x', claim: 'x' })
  appendGlobalLesson(home, one)
  appendGlobalLesson(home, { ...one, claim: 'x changed' })
  const back = readGlobalLessons(home)
  assert.equal(back.length, 1)
  assert.equal(back[0].claim, 'x changed', 'last write wins')
  writeFileSync(join(home, 'knowledge.json'), '{not json')
  assert.deepEqual(readGlobalLessons(home), [])
  assert.ok(existsSync(join(home, 'knowledge.json')))
})

test('shown and credited are counted, and 20 showings without a win is a drop', () => {
  const lesson = base({ id: 'lsn-t', kind: 'procedure' })
  const ev = (type, data) => ({ t: 1000, type, data })
  const seed = [ev('lesson.added', { lesson })]
  let state = reduce(seed, 'c')
  state = reduce([...seed, ev('lesson.shown', { id: 'lsn-t', round: 3 })], 'c')
  assert.deepEqual(state.lessons[0].trials, { shown: 1, wins: 0, losses: 0 })
  state = reduce([...seed, ev('lesson.shown', { id: 'lsn-t', round: 3 }), ev('lesson.impact', { id: 'lsn-t', delta: 0.2, harm: false, round: 3 })], 'c')
  assert.deepEqual(state.lessons[0].trials, { shown: 1, wins: 1, losses: 0 })
  assert.equal(trialVerdict(state.lessons[0]), 'insufficient')
  const twenty = { ...state.lessons[0], trials: { shown: 20, wins: 3, losses: 9 } }
  assert.equal(trialVerdict(twenty), 'drop')
  const good = { ...twenty, trials: { shown: 20, wins: 11, losses: 3 } }
  assert.equal(trialVerdict(good), 'keep')
})

test('an attempt is classified into a shape that can travel', () => {
  assert.deepEqual(shapeOf({ error: 'timeout' }), ['error'])
  assert.deepEqual(shapeOf({ verifierOk: false, progress: 0.9 }), ['near-miss'])
  assert.deepEqual(shapeOf({ verifierOk: false, progress: 0.2 }), ['unsolved'])
  assert.deepEqual(shapeOf({ verifierOk: true, progress: 1 }), ['solved'])
  assert.deepEqual(shapeOf({ verifierOk: false, progress: 0, changed: [] }), ['no-patch'])
})
