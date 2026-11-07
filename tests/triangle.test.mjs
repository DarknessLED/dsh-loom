// The efficiency / quality / cost triangle is only optimisable when it is
// measured. These assertions pin the measurement: every round records its wall
// time, how much of that the candidates used, how much the verifiers used, and
// how many tokens it burned — and the reducer carries those numbers forward so a
// reader never has to re-derive them from a ledger that lacks them.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runRound, roundStats, tokensOf } from '../src/runtime/round.js'
import { reduce } from '../src/core/reduce.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const nodeBin = process.execPath

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-tri-'))
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
    append(_view, type, data, _who) {
      events.push({ type, data, at: Date.now() })
    },
  }
}

// 1. token accounting: a real usage block wins, a transcript is estimated
{
  const measured = tokensOf({ usage: { inputTokens: 120, outputTokens: 30 } }, 'brief', 'text')
  assert.equal(measured, 150, 'a measured usage block is used as-is')
  const estimate = tokensOf({ usage: { inputTokens: 0, outputTokens: 0 } }, 'x'.repeat(40), 'y'.repeat(40))
  assert.equal(estimate, 20, 'four characters per token when nothing was measured')
  const none = tokensOf(null, '', '')
  assert.equal(none, 0, 'an empty attempt costs nothing')
  ok('tokensOf prefers measurement and falls back to characters / 4')
}

// 2. roundStats sums the attempts it was given and never reports negatives
{
  const stats = roundStats(
    [
      { durationMs: 1000, tokens: 500, costUsd: 0.01 },
      { durationMs: 2000, tokens: 250, costUsd: 0.02 },
    ],
    Date.now() - 4000,
    2,
    1500,
  )
  assert.equal(stats.attemptCount, 2)
  assert.equal(stats.attemptMs, 3000)
  assert.equal(stats.tokens, 750)
  assert.equal(stats.costUsd, 0.03)
  assert.equal(stats.verifierRuns, 2)
  assert.equal(stats.verifierMs, 1500)
  assert.ok(stats.durationMs >= 4000, 'wall time covers the whole round')
  const empty = roundStats([], Date.now(), 0, 0)
  assert.equal(empty.attemptCount, 0)
  assert.equal(empty.attemptMs, 0)
  assert.equal(empty.tokens, 0)
  ok('roundStats aggregates time, tokens and cost without inventing values')
}

// 3. a real round records the triangle on its finish event (and on the fold)
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'tri',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 2 }, nodes: [] } }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  const config = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: { halving: false },
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
  const dispatcher = {
    run: async () => ({ sessionId: 's1', text: '{"changed":[],"why":"nothing to do","evidence":["verified"],"openQuestions":[],"confidence":0.9,"nextHint":""}', stopReason: 'completed' }),
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })

  const finished = rt.events.find((e) => e.type === 'round.finished')
  assert.ok(finished, 'the round finished')
  for (const key of ['durationMs', 'attemptCount', 'attemptMs', 'verifierRuns', 'verifierMs', 'tokens', 'costUsd']) {
    assert.equal(typeof finished.data[key], 'number', `round.finished carries ${key}`)
  }
  assert.equal(finished.data.attemptCount, 2, 'both candidates are counted')
  assert.ok(finished.data.durationMs > 0, 'wall time is a real measurement')
  assert.ok(finished.data.attemptMs > 0, 'candidate time is a real measurement')
  assert.equal(finished.data.verifierRuns, 2, 'each candidate ran the verifier once')
  assert.ok(finished.data.tokens > 0, 'a round that briefed two candidates burned tokens')

  const verifierRuns = rt.events.filter((e) => e.type === 'verifier.finished')
  assert.equal(verifierRuns.length, 2, 'one verifier.finished per candidate')
  assert.equal(verifierRuns[0].data.ok, true)
  assert.ok(verifierRuns[0].data.durationMs >= 0, 'the verifier reports its own duration')
  assert.equal(verifierRuns[0].data.round, 1)

  const state = reduce(rt.events.map((e, i) => ({ seq: i + 1, type: e.type, data: e.data, at: e.at })), 'tri')
  const round = state.rounds.find((r) => r.n === 1)
  assert.equal(round.durationMs, finished.data.durationMs, 'the fold keeps the measured wall time')
  assert.equal(round.verifierRuns, 2, 'the fold keeps the verifier count')
  assert.equal(round.tokens, finished.data.tokens, 'the fold keeps the token count')
  assert.equal(round.status, 'promoted')
  ok('a round records wall time, candidate time, verifier time and tokens')
  rmSync(dir, { recursive: true, force: true })
}

// 4. the metrics script reads those fields instead of guessing
{
  const home = mkdtempSync(join(tmpdir(), 'loom-metrics-'))
  const dir = join(home, 'campaigns', 'c1')
  mkdirSync(dir, { recursive: true })
  const lines = [
    { seq: 1, type: 'round.started', data: { n: 1, taskId: 't1' }, at: 1000 },
    {
      seq: 2,
      type: 'round.finished',
      data: { n: 1, status: 'promoted', promoted: true, score: 1, durationMs: 4000, attemptCount: 2, attemptMs: 7000, verifierRuns: 2, verifierMs: 1000, tokens: 500, costUsd: 0.01 },
      at: 5000,
    },
  ]
  writeFileSync(join(dir, 'events.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
  const out = execFileSync(nodeBin, [join(repoRoot, 'scripts', 'loom-metrics.mjs'), '--home', home, '--json'], { encoding: 'utf8' })
  const report = JSON.parse(out)
  assert.equal(report.headline.rounds, 1)
  assert.equal(report.headline.secondsPerRound, 4, 'seconds per round come from the recorded wall time')
  assert.equal(report.headline.parallelFactor, 1.75, 'parallel factor is candidate seconds / wall seconds')
  assert.equal(report.headline.verifierShare, 0.25, 'the verifier share of wall time is reported')
  assert.equal(report.headline.tokens, 500)
  assert.equal(report.headline.usd, 0.01)
  assert.equal(report.headline.promotionRate, 1)
  ok('loom-metrics reads the measured triangle instead of printing dashes')
  rmSync(home, { recursive: true, force: true })
}

// 5. the script itself is a thin reader: no hard-coded campaign names
{
  const src = readFileSync(join(repoRoot, 'scripts', 'loom-metrics.mjs'), 'utf8')
  assert.match(src, /round\.finished/)
  assert.match(src, /verifier\.finished/)
  assert.doesNotMatch(src, /loom-self\d/)
  ok('loom-metrics stays campaign-agnostic')
}

// 6. the shared aggregation keeps "not measured" out of the numbers
{
  const { campaignTriangle } = await import('../src/runtime/triangle.js')
  const blind = campaignTriangle([
    { n: 1, status: 'promoted', promoted: true },
    { n: 2, status: 'no-gain', promoted: false },
  ])
  assert.equal(blind.measured, false, 'a ledger with no measurements is not "free"')
  assert.equal(blind.secondsPerRound, null)
  assert.equal(blind.tokensPerRound, null)
  assert.equal(blind.promotionRate, 0.5)
  assert.equal(blind.noGainRate, 0.5)

  const seen = campaignTriangle([
    { n: 1, status: 'promoted', promoted: true, durationMs: 4000, attemptMs: 8000, verifierMs: 1000, tokens: 500, costUsd: 0.01, attemptCount: 2 },
    { n: 2, status: 'no-gain', promoted: false, durationMs: 2000, attemptMs: 2000, verifierMs: 500, attemptCount: 1 },
  ])
  assert.equal(seen.rounds, 2)
  assert.equal(seen.secondsPerRound, 3)
  assert.equal(seen.parallelFactor, 10 / 6, 'candidate seconds over wall seconds')
  assert.equal(seen.verifierShare, 1500 / 6000)
  assert.equal(seen.promotionRate, 0.5)
  assert.equal(seen.noGainRate, 0.5)
  assert.equal(seen.attemptsPerRound, 1.5)
  assert.equal(seen.tokens, 500)
  assert.equal(seen.usd, 0.01)
  assert.equal(seen.tokensPerRound, 250)
  assert.equal(seen.usdPerPromotion, 0.01)
  assert.equal(seen.measured, true)
  ok('campaignTriangle aggregates the triangle and leaves unmeasured legs null')
}

console.log(`\n${pass}/${pass} passed`)
