// Promotion gate — docs/contracts.md §3.
//
// Pure functions only: no filesystem, no clock, no randomness, no imports.
// Every export tolerates malformed input (null / NaN / missing fields) and
// never throws; values that cannot be evaluated count as "not satisfied".

/** Scores are reported with 6 decimal places. */
const SCORE_SCALE = 1e6
/** Slack for float noise at exact thresholds (e.g. 0.3 - 0.2 vs 0.1). */
const EPSILON = 1e-9

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
 * Round to 6 decimals without clamping; deltas can be negative.
 * @param {number} n
 * @returns {number}
 */
function round6(n) {
  // `+ 0` normalizes -0 to 0 so callers can compare with Object.is.
  return Math.round(n * SCORE_SCALE) / SCORE_SCALE + 0
}

/**
 * Clamp into [0, 1] and round to 6 decimals.
 * @param {number} n
 * @returns {number}
 */
function roundScore(n) {
  return round6(clamp01(n))
}

/**
 * @param {unknown} value
 * @returns {number|null} the value when it is a finite number, else null
 */
function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Only a truthy `verifierOk` counts as a pass.
 * Missing / null / false / 0 are all treated as "verification failed".
 * @param {unknown} attempt
 * @returns {boolean}
 */
function isVerified(attempt) {
  return attempt !== null && typeof attempt === 'object' && Boolean(attempt.verifierOk)
}

/**
 * @param {unknown} attempt
 * @returns {string}
 */
function idOf(attempt) {
  if (attempt === null || typeof attempt !== 'object') return ''
  const id = attempt.id
  if (typeof id === 'string') return id
  if (id === null || id === undefined) return ''
  return String(id)
}

/**
 * Sort key: non-finite / missing scores rank last.
 * @param {unknown} attempt
 * @returns {number}
 */
function scoreOf(attempt) {
  if (attempt === null || typeof attempt !== 'object') return -Infinity
  const score = finiteOrNull(attempt.score)
  return score === null ? -Infinity : score
}

/**
 * Mean of the finite task scores, each clamped to [0, 1].
 * @param {unknown} taskScores
 * @returns {number|null} null when there is no usable score
 */
function meanTaskScore(taskScores) {
  if (taskScores === null || typeof taskScores !== 'object') return null
  let sum = 0
  let count = 0
  for (const value of Object.values(taskScores)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    sum += clamp01(value)
    count += 1
  }
  return count === 0 ? null : sum / count
}

/**
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(6) : String(n)
}

/**
 * Aggregate one attempt's evaluation into a 0..1 score.
 *
 * - Base score is the mean of `attempt.taskScores` (0..1 each); without any
 *   usable task score the pass rate falls back to `verifierOk ? 1 : 0`.
 * - `metrics.quality`, when finite, is blended 0.7 quality / 0.3 pass rate.
 * - A failed verifier zeroes the whole score (returned as `0`, with no reason
 *   surfaced — the caller only ever sees the number).
 * - Result is clamped to 0..1 and rounded to 6 decimals.
 *
 * @param {{attemptId:string, taskScores?: Record<string, number>,
 *          verifierOk: boolean, metrics?: Record<string, number>}} attempt
 * @returns {number} 0..1
 */
export function scoreAttempt(attempt) {
  if (!isVerified(attempt)) return 0

  const passRate = meanTaskScore(attempt.taskScores)
  const effectivePassRate = passRate === null ? 1 : passRate

  const metrics = attempt.metrics
  const quality =
    metrics !== null && typeof metrics === 'object' ? finiteOrNull(metrics.quality) : null

  const raw =
    quality === null
      ? effectivePassRate
      : 0.7 * clamp01(quality) + 0.3 * effectivePassRate

  return roundScore(raw)
}

/**
 * Rank the attempts of one round.
 *
 * Order: score descending, then `verifierOk` (pass first), then `id`
 * lexicographic. The input array is not mutated; the returned entries are the
 * original attempt objects.
 *
 * @param {Array<{id:string, score:number, verifierOk:boolean}>} attempts
 * @returns {{best: object|null, ranked: Array<object>}}
 */
export function rankAttempts(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return { best: null, ranked: [] }
  }

  const ranked = attempts.slice().sort((a, b) => {
    const scoreA = scoreOf(a)
    const scoreB = scoreOf(b)
    if (scoreA !== scoreB) return scoreB > scoreA ? 1 : -1

    const verifiedA = isVerified(a) ? 1 : 0
    const verifiedB = isVerified(b) ? 1 : 0
    if (verifiedA !== verifiedB) return verifiedB - verifiedA

    const idA = idOf(a)
    const idB = idOf(b)
    if (idA === idB) return 0
    return idA < idB ? -1 : 1
  })

  return { best: ranked[0] ?? null, ranked }
}

/**
 * Decide whether a candidate is promoted over the incumbent.
 *
 * Rule order (docs/contracts.md §3, first match wins):
 *   1. `evidence.complete !== true`        → reject("incomplete evidence")
 *   2. `tasksEvaluated < config.minTasks`  → reject("insufficient tasks")
 *   3. `incumbent == null`                 → promote iff `candidate.score > 0`
 *   4. `delta < config.minGain`            → reject("gain below threshold")
 *   5. an incumbent exists, `evidence.noiseSpread` is finite and positive, and
 *      `delta < noiseSpread * noiseMultiplier`
 *                                          → reject("within measured noise")
 *   6. both holdout scores present and
 *      `candidate.holdoutScore < incumbent.holdoutScore - holdoutSlack`
 *                                          → reject("holdout regression")
 *   7. otherwise                           → promote
 *
 * `delta` is `candidate.score - incumbent.score`, or `candidate.score` when
 * there is no incumbent. Scores and delta are normalized to 6 decimals, and a
 * 1e-9 tolerance keeps an exact-threshold delta (e.g. 0.3 - 0.2 with
 * `minGain: 0.1`) on the promoting side: the contract rejects only when
 * `delta < minGain`, so `delta === minGain` promotes.
 *
 * Defensive rules: a missing / non-finite `minTasks` or `minGain` is treated
 * as unsatisfiable (`Infinity`), so a missing config can never promote;
 * a missing `holdoutSlack` defaults to `0` (no tolerated regression). A
 * non-finite candidate or incumbent score is read as `0`; a non-finite
 * holdout score is read as "no data" and the holdout comparison is skipped.
 *
 * Measured noise is an error bar, not a tie-breaker: `evidence.noiseSpread`
 * comes from a repeatability measurement (the same tree run twice), and a delta
 * inside `noiseSpread * noiseMultiplier` is indistinguishable from repetition
 * noise however it compares to `minGain`. The rule only applies when an
 * incumbent exists and the spread is a finite positive number; a zero, NaN,
 * string or missing spread is "not measured" and the legacy rules stand. The
 * multiplier defaults to `1` and is read only when finite and non-negative.
 * The first baseline (`incumbent == null`) is deliberately exempt: there is no
 * delta to compare against the bar.
 *
 * `checks` exposes one boolean per sub-decision:
 *   - `complete`     evidence.complete === true
 *   - `enoughTasks`  tasksEvaluated >= minTasks
 *   - `baseline`     candidate.score > 0 when there is no incumbent (true when
 *                    an incumbent exists — the rule does not apply)
 *   - `gain`         delta >= minGain (true when there is no incumbent)
 *   - `noise`        delta >= noiseSpread * noiseMultiplier; present ONLY when a
 *                    noise bar was measured, absent otherwise, so a caller
 *                    without a repeatability measurement sees the old shape
 *   - `holdout`      no holdout regression (true when not comparable)
 *
 * @param {{
 *   candidate: {score:number, holdoutScore:number|null},
 *   incumbent: {score:number, holdoutScore:number|null}|null,
 *   config: {minGain:number, holdoutSlack:number, minTasks:number,
 *            noiseMultiplier?:number},
 *   evidence: {tasksEvaluated:number, holdoutEvaluated:number, complete:boolean,
 *              noiseSpread?:number},
 * }} input
 * @returns {{promote:boolean, reason:string, delta:number, checks:Record<string,boolean>}}
 */
export function decidePromotion(input) {
  const safe = input !== null && typeof input === 'object' ? input : {}
  const candidate =
    safe.candidate !== null && typeof safe.candidate === 'object' ? safe.candidate : null
  const incumbent =
    safe.incumbent !== null && typeof safe.incumbent === 'object' ? safe.incumbent : null
  const config = safe.config !== null && typeof safe.config === 'object' ? safe.config : {}
  const evidence =
    safe.evidence !== null && typeof safe.evidence === 'object' ? safe.evidence : {}

  const candidateScore = roundScore(finiteOrNull(candidate?.score) ?? 0)
  const incumbentScore = roundScore(finiteOrNull(incumbent?.score) ?? 0)
  const delta =
    incumbent === null ? candidateScore : round6(candidateScore - incumbentScore)

  const tasksEvaluated = finiteOrNull(evidence.tasksEvaluated) ?? 0
  const minTasks = finiteOrNull(config.minTasks) ?? Infinity
  const minGain = finiteOrNull(config.minGain) ?? Infinity
  const holdoutSlack = finiteOrNull(config.holdoutSlack) ?? 0

  const complete = evidence.complete === true
  const enoughTasks = tasksEvaluated >= minTasks
  const baseline = incumbent === null ? candidateScore > 0 : true
  const gain = incumbent === null ? true : delta >= minGain - EPSILON

  const candidateHoldout = finiteOrNull(candidate?.holdoutScore)
  const incumbentHoldout = finiteOrNull(incumbent?.holdoutScore)
  const holdoutCompared =
    incumbent !== null && candidateHoldout !== null && incumbentHoldout !== null
  const holdout = holdoutCompared
    ? candidateHoldout >= incumbentHoldout - holdoutSlack - EPSILON
    : true

  // Repetition noise as an error bar. `null` means "not measured" (no bar), and
  // only a positive finite spread with an incumbent can produce one: a zero
  // spread would claim the measurement is exact, which a repeat run never is.
  const noiseSpread = finiteOrNull(evidence.noiseSpread)
  const rawMultiplier = finiteOrNull(config.noiseMultiplier)
  const noiseMultiplier = rawMultiplier !== null && rawMultiplier >= 0 ? rawMultiplier : 1
  const noiseBar =
    incumbent !== null && noiseSpread !== null && noiseSpread > 0
      ? noiseSpread * noiseMultiplier
      : null
  const noise = noiseBar === null ? true : delta >= noiseBar - EPSILON

  /** @type {Record<string, boolean>} */
  const checks = { complete, enoughTasks, baseline, gain, holdout }
  // Adding `noise` only when it was measured keeps the checks shape stable for
  // every caller that has no repeatability measurement.
  if (noiseBar !== null) checks.noise = noise

  if (!complete) {
    return { promote: false, reason: 'incomplete evidence', delta, checks }
  }
  if (!enoughTasks) {
    return { promote: false, reason: 'insufficient tasks', delta, checks }
  }

  const holdoutText = holdoutCompared
    ? `holdout=${fmt(candidateHoldout)} vs ${fmt(incumbentHoldout)} (slack=${fmt(holdoutSlack)})`
    : 'holdout not compared'

  if (incumbent === null) {
    if (!baseline) {
      return { promote: false, reason: 'baseline score not positive', delta, checks }
    }
    return {
      promote: true,
      reason: `promote: first-round baseline score=${fmt(candidateScore)} > 0, delta=${fmt(delta)}, ${holdoutText}`,
      delta,
      checks,
    }
  }

  if (!gain) {
    return { promote: false, reason: 'gain below threshold', delta, checks }
  }
  if (!noise) {
    return {
      promote: false,
      reason: `within measured noise: delta=${fmt(delta)} < noiseSpread=${fmt(noiseSpread)} x ${fmt(noiseMultiplier)} = ${fmt(noiseBar)}, so it is not a gain`,
      delta,
      checks,
    }
  }
  if (!holdout) {
    return { promote: false, reason: 'holdout regression', delta, checks }
  }

  return {
    promote: true,
    reason: `promote: delta=${fmt(delta)} >= minGain=${fmt(minGain)}, ${holdoutText}`,
    delta,
    checks,
  }
}

/**
 * The promotion gate for a candidate whose patch may be empty.
 *
 * An empty patch is refused before any threshold is read: a candidate that
 * moved no bytes has delivered no work, so a verifier that printed green on an
 * untouched tree is evidence about the tree, not about the candidate. That is
 * the round-17 no-op (`hasPatch:false, diff.files 0`) the ordinary gate happily
 * promoted. `hasPatch` must be exactly `true`; a missing, null or non-boolean
 * value fails closed.
 *
 * A real patch defers to `decidePromotion` unchanged, so this wrapper can never
 * promote something the ordinary gate would reject and its intent cannot drift
 * away from the thresholds. `reason === 'no-patch'` is therefore the only
 * refusal this function owns.
 *
 * @param {{hasPatch?:boolean, verifierOk?:boolean, score?:number,
 *          candidate?:object, incumbent?:object|null, config?:object,
 *          evidence?:object}} input
 * @returns {{promote:boolean, reason:string, delta:number,
 *            checks:Record<string,boolean>}}
 */
export function noopDecision(input) {
  const safe = input !== null && typeof input === 'object' ? input : {}
  if (safe.hasPatch !== true) {
    return { promote: false, reason: 'no-patch', delta: 0, checks: {} }
  }
  return decidePromotion(safe)
}
