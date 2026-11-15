// The one place a lesson can outlive the campaign that earned it.
//
// Lessons live in campaign state, so a claim earned in one repository is
// invisible to the next run -- which is exactly the "cross-domain" case the
// transfer work is supposed to cover. This store is a small, append-mostly
// file under the loom home: deduped by id (the id is a hash of family+claim),
// capped so it cannot grow without bound, and tolerant of a missing or
// corrupt file (one bad write must not take the loop down).
//
// It is deliberately simple. Two campaigns writing at the same instant are
// serialised by the loop's own single-round discipline; if that ever stops
// being true, this needs a lock, not a bigger file format.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FILE = 'knowledge.json'
const MAX = 500

function fileOf(home) {
  return typeof home === 'string' && home ? join(home, FILE) : null
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
  const list = readGlobalLessons(home).filter((l) => l.id !== lesson.id)
  list.push(lesson)
  const kept = list.slice(-MAX)
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `${JSON.stringify(kept, null, 1)}\n`)
  } catch {
    /* a full disk is not a reason to fail a round */
  }
  return kept
}
