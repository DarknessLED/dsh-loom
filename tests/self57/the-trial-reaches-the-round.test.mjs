// The trial has to reach the round, not just exist as a module.
//
// A comparison that nothing feeds is a document. These checks run real rounds on
// the fixture and pin the three things that make the trial live: the arm is
// decided before the round runs and recorded on it, the round's reading follows
// the arm rather than the previous outcome, and the status a person reads shows
// the comparison instead of a rule's output.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { makeRepo, makeRuntime, baseConfig, fakeDispatcher } from '../self22/fixture.mjs'
import { runRound } from '../../src/runtime/round.js'
import { assignArm, compareResearchArms } from '../../src/loop/research-trial.js'
import { POLICY_DEFAULTS, normalizePolicy } from '../../src/loop/policy.js'
import { reduce } from '../../src/core/reduce.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ok = (name) => console.log(`ok ${name}`)

const task = {
  id: 't1',
  prompt: 'make it pass',
  verify: { cmd: 'exit 1' },
}

function taskRound({ mode = 'trial', state = {} } = {}) {
  const repo = makeRepo()
  const { runtime, view } = makeRuntime({ repo, tasks: [task] })
  // A copy, not the array itself: `projectRound` appends the finished round to
  // `state.rounds`, so sharing the array would push twice and the spec would then
  // be counting its own bookkeeping as round records.
  Object.assign(view.state, { ...state, rounds: [...(state.rounds ?? [])] })
  const config = baseConfig({
    loopPolicy: { researchMode: mode },
    research: { enabled: true, depth: 'quick', fetchTop: 0, timeoutMs: 5000 },
  })
  runtime.ctx = {}
  return { repo, runtime, view, config }
}

async function oneRound(n, rounds) {
  const { runtime, view, config } = taskRound({ state: { rounds } })
  await runRound({
    runtime,
    view,
    config,
    dispatcher: fakeDispatcher([]),
    log: () => {},
    notify: () => {},
  })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').pop()
  assert.ok(finished, `round ${n} never finished`)
  return { runtime, view, finished }
}

test('trial is a policy value, not a typo that silently disarms the leg', () => {
  const p = normalizePolicy({ researchMode: 'trial' })
  assert.equal(p.researchMode, 'trial')
  assert.equal(POLICY_DEFAULTS.researchMode, 'auto', 'auto stays the default: a trial costs money')
  ok('trial is a policy value, not a typo that silently disarms the leg')
})

test('the arm is written on the round, and the round reads only in the reading arm', async () => {
  const rounds = []
  for (let n = 1; n <= 6; n += 1) {
    const { view, finished } = await oneRound(n, rounds)
    const arm = finished.data.researchTrial?.arm
    assert.ok(arm === 'full' || arm === 'off', `round ${n} recorded no arm`)
    assert.equal(arm, assignArm({ campaign: view.state.id, round: n }), 'the recorded arm must be the derivable one')
    assert.equal(finished.data.research.mode, arm, 'the leg followed a different mode than the arm it recorded')
    rounds.push({ n, ...finished.data })
  }
  const arms = rounds.map((r) => r.researchTrial.arm)
  assert.ok(arms.includes('full') && arms.includes('off'), `six rounds landed in one arm: ${arms.join(',')}`)
  ok('the arm is written on the round, and the round reads only in the reading arm')
})

test('the trial does not consult the previous outcome to pick an arm', async () => {
  // A run of wins would make `auto` answer `off` for every later round. Under the
  // trial the arm must depend on (campaign, round) alone.
  const history = []
  for (let n = 1; n <= 4; n += 1) {
    history.push({ n, status: 'promoted', promoted: true, score: 1, research: { mode: 'full', used: false } })
  }
  const { view, finished } = await oneRound(5, history)
  assert.equal(finished.data.researchTrial?.arm, assignArm({ campaign: view.state.id, round: 5 }))
  ok('the trial does not consult the previous outcome to pick an arm')
})

test('a campaign with no trial records no arm at all', async () => {
  const { runtime, view, config } = taskRound({ mode: 'auto', state: { rounds: [] } })
  await runRound({
    runtime,
    view,
    config,
    dispatcher: fakeDispatcher([]),
    log: () => {},
    notify: () => {},
  })
  const finished = runtime.events.filter((e) => e.type === 'round.finished').pop()
  assert.equal(finished.data.researchTrial, undefined, 'an auto round must not look like a trial round')
  ok('a campaign with no trial records no arm at all')
})

test('the fold keeps the arm, so the comparison can see the round', () => {
  const state = reduce([
    { t: 1, type: 'round.started', data: { n: 1, taskId: 't1', chainVersion: 1 } },
    {
      t: 2,
      type: 'round.finished',
      data: { n: 1, taskId: 't1', status: 'no-gain', score: 0, promoted: false, researchTrial: { arm: 'off' } },
    },
  ])
  const round = state.rounds.find((r) => r.n === 1)
  assert.ok(round.researchTrial, 'reduce dropped `researchTrial`: every trial campaign reports "not started"')
  assert.equal(round.researchTrial.arm, 'off')
  ok('the fold keeps the arm, so the comparison can see the round')
})

test('the status a person reads carries the comparison, not the rule', () => {
  const source = readFileSync(join(HERE, '..', '..', 'src', 'tools', 'index.js'), 'utf8')
  assert.match(source, /compareResearchArms\(/, 'rsi_status never computes the trial comparison')
  const panel = readFileSync(join(HERE, '..', '..', 'src', 'panel', 'api.js'), 'utf8')
  assert.match(panel, /compareResearchArms\(/, 'the panel never computes the trial comparison')
  ok('the status a person reads carries the comparison, not the rule')
})

test('a campaign that ran no trial does not print a zero row', () => {
  const { sentence, n } = compareResearchArms({ rounds: [{ n: 1, promoted: true, status: 'promoted' }] })
  assert.equal(n, 0)
  assert.match(sentence, /not started/i)
  ok('a campaign that ran no trial does not print a zero row')
})
