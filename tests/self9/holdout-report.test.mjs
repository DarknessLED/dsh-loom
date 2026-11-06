// A held-out failure is the most interesting event in a campaign and the least
// visible one: the round simply records `holdout-failed` and the loop moves on,
// so the patch that regression-tested badly disappears without anyone seeing it.
// This spec pins the missing report: a holdout rejection raises a checkpoint
// naming the holdout task and quoting its output, and it must not apply or
// commit anything.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-ho-'))
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
    home: mkdtempSync(join(tmpdir(), 'loom-ho-home-')),
    events,
    dir,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
    status() {
      return {}
    },
  }
  const view = {
    dir: join(mkdtempSync(join(tmpdir(), 'loom-ho-view-')), 'campaign'),
    state: {
      id: 'ho',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      lessons: [],
      checkpoints: [],
      // autopilot on: the promotion path is the automatic one, so a holdout
      // rejection has to interrupt it rather than merely annotate it.
      autopilot: { enabled: true, guard: null },
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: {
        tasks: [
          { id: 't1', family: 'f', prompt: 'write new.txt', verify: { cmd: 'exit 0' } },
          { id: 'hold', family: 'h', prompt: 'the whole suite', verify: { cmd: 'echo "regressed: checkout is broken" && exit 1' } },
        ],
        holdout: ['hold'],
      },
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: {
              name: 'c',
              version: 1,
              nodes: [
                { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER' } },
                { id: 'verify', type: 'verifier', cmd: 'exit 0', cwd: '.' },
              ],
            },
            params: { candidates: 1 },
          },
        ],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  return { runtime, view }
}

const REPORT = '{"changed":["new.txt"],"why":"wrote it","evidence":["t1 passes"],"openQuestions":[],"confidence":0.9,"nextHint":""}'
const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  chain: { minTasks: 6, minGain: 0.05, holdoutSlack: 0.02, maxMutations: 3 },
  checkpoint: { on: ['gate', 'plateau', 'holdout'] },
  models: {},
}

const dir = repo()
const { runtime, view } = fixture(dir)
const dispatcher = {
  run: async (_prompt, opts) => {
    writeFileSync(join(opts?.cwd ?? dir, 'new.txt'), 'written\n')
    return { sessionId: 'w', text: REPORT, stopReason: 'completed' }
  },
}

await runRound({ runtime: runtime, view, config, dispatcher, log: () => {}, notify: () => {} })

assert.equal(
  runtime.events.some((e) => e.type === 'round.finished' && e.data?.status === 'holdout-failed'),
  true,
  'the round failed on the holdout',
)
ok('a holdout regression fails the round')

const cp = runtime.events.find((e) => e.type === 'checkpoint.raised')
assert.ok(cp, 'a checkpoint was raised for the holdout regression')
assert.equal(cp.data?.kind, 'holdout', 'the checkpoint kind names the holdout')
assert.equal(cp.data?.payload?.task, 'hold', 'the checkpoint names the holdout task that failed')
assert.match(String(cp.data?.payload?.detail ?? ''), /regressed/, 'the checkpoint quotes the holdout output')
ok('the holdout rejection raises a checkpoint naming the task and its output')

assert.equal(runtime.events.some((e) => e.type === 'autopilot.applied'), false, 'nothing was applied')
assert.equal(readFileSync(join(dir, 'keep.txt'), 'utf8'), 'keep\n', 'the workspace was left alone')
ok('a holdout rejection leaves the workspace untouched')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
