// A provider that breaks mid-turn must not spend the round: fall over to the next model.
//
// Seen live (loom-acc4 rounds 1-6, loom-acc3 rounds 3-13): every child died in
// ~1.2 s with `child session ended in error with no diagnostic`, and the child's own
// transcript shows why:
//
//   Tool call "read": Unexpected non-whitespace character after JSON at position 121
//   Received arguments: {"file_path": "...", ...}{"file_path": "...", ...}
//
// The model emitted two tool-call objects glued together; the host rejects the turn
// and the subagent layer reports an error with no diagnostic. Rebuilding the parent
// does not help - the provider is the broken part. `config.models.fallback` exists
// and `Dispatcher.run` already walks a model chain, but it only walks it for
// context/token exhaustion: a silent provider death returns immediately, so the
// round is charged for a child that never got to work.
//
// A dead provider and an exhausted one are the same problem from the loop's side:
// the model could not be used. Try the next model before writing the attempt off.
import assert from 'node:assert/strict'

import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// A host where each model has its own behaviour. `die` = silent error, `work` = done.
function host(byModel) {
  const calls = []
  const services = {
    sessionController: { resolveAgent: () => ({ agent: { id: 'parent' } }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'parent' }, dispose: async () => {} }) },
    subagents: {
      startActivation(spec) {
        const model = spec.request?.agentOptions?.model ?? null
        calls.push({ model, parent: spec.request?.parent })
        const behaviour = byModel[model] ?? 'die'
        return {
          childId: `child-${calls.length}`,
          result: Promise.resolve(
            behaviour === 'die'
              ? { output: [], stopReason: 'error' }
              : { output: [{ type: 'text', text: 'done' }], stopReason: 'completed' },
          ),
          dispose() {},
        }
      },
      interrupt() {},
    },
  }
  return { ctx: { get: (name) => services[name] }, calls }
}

const prompt = [{ type: 'text', text: 'do it' }]

// 1. The first model dies silently: fall over to the second and finish there.
{
  const { ctx, calls } = host({ 'm-a': 'die', 'm-b': 'work' })
  const d = new Dispatcher({ ctx, config: { models: {} }, log: () => {} })
  const res = await d.run(prompt, { cwd: '/tmp', models: ['m-a', 'm-b'] })
  assert.equal(res.stopReason, 'completed', 'the working provider finished the work')
  assert.equal(res.model, 'm-b', 'and it says which model did the work')
  assert.deepEqual(res.modelsTried, ['m-a', 'm-b'], 'the ledger keeps the whole path')
  assert.ok(
    calls.some((c) => c.model === 'm-b'),
    'the second model was actually dispatched',
  )
  ok('a silent provider death falls over to the next model')
  await d.dispose()
}

// 2. Every model dies silently: the attempt fails as infrastructure, not as a verdict,
//    and the whole chain is on record so an operator can see it was not the patch.
{
  const { ctx } = host({ 'm-a': 'die', 'm-b': 'die' })
  const d = new Dispatcher({ ctx, config: { models: {} }, log: () => {} })
  const res = await d.run(prompt, { cwd: '/tmp', models: ['m-a', 'm-b'] })
  assert.equal(res.failureKind, 'died')
  assert.equal(res.infra, true, 'it is still marked as infrastructure, so the round is not scored')
  assert.deepEqual(res.modelsTried, ['m-a', 'm-b'], 'both models were tried')
  ok('a whole chain of silent deaths stays infrastructure')
  await d.dispose()
}

// 3. The fallback list is what the config calls it: `models.fallback`, appended after
//    the worker, so an operator can name a second provider without editing code.
{
  const { ctx, calls } = host({ 'w-1': 'die', 'w-2': 'work' })
  const d = new Dispatcher({ ctx, config: { models: { worker: 'w-1', fallback: ['w-2'] } }, log: () => {} })
  const res = await d.run(prompt, { cwd: '/tmp' })
  assert.equal(res.stopReason, 'completed', 'the configured fallback was used')
  assert.equal(res.model, 'w-2')
  assert.ok(
    calls.every((c) => c.model === null || c.model === undefined) === false,
    'the dispatch named a model instead of relying on the default',
  )
  ok('config.models.fallback is the chain a broken worker falls over to')
  await d.dispose()
}

// 4. But a child that dies *with* a diagnosis is a real failure: it must not burn a
//    second model's budget, because the patch was already shown to be broken.
{
  const { ctx, calls } = host({})
  const services = {
    sessionController: { resolveAgent: () => ({ agent: { id: 'parent' } }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'parent' }, dispose: async () => {} }) },
    subagents: {
      startActivation(spec) {
        calls.push({ model: spec.request?.agentOptions?.model ?? null })
        return {
          childId: `child-${calls.length}`,
          result: Promise.resolve({
            output: [],
            stopReason: 'error',
            diagnostic: 'child process exited with code 3',
          }),
          dispose() {},
        }
      },
      interrupt() {},
    },
  }
  const d = new Dispatcher({ ctx: { get: (n) => services[n] }, config: { models: {} }, log: () => {} })
  const res = await d.run(prompt, { cwd: '/tmp', models: ['m-a', 'm-b'] })
  assert.equal(res.failureKind, 'died')
  assert.equal(res.infra, false, 'a diagnosed death is not infrastructure')
  assert.deepEqual(res.modelsTried, ['m-a'], 'a diagnosed death is not retried on another model')
  ok('a diagnosed death does not fall over to another model')
  await d.dispose()
}

console.log(`\n${pass}/${pass} passed`)
