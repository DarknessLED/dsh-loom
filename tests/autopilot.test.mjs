// Autopilot: a campaign may apply its own verified patches, guarded.
// The guard command must still pass afterwards or the workspace is rolled back.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyState, reduce } from '../src/core/reduce.js'

const ev = (type, data) => ({ seq: 1, t: 1, type, actor: 'human', data })

test('reduce: campaign.autopilot stores the flag and guard', () => {
  const s = reduce([ev('campaign.autopilot', { enabled: true, guard: 'node scripts/test-all.mjs' })], 'c1')
  assert.equal(s.autopilot.enabled, true)
  assert.equal(s.autopilot.guard, 'node scripts/test-all.mjs')
})

test('reduce: campaign.autopilot without a guard leaves it null', () => {
  const s = reduce([ev('campaign.autopilot', { enabled: true })], 'c1')
  assert.equal(s.autopilot.guard, null)
})

test('reduce: campaign.autopilot is off unless enabled is literally true', () => {
  const s = reduce([ev('campaign.autopilot', { enabled: 'yes', guard: 'x' })], 'c1')
  assert.equal(s.autopilot.enabled, false)
})

test('reduce: a fresh campaign has no autopilot', () => {
  assert.equal(emptyState('c1').autopilot, undefined)
})
