// What the sidebar says, tested without a browser.
//
// The panel once rendered its header and footer and nothing else: `Panel` was
// handed the *factory* `Card(react)` instead of the component it returns, and
// React quietly refused to render a function as a child. The data was perfect
// and the sidebar looked empty, which is the worst kind of bug to find by eye.
// So the layout decisions live in three pure functions over one payload, and
// this file pins both them and the wiring that hands `Panel` a real component.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const clientPath = join(here, '..', 'client', 'index.js')

/** Load the client bundle by replaying its loader the way the browser does. */
function loadClient() {
  const source = readFileSync(clientPath, 'utf8')
  let captured = null
  const window = {
    __ModuleLoader__: {
      load({ id, factory }) {
        captured = { id, exports: factory((name) => {
          if (name !== 'react') throw new Error(`unexpected require: ${name}`)
          return { createElement: () => null, useState: () => [null, () => {}], useEffect: () => {}, useCallback: (f) => f }
        }) }
      },
    },
  }
  // eslint-disable-next-line no-new-func
  const run = new Function('window', source)
  run(window)
  assert.ok(captured, 'the bundle registers itself with the module loader')
  assert.equal(captured.id, 'dsh-loom')
  return captured.exports
}

const payload = {
  campaigns: [
    {
      id: 'loom-a',
      status: 'running',
      rounds: 3,
      spendUsd: 0.42,
      open: 2,
      lessons: 4,
      quarantined: 1,
      ageMs: 60_000,
      reviews: [
        { id: 'cp-1', kind: 'holdout', risk: 'high', summary: 'holdout regressed on task suite' },
        { id: 'cp-2', kind: 'gate', risk: 'normal', summary: 'promote r3a1' },
      ],
      openCheckpoints: [
        { id: 'cp-1', kind: 'holdout', payload: {} },
        { id: 'cp-2', kind: 'gate', payload: {} },
      ],
      lessonsTop: [
        { id: 'l1', claim: 'the flag file was stale', kind: 'fact', score: 0.3 },
        { id: 'l2', claim: 'editing tests hides a regression', kind: 'hazard', score: 0.2 },
      ],
    },
    {
      id: 'loom-b',
      status: 'done',
      rounds: 2,
      spendUsd: 0.08,
      open: 0,
      lessons: 1,
      quarantined: 0,
      reviews: [],
      openCheckpoints: [],
      lessonsTop: [{ id: 'l3', claim: 'cache reads stale state', kind: 'recipe', score: 0 }],
    },
    { id: 'broken', error: 'cannot read campaign' },
  ],
  live: [{ attemptId: 'r4a1', campaign: 'loom-a', idleMs: 12_000 }],
  rsi: { enabled: false, at: 1, by: 'human' },
  ownership: { owner: 42, mine: true },
  lean: { available: true },
  now: 0,
}

test('overview counts only campaigns it could read', () => {
  const client = loadClient()
  const ov = client.__panel.overview(payload)
  assert.equal(ov.campaigns, 2, 'the broken campaign is not counted as a campaign')
  assert.equal(ov.running, 1)
  assert.equal(ov.rounds, 5)
  assert.equal(Math.round(ov.spend * 100) / 100, 0.5)
  assert.equal(ov.open, 2)
  assert.equal(ov.lessons, 5)
  assert.equal(ov.live, 1)
})

test('pending is the riskiest decision first, across campaigns', () => {
  const client = loadClient()
  const queue = client.__panel.pending(payload)
  assert.equal(queue.length, 2)
  assert.equal(queue[0].id, 'cp-1', 'high risk leads')
  assert.equal(queue[0].risk, 'high')
  assert.equal(queue[0].campaign, 'loom-a')
  assert.equal(queue[0].summary, 'holdout regressed on task suite')
  assert.equal(queue[1].risk, 'normal')
})

test('a checkpoint without a review still shows, at normal risk', () => {
  const client = loadClient()
  const bare = {
    campaigns: [{ id: 'c', open: 1, reviews: [], openCheckpoints: [{ id: 'cp-x', kind: 'budget' }] }],
    live: [],
  }
  const queue = client.__panel.pending(bare)
  assert.equal(queue.length, 1)
  assert.equal(queue[0].risk, 'normal')
  assert.equal(queue[0].summary, '')
})

test('knowledge groups by kind and keeps the strongest claims', () => {
  const client = loadClient()
  const tree = client.__panel.knowledge(payload)
  assert.equal(tree.active, 5)
  assert.equal(tree.quarantined, 1)
  const kinds = tree.kinds.map((g) => g.kind)
  assert.deepEqual(kinds.sort(), ['fact', 'hazard', 'recipe'])
  for (const group of tree.kinds) {
    if (group.items.length > 1) {
      assert.ok(group.items[0].score >= group.items[1].score, 'items are ordered by earned value')
    }
  }
})

test('an empty panel is still a valid model', () => {
  const client = loadClient()
  const ov = client.__panel.overview({ campaigns: [] })
  assert.deepEqual(
    { campaigns: ov.campaigns, rounds: ov.rounds, open: ov.open, live: ov.live },
    { campaigns: 0, rounds: 0, open: 0, live: 0 },
  )
  assert.deepEqual(client.__panel.pending({ campaigns: [] }), [])
  assert.deepEqual(client.__panel.knowledge({ campaigns: [] }).kinds, [])
})

test('Panel is handed a component, not the factory that builds one', () => {
  const source = readFileSync(clientPath, 'utf8')
  assert.match(source, /var CardView = Card\(react\)/, 'Card is instantiated once in apply')
  assert.match(source, /Panel\(react, CardView\)/, 'Panel receives the component')
  assert.doesNotMatch(source, /h\(Card, \{ key: c\.id/, 'the body must not render the factory itself')
})

test('the scrolling region keeps the switch and totals in place', () => {
  const source = readFileSync(clientPath, 'utf8')
  assert.match(source, /overflowY: 'auto'/, 'the middle column scrolls')
  assert.match(source, /height: '100%'/, 'the panel fills its slot so the middle column has a height')
})
