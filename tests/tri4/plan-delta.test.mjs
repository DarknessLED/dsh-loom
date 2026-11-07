// Planning is the most expensive call in a round (211-300s), and it is re-run
// every round because the cache key is the base commit -- which changes on every
// promotion, even when the commit touched a file the plan never mentions.
//
// A plan is invalidated by a change *to the tree it describes*: if nothing the
// plan names has moved since the plan was made, the plan still applies and the
// planner is not called again. That is "plan delta", and it must be conservative:
// a change to a file the plan names always forces a fresh plan.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-plandelta-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  mkdirSync(join(dir, 'docs'), { recursive: true })
  writeFileSync(join(dir, 'docs', 'note.md'), 'note\n')
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

const dir = repo()
const rt = fakeRuntime(dir)
const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'plandelta',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
    evalset: {
      // The check never passes, so the task stays open and the next round comes
      // back to it -- which is exactly when a redundant plan is paid for twice.
      tasks: [{ id: 't1', family: 'f', prompt: 'make keep.txt shorter', verify: { cmd: 'exit 1' } }],
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

const planCalls = []
const dispatcher = {
  run: async (_brief, ctx = {}) => {
    if (String(ctx.label || '').includes(':plan:')) {
      planCalls.push(ctx.label)
      return { sessionId: 'plan', text: 'Only keep.txt needs to change: rewrite that line.', stopReason: 'completed' }
    }
    return {
      sessionId: 'work',
      text: JSON.stringify({ changed: [], why: 'did not find a change worth making', evidence: [], openQuestions: [], confidence: 0.4, nextHint: '' }),
      stopReason: 'completed',
    }
  },
}

const runOne = async (n) => {
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const nodes = rt.events.filter((e) => e.type === 'node.finished').map((e) => e.data)
  view.state.rounds.push({ n, taskId: 't1', status: 'no-gain', promoted: false, score: 0, landed: false, attempts: [] })
  return nodes[nodes.length - 1]
}

// 1. First round: the plan is paid for.
await runOne(1)
assert.equal(planCalls.length, 1, 'the first plan is not free')
ok('the first round plans for real')

// 2. A commit that touches nothing the plan names moves the base, not the plan.
writeFileSync(join(dir, 'docs', 'note.md'), 'note changed\n')
git(dir, 'add', '-A')
git(dir, 'commit', '-qm', 'docs only')
const second = await runOne(2)
assert.equal(planCalls.length, 1, 'a commit outside the plan does not buy a new plan')
assert.equal(second?.id, 'recon')
assert.equal(second?.reused, true, 'the plan is reused across an unrelated commit')
assert.equal(second?.planBasis, 'delta', 'the record says why it was still valid')
ok('an unrelated commit does not invalidate the plan')

// 3. A commit to a file the plan names invalidates it.
writeFileSync(join(dir, 'keep.txt'), 'keep changed\n')
git(dir, 'add', '-A')
git(dir, 'commit', '-qm', 'touched the file the plan names')
const third = await runOne(3)
assert.equal(planCalls.length, 2, 'the planner runs again once its subject changed')
assert.equal(third?.reused, false)
ok('a change to a file the plan names forces a fresh plan')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
