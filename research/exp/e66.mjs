// e66: the top load-bearing question in the graph asks "what is the outcome?"
//
// q-outcome-variable has 5 dependents and weight 13 -- the heaviest in the queue --
// and it is not rhetorical: the ledger score is `gateOk ? 1 : 0`, so a promotion means
// "this candidate passed a verifier on this task", not "the campaign moved toward its
// objective". The question names its own test: correlate holdout pass with final score
// across the 58 rounds carrying a holdoutId.
//
// The holdout is the loop's only second opinion that the candidate cannot edit -- a
// different task from the eval set, run against the candidate's tree. If it agrees with
// the score on every round, it is not a second opinion, it is the same opinion measured
// twice, and the score's saturation in round 1 (56 of 67 campaigns promote in round 1)
// is not evidence of progress but of an instrument with no dynamic range left.
//
// Run: node research/exp/e66.mjs

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const ROOT = process.env.LOOM_CAMPAIGNS || join(homedir(), '.dsh', 'loom', 'campaigns')
const CAMPAIGNS = readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, 'events.jsonl')))

const eventsOf = (id) =>
  readFileSync(join(ROOT, id, 'events.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)

const rows = []
for (const id of CAMPAIGNS) {
  const ev = eventsOf(id)
  const rounds = new Map()
  for (const e of ev) {
    const n = e.data?.n ?? e.data?.round
    if (n == null) continue
    if (!rounds.has(n)) rounds.set(n, {})
    const r = rounds.get(n)
    if (e.type === 'round.started') r.taskId = e.data.taskId
    if (e.type === 'holdout.selected') r.holdoutRan = true
    if (e.type === 'gate.evaluated') {
      r.promoted = e.data.promoted
      r.score = e.data.score
      r.checks = e.data.checks
      r.holdout = e.data.checks?.holdout
      r.holdoutTask = r.holdoutId
    }
    if (e.type === 'round.finished') {
      r.status = e.data.status
      r.score = e.data.score ?? r.score
      r.holdoutId = e.data.holdoutId ?? r.holdoutId
      r.finished = true
    }
  }
  for (const [n, r] of rounds) rows.push({ campaign: id, round: n, ...r })
}

const finished = rows.filter((r) => r.finished)
const withHoldoutId = finished.filter((r) => r.holdoutId)
const gated = rows.filter((r) => r.promoted !== undefined)
// A 'skipped' holdout did not run, so it had no chance to disagree. Counting it as a
// verdict is the same error as counting it as a pass.
const holdoutVerdicts = gated.filter((r) => typeof r.holdout === 'boolean')

const count = (xs, f) => xs.filter(f).length
const rate = (xs, f) => (xs.length ? Number((count(xs, f) / xs.length).toFixed(3)) : null)
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : 'n/a')

// ---- 1. what values does the holdout ever take
const holdoutValues = {}
for (const r of holdoutVerdicts) holdoutValues[String(r.holdout)] = (holdoutValues[String(r.holdout)] ?? 0) + 1

// ---- 2. the question's own test: does the holdout ever disagree with the score
//
// The denominator matters here and it is not "promotions". A holdout can only
// disagree on a round where the other checks passed: if the verifier already failed,
// the round was going to be rejected whatever the holdout said. So the chance the
// holdout had = rounds where holdout ran AND every other check passed. Counting
// against promotions instead would report "0 disagreements out of 57" and make a
// check that fired look like a check that cannot fire.
const earnedOk = (c) =>
  c.earnedReason === undefined ||
  c.earnedReason === 'red-to-green' ||
  c.earnedReason === 'base-unmeasured' ||
  c.earnedReason === 'metric-improved'
const basePassOf = (c) =>
  Boolean(c.verifierOk && c.testsClean && c.oracleClean !== false && earnedOk(c) && c.beatsIncumbent && (c.hasPatch || c.noop))

const holdoutRanAndCouldFlip = holdoutVerdicts.filter((r) => basePassOf(r.checks ?? {}))
const holdoutFlipped = holdoutRanAndCouldFlip.filter((r) => r.holdout === false)
const holdoutPassedOnBasePass = holdoutRanAndCouldFlip.filter((r) => r.holdout === true)
const promotedWhereHoldoutRan = holdoutVerdicts.filter((r) => r.promoted === true)

// ---- 3. dynamic range: the share of rounds that score 1, by round ordinal
const byOrdinal = new Map()
for (const r of finished) {
  if (!byOrdinal.has(r.round)) byOrdinal.set(r.round, [])
  byOrdinal.get(r.round).push(r.score === 1)
}
const curve = [...byOrdinal.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([n, xs]) => ({ round: n, n: xs.length, scoreOneRate: rate(xs, (x) => x) }))
  .filter((x) => x.n >= 3)

// ---- 4. does a holdout-passing round predict the NEXT round also scoring 1?
// If the instrument has range, passing a second opinion should not make the next
// round easier. If it is saturated, both are the same coin landing heads.
const nextOf = (r) => finished.find((x) => x.campaign === r.campaign && x.round === r.round + 1)
const withNext = holdoutVerdicts.filter((r) => nextOf(r))
const afterHoldoutPass = withNext.filter((r) => r.holdout === true)
const afterHoldoutFail = withNext.filter((r) => r.holdout === false)

const out = {
  population: {
    campaigns: CAMPAIGNS.length,
    finishedRounds: finished.length,
    roundsWithHoldoutId: withHoldoutId.length,
    campaignsWithAHoldoutRound: new Set(withHoldoutId.map((r) => r.campaign)).size,
    gatedRounds: gated.length,
    gatedRoundsWithAHoldoutVerdict: holdoutVerdicts.length,
  },
  holdoutVerdictDistribution: holdoutValues,
  theQuestionsTest: {
    roundsWhereHoldoutRan: holdoutVerdicts.length,
    promotionsWhereHoldoutRan: promotedWhereHoldoutRan.length,
    promotionsWhereHoldoutFailed: promotedWhereHoldoutRan.filter((r) => r.holdout === false).length,
    chanceToFlip: holdoutRanAndCouldFlip.length,
    flipped: holdoutFlipped.length,
    flipRate: rate(holdoutRanAndCouldFlip, (r) => r.holdout === false),
    flippedRounds: holdoutFlipped.map((r) => `${r.campaign}/r${r.round}`),
    passedOnBasePass: holdoutPassedOnBasePass.length,
    // Written from the numbers on the same object rather than transcribed, because
    // the first version of this sentence said '30 times' against a count of 102
    // (exp-gap-009, one hour earlier, same family).
    reading: `A holdout can only disagree on a round where every other check passed: ${holdoutRanAndCouldFlip.length} such rounds, ${holdoutFlipped.length} disagreements (${rate(holdoutRanAndCouldFlip, (r) => r.holdout === false)}). ${holdoutPassedOnBasePass.length} times it agreed with a verdict that was otherwise going to promote. So it is not decorative, and it agrees most of the time with the score it is checking.`,
  },
  dynamicRange: {
    scoreOneRateByRound: curve.slice(0, 8),
    reading:
      'If this starts at ~0.6 and falls, the instrument is getting harder and the loop may be getting worse -- both readings fit, which is the question. If it is flat at 1.0 for the rounds that matter, the score has no range left and every policy question measured on it is measuring a constant.',
  },
  secondOpinionPredictsNext: {
    afterHoldoutPass: { n: afterHoldoutPass.length, nextScoredOne: rate(afterHoldoutPass, (r) => nextOf(r).score === 1) },
    afterHoldoutFail: { n: afterHoldoutFail.length, nextScoredOne: rate(afterHoldoutFail, (r) => nextOf(r).score === 1) },
    reading:
      'A second opinion that predicts the next round is not independent evidence about this one -- it is the same underlying state observed twice. With n in the single digits on the fail side this is reported for completeness, not as an estimate.',
  },
}

console.log(JSON.stringify(out, null, 2))
