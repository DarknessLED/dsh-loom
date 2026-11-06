/**
 * L2 — replay evaluation of the loop's own policy.
 *
 * The honest scope: replay can only re-decide what was already recorded. It
 * cannot re-run agents, so a policy that would have sampled different tasks or
 * prompted differently is *not* simulated — only the decisions that depend on
 * numbers (which attempt wins, whether the gain clears the bar, how many
 * promotions a tighter/looser threshold would have produced). That is exactly
 * the part that is cheap to get wrong and expensive to discover late.
 */

import { normalizePolicy } from './policy.js'

const GAIN_EPS = 1e-9

/** Six decimals, so float noise never decides a promotion. */
function score7(x) {
  const n = Number(x)
  return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : 0
}

function attemptsOf(round) {
  const list = Array.isArray(round?.attempts) ? round.attempts : []
  return list.filter((a) => !a.screenedOut && Number.isFinite(Number(a.score)))
}

/** Best attempt under a candidate budget; with fewer candidates you simply have fewer options. */
function bestOf(attempts, budget) {
  let pool = attempts
  if (Number.isFinite(budget) && budget > 0) pool = attempts.slice(0, Math.round(budget))
  if (!pool.length) return null
  let best = pool[0]
  for (const a of pool.slice(1)) if (Number(a.score) > Number(best.score)) best = a
  return best
}

/**
 * @returns {{decisions: Array<{n:number,promote:boolean,reason:string,score:number|null,delta:number|null}>, metrics: object}}
 */
export function replayRounds({ rounds, policy } = {}) {
  const p = normalizePolicy(policy)
  const ordered = [...(rounds || [])].filter((r) => r && Number.isFinite(Number(r.n))).sort((a, b) => a.n - b.n)
  const decisions = []
  let incumbent = null // { score, n, attempt }

  for (const round of ordered) {
    const n = Number(round.n)
    const best = bestOf(attemptsOf(round), p.candidates)
    if (!best) {
      decisions.push({ n, promote: false, reason: 'no-attempt', score: null, delta: null })
      continue
    }
    const score = Number(best.score)
    const verified = best.verifierOk !== false
    if (!verified) {
      decisions.push({ n, promote: false, reason: 'verifier-failed', score, delta: null })
      continue
    }
    const delta = incumbent ? score7(score - incumbent.score) : score
    const promote = !incumbent || delta >= p.minGain - GAIN_EPS
    if (promote) incumbent = { score, n, attempt: best.id ?? null }
    decisions.push({
      n,
      promote,
      reason: promote ? 'promoted' : 'gain-too-small',
      score,
      delta,
    })
  }

  const promotions = decisions.filter((d) => d.promote).length
  const scored = decisions.filter((d) => d.score !== null)
  const metrics = {
    rounds: decisions.length,
    promotions,
    rejections: decisions.length - promotions,
    finalScore: incumbent ? incumbent.score : 0,
    finalRound: incumbent ? incumbent.n : null,
    bestScore: scored.length ? Math.max(...scored.map((d) => d.score)) : 0,
    avgScore: scored.length ? score7(scored.reduce((s, d) => s + d.score, 0) / scored.length) : 0,
  }
  return { decisions, metrics, policy: p }
}

/**
 * Compare the policy in force against a candidate, on the recorded rounds.
 * `verdict` is deliberately conservative: a replay win is evidence, not proof.
 */
export function comparePolicies({ rounds, base, candidate } = {}) {
  const a = replayRounds({ rounds, policy: base })
  const b = replayRounds({ rounds, policy: candidate })
  const delta = {
    promotions: b.metrics.promotions - a.metrics.promotions,
    finalScore: score7(b.metrics.finalScore - a.metrics.finalScore),
    rejections: b.metrics.rejections - a.metrics.rejections,
  }
  const better = delta.finalScore > 1e-9 || (Math.abs(delta.finalScore) <= 1e-9 && delta.promotions < 0)
  const verdict = !rounds || !rounds.length ? 'no-evidence' : better ? 'candidate-better' : delta.finalScore < -1e-9 ? 'candidate-worse' : 'no-difference'
  return { base: a, candidate: b, delta, verdict }
}
