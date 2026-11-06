// The loop's verifier lives in tests/. An agent that can edit the verifier can
// always win, and a campaign that rewards that is measuring nothing. Moving a
// goalpost is not a promotion, so a patch that touches any test file must be
// refused even when the verifier passes.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, mkdirSync as mkdir } from 'node:fs'
import { join, dirname } from 'node:path'
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-testedits-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  mkdir(join(dir, 'tests'))
  writeFileSync(join(dir, 'tests', 'check.test.mjs'), 'export const ok = true\n')
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

function viewFor(dir) {
  return {
    dir: join(dir, 'campaign'),
    state: {
      id: 'testedits',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: true, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }],
      },
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

const REPORT = '{"changed":["tests/check.test.mjs"],"why":"relax the assertion","evidence":["edited the test"],"openQuestions":[],"confidence":0.9,"nextHint":""}'

// 1. an attempt that edits a test file must not be promoted
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      const target = join(opts.cwd, 'tests', 'check.test.mjs')
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, 'export const ok = "yes"\n')
      return { sessionId: 's-edit', text: REPORT, stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  const promoted = rt.events.find((e) => e.type === 'artifact.promoted')
  const applied = rt.events.find((e) => e.type === 'autopilot.applied')
  assert.equal(gate?.data?.checks?.testsClean, false, 'the gate names the test edit')
  assert.equal(gate?.data?.promoted, false, 'editing the verifier is not a promotion')
  assert.equal(promoted, undefined, 'nothing is promoted')
  assert.equal(applied, undefined, 'nothing lands in the workspace')
  ok('a patch that edits the test suite is refused')
  rmSync(dir, { recursive: true, force: true })
}

// 2. an ordinary source edit still promotes, and the gate says the diff is clean
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'keep.txt'), 'changed\n')
      return { sessionId: 's-ok', text: '{"changed":["keep.txt"],"why":"real work","evidence":["edited"],"openQuestions":[],"confidence":0.9,"nextHint":""}', stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.testsClean, true, 'a source-only diff is clean')
  assert.equal(gate?.data?.promoted, true, 'a source-only change still promotes')
  ok('a patch that leaves the test suite alone still promotes')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
