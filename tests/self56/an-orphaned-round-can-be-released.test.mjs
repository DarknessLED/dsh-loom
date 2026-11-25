// A round whose host went away is not a round still running.
//
// `Runtime.inflight` is an in-memory Set. When the process that owned a round
// disappears, the Set is rebuilt empty on the next boot, but the round was never
// closed: the ledger still says `running`, `rsi_run` answers "already has a round
// in flight", and the ticker skips the campaign forever. `recover()` only closes
// rounds it can see at boot time, so a round that goes stale *while the host is
// alive* is never revisited -- which is the window campaign `inflight-recover`
// fell into on 2026-11-25: round started 11:16, no events after, `rsi_run`
// refused for the next hour.
//
// The fix has to be able to tell two states apart: a round with no live attempt
// past its deadline (orphaned, releasable) and a round whose child is still being
// watched (alive, untouchable). A lease on disk is not evidence of life -- after
// a restart every lease still says `running`.

import assert from 'node:assert/strict'
import { findOrphans, orphanWindowMs } from '../../src/runtime/orphans.js'

let ok = 0
function pass(name) {
  ok += 1
  console.log(`ok ${ok} - ${name}`)
}

const T0 = 1_700_000_000_000
const MIN = 60_000

function roundStarted(n, at = T0) {
  return { type: 'round.started', t: at, data: { n, taskId: `t${n}`, chainVersion: 1 } }
}
function roundFinished(n, at = T0 + MIN) {
  return { type: 'round.finished', t: at, data: { n, status: 'no-gain', score: 0, promoted: false } }
}
function stateRunning(n, at = T0) {
  return { rounds: [{ n, at, attempts: [], status: 'running', score: null, taskId: `t${n}` }] }
}

// 1. A round that started, never finished, has no live attempt, and is past the
//    window is an orphan.
{
  const events = [roundStarted(1)]
  const found = findOrphans({
    state: stateRunning(1),
    events,
    liveRounds: new Set(),
    now: T0 + 30 * MIN,
    afterMs: 15 * MIN,
  })
  assert.equal(found.length, 1, 'one orphan')
  assert.equal(found[0].round, 1)
  assert.match(found[0].reason, /no live attempt|never (finished|closed)|deadline/i)
  pass('a round with no live attempt past the window is released')
}

// 2. The one mistake this must not make: a round whose child is still watched is
//    alive, however long it has been running. Long turns are normal here.
{
  const events = [roundStarted(1)]
  const found = findOrphans({
    state: stateRunning(1),
    events,
    liveRounds: new Set([1]),
    now: T0 + 300 * MIN,
    afterMs: 15 * MIN,
  })
  assert.deepEqual(found, [], 'a live round is not touched')
  pass('a round with a live attempt is never treated as orphaned')
}

// 3. A round that already finished is not a candidate, and a campaign with no
//    running round produces nothing.
{
  const events = [roundStarted(1), roundFinished(1)]
  const found = findOrphans({
    state: { rounds: [{ n: 1, at: T0, status: 'no-gain', score: 0 }] },
    events,
    liveRounds: new Set(),
    now: T0 + 300 * MIN,
    afterMs: 15 * MIN,
  })
  assert.deepEqual(found, [])
  const none = findOrphans({ state: { rounds: [] }, events: [], liveRounds: new Set(), now: T0, afterMs: MIN })
  assert.deepEqual(none, [])
  pass('a finished round and an idle campaign produce no orphans')
}

// 4. The window is a floor, not a trigger: a round that went quiet two minutes
//    ago may simply be slow at starting, and releasing it would kill real work.
{
  const events = [roundStarted(1)]
  const early = findOrphans({
    state: stateRunning(1),
    events,
    liveRounds: new Set(),
    now: T0 + 2 * MIN,
    afterMs: 15 * MIN,
  })
  assert.deepEqual(early, [], 'too early to tell')
  pass('a round younger than the window is left alone even with no live attempt')
}

// 5. Silence is measured from the last event of that round, not from the round's
//    first event: a round that is still writing (verifier output, candidate
//    records) is not stale, and one that went quiet after writing is.
{
  const events = [roundStarted(1), { type: 'candidate.proposed', t: T0 + 10 * MIN, data: { id: 'r1a1' } }]
  const stale = findOrphans({
    state: stateRunning(1),
    events,
    liveRounds: new Set(),
    now: T0 + 30 * MIN,
    afterMs: 15 * MIN,
  })
  assert.equal(stale.length, 1)
  assert.equal(stale[0].lastAt, T0 + 10 * MIN, 'lastAt is the last event of that round')
  const fresh = findOrphans({
    state: stateRunning(1),
    events,
    liveRounds: new Set(),
    now: T0 + 20 * MIN,
    afterMs: 15 * MIN,
  })
  assert.deepEqual(fresh, [], 'round still within the window of its own last event')
  pass('silence is measured from the round\'s last event, not its start')
}

// 6. Only the requested round is examined: another round's events do not keep
//    this one alive, and a later round being busy does not resurrect an older
//    orphan.
{
  const events = [
    roundStarted(1),
    roundFinished(1, T0 + MIN),
    roundStarted(2, T0 + 2 * MIN),
    { type: 'verifier.finished', t: T0 + 40 * MIN, data: { round: 2, attemptId: 'r2a1' } },
  ]
  const found = findOrphans({
    state: { rounds: [{ n: 2, at: T0 + 2 * MIN, status: 'running' }] },
    events,
    liveRounds: new Set(),
    now: T0 + 45 * MIN,
    afterMs: 15 * MIN,
  })
  assert.deepEqual(found, [], 'round 2 wrote at minute 40, so it is not stale')
  const older = findOrphans({
    state: { rounds: [{ n: 1, at: T0, status: 'running' }] },
    events: [roundStarted(1), { type: 'verifier.finished', t: T0 + 40 * MIN, data: { round: 2 } }],
    liveRounds: new Set(),
    now: T0 + 45 * MIN,
    afterMs: 15 * MIN,
  })
  assert.equal(older.length, 1, 'round 1 did not write after its start')
  pass('events are attributed to the round they name')
}

// 7. The window defaults to at least one attempt deadline plus a grace, because a
//    round that is still inside its own attempt budget is by definition not
//    orphaned.
{
  assert.equal(orphanWindowMs({ attemptTimeoutMs: 13 * MIN }), 13 * MIN + 5 * MIN)
  assert.equal(orphanWindowMs({ attemptTimeoutMs: 13 * MIN, orphanGraceMs: 0 }), 13 * MIN)
  assert.ok(orphanWindowMs({}) >= 15 * MIN, 'a missing config still yields a sane floor')
  assert.equal(orphanWindowMs({ attemptTimeoutMs: 13 * MIN, orphanAfterMs: 3 * MIN }), 3 * MIN, 'explicit wins')
  pass('the window is derived from the attempt budget, and an explicit value wins')
}

console.log(`\n${ok} ok`)
