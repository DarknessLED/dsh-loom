/**
 * Round economics: where a round's money went, not just how much it was.
 *
 * The ledger knows the real token counts now, but "spend $0.66" cannot tell an
 * operator whether the plan node, the candidates or the verifier bought the
 * bill — 93% of it is cache reads, and a cache read is cheap because a previous
 * node already paid to write that prefix. These are pure projections over one
 * round (or a list of rounds) so the dashboard, rsi_report and future tooling
 * all answer the same four questions from the same numbers:
 *
 *   cacheHitRate(usage)        how much of what was sent was already cached
 *   roundCost(round)           usd/tokens for the round and for each node
 *   costPerPromotedChange(rs)  what one landed change actually cost
 *
 * Rules worth stating because they are easy to get wrong:
 *   - a round with no tokens has a 0% hit rate, not 100% (0/0 is "no evidence",
 *     and reporting it as a perfect cache would flatter an empty round);
 *   - cache reads count in the denominator too, so the rate is "cached share of
 *     everything the model read or wrote", not "cache reads over fresh input";
 *   - failed and rolled-back rounds are charged to the promoted change: that is
 *     the point of the number (the cost of finding the winner, not the invoice
 *     of the winner alone);
 *   - nothing promoted is `null`, never Infinity/NaN, so a caller can print
 *     "n/a" instead of a broken table cell.
 */

const TOKEN_FIELDS = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']

/** Finite, non-negative number or 0 — malformed metering never throws or goes negative. */
function num(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function usageOf(source) {
  const usage = source && typeof source === 'object' ? source.usage : undefined
  return usage && typeof usage === 'object' ? usage : {}
}

/** Total tokens metered for one usage blob (input + output + cache read + cache write). */
function tokensOf(usage) {
  return TOKEN_FIELDS.reduce((sum, field) => sum + num(usage?.[field]), 0)
}

/**
 * Cache hit rate: cached reads over every input-side token, i.e.
 * cacheRead / (input + cacheRead + cacheWrite). Output tokens are excluded
 * because they were generated, never served from the prefix cache.
 *
 * @param {{inputTokens?: number, outputTokens?: number, cacheReadTokens?: number, cacheWriteTokens?: number}} usage
 * @returns {number} 0..1, and exactly 0 when nothing was sent
 */
export function cacheHitRate(usage) {
  const input = num(usage?.inputTokens)
  const read = num(usage?.cacheReadTokens)
  const write = num(usage?.cacheWriteTokens)
  const denominator = input + read + write
  return denominator === 0 ? 0 : read / denominator
}

function attemptsOf(round) {
  return Array.isArray(round?.attempts) ? round.attempts.filter((a) => a && typeof a === 'object') : []
}

function nodeKeyOf(attempt) {
  const node = typeof attempt?.node === 'string' ? attempt.node.trim() : ''
  return node || 'unassigned'
}

/**
 * Break one round down by node.
 *
 * `usd` and `tokens` are the round totals; `byNode` maps every attempt node to
 * its own share. Two attempts on the same node (a retry, or a chain that runs a
 * node twice) are merged, because the operator's question is per node, not per
 * attempt. The round's `costUsd` is authoritative when present; otherwise the
 * attempt costs are summed so an older ledger without a round total still
 * produces a number.
 *
 * @returns {{usd: number, tokens: number, cacheHitRate: number, byNode: Object<string, {usd: number, tokens: number}>}}
 */
export function roundCost(round) {
  const attempts = attemptsOf(round)
  const byNode = {}
  let tokens = 0
  let attemptUsd = 0
  let input = 0
  let cacheRead = 0
  let cacheWrite = 0

  for (const attempt of attempts) {
    const node = nodeKeyOf(attempt)
    const usage = usageOf(attempt)
    const nodeTokens = tokensOf(usage)
    const nodeUsd = num(attempt?.costUsd)

    tokens += nodeTokens
    attemptUsd += nodeUsd
    input += num(usage.inputTokens)
    cacheRead += num(usage.cacheReadTokens)
    cacheWrite += num(usage.cacheWriteTokens)

    if (!byNode[node]) byNode[node] = { usd: 0, tokens: 0 }
    byNode[node].usd += nodeUsd
    byNode[node].tokens += nodeTokens
  }

  const usd = Number.isFinite(Number(round?.costUsd)) && Number(round.costUsd) >= 0 ? Number(round.costUsd) : attemptUsd

  return {
    usd,
    tokens,
    cacheHitRate: cacheHitRate({ inputTokens: input, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite }),
    byNode,
  }
}

/**
 * Cost of one promoted change: every round in the list is charged (the failures
 * and rollbacks paid for the winner too), divided by the number of promotions.
 *
 * @param {Array<{promoted?: boolean, costUsd?: number}>} rounds
 * @returns {number|null} null when the list is empty or nothing promoted
 */
export function costPerPromotedChange(rounds) {
  const list = Array.isArray(rounds) ? rounds.filter((r) => r && typeof r === 'object') : []
  const promoted = list.filter((r) => r.promoted === true).length
  if (promoted === 0) return null
  const total = list.reduce((sum, r) => sum + num(r?.costUsd), 0)
  return total / promoted
}
