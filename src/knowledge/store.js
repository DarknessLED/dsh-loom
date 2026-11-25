// The one place a lesson can outlive the campaign that earned it.
//
// Lessons live in campaign state, so a claim earned in one repository is
// invisible to the next run -- which is exactly the "cross-domain" case the
// transfer work is supposed to cover. This store is a small, append-mostly
// file under the loom home: deduped by id (the id is a hash of family+claim),
// capped so it cannot grow without bound, and tolerant of a missing or
// corrupt file (one bad write must not take the loop down).
//
// Two campaigns can write this file. The loop favours one round at a time, but
// "favours" is not a guarantee, and a trial that loses an increment is a
// measurement that lies. So writes are: locked (best effort, with a short
// wait), merged by id (trial counters take the max, never the last writer),
// and renamed into place (a reader never sees a half-written file).
//
// Merge-on-write is the part that matters even without a lock: a stale writer
// that read before another campaign's update still cannot lower a counter, it
// can only fail to raise it.

import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { NO_BOUNDARY_MARKER } from './boundary.js'

const FILE = 'knowledge.json'
const MAX = 500
const LOCK_STALE_MS = 5_000
const LOCK_TRIES = 40
const LOCK_WAIT_MS = 10

function fileOf(home) {
  return typeof home === 'string' && home ? join(home, FILE) : null
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
  } catch {
    /* a platform without Atomics waits by not waiting */
  }
}

/** Run `fn` under `<file>.lock`; contention waits, a stale lock is broken. */
function withLock(file, fn) {
  const lock = `${file}.lock`
  let fd = null
  for (let i = 0; i < LOCK_TRIES && fd === null; i += 1) {
    try {
      fd = openSync(lock, 'wx')
    } catch {
      try {
        if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) unlinkSync(lock)
      } catch {
        /* the holder may have finished between the two calls */
      }
      sleepSync(LOCK_WAIT_MS)
    }
  }
  try {
    return fn()
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd)
      } catch {
        /* already closed */
      }
      try {
        unlinkSync(lock)
      } catch {
        /* someone else broke a lock we considered stale */
      }
    }
  }
}

function trialsOf(lesson) {
  const t = lesson && typeof lesson.trials === 'object' && lesson.trials ? lesson.trials : null
  return t ? { shown: Number(t.shown) || 0, wins: Number(t.wins) || 0, losses: Number(t.losses) || 0, ties: Number(t.ties) || 0 } : null
}

/** Same lesson, two writers: the counters are evidence and can only go up. */
function mergeLesson(prev, next) {
  // Provenance is a fact about where the sentence came from, so it is not
  // something a later write may overwrite: a re-derived lesson keeps calling
  // itself what it is. (`origin`/`trust` only move when the newer record says
  // something the older one did not.)
  const out = { ...prev, ...next }
  if (!out.origin && prev.origin) out.origin = prev.origin
  if (!out.trust && prev.trust) out.trust = prev.trust
  const a = trialsOf(prev)
  const b = trialsOf(next)
  if (a || b) {
    out.trials = {
      shown: Math.max(a?.shown ?? 0, b?.shown ?? 0),
      wins: Math.max(a?.wins ?? 0, b?.wins ?? 0),
      losses: Math.max(a?.losses ?? 0, b?.losses ?? 0),
      ties: Math.max(a?.ties ?? 0, b?.ties ?? 0),
    }
  }
  return out
}

/**
 * Every stored lesson, newest last. A missing file is an empty store, not an
 * error; a corrupt one is quarantined by renaming it aside and reads empty, so
 * the loop keeps running and the bad bytes stay around for inspection.
 */
export function readGlobalLessons(home) {
  const file = fileOf(home)
  if (!file || !existsSync(file)) return []
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.lessons) ? parsed.lessons : []
    return list.filter((l) => l && typeof l.id === 'string' && l.id)
  } catch {
    try {
      writeFileSync(`${file}.bad`, readFileSync(file))
    } catch {
      /* a failed quarantine must not throw either */
    }
    return []
  }
}

/**
 * Add or replace one lesson by id, keeping the newest `MAX`. Returns the whole
 * list after the write so a caller does not have to re-read the file.
 */
export function appendGlobalLesson(home, lesson) {
  const file = fileOf(home)
  if (!file || !lesson || typeof lesson.id !== 'string' || !lesson.id) return []
  try {
    mkdirSync(dirname(file), { recursive: true })
  } catch {
    return []
  }
  return withLock(file, () => {
    const all = readGlobalLessons(home)
    const prior = all.find((l) => l.id === lesson.id)
    const list = all.filter((l) => l.id !== lesson.id)
    list.push(prior ? mergeLesson(prior, lesson) : lesson)
    const kept = list.slice(-MAX)
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
    try {
      writeFileSync(tmp, `${JSON.stringify(kept, null, 1)}\n`)
      renameSync(tmp, file)
    } catch {
      try {
        unlinkSync(tmp)
      } catch {
        /* nothing to clean */
      }
    }
    return kept
  })
}

/**
 * Give every stored lesson an origin, from what its own record can prove.
 *
 * The brief prints a lesson's provenance next to its claim, and a store written
 * before that field existed would make every lesson look like it came from
 * nowhere. The recovery rule is not "assume the best": a record with
 * `source: 'research'` was accepted only after a quoted span was found in a
 * stored snapshot, so it is `research-claim` / `verified`; anything else was
 * derived by the loop from an attempt it ran, so it is `self-observed` /
 * `observed`. Nothing is ever promoted to `verified` by the absence of a field.
 *
 * Idempotent, so a retry after a crash cannot keep rewriting the store.
 *
 * @param {string} home loom home holding knowledge.json
 * @returns {{updated:number, selfObserved:number, research:number}}
 */
/**
 * Give every stored lesson a boundary, from what its own record can prove.
 *
 * The lessons folded in from the research ledger already carry `notWhen`
 * because the sink refuses a fact lesson without one. The ones the loop derived
 * from its own rounds did not, so the brief printed them to the next worker as
 * if they held everywhere. Nothing in an old record says where that claim
 * stopped, so the honest recovery is the shared marker, never a boundary
 * invented afterwards from a ledger that no longer holds the attempt.
 *
 * Fills only what is empty: a stated boundary, a one-element list, an empty list
 * and a missing key are four different things, and only the last two are filled.
 * Idempotent, and a second run does not rewrite the file at all.
 *
 * @param {string} home loom home holding knowledge.json
 * @returns {{updated:number, kept:number}}
 */
export function backfillLessonBoundary(home) {
  const file = fileOf(home)
  const out = { updated: 0, kept: 0 }
  if (!file || !existsSync(file)) return out
  const all = readGlobalLessons(home)
  if (!all.length) return out
  const rewritten = all.map((lesson) => {
    const raw = lesson.notWhen
    const stated = Array.isArray(raw)
      ? raw.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
      : typeof raw === 'string' && raw.trim()
        ? [raw.trim()]
        : []
    if (stated.length) {
      // Already bounded: the migration never overwrites a stated boundary,
      // whichever origin wrote it.
      out.kept += 1
      return lesson
    }
    out.updated += 1
    return { ...lesson, notWhen: [NO_BOUNDARY_MARKER] }
  })
  if (!out.updated) return out
  withLock(file, () => {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
    try {
      writeFileSync(tmp, `${JSON.stringify(rewritten, null, 1)}\n`)
      renameSync(tmp, file)
    } catch {
      try {
        unlinkSync(tmp)
      } catch {
        /* nothing to clean */
      }
    }
  })
  return out
}

export function backfillLessonOrigin(home) {
  const file = fileOf(home)
  const out = { updated: 0, selfObserved: 0, research: 0 }
  if (!file || !existsSync(file)) return out
  const all = readGlobalLessons(home)
  if (!all.length) return out
  const rewritten = all.map((lesson) => {
    const research = lesson.source === 'research'
    const origin = lesson.origin ?? (research ? 'research-claim' : 'self-observed')
    const trust = lesson.trust ?? (research ? 'verified' : 'observed')
    if (lesson.origin === origin && lesson.trust === trust) return lesson
    if (research) out.research += 1
    else out.selfObserved += 1
    out.updated += 1
    return { ...lesson, origin, trust }
  })
  withLock(file, () => {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
    try {
      writeFileSync(tmp, `${JSON.stringify(rewritten, null, 1)}\n`)
      renameSync(tmp, file)
    } catch {
      try {
        unlinkSync(tmp)
      } catch {
        /* nothing to clean */
      }
    }
    return rewritten
  })
  return out
}
