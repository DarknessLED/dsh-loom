// An attempt that is interrupted leaves a hole in the account: we know when it
// started and (sometimes) how it ended, but not what it was owed. `durationMs`,
// `timedOut` and `deadlineAt` were all invented after the fact, and when the host
// died mid-attempt the log could not say whether the round had been cut short or
// had simply crashed.
//
// So the deadline goes on the record before the work starts: one `attempt.deadline`
// per attempt, carrying the minute it was supposed to end by. A restarted host can
// then say "this attempt was owed until T" instead of guessing.
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

const REPORT = JSON.stringify({ changed: ['keep.txt'], why: 'x', evidence: 'y', openQuestions: [], confidence: 0.5, nextHint: '' })

function stateFor(workspace, rounds = []) {
  return {
    id: 'dl',
    status: 'running',
    workspace,
    rounds,
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', verify: { cmd: 'true' } }], holdout: [] },
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
              { id: 'check', type: 'verifier', name: 'check', cmd: 'true' },
            ],
          },
        },
      ],
    },
  }
}

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1, stallMs: 300_000 },
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

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// The deadline is written when the attempt starts, not reconstructed afterwards.
{
  const { root, dir } = repo('dl-one')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  let startedAt = 0
  const dispatcher = {
    async run(_prompt, opts) {
      startedAt = Date.now()
      assert.equal(typeof opts.cwd, 'string', 'the dispatcher is given a worktree')
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 's1', durationMs: 1 }
    },
  }

  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })

  const deadlines = runtime.events.filter((e) => e.type === 'attempt.deadline').map((e) => e.data)
  assert.equal(deadlines.length, 1, 'one attempt, one deadline on the record')
  const [deadline] = deadlines
  assert.equal(deadline.round, 1)
  assert.equal(typeof deadline.attemptId, 'string')
  assert.equal(deadline.timeoutMs, 60_000, 'the deadline is the budget the round was configured with')
  assert.equal(typeof deadline.deadlineAt, 'number')
  assert.ok(deadline.deadlineAt >= startedAt - 2000 && deadline.deadlineAt <= startedAt + 60_000 + 5000, 'the deadline is roughly timeoutMs after the start')
  ok('an attempt puts the minute it is owed on the record before it runs')

  const finished = runtime.events.filter((e) => e.type === 'attempt.finished').map((e) => e.data)
  assert.equal(finished.length, 1)
  assert.equal(finished[0].deadlineAt, deadline.deadlineAt, 'the attempt cites the same deadline it was given')
  assert.equal(finished[0].timeoutMs, 60_000)
  ok('when the attempt ends it still cites the deadline it was given')

  rmSync(root, { recursive: true, force: true })
}

// A tighter budget is honoured per round, and a late answer is still recorded
// against the deadline it missed.
{
  const { root, dir } = repo('dl-two')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  const dispatcher = {
    async run() {
      return { stopReason: 'timedOut', failureKind: 'timeout', text: '', structured: null, timedOut: true, error: 'deadline passed', sessionId: 's2', durationMs: 600 }
    },
  }

  await runRound({ runtime, view, config: config({ session: { attemptTimeoutMs: 900, maxConcurrent: 1, stallMs: 300_000 } }), dispatcher, log: () => {} })

  const deadlines = runtime.events.filter((e) => e.type === 'attempt.deadline').map((e) => e.data)
  assert.equal(deadlines.length, 1)
  assert.equal(deadlines[0].timeoutMs, 900, 'the round uses the budget it was given, not a global')
  const finished = runtime.events.filter((e) => e.type === 'attempt.finished').map((e) => e.data)[0]
  assert.equal(finished.deadlineAt, deadlines[0].deadlineAt)
  assert.equal(finished.timedOut, true)
  ok('a round with a 900ms budget records a 900ms deadline')

  const round = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(round.promoted, false, 'a timed-out attempt promotes nothing')
  ok('a missed deadline still closes the round honestly')

  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
