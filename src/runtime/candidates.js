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
