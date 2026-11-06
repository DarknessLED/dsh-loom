// A holdout task is the only defence the loop has against overfitting the
// tasks it can see: if a patch passes the visible verifier but breaks a task
// that was held back, promoting it is a regression the campaign awarded itself.
// So promotion must be gated on the holdout verifier running in the same
// candidate worktree, and the gate must say what it did.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-holdout-'))
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

function viewFor(dir, evalset, extra = {}) {
  const state = {
    id: 'holdout',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: true, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
    evalset,
    chain: {
      activeVersion: 1,
      versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }],
    },
    ...extra,
  }
  return { dir: join(dir, 'campaign'), state }
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

// The agent writes a real change, so the attempt has a patch to promote.
const REPORT = '{"changed":["keep.txt"],"why":"make the flag file current","evidence":["edited"],"openQuestions":[],"confidence":0.9,"nextHint":""}'
const patchDispatcher = {
  run: async (_prompt, opts) => {
    writeFileSync(join(opts.cwd, 'keep.txt'), 'changed\n')
    return { sessionId: 's-hold', text: REPORT, stopReason: 'completed' }
  },
}

// 1. holdout fails -> the patch must not be promoted
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, {
    tasks: [
      { id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } },
      { id: 'h1', family: 'h', prompt: 'hidden', verify: { cmd: 'exit 1' } },
    ],
    holdout: ['h1'],
  })
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: patchDispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  const promoted = rt.events.find((e) => e.type === 'artifact.promoted')
  const finished = rt.events.find((e) => e.type === 'round.finished')
  assert.equal(gate?.data?.checks?.holdout, false, 'the gate records the holdout failure')
  assert.equal(gate?.data?.promoted, false, 'a holdout failure is not a promotion')
  assert.equal(promoted, undefined, 'nothing is promoted')
  assert.equal(finished?.data?.status, 'holdout-failed', 'the round names the holdout failure')
  ok('a patch that breaks a holdout task is refused')
  rmSync(dir, { recursive: true, force: true })
}

// 2. holdout passes -> promotion proceeds, and the gate says the holdout ran
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, {
    tasks: [
      { id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } },
      { id: 'h1', family: 'h', prompt: 'hidden', verify: { cmd: 'exit 0' } },
    ],
    holdout: ['h1'],
  })
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: patchDispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  const promoted = rt.events.find((e) => e.type === 'artifact.promoted')
  assert.equal(gate?.data?.checks?.holdout, true, 'the holdout passed')
  assert.equal(gate?.data?.promoted, true, 'the patch is promoted')
  assert.equal(promoted?.data?.attemptId, 'r1a1', 'the promoted attempt is the candidate')
  ok('a patch that keeps the holdout green is promoted')
  rmSync(dir, { recursive: true, force: true })
}

// 3. no holdout tasks -> the gate reports that it was skipped, not that it passed
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] })
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: patchDispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.holdout, 'skipped', 'no holdout tasks means skipped, not passed')
  assert.equal(gate?.data?.promoted, true, 'an unguarded campaign still promotes')
  ok('a campaign without holdout tasks reports the check as skipped')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
