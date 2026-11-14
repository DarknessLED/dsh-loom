// Wave 21 / p4: which model spent the money.
//
// A campaign can route to four providers at four prices, and the panel shows one
// blended number. "Where did the $0.31 go" is answerable from the ledgers -- each
// attempt records `model`, `tokens` and `costUsd` -- so the panel owes a row per
// model with its share.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const clientPath = join(here, '..', '..', 'client', 'index.js')

function loadClient() {
  const source = readFileSync(clientPath, 'utf8')
  let captured = null
  const window = {
    __ModuleLoader__: {
      load({ id, factory }) {
        captured = {
          id,
          exports: factory((name) => {
            if (name !== 'react') throw new Error(`unexpected require: ${name}`)
            return { createElement: () => null, useState: (v) => [v, () => {}], useEffect: () => {}, useCallback: (f) => f }
          }),
        }
      },
    },
  }
  // eslint-disable-next-line no-new-func
  new Function('window', source)(window)
  assert.ok(captured, 'the bundle registers itself with the module loader')
  return captured.exports
}

const client = loadClient()
const panel = client.__panel

test('a campaign with one model shows exactly one row', () => {
  const rows = panel.modelSpend({
    attempts: [
      { model: 'deepseek-flash', costUsd: 0.05, tokens: 1000 },
      { model: 'deepseek-flash', costUsd: 0.03, tokens: 800 },
    ],
  })
  assert.deepEqual(rows, [{ model: 'deepseek-flash', usd: 0.08, tokens: 1800, share: 1 }])
})

test('two models split the bill by what they cost, not by attempt count', () => {
  const rows = panel.modelSpend({
    attempts: [
      { model: 'a', costUsd: 0.09, tokens: 1000 },
      { model: 'b', costUsd: 0.03, tokens: 9000 },
    ],
  })
  assert.equal(rows[0].model, 'a')
  assert.equal(Math.round(rows[0].share * 100), 75)
  assert.equal(Math.round(rows[1].share * 100), 25)
})

test('an attempt that never recorded a model is not silently dropped', () => {
  const rows = panel.modelSpend({ attempts: [{ costUsd: 0.02, tokens: 10 }] })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].model, 'unknown')
})

test('no spend is an empty list, not a zero row', () => {
  assert.deepEqual(panel.modelSpend({ attempts: [] }), [])
  assert.deepEqual(panel.modelSpend({}), [])
})

test('the card actually draws the rows', () => {
  const src = readFileSync(clientPath, 'utf8')
  assert.match(src, /modelSpend\(/)
  assert.match(src, /loom-models/, 'the per-model block has a class of its own to style')
})
