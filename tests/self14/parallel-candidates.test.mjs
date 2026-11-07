// Candidates in a round are independent by construction: each attempt gets its own
// worktree, its own session and its own verifier run. Today runRound still walks
// them one at a time, so a two-candidate round costs two full model runs back to
// back. Dispatch them concurrently up to session.maxConcurrent and a round gets
// shorter without getting weaker: the gate still ranks every attempt and only the
// best one can land.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
let fail = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}
const bad = (name, err) => {
  fail += 1
  console.log(`not ok ${pass + fail} - ${name}: ${err?.message ?? err}`)
}
async function check(name, fn) {
  try {
    await fn()
    ok(name)
  } catch (err) {
    bad(name, err)
  }
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
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [], params: { candidates } } }] },
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
      try {
        await new Promise((r) => setTimeout(r, delayMs))
        const tag = String(opts?.cwd ?? '').replace(/[^a-z0-9]/gi, '') || 'x'
        writeFileSync(join(opts.cwd, `marker-${tag}.txt`), 'x\n')
        return { sessionId: `s-${tag}`, text: REPORT, stopReason: 'completed' }
      } finally {
        state.live -= 1
      }
    },
  }
}

const dirs = []
function scratch() {
  const dir = repo()
  dirs.push(dir)
  return dir
}

// 1. three candidates with room for three: they overlap and the round is shorter
// Timing is compared against a sequential run measured in this same process, not
// against a hard-coded budget: a round also pays for worktrees, verifiers and
// patch generation, and that fixed cost must not be mistaken for dispatch time.
async function timedRound(limit) {
  const dir = scratch()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, 3)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = countingDispatcher(250)
  const started = Date.now()
  await runRound({ runtime: rt, view, config: config(limit), dispatcher, log: () => {}, notify: () => {} })
  return { elapsed: Date.now() - started, dispatcher, rt }
}

await check('candidates dispatch concurrently up to session.maxConcurrent', async () => {
  const seq = await timedRound(1)
  const par = await timedRound(3)
  assert.equal(par.dispatcher.state.calls, 3, 'every candidate still runs')
  assert.equal(seq.dispatcher.state.peak, 1, 'the sequential baseline never overlaps')
  assert.ok(par.dispatcher.state.peak >= 2, `candidates should overlap, saw peak ${par.dispatcher.state.peak}`)
  assert.ok(par.dispatcher.state.peak <= 3, 'never more attempts than the limit allows')
  assert.ok(
    par.elapsed < seq.elapsed - 250,
    `a parallel round must beat the sequential baseline by roughly one dispatch (par ${par.elapsed}ms vs seq ${seq.elapsed}ms)`,
  )
  const attempts = par.rt.events.filter((e) => e.type === 'attempt.finished')
  assert.equal(attempts.length, 3, 'all three attempts are recorded')
  const gate = par.rt.events.find((e) => e.type === 'gate.evaluated')
  assert.ok(gate, 'the gate still evaluates the round')
})

// 2. an explicit limit of one keeps the old sequential behaviour
await check('session.maxConcurrent 1 keeps dispatch sequential', async () => {
  const dir = scratch()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, 3)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = countingDispatcher(30)
  await runRound({ runtime: rt, view, config: config(1), dispatcher, log: () => {}, notify: () => {} })
  assert.equal(dispatcher.state.calls, 3, 'all candidates still run one at a time')
  assert.equal(dispatcher.state.peak, 1, 'never two attempts in flight with a limit of one')
})

// 3. no limit configured: dispatch must not stall
await check('a missing maxConcurrent never blocks dispatch', async () => {
  const dir = scratch()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, 2)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = countingDispatcher(20)
  const cfg = config(0)
  delete cfg.session.maxConcurrent
  await runRound({ runtime: rt, view, config: cfg, dispatcher, log: () => {}, notify: () => {} })
  assert.equal(dispatcher.state.calls, 2, 'both candidates run')
  assert.ok(dispatcher.state.peak >= 1)
})

for (const dir of dirs) rmSync(dir, { recursive: true, force: true })

console.log(`\n${pass}/${pass + fail} passed`)
process.exitCode = fail === 0 ? 0 : 1
