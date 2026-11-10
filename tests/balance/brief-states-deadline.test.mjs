// A brief that states the wall clock is only worth anything if the dispatcher is
// told the same number. This is the end-to-end half of
// tests/dispatch/brief-states-budget.test.mjs: it drives a real round and reads
// the brief string the loop actually hands to a child.
//
// Ledger: 132 planned rounds, 85 (64%) came back empty while burning 24% of the
// wall clock. One session log showed a planner making 24 tool calls and then
// being killed mid-investigation. A brief that says nothing about the clock makes
// that outcome indistinguishable from laziness, and unimproveable either way.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runRound } from '../../src/runtime/round.js'

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const scratch = mkdtempSync(join(tmpdir(), 'loom-brief-budget-'))
const repo = join(scratch, 'repo')
const campaign = join(scratch, 'campaign')

const REPORT = JSON.stringify({
  changed: ['keep.txt'],
  why: 'stub',
  evidence: ['ran it'],
  openQuestions: [],
  confidence: 0.9,
  nextHint: 'none',
})

let pass = 0
let fail = 0
function ok(name, cond = true, detail) {
  if (cond) {
    pass += 1
    console.log('ok   ' + name)
  } else {
    fail += 1
    console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + detail))
  }
}

const CHAIN = {
  activeVersion: 1,
  versions: [
    {
      version: 1,
      spec: {
        name: 'code-fix',
        version: 1,
        params: { candidates: 1 },
        nodes: [
          { id: 'recon', type: 'agent', role: 'planner', prompt: 'inspect the repository and report' },
          { id: 'work', type: 'map' },
          { id: 'worker', type: 'agent', prompt: 'do the task' },
        ],
      },
    },
  ],
}

function baseState() {
  return {
    id: 'brief-budget',
    workspace: repo,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { usd: 5, rounds: 4, minutes: 60, tokens: 0, roundsUsed: 0 },
    evalset: {
      tasks: [
        {
          id: 't1',
          prompt: 'make it pass',
          verify: { cmd: `"${process.execPath}" -e "process.exit(0)"` },
        },
      ],
      holdout: [],
    },
    chain: CHAIN,
  }
}

function fakeRuntime(dir) {
  const events = []
  return {
    home: dir,
    events,
    append(view, type, data) {
      events.push({ type, data })
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    stallEvidence() {
      return null
    },
  }
}

try {
  mkdirSync(repo, { recursive: true })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.email', 't@example.com')
  git(repo, 'config', 'user.name', 't')
  git(repo, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(repo, 'keep.txt'), 'keep\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-qm', 'base')
  mkdirSync(campaign, { recursive: true })

  const briefs = []
  const dispatcher = {
    async run(prompt, opts) {
      briefs.push({ prompt, label: opts?.label ?? null })
      if (opts?.onStart) opts.onStart({ sessionId: 's1', abort() {}, deadline: Date.now() + 60_000 })
      return { sessionId: 's1', text: REPORT, stopReason: 'completed', timedOut: false, error: null }
    },
  }

  const config = {
    session: { attemptTimeoutMs: 780_000, planTimeoutMs: 180_000, maxConcurrent: 2 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { planMode: 'auto', candidateMode: 'parallel', halving: false },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }

  const view = { id: 'brief-budget', dir: campaign, state: baseState() }
  const runtime = fakeRuntime(campaign)
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })

  const plan = briefs.find((b) => String(b.label ?? '').includes(':plan:'))
  assert.ok(plan, 'the planner was dispatched')
  // 180 s is the configured plan window, and it is what the planner must be told.
  assert.match(plan.prompt, /180 s/, 'the planner brief states its 180 s window')
  ok('the planner is told the window it will be stopped in')

  const worker = briefs.find((b) => !String(b.label ?? '').includes(':plan:'))
  assert.ok(worker, 'the worker was dispatched')
  // 780 s is the attempt deadline; the worker runs under it.
  assert.match(worker.prompt, /780 s/, 'the worker brief states its 780 s window')
  ok('the worker is told its attempt deadline')

  // The number stated must be the number enforced: the deadline event and the
  // brief cannot disagree, or the brief is decoration.
  const deadline = runtime.events.find((e) => e.type === 'attempt.deadline')
  assert.ok(deadline, 'the deadline was recorded')
  assert.equal(deadline.data.timeoutMs, 780_000, 'the enforced deadline is the stated one')
  ok('the stated deadline is the enforced one')
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
