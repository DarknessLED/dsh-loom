// Which holdout ran is currently a positional accident.
//
// The pick is `heldOut[priorRounds % heldOut.length]`, so reordering the declared
// pool - or adding one entry - silently changes which partition a given round
// tests, and the ledger cannot answer "which partition, and what did the pool look
// like then". Dagster solves this by materialising a partition key per run;
// Temporal by writing the input into the history. The pick has to be a function of
// stable ids and the round number, and the choice has to be written down.
import assert from 'node:assert/strict'

import { reduce } from '../../src/core/reduce.js'
import { holdoutPick } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. The pick depends on the ids and the round, not on the order they were declared.
{
  const a = holdoutPick(['h1', 'h2', 'h3'], 2)
  const b = holdoutPick(['h3', 'h1', 'h2'], 2)
  assert.deepEqual(a, b, 'declaration order must not change which partition round 2 tests')
  assert.equal(a.id, 'h2', 'three partitions, round 2 tests the second one')
  assert.equal(a.poolSize, 3)
  assert.equal(a.index, 1)
  ok('the same round picks the same partition regardless of declaration order')
}

// 2. The rotation still walks the pool: round 1 -> 1st, round 4 -> 1st again.
{
  assert.equal(holdoutPick(['h1', 'h2', 'h3'], 1).id, 'h1')
  assert.equal(holdoutPick(['h1', 'h2', 'h3'], 3).id, 'h3')
  assert.equal(holdoutPick(['h1', 'h2', 'h3'], 4).id, 'h1', 'the pool wraps')
  ok('rotation walks sorted ids and wraps')
}

// 3. An empty pool is a measured "no holdout", not an exception and not a pick.
{
  assert.equal(holdoutPick([], 1), null)
  assert.equal(holdoutPick(null, 3), null)
  ok('an empty pool picks nothing instead of throwing')
}

// 4. The choice is written down: the folded state can answer "which partition,
//    from which pool" for any past round.
{
  const state = reduce(
    [
      { seq: 1, type: 'campaign.created', data: { id: 'c1', workspace: 'C:/tmp/x', at: 1 } },
      { seq: 2, type: 'round.started', data: { n: 1, taskId: 't1', at: 100 } },
      {
        seq: 3,
        type: 'holdout.selected',
        data: { round: 1, id: 'h2', pool: ['h1', 'h2'], poolSha: 'abc123' },
      },
      { seq: 4, type: 'round.finished', data: { n: 1, status: 'promoted', promoted: true, at: 900 } },
    ],
    'c1',
  )
  const holdout = state.holdout ?? {}
  assert.deepEqual(holdout.pool, ['h1', 'h2'], 'the pool that was in force is recorded')
  assert.deepEqual(holdout.covered, ['h2'], 'what actually ran is recorded, not what was planned')
  assert.equal(holdout.lastId, 'h2')
  assert.equal(holdout.poolSha, 'abc123', 'a pool identity makes a changed pool visible later')
  ok('the folded state answers which holdout ran from which pool')
}

console.log(`\n${pass}/${pass} passed`)
