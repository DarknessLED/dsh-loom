// One promotion at a time, per loom home.
//
// Promotion is the one step that writes to the shared repository: apply the
// patch, run the guard, commit. Two campaigns doing that at once collide on the
// tree (`workspace-dirty`) and both pay for the retry. This lock is not about
// exclusive state -- campaign directories stay independent -- it is about
// serializing the only window that mutates the checkout.
//
// It is a file lock with a TTL, not a queue: a round that dies while holding it
// must not wedge the machine, so a lock older than its ttl is stolen rather
// than waited on. Stealing is reported (`stolen: true`) so the new holder can
// say who it took the lock from and how long the dead round had it.
//
// `release` is checked against the owner: a campaign that never acquired the
// lock cannot free it, otherwise the loser of a race would unlock the winner.
import { mkdirSync, openSync, closeSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/** How long a holder may keep the lock before it is presumed dead. */
export const DEFAULT_TTL_MS = 15 * 60_000

/** The lock file lives beside the campaign directories, one per loom home. */
export function promotionLockPath(home) {
  return join(home, 'promotion.lock')
}

function readRecord(file) {
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    if (!raw || typeof raw !== 'object' || typeof raw.owner !== 'string' || raw.owner === '') {
      return null
    }
    return raw
  } catch {
    // Missing or corrupt: an unreadable lock names no holder, so no holder can
    // be honored -- treat it as absent rather than blocking forever.
    return null
  }
}

function writeRecord(file, record) {
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`
  writeFileSync(tmp, JSON.stringify(record))
  // rename is atomic on both POSIX and NTFS; a reader sees the old lock or the
  // new one, never a half-written file.
  renameSync(tmp, file)
}

/** Create the lock only if the file does not exist yet. */
function createExclusive(file, record) {
  let fd
  try {
    fd = openSync(file, 'wx')
  } catch (e) {
    if (e?.code === 'EEXIST') return false
    throw e
  }
  try {
    writeFileSync(fd, JSON.stringify(record))
    return true
  } finally {
    closeSync(fd)
  }
}

function removeFile(file) {
  try {
    unlinkSync(file)
    return true
  } catch (e) {
    // Already gone is the outcome release wants, not an error.
    return e?.code === 'ENOENT'
  }
}

function ageOf(record, now) {
  const at = Number(record?.at)
  return Number.isFinite(at) ? now - at : null
}

function isFresh(record, now, ttlMs) {
  const age = ageOf(record, now)
  // A clock that puts the record in the future is not evidence of staleness.
  return age !== null && age < ttlMs
}

/** A handle whose release only frees the lock if we still hold it. */
function releaseHandle(file, owner, token) {
  let done = false
  return function release() {
    if (done) return false
    const current = readRecord(file)
    if (!current || current.owner !== owner) return false
    if (typeof current.token === 'string' && typeof token === 'string' && current.token !== token) {
      return false
    }
    done = removeFile(file)
    return done
  }
}

function denied(record, file, ttlMs, now) {
  return {
    ok: false,
    holder: record.owner,
    file,
    since: Number.isFinite(Number(record.at)) ? Number(record.at) : null,
    expiresAt: Number.isFinite(Number(record.at)) ? Number(record.at) + ttlMs : null,
    retryInMs: Math.max(0, Number(record.at) + ttlMs - now),
    reason: 'held',
    release: () => false,
  }
}

/**
 * Try to take the promotion lock for `home`.
 *
 * @param {string} home loom home (the same directory the campaigns live under)
 * @param {{owner: string, now?: number, ttlMs?: number, release?: boolean}} opts
 *   `owner` names the campaign; `now` is injectable for deterministic tests;
 *   `release: true` frees the lock owned by `owner` instead of acquiring it.
 * @returns {{
 *   ok: boolean,
 *   holder: string|null,
 *   file: string,
 *   stolen?: boolean,
 *   reentrant?: boolean,
 *   since?: number|null,
 *   expiresAt?: number|null,
 *   retryInMs?: number,
 *   release: () => boolean,
 *   reason?: string,
 * }}
 */
export function acquirePromotionLock(home, opts = {}) {
  const owner = typeof opts.owner === 'string' ? opts.owner.trim() : ''
  const file = promotionLockPath(home)
  if (!owner) {
    return { ok: false, holder: null, file, reason: 'no-owner', release: () => false }
  }

  const now = Number.isFinite(opts.now) ? opts.now : Date.now()
  const ttlMs = Number.isFinite(opts.ttlMs) && opts.ttlMs > 0 ? opts.ttlMs : DEFAULT_TTL_MS

  if (opts.release === true) return releaseFor(file, owner)

  mkdirSync(home, { recursive: true })

  const current = readRecord(file)
  if (current) {
    if (isFresh(current, now, ttlMs)) {
      if (current.owner === owner) {
        // Same campaign asking twice: the lock is already ours. Do not rewrite
        // `at`, or a retry loop would extend the lock indefinitely.
        return {
          ok: true,
          holder: owner,
          file,
          stolen: false,
          reentrant: true,
          release: releaseHandle(file, owner, current.token),
        }
      }
      return denied(current, file, ttlMs, now)
    }

    // Stale: the previous holder is presumed dead. Take the lock over and say
    // whether this was a steal from another campaign (same-owner refresh is not
    // a steal).
    const stolen = current.owner !== owner
    const record = makeRecord(owner, now)
    writeRecord(file, record)
    return {
      ok: true,
      holder: owner,
      file,
      stolen,
      reentrant: false,
      tookOverFrom: current.owner,
      since: record.at,
      release: releaseHandle(file, owner, record.token),
    }
  }

  // No readable lock. When the file does not exist at all, create it
  // exclusively so two campaigns that both saw "free" cannot both win.
  const record = makeRecord(owner, now)
  if (createExclusive(file, record)) {
    return { ok: true, holder: owner, file, stolen: false, reentrant: false, since: record.at, release: releaseHandle(file, owner, record.token) }
  }

  // Somebody created it between our read and our create. One re-read decides
  // the race: keep the winner if it is fresh, otherwise overwrite.
  const raced = readRecord(file)
  if (raced && isFresh(raced, now, ttlMs) && raced.owner !== owner) {
    return denied(raced, file, ttlMs, now)
  }
  const stolen = Boolean(raced && raced.owner !== owner)
  const takeover = makeRecord(owner, now)
  writeRecord(file, takeover)
  return {
    ok: true,
    holder: owner,
    file,
    stolen,
    reentrant: false,
    ...(stolen && raced ? { tookOverFrom: raced.owner } : {}),
    since: takeover.at,
    release: releaseHandle(file, owner, takeover.token),
  }
}

function makeRecord(owner, at) {
  return { owner, token: randomUUID(), at, pid: process.pid }
}

/**
 * Free the lock by owner name. Only the recorded holder may free it; a forged
 * release from a campaign that lost the race is refused and tells the caller
 * who actually holds the lock.
 */
export function releasePromotionLock(home, owner) {
  return releaseFor(promotionLockPath(home), typeof owner === 'string' ? owner.trim() : '')
}

function releaseFor(file, owner) {
  if (!owner) return { ok: false, holder: null, file, released: false, reason: 'no-owner', release: () => false }
  const current = readRecord(file)
  if (!current) {
    // Nothing to free: releasing an absent lock is not an error.
    return { ok: true, holder: null, file, released: false, release: () => false }
  }
  if (current.owner !== owner) {
    return {
      ok: false,
      holder: current.owner,
      file,
      released: false,
      reason: 'not-holder',
      release: () => false,
    }
  }
  const released = removeFile(file)
  return { ok: released, holder: owner, file, released, release: () => false }
}
