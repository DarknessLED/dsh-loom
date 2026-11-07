// The budget guard is unreachable because every round prices at $0.00: with no
// `config.models.pricing` table, priceUsage() multiplies real token counts by
// zero, so `spent + estimate > cap` can never be true and the loop happily outruns
// a cap by five times (measured: $25.21 spent against a $5 cap in one day).
//
// Tokens are counted, so the missing piece is only a rate. A documented default
// table makes the cost leg report money by default; an explicit table still wins.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { priceUsage, DEFAULT_PRICING } from '../../src/runtime/cost.js'
import { runRound } from '../../src/runtime/round.js'
import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. No table configured: a million input tokens still cost something.
const bare = priceUsage({ inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0 })
assert.ok(bare > 0, `an unpriced table must fall back to a documented default (got ${bare})`)
assert.equal(typeof DEFAULT_PRICING, 'object', 'the default is exported so a report can name it')
assert.ok(DEFAULT_PRICING.inputPerMTok > 0)
ok('tokens cost money even when nobody configured a price')

// 2. An explicit table is authoritative.
const exact = priceUsage({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, { inputPerMTok: 10, outputPerMTok: 20 })
assert.equal(exact, 30)
ok('a configured price overrides the default exactly')

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-cost-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function fakeRuntime(dir) {
  const events = []
  return {
    home: join(dir, 'home'),
    events,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
  }
}

const dir = repo()
const rt = fakeRuntime(dir)
const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'cost',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 1 }, nodes: [] } }] },
  },
}
mkdirSync(view.dir, { recursive: true })
const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: { halving: false },
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {}, // no pricing on purpose: that is the bug being pinned
  checkpoint: { on: [] },
}
const dispatcher = {
  run: async () => ({
    sessionId: 's1',
    text: JSON.stringify({ changed: ['keep.txt'], why: 'x'.repeat(4000), evidence: [], openQuestions: [], confidence: 0.5, nextHint: '' }),
    stopReason: 'completed',
  }),
}

await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
const round = rt.events.find((e) => e.type === 'round.finished')?.data
assert.ok(round, 'the round finished')
assert.ok(round.tokens > 0, 'the round counts its tokens')
assert.ok(round.costUsd > 0, `a round with tokens has a price (got ${round.costUsd})`)
assert.ok(['default', 'configured'].includes(round.priceSource), 'the record says which table priced it')
assert.equal(round.priceSource, 'default', 'with no table it is the default one')
ok('a round with tokens reports non-zero cost')

const tri = campaignTriangle([round])
assert.ok(tri.usd > 0, `the triangle reports the spend (got ${tri.usd})`)
assert.equal(tri.measured, true)
ok('the triangle cost leg is alive')

// 3. With a real price on the books, the budget preflight can finally refuse a
//    round it cannot afford -- the guard was unreachable at $0.00.
view.state.rounds = [{ n: 1, taskId: 't1', status: 'promoted', promoted: true, score: 1, durationMs: 5000, tokens: 500, costUsd: 0.6, attempts: [] }]
view.state.budget = { rounds: 10, roundsUsed: 1, usd: 1, spentUsd: 0.6 }
let calls = 0
const countingDispatcher = {
  run: async () => {
    calls += 1
    return { sessionId: 's2', text: '{}', stopReason: 'completed' }
  },
}
await runRound({ runtime: rt, view, config, dispatcher: countingDispatcher, log: () => {}, notify: () => {} })
const second = rt.events.filter((e) => e.type === 'round.finished').pop()?.data
assert.equal(calls, 0, 'a round priced above the remaining budget is not dispatched')
assert.equal(second?.status, 'budget')
ok('a priced ledger makes the budget guard reachable')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
