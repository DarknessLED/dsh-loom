// Seen live (loom-acc2, rounds 5 and 6): two candidates ran past the ten minute
// deadline, were stopped, and were recorded as `failureKind:'timeout'` with score
// 0. Their patches were still on disk — and both of them satisfy the task's spec
// (verified by hand: `git apply r5a1.patch` then the spec passes 3/3). The round
// therefore spent 1,203 s of wall clock and threw away two correct answers.
//
// The existing rule ("a late answer is a timeout, not a win") is about an attempt
// that *claims* the round after its budget: it kept running past the deadline and
// reported success as if nothing happened. That rule stays. But there is a second,
// different case this pins:
//
//   The dispatcher honoured the deadline and stopped the child. At that moment the
//   worktree already contained work that verifies. Nobody is claiming anything —
//   the round inspects the tree itself, at the deadline. Refusing that evidence
//   does not enforce the budget (the budget was already spent); it only guarantees
//   the round buys nothing with it.
//
// So a timed-out attempt whose tree verifies is *salvaged*: promoted, labelled,
// and counted separately so the efficiency leg can say "this win cost a timeout".
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound } from '../../src/runtime/round.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true })

function repo(prefix) {
  const root = mkdtempSync(join(tmpdir(), `loom-${prefix}-`))
  const dir = join(root, 'repo')
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'dsh-loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return { root, dir }
}

function fakeRuntime(dir) {
  const events = []
  return {
    events,
    home: dir,
    append(_view, type, data) {
      events.push({ type, data })
      return data
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

const REPORT = JSON.stringify({ changed: ['solved.txt'], why: 'x', evidence: 'y', openQuestions: [], confidence: 0.5, nextHint: '' })

function stateFor(workspace) {
  return {
    id: 'salvage',
    status: 'running',
    workspace,
    rounds: [],
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: {
      tasks: [{ id: 't1', verify: { cmd: 'node -e "process.exit(require(\'fs\').existsSync(\'solved.txt\')?0:1)"' } }],
      holdout: [],
    },
    chain: {
      activeVersion: 1,
      versions: [
        {
          version: 1,
          spec: {
            name: 'quick',
            version: 1,
            params: { candidates: 1, maxSteps: 10 },
            nodes: [
              { id: 'work', type: 'agent', name: 'worker', prompt: 'do it' },
              { id: 'check', type: 'verifier', name: 'check', cmd: `"${process.execPath}" -e "process.exit(0)"` },
            ],
          },
        },
      ],
    },
  }
}

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 200, maxConcurrent: 1, stallMs: 300_000 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
    ...over,
  }
}

// Writes the answer, then keeps working until the round stops it. The dispatcher
// honours its deadline: it reports `timedOut: true`, which is what the round sees
// in the live case too.
function stopsAfterWriting() {
  return {
    async run(_prompt, opts) {
      writeFileSync(join(opts.cwd, 'solved.txt'), 'solved\n')
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return { stopReason: 'timedOut', failureKind: 'timeout', text: '', structured: null, timedOut: true, error: 'attempt exceeded 200ms', sessionId: 'stopped', durationMs: 2000 }
    },
  }
}

// Writes nothing useful, then runs out of time.
function stopsWithNothing() {
  return {
    async run(_prompt, _opts) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return { stopReason: 'timedOut', failureKind: 'timeout', text: '', structured: null, timedOut: true, error: 'attempt exceeded 200ms', sessionId: 'stopped', durationMs: 2000 }
    },
  }
}

// Ignores the deadline entirely and reports a completed turn as if nothing
// happened: the case `tests/balance/late-success.test.mjs` already owns.
function claimsLate() {
  return {
    async run(_prompt, opts) {
      await new Promise((resolve) => setTimeout(resolve, 700))
      writeFileSync(join(opts.cwd, 'solved.txt'), 'solved\n')
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 'slow', durationMs: 700 }
    },
  }
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const first = (runtime, type) => runtime.events.filter((e) => e.type === type).map((e) => e.data)[0]

// 1. A stopped attempt whose tree verifies is promoted, and says how it won.
{
  const { root, dir } = repo('salvage-a')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config(), dispatcher: stopsAfterWriting(), log: () => {} })

  const attempt = first(runtime, 'attempt.finished')
  assert.equal(attempt.timedOut, true, 'the attempt did run out of time')
  assert.equal(attempt.salvaged, true, 'and it admits the work was salvaged from a timeout')
  assert.equal(attempt.verifierOk, true, 'the tree it left behind verifies')
  const gate = first(runtime, 'gate.evaluated')
  assert.equal(gate.checks.salvaged, true, 'the gate records that this promotion came from a timeout')
  assert.equal(gate.promoted, true, 'a verifying tree is not thrown away because the clock beat it')
  const round = first(runtime, 'round.finished')
  assert.equal(round.promoted, true)
  assert.equal(round.salvagedCandidates, 1, 'the round counts how many of its wins were salvaged')
  assert.ok(runtime.events.some((e) => e.type === 'artifact.promoted'), 'and the artifact is real')
  ok('a timed-out attempt with a verifying tree is salvaged, not discarded')
  rmSync(root, { recursive: true, force: true })
}

// 2. A timeout with nothing to show is still a plain failure: salvage is evidence,
//    not a consolation prize.
{
  const { root, dir } = repo('salvage-b')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config(), dispatcher: stopsWithNothing(), log: () => {} })

  const attempt = first(runtime, 'attempt.finished')
  assert.equal(attempt.timedOut, true)
  assert.notEqual(attempt.salvaged, true, 'nothing verified, so nothing was salvaged')
  const round = first(runtime, 'round.finished')
  assert.equal(round.promoted, false)
  assert.equal(round.salvagedCandidates, 0)
  ok('a timeout with nothing to show is still a failure')
  rmSync(root, { recursive: true, force: true })
}

// 3. The rule this must not break: an attempt that ignores its deadline and then
//    reports success is not salvaged either - it is a timeout that lied about it.
//    (nyc: `tests/balance/late-success.test.mjs` owns the full contract.)
{
  const { root, dir } = repo('salvage-c')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config({ session: { attemptTimeoutMs: 200, maxConcurrent: 1, stallMs: 300_000 } }), dispatcher: claimsLate(), log: () => {} })

  const attempt = first(runtime, 'attempt.finished')
  assert.equal(attempt.timedOut, true, 'the clock still wins over a late claim')
  assert.notEqual(attempt.salvaged, true, 'but a late claim is not salvage - nobody stopped it')
  const round = first(runtime, 'round.finished')
  assert.equal(round.promoted, false, 'and it still promotes nothing')
  ok('a late claim is still a timeout, never a salvage')
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
