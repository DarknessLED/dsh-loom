/**
 * Successive halving inside a round.
 *
 * The expensive part of a candidate is the real attempt; the cheap part is
 * finding out whether a candidate is hopeless. When a task declares a `screen`
 * verifier we pay for the cheap part on every candidate and the expensive part
 * only on the survivors (default: half), which is the standard 4 → 2 → 1
 * schedule with the last stage being the ordinary gate.
 *
 * Pure functions only: ordering and counts are testable without a host.
 */

/** Is a screening stage possible at all for this task/round? */
export function screenEnabled({ task, config, candidates } = {}) {
  if (!task || !task.screen || typeof task.screen.cmd !== 'string' || !task.screen.cmd.trim()) return false
  if (!config?.halving?.enabled) return false
  return Number(candidates) > 1
}

/**
 * Keep the candidates that showed something in the screening stage.
 * A passing screen always outranks a failing one, then higher score, then lower
 * index (deterministic, and earlier candidates get the tie-break).
 *
 * @param {Array<{id: string, ok?: boolean, score?: number}>} results
 * @param {{keepRatio?: number, minKeep?: number}} opts
 * @returns {{survivors: string[], dropped: string[], keep: number}}
 */
export function pickSurvivors(results, { keepRatio = 0.5, minKeep = 1 } = {}) {
  const list = Array.isArray(results) ? results.filter((r) => r && typeof r.id === 'string') : []
  if (!list.length) return { survivors: [], dropped: [], keep: 0 }
  const n = list.length
  const ratio = Number.isFinite(Number(keepRatio)) ? Math.min(1, Math.max(0, Number(keepRatio))) : 0.5
  const min = Number.isFinite(Number(minKeep)) ? Math.max(1, Math.floor(Number(minKeep))) : 1
  const keep = Math.max(min, Math.min(n, Math.ceil(n * ratio)))
  const ranked = list
    .map((r, index) => ({
      id: r.id,
      ok: r.ok ? 1 : 0,
      score: Number.isFinite(Number(r.score)) ? Number(r.score) : 0,
      index,
    }))
    .sort((a, b) => b.ok - a.ok || b.score - a.score || a.index - b.index)
  const survivors = ranked.slice(0, keep).map((r) => r.id)
  const dropped = ranked.slice(keep).map((r) => r.id)
  return { survivors, dropped, keep }
}

/**
 * The schedule a round intends to run, priced.
 *
 * `pickSurvivors` answers "which candidates continue"; it cannot answer "where
 * did the dropped candidates' budget go", because today it goes nowhere. This
 * function makes that explicit rather than leaving it implied: each rung keeps a
 * count, drops the rest, costs its share of the ceiling, and reports what it
 * freed. `returnedUsd` stays 0 until a round actually hands the freed shares back
 * to its survivors, and `kind` names what is really happening:
 *
 *   - `'none'`      nothing to schedule (one candidate, or no budget to split)
 *   - `'prefilter'` candidates are dropped and their budget is *not* reused —
 *                   what our round does today, and not successive halving
 *   - `'halving'`   the freed shares are reallocated to the survivors
 *
 * Naming it matters: the 21% figure in docs/l2-state.md is a comparison inside
 * one tight bucket, and calling a prefilter "successive halving" is how that
 * number came to look like a verdict on the schedule rather than on a prefilter.
 *
 * @param {{candidates?:number, eta?:number, maxUsd?:number, keepRatio?:number|null}} opts
 * @returns {{candidates:number, eta:number, maxUsd:number, rungs:Array<{keep:number, drop:number, costUsd:number, freedUsd:number}>, returnedUsd:number, kind:string}}
 */
export function halvingPlan({ candidates = 1, eta = 2, maxUsd = 0, keepRatio = null } = {}) {
  const n = Math.max(1, Math.floor(Number(candidates) || 1))
  const step = Math.max(2, Math.floor(Number(eta) || 2))
  const ceiling = Number.isFinite(Number(maxUsd)) && Number(maxUsd) > 0 ? Number(maxUsd) : 0
  const ratio =
    keepRatio !== null && Number.isFinite(Number(keepRatio)) && Number(keepRatio) > 0
      ? Math.min(1, Number(keepRatio))
      : null

  // Shares are the ceiling split evenly over the candidates of the first rung.
  // A candidate dropped at rung k frees exactly its own share, which is why the
  // freed amount is proportional to how many were dropped.
  const share = n > 0 ? ceiling / n : 0
  // The ladder names every stage a candidate can be in, including the last one
  // (keep 1, where the ordinary gate decides). `drop` is how many were lost on
  // the way *into* that stage, so a rung can be read without its predecessor.
  const keeps = [n]
  let keep = n
  while (keep > 1) {
    const computed = ratio !== null ? Math.ceil(keep * ratio) : Math.ceil(keep / step)
    const next = Math.max(1, Math.min(keep - 1, computed))
    keeps.push(next)
    keep = next
  }
  const rungs = keeps.map((kept, index) => {
    const drop = index === 0 ? 0 : keeps[index - 1] - kept
    return {
      keep: kept,
      drop,
      costUsd: Number((kept * share).toFixed(6)),
      freedUsd: Number((drop * share).toFixed(6)),
    }
  })

  const returnedUsd = 0
  // A schedule exists only when something can be dropped and something can be
  // spent. Everything else is `none`, which is the honest answer for one
  // candidate or a campaign with no budget.
  const kind = n > 1 && ceiling > 0 ? 'prefilter' : 'none'
  return { candidates: n, eta: step, maxUsd: ceiling, rungs, returnedUsd, kind }
}

/**
 * Does the cheap stage still rank candidates the way the expensive one would?
 *
 * `task.screen` and `task.verify` are different commands, and nothing in the
 * system guarantees the first orders candidates like the second. Successive
 * halving assumes exactly that (fidelity must be monotone, 2107.05847 §4.2.4),
 * and when the assumption fails the cheap stage is not a discount — it is a
 * cheaper wrong answer that also spends a model call.
 *
 * So this check can veto: given recent rounds that carried a screening stage, if
 * the candidate the screen kept was never the one the verifier promoted, halving
 * turns off and says why. Rounds that promoted nothing are not evidence either
 * way and are not counted; a record shorter than the window is not a pattern.
 *
 * @param {Array<{n:number, screened?:string[], kept?:string[], promoted?:string|null}>} rounds
 * @param {{window?:number, minAgreement?:number}} opts
 * @returns {{halving:boolean, considered:number, agreement:number|null, reason:string}}
 */
export function fidelityCheck(rounds, { window = 5, minAgreement = 0.6 } = {}) {
  const list = Array.isArray(rounds) ? rounds.filter((r) => r && typeof r === 'object') : []
  const size = Math.max(1, Math.floor(Number(window) || 5))
  const bar = Number.isFinite(Number(minAgreement)) ? Math.min(1, Math.max(0, Number(minAgreement))) : 0.6
  // A round records the promotion twice: as a boolean (`promoted`, what the
  // round did) and as the candidate id (`promotedId`, which candidate won). The
  // id is what the screen can be compared against; a round that only knows it
  // promoted "something" cannot say whether the screen kept that something, so
  // it is not evidence and is not counted.
  const promotedOf = (r) => (typeof r?.promotedId === 'string' && r.promotedId ? r.promotedId : typeof r?.promoted === 'string' && r.promoted ? r.promoted : null)
  const considered = list.filter((r) => promotedOf(r) && Array.isArray(r.screened) && r.screened.length > 1)
  const recent = considered.slice(-size)
  if (recent.length < size) {
    return {
      halving: true,
      considered: recent.length,
      agreement: null,
      reason: `not enough screening rounds to judge the proxy (${recent.length} of ${size})`,
    }
  }
  const agree = recent.filter((r) => Array.isArray(r.kept) && r.kept.includes(promotedOf(r))).length
  const agreement = agree / recent.length
  if (agreement < bar) {
    return {
      halving: false,
      considered: recent.length,
      agreement,
      reason: `the screen kept the promoted candidate in only ${agree} of ${recent.length} rounds; the cheap stage does not rank like the verifier, so it is not a discount`,
    }
  }
  return {
    halving: true,
    considered: recent.length,
    agreement,
    reason: `the screen kept the promoted candidate in ${agree} of ${recent.length} rounds`,
  }
}
