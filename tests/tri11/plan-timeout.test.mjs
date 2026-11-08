// `session.attemptTimeoutMs` is twenty minutes, and the reconnaissance step
// inherits it: a planner that wanders through the repository costs a quarter of
// an hour before anyone notices, in the most expensive model call of the round.
// Planning is bounded work - read a few files, name what will change - so it gets
// its own, shorter deadline, and a planner that hits it must not take the round
// down with it.
//
// Required:
//   - the planner dispatch is bounded by `config.session.planTimeoutMs`
//     (default 240000), while worker attempts keep `attemptTimeoutMs`;
//   - a timed-out planner records `node.finished{id:'recon', ok:false,
//     timedOut:true}` and the round still dispatches its attempts, marking
//     `round.finished.planTimedOut === true` (a round that planned nothing is not
//     the same as one that planned well, so it says which);
//   - a successful plan records `planTimedOut: false`.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
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

function repo(prefix) {
  const dir = mkdtempSync(join(tmpdir(), `loom-${prefix}-`))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

const REPORT = {
  changed: ['keep.txt'],
  why: 'made the line shorter',
  evidence: ['tests pass'],
  openQuestions: [],
  confidence: 0.8,
  nextHint: '',
}

function setup(extraSession = {}, planResult = null) {
  const dir = repo('plantime')
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'pt',
      status: 'running',
      workspace: dir,
      objective: 'keep the planner bounded',
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
      evalset: {
        tasks: [{ id: 't1', family: 'f', prompt: 'change something', verify: { cmd: 'exit 0' } }],
        holdout: [],
      },
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: {
              name: 't',
              version: 1,
              params: { candidates: 2 },
              nodes: [{ id: 'recon', type: 'agent', role: 'planner', prompt: 'read the code and say what to change' }],
            },
          },
        ],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  const calls = []
  const dispatcher = {
    calls,
    async run(_prompt, opts = {}) {
      const label = String(opts.label || '')
      calls.push({ label, timeoutMs: opts.timeoutMs })
      if (label.includes(':plan:')) {
        return planResult ?? { sessionId: 'p', text: 'Plan: edit keep.txt.', stopReason: 'completed' }
      }
      return { sessionId: 'w', text: JSON.stringify(REPORT), stopReason: 'completed' }
    },
  }
  const events = []
  const runtime = {
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
  const config = {
    session: { attemptTimeoutMs: 600_000, maxConcurrent: 2, ...extraSession },
    verify: { timeoutMs: 30_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0 },
    models: {},
    checkpoint: { on: [] },
  }
  return { dir, view, dispatcher, runtime, events, config }
}

// 1. The planner gets its own, shorter deadline; workers keep theirs.
{
  const { view, dispatcher, runtime, config } = setup({ planTimeoutMs: 90_000 })
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const plan = dispatcher.calls.find((c) => c.label.includes(':plan:'))
  const work = dispatcher.calls.find((c) => !c.label.includes(':plan:'))
  assert.ok(plan, `the round planned (labels: ${JSON.stringify(dispatcher.calls.map((c) => c.label))})`)
  assert.equal(plan.timeoutMs, 90_000, `the planner is bounded by planTimeoutMs, got ${plan.timeoutMs}`)
  assert.ok(work, 'and the workers ran')
  assert.equal(work.timeoutMs, 600_000, 'workers keep the attempt deadline')
  ok('the planner has its own deadline instead of inheriting the twenty-minute one')
}

// 2. Unset means four minutes, not the attempt deadline.
{
  const { view, dispatcher, runtime, config } = setup()
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const plan = dispatcher.calls.find((c) => c.label.includes(':plan:'))
  assert.ok(plan, 'the round planned')
  assert.equal(plan.timeoutMs, 240_000, `the default plan budget is four minutes, got ${plan.timeoutMs}`)
  ok('the default plan budget is bounded')
}

// 3. A planner that times out does not take the round down.
{
  const { view, dispatcher, runtime, events, config } = setup({ planTimeoutMs: 1000 }, {
    sessionId: 'p',
    text: '',
    stopReason: 'timedOut',
    timedOut: true,
  })
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const recon = events.find((e) => e.type === 'node.finished' && e.data.id === 'recon')
  assert.ok(recon, 'the round recorded the planning node')
  assert.equal(recon.data.timedOut, true, 'and that it timed out')
  assert.equal(recon.data.ok, false, 'a timed-out plan is not a plan')
  const finished = events.filter((e) => e.type === 'round.finished').pop()
  assert.ok(finished, 'the round still finished')
  assert.equal(finished.data.planTimedOut, true, 'the round says it proceeded without a plan')
  const attempts = events.filter((e) => e.type === 'attempt.finished')
  assert.equal(attempts.length, 2, 'and the workers were still dispatched')
  ok('a runaway planner costs its own budget, not the round')
}

// 4. A plan that worked says so.
{
  const { view, runtime, events, config, dispatcher } = setup()
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const finished = events.filter((e) => e.type === 'round.finished').pop()
  assert.equal(finished.data.planTimedOut, false, 'a planned round reports that the plan landed in time')
  ok('the flag is two-valued, not absent-when-fine')
}

console.log(`\n${pass}/${pass} passed`)
