// Matched-budget comparison of two loop policies.
//
// The loop has been comparing policies badly for its whole life. Every earlier
// comparison held the *round* fixed, i.e. it decided round 3 under policy A and
// round 7 under policy B, and the rounds are not exchangeable: a task is easier
// before anyone has solved it, and the selector prefers unsolved tasks. That is
// why the recorded effect sizes kept landing on "no difference" even where the
// two arms disagreed on a third of the rounds -- the comparison was measuring
// round difficulty, not the policy.
//
// The pair is the unit here, so the comparison is paired: the same round, the
// same attempts, the same scores, decided twice. Nothing about the candidates can
// differ between the arms, which is the strongest form of budget matching there
// is -- there is no second budget at all.
//
// Everything this module reports is deliberately unresolved about "no effect":
// with n pairs it can only detect a difference of `mde` points, and a result
// smaller than that is reported as "cannot distinguish", never as "no effect".

/** Two-sided normal quantile for a confidence level. Fixed table: no dependency. */
const Z = { 0.9: 1.6449, 0.95: 1.9600, 0.98: 2.3263, 0.99: 2.5758 }

function zFor(alpha) {
  const key = Number((1 - alpha).toFixed(2))
  return Z[key] ?? 1.96
}

/** Power -> one-sided quantile, i.e. the multiplier for beta. */
const POWER_Z = { 0.5: 0, 0.8: 0.8416, 0.9: 1.2816, 0.95: 1.6449 }

function powerZ(power) {
  const key = Number(power.toFixed(2))
  return POWER_Z[key] ?? 0.8416
}

function pct(n) {
  return `${(n * 100).toFixed(1)} points`
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * Chosen over the normal approximation because the promotion rates here live
 * near 0.25 with n in the tens: the normal interval runs below zero and reports
 * a lower bound that cannot exist, which reads as more certainty than the data.
 *
 * @param {number} k successes
 * @param {number} n trials
 * @param {number} [alpha]
 * @returns {{low:number, high:number, p:number}}
 */
export function wilsonInterval(k, n, alpha = 0.05) {
  if (!Number.isFinite(n) || n <= 0) return { low: 0, high: 1, p: 0 }
  const p = k / n
  const z = zFor(alpha)
  const z2 = z * z
  const denom = 1 + z2 / n
  const centre = (p + z2 / (2 * n)) / denom
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half), p }
}

/** Exact two-sided McNemar p-value for `b` discordant pairs one way, `c` the other. */
export function mcnemarExact({ onlyA = 0, onlyB = 0 } = {}) {
  const n = onlyA + onlyB
  if (n === 0) return 1
  const k = Math.min(onlyA, onlyB)
  // P(X <= k) for X ~ Bin(n, 0.5), doubled and capped at 1.
  let tail = 0
  let choose = 1
  for (let i = 0; i <= k; i += 1) {
    if (i > 0) choose = (choose * (n - i + 1)) / i
    tail += choose
  }
  const p = (tail / 2 ** n) * 2
  return Math.min(1, p)
}

/**
 * The smallest difference in promotion rate this design could have detected.
 *
 * Paired design: the test's power comes from the discordant pairs, so what makes
 * a comparison sharp is not n but how often the two arms disagree. Returns a
 * proportion (0.125 = 12.5 percentage points).
 *
 * @param {{n:number, discordance?:number, alpha?:number, power?:number}} input
 * @returns {number}
 */
export function mdePaired({ n, discordance = 0.25, alpha = 0.05, power = 0.8 } = {}) {
  if (!Number.isFinite(n) || n <= 0) return 1
  const z = zFor(alpha) + powerZ(power)
  return Math.min(1, z * Math.sqrt(discordance / n))
}

/**
 * The smallest difference two independent arms could detect.
 *
 * Kept because the loop also runs independent arms -- two campaigns, one policy
 * each -- and that design is much weaker for the same money: it pays for the
 * between-round variance instead of differencing it out.
 *
 * @param {{n:number, p?:number, alpha?:number, power?:number}} input
 * @returns {number}
 */
export function mdeIndependent({ n, p = 0.5, alpha = 0.05, power = 0.8 } = {}) {
  if (!Number.isFinite(n) || n <= 0) return 1
  const z = zFor(alpha) + powerZ(power)
  return Math.min(1, z * Math.sqrt((2 * p * (1 - p)) / n))
}

/**
 * Compare two policies on the same rounds.
 *
 * @param {object} input
 * @param {Array<object>} input.rounds one entry per round, in any order
 * @param {(round: object) => boolean} input.decideA would policy A promote this round?
 * @param {(round: object) => boolean} input.decideB would policy B promote this round?
 * @param {number} [input.alpha]
 * @returns {{n:number, both:number, onlyA:number, onlyB:number, neither:number,
 *            rateA:number, rateB:number, delta:number, mde:number,
 *            interval:{low:number, high:number}, p:number,
 *            verdict:'a-better'|'b-better'|'cannot-distinguish', sentence:string}}
 */
export function comparePolicies({ rounds, decideA, decideB, alpha = 0.05 } = {}) {
  const list = Array.isArray(rounds) ? rounds : []
  let both = 0
  let onlyA = 0
  let onlyB = 0
  let neither = 0
  for (const round of list) {
    const a = Boolean(decideA(round))
    const b = Boolean(decideB(round))
    if (a && b) both += 1
    else if (a) onlyA += 1
    else if (b) onlyB += 1
    else neither += 1
  }
  const n = list.length
  const rateA = n ? (both + onlyA) / n : 0
  const rateB = n ? (both + onlyB) / n : 0
  const delta = rateA - rateB
  const discordance = n ? (onlyA + onlyB) / n : 0
  // With zero discordant pairs the paired formula returns an MDE of zero, which
  // reads as "infinitely sensitive" -- the exact opposite of the truth: the arms
  // never disagreed, so the comparison carries no information about which is
  // better. Report the planning figure at the worst-case discordance instead and
  // let the verdict stay unresolved.
  const agreed = onlyA + onlyB === 0
  const mde = mdePaired({ n, discordance: agreed ? 0.5 : discordance, alpha })
  const p = mcnemarExact({ onlyA, onlyB })
  // The interval is on the difference of two paired proportions: the discordant
  // pairs carry the uncertainty, the concordant ones cancel.
  const se = n ? Math.sqrt((onlyA + onlyB - (delta * n) ** 2 / n) / (n * n)) : 0
  const z = zFor(alpha)
  const interval = { low: Math.max(-1, delta - z * se), high: Math.min(1, delta + z * se) }

  let verdict = 'cannot-distinguish'
  if (n === 0 || agreed) verdict = 'cannot-distinguish'
  else if (Math.abs(delta) >= mde && p < alpha) verdict = delta > 0 ? 'a-better' : 'b-better'

  const sentence =
    n > 0 && agreed
      ? `the two policies agreed on all ${n} rounds: on this corpus they decide identically, so no effect size can be estimated (a comparison that never disagrees cannot rank). This is a statement about the two policies being the same function here, not evidence they are equally good.`
      : verdict === 'cannot-distinguish'
      ? `${n} paired rounds with ${(discordance * 100).toFixed(1)}% discordant: this sample cannot distinguish a difference below ${pct(mde)} in promotion rate (measured ${pct(delta)}, p=${p.toFixed(3)}). Not "no effect".`
      : `${verdict === 'a-better' ? 'A' : 'B'} promotes ${pct(Math.abs(delta))} more often over ${n} paired rounds (${onlyA} vs ${onlyB} discordant, p=${p.toFixed(3)}, detactable floor ${pct(mde)}).`

  return { n, both, onlyA, onlyB, neither, rateA, rateB, delta, mde, interval, p, verdict, sentence, agreed }
}
