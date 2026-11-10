// A child session that runs on a different model than the session that asked for
// it is a silent second opinion: the loop reports one thing and bills another.
//
// loom-acc6 spelled `open-design/deepseek-v4.1-flash` into a campaign policy
// while the host was running `open-design/claude-haiku-5.5`, so every worker was
// a different model from the agent supervising it. The dispatcher also never set
// `reasoningEffort` at all — "everything runs at high" was luck, not a rule.
//
// Rule: with nothing said, a child inherits the host's current selection whole —
// provider, model and effort. An explicit chain entry still wins on the model it
// names, but the effort travels with it.
import assert from 'node:assert/strict'
import { Dispatcher, resolveSelection } from '../../src/dispatch/session.js'

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
    agentLoop: {
      createAgent: async () => ({ agent: { id: 'owned' }, dispose() {} }),
    },
    subagents: {
      startActivation: async (spec) => {
        calls.push({ agentOptions: spec.request.agentOptions })
        const out = results[Math.min(i, results.length - 1)]
        i += 1
        return { childId: 'child-' + i, result: Promise.resolve(out), dispose() {} }
      },
    },
  }
  if (selection !== undefined) {
    services.agentDefaultModel = { currentSelection: () => selection }
  }
  return { calls, ctx: { get: (n) => services[n] } }
}

const DONE = { output: [{ type: 'text', text: 'ok' }], stopReason: 'completed' }

// 1. Nothing configured means inherit, not "whatever the provider defaults to".
{
  const { ctx, calls } = fakeCtx({
    results: [DONE],
    selection: { provider: 'open-design', model: 'deepseek-v4.1-flash', reasoningEffort: 'high' },
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt' })
  assert.deepEqual(calls[0].agentOptions, {
    provider: 'open-design',
    model: 'deepseek-v4.1-flash',
    reasoningEffort: 'high',
  }, 'an unconfigured child runs on the session that spawned it')
  ok('an unconfigured child inherits provider, model and effort')
}

// 2. A named model wins on the model, but the effort still travels.
{
  const { ctx, calls } = fakeCtx({
    results: [DONE],
    selection: { provider: 'open-design', model: 'deepseek-v4.1-flash', reasoningEffort: 'high' },
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt', model: 'plain-model' })
  assert.deepEqual(calls[0].agentOptions, { model: 'plain-model', reasoningEffort: 'high' })
  ok('a bare model keeps its own name and the inherited effort')
}

// 3. An explicit reasoning effort is the operator's call, not the host's.
{
  const { ctx, calls } = fakeCtx({
    results: [DONE],
    selection: { provider: 'open-design', model: 'deepseek-v4.1-flash', reasoningEffort: 'high' },
  })
  const d = new Dispatcher({ ctx, config: { session: { reasoningEffort: 'low' } }, log: () => {} })
  d.bindTo('parent')
  await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt' })
  assert.equal(calls[0].agentOptions.reasoningEffort, 'low')
  ok('a configured effort beats the inherited one')
}

// 4. A full ref still names its provider; inheritance must not overwrite it.
{
  const { ctx, calls } = fakeCtx({
    results: [DONE],
    selection: { provider: 'open-design', model: 'deepseek-v4.1-flash', reasoningEffort: 'high' },
  })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  await d.run('hi', {
    cwd: 'C:/tmp',
    timeoutMs: 5000,
    label: 'attempt',
    model: 'command-code/deepseek/deepseek-v4.1-flash',
  })
  assert.deepEqual(calls[0].agentOptions, {
    provider: 'command-code',
    model: 'deepseek/deepseek-v4.1-flash',
    reasoningEffort: 'high',
  })
  ok('an explicit provider is never replaced by the inherited one')
}

// 5. A host that cannot answer is not an error: the child still runs.
{
  const { ctx, calls } = fakeCtx({ results: [DONE] })
  const d = new Dispatcher({ ctx, config: {}, log: () => {} })
  d.bindTo('parent')
  await d.run('hi', { cwd: 'C:/tmp', timeoutMs: 5000, label: 'attempt' })
  assert.equal(calls[0].agentOptions, undefined)
  ok('a host with no selection still spawns a child')
}

// 6. resolveSelection is usable on its own (the panel and the triangle want it).
{
  const sel = await resolveSelection({
    get: (n) =>
      n === 'agentDefaultModel'
        ? { currentSelection: () => ({ provider: 'p', model: 'm', reasoningEffort: 'medium' }) }
        : undefined,
  })
  assert.deepEqual(sel, { provider: 'p', model: 'm', reasoningEffort: 'medium' })
  assert.equal(await resolveSelection({ get: () => undefined }), null)
  assert.equal(await resolveSelection({ get: () => ({ currentSelection: () => { throw new Error('x') } }) }), null)
  ok('resolveSelection answers null instead of throwing')
}

console.log(`\n${pass}/6 passed`)
assert.equal(pass, 6)
