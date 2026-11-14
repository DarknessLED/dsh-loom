// Wave 20 / p1: the chain is a DAG the scheduler respects.
//
// `topoOrder` already flattened the chain into one line, so `needs` only decided
// *sequence*, never *parallelism*: two branches that share nothing still waited
// for each other. These specs ask for the two pieces a readiness pool needs and
// pin the shapes a replay depends on.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { runnableNodes, maxParallelOf } from '../../src/chain/spec.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

const chain = {
  name: 'fan',
  version: 1,
  params: { maxParallel: 2 },
  nodes: [
    { id: 'a', type: 'agent', prompt: 'left branch' },
    { id: 'b', type: 'agent', prompt: 'right branch' },
    { id: 'join', type: 'verifier', cmd: 'true', needs: ['a', 'b'] },
  ],
}

test('nothing settled: every node without needs is runnable', () => {
  assert.deepEqual(runnableNodes(chain, []), ['a', 'b'])
})

test('one branch settled: only its dependents become runnable', () => {
  assert.deepEqual(runnableNodes(chain, ['a']), ['b'])
  assert.deepEqual(runnableNodes(chain, ['b']), ['a'])
})

test('a join waits for every need, not the first arrival', () => {
  assert.deepEqual(runnableNodes(chain, ['a', 'b']), ['join'])
})

test('settled nodes are never handed out twice', () => {
  assert.deepEqual(runnableNodes(chain, ['a', 'b', 'join']), [])
})

test('cancelled counts as settled, or the join waits forever', () => {
  // The first success aborts the sibling; a cancelled branch must still unblock
  // whatever needed it, otherwise the round hangs on a promise nobody resolves.
  assert.deepEqual(runnableNodes(chain, ['a'], { cancelled: ['b'] }), ['join'])
})

test('an unknown dependency is a broken chain, not an empty pool', () => {
  const bad = { name: 'x', version: 1, nodes: [{ id: 'a', type: 'agent', prompt: 'p', needs: ['ghost'] }] }
  assert.throws(() => runnableNodes(bad, []), /ghost/)
})

test('max parallel defaults to one and honours the chain', () => {
  assert.equal(maxParallelOf(chain), 2)
  assert.equal(maxParallelOf({ nodes: [] }), 1)
  assert.equal(maxParallelOf({ params: { maxParallel: 0 }, nodes: [] }), 1)
})

test('the runner dispatches through the pool and records a terminal cancel', () => {
  const source = readFileSync(join(root, 'src', 'runtime', 'round.js'), 'utf8')
  assert.match(source, /runnableNodes/, 'the round loop must ask the chain what may run')
  assert.match(source, /node\.cancelled|'cancelled'/, 'a cancelled branch must be written down')
})
