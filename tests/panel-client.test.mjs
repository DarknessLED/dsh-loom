// The browser half is loaded by the host through the lazy-CJS protocol, not by
// `import`: a test that only imports it would prove nothing about the wire
// contract. So this harness plays the role of `window.__ModuleLoader__` — it
// captures the factory, materializes it with a stubbed `require`, and then runs
// `apply()` against a slots stub, exactly like the client runtime does.
import { strict as assert } from 'node:assert'

let passed = 0
const failures = []
function check(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } catch (err) {
    failures.push({ name, err })
    console.log(`not ok ${passed + failures.length} - ${name}`)
    console.log('  ' + String(err?.message ?? err))
  }
}

const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (value) => [value, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  Fragment: 'fragment',
}

const captured = { loads: [], factory: null, module: null, required: [] }
globalThis.window = {
  __ModuleLoader__: {
    load(spec) {
      captured.loads.push({ id: spec.id })
      captured.factory = spec.factory
      const require = (name) => {
        captured.required.push(name)
        if (name === 'react') return fakeReact
        throw new Error(`unexpected require: ${name}`)
      }
      captured.module = spec.factory(require)
    },
  },
}

await import('../client/index.js')

const slots = []
const injects = []
const ctx = {
  inject(deps, fn) {
    injects.push(deps)
    fn({
      slots: {
        inject(name, generator) {
          const it = generator()
          const first = it.next()
          if (!first.done) slots.push({ name, value: first.value })
        },
        register() {
          return () => {}
        },
      },
    })
  },
}
captured.module.apply(ctx)

check('client bundle registers exactly one module', () => {
  assert.equal(captured.loads.length, 1)
  assert.equal(captured.loads[0].id, 'dsh-loom')
})

check('client bundle only requires react', () => {
  const unique = [...new Set(captured.required)]
  assert.deepEqual(unique, ['react'])
})

check('client exports apply and inject', () => {
  assert.equal(typeof captured.module.apply, 'function')
  assert.deepEqual(captured.module.inject, [])
})

check('apply injects the slots service once', () => {
  assert.deepEqual(injects, [['slots']])
})

check('apply registers the sidebar entry and the main panel', () => {
  assert.deepEqual(
    slots.map((s) => s.name).sort(),
    ['main', 'sidebar.panellist'],
  )
})

check('the main panel is a component factory', () => {
  const panel = captured.module.__panel?.Panel
  assert.equal(typeof panel, 'function')
  assert.equal(typeof panel(fakeReact), 'function')
})

check('money formats small amounts with more digits', () => {
  const { money } = captured.module.__panel
  assert.equal(money(0), '$0')
  assert.equal(money(0.0004), '$0.0004')
  assert.equal(money(1.234), '$1.23')
  assert.equal(money(undefined), '$0')
})

check('age renders coarse buckets in Chinese units', () => {
  const { age } = captured.module.__panel
  // The figure sits right-aligned in a mono token, so it drops "ago"/"前": the
  // label it sits next to (运行中/已完成) already frames it as elapsed time, and
  // the tooltip spells the sentence out.
  assert.equal(age(5_000), '5秒')
  assert.equal(age(90_000), '2分')
  assert.equal(age(3_600_000 * 3), '3小时')
  assert.equal(age(86_400_000 * 2), '2天')
  assert.equal(age(-1), '')
  assert.equal(age('nope'), '')
})

// The card is the integration point: the pure functions decide the line, and
// this proves the component actually mounts what they compute, in the browser
// half of the bundle, with no browser.
check('a campaign card mounts the trend, the triangle and the meters', () => {
  const { Card } = captured.module.__panel
  const CampaignCard = Card(fakeReact)
  const tree = CampaignCard({
    c: {
      id: 'loom-x',
      status: 'running',
      objective: '让三角可测',
      rounds: 4,
      spendUsd: 0.2,
      budget: { usd: 1, rounds: 12, spentUsd: 0.2, roundsUsed: 4, minutes: 240 },
      triangle: {
        rounds: 4,
        timedRounds: 4,
        durationMs: 384_000,
        secondsPerRound: 96,
        parallelFactor: 2,
        verifierShare: 0.4,
        tokens: 9_000,
        tokensPerRound: 2_250,
        usd: 0.2,
        promotionRate: 0.5,
        usdPerPromotion: 0.1,
        measured: true,
      },
      trend: [{ n: 4, status: 'promoted', score: 0.9 }],
      quality: { rounds: 4, promotions: 2, verdict: 'healthy' },
      ageMs: 60_000,
    },
    live: [],
    busy: null,
    act: () => {},
    onToggle: () => {},
    folded: false,
    confirming: null,
    setConfirming: () => {},
  })
  const classes = new Set()
  const titles = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node.props && node.props.className) classes.add(String(node.props.className))
    if (node.props && node.props.title) titles.push(String(node.props.title))
    ;(node.children || []).forEach(walk)
  }
  walk(tree)
  assert.ok(classes.has('loom-tri'), 'the five-figure line is on the card')
  assert.ok(classes.has('loom-spark'), 'the round trend is on the card')
  assert.ok(classes.has('loom-meter'), 'the budget meters are on the card')
  assert.ok(titles.some((t) => t.includes('第 4 轮')), 'a bar carries its round in the tooltip')
  assert.ok(titles.some((t) => t.includes('已花')), 'a meter spells its budget out')
})

check('triangle chips are dashes when the host measured nothing', () => {
  const { triangleChips } = captured.module.__panel
  assert.deepEqual(
    triangleChips({
      triangle: { measured: true, secondsPerRound: null, parallelFactor: null, verifierShare: null, tokens: 0, usdPerPromotion: null },
    }).map((c) => c.label),
    ['—秒/轮', '并行 ×—', '验证器 —', '— tok', '—/晋升'],
  )
  assert.deepEqual(triangleChips({ triangle: { measured: false } }).map((c) => c.label), ['未测量'])
})

check('budget meters clamp and never overflow their track', () => {
  const { budgetMeters } = captured.module.__panel
  const meters = budgetMeters({
    rounds: 9,
    budget: { rounds: 6, roundsUsed: 9, usd: 1, spentUsd: 2, minutes: 60 },
    triangle: { durationMs: 7_200_000, measured: true },
  })
  assert.deepEqual(meters.map((m) => m.pct), [100, 100, 100])
  assert.deepEqual(meters.map((m) => m.over), [true, true, true])
})

// WCAG relative luminance, so the dot colours are held to a readable floor on
// both canvases instead of being frozen at whatever hex we happen to ship.
function lum(hex) {
  const ch = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

check('every tone clears the contrast floor on both canvases', () => {
  const panel = captured.module.__panel
  const { statusTone, qualityTone, riskTone } = panel
  // A tone may be a literal or a custom-property name; either way the value it
  // resolves to is the one a reader sees, so that is what gets measured.
  const palette = {}
  for (const key of ['ok', 'warn', 'bad', 'idle']) {
    const hit = new RegExp('--loom-' + key + ':(#[0-9a-fA-F]{6})').exec(panel.CSS || '')
    if (hit) palette[key] = hit[1]
  }
  const resolve = (tone) => {
    const named = /^var\(--loom-([a-z]+)\)$/.exec(tone)
    return named ? palette[named[1]] : tone
  }
  // Mid-tone, low-saturation hues: the reference keeps colour to 6px dots, and
  // one value per hue has to read on #08090A and on white.
  const tones = [
    statusTone('running'),
    statusTone('paused'),
    statusTone('failed'),
    statusTone('idle'),
    qualityTone('healthy'),
    qualityTone('regressing'),
    riskTone('high'),
  ]
  for (const tone of tones) {
    const hex = resolve(tone)
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(String(hex)), 'tone resolves to a colour: ' + tone)
    assert.ok(contrast(hex, '#08090a') >= 3.8, hex + ' on dark')
    assert.ok(contrast(hex, '#ffffff') >= 3.8, hex + ' on white')
  }
})

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s)`)
  process.exitCode = 1
}
console.log(`\n${passed}/${passed + failures.length} passed`)
