// The audit (research/ui-audit-2026-11.md, A5/A7/A8) found three cards that say
// the same thing where they should differ:
//
//   - `statusTone` folds done / stopped / planning / idle into one grey dot, so
//     a finished campaign and an unstarted one are the same pixel and the reader
//     must read the word to tell them apart.
//   - the head row's dot answers "is it running", never "is it waiting for me":
//     a campaign holding three questions draws the same dot as an idle one.
//   - a folded row's brief is an empty span when the campaign has no money and
//     no incumbent, so the most common row shape carries nothing at all.
//
// None of this is geometry, so `panel-audit` cannot see it; all of it lives in
// pure functions, so this can.

import assert from 'node:assert/strict'
import { loadPanel } from '../ui/harness.mjs'

const panel = await loadPanel()
let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass += 1
    console.log('ok   ' + name)
  } catch (err) {
    fail += 1
    console.log('FAIL ' + name + ' - ' + (err && err.message))
  }
}

// A7 - a finished campaign and one that has not started must not be one dot.
ok('done and planning are different tones', () => {
  assert.notEqual(panel.statusTone('done'), panel.statusTone('planning'))
})
ok('done and stopped are different tones', () => {
  assert.notEqual(panel.statusTone('done'), panel.statusTone('stopped'))
})
ok('every tone names a declared variable', () => {
  const allowed = Object.keys(panel.TONES).map((k) => panel.TONES[k])
  assert.ok(allowed.length >= 5, 'four tones cannot separate done, stopped and planning')
  for (const status of ['running', 'paused', 'done', 'stopped', 'planning', 'failed', 'idle']) {
    assert.ok(allowed.includes(panel.statusTone(status)), status)
  }
})

// A5 - the head row must answer "am I the one blocking it".
ok('cardTone is exported so the head dot is assertable', () => {
  assert.equal(typeof panel.cardTone, 'function')
})
ok('a running campaign holding questions differs from one that is not', () => {
  assert.equal(panel.cardTone({ status: 'running', open: 3 }), 'warn')
  assert.equal(panel.cardTone({ status: 'running', open: 0 }), 'ok')
})
ok('a failed campaign outranks its queue', () => {
  assert.equal(panel.cardTone({ status: 'failed', open: 3 }), 'bad')
})
ok('a planned-but-unstarted campaign is not running', () => {
  assert.equal(panel.cardTone({ status: 'planning', open: 0 }), 'idle')
})

// A8 - a folded row must always say something.
ok('foldBrief is exported', () => {
  assert.equal(typeof panel.foldBrief, 'function')
})
ok('a campaign with nothing measured still says how far it got', () => {
  const brief = panel.foldBrief({ status: 'planning', rounds: 0, budget: {}, incumbent: null, lessons: 0 })
  assert.equal(typeof brief, 'string')
  assert.ok(brief.length > 0, 'a folded row with an empty brief is a blank line in the sidebar')
  assert.doesNotMatch(brief, /undefined|NaN|Infinity/)
})
ok('a campaign with figures leads with them', () => {
  const brief = panel.foldBrief({ status: 'running', rounds: 7, budget: { spentUsd: 0.41 }, incumbent: { score: 0.94 }, lessons: 6 })
  assert.match(brief, /7/)
})

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
