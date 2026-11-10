// Two candidates that produce the *same* patch are one piece of evidence, not
// two. Re-running the verifier on byte-identical work spends the most expensive
// seconds of the round (the verifier) to learn nothing new. This pins the reuse:
// the second candidate must inherit the first one's verdict instead of spawning
// the command again, and it must inherit it *as evidence* (same exit code, same
// output), not as a shortcut that skips the gate.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-reuse-'))
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
const counter = join(dir, 'verifier-runs.txt')
// The counter lives outside every worktree, so it counts real command spawns
// across both candidates no matter which tree ran last. It is a script file
// rather than an inline `-e` so Windows shell quoting cannot break it.
const counterScript = join(dir, 'count-verifier.cjs')
// The command counts its own spawns *and* checks the work: a spec that passes
// before the candidate does anything cannot justify a promotion, so the counter
// only reports success once `a.txt` exists with the expected content.
writeFileSync(
  counterScript,
  `require('fs').appendFileSync(${JSON.stringify(counter)}, 'x')\n` +
    `process.exit(require('fs').existsSync('a.txt') ? 0 : 1)\n`,
)
const verifyCmd = `"${process.execPath}" "${counterScript}"`

const rt = fakeRuntime(dir)
const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'reuse',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 100, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'add a file', verify: { cmd: verifyCmd } }], holdout: [] },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 2 }, nodes: [] } }] },
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

// Both candidates make the identical change, so their patches are identical.
const dispatcher = {
  run: async (brief, { cwd } = {}) => {
    writeFileSync(join(cwd, 'a.txt'), 'same content\n')
    return {
      sessionId: 's1',
      text: '{"changed":["a.txt"],"why":"same change","evidence":["x"],"openQuestions":[],"confidence":0.9,"nextHint":""}',
      stopReason: 'completed',
    }
  },
}

await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })

const finished = rt.events.filter((e) => e.type === 'verifier.finished')
const attempts = rt.events.filter((e) => e.type === 'attempt.finished').map((e) => e.data)
const round = rt.events.find((e) => e.type === 'round.finished')

const runs = existsSync(counter) ? readFileSync(counter, 'utf8').split('').length : 0
assert.equal(attempts.length, 2, 'both candidates still get an attempt record')
assert.ok(
  attempts.every((a) => a.verifierOk === true),
  'the reused verdict is evidence: both candidates are verified',
)
assert.equal(runs, 2, 'one run to prove the base is red, one for the shared candidate patch')
assert.equal(finished.length, 2, 'both candidates still report a verifier result')
assert.equal(finished[0].data.reused, undefined, 'the first run is a real run')
assert.equal(finished[1].data.reused, true, 'the identical patch reuses the first verdict')
assert.equal(finished[1].data.exitCode, finished[0].data.exitCode, 'the reused verdict carries the exit code')
assert.equal(finished[1].data.durationMs, 0, 'a reused verdict costs no verifier time')
assert.equal(round?.data?.status, 'promoted')
assert.equal(round?.data?.verifierRuns, 1, 'the round counts one verifier run, not two')

ok('an identical patch reuses the previous verifier verdict')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
