/**
 * Campaign evidence health: one pure reading of a campaign's round ledger.
 *
 * A report already shows what each round did, but a human cannot tell from the
 * table whether the loop is still working or merely spinning. This module
 * distills the ledger into the few numbers that answer that question, so the
 * report and the panel can show the same verdict from the same source instead
 * of disagreeing.
 *
 * No clock, no persistence, no host: the caller decides what to do with the
 * answer. Everything here is derived from materialized state.
 */

/** Rounds inspected when deciding whether the loop has stalled. */
const STALL_WINDOW = 3

function roundsOf(state) {
  return Array.isArray(state?.rounds) ? state.rounds : []
}

/**
 * A round is progress only when it says so explicitly. `promoted === true` is
 * what the gate writes today; the status check covers older ledgers where the
 * flag was not recorded but the status was.
 */
function isPromoted(round) {
  return round?.promoted === true || round?.status === 'promoted'
}

/**
 * A round's duration in milliseconds, or null when the ledger carries no
 * trustworthy number. `ms` is used when finite; otherwise the start/end
 * timestamps are differenced. Missing, NaN and negative values are ignored so
 * one bad record cannot poison the mean.
 */
function roundMs(round) {
  // `durationMs` first: that is the field the loop writes on every round
  // finished event, and the materializer only ever copies it under that name.
  // Reading `ms` alone made this leg null in every campaign the ledger had --
  // the durations were recorded, they were simply looked up under a name no
  // writer used. `ms` stays as a fallback for older ledgers.
  const modern = round?.durationMs
  if (Number.isFinite(modern) && modern >= 0) return modern
  const ms = round?.ms
  if (Number.isFinite(ms) && ms >= 0) return ms
  const started = typeof round?.at === 'string' ? Date.parse(round.at) : NaN
  const ended = typeof round?.endedAt === 'string' ? Date.parse(round.endedAt) : NaN
  if (Number.isFinite(started) && Number.isFinite(ended) && ended >= started) return ended - started
  return null
}

/**
 * The campaign's evidence health.
 *
 * verdict precedence:
 * - `no-evidence`  no round has finished yet
 * - `regressing`   the held-out task rejected at least one patch
 * - `stalled`      the last {@link STALL_WINDOW} rounds promoted nothing
 * - `healthy`      anything else, including a single quiet round
 *
 * @param {{rounds?: Array<object>} | undefined} state
 * @returns {{
 *   rounds: number,
 *   promotions: number,
 *   noGain: number,
 *   holdoutFailures: number,
 *   promotionRate: number,
 *   avgRoundMs: number | null,
 *   verdict: 'no-evidence' | 'regressing' | 'stalled' | 'healthy',
 * }}
 */
export function campaignQuality(state) {
  const rounds = roundsOf(state)
  const roundsCount = rounds.length
  const promotions = rounds.filter(isPromoted).length
  const noGain = rounds.filter((round) => round?.status === 'no-gain').length
  const holdoutFailures = rounds.filter((round) => round?.status === 'holdout-failed').length
  const durations = rounds.map(roundMs).filter((ms) => Number.isFinite(ms))
  const avgRoundMs = durations.length
    ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length)
    : null
  const promotionRate = roundsCount ? promotions / roundsCount : 0

  let verdict
  if (roundsCount === 0) verdict = 'no-evidence'
  else if (holdoutFailures > 0) verdict = 'regressing'
  else if (roundsCount >= STALL_WINDOW && rounds.slice(-STALL_WINDOW).every((round) => !isPromoted(round))) {
    verdict = 'stalled'
  } else verdict = 'healthy'

  return { rounds: roundsCount, promotions, noGain, holdoutFailures, promotionRate, avgRoundMs, verdict }
}

/**
 * One-line human rendering, so every surface says the same thing in the same
 * words. Kept next to the numbers it prints.
 *
 * @param {ReturnType<typeof campaignQuality>} quality
 * @returns {string}
 */
export function qualityLine(quality) {
  const q = quality || campaignQuality(undefined)
  const rate = `${Math.round(q.promotionRate * 100)}%`
  const mean = q.avgRoundMs == null ? '-' : `${q.avgRoundMs}ms`
  return (
    `evidence health: ${q.verdict} · promotions ${q.promotions}/${q.rounds} (${rate})` +
    ` · no-gain ${q.noGain} · holdout failures ${q.holdoutFailures} · mean round ${mean}`
  )
}
