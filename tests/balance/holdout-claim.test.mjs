// The third case the no-op gate needs: a candidate that verified with no
// captured diff but *says* it changed files.
//
// This came out of correcting a claim of mine. I had written, in the R1
// research reading, that `claimedWork` lets an agent skip the holdout by
// naming a file. Re-reading src/runtime/round.js:2440 says the opposite:
//
//     const skipHoldout = checks.noop && !claimedWork
//
// Claiming work sets claimedWork, so !claimedWork is false and skipHoldout is
// false: the holdout still runs. The flag makes the gate *stricter*, not
// looser - it is the capture-failure escape hatch described in the comment
// above it. A reading that has the direction backwards is worse than no
// reading, so the direction is pinned here rather than left to the comment.
//
// What the code actually trusts is the agent's *silence*: an attempt that
// changes nothing and reports nothing skips the holdout. That is defensible
// (there is no new byte for a second opinion to check), but it is the surface
// worth watching, and it is named at the bottom of this file.
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
    id: 'noop-claim',
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

// No captured patch, but the report names a file: the holdout must still run.
{
  const { root, dir } = repo('noop-claim-a')
  const counter = join(root, 'holdout.txt')
  const cmd = `"${process.execPath}" -e "require('fs').appendFileSync(${JSON.stringify(counter)},'x')"`
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, cmd), dir: join(root, 'campaign') }
  // A *valid* report, because an invalid one is treated as claiming nothing -
  // see the second half of this file, which is where the real surface is.
  const claimed = JSON.stringify({
    changed: ['src/somewhere.js'],
    why: 'I fixed it',
    evidence: ['the verifier passes'],
    openQuestions: [],
    confidence: 0.8,
    nextHint: '',
  })
  const dispatcher = {
    async run() {
      // Touches nothing: if the capture is honest this is a no-op, and the
      // agent's claim of work is the only thing that can contradict it.
      return { stopReason: 'completed', failureKind: 'ok', text: claimed, structured: null, timedOut: false, error: null, sessionId: 'claim', durationMs: 1 }
    },
  }

  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })

  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.holdoutRuns, 1, 'a claim of work without a captured patch still gets the second opinion')
  assert.notEqual(finished.holdout, 'skipped-noop', 'and the record does not say it was skipped')
  assert.equal(readFileSync(counter, 'utf8'), 'x', 'the holdout command really ran')
  ok('claiming work makes the gate stricter, not looser')

  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
