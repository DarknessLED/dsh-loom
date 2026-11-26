// The read/do balance is a rule today: lose, read; win without reading, stop
// reading. A rule is not a measurement, and the loop has been quoting the rule's
// own output as if it were evidence ("reading rounds promote less often"), which
// cannot be evidence because `auto` turns reading off *after* a win: the arms are
// selected on the outcome.
//
// What is missing is the one design that can answer it -- assign the arm by lot
// before the round runs, then compare the two arms on what actually happened.
// That costs money (some rounds read when they did not need to) which is exactly
// why it has to be an opt-in mode and not a default.
//
// Two properties matter more than the statistics:
//
// 1. The assignment must be re-derivable from the ledger alone. If it lived in
//    memory, a restart would silently re-randomise and no comparison could ever
//    be reproduced.
// 2. "Cannot distinguish" is a real answer and must never be printed as "no
//    effect". With a hundred rounds this design can resolve roughly ten
//    percentage points of promotion rate; anything smaller is a shrug.

import { mdeIndependent, wilsonInterval } from './ab.js'

/** A two-sided normal quantile, matching the table in `ab.js`. */
const Z = { 0.9: 1.6449, 0.95: 1.96, 0.98: 2.3263, 0.99: 2.5758 }
const POWER_Z = { 0.5: 0, 0.8: 0.8416, 0.9: 1.2816, 0.95: 1.6449 }
const zFor = (alpha) => Z[Number((1 - alpha).toFixed(2))] ?? 1.96
const powerZ = (power) => POWER_Z[Number(Number(power).toFixed(2))] ?? 0.8416
const round6 = (v) => (Number.isFinite(v) ? Number(v.toFixed(6)) : null)

/** A small integer hash, stable across processes and platforms. */
function hash32(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Which arm a round runs in. Deterministic in (seed, campaign, round) so the
 * same ledger always yields the same assignment.
 *
 * @param {{seed?: string|number, campaign?: string, round: number}} input
 * @returns {'full'|'off'}
 */
export function assignArm({ seed = 'research-trial', campaign = '', round = 0 } = {}) {
  const n = Number(round)
  if (!Number.isFinite(n)) return 'full'
  return hash32(`${seed}|${campaign}|${n}`) % 2 === 0 ? 'full' : 'off'
}

/** Rounds that were assigned an arm and answered the question (not interrupted). */
function usable(rounds) {
  const list = Array.isArray(rounds) ? rounds : []
  return list.filter((r) => {
    const arm = r?.researchTrial?.arm ?? r?.research?.arm
    if (arm !== 'full' && arm !== 'off') return false
    if (r?.status === 'interrupted') return false
    return typeof r?.promoted === 'boolean'
  })
}

/**
 * Compare two independent arms on a continuous endpoint.
 *
 * Counting promotions throws away almost everything: a 0/1 outcome needs
 * hundreds of rounds to resolve ten points. Where the verifier printed a rate,
 * every round carries a number, and the mean difference is far more informative
 * for the same money -- the same argument `compareMeans` makes for the graded
 * corpus.
 *
 * A score that came from `scoreSource: 'binary'` is excluded on purpose: it *is*
 * a 0/1 verdict wearing a number, and averaging it invents precision the
 * verifier never printed.
 */
function compareArmScores({ full, off, alpha }) {
  const clean = (list) =>
    list.filter((r) => Number.isFinite(r?.score) && r?.scoreSource !== 'binary').map((r) => Number(r.score))
  const a = clean(full)
  const b = clean(off)
  // Two per arm is the floor for a variance estimate; one observation per arm
  // would give a zero-width interval that reads as certainty.
  if (a.length < 2 || b.length < 2) return null
  const mean = (xs) => xs.reduce((t, x) => t + x, 0) / xs.length
  const sd = (xs) => {
    const m = mean(xs)
    return Math.sqrt(xs.reduce((t, x) => t + (x - m) ** 2, 0) / (xs.length - 1))
  }
  const meanA = mean(a)
  const meanB = mean(b)
  const delta = meanA - meanB
  const se = Math.sqrt(sd(a) ** 2 / a.length + sd(b) ** 2 / b.length)
  const z = zFor(alpha)
  const arms = {
    full: { n: a.length, mean: round6(meanA), sd: round6(sd(a)) },
    off: { n: b.length, mean: round6(meanB), sd: round6(sd(b)) },
  }
  const basis = 'mean score'
  // Zero spread: every round in an arm landed on the same number, or every task
  // moved by the same amount. A zero standard error would put a zero-width
  // interval around the difference and a zero floor under the MDE, which reads
  // as infinite sensitivity -- `compareMeans` refuses the same lie.
  if (!(se > 1e-12)) {
    const moved = Math.abs(delta) > 1e-12
    return {
      basis,
      arms,
      delta: round6(delta),
      interval: { low: round6(delta), high: round6(delta) },
      mde: round6(Math.abs(delta)),
      verdict: moved ? (delta > 0 ? 'full-better' : 'off-better') : 'cannot-distinguish',
      sentence: moved
        ? `all rounds in each arm landed on the same score: the sign is consistent, but with no spread there is no interval to report and the floor is the effect itself.`
        : `every round in both arms scored the same: the endpoint did not move, so there is no effect size to estimate. This is a statement about the endpoint, not evidence the arms are equal.`,
    }
  }
  const mde = (z + powerZ(0.8)) * se
  const interval = { low: round6(delta - z * se), high: round6(delta + z * se) }
  let verdict = 'cannot-distinguish'
  if (Math.abs(delta) >= mde && interval.low > 0) verdict = 'full-better'
  else if (Math.abs(delta) >= mde && interval.high < 0) verdict = 'off-better'
  const points = (v) => `${(v * 100).toFixed(1)} points`
  const sentence = verdict === 'cannot-distinguish'
    ? `the mean score moved ${points(delta)} (${points(meanA)} against ${points(meanB)} over ${a.length} and ${b.length} rounds); this sample could resolve ${points(mde)}, so the difference is below what it can see. Not "no effect".`
    : `reading scored ${points(Math.abs(delta))} ${verdict === 'full-better' ? 'higher' : 'lower'} on average (${points(meanA)} against ${points(meanB)}); the interval excludes zero and the gap is above the ${points(mde)} floor.`
  return { basis, arms, delta: round6(delta), interval, mde: round6(mde), verdict, sentence }
}

/**
 * Compare the two arms of a randomised read/do trial.
 *
 * @param {{rounds?: Array<object>, alpha?: number}} input
 * @returns {{n:number, arms:{full:object, off:object}, delta:number, mde:number,
 *            verdict:'full-better'|'off-better'|'cannot-distinguish', sentence:string}}
 */
export function compareResearchArms({ rounds = [], alpha = 0.05 } = {}) {
  const list = usable(rounds)
  const arm = (name) => {
    const mine = list.filter((r) => (r.researchTrial?.arm ?? r.research?.arm) === name)
    const promoted = mine.filter((r) => r.promoted === true).length
    const usd = mine.reduce((sum, r) => sum + (Number(r.costUsd) || 0), 0)
    const { low, high } = wilsonInterval(promoted, mine.length, alpha)
    return {
      n: mine.length,
      promoted,
      rate: mine.length ? promoted / mine.length : 0,
      interval: { low, high },
      usdTotal: usd,
      usdPerRound: mine.length ? usd / mine.length : null,
    }
  }
  const full = arm('full')
  const off = arm('off')
  const n = full.n + off.n
  const delta = full.rate - off.rate
  // The floor is earned by the arms, not by the campaign. `mdeIndependent` is
  // written for two arms of equal size n (its `2 p (1-p) / n` is the variance of
  // a difference between two proportions of size n), so handing it the total
  // count doubles the sample it thinks it has and reports a floor sqrt(2) too
  // small. The harmonic mean of the arm sizes reproduces
  // `p(1-p)(1/n1 + 1/n2)` exactly and degrades gracefully when the arms are
  // lopsided -- which is the common case, since the arm is decided by lot.
  const effective = full.n > 0 && off.n > 0 ? 2 / (1 / full.n + 1 / off.n) : 0
  const mde = mdeIndependent({ n: effective, p: 0.5, alpha })
  // Both arms must have a little data before a direction is worth naming: one
  // round in an arm produces a rate of 0 or 1 and an interval a mile wide.
  const ready = full.n >= 3 && off.n >= 3
  let verdict = 'cannot-distinguish'
  if (ready && Math.abs(delta) >= mde && full.interval.low > off.interval.high) verdict = 'full-better'
  else if (ready && Math.abs(delta) >= mde && off.interval.low > full.interval.high) verdict = 'off-better'
  // The count is the coarse reading; where the verifier printed a rate, the mean
  // score can see a difference the count cannot afford to. Report the finer one
  // when it is decided, and say which reading is being reported.
  const score = compareArmScores({
    full: list.filter((r) => (r.researchTrial?.arm ?? r.research?.arm) === 'full'),
    off: list.filter((r) => (r.researchTrial?.arm ?? r.research?.arm) === 'off'),
    alpha,
  })
  if (score && score.verdict !== 'cannot-distinguish') verdict = score.verdict
  const pct = (v) => `${(v * 100).toFixed(1)} points`
  const sentence = n === 0
    ? 'no round has been assigned an arm yet: the trial has not started'
    : !ready
      ? `${n} assigned rounds (${full.n} reading, ${off.n} not): too few in an arm to read a direction yet`
      : verdict === 'cannot-distinguish'
        ? `${n} assigned rounds: reading promoted ${pct(full.rate)} and not reading ${pct(off.rate)} (delta ${pct(delta)}); this design could resolve ${pct(mde)}, so the difference is below what ${n} rounds can see. Not "no effect".`
        : `${verdict === 'full-better' ? 'reading' : 'not reading'} promoted ${pct(Math.abs(delta))} more often over ${n} assigned rounds (${full.promoted}/${full.n} against ${off.promoted}/${off.n}); the arms' intervals do not overlap and the gap is above the ${pct(mde)} floor.`
  // When both readings exist, the sentence says which one it is quoting: two
  // numbers answering different questions must not be printed as one voice.
  const spoken = score && score.verdict !== 'cannot-distinguish' ? score.sentence : sentence
  return { n, arms: { full, off }, delta, mde, verdict, sentence: spoken, ready, score }
}
