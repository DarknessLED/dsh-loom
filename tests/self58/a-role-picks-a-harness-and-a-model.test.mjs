// A role picks two things: who runs it, and which kind of model answers.
//
// The harness table is measured (`research/harness-bench/HANDOFF.md` §4). The
// model side is not measured the same way — the install states an intent per
// role (`premium` / `free`) and the gateway resolves that intent into a concrete
// model. Both halves have to be visible on the plan, because whoever reads a
// round's ledger must be able to tell "the gateway chose a model for this role"
// from "this role pinned a slug".
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MODEL_GROUPS,
  ROLE_MODEL_GROUPS,
  dispatchPlan,
  modelFor,
  modelGroupFor,
  resolveModel,
  STAGES,
} from '../../src/dispatch/stage-plan.js'

function configWith(dispatch) {
  return {
    session: {
      dispatch: {
        enabled: true,
        armExecution: 'off',
        models: { default: 'auto/deepseek-v4.1-flash', perStage: {} },
        ...dispatch,
      },
    },
  }
}

test('each role states an intent, and the intent has a default', () => {
  for (const role of STAGES) {
    assert.ok(MODEL_GROUPS[ROLE_MODEL_GROUPS[role]], `${role} needs a group that exists`)
  }
  assert.equal(ROLE_MODEL_GROUPS.implement, 'premium')
  assert.equal(ROLE_MODEL_GROUPS.verify, 'free')
})

test('a group name resolves through the install, a slug stays a slug', () => {
  const config = configWith({ models: { default: 'auto/deepseek-v4.1-flash', groups: { premium: 'gpt-6.2-sol', free: 'opencode-go/hungerg-free' }, perRole: {} } })
  assert.deepEqual(resolveModel('premium', config), { model: 'gpt-6.2-sol', group: 'premium' })
  assert.deepEqual(resolveModel('gpt-6.2-sol', config), { model: 'gpt-6.2-sol', group: 'premium' }, 'the same slug written as a value is the same group')
  assert.deepEqual(resolveModel('commandcode/unknown', config), { model: 'commandcode/unknown', group: null })
  assert.deepEqual(resolveModel('', config), { model: null, group: null })
})

test('per role beats per stage beats the default, and the group travels with it', () => {
  const base = configWith({})
  assert.equal(modelFor('implement', base), 'auto/deepseek-v4.1-flash')
  assert.equal(modelGroupFor('implement', base), 'premium')

  const pinned = configWith({ models: { default: 'auto/deepseek-v4.1-flash', perStage: { implement: 'commandcode/gpt-6.2-sol' } } })
  assert.equal(modelFor('implement', pinned), 'commandcode/gpt-6.2-sol')
  assert.equal(modelGroupFor('implement', pinned), null)

  const perRole = configWith({ models: { default: 'auto/deepseek-v4.1-flash', perStage: { implement: 'commandcode/gpt-6.2-sol' }, perRole: { implement: 'free' } } })
  assert.equal(modelFor('implement', perRole), 'opencode-go/hungerg-free')
  assert.equal(modelGroupFor('implement', perRole), 'free')
})

test('a plan names a harness and a model for every role it lists', () => {
  const plan = dispatchPlan({ task: { id: 't1', taskKind: 'implement' }, config: configWith({}) })
  assert.equal(plan.stages.length, STAGES.length)
  for (const entry of plan.stages) {
    assert.ok(entry.harness, `${entry.stage} needs a harness`)
    assert.ok(entry.model, `${entry.stage} needs a model`)
    assert.ok(entry.arm, `${entry.stage} needs an arm`)
  }
  const implement = plan.stages.find((s) => s.stage === 'implement')
  const verify = plan.stages.find((s) => s.stage === 'verify')
  assert.equal(implement.modelGroup, 'premium')
  assert.equal(verify.modelGroup, 'free')
  assert.notEqual(implement.model, verify.model)
  assert.equal(plan.model, implement.model)
  assert.equal(plan.modelGroup, 'premium')
})

test('switching the whole install to the free group moves every role at once', () => {
  const free = configWith({ models: { plan: 'free', default: 'auto/deepseek-v4.1-flash', perRole: {} } })
  for (const role of STAGES) {
    assert.equal(modelFor(role, free), 'opencode-go/hungerg-free')
    assert.equal(modelGroupFor(role, free), 'free')
  }
  const premium = configWith({ models: { plan: 'premium', default: 'opencode-go/hungerg-free', perRole: { verify: 'free' } } })
  assert.equal(modelFor('verify', premium), 'auto/deepseek-v4.1-flash', 'the plan level outranks a role preference')
})

test('a change that declares its roles narrows the plan, and the plan says so', () => {
  const narrow = dispatchPlan({ task: { id: 't1', taskKind: 'implement' }, config: configWith({}), planRoles: ['spec', 'review'] })
  assert.deepEqual(narrow.roles, ['spec', 'review'])
  assert.deepEqual(narrow.stages.map((s) => s.stage), ['spec', 'review'])
  assert.match(narrow.why, /the change declares its roles/)

  const all = dispatchPlan({ task: { id: 't1', taskKind: 'implement' }, config: configWith({}), planRoles: [] })
  assert.deepEqual(all.roles, STAGES, 'an empty list is a silence, not a decision to hire nobody')
  assert.match(all.why, /the measured table/)

  const alias = dispatchPlan({ task: { id: 't1' }, config: configWith({}), planRoles: ['plan'] })
  assert.deepEqual(alias.roles, ['spec'], 'the old word is still understood')
})

test('the switch being off still computes nothing at all', () => {
  assert.equal(dispatchPlan({ task: { id: 't1' }, config: configWith({ enabled: false }) }), null)
})
