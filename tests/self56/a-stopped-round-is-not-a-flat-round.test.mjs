// A round a person stopped is not a round that measured nothing useful.
//
// The ledger has carried `status: 'interrupted'` since a plugin re-apply
// disposed the dispatcher underneath six attempts, and `plateauReached` and
// `bestPriorScore` both skip it for the same reason: it measured nothing about
// the task, so it may not be written off as flat.
//
// The predicate that decides it only recognised "lost to infrastructure". An
// attempt stopped by a human comes back `abandoned: 'interrupted'`, which is
// neither infrastructure nor a real failure, so it fell through to the ordinary
// path and closed its round as `no-gain` with `score: 0` — a verdict about a
// patch the verifier never ran. Nine such rounds exist in this repository's
// ledger (`pair-audit` r2, `sequential-decides` r2, `oracle-honest` r2, ...):
// every one of them was me stopping a campaign whose patch I had already landed
// by hand, and every one of them is now standing evidence that the task did not
// improve. Three in a row is what a plateau card reads.
//
//   node tests/self56/a-stopped-round-is-not-a-flat-round.test.mjs
import assert from 'node:assert/strict'
import { makeRepo, makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'
import { runRound } from '../../src/runtime/round.js'
import { plateauReached } from '../../src/runtime/plateau.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// A dispatcher whose child is stopped the way the host stops one: aborted, not
// timed out, no report, no patch.
const stoppedDispatcher = () => ({
  run: async () => ({ sessionId: 'w', text: '', stopReason: 'aborted' }),
})

const repo = makeRepo()
const tasks = [{ id: 't1', prompt: 'WORKER: make it pass', verify: { cmd: 'exit 1' } }]
const { runtime, view } = makeRuntime({ repo, tasks, spec: chainSpec({ candidates: 1 }) })
const config = baseConfig({ session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 } })

const finished = await runRound({
  runtime,
  view,
  config,
  dispatcher: stoppedDispatcher(),
  log: () => {},
  notify: () => {},
})

const event = runtime.events.filter((e) => e.type === 'round.finished').at(-1)
const record = event?.data ?? {}

assert.equal(finished.status, 'interrupted', 'a stopped round is interrupted, not no-gain')
ok('a round whose only attempt was stopped closes as interrupted')

assert.equal(record.score, null, 'nothing was measured, so there is no score')
ok('the stopped round carries no score rather than a zero')

assert.equal(record.retryable, true, 'the operator may run it again')
ok('the stopped round says it is worth repeating')

assert.equal(record.reason, 'stopped')
ok('the reason names the stop, not the provider')

// The two readers that must not see it: plateau detection (three stopped rounds
// are not a plateau) and the incumbent bar (a stopped round never set one).
const projected = view.state.rounds.at(-1)
assert.equal(projected?.status, 'interrupted')
assert.equal(projected?.score, null)
ok('the projection agrees with the event')

const threeStops = [1, 2, 3].map((n) => ({
  n,
  status: 'interrupted',
  score: null,
  promoted: false,
}))
assert.equal(plateauReached(threeStops, { window: 3 }), false)
ok('three stopped rounds are not a plateau')

// The narrowness that keeps this from becoming a laundering hole: a child that
// died *with* a diagnosis is a real failure and must keep closing as no-gain.
const diedDispatcher = () => ({
  run: async () => ({ sessionId: 'w', text: '', stopReason: 'error', error: 'the model returned 400' }),
})
const second = makeRuntime({ repo, tasks, spec: chainSpec({ candidates: 1 }) })
await runRound({
  runtime: second.runtime,
  view: second.view,
  config,
  dispatcher: diedDispatcher(),
  log: () => {},
  notify: () => {},
})
// The ordinary path returns nothing; the ledger is the record that matters.
const diedFinished = second.runtime.events.filter((e) => e.type === 'round.finished').at(-1)?.data
assert.equal(diedFinished?.status, 'no-gain', 'a diagnosed death is still a failed attempt')
assert.equal(diedFinished?.score, 0, 'a death is a zero, not a silence')
ok('a death with a diagnosis still closes as no-gain')

// A round that stops one candidate because a sibling solved the task is a
// success being written down, not an interruption: the hand-off outranks it.
const sibling = [1, 2].map((n) => ({
  n,
  status: 'interrupted',
  score: null,
  promoted: true,
}))
assert.equal(plateauReached(sibling, { window: 2 }), false)
ok('a hand-off round is not counted as a plateau either')

console.log(`\n${pass} checks passed`)
