// Whether a passing candidate earned its verdict.
//
// A green verifier is only evidence of work if the tree was not already green, or
// — when the task reports a metric instead of an exit code — if the metric moved.
// The distinction is not academic: loom-graded's verifier prints QUALITY=<n> and
// exits 0 in every state, deliberately, because that is how a graded task signals
// progress. With an exit-code oracle the base "passes" at round 1, `baseFailed`
// stays false for the whole campaign, and the gate discards three rounds in which
// the agent moved QUALITY from 0.500 to 1.000.
//
// So the oracle needs two readings, and the task decides which one applies:
//
//   - exit-code reading: base red, candidate green. Red -> green is work.
//   - metric reading: base green and candidate green, but the metric improved by
//     at least the promotion threshold. A metric that did not move is not work.
//
// Anything unknown stays permissive, because a base we could not measure must not
// silently block every promotion (the same reason baseline failures are logged and
// treated as 'skipped' rather than as a rejection).

/** The minimum a metric must move to count, in the same units the task reports. */
const EPSILON = 1e-9

function finiteOrNull(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Decide whether a candidate earned its green verdict.
 *
 * @param {object} checks
 * @param {boolean|'skipped'} [checks.baseFailed] did the command fail on the base?
 * @param {Record<string, number>} [checks.baseMetrics] metrics measured on the base
 * @param {Record<string, number>} [checks.candidateMetrics] metrics of the candidate
 * @param {number} [checks.minGain] promotion threshold the metric must clear
 * @returns {{earned: boolean, reason: string, metric?: string, from?: number, to?: number}}
 */
export function earnedByDifferential(checks) {
  const c = checks && typeof checks === 'object' ? checks : {}

  // The base failed: the patch turned a red verifier green. That is the plain
  // case and the one this check was built for.
  if (c.baseFailed === true) return { earned: true, reason: 'red-to-green' }

  // Not measured. Permissive on purpose: a missing measurement is not evidence
  // that the work was unnecessary.
  if (c.baseFailed !== false) return { earned: true, reason: 'base-unmeasured' }

  // The base already passed. Now the only evidence left is a metric that moved.
  const base = c.baseMetrics
  const cand = c.candidateMetrics
  if (base && cand && typeof base === 'object' && typeof cand === 'object') {
    const minGain = finiteOrNull(c.minGain) ?? 0
    let best = null
    for (const [name, rawCand] of Object.entries(cand)) {
      const to = finiteOrNull(rawCand)
      const from = finiteOrNull(base[name])
      if (to === null || from === null) continue
      const delta = to - from
      if (delta < minGain - EPSILON) continue
      if (delta <= EPSILON) continue
      if (best === null || delta > best.delta) best = { metric: name, from, to, delta }
    }
    if (best !== null) {
      return { earned: true, reason: 'metric-improved', metric: best.metric, from: best.from, to: best.to }
    }
    return { earned: false, reason: 'metric-did-not-improve' }
  }

  // Base green, nothing to compare: the verdict says nothing about the patch.
  return { earned: false, reason: 'base-already-green' }
}
