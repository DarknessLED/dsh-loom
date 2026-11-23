/**
 * Where a chain version lands in the archive.
 *
 * `src/chain/spec-diff.js` answers "which fields did this version change", which
 * is the structure of an edit. Two versions can change very different fields and
 * behave identically, or change one field and behave oppositely; the archive a
 * quality-diversity search keeps is keyed on behaviour, not on structure
 * (1504.04909 §3 — the archive cell *is* the population entry).
 *
 * So this reads rounds rather than specs. A version is filed by what it did on
 * the tasks it ran: its mean score, how many rounds it solved, and what it cost.
 * The key is coarse on purpose — a finer one would put every round in its own
 * cell and the archive would stop being a summary of anything.
 *
 * A version that never ran has no behaviour. That is not an error: it is the
 * `unmeasured` cell, and saying so is more useful than filing it with the
 * versions it replaced.
 */

/** Coarse buckets, chosen so neighbouring cells differ by something visible. */
function bucketScore(score) {
  if (!Number.isFinite(Number(score))) return 'x'
  const v = Math.max(0, Math.min(1, Number(score)))
  return Math.floor(v * 5).toString() // 0.0-0.2 -> '0' ... 0.8-1.0 -> '4'
}

function bucketCost(usd) {
  const v = Number(usd)
  if (!Number.isFinite(v) || v <= 0) return '0'
  // Orders of magnitude, not cents: a round that costs 10x another is a
  // different regime, and a round that costs 1.2x is noise. The bucket is
  // clamped at zero because a sub-cent round is one bucket, not a negative one
  // — `log10(0.02) + 1` is negative and would otherwise write `c-1`.
  return Math.max(0, Math.min(9, Math.floor(Math.log10(v) + 1))).toString()
}

const round6 = (v) => Math.round(Number(v) * 1e6) / 1e6

/**
 * File one chain version by what its own rounds did.
 *
 * @param {{chainVersion?: number|string, rounds?: Array<{n:number, chainVersion?:any, score?:number|null, status?:string, costUsd?:number, promoted?:boolean}>}} opts
 * @returns {{key:string, chainVersion:any, rounds:number, meanScore:number|null, solved:number, medianCostUsd:number|null}}
 */
export function descriptorOf({ chainVersion = null, rounds = [] } = {}) {
  const list = (Array.isArray(rounds) ? rounds : [])
    .filter((r) => r && (r.chainVersion === undefined || r.chainVersion === null || r.chainVersion === chainVersion))
    .filter((r) => Number.isFinite(Number(r.score)))
    .sort((a, b) => (Number(a?.n) || 0) - (Number(b?.n) || 0))
  if (!list.length) {
    const key = 'unmeasured'
    return { key, chainVersion, rounds: 0, meanScore: null, solved: 0, medianCostUsd: null }
  }
  const scores = list.map((r) => Number(r.score))
  const meanScore = round6(scores.reduce((s, v) => s + v, 0) / scores.length)
  const solved = list.filter((r) => r.promoted === true || r.status === 'promoted' || Number(r.score) >= 1).length
  const costs = list.map((r) => Number(r.costUsd)).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b)
  const medianCostUsd = costs.length ? round6(costs[Math.floor(costs.length / 2)]) : null
  const solvedShare = Math.round((solved / list.length) * 3) // 0, 1, 2, 3 of 3
  const key = `s${bucketScore(meanScore)}-w${solvedShare}-c${bucketCost(medianCostUsd)}`
  return { key, chainVersion, rounds: list.length, meanScore, solved, medianCostUsd }
}
