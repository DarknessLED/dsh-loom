/**
 * Which candidates see the lessons this round.
 *
 * A round runs the same task `candidateCount` times. Lessons are a treatment, so
 * a genuine paired comparison needs at least one candidate that does *not* see
 * them: exposing everyone leaves no control and every score difference becomes
 * unattributable noise. That control must not always be attempt #1 either —
 * otherwise a slow second attempt, or plain luck, is booked as lesson gain or
 * harm and a useful lesson can be quarantined for the wrong reason.
 *
 * So exactly one candidate is exposed, and the slot rotates with the round:
 * round 1 treats a1, round 2 treats a2, round 3 treats a1 again. With two
 * candidates the treated index therefore flips on parity, and over a night both
 * "first candidate treated" and "later candidate treated" happen.
 *
 * Indexes are 0-based (attempt `a1` is index 0) to match the plan's `i - 1`.
 * A single candidate has no control, so nothing is exposed; same for zero.
 *
 * @param {number} candidateCount how many attempts the round will run
 * @param {number} round 1-based round number
 * @returns {number[]} sorted, unique, in-range indexes to expose
 */
export function exposeIndexes(candidateCount, round) {
  const count = Math.floor(Number(candidateCount))
  if (!Number.isFinite(count) || count <= 1) return []

  const n = Math.floor(Number(round))
  const safeRound = Number.isFinite(n) ? n : 0
  // `-1` makes round 1 treat the first candidate; the extra `+ count` keeps the
  // modulo non-negative for round 0 and other non-positive values.
  const start = (((safeRound - 1) % count) + count) % count
  return [start]
}
