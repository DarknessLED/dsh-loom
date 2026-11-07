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
    ['战役', '运行中', '轮数', '待处理', '花费', '知识'],
    'the six labels are Chinese: the people reading this panel read Chinese',
  )
  assert.equal(figs[0].value, '2', 'the unreadable campaign is not counted')
  assert.equal(figs[1].value, '1')
  assert.equal(figs[3].value, '2')
  assert.equal(figs[3].hot, true, 'pending work is the one figure allowed to raise its voice')
  assert.equal(figs[4].value, '$0.50')
  const quiet = client.__panel.metrics({ campaigns: [{ id: 'x', open: 0 }] })
  assert.equal(quiet[3].hot, false)
})

test('the chain reads as one thread, node kinds translated, names kept verbatim', () => {
  const client = loadClient()
  assert.equal(
    client.__panel.chainPath({ version: 2, nodes: [{ type: 'agent' }, { type: 'map' }, { type: 'verifier', name: 'tests' }, { type: 'human' }] }),
    '链 v2 · 执行 → 并行 → 验证/tests → 人审',
    'the kind is translated; the node name is an id and stays as it is',
  )
  assert.equal(client.__panel.chainPath(null), '', 'a campaign without a chain says nothing')
  assert.equal(client.__panel.chainPath({ nodes: [] }), '链 v?', 'an unknown version is admitted, not faked')
  assert.equal(client.__panel.chainPath({ version: 1, nodes: [{ type: 'custom' }] }), '链 v1 · custom', 'an unknown kind shows through')
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
    tasks: 3,
  })
  // The rounds and the money moved into the meters and the chain version into
  // the chain line, so the row is only the artefacts a reader looks up.
  assert.deepEqual(meta, ['最佳 0.9', '2 条知识', '3 任务'])
  assert.deepEqual(client.__panel.campaignMeta({ rounds: 2 }), [], 'nothing known, nothing claimed')
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
  assert.equal(chips[1].label, 'r1a2 0 已放弃')
  assert.equal(chips[2].label, 'r1a3 — 已筛除')
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
  assert.match(css, /\.loom-spark \.pt\[data-tone="ok"\]\{background:var\(--loom-ok\)\}/, 'the trend borrows the state palette, it does not invent one')
  assert.match(css, /\.loom-tri\{[^}]*font-family:var\(--loom-mono\)/, 'five figures are mono so the decimals line up')
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
  assert.match(source, /armed \? '确定\?' : '驳回'/, 'reject arms before it fires')
  assert.match(source, /armed \? '停止\?' : '停止'/, 'stop arms too')
  assert.match(source, /if \(action\.confirm && !isArmed\)/, 'a tree action with confirm only arms on the first click')
  assert.match(source, /if \(!armed\) \{\s+setConfirming\(key\)/, 'the first click only arms')
})

// The campaign body is a tree, like the Agent Teams panel's delegation tree:
// a campaign is the root, and its round, its blocked decisions, its live
// attempts and its lessons hang off it as branches. These assertions pin the
// shape, because "it renders something" is exactly what a flat chip list also
// does.
test('the tree hangs the round, the decisions, the live attempts and the lessons off the campaign', () => {
  const client = loadClient()
  const nodes = client.__panel.treeOf(
    {
      id: 'loom-x',
      lessons: 3,
      lessonsTop: [
        { id: 'l1', claim: '测试文件不能被改', kind: 'hazard', score: 0.4 },
        { id: 'l2', claim: '先跑小验证', kind: 'fact', score: 0.2 },
      ],
      lastRound: { n: 6, score: 1, promoted: true, attempts: [{ id: 'r6a1', score: 1, verifierOk: true }] },
      openCheckpoints: [{ id: 'cp-1', kind: 'gate', payload: { verdict: 'promote', delta: 0.2 } }],
    },
    [{ attemptId: 'r7a1', idleMs: 12_000 }],
  )
  const lines = client.__panel.treeLines(nodes)
  assert.deepEqual(lines, [
    '├─ 第 6 轮  已晋升 · 1',
    '  └─ r6a1  1',
    '├─ 待审  1',
    '  └─ 晋升待审 cp-1  promote · Δ0.2',
    '├─ 进行中  1',
    '  └─ r7a1  运行中 · 静默 12 秒',
    '└─ 知识  3',
    '  ├─ 风险 测试文件不能被改  +0.4',
    '  └─ 事实 先跑小验证  +0.2',
  ])
})

test('a quiet campaign draws an honest empty tree, and unknown words show through', () => {
  const client = loadClient()
  assert.deepEqual(client.__panel.treeOf({ id: 'fresh' }, []), [], 'nothing happened yet, so nothing is invented')
  const nodes = client.__panel.treeOf(
    { lastRound: { n: 1, attempts: [{ id: 'r1a1', score: 0.5, verifierOk: false, screenedOut: true }] }, openCheckpoints: [{ id: 'cp-9', kind: 'brand-new' }] },
    [],
  )
  const lines = client.__panel.treeLines(nodes)
  assert.equal(lines[1], '  └─ r1a1  0.5 · 已筛除', 'the losing candidate keeps its verdict')
  assert.equal(lines[3], '  └─ brand-new cp-9', 'an unknown checkpoint kind is not swallowed')
  assert.equal(client.__panel.checkpointLabel('stuck'), '门不可达')
  assert.equal(client.__panel.statusLabel('paused'), '已暂停')
  assert.equal(client.__panel.qualityLabel('regressing'), '退步')
  assert.equal(client.__panel.nodeLabel('human'), '人审')
})

test('every tree row carries its depth and whether it is the last sibling', () => {
  const client = loadClient()
  const rows = client.__panel.flattenTree(
    [
      { key: 'a', label: 'A', children: [{ key: 'a1', label: 'A1' }, { key: 'a2', label: 'A2' }] },
      { key: 'b', label: 'B' },
    ],
    1,
    [],
  )
  assert.deepEqual(
    rows.map((r) => [r.key, r.depth, r.last]),
    [
      ['a', 1, false],
      ['a1', 2, false],
      ['a2', 2, true],
      ['b', 1, true],
    ],
    'the last child of every branch stops the rail',
  )
})

// The triangle is the strip the panel was missing: how long a round takes, how
// much of it runs in parallel, what the verifier eats, the tokens burnt and the
// price of a promotion. Four of the five are nullable by design — `measured:
// false` is a fact the host reports, not a bug — so the dashes are pinned as
// hard as the numbers.
test('the triangle is five figures on one line, each explaining itself', () => {
  const { triangleChips } = loadClient().__panel
  const chips = triangleChips({
    triangle: {
      rounds: 7,
      timedRounds: 7,
      durationMs: 672_000,
      secondsPerRound: 96,
      parallelFactor: 2.34,
      verifierShare: 0.38,
      tokens: 18_432,
      tokensPerRound: 2_633,
      usd: 0.41,
      promotionRate: 5 / 7,
      usdPerPromotion: 0.082,
      measured: true,
    },
  })
  assert.deepEqual(chips.map((c) => c.key), ['speed', 'parallel', 'verifier', 'tokens', 'promotion'], 'one fixed order, like the meta row')
  assert.deepEqual(chips.map((c) => c.label), ['96秒/轮', '并行 ×2.3', '验证器 38%', '18.4k tok', '$0.08/晋升'])
  assert.match(chips[0].title, /96 秒/, 'the title spells the number out instead of abbreviating it')
  assert.match(chips[0].title, /7\/7 轮/, 'and admits how many rounds were actually timed')
  assert.match(chips[1].title, /2\.34/, 'the factor is rounded on screen, not in the tooltip')
  assert.match(chips[3].title, /18432 token/, 'token counts are exact in the title, compact on the line')
  assert.match(chips[4].title, /每次晋升 \$0\.08/)
})

test('an unmeasured leg is a dash, never a zero', () => {
  const { triangleChips } = loadClient().__panel
  const chips = triangleChips({
    triangle: {
      rounds: 0,
      timedRounds: 0,
      secondsPerRound: null,
      parallelFactor: null,
      verifierShare: null,
      tokens: 0,
      usd: 0,
      tokensPerRound: null,
      usdPerPromotion: null,
      promotionRate: null,
      measured: true,
    },
  })
  assert.deepEqual(chips.map((c) => c.label), ['—秒/轮', '并行 ×—', '验证器 —', '— tok', '—/晋升'])
  assert.ok(
    !chips.some((c) => /(^|[^\d])0([^\d]|$)/.test(c.label)),
    'a zero here would claim the loop measured nothing, which is the opposite of having no measurement',
  )
  assert.match(chips[4].title, /还没有晋升/, 'and the title says why there is no price yet')
})

test('measured:false is one quiet chip, not five dashes', () => {
  const { triangleChips } = loadClient().__panel
  const quiet = triangleChips({ triangle: { measured: false, rounds: 0, tokens: 0, usd: 0 } })
  assert.equal(quiet.length, 1, 'one statement of absence beats five')
  assert.equal(quiet[0].key, 'unmeasured')
  assert.equal(quiet[0].label, '未测量')
  assert.equal(quiet[0].quiet, true, 'it renders as a quiet chip, not as data')
  assert.equal(triangleChips({})[0].key, 'unmeasured', 'a campaign without a triangle says so just as plainly')
})

test('the trend is the last eight rounds: height by score, colour by verdict', () => {
  const { sparkOf } = loadClient().__panel
  const rounds = []
  for (let n = 1; n <= 10; n += 1) {
    rounds.push({ n, status: n % 3 === 0 ? 'no-gain' : 'promoted', score: n / 10 })
  }
  const spark = sparkOf({ trend: rounds })
  assert.equal(spark.count, 8, 'the window is a glance, not a ledger')
  assert.equal(spark.bars[0].n, 3, 'the oldest rounds fall off the left')
  assert.equal(spark.bars[7].n, 10)
  assert.equal(spark.bars[7].px, 13, 'the best round of the window is the tallest bar')
  assert.ok(spark.bars[0].px < spark.bars[7].px, 'height is the score, so a worse round is shorter')
  assert.deepEqual(
    spark.bars.map((b) => b.tone),
    ['warn', 'ok', 'ok', 'warn', 'ok', 'ok', 'warn', 'ok'],
    'a no-gain round is the warm accent; a promoted one is the ok accent',
  )
})

test('a bar says which round it was, what happened and the score', () => {
  const { sparkOf } = loadClient().__panel
  const spark = sparkOf({ lastRound: { n: 6, status: 'promoted', score: 0.94 } })
  assert.equal(spark.count, 1, 'the host ships one round today; the trend shows one bar and invents none')
  assert.equal(spark.bars[0].title, '第 6 轮 已晋升 0.94')
  const bare = sparkOf({ lastRound: { n: 8, status: 'running' } })
  assert.equal(bare.bars[0].title, '第 8 轮 未计分', 'a missing score is admitted, not rounded to zero')
  const crash = sparkOf({ trend: [{ n: 9, status: 'crashed', score: 0.1 }] })
  assert.equal(crash.bars[0].tone, 'bad', 'a crashed round is the bad accent, not the idle one')
})

test('a campaign with no rounds has no trend, and that is not an error', () => {
  const { sparkOf } = loadClient().__panel
  assert.deepEqual(sparkOf({ rounds: 0 }).bars, [])
  assert.equal(sparkOf({}).count, 0)
  assert.deepEqual(sparkOf(null).bars, [], 'a broken campaign still renders')
})

test('the meters clamp at 100% and admit when a budget is spent', () => {
  const { budgetMeters } = loadClient().__panel
  const meters = budgetMeters({
    rounds: 20,
    spendUsd: 0.5,
    budget: { usd: 1, rounds: 12, spentUsd: 1.2, roundsUsed: 20, minutes: 240 },
    triangle: { durationMs: 600_000, measured: true },
  })
  assert.deepEqual(meters.map((m) => m.key), ['rounds', 'spend', 'time'], 'the same three meters on every campaign')
  assert.deepEqual(meters.map((m) => m.label), ['轮数', '花费', '时间'])
  assert.deepEqual(meters.map((m) => m.text), ['20/12', '$1.20/$1.00', '10/240 分'], 'the number is right aligned in mono')
  assert.deepEqual(meters.map((m) => m.pct), [100, 100, 4], 'a fill never leaves its 2px track')
  assert.deepEqual(meters.map((m) => m.tone), ['bad', 'bad', 'ok'])
  assert.deepEqual(meters.map((m) => m.over), [true, true, false], 'over budget is a fact, not a clipped picture')
})

test('a budget that was never set is a dash, not a full meter', () => {
  const { budgetMeters } = loadClient().__panel
  const bare = budgetMeters({ rounds: 3 })
  assert.deepEqual(bare.map((m) => m.text), ['3/—', '$0/—', '—/—'])
  assert.deepEqual(bare.map((m) => m.pct), [0, 0, 0], 'no cap must not read as 100%')
  assert.match(bare[2].title, /未测量/, 'an unmeasured duration says so')
  assert.doesNotThrow(() => budgetMeters(null))
})

test('the card draws the strip, the trend and the meters its pure functions compute', () => {
  const source = readFileSync(clientPath, 'utf8')
  assert.match(source, /var tri = triangleChips\(c\)/, 'the card asks the tested function, it does not re-derive the line')
  assert.match(source, /h\('div', \{ className: 'loom-vitals' \}, sparkNode, metersNode\)/)
  assert.match(source, /className: 'loom-tri'/)
  assert.match(source, /className: 'loom-meter'/)
  assert.ok(!/'loom-ev'/.test(source), 'the old evidence line is gone, not left half rendered')
})
