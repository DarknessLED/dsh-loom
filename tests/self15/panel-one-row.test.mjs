/**
 * Spec: the queue shows one decision at a time.
 *
 * Measured over the store: 82 campaigns carried 97 open checkpoints, and the
 * panel drew every one of them above the fold. A reader who is handed a stack
 * of questions answers the cheapest one, so the backlog grew while the loop
 * kept raising more. The queue is a front, not a list: one row, and a count of
 * what is behind it.
 *
 * `queueOf(data)` therefore draws at most one row by default while still
 * reporting the true total; an explicit `limit` is honoured for callers that
 * want a longer list (the audit script, the preview tool).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const clientPath = join(here, '..', '..', 'client', 'index.js')

/** Load the client bundle by replaying its loader the way the browser does. */
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
            return {
              createElement: () => null,
              useState: (v) => [v, () => {}],
              useEffect: () => {},
              useCallback: (f) => f,
            }
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

const cp = (id, kind = 'gate') => ({
  id,
  kind,
  payload: {},
  at: 1,
})

const payload = {
  campaigns: [
    {
      id: 'loom-a',
      status: 'running',
      rounds: 3,
      open: 3,
      openCheckpoints: [cp('cp-1'), cp('cp-2'), cp('cp-3')],
      reviews: [],
    },
    {
      id: 'loom-b',
      status: 'paused',
      rounds: 1,
      open: 2,
      openCheckpoints: [cp('cp-4'), cp('cp-5', 'holdout')],
      reviews: [],
    },
  ],
  live: [],
  now: 0,
}

let passed = 0
const test = (name, fn) => {
  fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const client = loadClient()
const panel = client.__panel

test('the default queue draws exactly one row', () => {
  const q = panel.queueOf(payload)
  assert.equal(q.rows.length, 1, 'one decision is on the table at a time')
  assert.equal(q.total, 5, 'the count still includes everything that waits')
  assert.ok(q.more >= 4, `the row has to say what is behind it (more=${q.more})`)
})

test('an explicit limit still works for callers that want a longer list', () => {
  const q = panel.queueOf(payload, { limit: 3 })
  assert.equal(q.rows.length, 3, 'the audit and the preview ask for more rows')
  assert.equal(q.total, 5)
  assert.equal(q.more, 2)
})

test('limit 0 draws nothing and says everything is behind the count', () => {
  const q = panel.queueOf(payload, { limit: 0 })
  assert.equal(q.rows.length, 0)
  assert.equal(q.more, 5)
})

test('the most important row is the one drawn', () => {
  const q = panel.queueOf(payload)
  assert.equal(q.rows[0].id, 'cp-1', 'the front of the queue is not arbitrary')
  assert.ok(String(q.rows[0].campaign || q.rows[0].campaignId || '').length > 0, 'a drawn row names its campaign')
})

console.log(`${passed} passed`)
