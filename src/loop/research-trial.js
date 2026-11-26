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

/** The difference a reader is assumed to care about, in score points. */
export const NEEDED_TARGET = 0.1

/**
 * How many rounds per arm would answer the question being asked.
 *
 * "Cannot distinguish" is true and useless on its own: a reader cannot tell
 * whether the trial needs one more round or four hundred. Ten rounds of
 * `trial-agg` reported a floor of 90.4 points, which is the same statement as
 * "a ten-point difference would need hundreds more rounds" -- but the reader had
 * to do that arithmetic themselves, and the trial never printed the second half.
 *
 * The formula is the one the floor is already built from, solved for n:
 * two independent arms, 80% power, two-sided 95%, so
 * `n per arm = 2 (z + z_beta)^2 sd^2 / target^2`. Every assumption is one a
 * reader can reject by name instead of rejecting a bare number.
 *
 * @returns {number|null} rounds per arm, or null when nothing was observed
 */
export function roundsNeeded({ sd = 0, perArm = 0, target = NEEDED_TARGET, alpha = 0.05 } = {}) {
  const spread = Number(sd)
  const want = Math.abs(Number(target))
  const observed = Number(perArm)
  if (!Number.isFinite(spread) || !(spread > 0)) return null
  if (!Number.isFinite(want) || !(want > 0)) return null
  if (!Number.isFinite(observed) || observed < 0) return null
  const z = zFor(alpha)
  const n = (2 * (z + powerZ(0.8)) ** 2 * spread ** 2) / want ** 2
  return Math.ceil(n)
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
export function compareArmScores({ full, off, alpha }) {
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
      // No spread is not a sample-size question: a saturated endpoint will stay
      // saturated no matter how many rounds are bought, so `needed` is null
      // rather than a big number that would invite running more of the same.
      needed: null,
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
  // The spread is the pooled per-round one reported in `arms`, which is what the
  // floor already assumes; asking for a ten-point answer at *this* spread is the
  // question a reader has, not "how many rounds would resolve the effect I saw".
  const spread = Math.sqrt((sd(a) ** 2 + sd(b) ** 2) / 2)
  const perArm = roundsNeeded({ sd: spread, perArm: Math.min(a.length, b.length), target: NEEDED_TARGET, alpha })
  const needed = perArm == null ? null : { target: NEEDED_TARGET, perArm, observe: a.length + b.length }
  const sentence = verdict === 'cannot-distinguish'
    ? `the mean score moved ${points(delta)} (${points(meanA)} against ${points(meanB)} over ${a.length} and ${b.length} rounds); this sample could resolve ${points(mde)}, so the difference is below what it can see. At this spread, telling ${points(NEEDED_TARGET)} apart would take about ${needed?.perArm ?? '?'} rounds per arm. Not "no effect".`
    : `reading scored ${points(Math.abs(delta))} ${verdict === 'full-better' ? 'higher' : 'lower'} on average (${points(meanA)} against ${points(meanB)}); the interval excludes zero and the gap is above the ${points(mde)} floor.`
  return { basis, arms, delta: round6(delta), interval, mde: round6(mde), verdict, sentence, needed }
}

/**
 * Compare two independent arms on what a round costs.
 *
 * Outcome is not the only half of the balance. Measured 2026-11-26 on
 * `trial-agg`, the hardest endpoint in this series: 10 rounds, 6 reading and 4
 * not, every one promoted at score 1.0000. Both outcome readings were blind --
 * the count because both arms were 100%, the mean score because both arms had
 * zero spread -- and the trial's own sentence said so: "the endpoint did not
 * move". Money did move: $0.0106 a round reading against $0.0100 not, over the
 * same ten rounds.
 *
 * "Bought nothing visible at six tenths of a cent a round" is a claim a person
 * can act on, and it stays measurable when the endpoint saturates. So this
 * reads the same two arms on `costUsd` with the same discipline as the score
 * axis: a spread, an interval, a floor, and no direction named from overlap.
 *
 * A round with no recorded cost is excluded rather than counted as free. The
 * 18 zero-cost rounds in the ledger are all from November 7-11, before the
 * fallback pricing was wired, and treating them as zero would make an early
 * campaign look like the cheapest one ever run.
 *
 * @param {{full?: Array<object>, off?: Array<object>, alpha?: number}} input
 * @returns {{basis:string, arms:object, delta:number, interval:object, mde:number,
 *            verdict:'reading-costs-more'|'reading-costs-less'|'cannot-distinguish',
 *            sentence:string}|null}
 */
export function compareArmCost({ full = [], off = [], alpha = 0.05 } = {}) {
  return compareArmMetric({
    full,
    off,
    alpha,
    pick: (r) => (Number.isFinite(r?.costUsd) ? Number(r.costUsd) : null),
    basis: 'cost per round',
  })
}

/**
 * Compare two arms on any per-round quantity, with the cost axis's discipline.
 *
 * Money was the first such quantity and it has a structural hole: the leg's own
 * spend is recorded as `costUsd: 0`, because `ctx.web` is not in the pricing
 * table. So the money axis compares rounds that cost money *plus a free search*
 * against rounds that cost money, and it can only ever understate reading.
 *
 * Time is the quantity the leg does report, in the unit it can measure:
 * `research.ms` was 4.8-31.1 seconds on the rounds that read, against a round
 * that takes 48-80 seconds in total. That is six to thirty per cent of a round
 * and it is invisible in money.
 *
 * A round that did not measure the quantity is excluded, not treated as zero:
 * the arm that never reads has no read time to report, and scoring those as zero
 * would hand reading a cost it did not earn. When an arm has fewer than two
 * measurements there is no spread and no comparison -- `null`, not a guess.
 */
export function compareArmMetric({ full = [], off = [], alpha = 0.05, pick = (r) => null, basis = 'metric' } = {}) {
  const clean = (list) =>
    list
      .map((r) => (typeof pick === 'function' ? pick(r) : null))
      .filter((v) => v !== null && Number.isFinite(v))
      .map((v) => Number(v))
  const a = clean(full)
  const b = clean(off)
  // One round is a price, not a distribution; an interval from it would be a
  // zero-width claim of certainty.
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
  const cents = (v) => `${(v * 100).toFixed(2)}c`
  // No spread: pricing can be flat across a campaign, so this is not the
  // "infinite sensitivity" trap the score axis refuses -- it is a real fact
  // about a price list. The direction is still named only if the two arms
  // differ, and the sentence says there is no interval to report.
  if (!(se > 1e-12)) {
    const moved = Math.abs(delta) > 1e-12
    return {
      basis,
      arms,
      delta: round6(delta),
      interval: { low: round6(delta), high: round6(delta) },
      mde: round6(Math.abs(delta)),
      verdict: moved ? (delta > 0 ? 'reading-costs-more' : 'reading-costs-less') : 'cannot-distinguish',
      sentence: moved
        ? `every round in each arm cost the same: reading costs ${cents(Math.abs(delta))} more per round than not reading, with no spread in either arm, so the floor is the difference itself.`
        : `every round in both arms cost the same: there is nothing to compare.`,
    }
  }
  const mde = (z + powerZ(0.8)) * se
  const interval = { low: round6(delta - z * se), high: round6(delta + z * se) }
  let verdict = 'cannot-distinguish'
  if (Math.abs(delta) >= mde && interval.low > 0) verdict = 'reading-costs-more'
  else if (Math.abs(delta) >= mde && interval.high < 0) verdict = 'reading-costs-less'
  const sentence = verdict === 'cannot-distinguish'
    ? `reading cost ${cents(meanA)} a round and not reading ${cents(meanB)} over ${a.length} and ${b.length} rounds; this sample could resolve ${cents(mde)}, so the difference is below what it can see. Overlapping prices are not the same price.`
    : `reading costs ${cents(Math.abs(delta))} ${verdict === 'reading-costs-more' ? 'more' : 'less'} per round (${cents(meanA)} against ${cents(meanB)}); the interval excludes zero and the gap is above the ${cents(mde)} floor.`
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
  // Cost is the second half of the balance. When neither outcome reading can
  // name a direction -- which is what happens on an endpoint every round
  // saturates -- "reading bought nothing visible and cost six tenths of a cent
  // more a round" is still a claim the trial can support.
  const cost = compareArmCost({
    full: list.filter((r) => (r.researchTrial?.arm ?? r.research?.arm) === 'full'),
    off: list.filter((r) => (r.researchTrial?.arm ?? r.research?.arm) === 'off'),
    alpha,
  })
  // Time is the quantity the leg can actually measure about itself: `ctx.web` is
  // not in the pricing table, so `costUsd` for a read is always zero and the
  // money axis can only understate it. Wall clock is reported on every round.
  const readMs = (r) => (r?.research && Number.isFinite(r.research.ms) ? Number(r.research.ms) : null)
  const time = compareArmMetric({
    full: list.filter((r) => (r.researchTrial?.arm ?? r.research?.arm) === 'full'),
    off: list.filter((r) => (r.researchTrial?.arm ?? r.research?.arm) === 'off'),
    alpha,
    pick: readMs,
    basis: 'read time per round',
  })
  // When more than one reading exists, the sentence says which one it is
  // quoting: numbers answering different questions must not be printed as one
  // voice. A decided outcome outranks cost, because a win is what a person is
  // asking about first; cost speaks when the outcome is blind.
  const decided = (cmp) => Boolean(cmp) && cmp.verdict !== 'cannot-distinguish'
  // Blind everywhere: then say what each arm cost, because "this design could
  // resolve 90 points" without the price leaves a reader unable to judge the
  // one thing they can act on today. The count sentence is kept, with the cost
  // appended, rather than replaced -- hiding the sample size to fit a price in
  // would be the same error in the other direction.
  const money = cost && !decided(cost) && Number.isFinite(cost.arms?.full?.mean)
    ? ` Reading cost ${(cost.arms.full.mean * 100).toFixed(2)}c a round and not reading ${(cost.arms.off.mean * 100).toFixed(2)}c.`
    : ''
  // Money understates reading by construction (the leg's own spend is not in the
  // pricing table), so wall clock is printed beside it: it is the quantity the
  // leg can actually measure about itself, and 27 seconds is not a rounding
  // error against a 79-second round.
  const clock = time && Number.isFinite(time.arms?.full?.mean) && time.arms.full.mean > 0
    ? ` The leg itself spent ${(time.arms.full.mean / 1000).toFixed(1)}s a round reading.`
    : ''
  const blindCost = money + clock
  const spoken = decided(score)
    ? score.sentence
    : decided({ verdict: verdict, sentence }) && ready
      ? sentence
      : decided(cost)
        ? cost.sentence
        : sentence + blindCost
  return { n, arms: { full, off }, delta, mde, verdict, sentence: spoken, ready, score, cost, time }
}

/**
 * The trial, read across every campaign that ever assigned an arm.
 *
 * The assignment is per campaign, so a single campaign answers the read/do
 * question with a handful of rounds an arm: `trial-agg` 6/4, `trial-fine` 4/6,
 * `trial-partial` 6/4, `trial-var` 6/4, `trial8-live` 4/4, `trial-live` 2/2.
 * Each of them says "cannot distinguish", correctly, and six correct silences
 * add up to a loop that has bought 52 assigned rounds and learned nothing --
 * because nothing ever added the rounds together.
 *
 * What pooling can and cannot buy: it buys sample size, it does not buy one
 * experiment. Different campaigns ran different task sets, and a round in one
 * is not a replication of a round in another. So the caveat travels with the
 * number rather than living in a document nobody reads when they quote it.
 *
 * @param {{id: string, rounds: object[]}[]} campaigns
 * @returns {{n: number, arms: object, verdict: string, sentence: string, caveat: string, campaigns: object[]}}
 */
export function compareResearchFleet(campaigns = []) {
  const CAVEAT =
    'Pooled across campaigns, so this buys sample size and not one experiment: different task sets, ' +
    'not one long campaign. Treat a direction here as a hypothesis the next campaign can test, never as a result.'
  const per = []
  const pooled = []
  for (const entry of Array.isArray(campaigns) ? campaigns : []) {
    if (!entry || typeof entry !== 'object') continue
    const rounds = Array.isArray(entry.rounds) ? entry.rounds : []
    const assigned = rounds.filter((r) => (r?.researchTrial?.arm ?? r?.research?.arm) === 'full' || (r?.researchTrial?.arm ?? r?.research?.arm) === 'off')
    if (assigned.length === 0) continue
    const cmp = compareResearchArms({ rounds: assigned })
    per.push({
      id: String(entry.id ?? ''),
      n: cmp.n,
      arms: { full: { n: cmp.arms.full.n }, off: { n: cmp.arms.off.n } },
      verdict: cmp.verdict,
      sentence: cmp.sentence,
    })
    for (const r of assigned) pooled.push(r)
  }
  if (pooled.length === 0) {
    return {
      n: 0,
      arms: { full: { n: 0 }, off: { n: 0 } },
      verdict: 'cannot-distinguish',
      sentence: 'no campaign has assigned an arm yet: the trial has not started',
      caveat: CAVEAT,
      campaigns: [],
    }
  }
  const cmp = compareResearchArms({ rounds: pooled })
  return {
    n: cmp.n,
    arms: cmp.arms,
    delta: cmp.delta,
    mde: cmp.mde,
    ready: cmp.ready,
    verdict: cmp.verdict,
    sentence: cmp.sentence,
    caveat: CAVEAT,
    score: cmp.score,
    cost: cmp.cost,
    time: cmp.time,
    campaigns: per,
  }
}
