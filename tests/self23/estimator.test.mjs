// "One more candidate" is not worth the gap between the two candidates we
// already bought — that gap is what the *task* allowed, not what the extra
// candidate adds. The marginal value is P(second beats first) × the gap, so a
// round where the second candidate usually loses must forecast less, not the
// same.
import assert from 'node:assert/strict'
import { predictGain } from '../../src/chain/predict.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const rounds = [
  {
    n: 1,
    score: 0.4,
    status: 'no-gain',
    attempts: [
      { score: 0.3, verifierOk: true },
      { score: 0.4, verifierOk: true },
    ],
  },
  {
    n: 2,
    score: 0.5,
    status: 'no-gain',
    attempts: [
      { score: 0.5, verifierOk: true },
      { score: 0.4, verifierOk: true },
    ],
  },
]

const g = predictGain({ kind: 'candidates+1', rounds, config: {} })
assert.equal(g.basis, 'rounds')
assert.ok(Math.abs(g.point - 0.05) < 1e-9, `point is 0.5 × 0.1, got ${g.point}`)
assert.ok(g.low <= g.point && g.point <= g.high)
assert.match(g.method, /beat/i, 'the method says the estimate discounts for the second candidate losing')
ok('the extra-candidate forecast is a probability-weighted gap')

console.log(`\n${pass}/${pass} passed`)
