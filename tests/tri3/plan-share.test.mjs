// A round is not one cost centre. Part of it is planning (nodes that run before
// the candidates: reconnaissance, chain agents), part is the candidates' model
// time, part is the verifier. The triangle can only say where the money went if
// the round separates them -- right now planning is indistinguishable from the
// rest of the wall clock, which is exactly the half hour per campaign that the
// operator cannot see.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'
import { campaignTriangle } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-planshare-'))
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
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
  }
}

const REPORT = JSON.stringify({
  changed: ['keep.txt'],
  why: 'rewrote the marker',
  evidence: ['exit 0'],
  openQuestions: [],
  confidence: 0.8,
  nextHint: '',
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const dir = repo()
const rt = fakeRuntime(dir)
const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'planshare',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
    evalset: {
      tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }],
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
            params: { candidates: 1 },
            // one pre-map planning node, which is what costs the visible time
            nodes: [{ id: 'recon', type: 'agent', role: 'planner', prompt: 'read the code and say what to change' }],
          },
        },
      ],
    },
  },
}
mkdirSync(view.dir, { recursive: true })
const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: { halving: false },
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
  checkpoint: { on: [] },
}

const PLAN_MS = 80
const dispatcher = {
  run: async (_brief, ctx = {}) => {
    const label = String(ctx.label || '')
    if (label.includes(':plan:')) {
      await sleep(PLAN_MS)
      return { sessionId: 'plan', text: 'change keep.txt', stopReason: 'completed' }
    }
    await sleep(5)
    return { sessionId: 'work', text: REPORT, stopReason: 'completed' }
  },
}

await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
const round = rt.events.find((e) => e.type === 'round.finished')?.data

assert.ok(round, 'the round finished')
assert.equal(typeof round.planMs, 'number', 'the round reports how much of itself was planning')
assert.ok(round.planMs >= PLAN_MS - 10, `planning is not rounded away (planMs=${round.planMs})`)
assert.ok(round.planMs <= round.durationMs, 'planning cannot be larger than the round it is part of')
ok('a round separates its planning time from its attempt time')

const tri = campaignTriangle([round])
assert.equal(tri.measured, true, 'a round with a duration is measured')
assert.equal(tri.planMs, round.planMs, 'the triangle carries the planning total, not a re-derivation')
assert.ok(tri.planShare > 0 && tri.planShare <= 1, `plan share is a fraction (${tri.planShare})`)
assert.ok(
  Math.abs(tri.planShare - round.planMs / round.durationMs) < 1e-9,
  'the share is planMs/durationMs',
)
ok('the triangle reports planning as its own leg')

// A campaign with no planning nodes must report zero rather than null: zero is a
// measurement, and a campaign that plans nothing is a fact worth seeing.
const bare = campaignTriangle([
  { n: 1, status: 'promoted', durationMs: 1000, attemptMs: 900, verifierMs: 100, planMs: 0, attemptCount: 1, verifierRuns: 1, tokens: 10, costUsd: 0 },
])
assert.equal(bare.planMs, 0)
assert.equal(bare.planShare, 0)
ok('a campaign that plans nothing measures zero, not unknown')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
