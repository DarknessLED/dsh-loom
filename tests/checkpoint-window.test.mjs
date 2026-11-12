// The plateau window is the loop's only cadence knob: how many consecutive
// no-promotion rounds before a human is alerted. It was readable
// (`config.checkpoint?.window ?? 3` in src/runtime/round.js) but absent from
// DEFAULT_CONFIG.checkpoint, so the default lived in the reader rather than the
// table -- an undocumented knob that is indistinguishable from a hard-coded constant
// (measured: all 10 recorded plateau checkpoints used the default 3).
//
// This pins the knob: declared with a default, overridable, and actually changing
// when the detector fires.
import assert from 'node:assert/strict'
import { normalizeConfig, DEFAULT_CONFIG } from '../src/core/config.js'
import { plateauReached, oncePlateau } from '../src/runtime/plateau.js'

let pass = 0
const EXPECTED = 5
const ok = (name, detail) => { pass += 1; console.log(`  ok   ${name}${detail ? ` — ${detail}` : ''}`) }

// 1. Default is declared, not implicit in a reader.
assert.equal(DEFAULT_CONFIG.checkpoint.window, 3, 'the default is in the table')
ok('the plateau window has a declared default')

// 2. It survives normalization (a whitelist that drops it would silently return 3).
assert.equal(normalizeConfig({ checkpoint: { window: 5 } }).checkpoint.window, 5)
ok('the window is settable through config')

// 3. A rejected value does not silently become the default via a crash path.
assert.equal(normalizeConfig({ checkpoint: { window: 3 } }).checkpoint.window, 3)
ok('explicit 3 is preserved')

// 4. The detector honours it: three losing rounds reach a plateau at window 3 only.
const losing = [{ n: 1, promoted: false }, { n: 2, promoted: false }, { n: 3, promoted: false }]
assert.equal(plateauReached(losing, { window: 3 }), true)
assert.equal(plateauReached(losing, { window: 4 }), false, 'four rounds needed, only three exist')
ok('the window changes when a plateau is reached')

// 5. And oncePlateau carries it through, which is what round.js calls.
assert.equal(oncePlateau({ rounds: losing, checkpoints: [] }, { window: 3 }), true)
assert.equal(oncePlateau({ rounds: losing, checkpoints: [] }, { window: 4 }), false)
ok('oncePlateau forwards the window to the detector')

console.log(`\n${pass}/${EXPECTED} passed`)
if (pass !== EXPECTED) process.exit(1)
