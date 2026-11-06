// A chain's `verifier` node is where the work chain states how success is proved.
// Today it is a comment: the round only ever runs `task.verify`, so a task without
// its own command is scored by a placeholder that always fails, and a chain-level
// gate is silently ignored. The task must still win when it states its own command —
// a chain may not weaken a task's acceptance criteria.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-vnode-'))
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

const REPORT = '{"changed":["keep.txt"],"why":"task done","evidence":["check passed"],"openQuestions":[],"confidence":0.9,"nextHint":""}'

function viewFor(dir, { task, verifyNode }) {
  const nodes = [
    { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: do it' } },
    verifyNode ?? { id: 'verify', type: 'verifier', cmd: 'exit 0', cwd: '.' },
    { id: 'gate', type: 'human', when: 'on_gain', prompt: 'Promote?' },
  ]
  return {
    dir: join(dir, 'campaign'),
    state: {
      id: 'vnode',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: false, guard: null },
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [task], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'c', version: 1, nodes }, params: { candidates: 1 } }] },
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

const dispatcherFor = () => ({ run: async () => ({ sessionId: 'w', text: REPORT, stopReason: 'completed' }) })

// 1. task without its own verifier falls back to the chain's verifier node
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, { task: { id: 't1', family: 'f', prompt: 'do it' } })
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: dispatcherFor(), log: () => {}, notify: () => {} })
  const att = rt.events.find((e) => e.type === 'attempt.finished')
  assert.equal(att?.data?.verifierOk, true, 'the chain verifier decided the attempt')
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.verifierOk, true, 'the gate saw a passing verifier')
  ok('a task without a verifier inherits the chain verifier node')
  rmSync(dir, { recursive: true, force: true })
}

// 2. a task's own verifier wins over the chain's
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, {
    task: { id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 1' } },
    verifyNode: { id: 'verify', type: 'verifier', cmd: 'exit 0', cwd: '.' },
  })
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: dispatcherFor(), log: () => {}, notify: () => {} })
  const att = rt.events.find((e) => e.type === 'attempt.finished')
  assert.equal(att?.data?.verifierOk, false, 'the task command still decides, even when it fails')
  ok('the task verifier is not overridden by the chain')
  rmSync(dir, { recursive: true, force: true })
}

// 3. with neither, the round fails closed rather than pretending to pass
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const nodes = [{ id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: do it' } }]
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'vnode3',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: false, guard: null },
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it' }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'c', version: 1, nodes }, params: { candidates: 1 } }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: dispatcherFor(), log: () => {}, notify: () => {} })
  const att = rt.events.find((e) => e.type === 'attempt.finished')
  assert.equal(att?.data?.verifierOk, false, 'no verifier anywhere means no promotion')
  ok('without any verifier the round fails closed')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
