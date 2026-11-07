// A collapsed campaign is a row you click. It is not focusable, has no role, and
// answers no key: the whole panel can only be driven by a mouse, which is the one
// thing a sidebar operator with a keyboard (and a screen reader) cannot use.
//
// The row's props are a pure function so the behaviour can be pinned without a
// browser: role, tabindex, aria-expanded, and Enter/Space toggling once.
import assert from 'node:assert/strict'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()

assert.equal(typeof panel.hitProps, 'function', 'the row props are exported for the test to hold')
const closed = panel.hitProps({ id: 'c1' }, false)
assert.equal(closed.role, 'button', 'a clickable row says it is a button')
assert.equal(closed.tabIndex, 0, 'the row can be reached with Tab')
assert.equal(closed['aria-expanded'], false, 'a collapsed row announces it is collapsed')
ok('a campaign row is a focusable button that announces its state')

let toggles = 0
let prevented = 0
const open = panel.hitProps({ id: 'c1' }, true, () => {
  toggles += 1
})
assert.equal(open['aria-expanded'], true, 'an expanded row announces it is expanded')

open.onKeyDown({ key: 'Enter', preventDefault: () => (prevented += 1) })
open.onKeyDown({ key: ' ', preventDefault: () => (prevented += 1) })
assert.equal(toggles, 2, 'Enter and Space both toggle')
assert.equal(prevented, 2, 'the key is consumed so the page does not scroll')
ok('Enter and Space toggle a campaign')

open.onKeyDown({ key: 'a', preventDefault: () => (prevented += 1) })
open.onKeyDown({ key: 'Tab', preventDefault: () => (prevented += 1) })
assert.equal(toggles, 2, 'other keys do nothing')
assert.equal(prevented, 2, 'and are not consumed')
ok('typing and tabbing are left alone')

// Without a handler the props must still be valid (a read-only panel, or a row
// that is only a label), so nothing throws when the user presses Enter.
const inert = panel.hitProps({ id: 'c2' }, false)
inert.onKeyDown({ key: 'Enter', preventDefault: () => {} })
ok('a row with no toggle is still safe to press')

console.log(`\n${pass}/${pass} passed`)
