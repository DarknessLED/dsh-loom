// The research leg records three numbers per round -- how many rounds read, how
// many pages came back, and how many of those reads the worker actually used --
// and until now nothing displayed them. A number nobody reads is a number the
// loop cannot be judged by.
//
// The computation lives in `readSummary(rounds)` so it can be exercised without
// a runtime, and `panelState` ships its result as `reads` on every campaign row.
//
//   node tests/self57/the-panel-can-see-the-reads.test.mjs
import assert from 'node:assert/strict'

import { panelState, readSummary } from '../../src/panel/api.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

// The shape `src/runtime/research-leg.js` writes back: `read` is the pages that
// fetched, `used` is three-valued on purpose (null means "not measured").
function round(n, research) {
  const r = { n, status: 'no-gain' }
  if (research !== undefined) r.research = research
  return r
}

ok('a round whose mode is not off counts as a read', () => {
  const s = readSummary([round(1, { mode: 'full', read: 2, used: true })])
  assert.equal(s.rounds, 1)
  assert.equal(s.read, 1)
})

ok('mode off is not a read; a missing mode is not off, so it is', () => {
  const s = readSummary([
    round(1, { mode: 'off', read: 3, used: false }),
    round(2, { mode: null, read: 4, used: null }),
  ])
  assert.equal(s.rounds, 2, 'the rounds are still counted')
  assert.equal(s.read, 1, 'exactly the round whose mode is not `off`')
  assert.equal(s.pages, 7, 'pages that came back are still pages')
})

ok('pages sum what each reading round fetched', () => {
  const s = readSummary([
    round(1, { mode: 'quick', read: 2, used: true }),
    round(2, { mode: 'full', read: 4, used: false }),
  ])
  assert.equal(s.pages, 6)
})

ok('used and unused are counted separately and neither swallows the other', () => {
  const s = readSummary([
    round(1, { mode: 'full', read: 1, used: true }),
    round(2, { mode: 'full', read: 1, used: false }),
    round(3, { mode: 'full', read: 1, used: null }),
    round(4, { mode: 'full', read: 1 }),
  ])
  assert.equal(s.used, 1, 'exactly the true one')
  assert.equal(s.unused, 1, 'exactly the false one, not the null and not the absent')
})

ok('a round with no research field counts for none of the three', () => {
  const s = readSummary([round(1), round(2, undefined), round(3, { mode: 'full', read: 5, used: true })])
  assert.equal(s.rounds, 3)
  assert.equal(s.read, 1)
  assert.equal(s.pages, 5)
  assert.equal(s.used, 1)
  assert.equal(s.unused, 0)
})

ok('an empty or missing list is all zeros', () => {
  assert.deepEqual(readSummary([]), { rounds: 0, read: 0, pages: 0, used: 0, unused: 0 })
  assert.deepEqual(readSummary(null), { rounds: 0, read: 0, pages: 0, used: 0, unused: 0 })
  assert.deepEqual(readSummary(undefined), { rounds: 0, read: 0, pages: 0, used: 0, unused: 0 })
})

ok('a read count that is not a number contributes zero pages, not NaN', () => {
  const s = readSummary([round(1, { mode: 'full', read: 'many', used: true })])
  assert.equal(s.pages, 0)
  assert.ok(Number.isFinite(s.pages))
})

ok('panelState carries the summary as `reads`', () => {
  const state = {
    id: 'c1',
    status: 'running',
    objective: 'read before writing',
    workspace: 'C:/tmp/repo',
    rounds: [
      round(1, { mode: 'full', read: 2, used: true }),
      round(2, { mode: 'off', read: 0, used: false }),
      round(3, { mode: 'quick', read: 3, used: null }),
    ],
    evalset: { tasks: [], holdout: [] },
  }
  const runtime = {
    listCampaigns: () => ['c1'],
    get: () => ({ state }),
    liveAttempts: () => [],
  }
  const out = panelState({ runtime, config: {} })
  const row = out.campaigns.find((c) => c.id === 'c1')
  assert.ok(row, 'the row must exist')
  assert.deepEqual(row.reads, { rounds: 3, read: 2, pages: 5, used: 1, unused: 1 })
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
