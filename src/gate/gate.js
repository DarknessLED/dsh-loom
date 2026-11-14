// Promotion gate — docs/contracts.md §3.
//
// Pure functions only: no filesystem, no clock, no randomness. The one import is
// the scoring rule itself (src/gate/score.js), which is pure too.
// Every export tolerates malformed input (null / NaN / missing fields) and
// never throws; values that cannot be evaluated count as "not satisfied".

import { scoreOf } from './score.js'

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
 * Sort key: non-finite / missing scores rank last. (The exported scoring rule in
 * score.js is a different question: ranking uses the score an attempt already
 * carries, while promotion asks what measurement produced it.)
 * @param {unknown} attempt
 * @returns {number}
 */
function rankScoreOf(attempt) {
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
 * Read a candidate / incumbent as one comparable reading.
 *
 * A bare finite number is the same fact as an explicit `score`. An attempt with
 * a finite `metrics.killRate` is graded and takes its score from `scoreOf`; an
 * object carrying an explicit finite `score` (the legacy shape) keeps that
 * reading when no graded measurement was made; a bare attempt is scored by its
 * verdict. `source` names the measurement kind so the caller can refuse to
 * subtract two different kinds. A missing side is `null`.
 *
 * @param {unknown} value
 * @returns {{score:number, source:'killRate'|'score'|'binary',
 *            metrics:Record<string,number>, holdoutScore:number|null}|null}
 */
function readingOf(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { score: roundScore(value), source: 'score', metrics: {}, holdoutScore: null }
  }
  if (value === null || typeof value !== 'object') return null

  const metrics =
    value.metrics !== null && typeof value.metrics === 'object' ? value.metrics : {}
  const holdoutScore = finiteOrNull(value.holdoutScore)
  const graded = finiteOrNull(metrics.killRate) !== null

  if (graded) {
    const gradedScore = scoreOf(value)
    return {
      score: roundScore(gradedScore.score),
      source: gradedScore.source,
      metrics,
      holdoutScore,
    }
  }

  const explicit = finiteOrNull(value.score)
  if (explicit !== null) {
    return { score: roundScore(explicit), source: 'score', metrics, holdoutScore }
  }

  const verdict = scoreOf(value)
  return {
    score: roundScore(verdict.score),
    source: verdict.source,
    metrics,
    holdoutScore,
  }
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
    const scoreA = rankScoreOf(a)
    const scoreB = rankScoreOf(b)
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
 *   3. no comparable incumbent             → promote iff the reading is positive
 *      (first round, or a graded candidate whose incumbent is ungraded)
 *   4. an ungraded candidate facing a graded incumbent
 *                                          → reject("incomparable measurement")
 *   5. `delta < config.minGain`            → reject("gain below threshold")
 *   6. an incumbent exists, the effective noise spread is finite and positive,
 *      and `delta < noiseSpread * noiseMultiplier`
 *                                          → reject("within measured noise")
 *   7. both holdout scores present and
 *      `candidate.holdoutScore < incumbent.holdoutScore - holdoutSlack`
 *                                          → reject("holdout regression")
 *   8. otherwise                           → promote
 *
 * Each side is read by `readingOf`: a bare number, an attempt carrying a finite
 * `metrics.killRate` (its score comes from `scoreOf`), an object carrying an
 * explicit `score`, or a verdict-only attempt. `delta` is
 * `candidate.score - incumbent.score`, or `candidate.score` when there is no
 * comparable incumbent. Scores and delta are normalized to 6 decimals, and a
 * 1e-9 tolerance keeps an exact-threshold delta (e.g. 0.3 - 0.2 with
 * `minGain: 0.1`) on the promoting side: the contract rejects only when
 * `delta < minGain`, so `delta === minGain` promotes.
 *
 * A kill rate and a binary verdict are different measurement kinds: subtracting
 * them would invent a delta on two scales. The fallback is explicit and
 * asymmetric. A graded candidate against an ungraded incumbent brings a
 * measurement the baseline never had, so the incumbent's binary 1 is not a bar
 * and the round is read as a baseline (the test that names this: "a metric the
 * base never had cannot be compared"). An ungraded candidate against a graded
 * incumbent cannot demonstrate a gain in the incumbent's units, so it is
 * refused. Holdout and noise comparisons only run between comparable readings.
 * The returned `metrics` are the candidate's and `scoreSource` is the kind its
 * score came from.
 *
 * Defensive rules: a missing / non-finite `minTasks` or `minGain` is treated
 * as unsatisfiable (`Infinity`), so a missing config can never promote;
 * a missing `holdoutSlack` defaults to `0` (no tolerated regression). A
 * non-finite candidate or incumbent score is read as `0`; a non-finite
 * holdout score is read as "no data" and the holdout comparison is skipped.
 *
 * Measured noise is an error bar, not a tie-breaker: the effective spread comes
 * from a repeatability measurement (the same tree run twice) and a delta inside
 * `noiseSpread * noiseMultiplier` is indistinguishable from repetition noise
 * however it compares to `minGain`. The effective spread is the first finite
 * number among `evidence.noiseSpread` (this round's measurement),
 * `policy.noiseSpread` and `config.noiseSpread` (the campaign's / install's
 * recorded figure); an install that never measured its own repeatability passes
 * none of them, so the legacy `minGain` comparison stands. The rule only
 * applies when an incumbent exists and the spread is positive; a zero, NaN,
 * string or missing spread is "not measured" and the legacy rules stand. The
 * multiplier defaults to `1` and is read only when finite and non-negative.
 * The first baseline (`incumbent == null`) is deliberately exempt: there is no
 * delta to compare against the bar.
 *
 * `checks` exposes one boolean per sub-decision:
 *   - `complete`     evidence.complete === true
 *   - `enoughTasks`  tasksEvaluated >= minTasks (`evidence.tasks` is the same
 *                    count under its short name)
 *   - `baseline`     the reading is positive when there is no comparable
 *                    incumbent (true when a comparison exists — the rule does
 *                    not apply)
 *   - `gain`         delta >= minGain (true when there is no comparable
 *                    incumbent)
 *   - `noise`        delta >= noiseSpread * noiseMultiplier; present ONLY when a
 *                    noise bar was measured on comparable readings, absent
 *                    otherwise, so a caller without a repeatability measurement
 *                    sees the old shape
 *   - `holdout`      no holdout regression (true when not comparable)
 *
 * @param {{
 *   candidate: {score?:number, metrics?:Record<string,number>,
 *               verifierOk?:boolean, holdoutScore?:number|null}|number,
 *   incumbent: {score?:number, metrics?:Record<string,number>,
 *               verifierOk?:boolean, holdoutScore?:number|null}|number|null,
 *   config: {minGain:number, holdoutSlack:number, minTasks:number,
 *            noiseMultiplier?:number, noiseSpread?:number},
 *   policy?: {noiseSpread?:number},
 *   evidence: {tasksEvaluated?:number, tasks?:number, holdoutEvaluated:number,
 *              complete:boolean, noiseSpread?:number},
 * }} input
 * @returns {{promote:boolean, reason:string, delta:number,
 *            checks:Record<string,boolean>, metrics:Record<string,number>,
 *            scoreSource:'killRate'|'score'|'binary'}}
 */
export function decidePromotion(input) {
  const safe = input !== null && typeof input === 'object' ? input : {}
  const candidate = readingOf(safe.candidate)
  const incumbent = readingOf(safe.incumbent)
  const config = safe.config !== null && typeof safe.config === 'object' ? safe.config : {}
  const evidence =
    safe.evidence !== null && typeof safe.evidence === 'object' ? safe.evidence : {}
  const policy = safe.policy !== null && typeof safe.policy === 'object' ? safe.policy : {}

  const candidateScore = candidate === null ? 0 : candidate.score
  const incumbentScore = incumbent === null ? 0 : incumbent.score
  const candidateSource = candidate === null ? 'binary' : candidate.source
  const candidateMetrics = candidate === null ? {} : { ...candidate.metrics }

  // Measurement kinds. `comparable` is false only when both sides exist but one
  // is graded and the other is not; subtracting those would invent a delta on
  // two scales. `baselineOnly` names the side of the fallback that can still be
  // judged without a comparison (no incumbent, or a graded candidate).
  const candidateGraded = candidate !== null && candidate.source === 'killRate'
  const incumbentGraded = incumbent !== null && incumbent.source === 'killRate'
  const comparable = incumbent === null || candidateGraded === incumbentGraded
  const canCompare = incumbent !== null && comparable
  const baselineOnly = incumbent === null || (!comparable && candidateGraded)

  const delta = canCompare
    ? round6(candidateScore - incumbentScore)
    : baselineOnly
      ? candidateScore
      : 0

  // `tasks` is the short spelling of the same count: a caller that reports how
  // many tasks it evaluated must not be read as evaluating zero of them.
  const tasksEvaluated =
    finiteOrNull(evidence.tasksEvaluated) ?? finiteOrNull(evidence.tasks) ?? 0
  const minTasks = finiteOrNull(config.minTasks) ?? Infinity
  const minGain = finiteOrNull(config.minGain) ?? Infinity
  const holdoutSlack = finiteOrNull(config.holdoutSlack) ?? 0

  const complete = evidence.complete === true
  const enoughTasks = tasksEvaluated >= minTasks
  const baseline = baselineOnly ? candidateScore > 0 : true
  const gain = canCompare ? delta >= minGain - EPSILON : true

  const candidateHoldout = candidate === null ? null : candidate.holdoutScore
  const incumbentHoldout = incumbent === null ? null : incumbent.holdoutScore
  const holdoutCompared =
    canCompare && candidateHoldout !== null && incumbentHoldout !== null
  const holdout = holdoutCompared
    ? candidateHoldout >= incumbentHoldout - holdoutSlack - EPSILON
    : true

  // Repetition noise as an error bar. `null` means "not measured" (no bar), and
  // only a positive finite spread with an incumbent can produce one: a zero
  // spread would claim the measurement is exact, which a repeat run never is.
  // This round's measurement wins; otherwise the campaign policy's recorded
  // figure, then the install config's. `null` from all three means "not
  // measured", and the legacy comparison stands.
  const noiseSpread =
    finiteOrNull(evidence.noiseSpread) ??
    finiteOrNull(policy.noiseSpread) ??
    finiteOrNull(config.noiseSpread)
  const rawMultiplier = finiteOrNull(config.noiseMultiplier)
  const noiseMultiplier = rawMultiplier !== null && rawMultiplier >= 0 ? rawMultiplier : 1
  const noiseBar =
    canCompare && noiseSpread !== null && noiseSpread > 0
      ? noiseSpread * noiseMultiplier
      : null
  const noise = noiseBar === null ? true : delta >= noiseBar - EPSILON

  /** @type {Record<string, boolean>} */
  const checks = { complete, enoughTasks, baseline, gain, holdout }
  // Adding `noise` only when it was measured keeps the checks shape stable for
  // every caller that has no repeatability measurement.
  if (noiseBar !== null) checks.noise = noise

  // Every decision carries what produced the candidate's number, so a caller can
  // log the metric and the fallback instead of re-deriving them.
  const outcome = { delta, checks, metrics: candidateMetrics, scoreSource: candidateSource }

  if (!complete) {
    return { promote: false, reason: 'incomplete evidence', ...outcome }
  }
  if (!enoughTasks) {
    return { promote: false, reason: 'insufficient tasks', ...outcome }
  }

  const holdoutText = holdoutCompared
    ? `holdout=${fmt(candidateHoldout)} vs ${fmt(incumbentHoldout)} (slack=${fmt(holdoutSlack)})`
    : 'holdout not compared'

  if (baselineOnly) {
    if (!baseline) {
      return { promote: false, reason: 'baseline score not positive', ...outcome }
    }
    const basis =
      incumbent === null
        ? 'first-round baseline'
        : 'no comparable baseline (graded candidate, ungraded incumbent)'
    return {
      promote: true,
      reason: `promote: ${basis} score=${fmt(candidateScore)} > 0, delta=${fmt(delta)}, ${holdoutText}`,
      ...outcome,
    }
  }

  if (!canCompare) {
    return {
      promote: false,
      reason: 'incomparable measurement: candidate is ungraded, incumbent has a kill rate',
      ...outcome,
    }
  }

  if (!gain) {
    return { promote: false, reason: 'gain below threshold', ...outcome }
  }
  if (!noise) {
    return {
      promote: false,
      reason: `within measured noise: delta=${fmt(delta)} < noiseSpread=${fmt(noiseSpread)} x ${fmt(noiseMultiplier)} = ${fmt(noiseBar)}, so it is not a gain`,
      ...outcome,
    }
  }
  if (!holdout) {
    return { promote: false, reason: 'holdout regression', ...outcome }
  }

  return {
    promote: true,
    reason: `promote: delta=${fmt(delta)} >= minGain=${fmt(minGain)}, ${holdoutText}`,
    ...outcome,
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
