// The install default is "name the arm, do not run it". A campaign may overrule
// that for itself -- and only for itself.
//
// Two permissions live in one word. Naming an arm says what *would* do this work;
// executing it spends another account's quota through another program, and this
// loop cannot meter what that program costs. So the opt-in is per campaign: an
// operator who wants one experiment to run on codex says so on that campaign, and
// every other campaign keeps dispatching to the DSH subagent it always did.
//   node tests/self58/a-campaign-may-decide-whether-the-arm-runs.test.mjs
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'

import { baseConfig, chainSpec, makeRepo, makeRuntime, REPORT } from '../self22/fixture.mjs'
import { Dispatcher } from '../../src/dispatch/session.js'
import { validatePolicyOverride } from '../../src/loop/policy.js'
import { dispatchPlan, executionWanted } from '../../src/dispatch/stage-plan.js'
import { runRound } from '../../src/runtime/round.js'
import { ok, done } from '../chaos/fixture.mjs'

const PROVIDERS = {
  codex: { id: 'codex', status: 'ready', enabled: true, models: ['group/smart-split', 'auto/deepseek-v4.1-flash'] },
}

const dispatch = (extra = {}) => ({
  session: {
    dispatch: {
      enabled: true,
      armExecution: 'off',
      models: { default: 'auto/deepseek-v4.1-flash', perStage: {} },
      stages: {},
      ...extra,
    },
  },
})

function routed(config) {
  const calls = []
  const dispatcher = new Dispatcher({
    ctx: {},
    config,
    log: () => {},
    providers: () => PROVIDERS,
    armRun: async (args) => {
      calls.push(args)
      return { ok: true, reply: REPORT, wallMs: 11, threadId: 'mcp:t2', runId: 'run:2', status: 'completed' }
    },
  })
  return { dispatcher, calls }
}

// 1. The campaign's own word beats the install, in both directions. This is the
//    whole rule, so it is tested as a rule rather than through a spawn.
{
  assert.equal(executionWanted({ campaignOverride: 'execute', install: 'off' }), true, 'campaign opt-in wins')
  assert.equal(executionWanted({ campaignOverride: 'off', install: 'execute' }), false, 'campaign opt-out wins')
  assert.equal(executionWanted({ campaignOverride: null, install: 'execute' }), true, 'no campaign word: install decides')
  assert.equal(executionWanted({ campaignOverride: null, install: 'off' }), false, 'install default is off')
  assert.equal(executionWanted({}), false, 'neither says anything: off')
  ok('the campaign\u2019s word beats the install, and silence falls back to it')
}

// 2. The plan that reaches the child is the resolved one: a campaign that turned
//    execution off does not quietly inherit an install-level "execute".
{
  const planned = dispatchPlan({
    task: { id: 'k', taskKind: 'implement' },
    config: {
      ...baseConfig(),
      ...dispatch({ armExecution: executionWanted({ campaignOverride: 'off', install: 'execute' }) ? 'execute' : 'off' }),
    },
    role: 'worker',
  })
  assert.equal(planned.execute, false, 'a campaign opt-out is what the plan says')
  assert.equal(planned.armTarget, 'codex', 'while still naming who would do it')
  ok('an opted-out campaign plans an arm it will not run')
}

// 3. An opted-in campaign is executed by the host that owns the harness, and the
//    attempt says so.
{
  const config = { ...baseConfig(), ...dispatch({ armExecution: 'execute' }) }
  const { dispatcher, calls } = routed(config)
  const dir = makeRepo()
  const made = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 1 }),
    tasks: [{ id: 'k', prompt: 'make it pass', taskKind: 'implement', verify: { cmd: 'exit 0' } }],
    budget: { usd: 4, spentUsd: 0 },
  })
  await runRound({ runtime: made.runtime, view: made.view, config, dispatcher, log: () => {}, notify: () => {} })
  const attempt = made.runtime.events.filter((e) => e.type === 'attempt.finished').at(-1)?.data ?? null
  rmSync(dir, { recursive: true, force: true })
  assert.equal(calls.length, 1, 'the campaign asked for execution, so the transport ran')
  assert.equal(attempt.armRan?.provider, 'codex', 'and the record names the host that ran it')
  assert.equal(attempt.armRan?.billing, 'unmetered', 'and that we cannot meter its tokens')
  ok('an opted-in campaign runs on the named host, and the round says which')
}

// 4. The value is checked where a campaign's words are checked, not at spawn time.
{
  assert.throws(() => validatePolicyOverride({ armExecution: 'sometimes' }), /armExecution/)
  assert.equal(validatePolicyOverride({ armExecution: 'execute' }).armExecution, 'execute')
  assert.equal(validatePolicyOverride({ armExecution: 'off' }).armExecution, 'off')
  ok('an unreadable value is refused where the campaign policy is read')
}

done()
