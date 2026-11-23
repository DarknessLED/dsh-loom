// L2 autonomy, part 5: a forecast that was declined is still a forecast.
//
// AHE's decision observability is the part I had only half of. Every edit ships
// with a recorded prediction, and the *next* round intersects that prediction
// with what actually happened — including the edits the loop reverted. Ours only
// measured the version a human adopted: `chain.activated` opened a pending
// measurement and nothing else did, so a declined proposal left no trace at all
// and the forecast was never graded. Declining is a decision about a forecast,
// and an ungraded decision is how a loop learns to keep declining.
//
// The measurement is counterfactual by construction: the next round runs on the
// chain that is still in force, so its delta is the no-change trajectory. A
// forecast that then shows no gain is a decline that kept money; one that shows
// the predicted gain is a decline that left it on the table. Both are worth
// recording, and neither is worth guessing at.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reduce } from '../../src/core/reduce.js'
import { measurePrediction, measureDeclined } from '../../src/chain/measure.js'
import { applyApprovalEffects, applyRejectionEffects } from '../../src/runtime/decision-effects.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const spec = { name: 'l2-spec', version: 2, params: { candidates: 2 }, nodes: [{ id: 'a', type: 'agent', prompt: 'x' }] }
const prediction = { point: 0.2, low: 0, high: 0.5, samples: 2, basis: 'rounds', method: 'median gap between the top two candidates' }

const base = [
  { seq: 1, t: 1000, type: 'chain.proposed', data: { version: 2, spec, prediction } },
  { seq: 2, t: 2000, type: 'round.started', data: { n: 1, taskId: 't', chainVersion: 1 } },
  { seq: 3, t: 2100, type: 'round.finished', data: { n: 1, status: 'no-gain', score: 0.4, promoted: false, chainVersion: 1 } },
]

const declined = reduce(base.concat([{ seq: 4, t: 3000, type: 'chain.declined', data: { version: 2, note: 'too expensive' } }]), 'c')
assert.equal(declined.chain.declined?.version, 2, 'declining a proposal starts a measurement of its own')
assert.equal(declined.chain.declined.prediction.point, 0.2, 'the declined forecast keeps the prediction it was declined on')
assert.equal(declined.chain.declined.baseline.t, 0.4, 'the baseline is the task best before the decline')
assert.equal(declined.chain.pending, null, 'a decline is not an activation: nothing is pending for the new chain')
ok('the reducer remembers a declined forecast with its baseline')

// The counterfactual: the next round ran on the chain that stayed in force, so
// its delta is what happened *without* the change. 0.42 against a 0.4 baseline
// is a 0.02 move, well under half of the 0.2 that was predicted.
const measured = measureDeclined({
  declined: declined.chain.declined,
  round: { n: 2, taskId: 't', chainVersion: 1, score: 0.42 },
})
assert.equal(measured.applied, false, 'the measurement says the change was not applied')
assert.equal(measured.realized, 0.02)
assert.equal(measured.verdict, 'missed', 'the forecast that was declined did not show up anyway')
assert.equal(measured.predicted.point, 0.2)

// A declined forecast that *would* have paid says so in the other direction.
const leftOnTheTable = measureDeclined({
  declined: declined.chain.declined,
  round: { n: 2, taskId: 't', chainVersion: 1, score: 0.62 },
})
assert.equal(leftOnTheTable.verdict, 'met')
ok('a declined forecast is graded against what the unchanged chain then did')

const afterMeasure = reduce(
  base.concat([
    { seq: 4, t: 3000, type: 'chain.declined', data: { version: 2 } },
    { seq: 5, t: 4000, type: 'chain.measured', data: { version: 2, applied: false, taskId: 't', round: 2, realized: 0.02, verdict: 'missed' } },
  ]),
  'c',
)
assert.equal(afterMeasure.chain.declined, null, 'one measurement closes the declined forecast')
assert.equal(afterMeasure.chain.measurements.length, 1)
assert.equal(afterMeasure.chain.measurements[0].applied, false, 'the ledger keeps applied and counterfactual measurements apart')
assert.equal(afterMeasure.chain.activeVersion, declined.chain.activeVersion, 'grading a decline never changes which chain is in force')
ok('the ledger stores the counterfactual next to the real measurements')

// Adoption still works exactly as before: an activation opens the pending
// measurement and a decline must not open one.
const adopted = reduce(base.concat([{ seq: 4, t: 3000, type: 'chain.activated', data: { version: 2, prediction } }]), 'c')
assert.equal(adopted.chain.pending?.version, 2)
assert.equal(adopted.chain.declined, null)
assert.ok(measurePrediction({ pending: adopted.chain.pending, round: { n: 2, taskId: 't', chainVersion: 2, score: 0.6 } }))
ok('adoption and decline are different events with different effects')

// Both doors must perform the decline, or the panel's reject button is a
// notification and the ledger only ever sees the tool door's declines.
for (const file of ['src/tools/index.js', 'src/panel/api.js']) {
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  assert.match(source, /applyRejectionEffects/, `${file} must apply rejection effects`)
}
ok('the tool door and the panel door decline through one table')

// The table itself: a plateau card carries the version it recommends, and
// declining it must name the same version with the prediction the card showed.
const appended = []
const view = {
  state: {
    id: 'c',
    rounds: [{ n: 1, taskId: 't', score: 0.4, chainVersion: 1 }],
    chain: {
      activeVersion: 1,
      versions: [{ version: 1, spec, status: 'active' }, { version: 2, spec, prediction, status: 'candidate' }],
      pending: null,
      declined: null,
      measurements: [],
    },
  },
}
const runtime = { append: (_view, type, data) => appended.push({ type, data }) }
const effects = applyRejectionEffects({
  runtime,
  view,
  target: { id: 'cp-1', kind: 'plateau', payload: { chainVersion: 2, prediction } },
  actor: 'human',
})
assert.deepEqual(effects, { declined: 2 }, 'declining a chain card reports what it declined')
assert.equal(appended.length, 1)
assert.equal(appended[0].type, 'chain.declined')
assert.equal(appended[0].data.version, 2)
ok('declining a plateau card appends chain.declined for the version it named')

// Approving the same card must not also decline it, and a gate card (which
// names no version) has nothing to decline.
const noise = []
const quietRuntime = { append: (_v, type, data) => noise.push({ type, data }) }
const approved = applyApprovalEffects({ runtime: quietRuntime, view, target: { id: 'cp-2', kind: 'plateau', payload: { chainVersion: 2 } } })
assert.equal(approved.chain, 2)
assert.equal(applyRejectionEffects({ runtime: quietRuntime, view, target: { id: 'cp-3', kind: 'gate', payload: {} } }), null)
assert.equal(noise.filter((e) => e.type === 'chain.declined').length, 0, 'an approval or a version-less card never declines anything')
ok('declines are only recorded when a version was actually refused')

// The counterfactual has to survive contact with a real round: the reducer's
// pending record is what the round reads, so the spec drives one round on the
// fixture with a decline already in the ledger.
{
  const { runRound } = await import('../../src/runtime/round.js')
  const { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } = await import('../self22/fixture.mjs')
  const { rmSync } = await import('node:fs')

  const dir = makeRepo()
  const spec = chainSpec({ candidates: 1 })
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec,
    tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }],
  })
  view.state.chain.declined = {
    version: 2,
    prediction: { point: 0.3, low: 0, high: 0.6, basis: 'prior', method: 'test' },
    baseline: { t1: 0 },
  }
  const config = baseConfig()
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })

  const counterfactual = runtime.events.filter((e) => e.type === 'chain.measured')
  assert.equal(counterfactual.length, 1, 'a round with a declined forecast in the ledger grades it')
  assert.equal(counterfactual[0].data.version, 2)
  assert.equal(counterfactual[0].data.applied, false, 'the measurement says the change was never applied')
  assert.equal(counterfactual[0].data.verdict, 'missed', 'a refused change that changed nothing did not pay')
  rmSync(dir, { recursive: true, force: true })
  ok('a real round grades the forecast it declined last time')
}

console.log(`\n${pass} passed`)
