// A threshold that no task pool can reach is not a threshold, it is a wall.
//
// `compareChains` (src/chain/evidence.js) requires `minTasks = 6` before it will
// call a gain real. The ledger says 135 of 138 campaigns carry fewer than six
// tasks, so the comparison refuses almost every chain ever evolved — including
// ones where both versions were scored on every task the campaign has. Six is a
// sensible *ceiling*: it stops a one-task campaign from calling a single noisy
// reading an improvement. It is not a sensible floor for a three-task pool,
// where the most evidence physics allows is three.
//
// The rule below is deliberately conservative: the bar falls to 60% of the pool,
// never below two tasks, and never above six. A one-task campaign still cannot
// pass, so the historical promotions the shadow table measured stay blocked
// until someone widens the pool — which is the honest ordering.
import assert from 'node:assert/strict'
import { compareChains, minTasksFor } from '../../src/chain/evidence.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. The derivation itself, at the interesting sizes.
assert.equal(minTasksFor(8), 6, 'a wide pool keeps the six-task ceiling')
assert.equal(minTasksFor(6), 6, 'exactly six is six')
assert.equal(minTasksFor(5), 3, 'five tasks ask for three')
assert.equal(minTasksFor(4), 3, 'four tasks ask for three, not for six')
assert.equal(minTasksFor(3), 2, 'three tasks ask for two')
assert.equal(minTasksFor(1), 2, 'one task still needs two: a single reading is never enough')
assert.equal(minTasksFor(0), 2, 'and an empty pool is not a licence')
ok('the bar follows the pool, and never falls below two')

// 2. Two versions scored on all four tasks of a four-task pool now compare.
const rounds = []
const tasks = ['t1', 't2', 't3', 't4']
for (const taskId of tasks) {
  for (const [version, score] of [[1, 0.4], [2, 0.6]]) {
    rounds.push({
      n: rounds.length + 1,
      taskId,
      chainVersion: version,
      status: 'promoted',
      attempts: [{ id: `r${rounds.length + 1}a1`, score, verifierOk: true, screenedOut: false }],
    })
  }
}
const four = compareChains({ rounds, baseVersion: 1, candidateVersion: 2 })
assert.equal(four.pairedTasks, 4)
assert.equal(four.checks.enoughTasks, true, 'four paired tasks clear a four-task pool')
assert.equal(four.reason, 'promote')

// 3. An explicit minTasks still wins: a caller that wants six gets six.
const strict = compareChains({ rounds, baseVersion: 1, candidateVersion: 2, minTasks: 6 })
assert.equal(strict.checks.enoughTasks, false)
assert.equal(strict.reason, 'not-enough-tasks')
ok('an explicit bar is respected')

// 4. One task is still refused, derivation or not.
const one = compareChains({
  rounds: [1, 2].map((version, i) => ({
    n: i + 1,
    taskId: 'solo',
    chainVersion: version,
    status: 'promoted',
    attempts: [{ id: `r${i + 1}a1`, score: version === 1 ? 0.4 : 0.9, verifierOk: true, screenedOut: false }],
  })),
  baseVersion: 1,
  candidateVersion: 2,
})
assert.equal(one.pairedTasks, 1)
assert.equal(one.checks.enoughTasks, false, 'a single task can never clear any bar')
assert.equal(one.reason, 'not-enough-tasks')
ok('one reading is never enough, however the bar is derived')
