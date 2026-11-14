// Wave 22 / p5: the same gap, one level down.
//
// p4 shipped `orderedModels` / `nextModel` and no dispatcher calls them, so the
// fallback list is still documentation. A fallback is only real if the code that
// builds the request reads the ordered chain, and the code that records a
// failure moves the pointer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { modelChainFor } from '../../src/dispatch/models.js'

const here = dirname(fileURLToPath(import.meta.url))
const sessionSrc = readFileSync(join(here, '..', '..', 'src', 'dispatch', 'session.js'), 'utf8')

test('the chain names the worker model first', () => {
  const chain = modelChainFor({ model: 'deepseek-flash', fallback: ['command-code/v4'], failures: 0 })
  assert.equal(chain[0], 'deepseek-flash')
  assert.ok(chain.includes('command-code/v4'))
})

test('after a failure the chain leads with the fallback', () => {
  const chain = modelChainFor({ model: 'deepseek-flash', fallback: ['command-code/v4'], failures: 1 })
  assert.equal(chain[0], 'command-code/v4')
  assert.equal(chain[chain.length - 1], 'deepseek-flash', 'the failed model is still reachable')
})

test('no fallback configured is a chain of one', () => {
  const chain = modelChainFor({ model: 'only', fallback: [], failures: 4 })
  assert.deepEqual(chain, ['only'])
})

test('the dispatcher builds its request from the chain', () => {
  assert.match(sessionSrc, /modelChainFor\(/, 'a fallback list nobody reads is not a fallback')
})
