// A task whose deliverable is test coverage needs the gate to allow the edit --
// and to allow exactly the listed file, not tests in general.
//
// Same fixture as tests/balance/holdout-noop.test.mjs: a real git repo, a real
// runRound, a dispatcher that writes a file. The verdict is read from the
// `gate.evaluated` checks rather than from promotion, because a green-on-base
// verifier with no metric legitimately earns nothing (src/gate/earned.js) -- and
// that is a different question from whether the scope was respected.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound } from '../../src/runtime/round.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true })

function repo(prefix) {
  const root = mkdtempSync(join(tmpdir(), `loom-${prefix}-`))
  const dir = join(root, 'repo')
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'dsh-loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  mkdirSync(join(dir, 'tests'), { recursive: true })
  writeFileSync(join(dir, 'tests', 'a.test.mjs'), '// a\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return { root, dir }
}

function fakeRuntime(home) {
  const events = []
  return {
    events,
    home,
    append(_view, type, data) { events.push({ type, data }); return data },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

const REPORT = JSON.stringify({ changed: [], why: 'added coverage', evidence: 'measured', openQuestions: [], confidence: 0.9, nextHint: '' })

function stateFor(workspace, verify) {
  return {
    id: 'scope-round',
    status: 'running',
    workspace,
    rounds: [],
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 'harden-a', prompt: 'harden tests/a.test.mjs', verify }], holdout: [] },
    chain: {
      activeVersion: 1,
      versions: [
        { version: 1, spec: { name: 'quick', version: 1, params: { candidates: 1, maxSteps: 10 }, nodes: [
          { id: 'work', type: 'agent', name: 'worker', prompt: 'do it' },
          { id: 'check', type: 'verifier', name: 'check', cmd: `"${process.execPath}" -e "process.exit(0)"` },
        ] } },
      ],
    },
  }
}

function config() {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1, stallMs: 300_000 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
}

async function roundWithFile(prefix, fileToWrite, verify) {
  const { root, dir } = repo(prefix)
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, verify), dir: join(root, 'campaign') }
  const dispatcher = {
    async run(_prompt, opts) {
      const target = join(opts.cwd, fileToWrite)
      mkdirSync(join(target, '..'), { recursive: true })
      writeFileSync(target, '// touched\n')
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 'x', durationMs: 1 }
    },
  }
  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })
  const gate = runtime.events.filter((e) => e.type === 'gate.evaluated').map((e) => e.data)[0]
  rmSync(root, { recursive: true, force: true })
  return gate
}

const GREEN = `"${process.execPath}" -e "process.exit(0)"`
const scoped = { cmd: GREEN, scope: { editable: ['tests/a.test.mjs'] } }

let pass = 0
const ok = (name) => { pass += 1; console.log(`ok ${pass} - ${name}`) }

// 1. The listed file is allowed.
{
  const gate = await roundWithFile('scope-a', 'tests/a.test.mjs', scoped)
  assert.equal(gate.checks.testsClean, true, 'editing the declared spec is not a test edit violation')
  assert.deepEqual(gate.checks.scope.violations, [], 'nothing outside the scope was named')
  assert.equal(gate.checks.scope.editable.length, 1)
  ok('a scoped task may edit the spec it declared')
}

// 2. A different test file is refused -- the scope is a file, not a directory.
{
  const gate = await roundWithFile('scope-b', 'tests/b.test.mjs', scoped)
  assert.equal(gate.checks.testsClean, false, 'an undeclared test edit is still a violation')
  assert.deepEqual(gate.checks.scope.violations, ['tests/b.test.mjs'])
  ok('an undeclared test file is refused, not merely discouraged')
}

// 3. A source edit is refused even though the task is "about tests".
{
  const gate = await roundWithFile('scope-c', 'src/gate/gate.js', { cmd: GREEN, scope: { editable: ['tests'] } })
  assert.equal(gate.checks.testsClean, false, 'scope=tests never allows src')
  assert.deepEqual(gate.checks.scope.violations, ['src/gate/gate.js'])
  ok('a directory scope does not leak into src/')
}

// 4. No scope: the historical rule is unchanged, and checks.scope is absent.
{
  const gate = await roundWithFile('scope-d', 'tests/a.test.mjs', { cmd: GREEN })
  assert.equal(gate.checks.testsClean, false, 'without a scope any test edit is still refused')
  assert.equal(Object.hasOwn(gate.checks, 'scope'), false, 'no scope key when no scope was declared')
  ok('a task without a scope keeps the old verdict exactly')
}

console.log(`\n${pass}/${pass} passed`)
