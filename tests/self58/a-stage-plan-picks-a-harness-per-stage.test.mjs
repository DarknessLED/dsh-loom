// A workflow that picks a harness per stage, and changes nothing when it is off.
//
// The operator asked for a second switch beside the loop's: one for the loop, one
// for "dispatch", which plans the workflow first and then gives each stage the
// harness that suits it. The honest version of that on this machine is narrow,
// because there is one model family and one harness: the stages differ in *how*
// the work is framed and which preset the child runs under, not in which model
// answers. The measured arm travels on the attempt as `armTarget` -- declared, not
// executed -- so the record says where this round would have gone.
//
// Two rules make the switch safe to leave alone:
//   * off is the default, and off must be byte-identical to today -- no plan is
//     computed, so nothing downstream can read a stage that was invented here;
//   * a stage a campaign never configured still gets a harness, because a plan
//     with a hole in it is worse than no plan: it silently drops a stage.
//   node tests/self58/a-stage-plan-picks-a-harness-per-stage.test.mjs
import assert from 'node:assert/strict'

import { DEFAULT_CONFIG } from '../../src/core/config.js'
import { STAGES, canonicalStage, dispatchPlan, harnessFor, presetFor, stageOf } from '../../src/dispatch/stage-plan.js'
import { ok, done } from '../chaos/fixture.mjs'

const stages = {
  triage: { harness: 'triage', preset: null },
  spec: { harness: 'spec', preset: 'loom-spec' },
  implement: { harness: 'implementation', preset: null },
  verify: { harness: 'verification', preset: 'loom-verifier' },
  review: { harness: 'review', preset: null },
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

// 2. On: the workflow is the ordered stage list, each with its own harness and
//    the arm the benchmark measured for it.
{
  const plan = dispatchPlan({ task: { id: 't1' }, config: on })
  assert.ok(plan, 'an enabled switch returns a plan')
  assert.deepEqual(plan.stages.map((s) => s.stage), STAGES, 'the workflow is the declared order')
  assert.deepEqual(
    plan.stages.map((s) => s.harness),
    ['triage', 'spec', 'implementation', 'verification', 'review'],
    'each stage names its harness',
  )
  assert.deepEqual(
    plan.stages.map((s) => s.arm),
    ['dsh', 'cc', 'codex', 'gcli', 'agy'],
    'and the measured arm of that stage, not a guess',
  )
  assert.equal(plan.stage, 'implement', 'a task that says nothing runs in the implementing stage')
  assert.equal(plan.harness, 'implementation', 'and the harness follows the stage')
  assert.equal(plan.armTarget, 'codex', 'and the arm target is the implementing one')
  assert.ok(plan.armWhy.length > 20, 'the plan carries the reason the arm was chosen')
  assert.match(plan.why, /implement/, 'the plan says why this stage')
  ok('an enabled switch returns the ordered stage list with one harness and one measured arm per stage')
}

// 3. A task may declare its stage, the old vocabulary still resolves, and an
//    unknown name is not silently accepted.
{
  assert.equal(stageOf({ stage: 'verify' }), 'verify', 'a declared stage is used')
  assert.equal(stageOf({ stage: 'review' }), 'review', 'review is a stage now, not a word this loop ignores')
  assert.equal(stageOf({ stage: 'plan' }), 'spec', 'the old name for planning means the spec stage')
  assert.equal(canonicalStage('plan'), 'spec', 'and the alias is stated, not implied')
  assert.equal(canonicalStage('nope'), null, 'an unknown name has no canonical stage')
  assert.equal(stageOf({}), 'implement', 'a task that says nothing implements')
  assert.equal(stageOf({ stage: 'nope' }), 'implement', 'a stage this loop does not know is not invented')
  assert.equal(stageOf(null), 'implement', 'no task at all still implements')
  const plan = dispatchPlan({ task: { id: 't2', stage: 'verify' }, config: on })
  assert.equal(plan.stage, 'verify')
  assert.equal(plan.harness, 'verification')
  assert.equal(presetFor(plan, 'verify'), 'loom-verifier', 'the stage that declared a preset gets it')
  assert.equal(presetFor(plan, 'plan'), 'loom-spec', 'and asking by the old name answers the new stage')
  ok('a task can declare its stage, an old name resolves, and an unknown stage falls back')
}

// 4. A hole in the configuration is filled, not dropped.
{
  const sparse = { session: { dispatch: { enabled: true, stages: { implement: { harness: 'tests-first' } } } } }
  const plan = dispatchPlan({ task: { id: 't3' }, config: sparse })
  assert.equal(plan.stages.find((s) => s.stage === 'implement').harness, 'tests-first', 'the configured harness wins')
  assert.equal(plan.stages.find((s) => s.stage === 'triage').harness, 'triage', 'an unconfigured stage is named after itself')
  assert.equal(presetFor(plan, 'triage'), null, 'and has no preset rather than a guessed one')
  assert.equal(presetFor(plan, 'nope'), null, 'a stage outside the plan has no preset')
  assert.equal(harnessFor('verify', DEFAULT_CONFIG), 'verification', 'harnessFor answers for the shipped config too')
  assert.equal(harnessFor('plan', DEFAULT_CONFIG), 'spec', 'and it follows the alias')
  ok('an unconfigured stage is named after itself rather than dropped from the plan')
}

done()
