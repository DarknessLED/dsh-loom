// Spec: the chain is a graph, not a list. Today `validateChainSpec` checks ids
// and types only, so a node cannot say "I run after that one", and the runner
// falls back to array position — which is why a reordering is silently a
// dependency change.
//
// Pinned here: `node.needs: string[]` (ids of nodes that must run first) is
// accepted, validated (unknown ids, self-reference, cycles) and can be ordered.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { topoOrder, validateChainSpec } from '../../src/chain/spec.js'

const spec = (nodes) => ({ name: 'graph', version: 1, params: {}, nodes })

const linear = spec([
  { id: 'attempt', type: 'agent', prompt: 'do it' },
  { id: 'verify', type: 'verifier', cmd: 'node --test', needs: ['attempt'] },
  { id: 'gate', type: 'agent', prompt: 'judge', needs: ['verify'] },
])

test('a chain with needs is valid', () => {
  assert.deepEqual(validateChainSpec(linear), [])
})

test('a chain without needs stays valid (the old contract)', () => {
  assert.deepEqual(validateChainSpec(spec([{ id: 'a', type: 'agent', prompt: 'p' }])), [])
})

test('an unknown dependency is refused by name', () => {
  const errs = validateChainSpec(
    spec([{ id: 'a', type: 'agent', prompt: 'p' }, { id: 'b', type: 'agent', prompt: 'p', needs: ['zz'] }]),
  )
  assert.equal(errs.some((e) => /needs: unknown node "zz"/.test(e)), true, errs.join(' | '))
})

test('a node may not depend on itself', () => {
  const errs = validateChainSpec(spec([{ id: 'a', type: 'agent', prompt: 'p', needs: ['a'] }]))
  assert.equal(errs.some((e) => /cycle/.test(e)), true, errs.join(' | '))
})

test('a cycle is refused', () => {
  const errs = validateChainSpec(
    spec([
      { id: 'a', type: 'agent', prompt: 'p', needs: ['b'] },
      { id: 'b', type: 'agent', prompt: 'p', needs: ['a'] },
    ]),
  )
  assert.equal(errs.some((e) => /cycle/.test(e)), true, errs.join(' | '))
})

test('duplicate ids are still refused', () => {
  const errs = validateChainSpec(spec([{ id: 'a', type: 'agent', prompt: 'p' }, { id: 'a', type: 'agent', prompt: 'p' }]))
  assert.equal(errs.some((e) => /duplicate/.test(e)), true, errs.join(' | '))
})

test('topoOrder puts every node after the ones it needs', () => {
  assert.deepEqual(topoOrder(linear), ['attempt', 'verify', 'gate'])
})

test('topoOrder is stable for independent nodes', () => {
  const order = topoOrder(
    spec([
      { id: 'a', type: 'agent', prompt: 'p' },
      { id: 'b', type: 'agent', prompt: 'p' },
      { id: 'c', type: 'agent', prompt: 'p', needs: ['a', 'b'] },
    ]),
  )
  assert.equal(order.indexOf('c'), 2)
  assert.deepEqual(order.slice(0, 2).sort(), ['a', 'b'])
})
