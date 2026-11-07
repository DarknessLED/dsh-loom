// Attempt leases: the durable proof that "this attempt is supposed to be
// running right now". A crashed host leaves them behind, and the next start
// reconciles them instead of silently keeping a round "running" forever.

import { readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { readJson, writeJsonAtomic } from '../core/atomic.js'
import { ensureDir } from '../core/paths.js'

export function leaseDir(campaignDir) {
  return join(campaignDir, 'leases')
}

function leaseFile(campaignDir, attemptId) {
  return join(leaseDir(campaignDir), `${attemptId}.json`)
}

export function writeLease(campaignDir, rec) {
  ensureDir(leaseDir(campaignDir))
  const record = {
    attemptId: String(rec.attemptId),
    round: Number(rec.round) || 0,
    sessionId: rec.sessionId ?? null,
    startedAt: rec.startedAt ?? Date.now(),
    deadline: rec.deadline ?? null,
    lastSeq: null,
    lastAdvanceAt: Date.now(),
    state: 'running',
    reason: null,
  }
  writeJsonAtomic(leaseFile(campaignDir, record.attemptId), record)
  return record
}

export function updateLease(campaignDir, attemptId, patch) {
  const file = leaseFile(campaignDir, attemptId)
  const cur = readJson(file, null)
  if (!cur) return null
  const next = { ...cur, ...patch }
  writeJsonAtomic(file, next)
  return next
}

export function readLease(campaignDir, attemptId) {
  return readJson(leaseFile(campaignDir, attemptId), null)
}

export function listLeases(campaignDir) {
  let names = []
  try {
    names = readdirSync(leaseDir(campaignDir)).filter((n) => n.endsWith('.json'))
  } catch {
    return []
  }
  const out = []
  for (const n of names) {
    try {
      const rec = JSON.parse(readFileSync(join(leaseDir(campaignDir), n), 'utf8'))
      if (rec && rec.attemptId) out.push(rec)
    } catch {
      /* a torn lease is treated as absent */
    }
  }
  return out
}

export function clearLease(campaignDir, attemptId) {
  try {
    unlinkSync(leaseFile(campaignDir, attemptId))
    return true
  } catch {
    return false
  }
}

/**
 * Anything still marked `running` after a restart is a lie. Mark it
 * `abandoned` and hand it back so the caller can reconcile the round.
 */
export function reconcileLeases(campaignDir, { now = Date.now() } = {}) {
  const stale = []
  for (const rec of listLeases(campaignDir)) {
    if (rec.state !== 'running') continue
    const next = updateLease(campaignDir, rec.attemptId, {
      state: 'abandoned',
      reason: 'host-restart',
      endedAt: now,
    })
    if (next) stale.push(next)
  }
  return stale
}

/** Drop finished leases older than `ttlMs` so the directory cannot grow forever. */
export function sweepLeases(campaignDir, { now = Date.now(), ttlMs = 7 * 24 * 3600_000 } = {}) {
  let removed = 0
  for (const rec of listLeases(campaignDir)) {
    if (rec.state === 'running') continue
    const ended = Number(rec.endedAt ?? rec.startedAt ?? 0)
    // A lease written by an older release (or by hand) may carry no timestamp at
    // all. Sweeping it because `0` looks ancient would delete the only record of
    // an abandoned attempt, so keep anything we cannot date.
    if (!Number.isFinite(ended) || ended <= 0) continue
    if (now - ended > ttlMs) {
      if (clearLease(campaignDir, rec.attemptId)) removed += 1
    }
  }
  return removed
}
