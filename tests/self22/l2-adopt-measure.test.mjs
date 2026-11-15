// L2 autonomy, part 4: the closed loop.
//
// Adoption is not the end of the story: the reducer must remember the
// prediction and the pre-adoption baseline, and the next round under the new
// chain must write `chain.measured` saying whether the gain materialised. Both
// doors (the tool and the panel) must perform the same activation.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reduce } from '../../src/core/reduce.js'
import { measurePrediction } from '../../src/chain/measure.js'
import { adoptFromCheckpoint } from '../../src/chain/adopt.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const spec = { name: 'l2-spec', version: 2, params: { candidates: 2 }, nodes: [{ id: 'a', type: 'agent', prompt: 'x' }] }
const prediction = { point: 0.2, low: 0, high: 0.5, samples: 0, basis: 'prior', method: 'test' }
const events = [
  { seq: 1, t: 1000, type: 'chain.proposed', data: { version: 2, spec, prediction } },
  { seq: 2, t: 2000, type: 'round.started', data: { n: 1, taskId: 't', chainVersion: 1 } },
  { seq: 3, t: 2100, type: 'round.finished', data: { n: 1, status: 'promoted', score: 0.2, promoted: true } },
  { seq: 4, t: 3000, type: 'chain.activated', data: { version: 2 } },
]
let state = reduce(events, 'c')
assert.equal(state.chain.activeVersion, 2)
assert.equal(state.chain.versions.find((v) => v.version === 2).prediction.point, 0.2, 'the proposal keeps its prediction')
assert.ok(state.chain.pending, 'activation starts a pending measurement')
assert.equal(state.chain.pending.version, 2)
assert.equal(state.chain.pending.baseline.t, 0.2, 'the baseline is the task best before adoption')
ok('the reducer remembers the prediction and the pre-adoption baseline')

const measured = measurePrediction({
  pending: state.chain.pending,
  round: { n: 2, taskId: 't', chainVersion: 2, score: 0.35, promoted: true },
})
assert.equal(measured.realized, 0.15)
assert.equal(measured.verdict, 'met')
state = reduce([...events, { seq: 5, t: 4000, type: 'chain.measured', data: measured }], 'c')
assert.equal(state.chain.pending, null, 'one measurement closes the pending prediction')
assert.equal(state.chain.measurements.length, 1)
assert.equal(state.chain.measurements[0].verdict, 'met')
ok('chain.measured records whether the predicted gain materialised')

const missed = measurePrediction({
  pending: { version: 2, prediction, baseline: { t: 0.2 } },
  round: { n: 3, taskId: 't', chainVersion: 2, score: 0.22 },
})
assert.equal(missed.verdict, 'missed')
assert.equal(measurePrediction({ pending: { version: 2, prediction, baseline: {} }, round: { chainVersion: 1, score: 1 } }), null)
ok('a round that ran before adoption is not used as evidence')

const appends = []
const fakeRuntime = { append: (_view, type, data) => appends.push({ type, data }) }
const view = { state: { chain: { versions: [{ version: 2, prediction }] } } }
const out = adoptFromCheckpoint({
  runtime: fakeRuntime,
  view,
  checkpoint: { kind: 'plateau', payload: { chainVersion: 2 } },
})
assert.equal(out.activated, 2)
assert.equal(appends[0].type, 'chain.activated')
assert.equal(appends[0].data.prediction.point, 0.2)
assert.equal(adoptFromCheckpoint({ runtime: fakeRuntime, view, checkpoint: { kind: 'gate', payload: { chainVersion: 2 } } }), null)
ok('the adoption helper only acts on chain/plateau cards and keeps the prediction')

for (const file of ['src/tools/index.js', 'src/panel/api.js']) {
  const text = readFileSync(file, 'utf8')
  assert.match(text, /adoptFromCheckpoint/, `${file} must use the same activation path`)
}
ok('the tool door and the panel door share the activation path')

console.log(`\n${pass}/${pass} passed`)
