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

check('age renders coarse buckets', () => {
  const { age } = captured.module.__panel
  assert.equal(age(5_000), '5s ago')
  assert.equal(age(90_000), '2m ago')
  assert.equal(age(3_600_000 * 3), '3h ago')
  assert.equal(age(86_400_000 * 2), '2d ago')
  assert.equal(age(-1), '')
  assert.equal(age('nope'), '')
})

check('statusTone maps statuses to colours', () => {
  const { statusTone } = captured.module.__panel
  assert.equal(statusTone('running'), '#2e7d32')
  assert.equal(statusTone('paused'), '#8a6d00')
  assert.equal(statusTone('failed'), '#b3261e')
  assert.equal(statusTone('whatever'), '#555')
})

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s)`)
  process.exitCode = 1
}
console.log(`\n${passed}/${passed + failures.length} passed`)
