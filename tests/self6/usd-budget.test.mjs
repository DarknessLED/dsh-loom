// The USD budget is the only brake that reflects what a campaign actually costs.
// It must be enforced against recorded spend, not against the folded counter that
// stays at zero when a ledger predates `budget.spent` events.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-usd-'))
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

const spentRound = {
  n: 1,
  taskId: 't1',
  status: 'promoted',
  landed: true,
  promotedAttemptId: 'r1a1',
  attempts: [{ id: 'r1a1', score: 1, verifierOk: true, patch: null, patchBytes: 0, usage: { inputTokens: 1e6, outputTokens: 1e6, costUsd: 6 } }],
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: { pricing: { inputPerMTok: 1, outputPerMTok: 1 } },
}

// The folded counter says nothing was spent; the rounds say otherwise.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'usd',
      status: 'running',
      workspace: dir,
      rounds: [spentRound],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: true, guard: null },
      budget: { rounds: 10, roundsUsed: 1, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  let dispatched = false
  const dispatcher = {
    run: async () => {
      dispatched = true
      throw new Error('the round must not dispatch once the USD budget is gone')
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  assert.equal(dispatched, false, 'no child agent is spawned over the USD budget')
  const finished = rt.events.find((e) => e.type === 'round.finished')
  assert.ok(finished, 'the round still closes out')
  assert.equal(finished.data?.status, 'budget', 'the round records that the budget stopped it')
  assert.equal(rt.events.some((e) => e.type === 'attempt.finished'), false, 'nothing was attempted')
  ok('recorded spend above budget.usd blocks the next round')
  rmSync(dir, { recursive: true, force: true })
}

// Under budget, the same campaign still runs.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const cheap = { ...spentRound, attempts: [{ ...spentRound.attempts[0], usage: { inputTokens: 1, outputTokens: 1, costUsd: 0.01 } }] }
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'usd2',
      status: 'running',
      workspace: dir,
      rounds: [cheap],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: false, guard: null },
      budget: { rounds: 10, roundsUsed: 1, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  let dispatched = false
  const dispatcher = {
    run: async () => {
      dispatched = true
      return { sessionId: 's1', text: '{"changed":[],"why":"already fine","evidence":["ok"],"openQuestions":[],"confidence":0.9,"nextHint":""}', stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  assert.equal(dispatched, true, 'a cheap campaign keeps running')
  ok('spend under the budget does not block the round')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
