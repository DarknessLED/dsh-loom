// Candidates in a round are independent by construction: each attempt gets its own
// worktree, its own session and its own verifier run. Today runRound still walks
// them one at a time, so a two-candidate round costs two full model runs back to
// back. dispatch them concurrently up to session.maxConcurrent and a round gets
// shorter without getting weaker: the gate still ranks every attempt and only the
// best one can land.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-par-'))
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
    dir,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
    status() {
      return {}
    },
  }
}

const REPORT = JSON.stringify({
  changed: ['keep.txt'],
  why: 'touched the marker file so the diff is real',
  evidence: ['exit 0'],
  openQuestions: [],
  confidence: 0.8,
  nextHint: '',
})

function viewFor(dir, candidates) {
  return {
    dir: join(dir, 'campaign'),
    state: {
      id: 'par',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates } }] },
    },
  }
}

function config(maxConcurrent) {
  return {
    session: { attemptTimeoutMs: 120_000, maxConcurrent },
    verify: { timeoutMs: 30_000 },
    loopPolicy: {},
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.01 },
    models: {},
  }
}

// A dispatcher that reports how many attempts were in flight at the same time.
function countingDispatcher(delayMs) {
  const state = { live: 0, peak: 0, calls: 0 }
  return {
    state,
    run: async (prompt, opts) => {
      state.calls += 1
      state.live += 1
      state.peak = Math.max(state.peak, state.live)
      await new Promise((r) => setTimeout(r, delayMs))
      // each attempt writes a distinct file inside its own worktree
      const tag = String(opts?.cwd ?? '').replace(/[^a-z0-9]/gi, '') || 'x'
      writeFileSync(join(opts.cwd, `marker-${tag}.txt`), 'x\n')
      state.live -= 1
      return { sessionId: `s-${tag}`, text: REPORT, stopReason: 'completed' }
    },
  }
}

// 1. three candidates, room for three: they overlap
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, 3)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = countingDispatcher(250)
  const started = Date.now()
  await runRound({ runtime: rt, view, config: config(3), dispatcher, log: () => {}, notify: () => {} })
  const elapsed = Date.now() - started
  assert.equal(dispatcher.state.calls, 3, 'every candidate still runs')
  assert.ok(dispatcher.state.peak >= 2, `candidates should overlap, saw peak ${dispatcher.state.peak}`)
  assert.ok(dispatcher.state.peak <= 3, 'never more attempts than the limit allows')
  assert.ok(elapsed < 3 * 250, `a parallel round should be shorter than sequential (${elapsed}ms)`)
  const attempts = rt.events.filter((e) => e.type === 'attempt.finished')
  assert.equal(attempts.length, 3, 'all three attempts are recorded')
  ok('candidates dispatch concurrently up to session.maxConcurrent')

  const par = repo()
  const rt2 = fakeRuntime(par)
  const view2 = viewFor(par, 3)
  mkdirSync(view2.dir, { recursive: true })
  const serial = countingDispatcher(40)
  await runRound({ runtime: rt2, view: view2, config: config(1), dispatcher: serial, log: () => {}, notify: () => {} })
  assert.equal(serial.state.peak, 1, 'maxConcurrent 1 still means one at a time')
  ok('session.maxConcurrent 1 keeps dispatch sequential')

  const missing = repo()
  const rt3 = fakeRuntime(missing)
  const view3 = viewFor(missing, 2)
  mkdirSync(view3.dir, { recursive: true })
  const unbounded = countingDispatcher(40)
  await runRound({ runtime: rt3, view: view3, config: { ...config(0), session: {} }, dispatcher: unbounded, log: () => {}, notify: () => {} })
  assert.ok(unbounded.state.peak >= 1, 'a missing limit still dispatches')
  ok('a missing maxConcurrent never blocks dispatch')

  rmSync(dir, { recursive: true, force: true })
  rmSync(par, { recursive: true, force: true })
  rmSync(missing, { recursive: true, force: true })
}

console.log(`\n${pass}/3 passed`)
process.exitCode = pass === 3 ? 0 : 1
