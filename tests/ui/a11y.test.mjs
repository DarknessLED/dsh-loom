// The panel is a control surface, and right now it can only be driven by a mouse:
// the loop switch is a plain div with an onClick, nothing announces that the
// queue grew, and there is no focus ring at all beyond the browser default. A
// keyboard user cannot tell where they are, and a screen reader is told nothing
// when a checkpoint appears while they are reading.
//
// Required:
//   - `switchProps(on, onToggle)` -> { role:'switch', 'aria-checked':on,
//     tabIndex:0, onKeyDown } with Enter and Space toggling exactly once and
//     consuming the key; other keys are passed through untouched; a missing
//     handler must not throw;
//   - the "waiting on you" section carries aria-live="polite" and a label, so a
//     new checkpoint is announced instead of appearing silently;
//   - the stylesheet has a visible focus ring for keyboard users (:focus-visible
//     with a real outline and a positive offset) and never removes the outline
//     without putting something back.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()
const source = readFileSync(new URL('../../client/index.js', import.meta.url), 'utf8')
const css = String(panel.CSS ?? source)

// 1. A switch you can reach and operate without a mouse.
{
  assert.equal(typeof panel.switchProps, 'function', 'switchProps is exported')
  let toggles = 0
  const props = panel.switchProps(true, () => {
    toggles += 1
  })
  assert.equal(props.role, 'switch', 'the loop control is a switch, not a div')
  assert.equal(props['aria-checked'], true, 'and it reports its state')
  assert.equal(props.tabIndex, 0, 'and it is in the tab order')

  const fire = (key) => {
    let didPrevent = false
    props.onKeyDown({
      key,
      preventDefault() {
        didPrevent = true
      },
    })
    return didPrevent
  }
  assert.equal(fire('Enter'), true, 'Enter is consumed')
  assert.equal(toggles, 1, 'and toggles the loop once')
  assert.equal(fire(' '), true, 'Space is consumed too')
  assert.equal(toggles, 2, 'and toggles once more')
  assert.equal(fire('a'), false, 'a letter key is not swallowed')
  assert.equal(toggles, 2, 'and does nothing')
  const idle = panel.switchProps(false, null)
  assert.equal(idle['aria-checked'], false, 'a switch that is off says so')
  assert.equal(idle.onKeyDown({ key: 'Enter', preventDefault() {} }), undefined, 'no handler is not a crash')
  ok('the loop switch can be operated from the keyboard and reports its state')
}

// 2. A checkpoint that arrives while someone is reading gets announced, and the
//    focus ring survives the dark canvas.
{
  assert.ok(/aria-live/.test(source), 'the waiting section is a live region')
  assert.ok(/aria-live:\s*'polite'/.test(source), 'and it is polite: it must not interrupt')
  assert.ok(/aria-label:\s*'待你处理'/.test(source), 'and it is labelled in Chinese')
  assert.ok(/:focus-visible/.test(css), 'the stylesheet defines a keyboard focus ring')
  const ring = css.slice(css.indexOf(':focus-visible'))
  assert.ok(/outline:\s*\d/.test(ring), 'the ring is a real outline, not a colour change alone')
  assert.ok(/outline-offset:\s*[1-9]/.test(ring), 'and it sits off the element so it stays visible on a dark canvas')
  assert.equal([...css.matchAll(/outline:\s*none/g)].length, 0, 'no bare outline:none that would erase the ring')
  ok('state changes are announced and keyboard focus is visible')
}

console.log(`\n${pass}/${pass} passed`)
