// A route names a provider and a model, and says where the stage came from.
//
// Auto's whole claim is that the loop picks *who runs* a stage and *what model*
// it runs on. That claim is only worth the words if the choice is computed from
// facts (a provider list, an advertised model list) rather than from a preference
// written in the file. This spec pins the computation, including the two ways it
// must refuse: a harness T3 does not ship, and a model the provider does not
// advertise.
//   node tests/self58/a-route-names-a-provider-and-a-model.test.mjs
import assert from 'node:assert/strict'

import {
  ARM_PROVIDERS,
  DEFAULT_ARM_MODEL,
  pickAdvertisedModel,
  readProviders,
  routeFor,
} from '../../src/dispatch/arms.js'
import { dispatchPlan, modelFor, stageForNode, taskKindOf } from '../../src/dispatch/stage-plan.js'
import { ok, done } from '../chaos/fixture.mjs'

const PROVIDERS = {
  codex: { id: 'codex', status: 'ready', enabled: true, models: ['group/smart-split', 'auto/deepseek-v4.1-flash', 'gpt-6-luna'] },
  claudeAgent: { id: 'claudeAgent', status: 'ready', enabled: true, models: ['claude-haiku-5-5', 'group/smart-split'] },
  antigravity: { id: 'antigravity', status: 'ready', enabled: true, models: ['antigravity-pro'] },
}
const present = () => true
const absent = () => false

// 1. The arm table says which host owns which harness, and admits the two it does
//    not own. A guessed mapping is how a "routed" attempt ends up on the wrong
//    program.
assert.deepEqual(ARM_PROVIDERS, { dsh: null, cc: 'claudeAgent', codex: 'codex', gcli: null, agy: 'antigravity' })
ok('each arm names a T3 provider, or null when T3 does not ship that harness')

// 2. The loop's own arm is not routable -- and that is not a failure, it is the
//    default: the loop runs it itself.
{
  const route = routeFor('dsh', { providers: PROVIDERS, exists: present })
  assert.equal(route.routable, false)
  assert.match(route.reason, /runs this one itself/)
  ok('dsh is not delegated: the loop is its host')
}

// 3. A harness with no provider instance refuses, with the harness in the reason.
{
  const route = routeFor('gcli', { providers: PROVIDERS, exists: present })
  assert.equal(route.routable, false, 'gcli has no T3 provider on this machine')
  assert.match(route.reason, /gcli/)
  ok('a harness T3 does not ship falls back instead of borrowing another provider')
}

// 4. A provider that is installed but not ready is not routable; a missing CLI is
//    not routable; a ready provider with the CLI present is.
{
  const sick = { codex: { ...PROVIDERS.codex, status: 'failed' } }
  assert.equal(routeFor('codex', { providers: sick, exists: present }).routable, false)
  assert.equal(routeFor('codex', { providers: PROVIDERS, exists: absent }).routable, false)
  const route = routeFor('codex', { providers: PROVIDERS, exists: present })
  assert.equal(route.routable, true)
  assert.equal(route.provider, 'codex')
  assert.deepEqual(route.models, PROVIDERS.codex.models)
  ok('routable means: ready provider, installed CLI, and the models it advertises')
}

// 5. The model a provider will accept: the wanted name wins when advertised; a
//    routing group is preferred when it is not; the adjustment is never silent.
{
  const exact = pickAdvertisedModel(PROVIDERS.codex.models, 'auto/deepseek-v4.1-flash')
  assert.equal(exact.model, 'auto/deepseek-v4.1-flash')
  assert.equal(exact.adjusted, false)

  const group = pickAdvertisedModel(PROVIDERS.codex.models, 'commandcode/gpt-6.2-sol')
  assert.equal(group.model, 'group/smart-split')
  assert.equal(group.adjusted, true)
  assert.match(group.reason, /not advertised/)

  const onlyDeepseek = pickAdvertisedModel(['opencode-go/deepseek-v4.1-flash'], 'claude-haiku-5-5')
  assert.equal(onlyDeepseek.model, 'opencode-go/deepseek-v4.1-flash')
  assert.equal(onlyDeepseek.adjusted, true)

  const none = pickAdvertisedModel([], 'auto/x')
  assert.equal(none.model, 'auto/x')
  assert.equal(none.adjusted, false, 'an empty list is not evidence that the name is wrong')
  ok('a model is chosen from what the provider advertises, and any substitution says so')
}

// 6. A stage comes from the node that is dispatching when the node knows, and from
//    the task only for the worker. This is the trap a live round found: a task
//    that declared "verify" while writing code.
{
  assert.deepEqual(stageForNode('recon', { taskKind: 'implement' }), { stage: 'spec', from: 'node:recon' })
  assert.deepEqual(stageForNode('worker', { taskKind: 'review' }), { stage: 'review', from: 'taskKind' })
  assert.deepEqual(stageForNode('worker', { stage: 'verify' }), { stage: 'verify', from: 'stage' })
  assert.deepEqual(stageForNode('worker', {}), { stage: 'implement', from: 'default' })
  assert.equal(taskKindOf({ stage: 'plan' }), 'spec', 'the old name still resolves')
  assert.equal(taskKindOf({ taskKind: 'nonsense' }), 'implement', 'an unknown kind is not invented')
  ok('a node role outranks a task declaration, and an unknown kind falls back to implementation')
}

// 7. The plan carries the model and whether it may execute -- the same number the
//    dispatcher reads, so a printed plan cannot promise a rotation that is off.
{
  const config = {
    session: {
      dispatch: {
        enabled: true,
        armExecution: 'off',
        models: { default: DEFAULT_ARM_MODEL, perStage: { review: 'group/smart-split' } },
        stages: {},
      },
    },
  }
  const plan = dispatchPlan({ task: { id: 't', taskKind: 'review' }, config, role: 'worker' })
  assert.equal(plan.stage, 'review')
  assert.equal(plan.stageFrom, 'taskKind')
  assert.equal(plan.model, 'group/smart-split', 'the per-stage model wins')
  assert.equal(plan.execute, false, 'off is the default')
  assert.equal(plan.armTarget, 'agy')
  assert.equal(plan.stages.find((s) => s.stage === 'implement').model, DEFAULT_ARM_MODEL)

  const eager = dispatchPlan({ task: { id: 't' }, config: { session: { dispatch: { ...config.session.dispatch, armExecution: 'execute' } } }, role: 'worker' })
  assert.equal(eager.execute, true)
  assert.equal(eager.model, DEFAULT_ARM_MODEL)
  assert.equal(modelFor('triage', config), DEFAULT_ARM_MODEL)
  ok('the plan carries its model and its execution permission')
}

// 8. The provider cache writes models as objects; reading only bare strings made
//    every provider look empty and the routing fall back with "no list".
{
  const caches = {
    'codex.json': JSON.stringify({
      displayName: 'Codex',
      status: 'ready',
      enabled: true,
      models: [
        { slug: 'group/smart-split', name: 'routing group', isDefault: true },
        { slug: 'auto/deepseek-v4.1-flash', name: 'flash' },
        { name: 'no slug here' },
      ],
    }),
  }
  const fs = {
    existsSync: () => true,
    readdirSync: () => Object.keys(caches),
    readFileSync: (path) => caches[String(path).split(/[\\/]/).pop()],
  }
  const providers = readProviders({ home: 'C:/home', fs })
  assert.deepEqual(providers.codex.models, ['group/smart-split', 'auto/deepseek-v4.1-flash'], 'slugs, in order')
  const chosen = pickAdvertisedModel(providers.codex.models, 'auto/deepseek-v4.1-flash')
  assert.equal(chosen.model, 'auto/deepseek-v4.1-flash')
  assert.equal(chosen.adjusted, false, 'an advertised model is not substituted')
  ok('a provider cache that names each model by slug still advertises them')
}

done()
