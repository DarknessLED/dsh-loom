// A round must survive the plugin being re-applied.
//
// Seen live (loom-ui6 round 1): the host applied the bundle again - apply.log
// shows a new instance id - which disposed the runtime while both candidates were
// in flight. Both attempts came back `{failureKind:'crash', error:'dispatcher
// disposed'}` after ~0.7s, the round closed as `no-gain` with score 0, and the
// campaign had spent a round of budget to learn nothing true about the patch.
//
// "The loop keeps running while the main agent is idle" is the whole promise, so a
// re-apply is a normal event, not an exception: an attempt that never ran must not
// be scored as if it had.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound, bestPriorScore } from '../../src/runtime/round.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

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

function fakeRuntime(campaignDir) {
  const events = []
  return {
    events,
    home: campaignDir,
    append(_view, type, data) {
      events.push({ type, data })
      return data
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2, stallMs: 300_000 },
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

function stateFor(workspace) {
  return {
    id: 'life',
    status: 'running',
    workspace,
    rounds: [],
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', verify: { cmd: `"${process.execPath}" -e "process.exit(1)"` } }], holdout: [] },
    chain: {
      activeVersion: 1,
      versions: [
        {
          version: 1,
          spec: {
            name: 'quick',
            version: 1,
            params: { candidates: 2, maxSteps: 10 },
            nodes: [
              { id: 'work', type: 'agent', name: 'worker', prompt: 'do it' },
              { id: 'check', type: 'verifier', name: 'check', cmd: `"${process.execPath}" -e "process.exit(1)"` },
            ],
          },
        },
      ],
    },
  }
}

const disposed = {
  stopReason: 'error',
  failureKind: 'crash',
  error: 'dispatcher disposed',
  text: '',
  timedOut: false,
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. Every attempt was lost to the dispose: the round is interrupted, not scored.
{
  const { root, dir } = repo('dispose')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: { run: async () => ({ ...disposed }) },
    log: () => {},
  })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)
  assert.equal(finished.length, 1)
  assert.equal(finished[0].status, 'interrupted', 'a round nobody ran is interrupted, never "no-gain"')
  assert.equal(finished[0].retryable, true, 'the caller must know it is worth trying again')
  assert.notEqual(finished[0].score, 0, 'it must not be scored 0: 0 is a measurement of a patch that ran')
  assert.equal(finished[0].promoted, false)
  ok('a round whose attempts never ran is interrupted, not scored')

  // 2. And it must not become evidence against the task.
  const rounds = [{ n: 1, status: 'interrupted', score: finished[0].score, attempts: [] }]
  assert.equal(bestPriorScore(rounds, 't1', 2), null, 'an interrupted round is not a prior score')
  ok('an interrupted round is not evidence against the task')

  rmSync(root, { recursive: true, force: true })
}

// 3. A real crash is still a real failure: don't let this mask broken patches.
{
  const { root, dir } = repo('crash')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: {
      run: async () => ({ stopReason: 'error', failureKind: 'died', error: 'child process exited with code 3', text: '', timedOut: false }),
    },
    log: () => {},
  })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)
  assert.equal(finished[0].status, 'no-gain', 'a child that really died is a real no-gain round')
  assert.equal(finished[0].retryable, undefined)
  ok('a genuine crash still closes as no-gain')

  rmSync(root, { recursive: true, force: true })
  assert.equal(existsSync(dir), false)
}

console.log(`\n${pass}/${pass} passed`)
