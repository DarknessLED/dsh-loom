// Stopping a campaign must mean the child stops too. Before this, "stop" closed
// the campaign but left the in-flight round running to completion: the board
// said stopped while a subagent was still working (and still billing). The abort
// is deliberately best-effort and idempotent — the attempt still finishes through
// its own path and records whether it was interrupted, so nothing is fabricated.
import { Watchdog } from '../src/runtime/watchdog.js'

let pass = 0
const ok = (cond, name) => {
  if (!cond) {
    console.error(`not ok - ${name}`)
    process.exitCode = 1
  } else {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  }
}

const make = (opts = {}) => new Watchdog({ seqOf: () => 1, ...opts })

{
  const w = make()
  let calls = 0
  w.track({ attemptId: 'r1a1', sessionId: 's1', campaign: 'c1', abort: () => { calls += 1 } })
  ok(w.abort('r1a1') === true, 'abort asks the tracked attempt to stop')
  ok(calls === 1, 'the abort function runs exactly once')
  ok(w.abort('r1a1') === false, 'a second abort on the same attempt is a no-op')
  ok(calls === 1, 'the abort function is not called twice')
  ok(w.abort('nope') === false, 'aborting an unknown attempt reports false')
}

{
  const w = make()
  const calls = []
  w.track({ attemptId: 'r1a1', sessionId: 's1', campaign: 'c1', abort: () => calls.push('a1') })
  w.track({ attemptId: 'r1a2', sessionId: 's2', campaign: 'c1', abort: () => calls.push('a2') })
  w.track({ attemptId: 'r9a1', sessionId: 's9', campaign: 'other', abort: () => calls.push('x') })
  ok(w.abortCampaign('c1') === 2, 'abortCampaign stops only that campaign')
  ok(calls.length === 2 && !calls.includes('x'), 'the other campaign keeps running')
  ok(w.abortCampaign('c1') === 0, 'a second stop of the same campaign aborts nothing')
  ok(w.abortCampaign('') === 0, 'an empty campaign id is refused rather than matching everything')
}

{
  const w = make({ log: () => {} })
  w.track({ attemptId: 'boom', sessionId: 's', campaign: 'c', abort: () => { throw new Error('cancel failed') } })
  ok(w.abort('boom') === true, 'a failing abort is still reported as asked')
  ok(w.size() === 1, 'the attempt stays tracked until it finishes on its own path')
}

{
  const w = make()
  w.track({ attemptId: 'plain', sessionId: 's' })
  ok(w.abort('plain') === true, 'an attempt without an abort function is harmless')
  ok(w.list().every((e) => e.abort === undefined), 'list never leaks the abort closure')
}

console.log(`${pass}/${pass} passed`)
