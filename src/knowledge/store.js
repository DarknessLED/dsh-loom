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
  const out = { ...prev, ...next }
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
