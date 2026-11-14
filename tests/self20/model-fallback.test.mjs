// Wave 21 / p4: the fallback model that never ran.
//
// `models.fallback` names a different provider on purpose -- a same-provider
// fallback inherits the same outage. In 420 attempts the ledger never recorded
// `modelsTried.length > 1`, because the list was empty in every campaign that
// ever ran. A list that is never consulted is not a fallback; the ordering and
// the rotation have to be decisions with a name.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderedModels, nextModel } from '../../src/dispatch/models.js'

test('the worker model comes first and the fallback follows it', () => {
  const out = orderedModels({ model: 'deepseek-flash', fallback: ['command-code/deepseek/v4'] })
  assert.deepEqual(out, ['deepseek-flash', 'command-code/deepseek/v4'])
})

test('the same model twice is one model', () => {
  const out = orderedModels({ model: 'a', fallback: ['a', 'b'] })
  assert.deepEqual(out, ['a', 'b'])
})

test('a demoted model loses its place but is still tried', () => {
  const out = orderedModels({ model: 'a', fallback: ['b'], demote: ['a'] })
  assert.deepEqual(out, ['b', 'a'])
})

test('rotation moves only after a model actually failed', () => {
  const models = ['a', 'b']
  assert.equal(nextModel({ models, failures: 0 }), 'a')
  assert.equal(nextModel({ models, failures: 1 }), 'b')
  assert.equal(nextModel({ models, failures: 9 }), 'b', 'past the end it stays on the last one')
})

test('a single model cannot rotate into nothing', () => {
  assert.equal(nextModel({ models: ['only'], failures: 3 }), 'only')
  assert.equal(nextModel({ models: [], failures: 0 }), null)
})
