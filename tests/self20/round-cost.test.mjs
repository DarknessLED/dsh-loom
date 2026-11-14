// Wave 20 / p2: a round can say where its money went.
//
// The ledger now knows the real tokens, but it answers "how much" and not "what
// for": 93% of the bill is cache reads, and nobody can tell which node bought
// them. The four numbers the research brief names are cache hit rate, tokens per
// node, cost per solved task, and cost per promoted change.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roundCost, cacheHitRate, costPerPromotedChange } from '../../src/report/round-cost.js'

const round = {
  n: 7,
  promoted: true,
  costUsd: 0.12,
  attempts: [
    {
      id: 'r7a1',
      node: 'attempts',
      usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 9000, cacheWriteTokens: 0 },
      costUsd: 0.1,
    },
    {
      id: 'r7a2',
      node: 'verify',
      usage: { inputTokens: 200, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0.02,
    },
  ],
}

test('cache hit rate counts cache reads against everything sent', () => {
  // 9000 reads out of (1000 + 9000 + 0 + 200 + 0) input-side tokens.
  const rate = cacheHitRate({
    inputTokens: 1200,
    outputTokens: 600,
    cacheReadTokens: 9000,
    cacheWriteTokens: 0,
  })
  assert.equal(Math.round(rate * 1000) / 1000, 0.882)
})

test('no tokens is not a 100% hit rate', () => {
  assert.equal(cacheHitRate({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }), 0)
})

test('a round breaks its cost down by node', () => {
  const out = roundCost(round)
  assert.equal(out.usd, 0.12)
  assert.equal(out.tokens, 1000 + 500 + 9000 + 200 + 100)
  assert.equal(out.byNode.attempts.usd, 0.1)
  assert.equal(out.byNode.verify.usd, 0.02)
  assert.ok(Math.abs(out.cacheHitRate - 9000 / (1200 + 9000)) < 1e-9)
})

test('cost per promoted change charges the rounds that did not promote', () => {
  const rounds = [
    { promoted: true, costUsd: 0.1 },
    { promoted: false, costUsd: 0.1 },
    { promoted: false, costUsd: 0.1 },
    { promoted: true, costUsd: 0.1 },
  ]
  assert.equal(costPerPromotedChange(rounds), 0.2)
})

test('nothing promoted is null, not a division by zero', () => {
  assert.equal(costPerPromotedChange([{ promoted: false, costUsd: 0.3 }]), null)
  assert.equal(costPerPromotedChange([]), null)
})
