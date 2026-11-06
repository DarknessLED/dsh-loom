// A chain is a spec, not decoration. The nodes before the `map` are the work that
// makes the parallel attempts smart: a planner inspects the task once and hands a
// short plan to every worker. Today only `map.of.prompt` reaches the model, so the
// planner node silently does nothing. Running it first — and degrading to the old
// behaviour when it fails — is what makes the chain a work chain.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-nodes-'))
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

const REPORT = '{"changed":["keep.txt"],"why":"the plan said so","evidence":["ran the check"],"openQuestions":[],"confidence":0.8,"nextHint":""}'

const PLAN_NODE = { id: 'recon', type: 'agent', role: 'planner', prompt: 'PLAN: inspect the repository and state the gap in one line.' }
const WORK_NODE = { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: implement the change the plan describes.' }

function viewFor(dir, nodes, candidates = 1) {
  return {
    dir: join(dir, 'campaign'),
    state: {
      id: 'nodes',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: false, guard: null },
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make the check pass', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: { name: 'plan-then-work', version: 1, nodes },
            params: { candidates },
          },
        ],
      },
    },
  }
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
}

// 1. the planner runs first and its findings reach the worker's brief
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, [PLAN_NODE, { id: 'attempts', type: 'map', over: 'candidates', of: WORK_NODE }])
  mkdirSync(view.dir, { recursive: true })
  const prompts = []
  const dispatcher = {
    run: async (prompt) => {
      prompts.push(prompt)
      if (prompts.length === 1) {
        return { sessionId: 'plan', text: 'FINDING: the flag file keep.txt is stale', stopReason: 'completed' }
      }
      return { sessionId: 'work', text: REPORT, stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  assert.equal(prompts.length, 2, 'the planner and the worker are two dispatches')
  assert.match(prompts[0], /PLAN: inspect the repository/, 'the first dispatch is the planner node')
  assert.match(prompts[1], /FINDING: the flag file keep\.txt is stale/, 'the plan reaches the worker')
  assert.match(prompts[1], /WORKER: implement the change/, 'the worker node still supplies its own role')
  assert.equal(rt.events.some((e) => e.type === 'node.finished' && e.data?.id === 'recon'), true, 'the node outcome is on the record')
  ok('the planner node runs before the map and feeds the workers')
  rmSync(dir, { recursive: true, force: true })
}

// 2. a failing planner must not cost the round: the worker still runs, unwarned
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, [PLAN_NODE, { id: 'attempts', type: 'map', over: 'candidates', of: WORK_NODE }])
  mkdirSync(view.dir, { recursive: true })
  const prompts = []
  const dispatcher = {
    run: async (prompt) => {
      prompts.push(prompt)
      if (prompts.length === 1) return { sessionId: 'plan', text: '', stopReason: 'error', error: 'planner blew up' }
      return { sessionId: 'work', text: REPORT, stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const attempt = rt.events.find((e) => e.type === 'attempt.finished')
  assert.ok(attempt, 'the round still produced an attempt record')
  assert.equal(typeof attempt.data?.score, 'number', 'the attempt was scored')
  assert.match(prompts[1] ?? '', /WORKER: implement the change/, 'the worker ran anyway')
  assert.equal(rt.events.some((e) => e.type === 'node.finished' && e.data?.id === 'recon' && e.data?.ok === false), true, 'the failure is recorded')
  ok('a failed planner degrades to the old behaviour instead of failing the round')
  rmSync(dir, { recursive: true, force: true })
}

// 3. a chain without a pre-map agent keeps dispatching once per candidate
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, [{ id: 'attempts', type: 'map', over: 'candidates', of: WORK_NODE }])
  mkdirSync(view.dir, { recursive: true })
  let calls = 0
  const dispatcher = {
    run: async () => {
      calls += 1
      return { sessionId: 'w', text: REPORT, stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  assert.equal(calls, 1, 'no plan node means no extra dispatch')
  assert.equal(rt.events.some((e) => e.type === 'node.finished'), false, 'no node records when there is no node to run')
  ok('a chain with no pre-map node behaves exactly as before')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
