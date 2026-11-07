/**
 * The triangle, per campaign: efficiency, quality, cost — as numbers.
 *
 * The round record already carries the measurements (wall time, candidate time,
 * verifier time, tokens, USD). This is the only place that turns them into the
 * aggregates a reader actually argues about, so the dashboard, the report and
 * the metrics script cannot drift into three different definitions.
 *
 * Pure: takes a `rounds` array, returns a plain object. Missing measurements
 * stay null rather than becoming zero — "not measured" and "cost nothing" are
 * different claims, and conflating them is how a budget guard gets fooled.
 */

function num(x) {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

function ratio(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null
  return a / b
}

/**
 * What one more round is likely to cost in this campaign, from its own ledger.
 *
 * The only honest predictor of the next round is what earlier rounds actually
 * cost: the mean `costUsd` over rounds that recorded one. Rounds with no
 * measurement (`null`/`undefined`/non-finite) are excluded rather than counted
 * as zero — averaging them in would quietly underwrite a budget preflight with
 * rounds that never reported a price. No measured round at all yields 0, which
 * the caller must read as "unknown, do not block": an empty ledger is not
 * evidence that the next round is free.
 *
 * @param {Array<object>} rounds folded rounds carrying `costUsd`
 * @returns {number} mean measured round cost in USD, 0 when unmeasured
 */
export function estimatedRoundCost(rounds) {
  const list = Array.isArray(rounds) ? rounds : []
  let sum = 0
  let measured = 0
  for (const r of list) {
    if (!r || typeof r !== 'object') continue
    if (r.costUsd === null || r.costUsd === undefined) continue
    const cost = Number(r.costUsd)
    if (!Number.isFinite(cost)) continue
    sum += cost
    measured += 1
  }
  return measured > 0 ? Math.round((sum / measured) * 1e6) / 1e6 : 0
}

/**
 * The ledger's token measurements, in one place so "what was spent" and "what
 * the next round will cost" cannot disagree about which rounds count.
 *
 * A round with no `tokens` field, `null`, or a non-finite value never reported
 * a measurement and is skipped. `0` counts: a round that recorded zero tokens
 * measured zero, which is a fact and not the same claim as silence.
 *
 * @param {Array<object>} rounds folded rounds carrying `tokens`
 * @returns {{sum: number, count: number}} measured token total and round count
 */
function tokenTotals(rounds) {
  const list = Array.isArray(rounds) ? rounds : []
  let sum = 0
  let count = 0
  for (const r of list) {
    if (!r || typeof r !== 'object') continue
    if (r.tokens === null || r.tokens === undefined) continue
    const tokens = Number(r.tokens)
    if (!Number.isFinite(tokens)) continue
    sum += tokens
    count += 1
  }
  return { sum, count }
}

/**
 * What one more round is likely to consume in this campaign, from its own
 * ledger. Same convention as {@link estimatedRoundCost}: the mean of measured
 * `round.tokens`, and 0 when no round measured any — the caller must read 0 as
 * "unknown, do not block" rather than "free". The provider meters tokens even
 * when the dollars still fit, so this is the number a token cap is compared
 * against.
 *
 * @param {Array<object>} rounds folded rounds carrying `tokens`
 * @returns {number} mean measured round tokens, 0 when unmeasured
 */
export function estimatedRoundTokens(rounds) {
  const { sum, count } = tokenTotals(rounds)
  return count > 0 ? Math.round(sum / count) : 0
}

/**
 * Tokens this campaign can already be shown to have spent, from the same
 * measured rounds. A `budget.spent` fold would be a second view of the same
 * spend and summing both would double-count it, so only the round ledger is
 * read here — exactly the rule `campaignUsage` applies to dollars.
 *
 * @param {Array<object>} rounds folded rounds carrying `tokens`
 * @returns {number} sum of measured round tokens, 0 when unmeasured
 */
export function recordedRoundTokens(rounds) {
  return tokenTotals(rounds).sum
}

/**
 * @param {Array<object>} rounds folded rounds (`durationMs`, `planMs`,
 *   `attemptMs`, `verifierMs`, `tokens`, `costUsd`, `status`, `promoted`)
 */
export function campaignTriangle(rounds) {
  const list = Array.isArray(rounds) ? rounds.filter((r) => r && typeof r === 'object') : []
  let durationMs = 0
  let planMs = 0
  let attemptMs = 0
  let verifierMs = 0
  let holdoutMs = 0
  let tokens = 0
  let usd = 0
  let timed = 0
  let planned = 0
  let measuredTokens = 0
  let promoted = 0
  let noGain = 0
  let finished = 0
  for (const r of list) {
    const wall = num(r.durationMs)
    if (wall > 0) {
      durationMs += wall
      timed += 1
    }
    // Planning is only a measurement when a round actually reported it; older
    // ledgers carry no planMs and must stay unknown rather than becoming zero.
    if (r.planMs !== null && r.planMs !== undefined) {
      const p = Number(r.planMs)
      if (Number.isFinite(p)) {
        planMs += Math.max(0, p)
        planned += 1
      }
    }
    attemptMs += num(r.attemptMs)
    verifierMs += num(r.verifierMs)
    // The holdout gate is paid after the candidates finish. A round that never
    // recorded it paid nothing extra as far as the ledger knows, so 0 is right.
    holdoutMs += num(r.holdoutMs)
    if (num(r.tokens) > 0) {
      tokens += num(r.tokens)
      measuredTokens += 1
    }
    usd += num(r.costUsd ?? r.usd)
    if (r.status && r.status !== 'running') {
      finished += 1
      if (r.promoted === true) promoted += 1
      if (r.status === 'no-gain') noGain += 1
    }
  }
  // Planning: a campaign whose rounds never reported `planMs` has not measured
  // it (null); a campaign that reported zero planned nothing (0 is a fact).
  const planningMs = planned > 0 ? planMs : null
  // `parallelFactor` folds planning and the holdout gate into the serial
  // denominator, so a round that planned for a third of its wall time or spent
  // seconds proving a holdout reads as less parallel than its attempt phase
  // actually was. `attemptWindowMs` names the part of the round candidates could
  // occupy — wall time minus planning minus the holdout gate — and
  // `planAwareFactor` credits candidates only against it. Without a planning
  // measurement there is no window to name and the plain factor is the honest
  // answer; a window of zero has no denominator and stays null, not Infinity.
  const parallelFactor = ratio(attemptMs, durationMs)
  const attemptWindowMs =
    timed === 0 || planningMs === null ? null : Math.max(0, durationMs - planningMs - holdoutMs)
  return {
    rounds: finished,
    timedRounds: timed,
    // efficiency
    durationMs,
    planMs: planningMs,
    attemptMs,
    verifierMs,
    holdoutMs,
    secondsPerRound: timed > 0 ? durationMs / timed / 1000 : null,
    parallelFactor,
    attemptWindowMs,
    planAwareFactor: attemptWindowMs === null ? parallelFactor : ratio(attemptMs, attemptWindowMs),
    verifierShare: ratio(verifierMs, durationMs),
    planShare: planningMs === null ? null : ratio(planningMs, durationMs),
    // quality
    promotionRate: ratio(promoted, finished),
    noGainRate: ratio(noGain, finished),
    attemptsPerRound: ratio(
      list.reduce((sum, r) => sum + num(r.attemptCount ?? (Array.isArray(r.attempts) ? r.attempts.length : 0)), 0),
      finished,
    ),
    // cost
    tokens,
    usd: Math.round(usd * 1e6) / 1e6,
    tokensPerRound: measuredTokens > 0 ? ratio(tokens, finished) : null,
    usdPerPromotion: promoted > 0 ? Math.round((usd / promoted) * 1e6) / 1e6 : null,
    measured: durationMs > 0 || measuredTokens > 0,
  }
}
