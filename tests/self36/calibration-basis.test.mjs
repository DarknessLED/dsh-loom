// Coverage is only meaningful per basis: a prior interval [0, 1] covers nearly
// anything, so pooling it with measured intervals flatters the number that is
// meant to say whether forecasts hold.
import assert from 'node:assert/strict'
import { summarizeCalibration } from '../../src/chain/predict.js'

const measurements = [
  { verdict: 'met', realized: 0.2, predicted: { point: 0.2, low: 0.1, high: 0.3, basis: 'rounds' } },
  { verdict: 'missed', realized: 0.05, predicted: { point: 0.2, low: 0.1, high: 0.3, basis: 'rounds' } },
  { verdict: 'met', realized: 0.6, predicted: { point: 0.25, low: 0, high: 1, basis: 'prior' } },
  { verdict: 'met', realized: 0.4, predicted: { point: 0.2, low: 0.1, high: 0.3 } },
]

const summary = summarizeCalibration(measurements)
assert.equal(summary.n, 4)
assert.equal(summary.coverage, 2 / 4, 'the pool still reports its own coverage')
assert.deepEqual(Object.keys(summary.byBasis).sort(), ['prior', 'rounds', 'unknown'])

assert.equal(summary.byBasis.rounds.n, 2)
assert.equal(summary.byBasis.rounds.coverage, 1 / 2, 'a missed measured interval does not count as covered')
assert.ok(Math.abs(summary.byBasis.rounds.mae - 0.075) < 1e-12)

assert.equal(summary.byBasis.prior.n, 1)
assert.equal(summary.byBasis.prior.coverage, 1, 'a prior interval covers here, and that is the point')

assert.equal(summary.byBasis.unknown.n, 1, 'a measurement without a basis is not folded into a named one')

console.log('4/4 passed')
