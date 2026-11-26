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
  const pct = (v) => `${(v * 100).toFixed(1)} points`
  const sentence = n === 0
    ? 'no round has been assigned an arm yet: the trial has not started'
    : !ready
      ? `${n} assigned rounds (${full.n} reading, ${off.n} not): too few in an arm to read a direction yet`
      : verdict === 'cannot-distinguish'
        ? `${n} assigned rounds: reading promoted ${pct(full.rate)} and not reading ${pct(off.rate)} (delta ${pct(delta)}); this design could resolve ${pct(mde)}, so the difference is below what ${n} rounds can see. Not "no effect".`
        : `${verdict === 'full-better' ? 'reading' : 'not reading'} promoted ${pct(Math.abs(delta))} more often over ${n} assigned rounds (${full.promoted}/${full.n} against ${off.promoted}/${off.n}); the arms' intervals do not overlap and the gap is above the ${pct(mde)} floor.`
  return { n, arms: { full, off }, delta, mde, verdict, sentence, ready }
}
