/**
 * Read a measurable number, or `null` when the value cannot name one.
 *
 * Only numbers and non-empty numeric strings are admitted. Booleans, arrays,
 * `NaN` and infinities are not measurements, so they read as unknown instead of
 * silently becoming 0 or 1.
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
 * Is a second candidate worth buying this round?
 *
 * Research: `research/balance-2026-11.md` §2 (and the P2 proposal) models the
 * second candidate as insurance. With `p` the chance the first candidate lands
 * and `W` the round's wall time, the hedge is worth its price only when the
 * expected recovery beats what the tail costs:
 *
 *     EV(second) = p·(1−p)·W − tailMs − marginMs
 *
 * The tail is what the second candidate costs at the tail: it does not shorten
 * the round, it delays the gate. `marginMs` is optional headroom for costs the
 * caller cannot name (tokens, verifier noise); it can only tighten the gate. The
 * literature's own point is counter-intuitive: the more confident the first
 * candidate is, the less a second opinion can buy, so `p = 0.9` with an expensive
 * tail is a loss even though the candidate "usually wins".
 *
 * Degenerate or unmeasurable inputs are refusals, not exceptions: a candidate
 * that never wins (`p = 0`) or a certain winner (`p = 1`) has nothing to hedge,
 * and a missing duration is not permission to spend. A negative margin is
 * clamped to 0 so a caller cannot lower the price of the hedge by mistake.
 *
 * @param {{p?: number|string, roundMs?: number|string, tailMs?: number|string, marginMs?: number|string}} [input]
 *   `p` the first candidate's measured success probability, `roundMs` the wall
 *   time one round buys, `tailMs` what the second candidate adds at the tail,
 *   `marginMs` optional extra cost (defaults to 0).
 * @returns {{admit: boolean, ev: number|null, reason: 'worth-hedging'|'tail-exceeds-ev'|'no-signal'}}
 */
export function admitSecondCandidate(input = {}) {
  const args = input && typeof input === 'object' ? input : {}
  const p = measure(args.p)
  const roundMs = measure(args.roundMs)
  const tailMs = measure(args.tailMs)
  // An absent margin is 0; a margin that was named but cannot be measured makes
  // the whole input unknown rather than quietly free.
  const namedMargin = args.marginMs === undefined || args.marginMs === null
  const marginMs = namedMargin ? 0 : measure(args.marginMs)

  const measurable =
    p !== null &&
    roundMs !== null &&
    tailMs !== null &&
    marginMs !== null &&
    // A probability outside (0, 1) is not a coin with an uncertain side: 0 and 1
    // are certainties, and a negative probability is nonsense.
    p > 0 &&
    p < 1 &&
    roundMs >= 0 &&
    tailMs >= 0

  if (!measurable) return { admit: false, ev: null, reason: 'no-signal' }

  // A margin only ever makes the gate stricter: a caller that passed a negative
  // margin asked for a discount the formula does not offer.
  const ev = p * (1 - p) * roundMs - tailMs - Math.max(0, marginMs)
  if (ev > 0) return { admit: true, ev, reason: 'worth-hedging' }
  // Exactly break-even is not a reason to spend: there is no measurable edge,
  // only a price. Negative EV is the tail outrunning the hedge's expected gain.
  if (ev < 0) return { admit: false, ev, reason: 'tail-exceeds-ev' }
  return { admit: false, ev, reason: 'no-signal' }
}

/**
 * How many candidates the next round should buy.
 *
 * Sampling two candidates is insurance: it pays when the second opinion can
 * beat the first, and costs a whole extra attempt when it cannot. A campaign
 * that has just run several rounds in which *every* sampled candidate scored
 * 1.0 has already told us the insurance never pays out — a second candidate
 * cannot beat a perfect score, so the round may as well run one candidate and
 * only spend the next one if the first comes back short (cascade).
 *
 * The inference is deliberately narrow. It only looks at the last `minRounds`
 * *measured* rounds, and it only concludes anything when each of those rounds
 * sampled at least two candidates and every one of those attempts scored
 * exactly 1. Anything else — a short history, a round with a single candidate,
 * an attempt that was never scored, a second candidate that scored worse or
 * equal-but-not-perfect — is evidence that a second opinion still carries
 * information, so the answer stays `parallel`.
 *
 * This function is pure and reads no config: whether the inference is allowed
 * to steer a round is decided by the caller (`config.loopPolicy.autoCandidateMode`),
 * and an explicit `candidateMode` always outranks it.
 *
 * @param {Array<{attempts?: Array<{score?: number}>}>} rounds campaign history, oldest first
 * @param {{minRounds?: number}} [options] how many recent measured rounds to require
 * @returns {'cascade'|'parallel'} the mode the next round should use
 */
export function adaptiveCandidateMode(rounds, { minRounds = 2 } = {}) {
  const history = Array.isArray(rounds) ? rounds : []
  // A non-positive or non-numeric window would make the inference read no
  // history at all and then conclude from it; refuse instead and fall back to 1.
  const need = Math.max(1, Math.floor(Number(minRounds) || 2))
  const window = history.slice(-need)
  // Too little history to be a pattern. Absence of evidence is not evidence
  // that sampling is wasted.
  if (window.length < need) return 'parallel'
  for (const round of window) {
    const attempts = Array.isArray(round?.attempts) ? round.attempts : []
    // A round that never measured a second candidate says nothing about one.
    if (attempts.length < 2) return 'parallel'
    // Every attempt the round recorded must be scored, and every score must be
    // perfect. An unscored candidate leaves the question open.
    for (const attempt of attempts) {
      const score = typeof attempt?.score === 'number' ? attempt.score : NaN
      if (score !== 1) return 'parallel'
    }
  }
  return 'cascade'
}
