// Load the browser half the way the host does (lazy-CJS through
// `window.__ModuleLoader__`), so a spec exercises the real bundle rather than a
// re-implementation of it.
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (value) => [value, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  Fragment: 'fragment',
}

export async function loadPanel() {
  const captured = { module: null, loads: [] }
  globalThis.window = {
    __ModuleLoader__: {
      load(spec) {
        captured.loads.push(spec.id)
        const require = (name) => {
          if (name === 'react') return fakeReact
          throw new Error(`unexpected require: ${name}`)
        }
        captured.module = spec.factory(require)
      },
    },
  }
  globalThis.localStorage = {
    store: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null
    },
    setItem(k, v) {
      this.store[k] = String(v)
    },
    removeItem(k) {
      delete this.store[k]
    },
  }
  await import('../../client/index.js')
  return captured.module.__panel
}

/** A scratch directory for specs that need somewhere to write. */
export function scratch(prefix) {
  return mkdtempSync(join(tmpdir(), `loom-${prefix}-`))
}

export { writeFileSync }
