// A campaign that has spent ten rounds sampling two candidates and promoting
// both of them at score 1 is paying for insurance it never collects on. The
// evidence is already in its own history: every attempt scored 1, so a second
// opinion could not have changed anything.
//
// `adaptiveCandidateMode(rounds)` reads that history and says whether the next
// round should sample (parallel) or cascade. Turning it on is opt-in, and an
// explicit `candidateMode` always wins over the inference.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { adaptiveCandidateMode } from '../../src/runtime/candidates.js'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const perfectRound = (n) => ({
  n,
  taskId: `t-${n}`,
  status: 'promoted',
  landed: true,
  promotedAttemptId: `r${n}a1`,
  score: 1,
  attempts: [
    { id: `r${n}a1`, score: 1 },
    { id: `r${n}a2`, score: 1 },
  ],
})

// 1. Both candidates perfect, twice over: the second opinion bought nothing.
{
  assert.equal(
    adaptiveCandidateMode([perfectRound(1), perfectRound(2)]),
    'cascade',
    'two rounds where every candidate scored 1 mean sampling is wasted',
  )
  ok('a campaign whose spare candidates never lose learns to cascade')
}

// 2. One round where the second candidate was worse keeps the sampling.
{
  const mixed = [
    perfectRound(1),
    { ...perfectRound(2), attempts: [{ id: 'r2a1', score: 1 }, { id: 'r2a2', score: 0.6 }] },
  ]
  assert.equal(adaptiveCandidateMode(mixed), 'parallel', 'one informative second opinion is enough to keep sampling')
  ok('a second candidate that scored worse keeps the sampling')
}

// 3. Not enough history to conclude anything: stay with what works.
{
  assert.equal(adaptiveCandidateMode([perfectRound(1)]), 'parallel', 'one round is not a pattern')
  assert.equal(adaptiveCandidateMode([]), 'parallel', 'no history is not a pattern either')
  assert.equal(
    adaptiveCandidateMode([{ n: 1, status: 'promoted', attempts: [{ id: 'r1a1', score: 1 }] }]),
    'parallel',
    'rounds with a single candidate carry no evidence about a second one',
  )
  ok('a short history does not change the mode')
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-adaptive-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

const REPORT = JSON.stringify({
  changed: ['solved.txt'],
  why: 'wrote the marker',
  evidence: ['the check exits 0'],
  openQuestions: [],
  confidence: 0.9,
  nextHint: '',
})

function scenario(opts = {}) {
  const dir = repo()
  const events = []
  const rt = {
    home: join(dir, 'home'),
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
  }
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'adaptive',
      status: 'running',
      workspace: dir,
      rounds: opts.rounds ?? [],
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
        versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 2 }, nodes: [] } }],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  const config = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: { halving: false, ...(opts.loopPolicy || {}) },
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
  let dispatched = 0
  const dispatcher = {
    run: async (_brief, ctx = {}) => {
      dispatched += 1
      writeFileSync(join(ctx.cwd, 'solved.txt'), 'solved\n')
      return { sessionId: 's' + dispatched, text: REPORT, stopReason: 'completed' }
    },
  }
  const round = async () => {
    await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
    return events.find((e) => e.type === 'round.finished')?.data
  }
  return { dir, rt, view, config, round, dispatched: () => dispatched }
}

// 4. With the history saying sampling never mattered, the round samples once.
{
  const s = scenario({
    rounds: [perfectRound(1), perfectRound(2)],
    loopPolicy: { autoCandidateMode: true },
  })
  const data = await s.round()
  assert.equal(s.dispatched(), 1, 'the inferred cascade spends one worker')
  assert.equal(data?.candidateMode, 'cascade', 'and says so on the record')
  assert.equal(data?.candidateModeSource, 'auto', 'the inference is named, not passed off as a setting')
  assert.equal(data?.skippedCandidates, 1)
  ok('a campaign that always promoted both candidates stops buying the second one')
  rmSync(s.dir, { recursive: true, force: true })
}

// 5. When the history is not clear, auto keeps sampling.
{
  const s = scenario({
    rounds: [perfectRound(1), { ...perfectRound(2), attempts: [{ id: 'r2a1', score: 1 }, { id: 'r2a2', score: 0.5 }] }],
    loopPolicy: { autoCandidateMode: true },
  })
  const data = await s.round()
  assert.equal(s.dispatched(), 2, 'an informative second opinion is still sampled')
  assert.equal(data?.candidateMode, 'parallel')
  assert.equal(data?.candidateModeSource, 'auto')
  ok('auto does not turn itself on without evidence')
  rmSync(s.dir, { recursive: true, force: true })
}

// 6. An explicit setting outranks the inference, and says which one won.
{
  const s = scenario({
    rounds: [perfectRound(1), perfectRound(2)],
    loopPolicy: { autoCandidateMode: true, candidateMode: 'parallel' },
  })
  const data = await s.round()
  assert.equal(s.dispatched(), 2, 'an explicit parallel is obeyed')
  assert.equal(data?.candidateMode, 'parallel')
  assert.equal(data?.candidateModeSource, 'config', 'and the record says the human asked for it')
  ok('an explicit candidate mode outranks the inference')
  rmSync(s.dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
