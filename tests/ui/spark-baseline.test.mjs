/**
 * A two-pixel stub is doing four jobs.
 *
 * The sparkline draws every bar as `2 + share * (height - 2)`, so a round that
 * ran and *scored zero*, a round that has not been scored yet, and a round in a
 * campaign that has barely started all render as the same 2px mark. The reader
 * cannot tell "we tried and got nothing" from "there is nothing to show".
 *
 * The rule: the three states are distinguishable in the data, not just in the
 * eye — an unscored round has no bar at all, a zero round is a baseline mark,
 * and a scored round is proportional to its score.
 */
import assert from 'node:assert/strict'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const panel = await loadPanel()
const { sparkOf } = panel

{
  const spark = sparkOf({ trend: [{ n: 4, status: 'no-gain', score: 0 }] })
  const bar = spark.bars[0]
  assert.equal(bar.zero, true, 'a zero score is a measurement')
  assert.equal(bar.unknown, false, 'and it is not the same as unscored')
  assert.ok(bar.px > 0, 'a baseline mark, not an invisible bar')
  ok('a zero round is a baseline, not a blank')
}

{
  const spark = sparkOf({ trend: [{ n: 5, status: 'running' }] })
  const bar = spark.bars[0]
  assert.equal(bar.unknown, true, 'no score yet is admitted as unknown')
  assert.equal(bar.zero, false, 'unknown is not zero')
  assert.equal(bar.px, 0, 'nothing to show means no bar')
  ok('an unscored round draws nothing')
}

{
  const spark = sparkOf({ trend: [{ n: 6, status: 'promoted', score: 1 }] })
  const bar = spark.bars[0]
  assert.equal(bar.zero, false)
  assert.equal(bar.unknown, false)
  assert.ok(bar.px > 2, 'a scored round is proportional to the score')
  ok('a scored round keeps its proportional height')
}

console.log(`${pass}/3 passed`)
assert.ok(pass > 0)
