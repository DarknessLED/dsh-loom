// loom-bal1 taught the loop to *price* a second candidate: `admitSecondCandidate`
// returns ev = p(1-p)*roundMs - tailMs - marginMs and refuses when that is <= 0.
//
// But nothing asks it. A priced decision that no round consults is a comment with
// a test attached: every round still plans two candidates, which is exactly the
// waste the research measured (second candidate = 55% of candidate time, zero
// score advantage in 3 of 3 rounds).
//
// So the gate has to be wired: when the record says the second opinion is not
// worth its tail, the round plans one candidate - and says so.
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

const REPORT = JSON.stringify({ changed: ['keep.txt'], why: 'x', evidence: 'y', openQuestions: [], confidence: 0.5, nextHint: '' })

function stateFor(workspace, rounds) {
  return {
    id: 'ab',
    status: 'running',
    workspace,
    rounds,
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', verify: { cmd: `"${process.execPath}" -e "process.exit(0)"` } }], holdout: [] },
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

const dispatcher = {
  async run(_prompt, { label }) {
    return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: String(label), durationMs: 1 }
  },
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// Two rounds where every candidate already scored a perfect 1: the second opinion
// has never once changed the answer. p = 1 => ev < 0 => do not buy it.
{
  const { root, dir } = repo('ab-skip')
  const rounds = [
    { n: 1, status: 'promoted', landed: true, score: 1, durationMs: 600_000, planMs: 120_000, attempts: [{ id: 'r1a1', score: 1, verifierOk: true }, { id: 'r1a2', score: 1, verifierOk: true }] },
    { n: 2, status: 'promoted', landed: true, score: 1, durationMs: 620_000, planMs: 120_000, attempts: [{ id: 'r2a1', score: 1, verifierOk: true }, { id: 'r2a2', score: 1, verifierOk: true }] },
  ]
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, rounds), dir: join(root, 'campaign') }
  const started = Date.now()
  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.candidatesPlanned, 1, 'the record says the second opinion is not worth its tail')
  assert.equal(finished.attemptCount, 1, 'so only one candidate runs')
  assert.equal(finished.candidateModeSource, 'evidence', 'and the round says why it planned fewer')
  assert.equal(finished.secondCandidate?.admit, false, 'the refusal is on the record, not just the decision')
  assert.equal(typeof finished.secondCandidate?.reason, 'string', 'and so is why it refused')
  ok('a perfect record stops paying for a second opinion')
  rmSync(root, { recursive: true, force: true })
  void started
}

// No record, no refusal: an unknown p is not a licence to skip, and a round that
// has never had two scored candidates must still plan two.
{
  const { root, dir } = repo('ab-keep')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, []), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.candidatesPlanned, 2, 'no history is not evidence')
  assert.equal(finished.attemptCount, 2)
  ok('without a record the round still buys the second opinion')
  rmSync(root, { recursive: true, force: true })
}

// An explicit config beats the record: the operator asked for two candidates.
{
  const { root, dir } = repo('ab-explicit')
  const rounds = [
    { n: 1, status: 'promoted', landed: true, score: 1, durationMs: 600_000, planMs: 0, attempts: [{ id: 'r1a1', score: 1, verifierOk: true }, { id: 'r1a2', score: 1, verifierOk: true }] },
    { n: 2, status: 'promoted', landed: true, score: 1, durationMs: 600_000, planMs: 0, attempts: [{ id: 'r2a1', score: 1, verifierOk: true }, { id: 'r2a2', score: 1, verifierOk: true }] },
  ]
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, rounds), dir: join(root, 'campaign') }
  await runRound({ runtime, view, config: config({ loopPolicy: { halving: false, candidateMode: 'parallel', secondCandidate: 'always' } }), dispatcher, log: () => {} })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.candidatesPlanned, 2, 'an explicit instruction is not overruled by statistics')
  assert.equal(finished.candidateModeSource, 'config')
  ok('an explicit secondCandidate:always is not overruled by the record')
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
