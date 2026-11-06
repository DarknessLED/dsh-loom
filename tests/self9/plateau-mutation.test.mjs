// Stagnation should change the loop, not just page a human.
//
// When three consecutive rounds promote nothing, the plateau checkpoint tells
// somebody the loop is stuck — but the loop's own lever, the chain search
// parameters, is only reachable through `rsi_chain auto`, i.e. by hand. This
// spec pins the missing half: on plateau the loop proposes chain mutations
// itself and records them as `chain.proposed`, exactly like the tool does.
// Proposing is safe on its own: `chain.proposed` changes no behaviour until an
// activation (human or autopilot) promotes one.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-pm-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function fixture(dir) {
  const events = []
  const runtime = {
    home: mkdtempSync(join(tmpdir(), 'loom-pm-home-')),
    events,
    dir,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
      // The real runtime hands back the folded state so the next predicate sees
      // this event; the fake has to do the same or plateau detection is blind.
      return {
        rounds: events.filter((e) => e.type === 'round.finished').map((e) => ({ n: e.data.n, ...e.data })),
      }
    },
    status() {
      return {}
    },
  }
  const view = {
    dir: join(mkdtempSync(join(tmpdir(), 'loom-pm-view-')), 'campaign'),
    state: {
      id: 'pm',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: false, guard: null },
      budget: { rounds: 20, roundsUsed: 0, usd: 5, spentUsd: 0 },
      // one task that keeps failing: nothing can be promoted, so the loop stalls
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: {
              name: 'c',
              version: 1,
              nodes: [
                {
                  id: 'attempts',
                  type: 'map',
                  over: 'candidates',
                  of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: try to make it pass' },
                },
                { id: 'verify', type: 'verifier', cmd: 'exit 1', cwd: '.' },
              ],
            },
            params: { candidates: 2 },
          },
        ],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  return { runtime, view }
}

const REPORT = '{"changed":[],"why":"tried","evidence":["ran it"],"openQuestions":[],"confidence":0.2,"nextHint":""}'
const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  chain: { minTasks: 6, minGain: 0.05, holdoutSlack: 0.02, maxMutations: 3 },
  checkpoint: { on: ['gate', 'plateau'] },
  models: {},
}

const dir = repo()
const { runtime, view } = fixture(dir)
const dispatcher = {
  run: async () => ({ sessionId: 'w', text: REPORT, stopReason: 'completed' }),
}

for (let n = 1; n <= 3; n += 1) {
  view.state.rounds = runtime.events.filter((e) => e.type === 'round.started').map((e) => ({ n: e.data.n }))
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
}

// The plateau checkpoint is the existing behaviour; the point of this spec is
// that the loop also acts on it.
const plateau = runtime.events.filter((e) => e.type === 'checkpoint.raised' && e.data?.kind === 'plateau')
assert.equal(plateau.length, 1, 'exactly one plateau checkpoint after three flat rounds')
ok('three flat rounds still raise a single plateau checkpoint')

const proposed = runtime.events.filter((e) => e.type === 'chain.proposed')
assert.ok(proposed.length >= 1, 'the loop proposed a chain mutation when it stalled')
assert.ok(
  proposed.every((e) => e.data?.spec?.meta?.kind),
  'every proposal records which mutation produced it',
)
assert.ok(
  proposed.every((e) => (e.data?.spec?.version ?? 0) > 1),
  'proposals get versions above the active one',
)
assert.ok(
  proposed.some((e) => JSON.stringify(e.data.spec.meta.kind).includes('candidates')),
  'the candidate-count mutation is among the proposals for a chain with a map node',
)
ok('a stall produces chain.proposed mutations instead of waiting for rsi_chain auto')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
