// A no-op round pays for the holdout gate to re-check a tree it did not touch.
//
// When a candidate verifies without changing a byte (`checks.noop`), the holdout
// command runs against exactly the tree the candidate just proved - nothing moved,
// so the second opinion can only repeat the first. We measured that gate at
// 100-174 s per round, and on the small-change tasks where no-ops are common it is
// the most expensive part of a round that produced nothing to check.
//
// So: skip the holdout when there is nothing to hold out, and say so on the record
// (`holdout: 'skipped-noop'`). A round with a real patch still runs it exactly once.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return { root, dir }
}

function fakeRuntime(dir) {
  const events = []
  return {
    events,
    home: dir,
    append(_view, type, data) {
      events.push({ type, data })
      return data
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

const REPORT = JSON.stringify({ changed: [], why: 'already satisfied', evidence: 'the check passes on a clean tree', openQuestions: [], confidence: 0.9, nextHint: '' })

function stateFor(workspace, holdoutCmd) {
  return {
    id: 'noop-holdout',
    status: 'running',
    workspace,
    rounds: [],
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: {
      tasks: [{ id: 't1', verify: { cmd: `"${process.execPath}" -e "process.exit(0)"` } }],
      holdout: ['suite'],
      suite: { id: 'suite', verify: { cmd: holdoutCmd } },
    },
    chain: {
      activeVersion: 1,
      versions: [
        {
          version: 1,
          spec: {
            name: 'quick',
            version: 1,
            params: { candidates: 1, maxSteps: 10 },
            nodes: [
              { id: 'work', type: 'agent', name: 'worker', prompt: 'do it' },
              { id: 'check', type: 'verifier', name: 'check', cmd: 'true' },
            ],
          },
        },
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

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// No-op candidate: the holdout must not run at all, and the round must still land.
{
  const { root, dir } = repo('noop-holdout-a')
  const counter = join(root, 'holdout.txt')
  const cmd = `"${process.execPath}" -e "require('fs').appendFileSync(${JSON.stringify(counter)},'x')"`
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, cmd), dir: join(root, 'campaign') }
  const dispatcher = {
    async run() {
      // changes nothing: a no-op candidate
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 'noop', durationMs: 1 }
    },
  }

  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })

  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.promoted, true, 'a no-op that verifies still lands')
  assert.equal(finished.holdout, 'skipped-noop', 'and says the holdout had nothing to hold out')
  assert.equal(finished.holdoutRuns, 0, 'the holdout command did not run')
  assert.equal(finished.holdoutMs, 0)
  let ran = ''
  try {
    ran = readFileSync(counter, 'utf8')
  } catch {
    ran = ''
  }
  assert.equal(ran, '', 'the holdout side effect never happened')
  ok('a no-op round does not pay for the holdout gate')

  rmSync(root, { recursive: true, force: true })
}

// Real patch: the holdout runs exactly once, as before.
{
  const { root, dir } = repo('noop-holdout-b')
  const counter = join(root, 'holdout.txt')
  const cmd = `"${process.execPath}" -e "require('fs').appendFileSync(${JSON.stringify(counter)},'x')"`
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, cmd), dir: join(root, 'campaign') }
  const dispatcher = {
    async run(_prompt, opts) {
      writeFileSync(join(opts.cwd, 'solved.txt'), 'solved\n')
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 'real', durationMs: 1 }
    },
  }

  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })

  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.holdoutRuns, 1, 'a real patch still gets a second opinion')
  assert.equal(readFileSync(counter, 'utf8'), 'x', 'exactly one holdout run')
  ok('a real patch still pays for the holdout gate, once')

  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
