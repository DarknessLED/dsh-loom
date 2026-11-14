// Wave 23 / p6: a budget that could not buy its own rounds.
//
// Every campaign was created with `$5`, chosen when the ledger claimed a round
// cost $0.0007. A real round is $0.05-$0.19 (measured: 0.0508 / 0.0597 / 0.0676),
// so $5 against `rounds: 12` is either generous or absurd depending on the model
// -- and nothing ever compared the two. A cap that cannot fund the round budget
// is a campaign that runs out mid-thought.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fundingFor } from '../../src/loop/funding.js'
import { DEFAULT_CONFIG } from '../../src/core/config.js'

test('a cap that covers every round at the measured price is funded', () => {
  const out = fundingFor({ rounds: 12, usdPerRound: 0.12, capUsd: 5 })
  assert.equal(out.funded, true)
  assert.equal(out.affordableRounds, 41)
  assert.equal(out.shortfallUsd, 0)
})

test('a cap that covers half the rounds says so, with the number', () => {
  const out = fundingFor({ rounds: 12, usdPerRound: 0.5, capUsd: 3 })
  assert.equal(out.funded, false)
  assert.equal(out.affordableRounds, 6)
  assert.equal(Math.round(out.shortfallUsd * 100) / 100, 3)
})

test('the price of a round wins over a guess when both are given', () => {
  const out = fundingFor({ rounds: 4, usdPerRound: 0.1, measured: 0.25, capUsd: 2 })
  assert.equal(out.usdPerRound, 0.25)
  assert.equal(out.affordableRounds, 8)
})

test('nothing measured and nothing given is not a silent zero', () => {
  const out = fundingFor({ rounds: 4, capUsd: 2 })
  assert.equal(out.funded, null, 'an unmeasured price cannot answer the question')
  assert.equal(out.usdPerRound, null)
})

test('the install default names a price per round instead of a bare cap', () => {
  assert.equal(typeof DEFAULT_CONFIG.budget.usdPerRound, 'number')
  assert.ok(DEFAULT_CONFIG.budget.usdPerRound > 0)
})
