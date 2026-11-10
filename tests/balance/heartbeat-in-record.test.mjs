// The ledger can say an attempt died. It cannot say whether the child ever
// started. That is the difference between "the provider refused us before the
// first step" and "the model worked for four minutes and then went silent", and
// every recovery decision depends on it -- rebuild the parent, retry on the same
// model, fall over to the next provider, or leave the tree alone.
//
// The watchdog already computes this: it tracks each session's event watermark
// (`seq`) and how long the watermark has been still (`idleMs`). Until now those
// numbers lived in memory for the few milliseconds between the stall and the end
// of the round, so 145 of 420 attempts read back as a bare `failureKind: 'died'`.
//
// Rule: when the watchdog writes an attempt off, the record carries what it saw
// -- `advanced` (did the session ever reach a step), `lastSeq`, `idleMs` and the
// reason. A record nothing wrote off carries no heartbeat at all, so an absent
// field means "finished on its own", never "observed zero".
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runRound } from '../../src/runtime/round.js'
import { Runtime } from '../../src/runtime/runtime.js'
import { Watchdog } from '../../src/runtime/watchdog.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
}

function repo(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'dsh-loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return dir
}

// 1. The real Runtime methods: `stallReason` answers "why did we stop it" and
//    `stallEvidence` answers "what did we see". The second must not consume the
//    record the first one returns, because the round asks both.
{
  const rt = Object.create(Runtime.prototype)
  rt.stalls = new Map([
    ['r1a1', { attemptId: 'r1a1', reason: 'stalled', idleMs: 120_000, lastSeq: 7, advanced: true, sessionId: 's1' }],
  ])
  assert.equal(rt.stallReason('r1a1'), 'stalled', 'the verdict still reads out')
  rt.stalls.set('r1a1', { attemptId: 'r1a1', reason: 'stalled', idleMs: 120_000, lastSeq: 7, advanced: true })
  assert.deepEqual(
    rt.stallEvidence('r1a1'),
    { reason: 'stalled', idleMs: 120_000, lastSeq: 7, advanced: true },
    'the observation reads out as a plain object',
  )
  assert.equal(rt.stallEvidence('nobody'), null, 'an attempt nobody wrote off has no evidence')
  ok('runtime reports both the verdict and the observation behind it')
}

// 2. End to end: a child that never reached a step is written off, and the
//    record says so instead of pretending it died mysteriously.
{
  const dir = repo('loom-hb-')
  const campaign = mkdtempSync(join(tmpdir(), 'loom-hbc-'))
  const stalls = new Map()
  const wd = new Watchdog({
    seqOf: () => null,
    stallMs: 1000,
    graceMs: 0,
    onStall: (rec) => stalls.set(rec.attemptId, rec),
  })
  const runtime = {
    home: campaign,
    watchAttempt({ attemptId, sessionId, abort, deadline, campaign: c }) {
      wd.track({ attemptId, sessionId, abort, deadline, campaign: c })
      // The child never reports a step; the watchdog gives up on it right away.
      wd.check(Date.now() + 5000)
    },
    unwatchAttempt(attemptId) {
      wd.untrack(attemptId)
    },
    stallReason(attemptId) {
      const rec = stalls.get(attemptId) ?? null
      stalls.delete(attemptId)
      return rec?.reason ?? null
    },
    stallEvidence(attemptId) {
      const rec = stalls.get(attemptId)
      if (!rec || typeof rec !== 'object') return null
      return { reason: rec.reason ?? null, idleMs: Math.max(0, Number(rec.idleMs) || 0), lastSeq: rec.lastSeq ?? null, advanced: rec.advanced === true }
    },
    append() {},
  }
  try {
    const dispatcher = {
      // The session was killed before it produced anything, which is what the
      // watchdog is for. `onStart` is how the round hands the live session to the
      // watchdog, so a fake that skips it would never be watched at all.
      run: async (prompt, opts) => {
        opts.onStart({ sessionId: 's1', abort: () => {}, deadline: Date.now() + 60_000 })
        return {
          sessionId: 's1',
          text: '',
          structured: null,
          stopReason: 'aborted',
          timedOut: false,
          error: null,
        }
      },
    }
    const state = {
      id: 'hb1',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { usd: 10, rounds: 5, minutes: 60, tokens: 0 },
      evalset: {
        tasks: [{ id: 't1', prompt: 'do nothing', verify: { cmd: `"${process.execPath}" -e "process.exit(1)"`, timeoutMs: 60_000 } }],
        holdout: [],
      },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'quick', version: 1, params: { candidates: 1 }, nodes: [] } }] },
    }
    const config = {
      session: { attemptTimeoutMs: 600_000, maxConcurrent: 1 },
      verify: { timeoutMs: 60_000 },
      loopPolicy: { halving: false, candidateMode: 'parallel' },
      knowledge: { enabled: false },
      halving: { enabled: false },
      gate: { minGain: 0 },
      models: {},
      checkpoint: { on: [] },
    }
    await runRound({ runtime, view: { id: 'hb1', dir: campaign, state }, config, dispatcher, log: () => {} })
    const attempt = state.rounds[0].attempts[0]
    assert.ok(attempt.heartbeat, 'the record carries the watchdog observation')
    assert.equal(attempt.heartbeat.advanced, false, 'this child never reached a step')
    assert.equal(attempt.heartbeat.reason, 'stalled', 'and the verdict travels with it')
    assert.ok(attempt.heartbeat.idleMs >= 0, 'how long it was quiet is on the record')
    ok('an attempt the watchdog wrote off records whether the child ever advanced')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

// 3. An attempt that finished on its own carries no heartbeat -- absence means
//    "nothing wrote this off", which a later reader must not read as zero.
{
  const dir = repo('loom-hb2-')
  const campaign = mkdtempSync(join(tmpdir(), 'loom-hbc2-'))
  const runtime = {
    home: campaign,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
    stallEvidence: () => null,
    append() {},
  }
  try {
    const REPORT = JSON.stringify({ changed: [], why: 'nothing to do', evidence: 'nothing', openQuestions: [], confidence: 0.5, nextHint: null })
    const dispatcher = {
      run: async () => ({ sessionId: 's2', text: REPORT, structured: null, stopReason: 'completed', timedOut: false, error: null }),
    }
    const state = {
      id: 'hb2',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { usd: 10, rounds: 5, minutes: 60, tokens: 0 },
      evalset: {
        tasks: [{ id: 't1', prompt: 'do nothing', verify: { cmd: `"${process.execPath}" -e "process.exit(0)"`, timeoutMs: 60_000 } }],
        holdout: [],
      },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'quick', version: 1, params: { candidates: 1 }, nodes: [] } }] },
    }
    const config = {
      session: { attemptTimeoutMs: 600_000, maxConcurrent: 1 },
      verify: { timeoutMs: 60_000 },
      loopPolicy: { halving: false, candidateMode: 'parallel' },
      knowledge: { enabled: false },
      halving: { enabled: false },
      gate: { minGain: 0 },
      models: {},
      checkpoint: { on: [] },
    }
    await runRound({ runtime, view: { id: 'hb2', dir: campaign, state }, config, dispatcher, log: () => {} })
    const attempt = state.rounds[0].attempts[0]
    assert.equal(attempt.heartbeat, undefined, 'no watchdog, no heartbeat field')
    ok('an attempt that finished on its own carries no heartbeat')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

console.log(`\n${pass}/3 passed`)
assert.equal(pass, 3)
