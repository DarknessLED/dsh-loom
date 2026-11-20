// The watchdog measures liveness on the child's event watermark. That is the
// right signal for "the agent stopped working" and the wrong signal for "the
// agent is waiting for its own command" — both look like a frozen seq.
//
// fin-oneyear1 (2026-11-20) paid for that confusion five times in four rounds.
// Each attempt stalled at idleMs ≈ 304 s against a 300 s window, and each one
// was, at that instant, mid-`ops_bash`:
//
//   r1a1  02:25:51 job/registered "Scan futures gates" → 02:31:12 job/settled (killed)
//   r2a1  02:38:xx job/registered "Scan futures params" → 02:41:56 job/settled (killed)
//   r3a1  02:48:xx job/registered "Futures-parameter sweep" → 02:53:25 job/settled (killed)
//   r4a1  02:56:xx job/registered "Stage1 grid" → 03:01:27 job/settled (killed)
//
// A foreground `ops_bash` that takes six minutes appends `tool/call` and then
// nothing until the command returns. The child is healthy; the event log is
// silent; the watchdog kills it, `abandonedVerdict` refuses to verify the tree,
// score is 0, and the round is billed anyway ($0.162552 for four rounds whose
// patches — 3 files, +127 lines in r1a1 — were thrown away).
//
// So liveness needs two facts, not one: has the watermark advanced, and is a
// tool call still in flight. Only the pair distinguishes "wedged" from "waiting".
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { tailActivity } from '../../src/runtime/activity.js'
import { Watchdog } from '../../src/runtime/watchdog.js'

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  try {
    assert.ok(cond, detail)
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name} :: ${err?.message ?? err}`)
  }
}

const ev = (type, data = {}, time = 0) => ({ type, data, time })

// 1. A tool call with no result yet is a wait, not a death.
{
  const tail = [ev('turn/start'), ev('step/start', { turn: 1, step: 14 }), ev('tool/call', { name: 'ops_bash', callId: 'c1' }, 1000), ev('job/registered', { jobId: 'b1' }, 1001)]
  const a = tailActivity(tail)
  ok('an in-flight tool call is reported as waiting', a.waiting === true, JSON.stringify(a))
  ok('and it names the tool the child is waiting on', a.tool === 'ops_bash', JSON.stringify(a))
}

// 2. The result closes the wait.
{
  const tail = [ev('tool/call', { name: 'ops_bash', callId: 'c1' }, 1000), ev('tool/result', { callId: 'c1' }), ev('step/end', { turn: 1, step: 14 }), ev('step/start', { turn: 1, step: 15 })]
  ok('a completed tool call is not a wait', tailActivity(tail).waiting === false, JSON.stringify(tailActivity(tail)))
}

// 3. An orphaned call whose step already ended is not a wait: the tool never
// produced a result, so the child has moved on (or died) — either way the idle
// clock is the honest signal again.
{
  const tail = [ev('tool/call', { name: 'ops_bash', callId: 'c1' }, 1000), ev('step/end', { turn: 1, step: 14 })]
  ok('a step that ended without a result is not a wait', tailActivity(tail).waiting === false, JSON.stringify(tailActivity(tail)))
  const turn = [ev('tool/call', { name: 'x' }, 1), ev('turn/end', { turn: 1 })]
  ok('a turn that ended without a result is not a wait', tailActivity(turn).waiting === false, JSON.stringify(tailActivity(turn)))
}

// 4. Empty or malformed input answers "not waiting" rather than throwing: this
// runs inside the tick, where a throw would take the host down.
{
  ok('no events is not a wait', tailActivity([]).waiting === false, JSON.stringify(tailActivity([])))
  ok('a missing list is not a wait', tailActivity(null).waiting === false, JSON.stringify(tailActivity(null)))
  ok('junk entries do not throw', tailActivity([null, {}, ev('tool/call')]).waiting === true, JSON.stringify(tailActivity([null, {}, ev('tool/call')])))
}

// 5. The watchdog honours the pair: a frozen watermark with a tool in flight is
// alive, and it stays alive however long the command takes.
{
  const stalls = []
  const wd = new Watchdog({ seqOf: () => ({ seq: 113, waiting: true, tool: 'ops_bash' }), stallMs: 5000, graceMs: 1000, onStall: (r) => stalls.push(r) })
  wd.track({ attemptId: 'w1', sessionId: 's1' })
  const t0 = Date.now()
  ok('first check is quiet', wd.check(t0).length === 0)
  ok('six minutes of waiting is not a stall', wd.check(t0 + 6 * 60_000).length === 0, JSON.stringify(stalls))
  ok('thirty minutes of waiting is still not a stall', wd.check(t0 + 30 * 60_000).length === 0, JSON.stringify(stalls))
  ok('and the attempt is still tracked', wd.size() === 1)
  ok('nothing was reported', stalls.length === 0)
}

// 6. Once the wait ends, the idle clock restarts from that moment — not from
// when the command started.
{
  const stalls = []
  let probe = { seq: 5, waiting: true }
  const wd = new Watchdog({ seqOf: () => probe, stallMs: 5000, graceMs: 1000, onStall: (r) => stalls.push(r) })
  wd.track({ attemptId: 'w2', sessionId: 's2' })
  const t0 = Date.now()
  wd.check(t0 + 60_000)
  probe = { seq: 5, waiting: false }
  ok('the moment the wait ends it is still healthy', wd.check(t0 + 60_001).length === 0)
  ok('and it is not written off on the next tick', wd.check(t0 + 62_000).length === 0, JSON.stringify(stalls))
  const out = wd.check(t0 + 66_000)
  ok('silence after the wait does eventually write it off', out.length === 1, JSON.stringify(out))
  ok('the stall record says it was not waiting', out[0]?.waiting === false, JSON.stringify(out[0]))
}

// 7. Waiting does not outrun the deadline: the wall-clock cap is still the cap.
{
  const stalls = []
  const t0 = Date.now()
  const wd = new Watchdog({ seqOf: () => ({ seq: 9, waiting: true }), stallMs: 5000, graceMs: 1000, onStall: (r) => stalls.push(r) })
  wd.track({ attemptId: 'w3', sessionId: 's3', deadline: t0 + 10_000 })
  ok('inside the deadline a long wait is fine', wd.check(t0 + 9_000).length === 0)
  const out = wd.check(t0 + 11_000)
  ok('the deadline still stops it', out.length === 1, JSON.stringify(out))
  ok('and the reason is deadline, not stalled', out[0]?.reason === 'deadline', JSON.stringify(out[0]))
}

// 8. A stalled record says whether a tool was in flight, so a later reader can
// tell the two deaths apart without replaying the session.
{
  const stalls = []
  const wd = new Watchdog({ seqOf: () => ({ seq: 3, waiting: false }), stallMs: 1000, graceMs: 0, onStall: (r) => stalls.push(r) })
  wd.track({ attemptId: 'w4', sessionId: 's4' })
  const t0 = Date.now()
  wd.check(t0)
  wd.check(t0 + 2000)
  ok('a plain stall records waiting:false', stalls[0]?.waiting === false, JSON.stringify(stalls[0]))
}

// 9. Numeric probes keep working: every existing caller passes a watermark.
{
  const stalls = []
  const wd = new Watchdog({ seqOf: () => 7, stallMs: 1000, graceMs: 0, onStall: (r) => stalls.push(r) })
  wd.track({ attemptId: 'w5', sessionId: 's5' })
  const t0 = Date.now()
  wd.check(t0)
  ok('a numeric probe still stalls on silence', wd.check(t0 + 2000).length === 1)
}

// 10. The runtime feeds the watchdog the pair, not just the watermark. Without
// this wiring the module above is dead code on a shelf.
{
  const src = readFileSync(new URL('../../src/runtime/runtime.js', import.meta.url), 'utf8')
  ok('the runtime probe consults the session tail', /tailActivity/.test(src), 'runtime.js does not import tailActivity')
  ok('and the runtime records waiting on the heartbeat', /waiting/.test(src), 'runtime.js never mentions waiting')
}

// 11. The distinction has to reach a human. `liveAttempts()` is what
// rsi_status and the panel render, and two attempts showing the same idleMs
// mean opposite things — one wedged, one waiting on its own six-minute
// command. Leaving the flag in memory makes the fix invisible exactly when
// someone is deciding whether to kill the run.
{
  const src = readFileSync(new URL('../../src/runtime/runtime.js', import.meta.url), 'utf8')
  ok('liveAttempts exposes the waiting flag', /waiting: e\.waiting/.test(src), 'liveAttempts drops e.waiting')
  const tools = readFileSync(new URL('../../src/tools/index.js', import.meta.url), 'utf8')
  ok('rsi_status says which it is', /waiting on/.test(tools), 'the status line never prints waiting')
}

// 12. And the flag is honest about a probe that could not look: `null` means
// "a bare watermark, no tail to read", which is different from `false`.
{
  const wd = new Watchdog({ seqOf: () => 42, stallMs: 1000, graceMs: 0 })
  wd.track({ attemptId: 'w6', sessionId: 's6' })
  wd.check(Date.now())
  const row = wd.list()[0]
  ok('a numeric probe records waiting:null, not false', row.waiting === null, JSON.stringify(row.waiting))
}

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
