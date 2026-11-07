// The holdout gate is the last thing a round pays for, and its cost is invisible.
//
// `durationMs` includes the holdout verification, so a round that spends six
// minutes proving a patch and two minutes proving the holdout reads as an
// eight-minute round of work. The reader then blames the loop for being slow
// when the holdout is what it bought. Reported separately, the same numbers say
// something true and actionable.
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
  // A holdout that takes a measurable amount of time, so a round that hides it
  // is distinguishable from one that does not run it at all.
  writeFileSync(join(dir, 'holdout-slow.cjs'), 'setTimeout(function () { process.exit(0) }, 1200)\n')
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

function makeView(dir, holdout) {
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'holdout',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
      evalset: {
        tasks: [{ id: 't1', family: 'f', prompt: 'change something', verify: { cmd: 'exit 0' } }],
        holdout,
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
              nodes: [],
            },
          },
        ],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  return view
}

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

const REPORT = {
  changed: ['keep.txt'],
  why: 'made the line shorter',
  evidence: ['tests pass'],
  openQuestions: [],
  confidence: 0.8,
  nextHint: '',
}

const dispatcher = {
  run: async () => ({ sessionId: 'work', text: JSON.stringify(REPORT), stopReason: 'completed' }),
}

for (const holdout of [
  [{ id: 'h1', family: 'h', prompt: 'held back', verify: { cmd: join('.', 'holdout-slow.cjs') } }],
]) {
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = makeView(dir, holdout)
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const finished = rt.events.filter((e) => e.type === 'round.finished').pop()
  assert.ok(finished, 'the round finished')
  assert.ok(
    typeof finished.data.holdoutMs === 'number' && finished.data.holdoutMs >= 1000,
    `the holdout took measurable time and must be reported: got ${JSON.stringify(finished.data.holdoutMs)}`,
  )
  assert.equal(finished.data.holdoutRuns, 1, 'one holdout task ran')
  assert.ok(
    finished.data.durationMs >= finished.data.holdoutMs,
    'the round cannot be shorter than its own holdout',
  )
  ok('a passing holdout is timed separately from the round')
  rmSync(dir, { recursive: true, force: true })
}

{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = makeView(dir, [
    { id: 'h2', family: 'h', prompt: 'held back', verify: { cmd: 'exit 1' } },
  ])
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const finished = rt.events.filter((e) => e.type === 'round.finished').pop()
  assert.equal(finished.data.status, 'holdout-failed')
  assert.equal(finished.data.holdoutRuns, 1, 'a failing holdout is still counted as a run')
  ok('a failing holdout is counted too')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
