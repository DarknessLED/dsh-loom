// Spec: lesson exposure must be randomised across candidates, not fixed to "every
// candidate but the first".
//
// Today `selectLessons` is called for every attempt after the control, so a round
// reads as "a1 = control, a2 = treated". Any difference between the two attempts —
// a different prompt sample, a slower model step, plain luck — is then booked as
// lesson gain or harm. The recorded `lesson.impact` deltas in the night ledger show
// exactly that: -1 "harm" whenever the second candidate simply failed.
//
// Required: `src/runtime/exposure.js` exports `exposeIndexes(candidateCount, round)`
// that picks which candidate indexes see the lessons, alternating with the round so
// that over time both "first candidate exposed" and "later candidate exposed" happen.
// With two candidates exactly one is exposed per round and the exposed index flips
// on parity.
import { exposeIndexes } from '../../src/runtime/exposure.js'

let pass = 0
let fail = 0
function ok(cond, name, extra) {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  } else {
    fail += 1
    console.log(`not ok ${pass + fail} - ${name}`)
    if (extra !== undefined) console.log('   ', extra)
  }
}

const a = exposeIndexes(2, 1)
const b = exposeIndexes(2, 2)
ok(Array.isArray(a), 'returns an array')
ok(a.length === 1, 'two candidates expose exactly one', JSON.stringify(a))
ok(b.length === 1, 'and it stays one on the next round', JSON.stringify(b))
ok(a[0] !== b[0], 'the exposed index flips on parity', `${JSON.stringify(a)} vs ${JSON.stringify(b)}`)
ok(a.every((i) => i >= 0 && i < 2) && b.every((i) => i >= 0 && i < 2), 'indexes stay in range')

const four = [1, 2, 3, 4].map((n) => exposeIndexes(4, n))
ok(four.every((xs) => xs.length >= 1 && xs.length < 4), 'never exposes every candidate', JSON.stringify(four))
const seen = new Set(four.flat())
ok(seen.size >= 2, 'over four rounds more than one candidate gets exposed', JSON.stringify([...seen]))
ok(four.every((xs) => new Set(xs).size === xs.length), 'no duplicate indexes inside a round')
ok(four.every((xs) => xs.every((i) => Number.isInteger(i) && i >= 0 && i < 4)), 'integer indexes in range')

ok(exposeIndexes(1, 1).length === 0, 'a single candidate has no control, so nothing is exposed')
ok(exposeIndexes(0, 3).length === 0, 'zero candidates expose nothing')
ok(exposeIndexes(3, 0).length >= 1, 'round 0 still exposes something')

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
