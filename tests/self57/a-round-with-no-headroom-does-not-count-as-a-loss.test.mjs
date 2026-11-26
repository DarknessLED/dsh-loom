// The count axis counted rounds that had nothing left to win.
//
// `trial-lib2` finished with both arms at `score 1` on all eight rounds, yet the
// count axis said reading promoted 50% and not reading 25%. Both sentences are
// true and neither is about reading: the campaign has six tasks, each solved
// once, so after the first few rounds the incumbent already scored 1 and every
// later promotion was impossible for *either* arm. The gate said so itself —
// `earnedReason: 'metric-did-not-improve'` on rounds 2 and 5–8 — and the trial
// counted those rounds as "not reading did not help".
//
// A round where the incumbent is at the ceiling cannot show whether reading
// helps. It is still a real round for cost and time (it was paid for), so the
// count axis drops it while the other two axes keep it.
//
//   node tests/self57/a-round-with-no-headroom-does-not-count-as-a-loss.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { compareResearchArms } from '../../src/loop/research-trial.js'

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

const round = (arm, promoted, headroom = true) => ({
  n: 1,
  status: promoted ? 'promoted' : 'no-gain',
  promoted,
  beatsIncumbent: headroom,
  score: 1,
  scoreSource: 'killRate',
  costUsd: 0.02,
  research: arm === 'full' ? { mode: 'full', ms: 150, read: 2 } : { mode: 'off', ms: 0, read: 0 },
  researchTrial: { arm },
})

ok('a promoted round with no headroom left is not counted for either arm', () => {
  // The obstruction the trial hit: four rounds each way, every one at score 1,
  // two promotions per arm purely because the first two rounds of each arm
  // happened to arrive before the ceiling.
  const rounds = [
    round('full', true, true),
    round('full', false, false),
    round('full', false, false),
    round('full', false, false),
    round('off', true, true),
    round('off', false, false),
    round('off', false, false),
    round('off', false, false),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.arms.full.counted, 1, `full counted ${cmp.arms.full.counted}`)
  assert.equal(cmp.arms.off.counted, 1, `off counted ${cmp.arms.off.counted}`)
  assert.equal(cmp.delta, 0, 'both arms had the same one round with headroom')
  assert.match(cmp.sentence, /headroom|nothing left/i)
})

ok('a genuine loss at real headroom still counts', () => {
  const rounds = [
    round('full', true, true),
    round('full', false, true),
    round('off', true, true),
    round('off', true, true),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.arms.full.counted, 2)
  assert.equal(cmp.arms.off.counted, 2)
  assert.ok(cmp.arms.off.rate > cmp.arms.full.rate)
})

ok('rounds without the field are counted as before', () => {
  // Every ledger written before this change has no `beatsIncumbent` on
  // `round.finished`. Dropping them would silently empty the history.
  const legacy = (arm, promoted) => ({ ...round(arm, promoted), beatsIncumbent: undefined })
  const rounds = [legacy('full', true), legacy('full', false), legacy('off', true), legacy('off', false)]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.arms.full.counted, 2)
  assert.equal(cmp.arms.off.counted, 2)
})

ok('cost keeps the rounds the count axis dropped', () => {
  const rounds = [
    round('full', true, true),
    round('full', false, false),
    round('full', false, false),
    round('full', false, false),
    round('off', true, true),
    round('off', false, false),
    round('off', false, false),
    round('off', false, false),
  ]
  const cmp = compareResearchArms({ rounds })
  assert.equal(cmp.cost.arms.full.n, 4, 'money was spent on all four rounds')
  assert.equal(cmp.cost.arms.off.n, 4)
})

ok('the round records whether the incumbent could still be beaten', () => {
  // Without this on `round.finished` the axis cannot be computed from the log.
  const src = readFileSync(new URL('../../src/runtime/round.js', import.meta.url), 'utf8')
  assert.match(src, /beatsIncumbent:\s*checks\.beatsIncumbent/, 'round.finished carries beatsIncumbent')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
