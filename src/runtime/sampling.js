/**
 * Deterministic task selection for a round.
 *
 * A campaign that never evaluates its holdout tasks can look successful on the
 * exact tasks it was tuned against. The fix is a cadence: on every
 * `holdoutEvery`-th round the loop spends one holdout task instead of a
 * working one, cycling through the holdout list in order. Every other round
 * keeps using the working tasks round-robin.
 *
 * Selection is a pure function of the round number, so a replayed round picks
 * the same task and the audit trail stays reproducible. No clock, no random,
 * no hidden cursor.
 *
 * Pure functions only: selection is testable without a host.
 */

/** Normalize a holdout entry into the shape returned to callers. */
function pickOf(entry, holdout) {
  if (typeof entry === 'string') return entry ? { id: entry, holdout } : null
  if (entry && typeof entry === 'object' && entry.id != null) return { ...entry, holdout }
  return null
}

/**
 * Pick the task for one round.
 *
 * @param {{tasks?: Array<object>, holdout?: Array<object|string>}} evalset
 * @param {{round?: number, holdoutEvery?: number}} opts
 * @returns {{id: string, holdout: boolean} | null}
 */
export function pickTask(evalset, { round, holdoutEvery = 0 } = {}) {
  if (!evalset || typeof evalset !== 'object') return null
  if (!Number.isInteger(round) || round <= 0) return null

  const every = Number.isFinite(Number(holdoutEvery)) ? Math.floor(Number(holdoutEvery)) : 0
  if (every > 0 && round % every === 0) {
    const holdout = Array.isArray(evalset.holdout)
      ? evalset.holdout.filter((t) => (typeof t === 'string' ? t.length > 0 : t && typeof t === 'object' && t.id != null))
      : []
    if (!holdout.length) return null
    const index = (Math.floor(round / every) - 1) % holdout.length
    return pickOf(holdout[index], true)
  }

  const tasks = Array.isArray(evalset.tasks) ? evalset.tasks : []
  if (!tasks.length) return null
  return pickOf(tasks[(round - 1) % tasks.length], false)
}
