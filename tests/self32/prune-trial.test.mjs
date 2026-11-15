import assert from 'node:assert/strict'
import test from 'node:test'

import { pruneLessons } from '../../src/knowledge/select.js'

function lesson(extra = {}) {
  return {
    id: 'lsn-1',
    family: 'tiny',
    kind: 'procedure',
    claim: '2 verified promotions on 2 task(s) began at README.md.',
    createdRound: 0,
    ttlRounds: 400,
    useCount: 5,
    gainSum: 0,
    ...extra,
  }
}

test('an open trial survives the never-useful retirement rule', () => {
  const { kept, retired } = pruneLessons([lesson({ trials: { shown: 5, wins: 0, losses: 0 } })], { round: 6 })
  assert.equal(retired.length, 0)
  assert.equal(kept.length, 1)
  assert.equal(kept[0].id, 'lsn-1')
})

test('a trial that reached its evidence and lost is retired', () => {
  const { retired } = pruneLessons([lesson({ trials: { shown: 20, wins: 2, losses: 5 } })], { round: 6 })
  assert.deepEqual(retired, ['lsn-1'])
})

test('a lesson with no trial still follows the old never-useful rule', () => {
  const { retired } = pruneLessons([lesson({})], { round: 6 })
  assert.deepEqual(retired, ['lsn-1'])
})
