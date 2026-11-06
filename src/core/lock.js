import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureDir } from './paths.js'

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e?.code === 'EPERM'
  }
}

export function lockPath(home) {
  return join(home, 'lock')
}

export function readOwnership(file) {
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    return raw && typeof raw === 'object' ? raw : null
  } catch {
    return null
  }
}

function writeOwnership(file, record) {
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(record))
  renameSync(tmp, file)
}

/**
 * Claim the loop. Newest writer wins: a restarted window must not inherit a
 * lock held by an abandoned process that is technically still alive.
 */
export function claimOwnership(home, meta = {}) {
  const file = lockPath(home)
  ensureDir(home)
  const previous = readOwnership(file)
  const now = Date.now()
  const record = { pid: process.pid, at: now, heartbeatAt: now, plugin: 'dsh-loom', ...meta }
  writeOwnership(file, record)
  return { ok: true, file, record, previous }
}

/** Refresh the heartbeat, but only while we still own the file. */
export function heartbeat(file, meta = {}) {
  const cur = readOwnership(file)
  if (!cur || cur.pid !== process.pid) return false
  writeOwnership(file, { ...cur, ...meta, pid: process.pid, heartbeatAt: Date.now() })
  return true
}

export function holdsOwnership(file) {
  const cur = readOwnership(file)
  return Boolean(cur && cur.pid === process.pid)
}

/**
 * Who owns the loop right now, and is that claim trustworthy?
 * `fresh` means the owner wrote a heartbeat recently.
 */
export function ownerStatus(file, { now = Date.now(), staleMs = 90_000 } = {}) {
  const cur = readOwnership(file)
  if (!cur) return { owner: null, mine: false, alive: false, fresh: false }
  const beat = Number.isFinite(cur.heartbeatAt) ? cur.heartbeatAt : cur.at
  const fresh = Number.isFinite(beat) ? now - beat < staleMs : false
  return { owner: cur, mine: cur.pid === process.pid, alive: alive(cur.pid), fresh }
}

export function releaseLock(file) {
  if (!file) return
  try {
    const holder = readOwnership(file)
    if (holder?.pid === process.pid) unlinkSync(file)
  } catch {
    /* already gone */
  }
}

/** Older call site shape: claim, reporting the previous holder. */
export function acquireLock(home, meta = {}) {
  const claimed = claimOwnership(home, meta)
  return { ok: true, file: claimed.file, tookOverFrom: claimed.previous }
}
