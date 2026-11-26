// "Cannot distinguish" is true and useless. The reader cannot tell whether the
// trial needs one more round or four hundred.
//
// Measured 2026-11-26: `trial-agg` ran 10 rounds and reported an MDE of 90.4
// points. A person reading "this design could resolve 90.4 points" has to know
// the arithmetic themselves to see that a ten-point difference would need
// hundreds more rounds -- and the trial never says so. The number that decides
// whether to keep paying for a campaign is not the MDE, it is the sample size
// that would answer the question actually being asked.
//
// So the comparison carries it: for a stated target difference, how many rounds
// per arm would this spread need. It is the same standard error the floor is
// built from, solved for n instead of for the effect, and it is printed with the
// assumption spelled out (two independent arms, the spread just observed) so a
// reader can disagree with the assumption rather than with a bare number.
//
//   node tests/self57/the-trial-says-how-many-rounds-it-needs.test.mjs
import assert from 'node:assert/strict'

import { compareArmScores, roundsNeeded } from '../../src/loop/research-trial.js'

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

const round = (arm, score, costUsd = 0.01) => ({
  n: 1,
  status: 'promoted',
  promoted: true,
  score,
  scoreSource: 'killRate',
  costUsd,
  researchTrial: { arm },
})

ok('a tighter spread needs fewer rounds', () => {
  const tight = roundsNeeded({ sd: 0.1, perArm: 4, target: 0.1 })
  const wide = roundsNeeded({ sd: 0.3, perArm: 4, target: 0.1 })
  assert.ok(tight < wide, `tight ${tight} should need fewer rounds than wide ${wide}`)
  assert.ok(tight > 0 && Number.isFinite(tight))
})

ok('a smaller target difference needs more rounds', () => {
  const ten = roundsNeeded({ sd: 0.25, perArm: 4, target: 0.1 })
  const twenty = roundsNeeded({ sd: 0.25, perArm: 4, target: 0.2 })
  assert.ok(ten > twenty, 'halving the target must roughly quadruple the sample')
  assert.ok(ten / twenty > 3 && ten / twenty < 6, `ratio was ${ten / twenty}`)
})

ok('the formula is the one the floor already uses', () => {
  // Two independent arms, 80% power, two-sided 95%: n per arm is
  // 2 (z + z_beta)^2 sd^2 / target^2. Written here so a reader can check the
  // arithmetic rather than trust the function.
  const sd = 0.25
  const target = 0.1
  const expected = Math.ceil((2 * (1.959964 + 0.841621) ** 2 * sd ** 2) / target ** 2)
  const got = roundsNeeded({ sd, perArm: 4, target })
  assert.equal(got, expected)
})

ok('an unreachable target is a number, not a shrug', () => {
  // At this spread a five-point difference is thousands of rounds. Reporting a
  // big number is the point: it is the evidence that the question is being asked
  // at the wrong scale, and rounding it to "too many" would hide the size.
  const got = roundsNeeded({ sd: 0.5, perArm: 4, target: 0.05 })
  assert.ok(got > 1000, `five points at sd 0.5 needs thousands, got ${got}`)
})

ok('nothing observed yet means no answer, not a guess', () => {
  assert.equal(roundsNeeded({ sd: 0, perArm: 0, target: 0.1 }), null)
  assert.equal(roundsNeeded({ sd: Number.NaN, perArm: 4, target: 0.1 }), null)
  assert.equal(roundsNeeded({ sd: 0.2, perArm: 4, target: 0 }), null)
})

ok('the comparison prints it for the difference a person would care about', () => {
  // Spread wide enough that the answer is genuinely not in hand: a verifier that
  // prints 0.2 on one round and 0.9 on the next cannot resolve ten points in
  // eight rounds, and saying so is the whole point.
  const rounds = [
    round('full', 0.9), round('full', 0.4), round('full', 0.7), round('full', 0.2),
    round('off', 0.85), round('off', 0.35), round('off', 0.65), round('off', 0.25),
  ]
  const cmp = compareArmScores({ full: rounds.slice(0, 4), off: rounds.slice(4) })
  assert.ok(cmp, 'eight rounds with spread should produce a comparison')
  assert.ok(cmp.needed, 'the comparison must say how many rounds it needs')
  assert.equal(cmp.needed.target, 0.1, 'ten points is the difference a reader can act on')
  assert.ok(cmp.needed.perArm > cmp.arms.full.n, `at this spread the answer is not in hand (needed ${cmp.needed.perArm})`)
  assert.match(cmp.sentence, /rounds per arm/i)
  assert.match(cmp.sentence, /about \d+ rounds per arm/)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
