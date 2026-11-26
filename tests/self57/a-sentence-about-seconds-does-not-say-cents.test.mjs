// The time axis printed milliseconds as if they were cents.
//
// `compareArmMetric` was written for the money axis and kept its formatter:
// every number it prints goes through `cents = (v) => (v*100).toFixed(2)+'c'`.
// That is right for dollars and wrong for everything else. On `trial-lib` the
// time axis produced this sentence, which is what `rsi_status` shows a person:
//
//   reading costs 15750.00c more per round (15750.00c against 0.00c); the
//   interval excludes zero and the gap is above the 1806.62c floor.
//
// The quantity is 157.5 milliseconds a round against 0 — the library leg reads in
// one hundredth of the time the web leg does. A hundredfold unit error in the
// sentence that also claims to be the one measurable price of reading is exactly
// the number a reader would quote, and it is the axis `docs/l2-state.md` cites as
// the only price it can measure.
//
//   node tests/self57/a-sentence-about-seconds-does-not-say-cents.test.mjs
import assert from 'node:assert/strict'

import { compareArmMetric } from '../../src/loop/research-trial.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const rounds = (pick) => pick.map((v) => ({ v }))

const timed = (v) => ({ ms: v })

const money = () => {
  const full = rounds([0.037, 0.041, 0.033, 0.039])
  const off = rounds([0.032, 0.030, 0.034, 0.031])
  const pick = (r) => r.v
  return compareArmMetric({ full, off, pick, basis: 'cost per round' })
}

const seconds = () => {
  const full = rounds([157500, 158200, 156700, 157600])
  const off = rounds([0, 0, 0, 0])
  const pick = (r) => r.v
  return compareArmMetric({ full, off, pick, basis: 'read time per round' })
}

ok('a money sentence still speaks in cents', () => {
  const got = money()
  assert.ok(got, 'money axis should compare')
  assert.match(got.sentence, /c\b/, `sentence was "${got.sentence}"`)
  assert.doesNotMatch(got.sentence, /\bs\b a round/)
})

ok('a time sentence speaks in seconds, not cents', () => {
  const got = seconds()
  assert.ok(got, 'time axis should compare')
  assert.match(got.sentence, /\d+s\b/, `sentence was "${got.sentence}"`)
  assert.doesNotMatch(got.sentence, /\d+(?:\.\d+)?c\b/, `cents in "${got.sentence}"`)
})

ok('the floor in a time sentence is seconds too', () => {
  const got = seconds()
  // 157.5 s against 0 s, floor is a couple of seconds: it must not print as
  // "1806.62c".
  assert.match(got.sentence, /\bfloor\b/)
  const floor = /floor/.test(got.sentence) ? got.sentence.slice(got.sentence.indexOf('floor')) : ''
  assert.doesNotMatch(floor, /\d+c\b/, `floor clause was "${floor}"`)
})

ok('the numbers themselves are not rescaled', () => {
  const got = seconds()
  // 157.5 seconds is 157500 ms in the record; the axis must report the seconds,
  // and `arms[].mean` stays in the recorded unit so callers can re-derive it.
  assert.equal(Math.round(got.arms.full.mean), 157500)
  assert.match(got.sentence, /157\.50?s\b/, `sentence was "${got.sentence}"`)
})

ok('a caller that names no unit falls back to the number alone', () => {
  const full = rounds([10, 12, 11, 13])
  const off = rounds([1, 2, 1, 2])
  const got = compareArmMetric({ full, off, pick: (r) => r.v, basis: 'something else' })
  assert.ok(got)
  assert.doesNotMatch(got.sentence, /\d+(?:\.\d+)?c\b/, `cents in "${got.sentence}"`)
})

void timed

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
