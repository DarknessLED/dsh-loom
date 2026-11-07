// Planning is the most expensive node in a round: measured on this repo, recon
// took 211s and then 300s on consecutive rounds of the same campaign — 28% and
// 35% of the round's wall clock — and it produced the same plan both times,
// because nothing it reads had changed. A round that re-plans a task whose tree
// has not moved since the last plan is paying the most expensive model call we
// make to re-derive a decision we already have.
//
// This pins the cheap rule: reuse the plan while the base commit is unchanged;
// re-plan the moment it moves. The plan is not a round's evidence — no attempt,
// no promotion, no score depends on it — so reusing it cannot launder a result.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-recon-'))
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

const dir = repo()
const rt = fakeRuntime(dir)

// A chain with a planning node in front of the parallel candidates: this is the
// shape `code-fix` actually ships, and the shape that made recon the top cost.
const chainSpec = {
  name: 'recon-chain',
  version: 1,
  params: { candidates: 2 },
  nodes: [
    { id: 'recon', type: 'agent', role: 'planner', prompt: 'plan the task' },
    { id: 'work', type: 'map', role: 'worker', prompt: 'do the task' },
  ],
}

const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'recon',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 100, spentUsd: 0 },
    evalset: {
      tasks: [{ id: 't1', family: 'f', prompt: 'write a file', verify: { cmd: `"${process.execPath}" -e "process.exit(1)"` } }],
      holdout: [],
    },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: chainSpec }] },
  },
}
mkdirSync(view.dir, { recursive: true })

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
  verify: { timeoutMs: 60_000 },
  loopPolicy: { halving: false },
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
  checkpoint: { on: [] },
}

// Counts every dispatch and records what role it was given, so "did recon run"
// is answered by the dispatcher itself rather than by log parsing.
let dispatches = 0
let plannerRuns = 0
const dispatcher = {
  run: async (brief, { cwd, label } = {}) => {
    dispatches += 1
    if (/plan/i.test(String(label ?? brief))) plannerRuns += 1
    writeFileSync(join(cwd, 'out.txt'), `attempt ${dispatches}\n`)
    return {
      sessionId: `s${dispatches}`,
      text: '{"changed":["out.txt"],"why":"wrote it","evidence":["x"],"openQuestions":[],"confidence":0.9,"nextHint":""}',
      stopReason: 'completed',
    }
  },
}

// Round 1: recon + two candidates. The verifier fails, so nothing is promoted and
// the base commit does not move.
await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
const afterR1 = rt.events.filter((e) => e.type === 'node.finished').map((e) => e.data)
assert.equal(afterR1.filter((n) => n.id === 'recon' && n.reused !== true).length, 1, 'round 1 really planned')
assert.equal(rt.events.find((e) => e.type === 'round.finished')?.data?.promoted, false, 'round 1 promoted nothing')

// Fold round 1 into the state the way reduce does: same task, same base, failed.
const base1 = git(dir, 'rev-parse', 'HEAD').trim()
view.state.rounds.push({
  n: 1,
  taskId: 't1',
  status: 'no-gain',
  score: 0,
  promoted: false,
  landed: false,
  base: base1,
  attempts: [{ id: 'r1a1', score: 0, verifierOk: false }, { id: 'r1a2', score: 0, verifierOk: false }],
})
view.state.budget.roundsUsed = 1

// Round 2: the tree has not moved, so the plan from round 1 still describes it.
const before = { dispatches, plannerRuns }
await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
const round2Nodes = rt.events.filter((e) => e.type === 'node.finished').map((e) => e.data).slice(afterR1.length)
const recon2 = round2Nodes.find((n) => n.id === 'recon')

assert.equal(dispatcher && plannerRuns - before.plannerRuns, 0, 'round 2 did not send the planner prompt again')
assert.equal(dispatches - before.dispatches, 2, 'round 2 dispatched only its two candidates')
assert.ok(recon2, 'round 2 still reports the recon node')
assert.equal(recon2.reused, true, 'the recon node says it was reused')
assert.equal(recon2.durationMs, 0, 'a reused plan costs no model time')
assert.ok(typeof recon2.summary === 'string' && recon2.summary.length > 0, 'the reused node carries the plan it reused')

ok('an unchanged tree reuses the plan and does not re-dispatch recon')

// Round 3: move the base commit. The plan described a tree that no longer
// exists, so it must be re-derived rather than trusted.
writeFileSync(join(dir, 'moved.txt'), 'moved\n')
git(dir, 'add', '-A')
git(dir, 'commit', '-qm', 'move the tree')
const before3 = { dispatches, plannerRuns }
await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
assert.equal(plannerRuns - before3.plannerRuns, 1, 'a moved tree forces a fresh plan')
assert.equal(dispatches - before3.dispatches, 3, 'that round dispatched recon plus its two candidates')

ok('a moved base commit invalidates the reused plan')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
