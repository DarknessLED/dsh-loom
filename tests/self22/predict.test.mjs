// L2 autonomy, part 1: a proposal card is only worth a human's click if it says
// what the change is expected to buy, with a range, from what this campaign has
// already measured.
//
// `src/chain/predict.js` does not exist yet, so this spec must fail red on the
// import. The numbers it pins are the campaign's own record: a win's size, the
// share of rounds that won, and (for an extra candidate) the measured gap
// between the best and the second-best attempt of a round.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { predictGain, regressionRisk } from '../../src/chain/predict.js'

const fin = (x) => Number.isFinite(x)

test('an extra candidate is predicted from the measured top-two gap', () => {
  const rounds = [
    { n: 1, taskId: 't', status: 'promoted', promoted: true, score: 0.4, attempts: [{ score: 0.4, verifierOk: true }, { score: 0.3, verifierOk: true }] },
    { n: 2, taskId: 't', status: 'no-gain', promoted: false, score: 0, attempts: [{ score: 0, verifierOk: false }, { score: 0, verifierOk: false }] },
    { n: 3, taskId: 't', status: 'promoted', promoted: true, score: 0.7, attempts: [{ score: 0.7, verifierOk: true }, { score: 0.5, verifierOk: true }] },
  ]
  const p = predictGain({ kind: 'candidates+1', rounds, config: { gate: { minGain: 0.05 } } })
  assert.equal(p.basis, 'rounds')
  assert.equal(p.samples, 2, 'only the two rounds with two verified attempts are evidence')
  assert.ok(fin(p.point) && fin(p.low) && fin(p.high))
  assert.ok(p.low <= p.point && p.point <= p.high, `interval [${p.low}, ${p.high}] must contain ${p.point}`)
  assert.equal(p.point, 0.15, 'median of the measured gaps 0.1 and 0.2')
  assert.match(p.method, /gap/i)
})

test('a guidance change is predicted from the win rate times the measured win size', () => {
  const rounds = [
    { n: 1, taskId: 't', status: 'promoted', promoted: true, score: 0.2 },
    { n: 2, taskId: 't', status: 'no-gain', promoted: false, score: 0.2 },
    { n: 3, taskId: 't', status: 'promoted', promoted: true, score: 0.5 },
    { n: 4, taskId: 't', status: 'no-gain', promoted: false, score: 0.5 },
  ]
  const p = predictGain({ kind: 'minimal-change', rounds, config: {} })
  assert.equal(p.basis, 'rounds')
  assert.ok(p.low <= p.point && p.point <= p.high)
  // Two wins in four rounds, win sizes 0.2 and 0.3 -> the point is not a whole win.
  assert.ok(p.point > 0 && p.point < 0.3, `expected a discounted gain, got ${p.point}`)
  assert.match(p.method, /win/i)
})

test('with nothing measured the card says it is a prior, and the interval is honest', () => {
  const rounds = [
    { n: 1, taskId: 't', status: 'no-gain', promoted: false, score: 0 },
    { n: 2, taskId: 't', status: 'no-gain', promoted: false, score: 0 },
    { n: 3, taskId: 't', status: 'no-gain', promoted: false, score: 0 },
  ]
  const p = predictGain({ kind: 'candidates+1', rounds, config: {} })
  assert.equal(p.basis, 'prior')
  assert.equal(p.samples, 0)
  assert.equal(p.low, 0)
  assert.ok(p.high >= p.point && p.high <= 1)
  assert.match(p.method, /prior/i)
})

test('a plateau is a high regression risk with named reasons', () => {
  const rounds = [
    { n: 1, taskId: 't', status: 'no-gain', promoted: false, score: 0 },
    { n: 2, taskId: 't', status: 'no-gain', promoted: false, score: 0 },
    { n: 3, taskId: 't', status: 'no-gain', promoted: false, score: 0 },
  ]
  const r = regressionRisk({ rounds, window: 3, kind: 'candidates+1', candidates: 2 })
  assert.equal(r.level, 'high')
  assert.equal(r.probability, 1)
  assert.ok(r.reasons.length >= 2)
  assert.ok(r.reasons.some((x) => /nothing/i.test(x)))
  assert.ok(r.reasons.some((x) => /cost/i.test(x)))
})

test('prediction is deterministic for the same record', () => {
  const rounds = [{ n: 1, taskId: 't', status: 'promoted', promoted: true, score: 0.3, attempts: [{ score: 0.3, verifierOk: true }, { score: 0.1, verifierOk: true }] }]
  assert.deepEqual(predictGain({ kind: 'candidates+1', rounds, config: {} }), predictGain({ kind: 'candidates+1', rounds, config: {} }))
})
