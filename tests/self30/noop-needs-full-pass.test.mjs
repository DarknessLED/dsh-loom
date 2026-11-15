// A verified attempt that changed nothing may land as "the tree already
// satisfies the verifier" — but only when the verifier is fully satisfied.
// T3 caught the other case: a command that exits 0 while scoring 0.5 promoted
// an empty diff, so the campaign recorded a win for work nobody did.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-noop-half-'))
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
    dir,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() { return null },
    append(_view, type, data) { events.push({ type, data }) },
    status() { return {} },
  }
}

const dir = repo()
const rt = fakeRuntime(dir)
const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'noop-half',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: true, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'half done', verify: { cmd: 'echo KILLRATE=0.500' } }], holdout: [] },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }] },
  },
}
mkdirSync(view.dir, { recursive: true })
const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
}
const dispatcher = {
  run: async () => ({
    sessionId: 's1',
    text: '{"changed":[],"why":"nothing to do","evidence":["ran it"],"openQuestions":[],"confidence":0.9,"nextHint":""}',
    stopReason: 'completed',
  }),
}
await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
const finished = rt.events.find((e) => e.type === 'round.finished')
const gate = rt.events.find((e) => e.type === 'gate.evaluated')
const promoted = rt.events.find((e) => e.type === 'artifact.promoted')
assert.equal(gate?.data?.checks?.hasPatch, false, 'an empty diff is not a patch')
assert.equal(gate?.data?.score, 0.5, 'the verifier only half-passed')
assert.equal(gate?.data?.checks?.noop, false, 'a half-passing no-op is not a landing')
assert.equal(gate?.data?.promoted, false, 'nothing landed')
assert.equal(promoted, undefined, 'no artifact was recorded')
assert.equal(finished?.data?.status, 'no-gain', 'the round says it gained nothing')
ok('a partially satisfied task cannot land as a no-op')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
