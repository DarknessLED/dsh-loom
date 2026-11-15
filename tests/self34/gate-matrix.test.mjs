// The gate is a product of four facts: did the verifier pass, is there a real
// patch, does the patch stay out of the tests and the oracle, and did the score
// beat the incumbent. Each fact has a spec; this file pins the combinations.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-matrix-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  mkdirSync(join(dir, 'src'))
  mkdirSync(join(dir, 'tests'))
  writeFileSync(join(dir, 'src', 'app.js'), 'export const value = 1\n')
  writeFileSync(join(dir, 'tests', 'app.test.js'), '// the verifier the task runs\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

const REPORT = '{"changed":[],"why":"did it","evidence":["ran it"],"openQuestions":[],"confidence":0.9,"nextHint":""}'

async function runCase({ verify, patch = null, taskPatch = null }) {
  const dir = repo()
  const events = []
  const runtime = {
    home: join(dir, 'home'),
    dir,
    events,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() { return null },
    append(_view, type, data) { events.push({ type, data }) },
    status() { return {} },
  }
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'matrix',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 5, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify }], holdout: [] },
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
    run: async (brief, opts = {}) => {
      if (patch) writeFileSync(join(opts.cwd, patch.path), patch.text)
      if (taskPatch) writeFileSync(join(opts.cwd, taskPatch.path), taskPatch.text)
      return { sessionId: 's', text: REPORT, stopReason: 'completed' }
    },
  }
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  rmSync(dir, { recursive: true, force: true })
  return {
    gate: events.find((e) => e.type === 'gate.evaluated')?.data ?? null,
    artifact: events.find((e) => e.type === 'artifact.promoted')?.data ?? null,
    promoted: events.some((e) => e.type === 'artifact.promoted'),
  }
}

// A fully satisfied verifier and an empty diff: the tree already passed, nobody
// did work. It lands as a no-op — the task is solved, but the artifact says so
// and carries no patch, so it cannot be mistaken for a change.
{
  const { gate, artifact } = await runCase({ verify: { cmd: 'exit 0' } })
  assert.equal(gate?.checks?.verifierOk, true)
  assert.equal(gate?.checks?.hasPatch, false)
  assert.equal(gate?.checks?.noop, true, 'a full pass with no patch is a no-op')
  assert.equal(artifact?.noop, true, 'the landing says it was a no-op')
  assert.equal(artifact?.noop, true)
  ok('full pass + empty diff lands as a labelled no-op')
}

// A patch that fixes the code, verifier passes: a real win.
{
  const { gate, promoted } = await runCase({
    verify: { cmd: `"${process.execPath}" -e "process.exit(require('fs').existsSync('src/done.txt')?0:1)"` },
    patch: { path: 'src/done.txt', text: 'done\n' },
  })
  assert.equal(gate?.checks?.hasPatch, true)
  assert.equal(gate?.checks?.verifierOk, true)
  assert.equal(gate?.checks?.noop, false)
  assert.equal(gate?.promoted, true)
  assert.equal(promoted, true)
  ok('patch + verifier pass = promoted')
}

// A failing verifier with a high partial score is progress, not a win.
{
  const { gate, promoted } = await runCase({
    verify: { cmd: 'echo KILLRATE=0.900 && exit 1' },
    patch: { path: 'src/app.js', text: 'export const value = 2\n' },
  })
  assert.equal(gate?.checks?.verifierOk, false)
  assert.equal(gate?.score, 0, 'a failed verifier scores 0 even when the kill rate is high')
  assert.equal(promoted, false)
  ok('a failing verifier never promotes, however high the kill rate')
}

// The tests are the oracle's convention; editing them invalidates the win.
{
  const { gate, promoted } = await runCase({
    verify: { cmd: 'exit 0' },
    taskPatch: { path: 'tests/app.test.js', text: '// weakened\n' },
  })
  assert.equal(gate?.checks?.testsClean, false, 'the patch touched the tests')
  assert.equal(promoted, false)
  ok('a patch that edits tests/ cannot promote')
}

console.log(`\n${pass}/${pass} passed`)
