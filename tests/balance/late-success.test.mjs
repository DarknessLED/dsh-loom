// A successful answer that arrives after the budget expired is not a success.
//
// Right now the round trusts whatever the dispatcher hands back: if a child
// session wakes up after its deadline and reports "completed" with a patch that
// happens to verify, the round promotes it. The budget then means nothing - a
// stuck attempt can come back the next morning and claim the round.
//
// This pins the invariant: once the round's own deadline passed, a late answer is
// recorded as a timeout, and the round does not promote on it. The default budget
// is also tightened to ten minutes (20 minutes only delays recovery; measured
// attempts land in 250-700s).
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound } from '../../src/runtime/round.js'
import { DEFAULT_CONFIG } from '../../src/core/config.js'

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

const REPORT = JSON.stringify({ changed: ['solved.txt'], why: 'x', evidence: 'y', openQuestions: [], confidence: 0.5, nextHint: '' })

function stateFor(workspace) {
  return {
    id: 'late',
    status: 'running',
    workspace,
    rounds: [],
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: {
      tasks: [{ id: 't1', verify: { cmd: 'node -e "process.exit(require(\'fs\').existsSync(\'solved.txt\')?0:1)"' } }],
      holdout: [],
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

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1, stallMs: 300_000 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
    ...over,
  }
}

// A dispatcher that ignores its deadline, works long past it, then answers as if
// nothing happened - and produces a patch that verifies.
function slowWinner(ms) {
  return {
    async run(_prompt, opts) {
      await new Promise((resolve) => setTimeout(resolve, ms))
      writeFileSync(join(opts.cwd, 'solved.txt'), 'solved\n')
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 'slow', durationMs: ms }
    },
  }
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// The point of this pin is that an attempt has a budget at all, and that it is
// comfortably under twenty minutes; the exact number is measured elsewhere
// (tests/balance/deadline-shape.test.mjs sets it above the tail of the attempts
// that succeed, which ten minutes was cutting into).
assert.ok(
  DEFAULT_CONFIG.session.attemptTimeoutMs > 0 && DEFAULT_CONFIG.session.attemptTimeoutMs < 20 * 60_000,
  'an attempt has a budget well under twenty minutes',
)
ok('the default attempt budget is bounded')

// Late answer: the round must not promote on a promise its deadline already broke.
{
  const { root, dir } = repo('late-a')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config({ session: { attemptTimeoutMs: 200, maxConcurrent: 1, stallMs: 300_000 } }), dispatcher: slowWinner(700), log: () => {} })

  const finished = runtime.events.filter((e) => e.type === 'attempt.finished').map((e) => e.data)[0]
  assert.equal(finished.timedOut, true, 'an answer after the deadline is a timeout, whatever it says about itself')
  assert.equal(finished.failureKind, 'timeout')
  const round = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(round.promoted, false, 'and it promotes nothing')
  assert.equal(runtime.events.some((e) => e.type === 'artifact.promoted'), false)
  ok('a late answer is a timeout, not a win')
  rmSync(root, { recursive: true, force: true })
}

// The same dispatcher inside its budget is still allowed to win: the rule is about
// the deadline, not about slowing everything down.
{
  const { root, dir } = repo('late-b')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config({ session: { attemptTimeoutMs: 60_000, maxConcurrent: 1, stallMs: 300_000 } }), dispatcher: slowWinner(300), log: () => {} })

  const finished = runtime.events.filter((e) => e.type === 'attempt.finished').map((e) => e.data)[0]
  assert.equal(finished.timedOut, false, 'inside the budget the answer is accepted')
  assert.equal(finished.verifierOk, true)
  const round = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(round.promoted, true, 'the same work inside its budget still wins')
  ok('the same work inside its budget still wins')

  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
