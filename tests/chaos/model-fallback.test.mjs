// Adversary: the model refuses for reasons that have nothing to do with the
// task — context length, token budget, quota. A campaign must survive that by
// walking down a declared fallback list instead of losing the attempt, and it
// must record which model actually produced the work.
import assert from 'node:assert/strict'
import { Dispatcher } from '../../src/dispatch/session.js'
import { ok, done } from './fixture.mjs'

function fakeCtx({ perModel }) {
  const calls = []
  const services = {
    sessionController: { resolveAgent: () => ({ agent: { id: 'parent' } }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'parent' }, dispose: async () => {} }) },
    subagents: {
      startActivation(spec) {
        const model = spec.request?.agentOptions?.model ?? null
        calls.push({ model, label: spec.label })
        const behavior = perModel[model] ?? { stopReason: 'completed', text: 'ok' }
        return {
          childId: `child-${calls.length}`,
          result: Promise.resolve({
            output: behavior.text ? [{ type: 'text', text: behavior.text }] : [],
            stopReason: behavior.stopReason,
            diagnostic: behavior.diagnostic,
          }),
          dispose() {},
        }
      },
      interrupt() {},
    },
  }
  return { ctx: { get: (name) => services[name] }, calls }
}

const CONTEXT_ERROR = 'context length exceeded: this model cannot fit the prompt'

// 1. context exhaustion on the primary model: the next model runs instead.
{
  const { ctx, calls } = fakeCtx({
    perModel: {
      'model-a': { stopReason: 'error', diagnostic: CONTEXT_ERROR },
      'model-b': { stopReason: 'completed', text: 'done by b' },
    },
  })
  const d = new Dispatcher({ ctx, config: { models: {} }, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'do the task' }], { cwd: '/tmp', models: ['model-a', 'model-b'] })
  assert.equal(res.stopReason, 'completed', 'the fallback model finished the work')
  assert.equal(res.model, 'model-b', 'the result names the model that worked')
  assert.deepEqual(res.modelsTried, ['model-a', 'model-b'])
  assert.deepEqual(res.modelSwitch, { from: 'model-a', to: 'model-b' })
  assert.equal(calls.length, 2, 'exactly one retry')
  assert.equal(calls[1].model, 'model-b')
  ok('a context-exhausted model falls back to the next one')
  d.dispose()
}

// 2. every model refuses: the attempt fails, but honestly and once.
{
  const { ctx, calls } = fakeCtx({
    perModel: {
      'model-a': { stopReason: 'error', diagnostic: CONTEXT_ERROR },
      'model-b': { stopReason: 'error', diagnostic: 'max_tokens reached' },
    },
  })
  const d = new Dispatcher({ ctx, config: { models: {} }, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'do the task' }], { cwd: '/tmp', models: ['model-a', 'model-b'] })
  assert.equal(res.stopReason, 'error', 'the attempt fails')
  assert.equal(res.failureKind, 'exhausted', 'and says the model list was exhausted')
  assert.deepEqual(res.modelsTried, ['model-a', 'model-b'])
  assert.equal(calls.length, 2, 'no model is tried twice')
  ok('an exhausted model list fails the attempt, not the campaign')
  d.dispose()
}

// 3. an unrelated crash must not be papered over by switching models.
{
  const { ctx, calls } = fakeCtx({
    perModel: { 'model-a': { stopReason: 'error', diagnostic: 'child process exited with code 3' } },
  })
  const d = new Dispatcher({ ctx, config: { models: {} }, log: () => {} })
  const res = await d.run([{ type: 'text', text: 'do the task' }], { cwd: '/tmp', models: ['model-a', 'model-b'] })
  assert.equal(res.stopReason, 'error')
  assert.equal(res.failureKind, 'died', 'a dead child is not a model problem')
  assert.deepEqual(res.modelsTried, ['model-a'], 'no pointless retry on a different model')
  assert.equal(calls.length, 1)
  ok('a non-model failure does not trigger a fallback')
  d.dispose()
}

done()
