import assert from 'node:assert/strict'
import test from 'node:test'

import { pruneLessons } from '../../src/knowledge/select.js'
import { shouldQuarantine } from '../../src/knowledge/impact.js'

function lesson(extra = {}) {
  return {
    id: 'lsn-1',
    family: 'tiny',
    kind: 'procedure',
    status: 'active',
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
  // The verdict is on the comparisons that were judged, not on the showings:
  // twenty showings that produced seven comparisons cannot convict anything.
  const { retired } = pruneLessons([lesson({ trials: { shown: 20, wins: 2, losses: 17 } })], { round: 6 })
  assert.deepEqual(retired, ['lsn-1'])
})

test('a trial that was shown twenty times but compared seven has not decided', () => {
  const { retired } = pruneLessons([lesson({ trials: { shown: 20, wins: 2, losses: 5 } })], { round: 6 })
  assert.deepEqual(retired, [], 'seven comparisons on the wrong side of a coin is not a verdict')
})

test('a lesson with no trial still follows the old never-useful rule', () => {
  const { retired } = pruneLessons([lesson({})], { round: 6 })
  assert.deepEqual(retired, ['lsn-1'])
})

test('an open trial also survives the five-uses quarantine rule', () => {
  // T3: quarantined at showing 5 of 20, which killed the measurement itself.
  const open = lesson({ useCount: 5, gainSum: 0, trials: { shown: 5, wins: 0, losses: 0, ties: 5 } })
  assert.equal(shouldQuarantine(open), false)
})

test('the same five uses do quarantine once the trial has concluded and lost', () => {
  const lost = lesson({ useCount: 5, gainSum: 0, trials: { shown: 20, wins: 2, losses: 5, ties: 13 } })
  assert.equal(shouldQuarantine(lost), true)
})
