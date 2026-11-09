/**
 * How long the planner gets, learned from the planner's own record.
 *
 * The planner is the loop's most expensive habit: a fixed deadline that it hits
 * almost every round turns into a ~40% tax on the round that bought nothing (see
 * research/plan-verdict-2026-11.md §5). Proving the planner *useful* needs an
 * interleaved A/B nobody has run; not overpaying for a planner that keeps
 * returning empty is a decision the record already supports.
 *
 * Pure: rounds in, a number out.
 */

const DEFAULT_CEILING = 240_000
const DEFAULT_FLOOR = 60_000
const DEFAULT_WINDOW = 3

function finite(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @param {Array<object>} rounds folded rounds carrying `planMs`/`planTimedOut`
 * @param {{ceiling?: number, floor?: number, window?: number}} [opts]
 * @returns {number} milliseconds the next planner run may take
 */
export function planBudgetMs(rounds, opts = {}) {
  const rawCeiling = finite(opts?.ceiling, DEFAULT_CEILING)
  const rawFloor = finite(opts?.floor, DEFAULT_FLOOR)
  // A floor above the ceiling is a caller mistake; clamp instead of returning a
  // budget no deadline logic can honour.
  const ceiling = Math.max(1, Math.max(rawCeiling, rawFloor))
  const floor = Math.min(ceiling, Math.max(1, rawFloor))
  const window = Math.max(1, Math.floor(finite(opts?.window, DEFAULT_WINDOW)))

  const list = Array.isArray(rounds) ? rounds : []
  const measured = []
  for (const r of list) {
    if (!r || typeof r !== 'object') continue
    const planMs = Number(r.planMs)
    if (!Number.isFinite(planMs)) continue
    measured.push({ timedOut: r.planTimedOut === true })
  }
  if (measured.length === 0) return ceiling

  const tail = measured.slice(-window * 8)
  let budget = ceiling
  let streak = 0
  for (const r of tail) {
    if (r.timedOut) {
      streak += 1
      if (streak % window === 0) budget = Math.max(floor, budget / 2)
    } else {
      // The planner finished inside its deadline: it earned the whole budget back.
      budget = ceiling
      streak = 0
    }
  }
  return Math.min(ceiling, Math.max(floor, Math.round(budget)))
}
