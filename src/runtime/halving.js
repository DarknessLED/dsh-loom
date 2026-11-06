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
