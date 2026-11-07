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
 * @param {Array<object>} rounds folded rounds (`durationMs`, `attemptMs`,
 *   `verifierMs`, `tokens`, `costUsd`, `status`, `promoted`)
 */
export function campaignTriangle(rounds) {
  const list = Array.isArray(rounds) ? rounds.filter((r) => r && typeof r === 'object') : []
  let durationMs = 0
  let attemptMs = 0
  let verifierMs = 0
  let tokens = 0
  let usd = 0
  let timed = 0
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
    attemptMs += num(r.attemptMs)
    verifierMs += num(r.verifierMs)
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
  return {
    rounds: finished,
    timedRounds: timed,
    // efficiency
    durationMs,
    attemptMs,
    verifierMs,
    secondsPerRound: timed > 0 ? durationMs / timed / 1000 : null,
    parallelFactor: ratio(attemptMs, durationMs),
    verifierShare: ratio(verifierMs, durationMs),
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
