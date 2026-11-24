// A verdict on noise is not a verdict.
//
// `trialVerdict` (src/knowledge/cross.js) retires a lesson after twenty showings
// with `wins > losses ? 'keep' : 'drop'`. Twenty showings split 11–9 is a coin
// flip that happens to land on the majority; retiring on it deletes a lesson the
// data cannot convict, and keeping it does the same in the other direction. With
// n = 20 the only proportions a 95% interval separates from a half are the
// extreme ones, and that is the honest bar.
//
// The second half matters more: `pruneLessons` (src/knowledge/select.js) has no
// call site anywhere in `src/`. The retirement rules exist and are tested, and
// nothing runs them — so "forgetting" is a function nobody calls, and a lesson
// that lost its trial is handed to workers forever.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { trialVerdict } from '../../src/knowledge/cross.js'
import { pruneLessons } from '../../src/knowledge/select.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. A split that a 95% interval cannot separate from a half is not a verdict.
assert.equal(
  trialVerdict({ trials: { shown: 20, wins: 11, losses: 9, ties: 0 } }),
  'insufficient',
  'eleven wins in twenty showings does not convict a lesson',
)
assert.equal(
  trialVerdict({ trials: { shown: 20, wins: 9, losses: 11, ties: 0 } }),
  'insufficient',
  'and eleven losses does not acquit it either',
)

// 2. A lopsided record still decides, in both directions.
assert.equal(trialVerdict({ trials: { shown: 20, wins: 17, losses: 3, ties: 0 } }), 'keep')
assert.equal(trialVerdict({ trials: { shown: 20, wins: 2, losses: 18, ties: 0 } }), 'drop')
ok('a verdict needs a lopsided record, not a majority')

// 3. Ties carry no direction, so they leave the denominator alone; a record that
// was compared twenty times and never once helped is still a drop.
assert.equal(trialVerdict({ trials: { shown: 20, wins: 0, losses: 0, ties: 20 } }), 'drop')
assert.equal(trialVerdict({ trials: { shown: 20, wins: 0, losses: 0, ties: 0 } }), 'insufficient')
ok('ties are not wins, and silence is not a trial')

// 4. The retirement rule is reachable from the round: the pool a brief is drawn
// from is pruned first, so a lesson that lost its trial stops being shown.
const roundSrc = readFileSync(new URL('../../src/runtime/round.js', import.meta.url), 'utf8')
assert.match(roundSrc, /pruneLessons\(/, 'the round prunes the pool before it selects from it')
ok('the retirement rules run')

// 5. Pruning reports why each lesson left, so the ledger can record a reason
// rather than a disappearing id.
const lessons = [
  { id: 'a', status: 'active', claim: 'lost its trial', trials: { shown: 20, wins: 1, losses: 19, ties: 0 }, createdRound: 1 },
  { id: 'b', status: 'active', claim: 'still running', trials: { shown: 5, wins: 3, losses: 2, ties: 0 }, createdRound: 1 },
  { id: 'c', status: 'active', claim: 'never judged', createdRound: 1 },
]
const pruned = pruneLessons(lessons, { round: 10, max: 200 })
assert.deepEqual(pruned.kept.map((l) => l.id), ['b', 'c'], 'only the convicted lesson leaves')
assert.deepEqual(pruned.retired, ['a'])
assert.equal(pruned.details.length, 1, 'and the reason travels with it')
assert.equal(pruned.details[0].id, 'a')
assert.equal(pruned.details[0].reason, 'trial', 'a trial verdict is its own reason')
ok('a retirement says why')

// 6. Expiry is a different reason from a lost trial, because one is a judgement
// about the lesson and the other is a judgement about the clock.
const expired = pruneLessons(
  [{ id: 'old', status: 'active', claim: 'stale', createdRound: 1, ttlRounds: 2 }],
  { round: 20, max: 200 },
)
assert.deepEqual(expired.retired, ['old'])
assert.equal(expired.details[0].reason, 'expired')
ok('expiry and a lost trial are named differently')
