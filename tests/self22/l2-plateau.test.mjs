// L2 autonomy, part 3: the trigger.
//
// Three flat rounds already raise a plateau checkpoint and already append
// `chain.proposed` events — but the events carry no evidence and the card
// carries no proposals, so the human sees "stuck" and a lever nobody can pull
// from the card. This spec pins the automatic proposer: the plateau card names a
// version to adopt, every proposal carries prediction + risk + diff, and one
// approve activates that version with its prediction attached.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { adoptFromCheckpoint } from '../../src/chain/adopt.js'
import { measurePrediction } from '../../src/chain/measure.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from './fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const dir = makeRepo()
const spec = chainSpec({ candidates: 2 })
const { runtime, view } = makeRuntime({
  repo: dir,
  spec,
  tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }],
})
const config = baseConfig()
const dispatcher = fakeDispatcher([])

for (let n = 1; n <= 3; n += 1) {
  view.state.rounds = runtime.events.filter((e) => e.type === 'round.started').map((e) => ({ n: e.data.n }))
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
}

const raised = runtime.events.filter((e) => e.type === 'checkpoint.raised' && e.data?.kind === 'plateau')
assert.equal(raised.length, 1, 'exactly one plateau checkpoint after three flat rounds')
const payload = raised[0].data.payload
assert.ok(Array.isArray(payload.proposals) && payload.proposals.length >= 1, 'the card carries the proposals')
assert.equal(payload.chainVersion, payload.proposals[0].version, 'the card names the version to adopt')
for (const p of payload.proposals) {
  assert.ok(p.version > 1)
  assert.ok(p.prediction && Number.isFinite(p.prediction.point), `proposal ${p.version} carries a prediction`)
  assert.ok(p.prediction.low <= p.prediction.point && p.prediction.point <= p.prediction.high)
  assert.ok(p.risk && typeof p.risk.level === 'string')
  assert.ok(Array.isArray(p.diff) && p.diff.length >= 1, `proposal ${p.version} carries its spec diff`)
  assert.ok(p.rationale)
}
ok('the plateau card carries proposals with prediction, risk and diff')

const proposed = runtime.events.filter((e) => e.type === 'chain.proposed')
assert.ok(proposed.length >= 1)
assert.ok(proposed.every((e) => e.data?.prediction && Number.isFinite(e.data.prediction.point)))
assert.ok(proposed.every((e) => Array.isArray(e.data?.diff) && e.data.diff.length >= 1))
ok('chain.proposed events carry the same evidence as the card')

const checkpoint = { id: 'cp1', kind: 'plateau', status: 'open', payload }
const adopted = adoptFromCheckpoint({ runtime, view, checkpoint, actor: 'human' })
assert.equal(adopted.activated, payload.chainVersion)
const activated = runtime.events.find((e) => e.type === 'chain.activated')
assert.equal(activated.data.version, payload.chainVersion)
assert.equal(activated.data.prediction.point, payload.proposals[0].prediction.point, 'the prediction travels into the activation')
ok('one approve activates the proposed version and carries its prediction')

const measured = measurePrediction({
  pending: { version: payload.chainVersion, prediction: payload.proposals[0].prediction, baseline: { t1: 0 } },
  round: { n: 4, taskId: 't1', chainVersion: payload.chainVersion, score: 0.4, promoted: true },
})
assert.ok(measured, 'the next round under the new chain is measured')
assert.equal(measured.baseline, 0)
assert.equal(measured.realized, 0.4)
assert.equal(measured.verdict, 'met')
ok('the re-measurement compares the new round against the pre-adoption baseline')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
