// "Waiting on you" is the one queue a person has to act on, and it reports the
// wrong clock: the age of the campaign, not the age of the question. A checkpoint
// raised ten minutes ago inside a campaign that has run for three hours shows
// "3小时" -- so a fresh, cheap question looks like a stale one and the urgent
// ones do not surface.
//
// It also offers fewer verbs than the card does: the card can snooze a
// checkpoint, the queue can only approve or reject, so the fastest way to defer
// a question is to go find its card.
import assert from 'node:assert/strict'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()
const now = 1_700_000_000_000
const data = {
  campaigns: [
    {
      id: 'c1',
      ageMs: 3 * 3600_000,
      openCheckpoints: [
        { id: 'cp-fresh', kind: 'gate', at: now - 10 * 60_000 },
        { id: 'cp-undated', kind: 'anomaly' },
      ],
      reviews: [
        { id: 'cp-fresh', risk: 'high', summary: 'the verifier cannot reach the bar' },
        { id: 'cp-undated', risk: 'low', summary: '' },
      ],
    },
  ],
}

const rows = panel.pending(data, { now })
assert.equal(rows.length, 2)

const fresh = rows.find((r) => r.id === 'cp-fresh')
const undated = rows.find((r) => r.id === 'cp-undated')

assert.equal(typeof fresh.waitMs, 'number', 'a checkpoint reports how long it has waited')
assert.equal(fresh.waitMs, 10 * 60_000, 'the wait is measured from when the checkpoint was raised')
assert.notEqual(fresh.waitMs, 3 * 3600_000, 'the campaign age is not the question age')
assert.equal(undated.waitMs, null, 'an undated checkpoint says unknown instead of borrowing the campaign age')
ok('a queued question reports its own wait, not the campaign age')

assert.ok(Array.isArray(fresh.actions), 'the queue row carries its verbs')
assert.ok(fresh.actions.includes('approve'))
assert.ok(fresh.actions.includes('reject'))
assert.ok(fresh.actions.includes('snooze'), 'the card can snooze, so the queue can too')
ok('the queue offers the same verbs as the card')

// Risk still decides the order: the urgent question is first even when the other
// one is older.
const ordered = panel.pending(
  {
    campaigns: [
      {
        id: 'c1',
        ageMs: 1000,
        openCheckpoints: [
          { id: 'old-low', kind: 'anomaly', at: now - 5 * 3600_000 },
          { id: 'new-high', kind: 'gate', at: now - 60_000 },
        ],
        reviews: [
          { id: 'old-low', risk: 'low' },
          { id: 'new-high', risk: 'high' },
        ],
      },
    ],
  },
  { now },
)
assert.deepEqual(
  ordered.map((r) => r.id),
  ['new-high', 'old-low'],
  'risk outranks age',
)
ok('risk still decides the order')

console.log(`\n${pass}/${pass} passed`)
