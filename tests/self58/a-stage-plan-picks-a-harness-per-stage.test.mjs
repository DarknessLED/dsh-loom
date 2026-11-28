// A workflow that picks a harness per stage, and changes nothing when it is off.
//
// The operator asked for a switch beside the permission control: one pill for the
// loop, one for "dispatch", which plans the workflow first and then gives each
// stage the harness that suits it. The honest version of that on this machine is
// narrow, because there is one model family: the stages differ in *how* the work
// is framed and which preset the child runs under, not in which model answers.
//
// Two rules make the switch safe to leave alone:
//   * off is the default, and off must be byte-identical to today -- no plan is
//     computed, so nothing downstream can read a stage that was invented here;
//   * a stage a campaign never configured still gets a harness, because a plan
//     with a hole in it is worse than no plan: it silently drops a stage.
//   node tests/self58/a-stage-plan-picks-a-harness-per-stage.test.mjs
import assert from 'node:assert/strict'

import { DEFAULT_CONFIG } from '../../src/core/config.js'
import { STAGES, dispatchPlan, harnessFor, presetFor, stageOf } from '../../src/dispatch/stage-plan.js'
import { ok, done } from '../chaos/fixture.mjs'

const stages = {
  plan: { harness: 'planning', preset: 'loom-planner' },
  implement: { harness: 'implementation', preset: null },
  verify: { harness: 'verification', preset: 'loom-verifier' },
}
const on = { session: { dispatch: { enabled: true, stages } } }
const off = { session: { dispatch: { enabled: false, stages } } }

// 1. The shipped default is off, and off computes nothing at all.
{
  assert.equal(DEFAULT_CONFIG.session.dispatch.enabled, false, 'dispatch is off unless an operator turns it on')
  assert.equal(dispatchPlan({ task: { id: 't1' }, config: DEFAULT_CONFIG }), null, 'off returns nothing, not an empty plan')
  assert.equal(dispatchPlan({ task: { id: 't1' }, config: off }), null, 'an explicit false is the same as the default')
  ok('the dispatch switch is off by default, and off computes nothing')
}

// 2. On: the workflow is the ordered stage list, each with its own harness.
{
  const plan = dispatchPlan({ task: { id: 't1' }, config: on })
  assert.ok(plan, 'an enabled switch returns a plan')
  assert.deepEqual(plan.stages.map((s) => s.stage), STAGES, 'the workflow is the declared order')
  assert.deepEqual(plan.stages.map((s) => s.harness), ['planning', 'implementation', 'verification'], 'each stage names its harness')
  assert.equal(plan.stage, 'implement', 'a task that says nothing runs in the implementing stage')
  assert.equal(plan.harness, 'implementation', 'and the harness follows the stage')
  assert.match(plan.why, /implement/, 'the plan says why this stage')
  ok('an enabled switch returns the ordered stage list with one harness per stage')
}

// 3. A task may declare its stage, and an unknown one is not silently accepted.
{
  assert.equal(stageOf({ stage: 'verify' }), 'verify', 'a declared stage is used')
  assert.equal(stageOf({}), 'implement', 'a task that says nothing implements')
  assert.equal(stageOf({ stage: 'review' }), 'implement', 'a stage this loop does not know is not invented')
  assert.equal(stageOf(null), 'implement', 'no task at all still implements')
  const plan = dispatchPlan({ task: { id: 't2', stage: 'verify' }, config: on })
  assert.equal(plan.stage, 'verify')
  assert.equal(plan.harness, 'verification')
  assert.equal(presetFor(plan, 'verify'), 'loom-verifier', 'the stage that declared a preset gets it')
  ok('a task can declare its stage, and an unknown stage falls back instead of inventing one')
}

// 4. A hole in the configuration is filled, not dropped.
{
  const sparse = { session: { dispatch: { enabled: true, stages: { implement: { harness: 'tests-first' } } } } }
  const plan = dispatchPlan({ task: { id: 't3' }, config: sparse })
  assert.equal(plan.stages.find((s) => s.stage === 'implement').harness, 'tests-first', 'the configured harness wins')
  assert.equal(plan.stages.find((s) => s.stage === 'plan').harness, 'plan', 'an unconfigured stage is named after itself')
  assert.equal(presetFor(plan, 'plan'), null, 'and has no preset rather than a guessed one')
  assert.equal(presetFor(plan, 'nope'), null, 'a stage outside the plan has no preset')
  assert.equal(harnessFor('verify', DEFAULT_CONFIG), 'verification', 'harnessFor answers for the shipped config too')
  ok('an unconfigured stage is named after itself rather than dropped from the plan')
}

done()
