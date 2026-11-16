// The trial ledger, summarized.
//
// A procedure is on trial until enough showings say whether it pays for its
// slot. The status view is where a person watches that count close, so the
// arithmetic lives here once: the view, the text line and any future reader
// must agree on what "5W/0L" means, and ties are the number that used to be
// invisible. A tie is a graded comparison that found no measurable effect, so
// it belongs in the ledger beside wins and losses rather than being folded
// into either.
//
// Everything below is pure: no files, no clock, deterministic counts.

import { TRIAL_MIN, trialVerdict } from './cross.js'

/** Showings needed before a procedure's record can be judged at all. */
export const TRIAL_FLOOR = TRIAL_MIN

function toObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function count(lesson, field) {
  return Number(toObject(lesson).trials?.[field]) || 0
}

/**
 * Sum a lesson corpus into the trial ledger the status view renders.
 *
 * Only `procedure` lessons are on trial; every other kind is ignored. A
 * procedure's own verdict comes from `trialVerdict`, the same rule that retires
 * it, so the summary cannot drift from the thing it summarizes. The overall
 * verdict is deliberately conservative: no procedures says nothing ('none'),
 * and a corpus of only short records says 'insufficient' instead of letting one
 * showy procedure speak for all of them.
 */
export function summarizeTrials(lessons) {
  const all = Array.isArray(lessons) ? lessons : []
  const out = {
    procedures: 0,
    shown: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    keep: 0,
    drop: 0,
    insufficient: 0,
    verdict: 'none',
  }
  for (const lesson of all) {
    if (toObject(lesson).kind !== 'procedure') continue
    out.procedures += 1
    out.shown += count(lesson, 'shown')
    out.wins += count(lesson, 'wins')
    out.losses += count(lesson, 'losses')
    out.ties += count(lesson, 'ties')
    const verdict = trialVerdict(lesson)
    if (verdict === 'keep') out.keep += 1
    else if (verdict === 'drop') out.drop += 1
    // 'insufficient' (and any unknown answer) is the honest bucket: it is not
    // a drop, because nothing was decided either way.
    else out.insufficient += 1
  }
  if (out.procedures === 0) return out
  if (out.insufficient === out.procedures) {
    out.verdict = 'insufficient'
  } else {
    out.verdict = out.wins > out.losses ? 'keep' : 'drop'
  }
  return out
}
