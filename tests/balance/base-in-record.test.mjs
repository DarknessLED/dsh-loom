// A patch that cannot say which tree it was cut against cannot be re-verified.
//
// Every attempt writes `artifacts/<id>.patch`, and 200 of the 420 attempts in the
// ledger produced one. But not a single record carried the commit the patch was
// generated against, so after the round ends there is no way to return that patch
// to its own base and ask the verifier again -- which is exactly what salvage
// needs, and exactly what `verifyOnce`'s (patch, command, base) key is built for.
// The value is already computed for the worktree; it just never travels.
//
// Rule: the attempt record names the base commit it was cut against, and a round
// nobody could measure says null rather than inventing one.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runRound } from '../../src/runtime/round.js'

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

function fakeRuntime(dir) {
  return {
    home: dir,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
    append() {},
  }
}

const REPORT = JSON.stringify({
  changed: ['keep.txt'],
  why: 'wrote the solved marker',
  evidence: 'the file is there',
  openQuestions: [],
  confidence: 0.7,
  nextHint: null,
})

// 1. The record carries the commit the worktree was cut from.
{
  const dir = repo('loom-base-')
  const campaign = mkdtempSync(join(tmpdir(), 'loom-camp-'))
  try {
    const baseSha = git(dir, 'rev-parse', 'HEAD')
    const events = []
    const dispatcher = {
      run: async () => ({
        sessionId: 's1',
        text: REPORT,
        structured: null,
        stopReason: 'completed',
        timedOut: false,
        error: null,
      }),
    }
    const state = {
      id: 'b1',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { usd: 10, rounds: 5, minutes: 60, tokens: 0 },
      evalset: {
        tasks: [
          {
            id: 't1',
            prompt: 'create solved.txt',
            verify: { cmd: `"${process.execPath}" -e "process.exit(0)"`, timeoutMs: 60000 },
          },
        ],
        holdout: [],
      },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 'quick', version: 1, params: { candidates: 1 }, nodes: [] } }],
      },
    }
    const config = {
      session: { attemptTimeoutMs: 600000, maxConcurrent: 1 },
      verify: { timeoutMs: 60000 },
      loopPolicy: { halving: false, candidateMode: 'parallel' },
      knowledge: { enabled: false },
      halving: { enabled: false },
      gate: { minGain: 0 },
      models: {},
      checkpoint: { on: [] },
    }
    await runRound({
      runtime: fakeRuntime(campaign),
      view: { id: 'b1', dir: campaign, state },
      config,
      dispatcher,
      log: () => {},
    })
    const attempt = state.rounds[0].attempts[0]
    assert.equal(attempt.base, baseSha, 'the attempt names the commit it was cut against')
    assert.ok(/^[0-9a-f]{40}$/.test(attempt.base), `a base is a full sha (${attempt.base})`)
    ok('an attempt records the base commit it was cut against')
    void events
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

// 2. Two attempts in the same round face the same base -- the record is a fact
//    about the tree, not a per-attempt accident.
{
  const dir = repo('loom-base2-')
  const campaign = mkdtempSync(join(tmpdir(), 'loom-camp2-'))
  try {
    const baseSha = git(dir, 'rev-parse', 'HEAD')
    let n = 0
    const dispatcher = {
      run: async () => {
        n += 1
        return {
          sessionId: 's' + n,
          text: REPORT,
          structured: null,
          stopReason: 'completed',
          timedOut: false,
          error: null,
        }
      },
    }
    const state = {
      id: 'b1',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { usd: 10, rounds: 5, minutes: 60, tokens: 0 },
      evalset: {
        tasks: [
          {
            id: 't1',
            prompt: 'create solved.txt',
            verify: { cmd: `"${process.execPath}" -e "process.exit(0)"`, timeoutMs: 60000 },
          },
        ],
        holdout: [],
      },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 'quick', version: 1, params: { candidates: 2 }, nodes: [] } }],
      },
    }
    const config = {
      session: { attemptTimeoutMs: 600000, maxConcurrent: 2 },
      verify: { timeoutMs: 60000 },
      loopPolicy: { halving: false, candidateMode: 'parallel' },
      knowledge: { enabled: false },
      halving: { enabled: false },
      gate: { minGain: 0 },
      models: {},
      checkpoint: { on: [] },
    }
    await runRound({
      runtime: fakeRuntime(campaign),
      view: { id: 'b2', dir: campaign, state },
      config,
      dispatcher,
      log: () => {},
    })
    const bases = state.rounds[0].attempts.map((a) => a.base)
    assert.equal(bases.length, 2, 'two candidates were dispatched')
    assert.deepEqual(bases, [baseSha, baseSha], 'both name the same tree')
    ok('every attempt in a round names the same base')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

console.log(`\n${pass}/2 passed`)
assert.equal(pass, 2)
