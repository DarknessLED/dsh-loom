// Two candidates run in parallel so that one can catch what the other misses.
// When the first one comes back with a one-shot win, the second is pure expense:
// the campaign has already got everything it asked for, and it keeps paying for
// a session nobody will read (measured: 55% of candidate time in the triangle
// campaigns, with zero score advantage).
//
// Required: as soon as a candidate lands a one-shot success, the still-running
// siblings are aborted through the dispatcher's own abort hook, their records say
// they were abandoned as redundant, and the round says how many it stopped. When
// nobody one-shots, both still have to finish - no abort, no loss of evidence.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-abort-'))
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A dispatcher that behaves like the real one: each attempt is a session that
// runs for `ms`, unless it is aborted through the hook the round installs.
function makeDispatcher({ solutions, delaysMs }) {
  const started = []
  const aborted = []
  return {
    started,
    aborted,
    run: async (_brief, ctx = {}) => {
      const label = String(ctx.label || '')
      const n = started.length
      const id = /a(\d+)/.exec(label)?.[1] ?? String(n + 1)
      started.push(id)
      let abortedFlag = false
      let abort = () => {}
      if (typeof ctx.onStart === 'function') {
        ctx.onStart({
          sessionId: 'sess-' + id,
          abort: () => {
            abortedFlag = true
            aborted.push(id)
            abort()
          },
        })
      }
      await new Promise((resolve) => {
        abort = resolve
        setTimeout(resolve, delaysMs[Number(id) - 1] ?? 50)
      })
      if (abortedFlag) return { sessionId: 'sess-' + id, text: '', structured: null, stopReason: 'aborted', error: 'aborted' }
      if (solutions[Number(id) - 1]) writeFileSync(join(ctx.cwd, 'solved.txt'), `by ${id}\n`)
      return { sessionId: 'sess-' + id, text: '{}', structured: { summary: 'attempt ' + id, changes: [], risks: [] }, stopReason: 'completed' }
    },
  }
}

function scenario({ solutions, delaysMs }) {
  const dir = repo()
  const rt = fakeRuntime(dir)
  const verifyCmd = 'node -e "process.exit(require(\'fs\').existsSync(\'solved.txt\') ? 0 : 1)"'
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'abort',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'create solved.txt', verify: { cmd: verifyCmd } }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 2 }, nodes: [] } }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  const config = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
  const dispatcher = makeDispatcher({ solutions, delaysMs })
  const finish = async () => {
    await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
    return rt.events.find((e) => e.type === 'round.finished')?.data
  }
  return { dir, rt, dispatcher, finish }
}

// 1. The first candidate one-shots it. The slow sibling must be stopped, not
//    waited out, and its record must say why it produced nothing.
{
  // The sibling is made deliberately slow (12s) so the claim below is about the
  // abort and not about how fast this machine spawns git worktrees and a
  // verifier: the first full-suite run measured 5.7s of fixture overhead under
  // load, which a 4s sibling cannot outrun.
  const s = scenario({ solutions: [true, false], delaysMs: [80, 12_000] })
  const startedAt = Date.now()
  const data = await s.finish()
  const elapsed = Date.now() - startedAt
  assert.equal(data?.status, 'promoted', 'the winner promotes the round')
  assert.equal(data?.abortedCandidates, 1, 'the redundant sibling is reported as aborted')
  assert.ok(elapsed < 6000, `the round ends when the winner does (took ${elapsed}ms), not when the slow sibling would`)
  const abandoned = s.rt.events.filter((e) => e.type === 'attempt.finished' && e.data?.abandoned === true)
  assert.equal(abandoned.length, 1, 'exactly one attempt is recorded as abandoned')
  assert.equal(abandoned[0].data.reason, 'solved-by-sibling', 'and names the reason')
  assert.ok(s.dispatcher.aborted.includes('2'), 'the abort goes through the dispatcher hook, so the session stops running')
  ok('a one-shot winner stops its still-running siblings')
  rmSync(s.dir, { recursive: true, force: true })
}

// 2. Nobody one-shots: both attempts have to finish, and nothing is thrown away.
{
  const s = scenario({ solutions: [false, false], delaysMs: [120, 400] })
  const elapsedStart = Date.now()
  const data = await s.finish()
  const elapsed = Date.now() - elapsedStart
  assert.equal(data?.abortedCandidates, 0, 'no abort when no candidate solved it outright')
  const abortedRecords = s.rt.events.filter((e) => e.type === 'attempt.finished' && e.data?.abandoned === true)
  assert.equal(abortedRecords.length, 0, 'both attempts keep their evidence')
  assert.ok(elapsed >= 400, 'the round waits for the slow attempt')
  assert.equal(s.dispatcher.aborted.length, 0, 'nothing is cancelled')
  ok('a round with no outright winner keeps both attempts')
  rmSync(s.dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
