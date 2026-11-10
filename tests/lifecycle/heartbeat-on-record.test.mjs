// "It died without saying anything" is the most common verdict in the ledger:
// 145 of 420 attempts (34.5%) end that way, and 93 of them die in under three
// seconds. Rebuilding the parent, retrying on the same model, changing providers
// -- every decision about what to do next turns on one question the record cannot
// answer:
//
//   Was the child dead when it went quiet, or had it simply not started?
//
// The watchdog knows. It tracks an event watermark per session (`seq`) and when
// the session stopped advancing (`idleMs`), and it is the component that decides
// whether an attempt is written off. But those two numbers live in memory
// (`runtime.stalls`) and are read exactly once, by the round that is finishing
// right then. Nothing about the liveness of the child survives in the ledger, so
// the question has to be re-argued from the error text every time.
//
// Rule: the attempt record carries the liveness evidence the watchdog had when it
// gave up -- whether the session ever advanced, and how long it had been quiet.
// Both are observable facts, not inferences: a child that never advanced and one
// that went quiet after forty steps are different failures and the record must be
// able to tell them apart.
import assert from 'node:assert/strict'
import { Watchdog } from '../../src/runtime/watchdog.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

// 1. The watchdog reports what it saw, not just why it gave up.
{
  let seq = 0
  const stall = []
  const wd = new Watchdog({
    seqOf: () => seq,
    onStall: (rec) => stall.push(rec),
    stallMs: 100,
    graceMs: 0,
  })
  wd.track({ attemptId: 'r1a1', sessionId: 's1', deadline: Date.now() + 10_000 })
  // The child reports a few steps, then stops.
  const t0 = Date.now()
  seq = 1
  wd.check(Date.now())
  seq = 7
  wd.check(Date.now())
  const written = wd.check(t0 + 5000)
  assert.equal(written.length, 1, 'the watchdog wrote the attempt off')
  const rec = stall[0]
  assert.equal(rec.attemptId, 'r1a1')
  assert.equal(rec.reason, 'stalled')
  assert.equal(rec.advanced, true, 'the session had advanced before it went quiet')
  assert.equal(rec.lastSeq, 7, 'the watermark it reached is on the record')
  assert.ok(rec.idleMs >= 4900, `how long it had been quiet is on the record (${rec.idleMs})`)
  ok('a stall reports the watermark and how long the child had been quiet')
}

// 2. A child that never advanced is a different failure, and says so.
{
  const stall = []
  const wd = new Watchdog({
    seqOf: () => null,
    onStall: (rec) => stall.push(rec),
    stallMs: 50,
    graceMs: 0,
  })
  wd.track({ attemptId: 'r2a1', sessionId: 's2', deadline: Date.now() + 10_000 })
  wd.check(Date.now() + 500)
  assert.equal(stall.length, 1)
  assert.equal(stall[0].advanced, false, 'a session that never reported is distinguishable')
  assert.equal(stall[0].lastSeq, null)
  ok('a child that never started is not reported as a child that went quiet')
}

// 3. The deadline path reports the same shape: it is the other way to be written
//    off, and a reader must be able to tell which one happened.
{
  const stall = []
  const wd = new Watchdog({
    seqOf: () => 3,
    onStall: (rec) => stall.push(rec),
    stallMs: 60_000,
    graceMs: 0,
  })
  wd.track({ attemptId: 'r3a1', sessionId: 's3', deadline: Date.now() - 1 })
  wd.check(Date.now())
  assert.equal(stall.length, 1)
  assert.equal(stall[0].reason, 'deadline')
  assert.equal(stall[0].advanced, true, 'it had been working when the deadline hit')
  ok('a deadline kill also reports the watermark it reached')
}

console.log(`\n${pass}/3 passed`)
assert.equal(pass, 3)
