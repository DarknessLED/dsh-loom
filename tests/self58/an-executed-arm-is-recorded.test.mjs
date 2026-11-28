// A routed attempt is run by the host that owns the harness, and the round says so.
//
// Three facts have to survive the round: which provider/model actually ran, that
// the arm was executed rather than merely recorded, and -- when it could not be --
// the reason. The transport is injected so the spec does not depend on whether this
// machine's gateway is solvent or its T3 server is up.
//   node tests/self58/an-executed-arm-is-recorded.test.mjs
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'

import { baseConfig, chainSpec, fakeDispatcher, makeRepo, makeRuntime, REPORT } from '../self22/fixture.mjs'
import { Dispatcher } from '../../src/dispatch/session.js'
import { runRound } from '../../src/runtime/round.js'
import { ok, done } from '../chaos/fixture.mjs'

const PROVIDERS = {
  codex: { id: 'codex', status: 'ready', enabled: true, models: ['group/smart-split', 'auto/deepseek-v4.1-flash'] },
  claudeAgent: { id: 'claudeAgent', status: 'ready', enabled: true, models: ['claude-haiku-5-5'] },
}
// No provider for gcli on this machine -- the fallback case, on purpose.
const dispatch = (extra = {}) => ({
  session: {
    dispatch: {
      enabled: true,
      armExecution: 'execute',
      models: { default: 'auto/deepseek-v4.1-flash', perStage: {} },
      stages: {},
      ...extra,
    },
  },
})

function routed(config, { armRun, providers = () => PROVIDERS } = {}) {
  const calls = []
  const dispatcher = new Dispatcher({
    ctx: {},
    config,
    log: () => {},
    providers,
    armRun: armRun ?? (async (args) => {
      calls.push(args)
      return { ok: true, reply: REPORT, wallMs: 42, threadId: 'mcp:t1', runId: 'run:1', status: 'completed' }
    }),
  })
  return { dispatcher, calls }
}

// 1. The delegated run comes back with the harness's answer, and the record says
//    which provider and model produced it.
{
  const config = { ...baseConfig(), ...dispatch() }
  const { dispatcher, calls } = routed(config)
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 1 }),
    tasks: [{ id: 'staged', prompt: 'make it pass', taskKind: 'implement', verify: { cmd: 'exit 0' } }],
    budget: { usd: 4, spentUsd: 0 },
  })
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const attempt = runtime.events.filter((e) => e.type === 'attempt.finished').at(-1)?.data ?? null
  rmSync(dir, { recursive: true, force: true })

  assert.equal(calls.length, 1, 'the transport was asked once')
  assert.equal(calls[0].provider, 'codex', 'the implementing stage routes to the codex provider')
  assert.equal(calls[0].model, 'auto/deepseek-v4.1-flash', 'on the routing group the plan named')
  assert.ok(calls[0].prompt.length > 100, 'the brief travels whole')

  assert.equal(attempt.stage, 'implement')
  assert.equal(attempt.stageFrom, 'taskKind')
  assert.equal(attempt.armTarget, 'codex')
  assert.equal(attempt.modelTarget, 'auto/deepseek-v4.1-flash')
  assert.deepEqual(
    { arm: attempt.armRan.arm, provider: attempt.armRan.provider, model: attempt.armRan.model },
    { arm: 'codex', provider: 'codex', model: 'auto/deepseek-v4.1-flash' },
  )
  assert.equal(attempt.armRan.billing, 'unmetered', 'another program\u2019s tokens are unknown, not zero')
  ok('a routed attempt runs on the named provider/model and the round records all three')
}

// 2. With execution off the arm is recorded and the reason says it was not run.
{
  const config = { ...baseConfig(), ...dispatch({ armExecution: 'off' }) }
  const { dispatcher, calls } = routed(config)
  assert.equal(await dispatcher.delegate({ prompt: 'x', cwd: '/tmp', arm: 'codex', armExecution: null }), null)
  assert.equal(calls.length, 0, 'nothing was spawned')
  assert.equal(dispatcher.armNote.arm, 'codex')
  assert.equal(dispatcher.armNote.executed, false)
  assert.match(dispatcher.armNote.reason, /execution is off/)
  ok('off means recorded, not run — and the note says which')
}

// 3. A harness with no provider falls back with the harness's name in the reason,
//    instead of borrowing another provider and calling it routed.
{
  const { dispatcher } = routed({ ...baseConfig(), ...dispatch() })
  assert.equal(await dispatcher.delegate({ prompt: 'x', cwd: '/tmp', arm: 'gcli', armExecution: 'execute' }), null)
  assert.equal(dispatcher.armNote.routable, false)
  assert.match(dispatcher.armNote.reason, /gcli/)
  ok('a missing provider is a recorded fallback, not a substitution')
}

// 4. A run that failed on the far side is still a result: the attempt carries the
//    failure, and the round is not told it succeeded.
{
  const config = { ...baseConfig(), ...dispatch() }
  const { dispatcher } = routed(config, {
    armRun: async () => ({ ok: false, reply: null, error: 'API Error: 402 insufficient_balance', wallMs: 7, status: 'failed' }),
  })
  const res = await dispatcher.run('the brief', { cwd: '/tmp', arm: 'codex', armExecution: 'execute', model: 'auto/x' })
  assert.equal(res.stopReason, 'error')
  assert.equal(res.failureKind, 'died')
  assert.match(res.error, /402/)
  assert.equal(res.armRan.status, 'failed')
  assert.equal(res.text, '')
  ok('the far side\u2019s failure is reported as a failure, with its own words')
}

// 5. An unarmed round is untouched: the plain fake dispatcher path records no arm
//    fields at all.
{
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 1 }),
    tasks: [{ id: 'plain', prompt: 'make it pass', verify: { cmd: 'exit 0' } }],
    budget: { usd: 4, spentUsd: 0 },
  })
  await runRound({
    runtime, view, config: baseConfig(), dispatcher: fakeDispatcher([], () => REPORT), log: () => {}, notify: () => {},
  })
  const attempt = runtime.events.filter((e) => e.type === 'attempt.finished').at(-1)?.data ?? null
  rmSync(dir, { recursive: true, force: true })
  assert.equal('armRan' in attempt, false)
  assert.equal('armNote' in attempt, false)
  assert.equal('modelTarget' in attempt, false)
  ok('a round with the switch off writes none of the routing fields')
}

done()
