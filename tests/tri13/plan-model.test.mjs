// Planning is the one call every round makes before anything can succeed, and it
// is also the most expensive single step in the ledger (183-320s of a 256-1010s
// round). The research note asks for the same lever in both directions: give the
// planner its own budget and its own model, so an operator who has a cheap model
// for "read the repo and say what to do" can use it without downgrading the
// workers who have to write the patch.
//
// The default stays exactly as it is today: no `models.meta`, no behaviour change.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' })
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-planmodel-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@test')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return dir
}

const REPORT = JSON.stringify({
  changed: [],
  why: 'nothing to change',
  evidence: 'read the repo',
  openQuestions: [],
  confidence: 'high',
  nextHint: '',
})

function fakeRuntime(dir) {
  const events = []
  return {
    home: join(dir, '..', `home-${Math.random().toString(36).slice(2)}`),
    dir,
    events,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(view, type, data) {
      const ev = { seq: events.length + 1, type, data, t: Date.now() }
      events.push(ev)
      view.state = view.state
      return ev
    },
  }
}

function viewFor(dir, evalset) {
  return {
    dir,
    state: {
      id: 'planmodel',
      workspace: dir,
      objective: 'one task',
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { usd: 5, rounds: 10, minutes: 60 },
      evalset,
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: {
              name: 'code-fix',
              version: 1,
              params: { candidates: 2 },
              nodes: [
                { id: 'recon', type: 'agent', role: 'planner', prompt: 'inspect the repo and report' },
                { id: 'worker', type: 'map', role: 'worker', prompt: 'do the task' },
                { id: 'tests', type: 'verifier', role: 'tests', cmd: 'node -e "process.exit(0)"' },
              ],
            },
          },
        ],
      },
    },
  }
}

const evalset = { tasks: [{ id: 't1', prompt: 'do it', verify: { cmd: 'node -e "process.exit(0)"' } }], holdout: [] }

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 60000, planTimeoutMs: 60000, maxConcurrent: 2 },
    verify: { timeoutMs: 60000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
    ...over,
  }
}

function dispatcherSpy(sink) {
  return {
    run: async (brief, opts = {}) => {
      const isPlan = String(opts.label || '').includes(':plan:')
      sink.push({ plan: isPlan, model: opts.model ?? null, timeoutMs: opts.timeoutMs ?? null })
      return {
        sessionId: 's1',
        text: isPlan ? 'The fix is in keep.txt; change the second line.' : REPORT,
        stopReason: 'completed',
        model: opts.model ?? null,
        failureKind: 'ok',
      }
    },
  }
}

// 1. With models.meta set, the planner runs on meta and the worker does not.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, evalset)
  const calls = []
  await runRound({
    runtime: rt,
    view,
    config: config({ models: { worker: 'w-1', meta: 'm-1' } }),
    dispatcher: dispatcherSpy(calls),
    log: () => {},
  })
  const plan = calls.find((c) => c.plan)
  const work = calls.filter((c) => !c.plan)
  assert.ok(plan, 'the round planned')
  assert.equal(plan.model, 'm-1', `the planner used models.meta, got ${plan.model}`)
  assert.ok(
    work.every((c) => c.model === 'w-1'),
    `workers used models.worker, got ${JSON.stringify(work.map((c) => c.model))}`,
  )
  ok('with models.meta set, the planner runs on meta and the workers stay on worker')
}

// 2. Without models.meta, nothing changes: the planner uses the worker model.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, evalset)
  const calls = []
  await runRound({
    runtime: rt,
    view,
    config: config({ models: { worker: 'w-1' } }),
    dispatcher: dispatcherSpy(calls),
    log: () => {},
  })
  const plan = calls.find((c) => c.plan)
  assert.ok(plan, 'the round planned')
  assert.equal(plan.model, 'w-1', `without meta the planner keeps the worker model, got ${plan.model}`)
  ok('without models.meta the planner keeps the worker model (opt-in, not a default change)')
}

// 3. The ledger says which model planned: a reader must not have to infer it.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, evalset)
  await runRound({
    runtime: rt,
    view,
    config: config({ models: { worker: 'w-1', meta: 'm-1' } }),
    dispatcher: dispatcherSpy([]),
    log: () => {},
  })
  const recon = rt.events.find((e) => e.type === 'node.finished' && e.data?.id === 'recon')
  assert.ok(recon, 'the planning node reported')
  assert.equal(recon.data.model, 'm-1', `node.finished.model records the planner model, got ${recon.data.model}`)
  ok('node.finished records the model that planned')
}

// 4. The planner keeps its own deadline, not the attempt deadline.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, evalset)
  const calls = []
  await runRound({
    runtime: rt,
    view,
    config: config({ session: { attemptTimeoutMs: 600000, planTimeoutMs: 90000, maxConcurrent: 2 } }),
    dispatcher: dispatcherSpy(calls),
    log: () => {},
  })
  const plan = calls.find((c) => c.plan)
  assert.equal(plan.timeoutMs, 90000, `the planner keeps planTimeoutMs, got ${plan.timeoutMs}`)
  ok('the planner keeps planTimeoutMs rather than inheriting attemptTimeoutMs')
}

console.log(`\n${pass}/${pass} passed`)
