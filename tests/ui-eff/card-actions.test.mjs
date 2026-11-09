// "Two clicks to stop a runaway loop" is the promise; today it is three clicks
// and half a screen of scrolling. The card's own actions live at the bottom of
// the expanded body, so a folded campaign cannot be paused at all, and a reader
// who wants to stop the thing burning budget has to expand it first.
//
// The fix is a small pure function that says which verbs a campaign offers,
// so the header can render them and a test can assert the set instead of
// trusting the JSX.
import assert from 'node:assert/strict'
import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()

assert.equal(typeof panel.cardActions, 'function', 'cardActions is exported so the verb set is assertable')

const running = panel.cardActions({ id: 'c1', status: 'running' })
assert.deepEqual(
  running.map((a) => a.key),
  ['pause', 'stop'],
  'a running campaign offers pause and stop, in that order',
)
assert.equal(running.find((a) => a.key === 'pause').label, '暂停')
assert.equal(running.find((a) => a.key === 'stop').label, '停止')
ok('a running campaign offers pause then stop')

const paused = panel.cardActions({ id: 'c2', status: 'paused' })
assert.deepEqual(
  paused.map((a) => a.key),
  ['resume', 'stop'],
  'a paused campaign offers resume, never a second pause',
)
ok('a paused campaign offers resume')

// A campaign that is over has nothing to stop, and offering the button anyway
// teaches the reader that the buttons do not mean anything.
assert.deepEqual(panel.cardActions({ id: 'c3', status: 'done' }), [], 'a finished campaign offers no verbs')
assert.deepEqual(panel.cardActions({ id: 'c4' }), [], 'a campaign with no status offers no verbs')
assert.deepEqual(panel.cardActions(null), [], 'no campaign, no verbs, no throw')
ok('finished and unknown campaigns offer nothing')

// The stop verb is destructive: the card must ask twice before it acts.
const stop = running.find((a) => a.key === 'stop')
assert.equal(stop.danger, true, 'stop is marked destructive so the UI can say so')
assert.equal(stop.confirm, true, 'stop needs a second click')
assert.notEqual(running.find((a) => a.key === 'pause').confirm, true, 'pause is reversible and needs no confirmation')
ok('stop needs a second click; pause does not')

console.log(`\n${pass}/${pass} passed`)
