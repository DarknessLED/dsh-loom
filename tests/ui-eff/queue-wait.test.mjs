// Two things a person waiting on the sidebar needs and cannot get today:
//
// 1. How long each question has waited. `pending()` already computes `waitMs`
//    from the checkpoint's own `at`, but nothing renders it, so the only way to
//    judge staleness is to open the campaign card and read its age -- which is
//    the campaign's age, not the question's.
// 2. A "暂缓" verb in the queue. The card can postpone a checkpoint; the queue
//    cannot, so the fastest way to defer a question is to go find its card.
//    `pending()` already lists 'snooze' in `actions`, and the tree already
//    renders it -- the queue row is the one surface missing the button.
//
// Both live in pure functions so the decisions can be asserted without React.
import assert from 'node:assert/strict'
import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}
const fail = (name) => {
  pass += 1
  console.log(`not ok ${pass} - ${name}`)
}

const panel = await loadPanel()

// The host sends `now` with every poll (`src/panel/api.js`), so the queue can
// read the same clock the ledger was measured with. A browser clock that is
// minutes off makes a fresh question look stale, or a stale one fresh.
const hostNow = 1_700_000_000_000
const data = {
  now: hostNow,
  campaigns: [
    {
      id: 'c1',
      ageMs: 3 * 3600_000,
      openCheckpoints: [
        { id: 'cp-fresh', kind: 'gate', at: hostNow - 10 * 60_000 },
        { id: 'cp-old', kind: 'anomaly', at: hostNow - 3 * 3600_000 },
        { id: 'cp-undated', kind: 'stuck' },
      ],
      reviews: [
        { id: 'cp-fresh', risk: 'high', summary: 'the verifier cannot reach the bar' },
        { id: 'cp-old', risk: 'low', summary: '' },
      ],
    },
  ],
}

const rows = panel.pending(data)
const fresh = rows.find((r) => r.id === 'cp-fresh')
assert.equal(fresh.waitMs, 10 * 60_000, 'the host clock decides the wait, not the browser clock')
ok('the queue reads the clock the host measured with')

// One formatting decision, one function: the row label, the tooltip and the
// tests all read the same words.
assert.equal(typeof panel.queueRowText, 'function', 'queueRowText is exported so the row text is assertable')
const text = panel.queueRowText(fresh)
assert.equal(text.campaign, 'c1')
assert.match(text.wait, /10\s*分/, 'a ten minute wait reads as ten minutes')
const old = panel.queueRowText(rows.find((r) => r.id === 'cp-old'))
assert.match(old.wait, /3\s*(小时|时)/, 'a three hour wait reads as hours')
const undated = panel.queueRowText(rows.find((r) => r.id === 'cp-undated'))
assert.equal(undated.wait, '', 'an undated question claims no wait at all')
ok('queueRowText turns a wait into words, and stays silent when unknown')

// 暂缓 must be reachable where the question is read.
assert.ok(fresh.actions.includes('snooze'), 'the queue row offers 暂缓 like the card does')
ok('the queue offers 暂缓')

console.log(`\n${pass}/${pass} passed`)
