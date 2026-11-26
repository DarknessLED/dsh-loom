// An MDE that assumes twice the data is an MDE that promises twice the precision.
//
// `compareResearchArms` passed the *total* number of assigned rounds to
// `mdeIndependent`, whose formula is written for one arm's sample size
// (`sqrt(2 p (1-p) / n)` is the standard error of a difference between two
// independent proportions each of size n). With eight rounds split four and four,
// the reported floor was the one a four-per-arm design earns -- optimistic by a
// factor of sqrt(2), and in the direction that lets a small trial claim it could
// have seen a difference it never could.
//
// These checks pin the arithmetic, not the conclusion: the floor has to come from
// the smaller arm, because the smaller arm is the binding constraint.

import test from 'node:test'
import assert from 'node:assert/strict'

import { mdeIndependent } from '../../src/loop/ab.js'
import { assignArm, compareResearchArms } from '../../src/loop/research-trial.js'

const ok = (name) => console.log(`ok ${name}`)

function roundsFor(n, campaign) {
  const rounds = []
  for (let i = 1; i <= n; i += 1) {
    rounds.push({
      n: i,
      status: 'promoted',
      promoted: i % 2 === 0,
      researchTrial: { arm: assignArm({ campaign, round: i }) },
      costUsd: 0.01,
    })
  }
  return rounds
}

test('the floor comes from the smaller arm, not from the round count', () => {
  const rounds = roundsFor(8, 'mde')
  const cmp = compareResearchArms({ rounds })
  const smaller = Math.min(cmp.arms.full.n, cmp.arms.off.n)
  const want = mdeIndependent({ n: smaller, p: 0.5 })
  assert.ok(smaller >= 3, `fixture is too lopsided to test the floor: ${cmp.arms.full.n}/${cmp.arms.off.n}`)
  assert.ok(
    Math.abs(cmp.mde - want) < 1e-9,
    `the floor is ${cmp.mde} but the smaller arm of ${smaller} earns ${want}`,
  )
  assert.ok(cmp.mde > mdeIndependent({ n: 8, p: 0.5 }), 'the total round count is not the sample size of either arm')
  ok('the floor comes from the smaller arm, not from the round count')
})

test('an all-promoting trial says it cannot distinguish, and does not blame the effect', () => {
  const rounds = roundsFor(8, 'flat').map((r) => ({ ...r, promoted: true, status: 'promoted' }))
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.delta, 0)
  assert.equal(cmp.verdict, 'cannot-distinguish')
  assert.match(cmp.sentence, /below what/i)
  // Denying the phrase is the point; saying it without denying it is not.
  assert.match(cmp.sentence, /Not "no effect"\./, 'silence must be denied as a negative finding, explicitly')
  ok('an all-promoting trial says it cannot distinguish, and does not blame the effect')
})
