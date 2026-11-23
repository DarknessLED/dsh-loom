// Screening is only worth its price if the screen ranks candidates the way the
// real verifier would. When it stops doing that, halving should turn itself off
// rather than keep paying for a cheaper wrong answer.
//
// The two commands are not the same command: `task.screen` is a fast proxy for
// `task.verify`, and a proxy can drift — a task's "does it parse" screen says
// nothing about its "does the throughput improve" verifier. The literature is
// explicit that multi-fidelity methods assume a monotone relationship and that
// choosing the fidelity is unsolved in practice (2107.05847 §4.2.4, §6.5).
//
// So this is a switch with a veto, not a tuning knob: if the recent record shows
// the screen's top candidate was never the one promoted, the plan turns halving
// off and says why. Turning off is the correct outcome, not a regression — it
// costs a screening pass, which is the thing we were trying to save.
import assert from 'node:assert/strict'
import { fidelityCheck } from '../../src/runtime/halving.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// Five rounds in which the screen's first choice was dropped and the real
// verifier promoted nothing it kept: the proxy is pointing the wrong way.
const bad = Array.from({ length: 5 }, (_, i) => ({
  n: i + 1,
  screened: ['a', 'b', 'c', 'd'],
  kept: ['a', 'b'],
  promoted: 'c',
}))
const off = fidelityCheck(bad, { window: 5 })
assert.equal(off.halving, false, 'a screen whose top pick is never promoted turns halving off')
assert.match(off.reason, /\b(never|0 of|monoton|rank)/i, 'and the reason names what the record shows')
assert.equal(off.considered, 5)
ok('a proxy that ranks the wrong way switches itself off')

// The healthy case: the screen kept the promoted candidate in every round, so
// there is nothing to report and halving stays on.
const good = Array.from({ length: 5 }, (_, i) => ({
  n: i + 1,
  screened: ['a', 'b', 'c', 'd'],
  kept: ['a', 'b'],
  promoted: 'a',
}))
const on = fidelityCheck(good, { window: 5 })
assert.equal(on.halving, true, 'a screen that keeps the winner stays on')
assert.ok(on.reason.length > 0, 'staying on is also a decision worth a sentence')
assert.equal(on.agreement, 1)
ok('a proxy that agrees with the verifier is left alone')

// Fewer rounds than the window is not evidence, and silence must not be read as
// failure: the check needs a record before it can veto anything.
const thin = fidelityCheck([{ n: 1, screened: ['a', 'b'], kept: ['a'], promoted: 'b' }], { window: 5 })
assert.equal(thin.halving, true, 'one bad round out of one is not a pattern')
assert.equal(thin.considered, 1)
assert.match(thin.reason, /not enough/i)
ok('a short record does not turn anything off')

// A round that promoted nothing carries no ranking evidence either way; counting
// it as a disagreement would let a stretch of unsolved rounds disable screening
// for a reason that has nothing to do with the screen.
const unsolved = Array.from({ length: 5 }, (_, i) => ({ n: i + 1, screened: ['a', 'b'], kept: ['a'], promoted: null }))
const silent = fidelityCheck(unsolved, { window: 5 })
assert.equal(silent.halving, true, 'rounds with nothing promoted are not counted as disagreements')
assert.equal(silent.considered, 0)
ok('an unsolved round is not a disagreement')

// Half wrong is a warning, not a veto: the threshold is a parameter because the
// right value is a judgement about how expensive a wrong screening pass is.
const half = Array.from({ length: 6 }, (_, i) => ({ n: i + 1, screened: ['a', 'b'], kept: ['a'], promoted: i % 2 === 0 ? 'a' : 'b' }))
assert.equal(fidelityCheck(half, { window: 6, minAgreement: 0.5 }).halving, true)
assert.equal(fidelityCheck(half, { window: 6, minAgreement: 0.8 }).halving, false, 'a stricter bar turns it off on the same record')
ok('the bar is a parameter, and the same record can pass or fail it')
