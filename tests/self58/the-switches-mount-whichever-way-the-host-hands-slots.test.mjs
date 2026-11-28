// The two switches disappeared from the composer while the host half kept
// working: `/dsh-loom/state` answered, the settings were being written, and the
// browser half had registered nothing at all. The cause was the way it asked for
// the slot service -- `ctx.inject(['slots'], …)` -- which the repository's host
// update stopped calling back, while an installed plugin (dsh-unlag) reaches
// `ctx.slots` directly.
//
// A spec that greps for both branches would pass even if neither ran, so this
// one runs the bundle the way the host does: through the lazy-CJS loader, twice,
// against two different contexts. The one that matters is the first: a host that
// hands over `ctx.slots` and has no `ctx.inject` at all.
//   node tests/self58/the-switches-mount-whichever-way-the-host-hands-slots.test.mjs
import assert from 'node:assert/strict'

import { ok, done } from '../chaos/fixture.mjs'

const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (value) => [value, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  Fragment: 'fragment',
}

const captured = { factory: null, module: null }
globalThis.window = {
  __ModuleLoader__: {
    load(spec) {
      captured.factory = spec.factory
      captured.module = spec.factory((name) => {
        if (name === 'react') return fakeReact
        throw new Error(`unexpected require: ${name}`)
      })
    },
  },
}

await import('../../client/index.js')

/** A slot service that runs each injection once, like the host does on mount. */
function slotService(collected) {
  return {
    inject(name, generator) {
      const it = generator()
      const first = it.next()
      if (!first.done) collected.push({ name, value: first.value })
    },
    register(spec) {
      collected.push({ name: spec.name, spec })
      return () => {}
    },
  }
}

// 1. The host that has `ctx.slots` and nothing else. This is the shape the
//    repository's host now uses, and the one that silently rendered nothing.
{
  const seen = []
  const ctx = { slots: slotService(seen) }
  captured.module.apply(ctx)
  const rows = seen
    .filter((entry) => entry.spec)
    .map((entry) => `${entry.spec.name}#${entry.spec.id || entry.spec.key}`)
    .sort()
  assert.deepEqual(
    rows,
    ['conversation.input.left#dsh-loom-pills', 'main#dsh-loom', 'sidebar.panellist#dsh-loom'],
    `the composer switch and the sidebar entry both register, got: ${rows.join(', ')}`,
  )
  ok('a host handing over ctx.slots mounts both switches and the sidebar entry')
}

// 2. An older host that only offers `ctx.inject(['slots'], …)`. Keeping it means
//    the same bundle still works where the direct service is not exposed.
{
  const seen = []
  const ctx = {
    inject(deps, fn) {
      assert.deepEqual(deps, ['slots'], 'the legacy path asks for the same service by name')
      fn({ slots: slotService(seen) })
    },
  }
  captured.module.apply(ctx)
  assert.equal(seen.filter((entry) => entry.spec).length, 3, 'the legacy path still registers all three')
  ok('the older ctx.inject hand-over still mounts them')
}

// 3. Neither service: the bundle must do nothing rather than throw, because a
//    client half that throws takes the whole plugin page down with it.
{
  assert.doesNotThrow(() => captured.module.apply({}), 'a context without slots is tolerated')
  ok('a context with no slot service is a no-op, not an exception')
}

done()
