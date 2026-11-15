// A card that proposes a prior-based forecast must say what the priors have
// been worth so far. The calibration ledger already exists (decisions.json /
// chain.measurements); this pins that the card reads it and that a bad prior
// record becomes a risk reason instead of a silent number.

import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProposalCard, renderCard } from '../../src/chain/evidence-card.js'
import { mutateChain } from '../../src/chain/mutate.js'
import { chainSpec } from '../self22/fixture.mjs'

function card(measurements) {
  const active = { version: 1, spec: chainSpec({ candidates: 2 }) }
  const proposals = [
    { ...mutateChain(active.spec, { fromVersion: 2 }), status: 'fresh' },
  ]
  return buildProposalCard({
    active,
    proposals,
    rounds: [
      { n: 1, status: 'no-gain', score: 0, chainVersion: 1, costUsd: 0.01 },
      { n: 2, status: 'no-gain', score: 0, chainVersion: 1, costUsd: 0.01 },
      { n: 3, status: 'no-gain', score: 0, chainVersion: 1, costUsd: 0.01 },
    ],
    config: { checkpoint: { window: 3 } },
    measurements,
  })
}

test('a prior forecast carries the record of the priors before it', () => {
  const measurements = [
    { predicted: { point: 0.25, low: 0, high: 1 }, realized: 0, verdict: 'missed' },
    { predicted: { point: 0.25, low: 0, high: 1 }, realized: 0, verdict: 'missed' },
  ]
  const built = card(measurements)
  assert.deepEqual(
    { n: built.calibration.n, missed: built.calibration.missed, coverage: built.calibration.coverage },
    { n: 2, missed: 2, coverage: 1 },
    'realized 0 sits inside the stated 0..1 interval: coverage is honest even when the verdict missed',
  )
  const item = built.proposals[0]
  assert.equal(item.prediction.basis, 'prior')
  assert.ok(
    item.risk.reasons.some((r) => /prior forecast/i.test(r) && /2 of 2/.test(r)),
    'a prior with a 0/2 record must state it as risk',
  )
  const lines = renderCard(built)
  assert.ok(lines.some((l) => /past forecasts: 2 graded/.test(l)), lines.join('\n'))
  assert.ok(lines.some((l) => /2 missed/.test(l)), lines.join('\n'))
  assert.ok(lines.some((l) => /coverage 100\.0%/.test(l)), lines.join('\n'))
})

test('without a ledger the card does not invent one', () => {
  const built = card(undefined)
  assert.equal(built.calibration.n, 0)
  assert.ok(built.proposals[0].risk.reasons.every((r) => !/prior forecast/i.test(r)))
  assert.ok(renderCard(built).every((l) => !/past forecasts/.test(l)))
})
