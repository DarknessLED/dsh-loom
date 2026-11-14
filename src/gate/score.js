// The score the gate should have been reading.
//
// A verifier answers 1 or 0, so a round that barely passes and one that passes
// with room to spare are the same number. The kill-rate harness reports a
// continuous reading instead (`metrics.killRate`), and this module is where that
// reading becomes the score — or, when nothing was measured, where the verdict
// is the score and `source` says so.
//
// `source` is part of the answer, not decoration: a kill rate and a binary
// verdict are different measurement kinds, and a caller that compares two
// attempts has to decide what a mixed pair means instead of subtracting them.
// Missing is not zero: only a finite `metrics.killRate` counts as a reading, so
// `KILLRATE=0` scores 0 as a real measurement while an absent line falls back to
// the verifier's 1/0.

/** Scores are reported with 6 decimal places, like the rest of the gate. */
const SCORE_SCALE = 1e6

/**
 * @param {number} n
 * @returns {number}
 */
function clamp01(n) {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * @param {number} n
 * @returns {number}
 */
function round6(n) {
  // `+ 0` normalizes -0 to 0 so callers can compare with Object.is.
  return Math.round(n * SCORE_SCALE) / SCORE_SCALE + 0
}

/**
 * @param {unknown} value
 * @returns {number|null} the value when it is a finite number, else null
 */
function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Score one attempt and name the measurement the score came from.
 *
 * - `metrics.killRate` finite (including 0) → that reading, clamped to 0..1 and
 *   rounded to 6 decimals, `source: 'killRate'`.
 * - otherwise → `verifierOk ? 1 : 0`, `source: 'binary'`.
 *
 * Never throws; a null / non-object attempt is an unverified binary 0.
 *
 * @param {unknown} attempt
 * @returns {{score:number, source:'killRate'|'binary'}}
 */
export function scoreOf(attempt) {
  const metrics =
    attempt !== null && typeof attempt === 'object' ? attempt.metrics : null
  const killRate =
    metrics !== null && typeof metrics === 'object' ? finiteOrNull(metrics.killRate) : null

  if (killRate !== null) {
    return { score: round6(clamp01(killRate)), source: 'killRate' }
  }

  const verified =
    attempt !== null && typeof attempt === 'object' && Boolean(attempt.verifierOk)
  return { score: verified ? 1 : 0, source: 'binary' }
}
