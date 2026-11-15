// A forecast nobody grades is decoration. Every chain.measured is an outcome
// for a stated prediction, so the loop keeps the pair in the campaign's
// decisions ledger and can answer "did the intervals hold?" with coverage and
// error, not with a vibe.
import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { summarizeCalibration } from '../../src/chain/predict.js'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const summary = summarizeCalibration([
  { predicted: { point: 0.2, low: 0.1, high: 0.5 }, realized: 0.3, verdict: 'met' },
  { predicted: { point: 0.2, low: 0.1, high: 0.5 }, realized: 0.05, verdict: 'missed' },
  { predicted: { point: 0.2, low: 0.1, high: 0.5 }, realized: 0.55, verdict: 'exceeded' },
])
assert.equal(summary.n, 3)
assert.equal(summary.missed, 1)
assert.equal(summary.exceeded, 1)
assert.equal(summary.met, 1)
assert.ok(Math.abs(summary.coverage - 1 / 3) < 1e-9, 'coverage counts only outcomes inside the stated interval')
assert.ok(Math.abs(summary.mae - 0.2) < 1e-9, 'mae is the average absolute gap to the point forecast')
ok('calibration is summarised as coverage and error')

const dir = makeRepo()
const { runtime, view } = makeRuntime({
  repo: dir,
  spec: chainSpec({ candidates: 1 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'echo KILLRATE=0.3' } }],
})
view.state.chain.versions.push({ version: 2, spec: chainSpec({ candidates: 1 }), by: 'human', at: Date.now(), status: 'active' })
view.state.chain.activeVersion = 2
view.state.chain.pending = {
  version: 2,
  fromVersion: 1,
  prediction: { point: 0.2, low: 0, high: 0.5 },
  baseline: { t1: 0 },
}
await runRound({ runtime, view, config: baseConfig(), dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })

const measured = runtime.events.find((e) => e.type === 'chain.measured')?.data
assert.ok(measured, 'the round measured the pending forecast')
const ledger = JSON.parse(readFileSync(join(runtime.home, 'decisions.json'), 'utf8'))
const record = ledger.find((r) => r.kind === 'prediction')
assert.ok(record, 'the outcome was written to the decisions ledger')
assert.equal(record.decision, 'v2-r1')
assert.equal(record.evidence.predicted, 0.2)
assert.equal(record.evidence.realized, 0.3)
assert.equal(record.evidence.verdict, 'met')

rmSync(dir, { recursive: true, force: true })
ok('a measurement lands in the ledger as a graded prediction')
console.log(`\n${pass}/${pass} passed`)
