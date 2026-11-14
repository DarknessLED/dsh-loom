// Wave 20 / p4: two campaigns promoting at once.
//
// Three rounds of p1 and five of p2 were spent on anomalies whose whole text was
// `promotion could not be applied to the workspace: workspace-dirty` -- one
// campaign's guard was running on the tree while the other tried to apply its
// patch. Nothing was corrupt, but both campaigns paid for the collision.
//
// The lock is per loom home, held across "apply -> guard -> commit", and stale
// after a TTL so a killed round cannot wedge the machine.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { acquirePromotionLock } from '../../src/loop/lock.js'

const home = () => mkdtempSync(join(tmpdir(), 'loom-lock-'))

test('one holder at a time, and the second one is told who holds it', () => {
  const dir = home()
  const first = acquirePromotionLock(dir, { owner: 'p1-chain', now: 1000, ttlMs: 60_000 })
  assert.equal(first.ok, true)
  const second = acquirePromotionLock(dir, { owner: 'p2-cost', now: 1001, ttlMs: 60_000 })
  assert.equal(second.ok, false)
  assert.equal(second.holder, 'p1-chain')
})

test('releasing hands the lock to the next campaign', () => {
  const dir = home()
  const first = acquirePromotionLock(dir, { owner: 'p1-chain', now: 1000, ttlMs: 60_000 })
  first.release()
  const second = acquirePromotionLock(dir, { owner: 'p2-cost', now: 1001, ttlMs: 60_000 })
  assert.equal(second.ok, true)
  assert.equal(second.holder, 'p2-cost')
})

test('a lock older than its ttl is stolen, not waited on', () => {
  const dir = home()
  acquirePromotionLock(dir, { owner: 'p1-chain', now: 1000, ttlMs: 60_000 })
  const later = acquirePromotionLock(dir, { owner: 'p2-cost', now: 1000 + 120_000, ttlMs: 60_000 })
  assert.equal(later.ok, true)
  assert.equal(later.stolen, true)
})

test('the holder cannot release somebody else\'s lock', () => {
  const dir = home()
  const first = acquirePromotionLock(dir, { owner: 'p1-chain', now: 1000, ttlMs: 60_000 })
  const other = acquirePromotionLock(dir, { owner: 'p2-cost', now: 1001, ttlMs: 60_000 })
  assert.equal(other.ok, false)
  // p2 never got a handle; a forged release must not free p1's lock.
  const forged = acquirePromotionLock(dir, { owner: 'p2-cost', release: true })
  assert.equal(forged.ok, false)
  const still = acquirePromotionLock(dir, { owner: 'p3', now: 1002, ttlMs: 60_000 })
  assert.equal(still.ok, false)
  assert.equal(still.holder, 'p1-chain')
  first.release()
})
