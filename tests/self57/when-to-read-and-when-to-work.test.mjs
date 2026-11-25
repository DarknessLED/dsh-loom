// When should the loop stop and read?
//
// `planMode` answered a nearby question and its answer is on the record: buy a
// plan when the last two rounds show planning is not paying (timed out, or
// returned no text), skip it while unplanned rounds keep landing. Reading has
// the same shape and the opposite default risk -- a loop that never reads only
// learns by paying a round to fail, and a loop that always reads pays to learn
// things it already knows.
//
// The rule below is deliberately boring: read when the last round lost, stop
// when rounds keep landing while reading (two in a row is enough evidence that
// the read is affordable, not that it is necessary), and keep reading out of a
// round a person stopped, because a stopped round was never judged.
//
//   node tests/self57/when-to-read-and-when-to-work.test.mjs
import assert from 'node:assert/strict'

import { researchModeFor } from '../../src/runtime/round.js'

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

const read = (used = null) => ({ research: { mode: 'auto', passages: 2, ...(used === null ? {} : { used }) } })
const noRead = () => ({ research: { mode: 'off' } })
const won = (extra = {}) => ({ promoted: true, status: 'promoted', ...extra })
const lost = (extra = {}) => ({ promoted: false, status: 'no-gain', ...extra })

ok('off and full are returned untouched', () => {
  assert.equal(researchModeFor([lost()], { researchMode: 'off' }), 'off')
  assert.equal(researchModeFor([lost()], { researchMode: 'full' }), 'full')
})

ok('a mode that is not a mode reads as full, not as off', () => {
  // Guessing "off" here would silently disarm a knob someone mistyped.
  assert.equal(researchModeFor([lost()], { researchMode: 'sometimes' }), 'full')
  assert.equal(researchModeFor([], {}), 'full')
})

ok('a cold campaign buys one read', () => {
  // Nothing is known yet, so a read is the cheapest way to find out.
  assert.equal(researchModeFor([], { researchMode: 'auto' }), 'full')
  assert.equal(researchModeFor(undefined, { researchMode: 'auto' }), 'full')
})

ok('after a loss the loop reads', () => {
  assert.equal(researchModeFor([lost()], { researchMode: 'auto' }), 'full')
  assert.equal(researchModeFor([won(), lost()], { researchMode: 'auto' }), 'full')
  assert.equal(researchModeFor([lost(read())], { researchMode: 'auto' }), 'full')
})

ok('two wins while reading are enough to try without', () => {
  assert.equal(researchModeFor([won(read()), won(read())], { researchMode: 'auto' }), 'off')
})

ok('one win is not enough to defund a read that may have caused it', () => {
  assert.equal(researchModeFor([lost(), won(read())], { researchMode: 'auto' }), 'full')
})

ok('a read the round did not use is dropped after a win', () => {
  assert.equal(researchModeFor([won(read(false))], { researchMode: 'auto' }), 'off')
  // And a read that was used stays, so the two-round rule can be the judge.
  assert.equal(researchModeFor([won(read(true))], { researchMode: 'auto' }), 'full')
})

ok('a win without reading does not start paying for reads', () => {
  assert.equal(researchModeFor([won(noRead())], { researchMode: 'auto' }), 'off')
})

ok('a stopped round is not evidence against reading', () => {
  assert.equal(researchModeFor([{ status: 'interrupted', promoted: false }], { researchMode: 'auto' }), 'full')
})

ok('a ledger that predates the field is read as "nothing known", not as "lost"', () => {
  // `promoted` absent means the record cannot answer; defunding reads on it
  // would disarm the knob for every campaign that ran before this commit.
  assert.equal(researchModeFor([{ status: 'no-gain' }], { researchMode: 'auto' }), 'full')
})

ok('the last round decides, not the first', () => {
  assert.equal(researchModeFor([won(read()), won(read()), lost()], { researchMode: 'auto' }), 'full')
  assert.equal(researchModeFor([lost(), lost(), won(read()), won(read())], { researchMode: 'auto' }), 'off')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
