// A forecast that was never made cannot come true.
//
// `chain.activated` starts a pending measurement so the first round under the
// new chain can be graded against the forecast that justified adopting it. But
// it started one for *every* activation, including the plain `activate v1` that
// opens a campaign, which carries no forecast at all. The measurement then ran
// on `prediction: null`, `grade()` found no point to compare against, fell
// through its last branch, and wrote `verdict: 'met'`.
//
// In this ledger that is 59 of 62 `chain.measured` events: a round that never
// had a forecast recorded as a forecast that materialised. Calibration was not
// fooled (it filters on a finite point), which is exactly why nobody noticed:
// the number stayed honest while the event did not.
//
//   node tests/self56/a-forecast-that-was-never-made-is-not-graded.test.mjs
import assert from 'node:assert/strict'
import { emptyState, reduce } from '../../src/core/reduce.js'
import { measurePrediction } from '../../src/chain/measure.js'
import { summarizeCalibration } from '../../src/chain/predict.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function ledger(events) {
  let seq = 0
  const all = events.map((e) => ({ seq: (seq += 1), t: 'system', at: 1_700_000_000_000 + seq, type: e.type, data: e.data }))
  return reduce(all)
}

const spec = { name: 'code-fix', version: 1, params: {}, nodes: [] }
const gradedSpec = { ...spec, version: 2, params: { candidates: 2 } }

// The shipped path: a campaign opens by activating the chain it proposed, with no
// forecast anywhere in the record.
const plain = ledger([
  { type: 'chain.proposed', data: { version: 1, spec } },
  { type: 'chain.activated', data: { version: 1 } },
  { type: 'round.started', data: { n: 1, taskId: 't1', chainVersion: 1 } },
  { type: 'round.finished', data: { n: 1, score: 0.4, status: 'no-gain', promoted: false } },
])
assert.equal(
  plain.chain.pending,
  null,
  'an activation with no forecast leaves nothing pending: there is no claim to check',
)
ok('a plain activation leaves no pending forecast')

// And the same question at the grading door, independent of the reducer: even if
// a pending record somehow exists without a prediction, there is nothing to grade.
const ungradeable = measurePrediction({
  pending: { version: 1, prediction: null, baseline: {} },
  round: { n: 1, taskId: 't1', chainVersion: 1, score: 0.4 },
})
assert.equal(ungradeable, null, 'no forecast means no verdict, not a verdict of "met"')
ok('a forecast that was never made is not graded')

// The path this record exists for still works: adopted on a forecast, graded on
// the next round, and the verdict is a real comparison.
const adopted = ledger([
  { type: 'chain.proposed', data: { version: 1, spec } },
  { type: 'chain.activated', data: { version: 1 } },
  { type: 'round.started', data: { n: 1, taskId: 't1', chainVersion: 1 } },
  { type: 'round.finished', data: { n: 1, score: 0.2, status: 'no-gain', promoted: false } },
  {
    type: 'chain.proposed',
    data: { version: 2, spec: gradedSpec, prediction: { point: 0.2, low: 0, high: 0.5, basis: 'prior' } },
  },
  { type: 'chain.activated', data: { version: 2 } },
])
assert.equal(adopted.chain.pending?.version, 2, 'an activation with a forecast does start a measurement')
const graded = measurePrediction({
  pending: adopted.chain.pending,
  round: { n: 2, taskId: 't1', chainVersion: 2, score: 0.35 },
})
assert.equal(graded?.verdict, 'met', 'a real forecast is still graded, and still can be met')
assert.equal(graded?.predicted?.point, 0.2, 'the grade carries the point it was measured against')
ok('a real forecast is still graded')

// A missed forecast is the reason to keep the distinction: the same round that
// would have read `met` with no point now reads `missed`, so silence and a
// prediction cannot share a verdict.
const missed = measurePrediction({
  pending: { version: 2, prediction: { point: 0.6, low: 0.4, high: 0.9 }, baseline: { t1: 0.2 } },
  round: { n: 2, taskId: 't1', chainVersion: 2, score: 0.25 },
})
assert.equal(missed?.verdict, 'missed', 'a forecast below the bar is still a miss')
ok('a forecast is still allowed to miss')

// Calibration is the reader of these records, and it must not gain rows it cannot
// use: a settlement with no point is not a settlement.
const summary = summarizeCalibration([
  { verdict: 'met', realized: 0.4, predicted: null },
  { verdict: 'met', realized: 0.15, predicted: { point: 0.2, low: 0, high: 0.5, basis: 'prior' } },
])
assert.equal(summary.n, 1, 'only settlements with a forecast are counted')
assert.equal(summary.byBasis.prior.n, 1, 'and they are counted under the basis that produced them')
ok('calibration counts only forecasts')

console.log(`\n${pass} checks passed`)
