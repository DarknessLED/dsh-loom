// The settings form was built, exported, and still invisible.
//
// `src/config-schema.js` produced a real schemastery schema and `src/index.js`
// exported it as `Config`, yet the host kept reporting
// `include:dsh-loom  status: "absent"`. The host does not read the module
// namespace: cordis-plugin-loader normalizes it first --
//
//   unwrapExports(exports) {
//     exports = exports.default ?? exports
//     if (!exports.__esModule) return exports
//     return exports.default ?? exports
//   }
//
// -- and then takes `plugin.Config` / `plugin.inject` off whatever came back.
// A module with `export default apply` therefore hands the host the *function*,
// and a function carries no `.Config`. The schema was one property lookup away
// from every reader that mattered, and no test looked at the shape the host
// actually sees.
//
// Rule: the default export must carry the metadata the loader reads, and the
// namespace export must keep doing so for `import * as`.
import assert from 'node:assert/strict'
import { Config as named, inject as namedInject, name as namedName } from '../../src/index.js'
import defaultExport from '../../src/index.js'

let pass = 0
const ok = (n) => {
  pass += 1
  console.log('ok ' + n)
}

/** Exactly the host's normalization, copied so a change in it is a test change. */
function unwrapExports(exports) {
  if (exports === null || exports === undefined) return exports
  exports = exports.default ?? exports
  if (!exports.__esModule) return exports
  return exports.default ?? exports
}

/** The same predicate the host's Config inspector applies before it says `schema`. */
function isNativeConfigSchema(value) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return false
  const meta = Reflect.get(value, 'meta')
  return (
    Reflect.get(value, Symbol.for('schemastery')) === true &&
    typeof Reflect.get(value, 'type') === 'string' &&
    meta !== null &&
    typeof meta === 'object'
  )
}

// 1. The shape the host sees, not the shape we wrote.
{
  const plugin = unwrapExports(await import('../../src/index.js'))
  assert.ok(typeof plugin === 'function', 'the loader unwraps to the callable entry')
  assert.ok(plugin.Config !== undefined && plugin.Config !== null, 'and the entry it hands over carries the Config')
  assert.ok(isNativeConfigSchema(plugin.Config), 'the schema passes the inspector, so the status reads `schema`')
  ok('the unwrapped default export carries a Config the host accepts')
}

// 2. The dependency declaration has to survive the same normalization. Losing it
//    would not fail loudly: `apply` would simply run without `ctx.tools` resolved.
{
  const plugin = unwrapExports(await import('../../src/index.js'))
  assert.deepEqual(plugin.inject, ['tools'], 'the loader still sees the hard dependency')
  ok('the unwrapped default export keeps its inject list')
}

// 3. Both module shapes stay usable. Namespace readers are what the tests and
//    `scripts/verify.mjs` use, so the fix must not trade one shape for another.
{
  assert.equal(typeof named, typeof defaultExport.Config, 'the namespace and the default agree on Config')
  assert.equal(named, defaultExport.Config, 'and they are the same value, not two schemas')
  assert.deepEqual(namedInject, defaultExport.inject, 'the inject lists agree too')
  assert.equal(namedName, 'dsh-loom', 'the package still names itself in the namespace')
  ok('namespace and default exports describe the same plugin')
}

// 4. A function export cannot carry `name` -- it is read-only -- so the fix must
//    not try. This pins the mistake that a first attempt made at runtime.
{
  const plugin = unwrapExports(await import('../../src/index.js'))
  assert.equal(plugin.name, 'apply', 'the function keeps its own read-only name')
  assert.equal(namedName, 'dsh-loom', 'while the namespace carries the package name')
  ok('assigning the package name never touched the callable')
}

console.log(`\n${pass}/4 passed`)
assert.equal(pass, 4)
