// A loop that keeps spending rounds on a broken provider must stop and say so.
//
// Seen live (loom-acc4, 2026-11-10): the provider broke mid-turn - the model emitted
// two tool-call JSON objects glued together - so every child died in ~1.2 s with no
// diagnostic. With the honest classification in place each round now closes as
// `interrupted` instead of scoring 0, which is right, but the campaign still ticked
// straight into the next round: six rounds and six children in ninety seconds, and
// not one of them could have learned anything about the task.
//
// "The main agent is idle" is only an improvement if the loop knows when it is
// wasting the operator's budget. Three infrastructure rounds in a row is not a hard
// task, it is a broken machine: pause the campaign and raise exactly one checkpoint
// that names the provider, so a human is told the true reason instead of being
// invited to "adjust the objective".
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound, consecutiveInfraRounds } from '../../src/runtime/round.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

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

function fakeRuntime(campaignDir) {
  const events = []
  return {
    events,
    home: campaignDir,
    append(_view, type, data) {
      events.push({ type, data })
      return data
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2, stallMs: 300_000 },
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

function stateFor(workspace, rounds = []) {
  return {
    id: 'infra',
    status: 'running',
    workspace,
    rounds,
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0, roundsUsed: rounds.length },
    evalset: { tasks: [{ id: 't1', verify: { cmd: 'true' } }], holdout: [] },
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

const infraRound = (n) => ({ n, status: 'interrupted', reason: 'infrastructure', score: null, promoted: false, attempts: [] })
const flatRound = (n) => ({ n, status: 'no-gain', score: 0, promoted: false, attempts: [] })

const silent = {
  stopReason: 'error',
  failureKind: 'died',
  infra: true,
  error: 'child session ended in error with no diagnostic (parent or provider unavailable)',
  text: '',
  timedOut: false,
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. The streak is readable from the log alone: trailing interrupted rounds that say
//    they were interrupted by infrastructure, and nothing else.
{
  assert.equal(consecutiveInfraRounds([infraRound(1), infraRound(2)]), 2)
  assert.equal(consecutiveInfraRounds([infraRound(1), flatRound(2)]), 0, 'a measured round breaks the streak')
  assert.equal(consecutiveInfraRounds([]), 0)
  assert.equal(consecutiveInfraRounds(undefined), 0)
  assert.equal(
    consecutiveInfraRounds([{ n: 1, status: 'interrupted', reason: 'dispatcher-disposed' }]),
    0,
    'a re-apply is a different problem and does not count as a provider outage',
  )
  ok('the infrastructure streak is countable from the ledger')
}

// 2. Two silent rounds behind it, and this one is the third: the campaign pauses
//    instead of ticking into a fourth, and says why exactly once.
{
  const { root, dir } = repo('pause')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, [infraRound(1), infraRound(2)]), dir: join(root, 'campaign') }
  view.state.budget.roundsUsed = 2
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: { run: async () => ({ ...silent }) },
    log: () => {},
  })
  const statuses = runtime.events.filter((e) => e.type === 'campaign.status').map((e) => e.data)
  assert.equal(statuses.length, 1, 'exactly one status change')
  assert.equal(statuses[0].status, 'paused', 'the loop stops spending on a broken provider')
  assert.equal(statuses[0].reason, 'infrastructure')
  const raised = runtime.events.filter((e) => e.type === 'checkpoint.raised').map((e) => e.data)
  assert.equal(raised.length, 1, 'one question, not one per tick')
  assert.equal(raised[0].kind, 'infrastructure', 'and it names the real cause')
  assert.match(String(raised[0].payload?.message ?? ''), /provider|diagnostic|infrastructure/i)
  ok('three infrastructure rounds in a row pause the campaign, once')

  rmSync(root, { recursive: true, force: true })
}

// 3. One infrastructure round is not a pattern: the campaign keeps going.
{
  const { root, dir } = repo('single')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, []), dir: join(root, 'campaign') }
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: { run: async () => ({ ...silent }) },
    log: () => {},
  })
  assert.equal(runtime.events.filter((e) => e.type === 'campaign.status').length, 0, 'one bad round is not a pattern')
  assert.equal(runtime.events.filter((e) => e.type === 'checkpoint.raised').length, 0)
  ok('a single infrastructure round does not pause anything')

  rmSync(root, { recursive: true, force: true })
}

// 4. A round that actually ran resets the count, even if infrastructure rounds sit
//    further back: the provider recovered, so the streak is over.
{
  const { root, dir } = repo('reset')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, [infraRound(1), flatRound(2)]), dir: join(root, 'campaign') }
  view.state.budget.roundsUsed = 2
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: { run: async () => ({ ...silent }) },
    log: () => {},
  })
  assert.equal(runtime.events.filter((e) => e.type === 'campaign.status').length, 0, 'the streak restarted at 1')
  ok('a measured round resets the streak')

  rmSync(root, { recursive: true, force: true })
}

// 5. The threshold is a policy, not a constant: an operator on a flaky provider can
//    ask for a shorter fuse, and an operator sticking with a long retry can ask for a
//    longer one.
{
  const { root, dir } = repo('policy')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, [infraRound(1)]), dir: join(root, 'campaign') }
  view.state.budget.roundsUsed = 1
  await runRound({
    runtime,
    view,
    config: config({ loopPolicy: { halving: false, candidateMode: 'parallel', infraPauseAfter: 2 } }),
    dispatcher: { run: async () => ({ ...silent }) },
    log: () => {},
  })
  const statuses = runtime.events.filter((e) => e.type === 'campaign.status').map((e) => e.data)
  assert.equal(statuses[0]?.status, 'paused', 'infraPauseAfter: 2 pauses on the second round')
  ok('the fuse length is configurable')

  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
