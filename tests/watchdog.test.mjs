// Tests for src/runtime/watchdog.js — liveness by event watermark, never by pid.

import assert from 'node:assert/strict'
import { Watchdog } from '../src/runtime/watchdog.js'

let passed = 0
let failed = 0
function ok(cond, name) {
  if (cond) {
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}`)
  }
}
function eq(actual, expected, name) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a === b) ok(true, name)
  else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}\n  actual:   ${a}\n  expected: ${b}`)
  }
}

function make({ seqOf = () => null, stallMs = 5000, graceMs = 1000 } = {}) {
  const stalls = []
  const wd = new Watchdog({ seqOf, stallMs, graceMs, onStall: (r) => stalls.push(r) })
  return { wd, stalls }
}

// 1. constructor guard
assert.throws(() => new Watchdog({}), TypeError)
ok(true, 'constructor throws without seqOf')

// 2. advancing watermark keeps the attempt alive
{
  let seq = 1
  const { wd, stalls } = make({ seqOf: () => seq })
  let aborted = 0
  wd.track({ attemptId: 'a1', sessionId: 's1', abort: () => (aborted += 1) })
  eq(wd.size(), 1, 'track adds one entry')
  const t0 = Date.now()
  eq(wd.check(t0).length, 0, 'first check is quiet')
  seq = 2
  eq(wd.check(t0 + 4000).length, 0, 'new events within stallMs are healthy')
  seq = 3
  eq(wd.check(t0 + 8000).length, 0, 'a heartbeat every few seconds keeps it alive indefinitely')
  eq(aborted, 0, 'healthy attempt is never aborted')
  eq(stalls.length, 0, 'healthy attempt is never reported')
}

// 3. silence past stallMs writes it off and aborts it
{
  const { wd, stalls } = make({ seqOf: () => 7 })
  let aborted = 0
  wd.track({ attemptId: 'a2', sessionId: 's2', abort: () => (aborted += 1) })
  const t0 = Date.now()
  wd.check(t0)
  const out = wd.check(t0 + 5001)
  eq(out.length, 1, 'quiet past stallMs is written off')
  eq(out[0].attemptId, 'a2', 'reported attempt id')
  eq(out[0].reason, 'stalled', 'reason is stalled')
  ok(out[0].idleMs > 5000, 'report carries the idle time')
  eq(aborted, 1, 'abort callback fires exactly once')
  eq(wd.size(), 0, 'written-off attempt is untracked')
  eq(stalls.length, 1, 'onStall is called once')
  eq(wd.check(t0 + 20000).length, 0, 'no second report for the same attempt')
}

// 4. grace window: a brand-new session with no events yet is not stalled
{
  const { wd } = make({ seqOf: () => null, stallMs: 5000, graceMs: 30000 })
  wd.track({ attemptId: 'a3', sessionId: 's3' })
  const t0 = Date.now()
  eq(wd.check(t0 + 10000).length, 0, 'inside graceMs with no events is not stalled')
  eq(wd.check(t0 + 31000).length, 1, 'past graceMs with still no events is stalled')
}

// 5. deadline wins even when the session is chatty
{
  const { wd, stalls } = make({ seqOf: () => 100, stallMs: 60000 })
  let aborted = 0
  const t0 = Date.now()
  wd.track({ attemptId: 'a4', sessionId: 's4', abort: () => (aborted += 1), deadline: t0 + 2000 })
  eq(wd.check(t0 + 1000).length, 0, 'before the deadline nothing happens')
  const out = wd.check(t0 + 2500)
  eq(out.length, 1, 'deadline writes the attempt off')
  eq(out[0].reason, 'deadline', 'reason is deadline')
  eq(aborted, 1, 'abort fires on deadline')
  eq(stalls[0].reason, 'deadline', 'onStall sees deadline')
}

// 6. untrack = normal completion, never a stall
{
  const { wd } = make({ seqOf: () => 1 })
  wd.track({ attemptId: 'a5', sessionId: 's5' })
  wd.untrack('a5')
  eq(wd.size(), 0, 'untrack removes the attempt')
  eq(wd.check(Date.now() + 600000).length, 0, 'untracked attempt is never written off')
}

// 7. a broken seqOf must not take the host down
{
  const { wd, stalls } = make({
    seqOf: () => {
      throw new Error('session store exploded')
    },
  })
  wd.track({ attemptId: 'a6', sessionId: 's6' })
  let threw = false
  let out = []
  try {
    out = wd.check(Date.now() + 1000)
  } catch {
    threw = true
  }
  ok(!threw, 'check never throws when seqOf throws')
  eq(out.length, 0, 'a failing liveness probe reports nothing')
  eq(stalls.length, 0, 'and does not fire onStall')
}

// 8. list() is a snapshot without the abort closure
{
  const { wd } = make({ seqOf: () => 1 })
  wd.track({ attemptId: 'a7', sessionId: 's7', deadline: 999 })
  const [entry] = wd.list()
  eq(entry.attemptId, 'a7', 'list exposes entries')
  ok(entry.abort === undefined, 'list does not leak the abort closure')
  eq(entry.deadline, 999, 'list keeps the deadline')
}

// 9. clear() drops everything (used on dispose)
{
  const { wd } = make({ seqOf: () => 1 })
  wd.track({ attemptId: 'a8', sessionId: 's8' })
  wd.clear()
  eq(wd.size(), 0, 'clear empties the tracked set')
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exitCode = 1
assert.ok(passed > 0)
