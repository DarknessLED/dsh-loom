// Tests for src/runtime/lease.js — attempt leases and boot reconciliation.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  leaseDir,
  writeLease,
  readLease,
  updateLease,
  listLeases,
  clearLease,
  reconcileLeases,
  sweepLeases,
} from '../src/runtime/lease.js'

let passed = 0
let failed = 0
function ok(cond, name) {
  if (cond) {
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}`)
  }
}
function eq(actual, expected, name) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a === b) ok(true, name)
  else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}\n  actual:   ${a}\n  expected: ${b}`)
  }
}

const root = mkdtempSync(join(tmpdir(), 'loom-lease-'))
const campaign = join(root, 'campaigns', 'c-1')
try {
  // 1. paths + shape
  eq(leaseDir(campaign), join(campaign, 'leases'), 'leaseDir is <campaign>/leases')
  const rec = writeLease(campaign, { attemptId: 'r1a1', round: 1, deadline: 123 })
  ok(rec.state === 'running' && rec.attemptId === 'r1a1', 'writeLease returns a running record')
  ok(existsSync(join(leaseDir(campaign), 'r1a1.json')), 'writeLease creates the file (and parents)')

  // 2. read back
  const back = readLease(campaign, 'r1a1')
  ok(back && back.round === 1 && back.deadline === 123, 'readLease round-trips')
  ok(readLease(campaign, 'nope') === null, 'readLease of a missing attempt is null')

  // 3. update
  const upd = updateLease(campaign, 'r1a1', { sessionId: 's-9', lastSeq: 4 })
  ok(upd.sessionId === 's-9' && upd.lastSeq === 4 && upd.state === 'running', 'updateLease merges fields')
  ok(updateLease(campaign, 'missing', { lastSeq: 1 }) === null, 'updateLease of a missing attempt is null')

  // 4. list
  writeLease(campaign, { attemptId: 'r1a2', round: 1 })
  const all = listLeases(campaign)
  eq(all.map((r) => r.attemptId).sort(), ['r1a1', 'r1a2'], 'listLeases returns every record')
  eq(listLeases(join(root, 'nope')).length, 0, 'listLeases of a missing dir is []')

  // 5. reconcile marks running -> abandoned(host-restart)
  updateLease(campaign, 'r1a2', { state: 'done', endedAt: 1 })
  const stale = reconcileLeases(campaign, { now: 5000 })
  eq(stale.map((r) => r.attemptId), ['r1a1'], 'reconcileLeases only writes off running leases')
  eq(stale[0].state, 'abandoned', 'reconciled lease is abandoned')
  eq(stale[0].reason, 'host-restart', 'reconciled lease records host-restart')
  ok(readLease(campaign, 'r1a1').state === 'abandoned', 'reconciled state is persisted')
  eq(reconcileLeases(campaign, { now: 6000 }).length, 0, 'second reconcile is a no-op')

  // 6. sweep drops old finished leases, keeps running ones and fresh ones
  writeLease(campaign, { attemptId: 'r2a1', round: 2 })
  updateLease(campaign, 'r2a1', { state: 'done', endedAt: 1000 })
  const removed = sweepLeases(campaign, { now: 1000 + 8 * 24 * 3600_000, ttlMs: 7 * 24 * 3600_000 })
  ok(removed >= 1, 'sweepLeases removes expired finished leases')
  ok(!existsSync(join(leaseDir(campaign), 'r2a1.json')), 'expired lease file is gone')

  writeLease(campaign, { attemptId: 'r3a1', round: 3 })
  const keptRunning = sweepLeases(campaign, { now: Date.now() + 30 * 24 * 3600_000 })
  ok(readLease(campaign, 'r3a1') !== null, 'sweepLeases never removes a running lease')
  ok(keptRunning === 0, 'sweepLeases reports 0 when nothing is removed')

  // 7. clear
  ok(clearLease(campaign, 'r3a1') === true, 'clearLease removes an existing lease')
  ok(clearLease(campaign, 'r3a1') === false, 'clearLease of a missing lease returns false')
  ok(readLease(campaign, 'r3a1') === null, 'cleared lease is gone')
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exitCode = 1
assert.ok(passed > 0)
