// A lesson is filed under a family, and an eval-set task that never declares
// one is filed under its own id (that is what the attempt record does). If the
// two sides disagree about where the task lives, the lesson can never be shown
// and the whole trial ledger stays empty -- silently.
//
// Found live on 2026-11-16: T3 seeded a procedure for family `tiny` and the
// round ran with no `lesson.shown` at all, because `transferRoute` compared
// `lesson.family` with an absent `task.family`.

import assert from 'node:assert/strict'
import test from 'node:test'

import { transferRoute } from '../../src/knowledge/cross.js'
import { selectLessons } from '../../src/knowledge/select.js'

const lesson = {
  id: 'l-family',
  family: 'tiny',
  kind: 'claim',
  claim: 'two promotions in this family changed README.md first',
  evidence: 'self test',
  confidence: 0.8,
  status: 'active',
  createdRound: 0,
  ttlRounds: 12,
  tags: [],
  taskIds: [],
  notWhen: [],
}

test('a task with no declared family is addressed by its id', () => {
  const route = transferRoute(lesson, { id: 'tiny', prompt: 'fix the thing' })
  assert.equal(route.route, 'direct')
  assert.deepEqual(route.reasons, ['same family: tiny'])
})

test('a task with a different id still does not match', () => {
  const route = transferRoute(lesson, { id: 'other', prompt: 'fix the thing' })
  assert.equal(route.route, 'none')
})

test('selectLessons hands the family lesson to an id-addressed task', () => {
  const got = selectLessons([lesson], {
    task: { id: 'tiny', prompt: 'fix the thing' },
    round: 1,
    phase: 'exploit',
  })
  assert.equal(got.length, 1)
  assert.equal(got[0].id, 'l-family')
})
