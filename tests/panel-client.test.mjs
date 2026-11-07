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

check('statusTone maps statuses to colours', () => {
  const { statusTone } = captured.module.__panel
  // Mid-tone, low-saturation hues: the reference keeps colour to 6px dots, and
  // a dot has to read on #08090A and on white with the same value.
  assert.equal(statusTone('running'), '#3d8a58')
  assert.equal(statusTone('paused'), '#8f7a33')
  assert.equal(statusTone('failed'), '#c05a4a')
  assert.equal(statusTone('whatever'), '#7a7f87')
  // one value per hue, so the same dot reads on the dark canvas and on white
  const { qualityTone, riskTone } = captured.module.__panel
  for (const hex of [statusTone('running'), statusTone('paused'), statusTone('failed'), statusTone('idle'), qualityTone('healthy'), qualityTone('regressing'), riskTone('high')]) {
    assert.ok(contrast(hex, '#08090a') >= 3.8, hex + ' on dark')
    assert.ok(contrast(hex, '#ffffff') >= 3.8, hex + ' on white')
  }
})

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s)`)
  process.exitCode = 1
}
console.log(`\n${passed}/${passed + failures.length} passed`)
