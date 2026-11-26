// The read/do trial is assigned per campaign, so every probe answers the
// question with two to six rounds an arm: `trial-agg` 6/4, `trial-fine` 4/6,
// `trial-partial` 6/4, `trial-var` 6/4, `trial8-live` 4/4, `trial-live` 2/2.
// Each of those says "cannot distinguish", correctly, and six correct silences
// add up to a loop that has bought 52 assigned rounds and learned nothing.
//
// This is the rollup: read every campaign that ever assigned an arm, report the
// pooled comparison, and say out loud that pooling different task sets is not
// the same experiment as one long campaign. The caveat is the point -- a pooled
// number that did not carry it would license exactly the wrong conclusion.
//
//   node tests/self57/the-trial-can-be-read-across-campaigns.test.mjs
import assert from 'node:assert/strict'

import { compareResearchFleet } from '../../src/loop/research-trial.js'

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

function round(n, arm, score, extra = {}) {
  return {
    n,
    status: 'promoted',
    // `usable()` requires a boolean `promoted`: an arm assignment with no
    // verdict is a round still in flight, and counting it would read silence as
    // a loss. The fixture has to satisfy the same contract the loop writes.
    promoted: true,
    score,
    scoreSource: 'killRate',
    researchTrial: { arm, seed: 'research-trial' },
    research: arm === 'full' ? { mode: 'full', read: 2, used: false, ms: 20000 } : { mode: 'off', read: 0, skipped: 'not-run' },
    costUsd: 0.01,
    ...extra,
  }
}

ok('a campaign that assigned no arms is not in the rollup', () => {
  const out = compareResearchFleet([
    { id: 'a', rounds: [round(1, 'full', 1), round(2, 'off', 1)] },
    { id: 'b', rounds: [{ n: 1, status: 'no-gain', score: 0 }] },
  ])
  assert.equal(out.campaigns.length, 1)
  assert.equal(out.campaigns[0].id, 'a')
  assert.equal(out.n, 2)
})

ok('the pooled arms are the sum of the per-campaign arms', () => {
  const out = compareResearchFleet([
    { id: 'a', rounds: [round(1, 'full', 1), round(2, 'full', 1)] },
    { id: 'b', rounds: [round(1, 'off', 0), round(2, 'off', 1), round(3, 'full', 0)] },
  ])
  assert.equal(out.n, 5)
  assert.equal(out.arms.full.n, 3)
  assert.equal(out.arms.off.n, 2)
  assert.equal(out.campaigns.length, 2)
  assert.equal(out.campaigns[0].arms.full.n, 2)
})

ok('every campaign carries its own verdict, not only the pool', () => {
  const out = compareResearchFleet([
    { id: 'a', rounds: [round(1, 'full', 1), round(2, 'off', 0)] },
  ])
  assert.equal(out.campaigns[0].verdict, out.verdict)
  assert.ok(typeof out.campaigns[0].sentence === 'string')
})

ok('the sentence says pooling is not one long campaign', () => {
  const out = compareResearchFleet([
    { id: 'a', rounds: [round(1, 'full', 1), round(2, 'off', 1)] },
    { id: 'b', rounds: [round(1, 'full', 1), round(2, 'off', 1)] },
  ])
  assert.match(out.caveat, /different task sets|not one long campaign|pool/i)
  assert.ok(out.sentence.includes(out.caveat) === false || out.caveat.length > 0)
})

ok('an empty fleet is not a silent zero', () => {
  const out = compareResearchFleet([])
  assert.equal(out.n, 0)
  assert.equal(out.campaigns.length, 0)
  assert.match(out.sentence, /no campaign has assigned an arm yet/i)
  assert.equal(out.verdict, 'cannot-distinguish')
})

ok('a campaign whose rounds are all one arm still counts toward the pool', () => {
  const out = compareResearchFleet([
    { id: 'a', rounds: [round(1, 'full', 1), round(2, 'full', 1)] },
    { id: 'b', rounds: [round(1, 'off', 1)] },
  ])
  assert.equal(out.campaigns.length, 2)
  assert.equal(out.arms.off.n, 1)
  assert.equal(out.arms.full.n, 2)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
