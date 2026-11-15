// T3 measured the cost of a visible verifier command: a task whose whole
// instruction was "reply READY" still spent 44k tokens, because the brief named
// the command and the worker went to probe it. A task can now hide the command:
// the verifier still runs, but the brief neither prints it nor invites a check.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-hidden-'))
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
    stallReason() { return null },
    append(_view, type, data) { events.push({ type, data }) },
    status() { return {} },
  }
}

const dir = repo()
const rt = fakeRuntime(dir)
const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'hidden',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
    evalset: {
      tasks: [{ id: 't1', family: 'f', prompt: 'Say READY.', verify: { cmd: 'test -f SECRET_VERIFIER_TARGET', hidden: true } }],
      holdout: [],
    },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }] },
  },
}
mkdirSync(view.dir, { recursive: true })
const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
}
const briefs = []
const dispatcher = {
  run: async (brief) => {
    briefs.push(brief)
    return {
      sessionId: 's1',
      text: '{"changed":[],"why":"said READY","evidence":["replied"],"openQuestions":[],"confidence":0.9,"nextHint":""}',
      stopReason: 'completed',
    }
  },
}
await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
assert.equal(briefs.length, 1, 'one attempt ran')
const brief = briefs[0]
assert.equal(brief.includes('SECRET_VERIFIER_TARGET'), false, 'the command is not printed to the worker')
assert.match(brief, /hidden/i, 'the brief says the verifier is hidden')
const gate = rt.events.find((e) => e.type === 'gate.evaluated')
assert.equal(gate?.data?.checks?.verifierOk, false, 'the hidden verifier still ran and still failed')
ok('a hidden verifier is not named in the brief, but still judges the round')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
