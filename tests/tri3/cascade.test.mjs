// Sampling two candidates and keeping the better one is the right trade when a
// first attempt often produces something that merely passes. It is the wrong
// trade when the first attempt already solves the task outright: the second
// candidate cannot beat a perfect score, so its whole run is bought for nothing.
//
// `candidateMode: 'cascade'` dispatches one candidate, and only spends the next
// one if the result left room to improve. The round records what it planned, what
// it actually ran, and why it stopped early.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-cascade-'))
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
  changed: ['solved.txt'],
  why: 'wrote the marker the check looks for',
  evidence: ['the check exits 0'],
  openQuestions: [],
  confidence: 0.9,
  nextHint: '',
})

/**
 * @param {{mode?: string, candidates?: number, solveOn?: number[]}} opts
 *   solveOn lists the 1-based candidate indexes whose worktree gets the marker.
 */
function scenario(opts = {}) {
  const mode = opts.mode ?? 'cascade'
  const candidates = opts.candidates ?? 2
  const solveOn = new Set(opts.solveOn ?? [2])
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'cascade',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
      evalset: {
        tasks: [
          {
            id: 't1',
            family: 'f',
            prompt: 'create solved.txt',
            verify: { cmd: 'node -e "process.exit(require(\'fs\').existsSync(\'solved.txt\') ? 0 : 1)"' },
          },
        ],
        holdout: [],
      },
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: { name: 't', version: 1, params: { candidates }, nodes: [] },
          },
        ],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  const config = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: { halving: false, candidateMode: mode },
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
  const labels = []
  const dispatcher = {
    run: async (_brief, ctx = {}) => {
      const index = labels.length + 1
      labels.push(ctx.label || `#${index}`)
      if (solveOn.has(index)) writeFileSync(join(ctx.cwd, 'solved.txt'), 'solved\n')
      return { sessionId: `s${index}`, text: REPORT, stopReason: 'completed' }
    },
  }
  return { dir, rt, view, config, dispatcher, dispatched: () => labels.length }
}

// 1. The first candidate solves it outright: the second is never dispatched.
{
  const s = scenario({ solveOn: [1] })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {}, notify: () => {} })
  const round = s.rt.events.find((e) => e.type === 'round.finished')
  assert.equal(s.dispatched(), 1, 'a perfect first candidate costs one worker, not two')
  assert.equal(round?.data?.candidatesPlanned, 2, 'the plan is still on the record')
  assert.equal(round?.data?.attemptCount, 1, 'only the attempt that ran is counted')
  assert.equal(round?.data?.skippedCandidates, 1, 'the skipped candidate is named, not silently dropped')
  assert.equal(round?.data?.candidateMode, 'cascade')
  assert.equal(round?.data?.status, 'promoted', 'a solved task is still promoted')
  ok('a solved first candidate ends the round instead of buying a second opinion')
  rmSync(s.dir, { recursive: true, force: true })
}

// 2. The first candidate leaves room: the second one is dispatched as before.
{
  const s = scenario({ solveOn: [2] })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {}, notify: () => {} })
  const round = s.rt.events.find((e) => e.type === 'round.finished')
  assert.equal(s.dispatched(), 2, 'a failed first candidate still earns a second try')
  assert.equal(round?.data?.attemptCount, 2)
  assert.equal(round?.data?.skippedCandidates, 0, 'nothing was skipped when it was needed')
  assert.equal(round?.data?.promoted, true, 'the second candidate is the one that lands')
  ok('cascade still spends the second candidate when the first does not solve it')
  rmSync(s.dir, { recursive: true, force: true })
}

// 3. Parallel stays the default: opt-in cascade must not change today's rounds.
{
  const s = scenario({ mode: 'parallel', solveOn: [1] })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {}, notify: () => {} })
  const round = s.rt.events.find((e) => e.type === 'round.finished')
  assert.equal(s.dispatched(), 2, 'parallel sampling is unchanged')
  assert.equal(round?.data?.candidateMode, 'parallel')
  assert.equal(round?.data?.skippedCandidates, 0)
  ok('the default mode still samples every candidate')
  rmSync(s.dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
