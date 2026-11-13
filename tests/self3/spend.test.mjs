// Spec: the campaign must know what it spent.
//
// Today `budget.spentUsd` stays 0 for a live campaign: every attempt records
// its token usage, but nothing turns that into money, so the USD budget is
// decorative and the human has no idea whether a night cost $0.20 or $20.
//
// Required:
//   1. src/runtime/cost.js exports `campaignUsage(rounds)` returning
//      { usd, inputTokens, outputTokens } summed over every recorded attempt
//      usage, ignoring missing / non-finite numbers.
//   2. rsi_report prints a spend line that uses that computed number, even when
//      the stored budget.spentUsd is still 0.
import assert from 'node:assert/strict'
import { registerTools } from '../../src/tools/index.js'
import {
  campaignUsage,
  priceUsage,
  estimateUsage,
  fallbackSpend,
  resolvePricing,
  usageOfSession,
  sumUsage,
  hasTokens,
  DEFAULT_PRICING,
} from '../../src/runtime/cost.js'

let pass = 0
let fail = 0
function ok(cond, name, extra) {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  } else {
    fail += 1
    console.log(`not ok ${pass + fail} - ${name}`)
    if (extra !== undefined) console.log('   ', extra)
  }
}

// --- pure aggregation -----------------------------------------------------
const rounds = [
  {
    n: 1,
    taskId: 't1',
    attempts: [
      { id: 'r1a1', usage: { inputTokens: 1000, outputTokens: 500, costUsd: 0.01 } },
      { id: 'r1a2', usage: { inputTokens: 2000, outputTokens: 1000, costUsd: 0.02 } },
    ],
  },
  { n: 2, taskId: 't1', attempts: [{ id: 'r2a1', usage: { inputTokens: 500, outputTokens: 250, costUsd: 0.005 } }] },
  { n: 3, taskId: 't2', attempts: [{ id: 'r3a1', usage: null }, { id: 'r3a2' }] },
]

const usage = campaignUsage(rounds)
ok(usage && Math.abs(usage.usd - 0.035) < 1e-9, 'campaignUsage sums costUsd across rounds', JSON.stringify(usage))
ok(usage.inputTokens === 3500, 'campaignUsage sums input tokens', JSON.stringify(usage))
ok(usage.outputTokens === 1750, 'campaignUsage sums output tokens', JSON.stringify(usage))
ok(campaignUsage([]).usd === 0, 'campaignUsage of an empty campaign is 0')
ok(campaignUsage(undefined).usd === 0, 'campaignUsage tolerates a missing round list')

const noisy = campaignUsage([
  { n: 1, attempts: [{ usage: { inputTokens: Number.NaN, outputTokens: -5, costUsd: 'x' } }] },
])
ok(noisy.usd === 0 && noisy.inputTokens === 0, 'campaignUsage ignores non-finite usage', JSON.stringify(noisy))

// --- report surface -------------------------------------------------------
const state = {
  id: 'c1',
  status: 'running',
  objective: 'raise coverage',
  workspace: 'C:/w',
  rounds,
  budget: { usd: 5, rounds: 10, spentUsd: 0 },
  chain: { activeVersion: 1 },
  constraints: [],
  checkpoints: [],
  incumbent: null,
  lessons: [],
}
const view = { state, dir: '.', ledger: { all: () => [], append() {} } }

const tools = new Map()
const ctx = {
  effect(fn) {
    fn()
    return () => {}
  },
  tools: { register(def) { tools.set(def.name, def); return () => {} } },
  get: () => undefined,
}
registerTools(ctx, {
  runtime: { get: () => view, listCampaigns: () => ['c1'], status: () => state },
  config: {},
})

const report = await tools.get('rsi_report').execute({ id: 'c1' })
const text = typeof report === 'string' ? report : JSON.stringify(report)
ok(/spend/i.test(text), 'report has a spend line', text.slice(0, 400))
ok(/0\.035/.test(text), 'report shows the computed spend, not the stale 0', text.slice(0, 400))

// --- token accounting unit pins -------------------------------------------
// Every assertion below feeds a value through a public function and reads a
// number back, so a mutated branch changes the result instead of merely going
// unexercised. Nothing here inspects the module's source text.

// Price with no usage record at all: free, not a crash.
assert.equal(priceUsage(), 0, 'priceUsage with no usage record is zero')
assert.equal(priceUsage(undefined), 0, 'an absent usage record is zero')
assert.equal(priceUsage(null), 0, 'a null usage record is zero')

// A null table is "unconfigured", not a table to dereference.
const noTable = resolvePricing(null)
assert.equal(noTable.source, 'default', 'a null table falls back to the documented default')
assert.equal(noTable.table, DEFAULT_PRICING, 'the fallback table is the exported default')

// Non-finite rates are not prices; a table made only of them is unconfigured.
assert.equal(resolvePricing({ inputPerMTok: Infinity }).source, 'default', 'Infinity is not a configured rate')
assert.equal(resolvePricing({ inputPerMTok: Number.NaN }).source, 'default', 'NaN is not a configured rate')
assert.equal(resolvePricing('cheap').source, 'default', 'a non-object table is ignored')

// One finite rate configures the table; legs it omits keep their defaults.
assert.equal(
  priceUsage({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, { outputPerMTok: 20 }),
  20.28,
  'an output-only table still prices input at the default rate',
)
// Cache reads fall back to the input rate, and to the default when neither is set.
assert.equal(priceUsage({ cacheReadTokens: 1_000_000 }, { inputPerMTok: 2 }), 2, 'cache reads default to the input rate')
assert.equal(
  priceUsage({ cacheReadTokens: 1_000_000 }),
  DEFAULT_PRICING.cacheReadPerMTok,
  'cache reads have a documented default rate',
)

// estimateUsage counts real text only, on both roles, and ignores non-text parts.
const est = estimateUsage([
  { type: 'user/message', data: { message: { content: 'abcdefgh' } } },
  { type: 'assistant/message', data: { message: { content: 'abcdefghij' } } },
  {
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: 'abcdef' }, { type: 'image', source: {} }, null] } },
  },
])
assert.equal(est.inputTokens, 2, 'user text is input tokens at four characters each')
assert.equal(est.outputTokens, 4, 'assistant text is output tokens, non-text parts contribute nothing')
assert.deepEqual(
  estimateUsage([]),
  { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  'an empty transcript estimates zero',
)

// Estimated provenance: either marker sets it on the sum, neither clears it.
assert.equal(
  campaignUsage([{ attempts: [{ usage: { inputTokens: 1, outputTokens: 1, estimated: true } }] }]).estimated,
  true,
  'usage.estimated marks the campaign total',
)
assert.equal(
  campaignUsage([{ attempts: [{ usageEstimated: true, usage: { inputTokens: 1 } }] }]).estimated,
  true,
  'attempt.usageEstimated marks the campaign total',
)
assert.equal(
  campaignUsage([{ attempts: [{ usage: { inputTokens: 1 } }] }]).estimated,
  false,
  'a measured attempt is not an estimate',
)

// Older records keep costUsd on the attempt; the usage figure wins when both exist.
const legacyAttempt = campaignUsage([{ attempts: [{ costUsd: 0.25 }] }])
assert.equal(legacyAttempt.usd, 0.25, 'an attempt with costUsd and no usage still contributes dollars')
assert.equal(legacyAttempt.inputTokens, 0, 'an attempt with no usage contributes no tokens')
const bothFigures = campaignUsage([{ attempts: [{ costUsd: 0.9, usage: { costUsd: 0.1, inputTokens: 4 } }] }])
assert.equal(bothFigures.usd, 0.1, 'the priced usage figure wins over a stale attempt costUsd')
assert.equal(bothFigures.inputTokens, 4, 'tokens still come from the usage record')

// fallbackSpend prices a transcript on both legs when no usage block exists.
const fb = fallbackSpend('x'.repeat(400), 'y'.repeat(800))
assert.equal(fb.inputTokens, 100, 'the brief is input at four characters each')
assert.equal(fb.outputTokens, 200, 'the answer is output at four characters each')
assert.ok(fb.usd > 0, `a fallback with tokens is not free (got ${fb.usd})`)
assert.equal(fb.estimated, true, 'a fallback is labelled an estimate')
const fbEmpty = fallbackSpend('', '')
assert.equal(fbEmpty.usd, 0, 'an empty transcript is free')
assert.equal(fbEmpty.estimated, false, 'an empty transcript is not labelled an estimate')

// usageOfSession prefers the host meter's measurement over the log.
const meterCtx = (raw) => ({
  get(name) {
    if (name === 'sessions') return { get: () => ({ snapshotEvents: () => [] }) }
    if (name === 'tokenMeter') return { measure: () => raw }
    return undefined
  },
})
const measured = usageOfSession(meterCtx({ usage: { inputTokens: 1000, outputTokens: 500 } }), 's1')
assert.equal(measured.inputTokens, 1000, 'the meter input figure reaches the result')
assert.equal(measured.outputTokens, 500, 'the meter output figure reaches the result')
assert.equal(measured.estimated, false, 'a real measurement is not an estimate')
assert.ok(measured.usd > 0, `a measured session has a price (got ${measured.usd})`)
assert.deepEqual(
  measured.usage,
  { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 },
  'the usage record mirrors the measurement',
)

// A meter that throws degrades to no measurement instead of taking the round down.
const brokenMeter = usageOfSession(
  { get: (n) => (n === 'tokenMeter' ? { measure: () => { throw new Error('boom') } } : undefined) },
  's2',
)
assert.equal(brokenMeter.inputTokens, 0, 'a throwing meter degrades to no measurement')

// sumUsage sums assistant messages that carry a usage block, and nothing else.
const su = sumUsage([
  { type: 'user/message', data: { usage: { inputTokens: 99 } } },
  { type: 'assistant/message', data: { usage: { inputTokens: 5, outputTokens: 7, cacheReadTokens: 2, cacheWriteTokens: 3 } } },
  { type: 'assistant/message', data: {} },
])
assert.deepEqual(
  su,
  { inputTokens: 5, outputTokens: 7, cacheReadTokens: 2, cacheWriteTokens: 3 },
  'sumUsage sums assistant usage only',
)

assert.equal(hasTokens({ inputTokens: 0, outputTokens: 0 }), false, 'an all-zero record has no tokens')
assert.equal(hasTokens({ inputTokens: 0, outputTokens: 1 }), true, 'any non-zero field is a measurement')
assert.equal(hasTokens(undefined), false, 'a missing record has no tokens')

// A usage block already in the log is a measurement, not an estimate -- even
// when the same messages also carry text the estimator could have counted.
const loggedCtx = (events) => ({
  get: (name) => (name === 'sessions' ? { get: () => ({ snapshotEvents: () => events }) } : undefined),
})
const logged = usageOfSession(
  loggedCtx([
    {
      type: 'assistant/message',
      data: { usage: { inputTokens: 40, outputTokens: 8 }, message: { content: 'abcdefghijklmnop' } },
    },
  ]),
  's3',
)
assert.equal(logged.inputTokens, 40, 'a logged usage block is a measurement')
assert.equal(logged.outputTokens, 8, 'the logged output count wins over the transcript estimate')
assert.equal(logged.estimated, false, 'a logged usage block is not an estimate')

// With no measurement and no usage block, the transcript still prices the work.
const transcriptOnly = usageOfSession(
  loggedCtx([{ type: 'user/message', data: { message: { content: 'abcdefgh' } } }]),
  's4',
)
assert.equal(transcriptOnly.inputTokens, 2, 'a transcript-only session still counts tokens')
assert.equal(transcriptOnly.estimated, true, 'a transcript-only session is labelled an estimate')
assert.ok(transcriptOnly.usd > 0, 'an estimated session is priced too')

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
