/**
 * What a budget cap buys.
 *
 * A cap (`capUsd`) and a round budget (`rounds`) are only comparable through a
 * price per round. That price has two sources: a guess from the config
 * (`usdPerRound`) and what the loop actually measured (`measured`). The
 * measurement wins whenever both are present, because the config value is a
 * stand-in written before the loop had a measurement.
 *
 * When there is no price at all, there is no verdict: `funded` is `null`, never
 * `false` and never `0`. Both of those read as "measured and cannot afford even
 * one round", which is the opposite fact. An unmeasured price is a question that
 * could not be answered, not an answer of "no".
 */

import { estimatedRoundCost } from '../runtime/triangle.js'

/** A usable per-round price is a finite number strictly above zero. */
function priceOf(x) {
  const n = Number(x)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Resolve a cap against a round count.
 *
 * @param {object} input
 * @param {number} [input.rounds]      rounds the campaign plans to run
 * @param {number} [input.usdPerRound] configured guess for the price of one round
 * @param {number} [input.measured]    price actually measured; wins over the guess
 * @param {number} [input.capUsd]      money available
 * @returns {{funded: boolean|null, affordableRounds: number|null,
 *            shortfallUsd: number|null, usdPerRound: number|null}}
 */
export function fundingFor({ rounds, usdPerRound, measured, capUsd } = {}) {
  const price = priceOf(measured) ?? priceOf(usdPerRound)
  const planned = Number(rounds)
  const cap = Number(capUsd)
  const havePlan = Number.isFinite(planned) && planned >= 0
  const haveCap = Number.isFinite(cap)

  // Without a price the question cannot be answered, so every derived number
  // stays null rather than collapsing to zero.
  if (price == null || !haveCap) {
    return { funded: null, affordableRounds: null, shortfallUsd: null, usdPerRound: price }
  }

  // The epsilon keeps a division that is mathematically an integer but lands a
  // hair below it (0.1 * 7 cases) from dropping a whole affordable round.
  const affordableRounds = Math.floor(cap / price + 1e-9)
  const fullCost = havePlan ? planned * price : null
  const shortfallUsd = fullCost == null ? null : Math.max(0, fullCost - cap)
  const funded = havePlan ? affordableRounds >= planned : null

  return { funded, affordableRounds, shortfallUsd, usdPerRound: price }
}


/**
 * The budget as it should be read now, not as it was guessed at creation.
 *
 * `runtime.create` can only price a round from the config guess, so the stored
 * `funding` object is a promise made before any round ran. Once the ledger has
 * measured rounds, that guess is superseded: the honest answer to "how many
 * rounds does this cap buy" is the cap over what rounds actually cost. Reading
 * the stored verdict forever is how a campaign spending $0.005 a round showed
 * "affordableRounds: 2" and a $2.72 shortfall.
 *
 * @param {object} state campaign state carrying `budget` and `rounds`
 * @returns {object} budget with a recomputed `funding` and `usdPerRound`
 */
export function refreshFunding(state) {
  const budget = state && typeof state.budget === 'object' && state.budget ? state.budget : {}
  const measured = estimatedRoundCost(state?.rounds ?? [])
  const price = Number.isFinite(measured) && measured > 0 ? measured : budget.usdPerRound
  return {
    ...budget,
    usdPerRound: price ?? budget.usdPerRound ?? null,
    funding: fundingFor({
      rounds: budget.rounds,
      usdPerRound: budget.usdPerRound,
      measured,
      capUsd: budget.usd,
    }),
  }
}
