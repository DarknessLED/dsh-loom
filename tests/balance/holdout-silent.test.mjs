// The no-op holdout gate has a third case, and the ledger says it has never
// fired - which is exactly why it is worth pinning.
//
// src/runtime/round.js decides:
//
//     const claimedWork = Array.isArray(best?.report?.changed) && best.report.changed.length > 0
//     const skipHoldout = checks.noop && !claimedWork
//
// The comment above it says a candidate that *reports changed files* with no
// captured diff is a capture problem, so the holdout still applies. Good. But
// `report` is null whenever the worker emitted no parsable report at all, and
// an unparsable report is not a claim of "I changed nothing" - it is no claim.
// Measured over this ledger: 403 of 883 attempts carry a report that failed
// validation, 188 of those changed zero bytes. None of them happened to land
// as a no-op inside a campaign that had a holdout pool, so nothing has gone
// wrong yet. The rule still reads the absence of a report as evidence.
//
// So: only a *valid* report that says "changed: []" may skip the gate.
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

function stateFor(workspace, holdoutCmd) {
  return {
    id: 'noop-silent',
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
              { id: 'check', type: 'verifier', name: 'check', cmd: `"${process.execPath}" -e "process.exit(0)"` },
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

// Zero bytes changed, no valid report: this is unproven, so the holdout runs.
{
  const { root, dir } = repo('noop-silent-a')
  const counter = join(root, 'holdout.txt')
  const cmd = `"${process.execPath}" -e "require('fs').appendFileSync(${JSON.stringify(counter)},'x')"`
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, cmd), dir: join(root, 'campaign') }
  const dispatcher = {
    async run() {
      // A worker that says things in prose and never emits the report block.
      return { stopReason: 'completed', failureKind: 'ok', text: 'I looked at it and it seems fine.', structured: null, timedOut: false, error: null, sessionId: 'silent', durationMs: 1 }
    },
  }

  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })

  const attempt = runtime.events.find((e) => e.type === 'attempt.finished')?.data
  const finished = runtime.events.find((e) => e.type === 'round.finished')?.data
  assert.equal(attempt.reportError, 'no-json-block', 'the fixture really produced no report')
  assert.equal(finished.holdoutRuns, 1, 'a missing report is not evidence that nothing changed')
  assert.notEqual(finished.holdout, 'skipped-noop')
  assert.equal(readFileSync(counter, 'utf8'), 'x', 'the holdout command really ran')
  ok('a silent candidate does not get the gate skipped for it')

  rmSync(root, { recursive: true, force: true })
}

// The case that may skip: a valid report that states it changed nothing.
{
  const { root, dir } = repo('noop-silent-b')
  const counter = join(root, 'holdout.txt')
  const cmd = `"${process.execPath}" -e "require('fs').appendFileSync(${JSON.stringify(counter)},'x')"`
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, cmd), dir: join(root, 'campaign') }
  const empty = JSON.stringify({ changed: [], why: 'already satisfied', evidence: ['the check passes on a clean tree'], openQuestions: [], confidence: 0.9, nextHint: '' })
  const dispatcher = {
    async run() {
      return { stopReason: 'completed', failureKind: 'ok', text: empty, structured: null, timedOut: false, error: null, sessionId: 'empty', durationMs: 1 }
    },
  }

  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })

  const finished = runtime.events.find((e) => e.type === 'round.finished')?.data
  assert.equal(finished.holdout, 'skipped-noop', 'a stated no-op still skips the gate')
  assert.equal(finished.holdoutRuns, 0)
  assert.equal(finished.promoted, true, 'and the no-op still lands')
  ok('a stated no-op is still allowed to skip the gate')

  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
