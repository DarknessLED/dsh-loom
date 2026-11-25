/**
 * Where a lesson stops applying.
 *
 * A claim measured on one task, with one verifier, under one scoring instrument
 * is a claim about those three things. The brief prints lessons to the next
 * worker, and a reader can only discount a rule it can see the edge of — so the
 * edge travels with the claim instead of being reconstructed later from a
 * ledger that no longer holds the attempt.
 *
 * Two rules shape this file:
 *
 * 1. State what was measured, never what was not. "only under a measured kill
 *    rate (0.62)" is checkable; "not on other tasks" is a guess about tasks
 *    nobody ran.
 * 2. When nothing can be stated, say so in one fixed sentence. Silence is what
 *    made the old lessons read as universal — an empty list and a missing key
 *    look the same to every reader downstream.
 */

/** The one sentence the whole tree shares for "no boundary was measured". */
export const NO_BOUNDARY_MARKER = 'no boundary measured: one round, one task'

/** How long one boundary sentence may be, in characters. */
export const BOUNDARY_MAX = 200

const clean = (value) => (typeof value === 'string' ? value.trim() : '')

function clip(text) {
  const value = clean(text)
  if (value.length <= BOUNDARY_MAX) return value
  return `${value.slice(0, BOUNDARY_MAX - 1).trimEnd()}…`
}

/**
 * What instrument judged the attempt.
 *
 * The distinction matters more than it looks: a kill rate is a measurement with
 * a denominator, a pass/fail verdict is one bit, and the two do not support the
 * same claim. Naming the wrong one would be a false boundary, which is worse
 * than none.
 */
export function instrumentOf(attempt) {
  const source = clean(attempt?.scoreSource)
  const rate = Number(attempt?.metrics?.killRate)
  if (source === 'killRate' && Number.isFinite(rate)) {
    return `a measured kill rate (${Number(rate.toFixed(4))})`
  }
  if (source === 'killRate') return 'a measured kill rate'
  if (source === 'binary' || attempt?.verifierOk === true || attempt?.verifierOk === false) {
    return 'a pass/fail verdict'
  }
  return ''
}

/**
 * The verifier that judged the attempt.
 *
 * A hidden verifier is named as hidden. Inventing a command for it would be the
 * one thing this module exists to prevent: a boundary the record cannot support.
 */
export function verifierOf(task) {
  const verify = task && typeof task.verify === 'object' ? task.verify : null
  if (verify?.hidden === true) return 'a hidden verifier'
  const cmd = clean(verify?.cmd)
  if (cmd) return `the verifier \`${clip(cmd)}\``
  return ''
}

/**
 * The boundary sentences for a lesson derived from a round.
 *
 * @param {{attempt?:object, task?:object}} source
 * @returns {string[]} one to three sentences, or the fixed marker
 */
export function boundaryOf({ attempt, task } = {}) {
  const sentences = []
  const taskId = clean(task?.id) || clean(attempt?.taskId)
  if (taskId) sentences.push(clip(`only on task ${taskId}`))
  const verifier = verifierOf(task)
  if (verifier) sentences.push(clip(`only under ${verifier}`))
  const instrument = instrumentOf(attempt)
  if (instrument) sentences.push(clip(`only under ${instrument}`))
  if (!sentences.length) return [NO_BOUNDARY_MARKER]
  return sentences
}

/**
 * Read a boundary off any lesson-shaped record, whichever way it was written.
 *
 * Stored lessons carry an array, but a hand-written record or an older file may
 * carry one string, an empty array or nothing at all. All four collapse to the
 * same answer so a renderer never has to guess.
 */
export function readBoundary(lesson) {
  const raw = lesson?.notWhen
  if (Array.isArray(raw)) {
    const kept = raw.map(clean).filter(Boolean)
    return kept.length ? kept : [NO_BOUNDARY_MARKER]
  }
  const single = clean(raw)
  return single ? [clip(single)] : [NO_BOUNDARY_MARKER]
}
