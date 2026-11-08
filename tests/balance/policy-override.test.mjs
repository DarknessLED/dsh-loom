// A/B testing the loop's own policy cannot require editing the profile's loader
// config and restarting the host - that is a whole-day round trip, and it makes
// every comparison a different build.
//
// So the campaign itself must be able to carry a policy override: "this campaign
// runs without the planner" is a fact about the campaign, recorded in its own log,
// and the round reads it from there. An override that is not understood is a
// rejected override - silently accepting it would let a typo pass as an experiment.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound, policyFor } from '../../src/runtime/round.js'

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

const REPORT = JSON.stringify({
  changed: ['keep.txt'],
  why: 'the spec asks for it',
  evidence: 'node tests/x',
  openQuestions: [],
  confidence: 0.6,
  nextHint: '',
})

function stateFor(workspace, extra = {}) {
  return {
    id: 'policy',
    status: 'running',
    workspace,
    rounds: [],
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
            params: { candidates: 1, maxSteps: 10 },
            nodes: [
              { id: 'plan', type: 'agent', name: 'planner', prompt: 'plan the work' },
              { id: 'work', type: 'agent', name: 'worker', prompt: 'do it' },
              { id: 'check', type: 'verifier', name: 'check', cmd: 'true' },
            ],
          },
        },
      ],
    },
    ...extra,
  }
}

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1, stallMs: 300_000 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel', planMode: 'full' },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
    ...over,
  }
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. The campaign's own policy wins over the loader config, and the result says
//    where each value came from.
{
  const cfg = config()
  const decided = policyFor({ config: cfg, campaign: { policy: { planMode: 'off', minGain: 0.2 } } })
  assert.equal(decided.planMode, 'off', 'the campaign override wins')
  assert.equal(decided.minGain, 0.2)
  assert.equal(decided.sources.planMode, 'campaign')
  assert.equal(decided.sources.minGain, 'campaign')

  const plain = policyFor({ config: cfg, campaign: {} })
  assert.equal(plain.planMode, 'full', 'without an override the config applies')
  assert.equal(plain.sources.planMode, 'config')
  ok('a campaign carries its own policy, and the decision records the source')
}

// 2. An override that is not understood is rejected, not ignored: a typo must not
//    look like a successful experiment.
{
  const decided = policyFor({ config: config(), campaign: { policy: { planMode: 'sometimes', minGain: -1 } } })
  assert.equal(decided.planMode, 'full', 'an invalid override falls back to the config')
  assert.equal(decided.minGain, 0.05)
  assert.deepEqual(decided.rejected, ['planMode', 'minGain'])
  ok('an unknown override is rejected by name')
}

// 3. And the round actually obeys it: no planner dispatched, planMs reported as 0.
{
  const labels = []
  const { root, dir } = repo('policy-run')
  const runtime = fakeRuntime(join(root, 'campaign'))
  const view = { state: stateFor(dir, { policy: { planMode: 'off' } }), dir: join(root, 'campaign') }
  const dispatcher = {
    async run(_prompt, { label }) {
      labels.push(label)
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 's', durationMs: 1 }
    },
  }
  await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  assert.equal(finished.planMode, 'off')
  assert.equal(finished.planMs, 0)
  assert.equal(labels.some((l) => String(l).includes('plan')), false, 'the campaign override reached the round')
  ok('the round obeys the campaign policy, not just the config')
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
