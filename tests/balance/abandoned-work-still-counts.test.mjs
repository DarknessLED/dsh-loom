// An attempt that was written off still produced a patch, and that patch is still
// evidence.
//
// When a sibling solves the task first, the round cancels the loser and records
// `skipped: true` -- no verifier run, no score, no chance that the work is what
// solved it. Across the ledger 29 attempts were written off while holding a patch
// (25 solved-by-sibling, 4 interrupted), and every one of those diffs is a loss the
// loop paid for and then declined to read.
//
// The honest thing is not to promote it -- a stopped tree is unfinished, and
// scoring it could reward work the winner replaced. It is to SAY so: the record must
// distinguish "we looked and it lost" from "we never looked". A skipped verdict that
// looks like a failed one teaches the triangle that these attempts were bad work,
// when in fact they were never measured.
import assert from 'node:assert/strict'
import { abandonedVerdict } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

// 1. A written-off attempt with a patch is explicitly unmeasured, not failed.
{
  const v = abandonedVerdict('solved-by-sibling', 'C:/tmp')
  assert.equal(v.ok, false, 'an unfinished tree cannot pass')
  assert.equal(v.skipped, true, 'the record says the verifier never ran')
  assert.equal(v.measured, false, 'and says the work was never scored')
  ok('a skipped attempt is marked unmeasured')
}

// 2. The reason survives, so a reader can tell a cancelled sibling from a host
//    interruption without re-reading the event stream.
{
  assert.equal(abandonedVerdict('solved-by-sibling', 'C:/tmp').reason, 'solved-by-sibling')
  assert.equal(abandonedVerdict('interrupted', 'C:/tmp').reason, 'interrupted')
  ok('the reason for writing it off survives into the verdict')
}

// 3. No reason at all must still produce a usable verdict rather than throwing --
//    this runs inside a finally block and must never be the thing that loses a round.
{
  const v = abandonedVerdict(null, 'C:/tmp')
  assert.equal(v.skipped, true)
  assert.equal(v.measured, false)
  assert.equal(typeof v.reason, 'string')
  assert.ok(v.reason.length > 0, 'an unknown reason still says something')
  assert.doesNotMatch(String(v.stderr), /undefined|NaN/)
  ok('an unknown reason degrades instead of throwing')
}

console.log(`\n${pass}/3 passed`)
assert.equal(pass, 3)
