// A shape that never appears in a ledger means a route that has never been
// exercised. Count them instead of claiming the routing works.
import assert from 'node:assert/strict'
import { shapeStats } from '../../src/knowledge/impact.js'

const stats = shapeStats([
  { n: 1, shape: ['no-patch'] },
  { n: 2, shape: ['near-miss'] },
  { n: 3, shape: ['unsolved'] },
  { n: 4 },
  { n: 5, shape: ['near-miss', 'unsolved'] },
])

assert.equal(stats.rounds, 5)
assert.equal(stats.labelled, 4, 'a round without a shape is not labelled')
assert.equal(stats.byShape['near-miss'], 2, 'multiple labels on one round all count')
assert.equal(stats.byShape['unsolved'], 2)
assert.equal(stats.byShape['no-patch'], 1)
assert.equal(stats.byShape.solved, undefined, 'an absent shape is absent, not zero-filled')

console.log('3/3 passed')
