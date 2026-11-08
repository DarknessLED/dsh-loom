// The planning step is the most expensive model call in a round and nothing has
// yet shown that it pays for itself.
//
// Measured (loom-dag1, loom-bal1, loom-life2): planMs is 17-44% of the round's
// wall clock, two rounds promoted *after* the planner timed out at 240s, and one
// round promoted with a plan that named files the candidate then ignored. Keeping
// a 3-5 minute optional step mandatory is not a trade-off anyone chose; it is a
// default nobody measured.
//
// So the loop must be able to turn it off per campaign, per policy, and it must
// record which mode it ran in - otherwise the A/B is unreadable.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound, planModeFor } from '../../src/runtime/round.js'

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

const REPORT = JSON.stringify({
  changed: ['keep.txt'],
  why: 'the spec asks for it',
  evidence: 'node tests/x',
  openQuestions: [],
  confidence: 0.6,
  nextHint: '',
})

function stateFor(workspace, rounds = []) {
  return {
    id: 'plan',
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
              { id: 'plan', type: 'agent', name: 'planner', prompt: 'plan the work' },
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

const labels = []
const dispatcher = {
  async run(_prompt, { label }) {
    labels.push(label)
    return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 's', durationMs: 1 }
  },
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. planMode 'off': no planner is dispatched, and the round says so.
{
  labels.length = 0
  const { root, dir } = repo('plan-off')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config({ loopPolicy: { halving: false, candidateMode: 'parallel', planMode: 'off' } }), dispatcher, log: () => {} })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.planMode, 'off', 'the round records the mode it ran in')
  assert.equal(finished.planMs, 0, 'no planner means no plan time')
  assert.equal(labels.some((l) => String(l).includes('plan')), false, 'the planner was never dispatched')
  assert.equal(labels.filter((l) => String(l).includes('work')).length, 1, 'the candidate still ran')
  ok('planMode off skips the planner and still runs the round')
  rmSync(root, { recursive: true, force: true })
}

// 2. default is 'full': the planner runs, and the round records that too.
{
  labels.length = 0
  const { root, dir } = repo('plan-full')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.planMode, 'full')
  assert.equal(labels.some((l) => String(l).includes('plan')), true, 'the planner ran')
  ok('the default still plans, and says so')
  rmSync(root, { recursive: true, force: true })
}

// 3. 'auto' stops paying for a planner that keeps timing out - the loop should not
//    keep buying a step that has twice produced nothing. A timeout on a round that
//    then lost is not evidence: plan-mode-evidence.test.mjs tightened this to
//    "two timeouts in a row on rounds that WON", so the fixture follows it.
{
  const timedOut = [
    { n: 1, status: 'promoted', promoted: true, planTimedOut: true, durationMs: 600, planMs: 240, planMode: 'full' },
    { n: 2, status: 'promoted', promoted: true, planTimedOut: true, durationMs: 600, planMs: 240, planMode: 'full' },
  ]
  assert.equal(planModeFor(timedOut, { planMode: 'auto' }), 'off', 'two timeouts in a row turn the planner off')
  assert.equal(
    planModeFor(
      [
        { n: 1, status: 'promoted', promoted: true, planTimedOut: true },
        { n: 2, status: 'no-gain', promoted: false, planTimedOut: true },
      ],
      { planMode: 'auto' },
    ),
    'full',
    'a timed-out round that lost proves nothing about the planner',
  )
  assert.equal(planModeFor([{ n: 1, status: 'promoted', planTimedOut: false, planMode: 'full' }], { planMode: 'auto' }), 'full')
  assert.equal(planModeFor([], { planMode: 'auto' }), 'full', 'no history is not a reason to skip')
  assert.equal(planModeFor(timedOut, { planMode: 'off' }), 'off', 'an explicit policy wins')
  ok('auto switches the planner off only after it has twice produced nothing')
}

console.log(`\n${pass}/${pass} passed`)
