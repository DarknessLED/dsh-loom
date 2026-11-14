/**
 * L2 — buying the second candidate, priced.
 *
 * A round that always samples two candidates pays the second one whether or not
 * it could have helped. The question is an expected-value one, and the loop
 * already has both inputs: how often a candidate solves this task (`pSolve`) and
 * how much of the round budget the second attempt would eat at the tail
 * (`tailMs` against `budgetLeftMs`).
 *
 * The formula is deliberately not the naive `pSolve * gain`: the hedge only
 * matters in the world where the *first* candidate failed, so the expected
 * recovery is `(1 - pSolve) * gainIfSolved`, and the value that reaches the
 * gate is `(1 - pSolve) * pSolve * gainIfSolved` (the first candidate's win and
 * the second candidate's win are two independent draws from the same coin, and
 * the hedge pays only on the failure-then-success pair).
 *
 * Two constraints outrank the arithmetic:
 *
 * - `pSolve >= 1` means the task is already solved. There is nothing left to
 *   hedge, so the tail does not even get priced.
 * - The tail must fit in half of what is left of the budget. A hedge that
 *   cannot finish before the deadline is not insurance; it is a late round.
 *
 * The remaining refusals are honest about which gate said no: `negative-ev` is
 * the price losing to the expected recovery, `no-tail-room` is the clock, and
 * `expected-value` is the only reason that buys.
 *
 * Pure: no config, no disk, no host. Whether a round may act on this decision is
 * the caller's concern, so the same function can be unit-tested and replayed.
 */

/**
 * A measurable finite number, or `null`.
 *
 * Only numbers and non-empty numeric strings count. Booleans, arrays, `NaN` and
 * infinities are not measurements; treating them as 0 or 1 would let an
 * unreadable input buy a candidate it cannot justify.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
function measure(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Should this round pay for a second candidate?
 *
 * The checks run in a fixed order, because the reason must name the constraint
 * that actually stopped the purchase:
 *
 * 1. `solved` — `pSolve >= 1`, nothing can improve on a certain win.
 * 2. `no-tail-room` — `tailMs > budgetLeftMs / 2`, the hedge cannot finish.
 * 3. `negative-ev` — `(1 - pSolve) * gainIfSolved <= extraCostUsd`, the hedge
 *    costs at least as much as the recovery it is expected to buy.
 * 4. `expected-value` — all three gates passed, buy.
 *
 * Exactly break-even is a refusal: there is no measurable edge, only a price.
 * Unmeasurable inputs are refusals too, reported as `negative-ev` rather than an
 * exception, so one bad number cannot take a round down.
 *
 * @param {{
 *   pSolve?: number|string,
 *   gainIfSolved?: number|string,
 *   extraCostUsd?: number|string,
 *   tailMs?: number|string,
 *   budgetLeftMs?: number|string,
 * }} [input]
 *   `pSolve` the chance the first candidate solves the task, `gainIfSolved` the
 *   score improvement a solve is worth on the round's own scale, `extraCostUsd`
 *   what the second attempt costs in dollars, `tailMs` the wall time the second
 *   attempt adds after the first finishes, `budgetLeftMs` the round budget left.
 * @returns {{buy: boolean, reason: 'solved'|'no-tail-room'|'negative-ev'|'expected-value', expectedGain: number, note: string}}
 */
export function hedgeDecision(input = {}) {
  const args = input && typeof input === 'object' ? input : {}
  const rawP = measure(args.pSolve)
  const gain = measure(args.gainIfSolved)
  const cost = measure(args.extraCostUsd)
  const tail = measure(args.tailMs)
  const budget = measure(args.budgetLeftMs)

  // An input the loop cannot read is not permission to spend. This is the same
  // refusal a negative EV gets, because the alternative — guessing 0 — would
  // silently turn a broken measurement into either a purchase or a sure win.
  if (rawP === null || gain === null || cost === null || tail === null || budget === null) {
    return {
      buy: false,
      reason: 'negative-ev',
      expectedGain: 0,
      note: 'inputs are not all measurable numbers, so the hedge cannot be priced',
    }
  }

  // Probabilities live on [0, 1]. A caller that passed 1.2 said "certain", and a
  // negative probability is nonsense, so both clamp onto the nearest real coin.
  const pSolve = Math.min(1, Math.max(0, rawP))
  // The value of the hedge on its own scale: success on the second draw after
  // the first draw failed, i.e. the pair (fail, win) weighted by its chance.
  const expectedGain = (1 - pSolve) * pSolve * gain

  if (pSolve >= 1) {
    return {
      buy: false,
      reason: 'solved',
      expectedGain: 0,
      note: 'the first candidate already solves this task; a second try cannot improve on certainty',
    }
  }

  // The tail is what the second candidate costs *after* the first one finishes,
  // so a tail larger than half the remaining budget cannot land in this round.
  if (tail > budget / 2) {
    return {
      buy: false,
      reason: 'no-tail-room',
      expectedGain,
      note: `the tail needs ${tail}ms but only ${Math.max(0, budget / 2)}ms of the remaining budget is half`,
    }
  }

  // A negative cost is a discount the formula does not offer, so clamp it to 0;
  // a caller must not be able to make the hedge cheaper by naming a bad number.
  const price = Math.max(0, cost)
  const expectedRecovery = (1 - pSolve) * gain
  // Break-even is a refusal, and it must stay one in binary floating point:
  // (1 - 0.95) * 1 is 0.050000000000000044, which a raw `>` reads as a win over
  // a 0.05 price. The tolerance is relative so it does not depend on the scale of
  // the score, and `Math.max(1, ...)` keeps it meaningful for sub-cent sizes.
  const tolerance = 1e-9 * Math.max(1, Math.abs(expectedRecovery), Math.abs(price))
  if (!(expectedRecovery - price > tolerance)) {
    return {
      buy: false,
      reason: 'negative-ev',
      expectedGain,
      note: `expected recovery ${expectedRecovery} does not beat the ${price} the second attempt costs`,
    }
  }

  return {
    buy: true,
    reason: 'expected-value',
    expectedGain,
    note: `expected recovery ${expectedRecovery} beats the ${price} the second attempt costs and the tail fits`,
  }
}

/**
 * How many candidates the planner should buy, from the hedge's answer.
 *
 * `hedgeDecision` answers a yes/no question in dollars and score; the planner
 * needs a count. This adapter exists so the round asks one question in one
 * place instead of re-deriving the thresholds: one candidate whenever the hedge
 * refuses, `max` (default 2) whenever it buys.
 *
 * The refusal is folded onto the two constraints the planner can act on.
 * `no-tail-room` keeps its own reason because it names the clock; every other
 * refusal — a certain win, a negative expected value, or an input the loop
 * could not measure — reads as `negative-ev`, because in each case the second
 * candidate's expected recovery does not beat its price.
 *
 * `max` is a ceiling, not a suggestion: a campaign configured for one candidate
 * cannot have a second one bought back by the arithmetic. It defaults to 2 (the
 * historical count), and the result is never below 1.
 *
 * @param {{
 *   pSolve?: number|string,
 *   gainIfSolved?: number|string,
 *   extraCostUsd?: number|string,
 *   tailMs?: number|string,
 *   budgetLeftMs?: number|string,
 *   max?: number|string,
 * }} [input]
 *   Same price as `hedgeDecision`, plus `max` — the most candidates the round
 *   may plan (the campaign's configured count).
 * @returns {{count: number, reason: 'expected-value'|'negative-ev'|'no-tail-room'}}
 *   `count` is 1 when the hedge refuses, otherwise `max`; `reason` names the
 *   constraint that decided it.
 */
export function planCandidates(input = {}) {
  const args = input && typeof input === 'object' ? input : {}
  const rawMax = measure(args.max)
  // A ceiling the caller cannot name is the historical two, and a broken
  // ceiling must not silently mean "one": clamp into the range a round can use.
  const max = rawMax === null ? 2 : Math.max(1, Math.floor(rawMax))
  const decision = hedgeDecision(args)
  if (!decision.buy) {
    return {
      count: 1,
      reason: decision.reason === 'no-tail-room' ? 'no-tail-room' : 'negative-ev',
    }
  }
  return { count: max, reason: 'expected-value' }
}
