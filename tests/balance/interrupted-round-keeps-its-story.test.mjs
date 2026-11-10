// A round that the host interrupted and then ran again keeps both facts.
//
// Recovery closes whatever was running when the host went down with
// `round.finished{status:'interrupted', reason:'host-restart'}`. If the round is
// then run again the log gets a second finish for the same number, and the
// fold's `Object.assign` overwrites the first one. Measured on this ledger: 4 of
// 66 campaigns have a round that finished twice, and in all 4 the interruption
// disappeared from the projection -- including `loom-self3/r3`, which reads back
// as a clean promotion while the log says the host killed it.
//
// The interruption is not noise to be replaced by the retry: it is the reason
// the retry exists. A reader asking "how many rounds were lost to restarts"
// must not have to diff the raw log to find out.

import assert from 'node:assert/strict'
import { reduce } from 'file:///C:/Projects/RSI/src/core/reduce.js'

let pass = 0
function ok(name, cond = true, detail) {
  if (cond) {
    pass += 1
    console.log('ok  ', name)
  } else {
    console.log('FAIL', name, detail === undefined ? '' : detail)
    process.exitCode = 1
  }
}

const ev = (seq, type, data) => ({ seq, t: 1_700_000_000_000 + seq * 1000, type, actor: 'system', data })
const base = (events) => reduce(events, 'c')

// 1. An interrupted round that was later promoted still says it was interrupted.
{
  const state = base([
    ev(1, 'campaign.created', { id: 'c' }),
    ev(2, 'round.started', { n: 1, taskId: 't' }),
    ev(3, 'round.finished', { n: 1, status: 'interrupted', reason: 'host-restart', score: null, promoted: false }),
    ev(4, 'round.started', { n: 1, taskId: 't' }),
    ev(5, 'round.finished', { n: 1, status: 'promoted', score: 1, promoted: true, durationMs: 5000 }),
  ])
  const round = state.rounds.find((r) => r.n === 1)
  ok('one entry for round 1', state.rounds.filter((r) => r.n === 1).length === 1, state.rounds.map((r) => r.n))
  ok('the retry wins the status', round?.status === 'promoted', round?.status)
  ok('the interruption is still on record', round?.interrupted === true, round?.interrupted)
  ok('with the reason it happened', round?.interruptReason === 'host-restart', round?.interruptReason)
  ok('and the round says it was run again', round?.resumed === true, round?.resumed)
}

// 2. Two dispatches of the same round number are two dispatches of the budget.
{
  const state = base([
    ev(1, 'campaign.created', { id: 'c' }),
    ev(2, 'round.started', { n: 1, taskId: 't' }),
    ev(3, 'round.finished', { n: 1, status: 'interrupted', reason: 'host-restart', promoted: false }),
    ev(4, 'round.started', { n: 1, taskId: 't' }),
  ])
  // A second start must not leave a ghost entry stuck at `running` forever:
  // `rounds.find` would keep resolving to the first, and the phantom would be
  // counted as a round that never closed.
  ok('a restarted round is still one entry', state.rounds.filter((r) => r.n === 1).length === 1, state.rounds.map((r) => r.n))
  ok('the restarted entry is running', state.rounds[0]?.status === 'running', state.rounds[0]?.status)
  ok('both dispatches were paid for', state.budget.roundsUsed === 2, state.budget.roundsUsed)
}

// 3. A plain interrupted round with no retry keeps the old shape exactly.
{
  const state = base([
    ev(1, 'campaign.created', { id: 'c' }),
    ev(2, 'round.started', { n: 1, taskId: 't' }),
    ev(3, 'round.finished', { n: 1, status: 'interrupted', reason: 'host-restart', promoted: false }),
  ])
  const round = state.rounds[0]
  ok('a lone interruption is its own status', round?.status === 'interrupted', round?.status)
  ok('a lone interruption is not marked resumed', round?.resumed !== true, round?.resumed)
  ok('a lone interruption still carries its reason', round?.reason === 'host-restart', round?.reason)
}

console.log(`\n${pass} passed`)
assert.ok(pass > 0)
