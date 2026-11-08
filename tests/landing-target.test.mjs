// A human approval has to tell the reducer which round landed, or the loop cannot
// tell "solved" from "still open" and offers the same task again. The anomaly
// checkpoint raised when a promotion cannot be applied carries only the artifact
// path - the round number lives in the gate - so the approval used to write
// round: null (seen live in loom-tri13: round 3 re-picked plan-model after its
// patch had already been committed). landingTarget() resolves it from state.
import assert from 'node:assert/strict'

import { landingTarget } from '../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const patchFor = (id) => `C:\\loom\\campaigns\\x\\artifacts\\${id}.patch`

// 1. An anomaly checkpoint carries only the artifact path: the gate named the round.
{
  const state = {
    rounds: [
      { n: 1, status: 'promoted', landed: true, promotedAttemptId: 'r1a1' },
      { n: 2, status: 'running', promotedAttemptId: 'r2a1', attempts: [{ id: 'r2a1', patch: patchFor('r2a1') }] },
    ],
  }
  assert.deepEqual(landingTarget(state, { patch: patchFor('r2a1') }), { round: 2, attemptId: 'r2a1' })
  ok('the artifact path resolves to the round the gate promoted')
}

// 2. A payload that does carry a round keeps it - no state archaeology needed.
{
  const state = { rounds: [{ n: 7, status: 'running', promotedAttemptId: 'r7a2' }] }
  assert.deepEqual(landingTarget(state, { round: 7, patch: patchFor('r7a2') }), { round: 7, attemptId: 'r7a2' })
  ok('an explicit round wins and still fills in the attempt from the gate')
}

// 3. When only an attempt id is known (a human naming it), the round follows.
{
  const state = { rounds: [{ n: 3, status: 'promoted', landed: false, promotedAttemptId: 'r3a1' }] }
  assert.deepEqual(landingTarget(state, { attempt: 'r3a1' }), { round: 3, attemptId: 'r3a1' })
  ok('a known attempt resolves its round through the promoted mark')
}

// 4. Nothing matches: say so instead of guessing a round that might be wrong.
{
  const state = { rounds: [{ n: 1, status: 'promoted', landed: true, promotedAttemptId: 'r1a1' }] }
  assert.deepEqual(landingTarget(state, { patch: patchFor('r9a9') }), { round: null, attemptId: null })
  ok('an unknown artifact resolves to null rather than the wrong round')
}

// 5. Empty or broken state must not throw: the approval path runs inside a tool.
{
  assert.deepEqual(landingTarget(undefined, {}), { round: null, attemptId: null })
  assert.deepEqual(landingTarget({ rounds: [null, {}] }, { patch: patchFor('r1a1') }), { round: null, attemptId: null })
  ok('missing or malformed state returns nulls instead of throwing')
}

console.log(`\n${pass}/${pass} passed`)
