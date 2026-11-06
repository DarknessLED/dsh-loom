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
import { registerTools } from '../../src/tools/index.js'
import { campaignUsage } from '../../src/runtime/cost.js'

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

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
