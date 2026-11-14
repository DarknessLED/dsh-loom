// Wave 20 / p2: the 102 checkpoints nobody will ever answer.
//
// The lifecycle fix only works forward. Across 86 campaigns, 102 checkpoints are
// still open, and 26 stopped campaigns never got an `ended` record -- so the
// queue count stays in the hundreds and every reader learns to ignore it. A
// migration has to close what the campaign already decided by ending, and leave
// alone anything a person is still working through.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planMigration, applyMigration } from '../../src/loop/migrate.js'

const campaign = (over = {}) => ({
  id: 'a',
  status: 'stopped',
  ended: { status: 'stopped', cause: 'budget' },
  checkpoints: [
    { id: 'cp-1', kind: 'gate', status: 'open' },
    { id: 'cp-2', kind: 'anomaly', status: 'answered', closedReason: 'answered' },
    { id: 'cp-3', kind: 'plateau', status: 'open' },
  ],
  ...over,
})

test('a campaign that ended closes its open checkpoints', () => {
  const plan = planMigration([campaign()])
  assert.deepEqual(plan.close.sort(), ['cp-1', 'cp-3'])
})

test('a campaign still running keeps its queue', () => {
  const plan = planMigration([campaign({ status: 'running', ended: null })])
  assert.deepEqual(plan.close, [])
  assert.deepEqual(plan.keep.sort(), ['cp-1', 'cp-3'])
})

test('an already answered checkpoint is not reopened or rewritten', () => {
  const plan = planMigration([campaign()])
  assert.equal(plan.close.includes('cp-2'), false)
})

test('a hold is a person working, not a campaign ending', () => {
  const held = campaign({
    checkpoints: [{ id: 'cp-4', kind: 'gate', status: 'open', heldUntil: Date.now() + 60_000 }],
  })
  assert.deepEqual(planMigration([held]).close, [])
})

test('applying writes one closed event per checkpoint and nothing else', () => {
  const writes = []
  const runtime = {
    append: (view, type, data) => {
      writes.push({ view: view.id, type, data })
    },
  }
  applyMigration(runtime, [campaign()])
  assert.equal(writes.length, 2)
  assert.equal(writes.every((w) => w.type === 'checkpoint.closed'), true)
  assert.equal(writes[0].data.reason, 'campaign-ended')
})

test('a second run is a no-op', () => {
  const state = [campaign()]
  const first = planMigration(state)
  for (const id of first.close) {
    state[0].checkpoints.find((c) => c.id === id).status = 'closed'
  }
  assert.deepEqual(planMigration(state).close, [])
})
