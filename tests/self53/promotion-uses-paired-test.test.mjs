// The shadow reading has to come from real history, not from the round under
// test alone.
//
// A gate that only ever looked at the current round could never accumulate
// evidence, so the whole point of an anytime-valid test would be lost: it earns
// its guarantee by betting on every pair in sequence. This spec seeds the
// campaign with eight rounds on one task where each round beat the standing
// best, and checks that the gate reports a commit — while `promoted` still
// follows the incumbent rule that is in force.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const dir = makeRepo()
const spec = chainSpec({ candidates: 1 })
const { runtime, view } = makeRuntime({
  repo: dir,
  spec,
  tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }],
})
// Nine consecutive improvements on one task. The first observation has no
// incumbent to beat, so it is not a pair; the remaining eight are wins and put
// E at 1.5^8 = 25.63, past 1/alpha = 20.
// `landed` and the attempts are what `bestPriorScore` reads: without them the
// gate has no incumbent and every round looks like a first one, which is how a
// seeded history can silently mean nothing.
view.state.rounds = Array.from({ length: 9 }, (_, i) => ({
  n: i + 1,
  taskId: 't1',
  status: 'promoted',
  score: 0.1 * (i + 1),
  promoted: true,
  landed: true,
  attempts: [{ id: `a${i}`, score: 0.1 * (i + 1) }],
}))

await runRound({ runtime, view, config: baseConfig(), dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })

const [gate] = runtime.events.filter((e) => e.type === 'gate.evaluated').map((e) => e.data)
assert.equal(gate.sequential.pairs, 8, 'the pairs come from the campaign, not from this round')
assert.equal(gate.decision, 'commit')
assert.equal(gate.firstCrossing, 8)
assert.ok(gate.eValue >= 20)
ok('eight wins on one task put the shadow gate at commit')

// The rule in force is untouched: this round did not beat the standing best
// (the same task, now graded at 0), so it is not promoted even though the
// shadow says commit. Shadow means shadow.
assert.equal(gate.promoted, false)
assert.equal(gate.checks.beatsIncumbent, false)
ok('a shadow commit does not promote anything by itself')

// A refusing ledger: the same history with alternating wins and losses never
// crosses (E stays at 1.5^4 * 0.5^4 = 0.316), and the gate must say defer or
// reject rather than inherit the eight-win answer.
const dir2 = makeRepo()
const second = makeRuntime({
  repo: dir2,
  spec: chainSpec({ candidates: 1 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }],
})
second.view.state.rounds = Array.from({ length: 8 }, (_, i) => ({
  n: i + 1,
  taskId: 't1',
  status: i % 2 === 0 ? 'promoted' : 'no-gain',
  // Alternating up/down against a drifting best keeps the pairs mixed.
  score: i % 2 === 0 ? 0.1 * (i + 1) : 0.05,
  promoted: i % 2 === 0,
  attempts: [],
}))
await runRound({
  runtime: second.runtime,
  view: second.view,
  config: baseConfig(),
  dispatcher: fakeDispatcher([]),
  log: () => {},
  notify: () => {},
})
const mixed = second.runtime.events.filter((e) => e.type === 'gate.evaluated').map((e) => e.data)[0]
assert.notEqual(mixed.decision, 'commit', 'a mixed ledger is not evidence of an improvement')
assert.ok(mixed.sequential.reason.length > 0, 'and the gate says why it did not decide')
ok('a mixed history defers instead of borrowing someone else commitment')

rmSync(dir, { recursive: true, force: true })
rmSync(dir2, { recursive: true, force: true })
