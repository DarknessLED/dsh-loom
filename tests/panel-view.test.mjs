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

// ---- the design system, pinned ----------------------------------------
//
// The panel is grounded in the Linear pack from OpenDesign (opendesign.cc):
// monochrome ink at fixed opacities, hairline dividers instead of cards,
// mono for anything numeric, one 4px rhythm, 150ms motion, no gradients.
// These assertions exist because every one of those rules is the kind of
// thing that quietly erodes: someone adds "just a soft shadow" and the
// dashboard reads like a demo again.

test('the strip is six figures in a fixed order, pending flagged when non-zero', () => {
  const client = loadClient()
  const figs = client.__panel.metrics(payload)
  assert.deepEqual(
    figs.map((f) => f.label),
    ['campaigns', 'live', 'rounds', 'pending', 'spend', 'lessons'],
  )
  assert.equal(figs[0].value, '2', 'the unreadable campaign is not counted')
  assert.equal(figs[1].value, '1')
  assert.equal(figs[3].value, '2')
  assert.equal(figs[3].hot, true, 'pending work is the one figure allowed to raise its voice')
  assert.equal(figs[4].value, '$0.50')
  const quiet = client.__panel.metrics({ campaigns: [{ id: 'x', open: 0 }] })
  assert.equal(quiet[3].hot, false)
})

test('the chain reads as one thread, ids included and nothing invented', () => {
  const client = loadClient()
  assert.equal(
    client.__panel.chainPath({ version: 2, nodes: [{ type: 'agent' }, { type: 'map' }, { type: 'verifier', name: 'tests' }, { type: 'human' }] }),
    'chain v2 · agent → map → verifier/tests → human',
  )
  assert.equal(client.__panel.chainPath(null), '', 'a campaign without a chain says nothing')
  assert.equal(client.__panel.chainPath({ nodes: [] }), 'chain v?', 'an unknown version is admitted, not faked')
})

test('campaign figures keep the same order on every row', () => {
  const client = loadClient()
  const meta = client.__panel.campaignMeta({
    rounds: 1,
    spendUsd: 0.02,
    chainVersion: 1,
    incumbent: { score: 0.9 },
    lessons: 2,
    holdout: 0,
  })
  assert.deepEqual(meta, ['1 round', '$0.02', 'chain v1', 'best 0.9', '2 lessons'])
})

test('attempt chips carry the verifier verdict, never a guess', () => {
  const client = loadClient()
  const chips = client.__panel.attemptChips({
    attempts: [
      { id: 'r1a1', score: 1, verifierOk: true },
      { id: 'r1a2', score: 0, verifierOk: false, abandoned: 'stalled' },
      { id: 'r1a3', score: null, verifierOk: false, screenedOut: true },
    ],
  })
  assert.deepEqual(
    chips.map((c) => [c.key, c.tone]),
    [['r1a1', 'ok'], ['r1a2', 'bad'], ['r1a3', 'bad']],
  )
  assert.equal(chips[1].label, 'r1a2 0 stalled')
  assert.equal(chips[2].label, 'r1a3 — screened')
  assert.deepEqual(client.__panel.attemptChips(undefined), [], 'a campaign that has not run still renders')
})

test('the palette is monochrome ink, and colour is reserved for 6px dots', () => {
  const client = loadClient()
  const css = client.__panel.CSS
  assert.ok(css.includes('--loom-base:var(--loom-ink-base,currentColor)'), 'tints mix against one pinned opaque ink')
  assert.ok(!/color-mix\(in srgb,\s*currentColor/.test(css), 'never mix against currentColor: nested labels would multiply the alpha')
  assert.ok(typeof client.__panel.paintInk === 'function', 'the ink is measured at mount, not guessed')
  assert.ok(!/linear-gradient|radial-gradient/.test(css), 'no gradients: the reference has none')
  assert.ok(!/border-radius:\s*(12|16|24)px/.test(css), 'radius stays at 4–6px')
  assert.match(css, /transition:[^;]*150ms/, 'motion is 150ms, the reference’s micro duration')
  assert.match(css, /cubic-bezier\(\.25,\.46,\.45,\.94\)/, 'and its easing, not a spring')
  assert.ok(!/box-shadow:(?!.*var\(--loom-ok\)|.*var\(--loom-warn\))/.test(css), 'no card shadows')
  assert.ok(css.includes('prefers-reduced-motion'), 'motion can be switched off')
})

test('the ink base is measured from the host, and a hostile document cannot kill the panel', () => {
  const { paintInk } = loadClient().__panel
  const writes = []
  const root = { style: { setProperty: (k, v) => writes.push([k, v]) } }
  paintInk({
    querySelector: (sel) => (sel === '.loom' ? root : null),
    defaultView: { getComputedStyle: () => ({ color: 'rgb(247, 248, 248)' }) },
  })
  assert.deepEqual(writes, [['--loom-ink-base', 'rgb(247, 248, 248)']])
  // a detached panel, an exception during measurement, and a null document all
  // have to be survivable: the tint falls back to currentColor on its own
  assert.doesNotThrow(() => paintInk(null))
  assert.doesNotThrow(() => paintInk({}))
  assert.doesNotThrow(() =>
    paintInk({
      querySelector: () => {
        throw new Error('gone')
      },
      defaultView: {},
    }),
  )
  assert.doesNotThrow(() => paintInk({ querySelector: () => null, defaultView: {} }))
})

test('one stylesheet, injected once, from the component not the module', () => {
  const source = readFileSync(clientPath, 'utf8')
  assert.match(source, /window\.__ModuleLoader__\.load\(\{[\s\S]*factory:/, 'the bundle protocol is unchanged')
  assert.ok(!/^document\./m.test(source), 'the module body must not touch the DOM at load time')
  assert.match(source, /ensureStyle\(typeof document === 'undefined' \? null : document\)/, 'the style is installed on mount')
  assert.match(source, /doc\.getElementById\(STYLE_ID\)/, 'and only once per page')
})

test('a destructive action needs a second click', () => {
  const source = readFileSync(clientPath, 'utf8')
  assert.match(source, /armed \? 'sure\?' : 'reject'/, 'reject arms before it fires')
  assert.match(source, /isArmed \? 'stop\?' : action/, 'stop arms too')
  assert.match(source, /if \(!armed\) \{\n\s+setConfirming\(key\)/, 'the first click only arms')
})
