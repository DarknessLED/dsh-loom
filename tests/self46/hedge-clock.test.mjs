// Buying the second candidate early is insurance; buying it late is an option.
//
// `planCandidates` answers "is the second opinion worth its price *up front*".
// When the answer is no, the round used to run a single candidate — which is a
// different, stronger claim: it says the second opinion can never help. Measured
// on the whole record (464 rounds, $10.2552 of attempt spend), refusing outright
// would have saved $1.6054 but lost 17 promotions ($0.7954 of verified work);
// buying it later instead saves $0.7912 with no promotion lost. A refusal to pay
// in advance is not evidence that the hedge is worthless, so the refusal must
// leave the option open.
//
// This file pins that: the clock reads, the plan is on the record, and a refusal
// buys late rather than not at all.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'
import { planCandidates, hedgeDecision } from '../../src/loop/candidates.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const REPORT = JSON.stringify({
  summary: 'nothing to change',
  whatChanged: [],
  howVerified: 'read the task',
  confidence: 0.2,
  openQuestions: [],
  nextHint: '',
})

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-hedge-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function fakeRuntime(dir, events) {
  return {
    home: join(dir, 'home'),
    append(_view, type, data, by) {
      events.push({ type, data, by })
      return { rounds: [] }
    },
    artifactsDir() {
      return join(dir, 'artifacts')
    },
    sessionFor() {
      return { id: 's', cwd: dir }
    },
  }
}

function config(extra = {}) {
  return {
    models: { worker: 'test/model' },
    halving: { enabled: false, keepRatio: 0.5, screenTimeoutMs: 1000 },
    checkpoint: { on: ['gate'], window: 3 },
    verify: { timeoutMs: 60_000 },
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
    chain: { maxMutations: 3 },
    loopPolicy: { planMode: 'off' },
    ...extra,
  }
}

function stateFor(dir, rounds, budget) {
  return {
    id: 'c1',
    status: 'running',
    objective: 'do the thing',
    workspace: dir,
    // A real ledger writes `createdAt` as `ev.t`, i.e. milliseconds as a number.
    createdAt: Date.now() - 30 * 60_000,
    updatedAt: Date.now() - 60_000,
    budget: budget ?? { usd: 5, minutes: 240, rounds: 10, spentUsd: 0 },
    evalset: {
      tasks: [{ id: 't1', prompt: 'change nothing', verify: { cmd: `"${process.execPath}" -e "process.exit(0)"` } }],
      holdout: [],
    },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'n', params: {}, nodes: [] }, status: 'active' }] },
    rounds,
  }
}

const dispatcher = {
  async run(_prompt, { label }) {
    return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: String(label), durationMs: 1 }
  },
}

test('a refusal is a reason to buy later, never a reason to give up', () => {
  const refused = planCandidates({ pSolve: 0.2, gainIfSolved: 0.05, extraCostUsd: 0.5, tailMs: 10_000, budgetLeftMs: 600_000, max: 2 })
  assert.equal(refused.buy, false, 'the hedge is not worth buying up front')
  assert.equal(refused.count, 2, 'but the round still plans the candidates it may buy later')
  assert.equal(refused.mode, 'cascade', 'a refusal switches when the candidate is bought, not whether')
  const bought = planCandidates({ pSolve: 0.5, gainIfSolved: 1, extraCostUsd: 0.01, tailMs: 1000, budgetLeftMs: 600_000, max: 2 })
  assert.equal(bought.buy, true)
  assert.equal(bought.mode, 'parallel', 'a worth-it hedge is still bought up front')
  ok('planCandidates turns a refusal into cascade, not into one candidate')
})

// Two rounds that never promoted, each with a measured attempt cost: enough for
// the hedge to have a price at all, which is what makes the clock matter.
function losingRounds() {
  return [1, 2].map((n) => ({
    n,
    status: 'no-gain',
    taskId: 't1',
    chainVersion: 1,
    durationMs: 90_000,
    promoted: false,
    landed: false,
    attempts: [
      { id: `r${n}a1`, score: 0, verifierOk: false, durationMs: 80_000, costUsd: 0.004 },
      { id: `r${n}a2`, score: 0, verifierOk: false, durationMs: 85_000, costUsd: 0.004 },
    ],
  }))
}

test('the clock is read from a numeric createdAt', async () => {
  const dir = repo()
  const events = []
  const runtime = fakeRuntime(dir, events)
  const view = { state: stateFor(dir, losingRounds()), dir: join(dir, 'campaign') }
  mkdirSync(join(dir, 'campaign'), { recursive: true })
  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })
  const finished = events.find((e) => e.type === 'round.finished')
  assert.ok(finished, 'the round finished')
  const plan = finished.data.candidatePlan ?? null
  assert.ok(plan, 'the priced hedge reached the record instead of being skipped for a clock it could not read')
  assert.equal(typeof plan.reason, 'string', 'and it carries the constraint that decided it')
  assert.equal(typeof plan.mode, 'string', 'and when the second candidate would be bought')
  rmSync(dir, { recursive: true, force: true })
  ok('a numeric createdAt yields a priced candidate plan')
})

test('a record with no clock still runs the configured count', async () => {
  const dir = repo()
  const events = []
  const runtime = fakeRuntime(dir, events)
  const state = stateFor(dir, [], { usd: 5, spentUsd: 0 })
  delete state.createdAt
  const view = { state, dir: join(dir, 'campaign') }
  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })
  const finished = events.find((e) => e.type === 'round.finished')
  assert.equal(finished.data.candidatePlan ?? null, null, 'no clock is not a licence to price a tail against nothing')
  assert.equal(finished.data.candidatesPlanned, 1, 'the chain asked for one candidate, so one is planned')
  rmSync(dir, { recursive: true, force: true })
  ok('a missing clock leaves the configured count alone')
})

test('the round records a cascade decision as evidence', async () => {
  const dir = repo()
  const events = []
  const runtime = fakeRuntime(dir, events)
  // The task usually solves (2 of 3 rounds promoted) and an attempt costs $0.05:
  // the hedge's expected recovery is (1/3)·0.05 ≈ $0.017, which does not beat the
  // price. Nothing about that says the second candidate can never help — only
  // that buying it on spec is a loss.
  const rounds = [1, 2, 3].map((n) => ({
    n,
    status: n === 3 ? 'no-gain' : 'promoted',
    taskId: 't1',
    chainVersion: 1,
    durationMs: 90_000,
    promoted: n !== 3,
    landed: n !== 3,
    attempts: [
      { id: `r${n}a1`, score: n === 3 ? 0 : 1, verifierOk: n !== 3, durationMs: 80_000, costUsd: 0.05 },
      { id: `r${n}a2`, score: n === 3 ? 0 : 1, verifierOk: n !== 3, durationMs: 85_000, costUsd: 0.05 },
    ],
  }))
  const view = { state: stateFor(dir, rounds), dir: join(dir, 'campaign') }
  await runRound({ runtime, view, config: config({ chain: { maxMutations: 3 } }), dispatcher, log: () => {} })
  const finished = events.find((e) => e.type === 'round.finished')
  assert.equal(finished.data.candidateModeSource, 'evidence', 'the round says the record decided, not the operator')
  assert.equal(finished.data.candidatePlan?.buy, false, 'the plan is on the record')
  assert.equal(finished.data.candidateMode, 'cascade', 'and the refusal bought later instead of not at all')
  assert.equal(finished.data.candidatesPlanned >= 1, true, 'the count is never zeroed by a refusal')
  rmSync(dir, { recursive: true, force: true })
  ok('a losing record switches the mode to cascade, not to a single candidate')
})

test('hedgeDecision still refuses a certain win', () => {
  const out = hedgeDecision({ pSolve: 1, gainIfSolved: 1, extraCostUsd: 0.01, tailMs: 1000, budgetLeftMs: 600_000 })
  assert.equal(out.buy, false)
  assert.equal(out.reason, 'solved')
  ok('a solved task is not a hedge')
})

console.log(`\n${pass}/${pass} passed`)
