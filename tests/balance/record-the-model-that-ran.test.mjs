// The record has to name the model the child actually ran on, not the one the
// config happened to spell.
//
// With nothing configured, a child inherits the host's selection -- provider, model
// and effort. The attempt record then said `model: null`, which folds into the
// `unknown` bucket in the per-model table. That is the exact failure the effort
// wiring was added to stop: the loop reports one thing and the bill names another.
// It also makes the model-health table useless for the default case, i.e. for
// almost every campaign this loop has ever run.
//
// Rule: when no chain entry names a model, the record carries whatever the host
// said the child would run on. When an entry does name one, that name wins -- it is
// what was asked for. Either way `modelsTried` holds the same values the record
// reports, so the table and the chain cannot disagree.
import assert from 'node:assert/strict'
import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

function fakeCtx({ results, selection }) {
  const calls = []
  let i = 0
  const root = { id: 'root' }
  const services = {
    sessionController: { resolveAgent: async () => ({ agent: root }) },
    agentLoop: { createAgent: async () => ({ agent: { id: 'owned' }, dispose() {} }) },
    subagents: {
      startActivation: async (spec) => {
        calls.push({ agentOptions: spec.request.agentOptions })
        const out = results[Math.min(i, results.length - 1)]
        i += 1
        return { childId: 'child-' + i, result: Promise.resolve(out), dispose() {} }
      },
    },
  }
  if (selection !== undefined) services.agentDefaultModel = { currentSelection: () => selection }
  return { calls, ctx: { get: (n) => services[n] } }
}

const DONE = { output: [{ type: 'text', text: 'ok' }], stopReason: 'completed' }
const SELECTION = { provider: 'open-design', model: 'deepseek-v4.1-flash', reasoningEffort: 'high' }

// 1. Nothing named: the record names the inherited model, not null.
{
  const { ctx } = fakeCtx({ results: [DONE], selection: SELECTION })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt' })
  assert.equal(res.model, 'deepseek-v4.1-flash', 'the record names the model that ran')
  assert.deepEqual(res.modelsTried, ['deepseek-v4.1-flash'], 'the chain report agrees with the record')
  ok('an inherited model is recorded by name')
}

// 2. A named entry still wins, and it is recorded exactly as written -- the record
//    is evidence about what was asked for, not a normalised form of it.
{
  const { ctx } = fakeCtx({ results: [DONE], selection: SELECTION })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt', models: ['command-code/deepseek/deepseek-v4.1-flash'] })
  assert.equal(res.model, 'command-code/deepseek/deepseek-v4.1-flash')
  assert.deepEqual(res.modelsTried, ['command-code/deepseek/deepseek-v4.1-flash'])
  ok('an explicit entry is recorded as written')
}

// 3. No host selection at all -- an old host, or a service that is missing. The
//    record then says `default`, which is honest: the loop does not know.
{
  const { ctx } = fakeCtx({ results: [DONE] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt' })
  assert.equal(res.model, 'default', 'an unknown model is reported as unknown, not as a guess')
  assert.deepEqual(res.modelsTried, ['default'])
  ok('an unknown model stays unknown')
}

// 4. A selection that names no model is not a selection. It must not turn the
//    record into `undefined` or an empty string.
{
  const { ctx } = fakeCtx({ results: [DONE], selection: { provider: 'open-design' } })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt' })
  assert.equal(res.model, 'default')
  ok('a provider with no model is not a model')
}

// 5. Falling over records both: the chain that was tried and the one that answered.
//    A record that only names the winner cannot show that a fallback happened.
{
  const { ctx } = fakeCtx({
    results: [
      { output: [], stopReason: 'error', error: 'context length exceeded' },
      DONE,
    ],
    selection: SELECTION,
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  const res = await d.run('hi', {
    cwd: 'C:/tmp',
    timeoutMs: 20000,
    label: 'attempt',
    models: ['open-design/deepseek-v4.1-flash', 'command-code/deepseek/deepseek-v4.1-flash'],
  })
  assert.equal(res.model, 'command-code/deepseek/deepseek-v4.1-flash')
  assert.deepEqual(res.modelsTried, ['open-design/deepseek-v4.1-flash', 'command-code/deepseek/deepseek-v4.1-flash'])
  assert.deepEqual(res.modelSwitch, { from: 'open-design/deepseek-v4.1-flash', to: 'command-code/deepseek/deepseek-v4.1-flash' })
  ok('a fallback keeps both the chain and the winner')
}

console.log(`\n${pass}/5 passed`)
assert.equal(pass, 5)
