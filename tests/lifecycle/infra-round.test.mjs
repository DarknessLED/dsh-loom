// A round where every child died of infrastructure must not be scored.
//
// Seen live (loom-acc3, rounds 3-13): every attempt came back in ~1.1 s with
// `{failureKind:'died', error:'child session ended in error with no diagnostic
// (parent or provider unavailable)'}` - the model emitting two tool-call JSON
// objects glued together, and a context-length 400, both of which end the child
// turn with an error the subagent layer reports as no diagnostic at all.
//
// The round then closed as `no-gain` with score 0 and eleven rounds of budget
// bought eleven pieces of false evidence: the task looked unsolvable because the
// provider was broken. A score is a measurement of a patch that ran. Nothing ran
// here, so the round must say so - interrupted, retryable, unscored - and the
// plateau detector must not read a provider outage as the loop stalling.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound, bestPriorScore } from '../../src/runtime/round.js'
import { plateauReached } from '../../src/runtime/plateau.js'

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
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', verify: { cmd: 'true' } }], holdout: [] },
    chain: {
      activeVersion: 1,
      versions: [
        {
          version: 1,
          spec: {
            name: 'quick',
            version: 1,
            params: { candidates: 2, maxSteps: 10 },
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

// What the dispatcher really returns when the model layer breaks mid-turn.
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

// 1. Every attempt died of infrastructure: interrupted, retryable, unscored.
{
  const { root, dir } = repo('infra')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: { run: async () => ({ ...silent }) },
    log: () => {},
  })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)
  assert.equal(finished.length, 1)
  assert.equal(finished[0].status, 'interrupted', 'a provider outage is not a verdict on the task')
  assert.equal(finished[0].retryable, true, 'the round is worth repeating once the provider is back')
  assert.equal(finished[0].score, null, 'nothing ran, so there is no score - not even 0')
  assert.equal(finished[0].promoted, false)
  ok('a round killed by infrastructure is interrupted, never scored 0')

  // 2. And it may not become standing evidence against the task.
  assert.equal(
    bestPriorScore([{ n: 1, status: 'interrupted', score: null, attempts: [] }], 't1', 2),
    null,
    'an infrastructure round is not a prior score',
  )
  ok('an infrastructure round is not evidence against the task')

  rmSync(root, { recursive: true, force: true })
}

// 3. One attempt measured and one died of infrastructure is still a real round:
//    a verdict exists, so it closes normally instead of hiding behind "interrupted".
{
  const { root, dir } = repo('mixed')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  let n = 0
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: {
      run: async () => {
        n += 1
        return n === 1 ? { ...silent } : { stopReason: 'completed', failureKind: 'ok', infra: false, text: 'done', timedOut: false }
      },
    },
    log: () => {},
  })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)
  assert.equal(finished[0].status, 'no-gain', 'one attempt that really ran still gives the round a verdict')
  assert.equal(finished[0].score, 0)
  ok('a mixed round still closes on the attempt that ran')

  rmSync(root, { recursive: true, force: true })
}

// 4. A child that dies *with* a diagnosis is a real failure, not infrastructure:
//    it stays no-gain, or every broken patch would be laundered as "retryable".
{
  const { root, dir } = repo('diagnosed')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir), dir: join(root, 'campaign') }
  await runRound({
    runtime,
    view,
    config: config(),
    dispatcher: {
      run: async () => ({
        stopReason: 'error',
        failureKind: 'died',
        infra: false,
        error: 'child process exited with code 3',
        text: '',
        timedOut: false,
      }),
    },
    log: () => {},
  })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)
  assert.equal(finished[0].status, 'no-gain', 'a diagnosed child death is a real failed attempt')
  assert.equal(finished[0].retryable, undefined)
  ok('a diagnosed death is not laundered as infrastructure')

  rmSync(root, { recursive: true, force: true })
}

// 5. A provider outage is not a plateau. Three interrupted rounds in a row say
//    nothing about the task, so the loop must not be told it is stuck - that is
//    what sent a human to "adjust the objective or stop the campaign" while the
//    real fix was to wait for the provider.
{
  const interrupted = (n) => ({ n, status: 'interrupted', score: null, promoted: false })
  assert.equal(
    plateauReached([interrupted(1), interrupted(2), interrupted(3)], { window: 3 }),
    false,
    'rounds nobody ran are not evidence of a plateau',
  )
  assert.equal(
    plateauReached([interrupted(1), interrupted(2), { n: 3, status: 'no-gain', score: 0, promoted: false }], { window: 3 }),
    false,
    'one real measurement is not a plateau either',
  )
  assert.equal(
    plateauReached(
      [
        { n: 1, status: 'no-gain', score: 0, promoted: false },
        { n: 2, status: 'no-gain', score: 0, promoted: false },
        { n: 3, status: 'no-gain', score: 0, promoted: false },
      ],
      { window: 3 },
    ),
    true,
    'three measured flat rounds are still a plateau',
  )
  ok('a plateau needs rounds that actually ran')
}

console.log(`\n${pass}/${pass} passed`)
