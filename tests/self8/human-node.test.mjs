// `human` nodes decide when a person must look. Today the node is decorative:
// autopilot applies every promotion, so a chain that says "always review this"
// is overruled by a config flag. The chain is the campaign's stated process, so
// its human node wins — while `when: never` keeps unattended campaigns unattended.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-hnode-'))
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
  // The campaign's own directory must live outside the repo, otherwise writing
  // ledger/artifact files makes the workspace dirty and the apply step refuses.
  return {
    home: mkdtempSync(join(tmpdir(), 'loom-hnode-home-')),
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
}

const REPORT = '{"changed":["new.txt"],"why":"wrote the file","evidence":["check passed"],"openQuestions":[],"confidence":0.9,"nextHint":""}'

function viewFor(dir, humanNode) {
  return {
    dir: join(mkdtempSync(join(tmpdir(), 'loom-hnode-view-')), 'campaign'),
    state: {
      id: 'hnode',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: true, guard: null },
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'write new.txt', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: {
              name: 'c',
              version: 1,
              nodes: [
                { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: write new.txt' } },
                { id: 'verify', type: 'verifier', cmd: 'exit 0', cwd: '.' },
                humanNode,
              ],
            },
            params: { candidates: 1 },
          },
        ],
      },
    },
  }
}

// The agent writes a real file so the patch is non-empty and promotion is genuine.
function dispatcher(dir) {
  return {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts?.cwd ?? dir, 'new.txt'), 'written\n')
      return { sessionId: 'w', text: REPORT, stopReason: 'completed' }
    },
  }
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
}

// 1. when: always — a human must review even though autopilot is on
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, { id: 'gate', type: 'human', when: 'always', prompt: 'Review this one yourself.' })
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: dispatcher(dir), log: () => {}, notify: () => {} })
  const cp = rt.events.find((e) => e.type === 'checkpoint.raised')
  assert.ok(cp, 'the chain forced a checkpoint')
  assert.equal(cp.data?.kind, 'gate', 'it is a review checkpoint')
  assert.equal(rt.events.some((e) => e.type === 'autopilot.applied'), false, 'autopilot did not apply it')
  assert.equal(readFileSync(join(dir, 'keep.txt'), 'utf8'), 'keep\n', 'the workspace was left alone')
  assert.equal(existsSync(join(dir, 'new.txt')), false, 'the worktree change stayed in the worktree, not the workspace')
  ok('a human node with when: always blocks the automatic apply')
  rmSync(dir, { recursive: true, force: true })
}

// 2. when: never — an unattended campaign stays unattended
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, { id: 'gate', type: 'human', when: 'never', prompt: 'Nobody needs to see this.' })
  mkdirSync(view.dir, { recursive: true })
  await runRound({ runtime: rt, view, config, dispatcher: dispatcher(dir), log: () => {}, notify: () => {} })
  assert.equal(rt.events.some((e) => e.type === 'checkpoint.raised'), false, 'no checkpoint was raised')
  assert.equal(rt.events.some((e) => e.type === 'autopilot.applied'), true, 'autopilot applied the promotion')
  ok('when: never lets autopilot land the round without a human')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
