// Spec: a round must be billed from the tokens it actually spent, priced with
// the table that belongs to the model (relays price the same model differently),
// and cache reads must be counted and paid for.
//
// Today `usageOfSession` asks `tokenMeter`, which no host exposes, then reads
// the child's log after the child is gone (empty), then estimates characters/4.
// A real campaign recorded $0.000736 while the child's own journal said $0.0615.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PRICING,
  priceUsage,
  pricingFor,
  usageOfSession,
} from '../../src/runtime/cost.js'

const TABLE = {
  default: { inputPerMTok: 1, outputPerMTok: 2, cacheReadPerMTok: 0.5 },
  byModel: {
    'relay-a/deepseek-v4': { inputPerMTok: 9, outputPerMTok: 9, cacheReadPerMTok: 1 },
    'relay-b/deepseek-v4': { inputPerMTok: 0.1, outputPerMTok: 0.1, cacheReadPerMTok: 0.01 },
  },
}

test('pricingFor picks the table that belongs to the model that ran', () => {
  const a = pricingFor(TABLE, 'relay-a/deepseek-v4')
  assert.equal(a.table.inputPerMTok, 9)
  assert.equal(a.source, 'model:relay-a/deepseek-v4')

  const b = pricingFor(TABLE, 'relay-b/deepseek-v4')
  assert.equal(b.table.outputPerMTok, 0.1)

  const d = pricingFor(TABLE, 'relay-c/unknown')
  assert.equal(d.table.inputPerMTok, 1)
  assert.equal(d.source, 'default')
})

test('pricingFor keeps the old single-table and no-table contracts', () => {
  assert.equal(pricingFor({ inputPerMTok: 3 }, 'x').source, 'configured')
  assert.equal(pricingFor({ inputPerMTok: 3 }, 'x').table.inputPerMTok, 3)
  assert.equal(pricingFor(null, 'x').table, DEFAULT_PRICING)
  assert.equal(pricingFor(undefined, undefined).source, 'default')
})

test('cache reads are counted and priced, not free', () => {
  const usage = { inputTokens: 1000, outputTokens: 2000, cacheReadTokens: 5000, cacheWriteTokens: 0 }
  const table = { inputPerMTok: 1, outputPerMTok: 2, cacheReadPerMTok: 0.5 }
  // 1000/1e6*1 + 2000/1e6*2 + 5000/1e6*0.5
  assert.equal(priceUsage(usage, table), 0.0075)
})

test('usageOfSession prefers the cost meter over the absent token meter', () => {
  const ctx = {
    get: (name) =>
      name === 'costMeter'
        ? {
            getSessionCost: () => ({
              usage: { inputTokens: 1000, outputTokens: 2000, cacheReadTokens: 5000 },
            }),
          }
        : undefined,
  }
  const table = { inputPerMTok: 1, outputPerMTok: 2, cacheReadPerMTok: 0.5 }
  const out = usageOfSession(ctx, 'sess-1', table)
  assert.equal(out.usage.inputTokens, 1000)
  assert.equal(out.usage.cacheReadTokens, 5000)
  assert.equal(out.estimated, false)
  assert.equal(out.usd, 0.0075)
})

test('the cost meter wins over the token meter when both answer', () => {
  const ctx = {
    get: (name) => {
      if (name === 'tokenMeter') return { measure: () => ({ inputTokens: 1, outputTokens: 1 }) }
      if (name === 'costMeter') {
        return { getSessionCost: () => ({ usage: { inputTokens: 777, outputTokens: 0, cacheReadTokens: 0 } }) }
      }
      return undefined
    },
  }
  const out = usageOfSession(ctx, 'sess-2', { inputPerMTok: 1 })
  assert.equal(out.usage.inputTokens, 777)
})

test('a throwing or empty meter degrades instead of throwing', () => {
  const ctx = {
    get: (name) =>
      name === 'costMeter'
        ? {
            getSessionCost: () => {
              throw new Error('ledger locked')
            },
          }
        : undefined,
  }
  const out = usageOfSession(ctx, 'sess-3', null)
  assert.equal(out.usd, 0)
  assert.equal(out.estimated, false)
})
