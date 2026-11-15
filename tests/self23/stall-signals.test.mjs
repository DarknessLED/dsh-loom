// Plateau is not the only way a loop stalls. Three rounds that each get 90% of
// the way and promote nothing is a near miss, and a chain whose forecast missed
// by a negative margin should propose going back — both belong on the same
// checkpoint channel a human already watches.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. A near miss is a stall signal even though nothing failed loudly.
const dir = makeRepo()
const { runtime, view } = makeRuntime({
  repo: dir,
  spec: chainSpec({ candidates: 1 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'echo KILLRATE=0.9 && exit 1' } }],
})
const config = baseConfig({ checkpoint: { on: ['gate', 'plateau'], window: 3 } })
for (let i = 0; i < 3; i += 1) {
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })
}
const raised = runtime.events.filter((e) => e.type === 'checkpoint.raised').map((e) => e.data)
const plateau = raised.find((c) => c.kind === 'plateau')
assert.ok(plateau, 'three near misses raised the stall checkpoint')
assert.equal(plateau.payload.trigger, 'near-miss')
assert.ok(plateau.payload.progress >= 0.5, 'the card says how close the rounds got')
rmSync(dir, { recursive: true, force: true })
ok('three near misses raise a stall checkpoint with its progress')

// 2. A forecast that missed and moved backwards proposes the previous chain.
const dir2 = makeRepo()
const { runtime: runtime2, view: view2 } = makeRuntime({
  repo: dir2,
  spec: chainSpec({ candidates: 1 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'echo KILLRATE=0.4' } }],
})
view2.state.chain.versions.push({ version: 2, spec: chainSpec({ candidates: 1 }), by: 'human', at: Date.now(), status: 'active' })
view2.state.chain.activeVersion = 2
view2.state.chain.pending = {
  version: 2,
  fromVersion: 1,
  prediction: { point: 0.2, low: 0, high: 0.5 },
  baseline: { t1: 0.5 },
}
await runRound({ runtime: runtime2, view: view2, config: baseConfig(), dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })
const revert = runtime2.events
  .filter((e) => e.type === 'checkpoint.raised')
  .map((e) => e.data)
  .find((c) => c.kind === 'chain-revert')
assert.ok(revert, 'a missed forecast that lost ground raised a revert proposal')
assert.equal(revert.payload.chainVersion, 1, 'the proposal points back at the chain that was replaced')
assert.equal(revert.payload.measurement.verdict, 'missed')
rmSync(dir2, { recursive: true, force: true })
ok('a missed, negative forecast proposes reverting the chain')

// 3. A second flat window is a second stall. L2 must not go silent after its
//    first card: an adopted variant that also stalls needs its own proposal.
const dir3 = makeRepo()
const { runtime: runtime3, view: view3 } = makeRuntime({
  repo: dir3,
  spec: chainSpec({ candidates: 1 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'echo KILLRATE=0.2 && exit 1' } }],
})
const config3 = baseConfig({ checkpoint: { on: ['gate', 'plateau'], window: 3 } })
for (let i = 0; i < 6; i += 1) {
  await runRound({ runtime: runtime3, view: view3, config: config3, dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })
}
const plateaus = runtime3.events.filter((e) => e.type === 'checkpoint.raised' && e.data.kind === 'plateau').map((e) => e.data)
assert.equal(plateaus.length, 2, 'each fresh flat window asks once')
assert.deepEqual(plateaus[0].payload.rounds, [1, 2, 3])
assert.deepEqual(plateaus[1].payload.rounds, [4, 5, 6], 'the second card covers the new window, not the old one')
rmSync(dir3, { recursive: true, force: true })
ok('a new flat window after an answered plateau raises a second card')

console.log(`\n${pass}/${pass} passed`)
