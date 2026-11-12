// e62: answer four gaps that name our own ledger, using only what is on this disk.
//
// exp-gap-001 showed that a regex cannot tell "nobody has published X" from "we
// have not measured X", and that hand labels put 218 of 320 gaps in the second
// class. The useful response is not a better regex, it is to answer the ones that
// name us. These four ask for numbers only this disk can produce:
//
//   gap-w6-039  Does the pass@1 versus pass@64 reversal appear in our ledger?
//   gap-w6-011  Across our ~450 recorded attempts, how many verifications were
//               executed rather than asserted, and what is the value of the rest?
//   gap-w6-001  What is the actual human decision rate in dsh-loom?
//   gap-w6-018  Is a single-run SEM of 0.8-1.4 points enough to justify the 1-3
//               point deltas our own ledger promotes?
//
// Every answer prints the population it was computed over, because the four
// defects this digest records (exp-stop-002, exp-diff-002, exp-dedup-001,
// exp-gap-004) are one defect: a quantity reported without its population.
//
// Storage note: the ledger is not one database. It is
// ~/.dsh/loom/campaigns/<id>/events.jsonl, one append-only file per campaign, and
// attempt.finished carries no campaign or taskId -- the round is the join key.
//
// Run: node research/exp/e62.mjs

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const HOME = process.env.USERPROFILE || homedir()
const BASE = join(HOME, '.dsh', 'loom', 'campaigns')

const campaigns = []
for (const id of readdirSync(BASE)) {
  const file = join(BASE, id, 'events.jsonl')
  if (!existsSync(file)) continue
  const events = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (Number.isFinite(e.seq)) events.push(e)
    } catch {
      /* a torn line from a killed writer is data, not a crash */
    }
  }
  events.sort((a, b) => a.seq - b.seq)
  campaigns.push({ id, events })
}

const all = campaigns.flatMap((c) => c.events.map((e) => ({ ...e, campaign: c.id })))
const of = (t) => all.filter((e) => e.type === t)

// From here on every attempt is tagged with the task its round was started for.
// A round whose taskId is missing is dropped from task-scoped counts and counted
// in `population.roundsWithoutTask` so the denominators stay honest.
let roundsWithoutTask = 0
const taskByRound = new Map() // "<campaign>::<round>" -> taskId
for (const e of of('round.started')) {
  const key = `${e.campaign}::${e.data.n}`
  if (e.data.taskId) taskByRound.set(key, e.data.taskId)
  else roundsWithoutTask++
}

const attempts = of('attempt.finished').map((e) => ({
  ...e.data,
  campaign: e.campaign,
  taskId: taskByRound.get(`${e.campaign}::${e.data.round}`) ?? null,
}))
const verified = new Set(of('verifier.finished').map((e) => `${e.campaign}::${e.data.attemptId}`).filter((k) => !k.endsWith('::undefined')))
const gates = of('gate.evaluated').map((e) => ({ ...e.data, campaign: e.campaign }))
const gateAttempts = new Set(gates.map((g) => `${g.campaign}::${g.candidateId}`))

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const median = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const pct = (n, d) => (d ? Number((n / d).toFixed(4)) : null)

// ---------------------------------------------- gap-w6-039 pass@1 vs pass@k
// The published reversal is that a model winning at pass@1 can lose at pass@64,
// because its successes pile onto tasks that were already easy. In a binary ledger
// the same thing is visible as a task that scored 1 at least once and 0 at least
// once, with campaign, task and verifier all held fixed.
const byTask = new Map()
for (const a of attempts) {
  if (!a.taskId || typeof a.score !== 'number' || !Number.isFinite(a.score)) continue
  const k = `${a.campaign}::${a.taskId}`
  if (!byTask.has(k)) byTask.set(k, { campaign: a.campaign, taskId: a.taskId, byRound: new Map() })
  const rec = byTask.get(k)
  // one score per round: the best attempt in that round, because a round is one
  // decision and its attempts are alternatives, not repeats.
  const prev = rec.byRound.get(a.round)
  rec.byRound.set(a.round, prev === undefined ? a.score : Math.max(prev, a.score))
}
const series = [...byTask.values()].map((r) => ({
  ...r,
  scores: [...r.byRound.entries()].sort((x, y) => x[0] - y[0]).map(([, s]) => s),
}))
const repeatable = series.filter((s) => s.scores.length >= 2)
const flippers = repeatable.filter((s) => s.scores.some((x) => x >= 1) && s.scores.some((x) => x < 1))
const pass1 = repeatable.filter((s) => s.scores[0] >= 1).length
const passK = repeatable.filter((s) => s.scores.some((x) => x >= 1)).length
// the naive reading of "the first round is representative"
const onlyRoundOne = series.filter((s) => s.scores[0] >= 1).length

// ------------------------------------------ gap-w6-011 executed vs asserted
// The question asks for a rate "across our ~450 recorded attempts", but the ledger
// has an era boundary that no previous analysis respected: verifier.finished does
// not exist before 2026-11-07T16:03:38.645Z (the first one belongs to loom-triangle
// r1a1). Before that line an attempt has no verifier event because nothing wrote
// one, not because nothing ran. Pooling the two eras would let a logging change
// vote on how often we verify -- the same defect as exp-gap-004.
const eraCut = Math.min(...of('verifier.finished').map((e) => e.t))
const attemptRecs = attempts.map((a) => {
  const key = `${a.campaign}::${a.id}`
  return {
    ...a,
    key,
    postEra: (all.find((e) => e.type === 'attempt.finished' && e.campaign === a.campaign && e.data.id === a.id)?.t ?? 0) >= eraCut,
    executed: verified.has(key),
    gated: gateAttempts.has(key),
  }
})
const preEra = attemptRecs.filter((a) => !a.postEra)
const postEra = attemptRecs.filter((a) => a.postEra)
const postUnverified = postEra.filter((a) => !a.executed)
const reachedGatePostEra = postEra.filter((a) => a.gated)
const gateWithoutVerifier = postEra.filter((a) => a.gated && !a.executed)

// by task family: an attempt whose verifier never ran cannot be a measurement of
// the candidate, so these two classes must not be pooled when computing pass rates.
const scoreWithVerifier = postEra.filter((a) => a.executed && typeof a.score === 'number')
const scoreWithoutVerifier = postEra.filter((a) => !a.executed && typeof a.score === 'number')

// -------------------------------------------- gap-w6-001 human decision rate
const raised = of('checkpoint.raised').map((e) => ({ ...e.data, campaign: e.campaign }))
const answered = of('checkpoint.answered').map((e) => ({ ...e.data, campaign: e.campaign }))
const answeredIds = new Set(answered.map((a) => `${a.campaign}::${a.id}`))
const stillOpen = raised.filter((r) => !answeredIds.has(`${r.campaign}::${r.id}`))
const kindOf = (cp) => cp.kind ?? cp.payload?.kind ?? 'unknown'
const raisedByKind = {}
for (const r of raised) raisedByKind[kindOf(r)] = (raisedByKind[kindOf(r)] ?? 0) + 1
const decidedByKind = {}
for (const a of answered) {
  const rec = raised.find((r) => r.campaign === a.campaign && r.id === a.id)
  const k = rec ? kindOf(rec) : 'unknown'
  decidedByKind[k] = (decidedByKind[k] ?? 0) + 1
}
const decisions = answered.map((a) => a.answer?.decision ?? 'unknown')
const decisionMix = {}
for (const d of decisions) decisionMix[d] = (decisionMix[d] ?? 0) + 1

// ------------------------------------------------ gap-w6-018 single-run SEM
// Two quantities are conflated in the question and they behave differently.
//  (a) measurement noise: same tree, same command, run again. exp-ver-005 says
//      zero (105 tasks x 3, no disagreement), so repeating the verifier buys
//      nothing.
//  (b) candidate noise: same task, new attempt. That is what a binary score of a
//      single attempt suffers from, and it is what "a single run is not enough"
//      is really about.
const perTask = new Map()
for (const a of attempts) {
  if (!a.taskId || typeof a.score !== 'number' || !Number.isFinite(a.score)) continue
  if (!perTask.has(a.taskId)) perTask.set(a.taskId, [])
  perTask.get(a.taskId).push(a.score)
}
const withRepeats = [...perTask.entries()].filter(([, s]) => s.length >= 3)
const variance = (xs) => {
  const m = mean(xs)
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)
}
const sds = withRepeats.map(([, s]) => Math.sqrt(variance(s)))
// pooled pass rate, and the SD a Bernoulli draw at that rate would have
const pooled = attempts.filter((a) => typeof a.score === 'number' && Number.isFinite(a.score))
const pooledRate = mean(pooled.map((a) => a.score))
const bernoulliSd = Math.sqrt(pooledRate * (1 - pooledRate))
// a promotion compares two candidates on the same task: the difference of two
// independent draws, so its SD is sqrt(2) x the single-draw SD
const diffSd = Math.SQRT2 * bernoulliSd

const out = {
  population: {
    campaigns: campaigns.length,
    events: all.length,
    roundsStarted: of('round.started').length,
    roundsWithoutTask,
    attempts: attempts.length,
    attemptsWithTask: attempts.filter((a) => a.taskId).length,
    gateEvaluations: gates.length,
    verifierRuns: of('verifier.finished').length,
    checkpointsRaised: raised.length,
    ledger: BASE,
  },
  'gap-w6-039': {
    question: 'Does the pass@1 versus pass@64 reversal appear in our ledger?',
    taskCampaignPairs: series.length,
    pairsWithTwoOrMoreRounds: repeatable.length,
    tasksThatScoredBothOneAndZero: flippers.length,
    flipRate: pct(flippers.length, repeatable.length),
    passAt1: pass1,
    passAtK: passK,
    roundsGainedByAllowingK: passK - pass1,
    firstRoundOnlyWouldCallSolved: onlyRoundOne,
    reversalPresent: flippers.length > 0,
    reading:
      'A flip is the same campaign, same task, same verifier, both a 1 and a 0 in different rounds. That is the reversal in binary form: the score of one attempt is not a property of the task. pass@1 counts round 1 only and therefore understates what k rounds reach; the gap between passAt1 and passAtK is the reversal, and it is also why src/runtime/selector.js preferring unsolved tasks is worse than it looks -- "unsolved" is often "unlucky".',
    examples: flippers.slice(0, 10).map((f) => ({ task: f.taskId, campaign: f.campaign, scores: f.scores })),
  },
  'gap-w6-011': {
    question: 'How many verifications were executed rather than asserted?',
    eraBoundary: new Date(eraCut).toISOString(),
    attempts: attemptRecs.length,
    beforeVerifierLoggingExists: {
      attempts: preEra.length,
      withVerifierEvent: preEra.filter((a) => a.executed).length,
      note: 'verifier.finished did not exist yet; absence here is a logging fact, not a measurement of the work.',
    },
    afterVerifierLoggingExists: {
      attempts: postEra.length,
      verifierRan: postEra.filter((a) => a.executed).length,
      verifierDidNotRun: postUnverified.length,
      reachedGate: reachedGatePostEra.length,
      reachedGateWithoutVerifier: gateWithoutVerifier.length,
      reachedGateWithoutVerifierIds: gateWithoutVerifier.map((a) => `${a.campaign}/${a.id}`),
      described: postUnverified.reduce((acc, a) => {
        const k = a.stopReason ?? (a.error ? 'error' : 'unknown')
        return { ...acc, [k]: (acc[k] ?? 0) + 1 }
      }, {}),
    },
    executedRate: pct(postEra.length - postUnverified.length, postEra.length),
    scoring: scoreWithVerifier.length
      ? {
          attempts: scoreWithVerifier.length,
          meanScore: Number(mean(scoreWithVerifier.map((a) => a.score)).toFixed(3)),
          shareAtOne: pct(scoreWithVerifier.filter((a) => a.score >= 1).length, scoreWithVerifier.length),
        }
      : null,
    unverifiedScoring: scoreWithoutVerifier.length
      ? {
          attempts: scoreWithoutVerifier.length,
          meanScore: Number(mean(scoreWithoutVerifier.map((a) => a.score)).toFixed(3)),
          shareAtOne: pct(scoreWithoutVerifier.filter((a) => a.score >= 1).length, scoreWithoutVerifier.length),
        }
      : null,
    reading:
      'The first version of this measurement pooled the eras and reported 75 attempts with a gate verdict and no verifier event, passing at 56.7% against 42.1% for the measured ones -- which would have meant unverified work succeeds more often. It does not. Zero of those 210 attempts before the era line could have had a verifier event (nothing wrote them), and after the line only 5 attempts reached a gate without one, none scoring. The pooled "executed rate" of 0.559 is therefore a fact about when the event was added to the log, not about how often we verify; the honest number is 0.792 for the era that can answer. This is exp-gap-004 a second time in one night: a quantity computed over two populations reported as one.',
  },
  'gap-w6-001': {
    question: 'What is the actual human decision rate in dsh-loom?',
    checkpointsRaised: raised.length,
    checkpointsAnswered: answered.length,
    stillOpen: stillOpen.length,
    answerRate: pct(answered.length, raised.length),
    campaignsWithACheckpoint: new Set(raised.map((r) => r.campaign)).size,
    checkpointsPerCampaign: Number((raised.length / campaigns.length).toFixed(2)),
    decisionsPerCampaign: Number((answered.length / campaigns.length).toFixed(2)),
    raisedByKind,
    decidedByKind,
    decisionMix,
    openByKind: stillOpen.reduce((acc, r) => ({ ...acc, [kindOf(r)]: (acc[kindOf(r)] ?? 0) + 1 }), {}),
    reading:
      'The rate that matters for cost is decisions per campaign, not per attempt: a campaign needing zero decisions is the unattended case the design targets. Answer rate is not decision quality -- an answered checkpoint includes "rejected because stale", which is a bookkeeping outcome, not a judgement about the work.',
  },
  'gap-w6-018': {
    question: 'Is a single-run SEM of 0.8-1.4 points enough to justify the 1-3 point deltas the ledger promotes?',
    tasksWithThreeOrMoreAttempts: withRepeats.length,
    sdAcrossAttemptsOfSameTask: {
      mean: Number(mean(sds).toFixed(3)),
      median: Number(median(sds).toFixed(3)),
      max: sds.length ? Number(Math.max(...sds).toFixed(3)) : null,
    },
    pooledPassRate: Number(pooledRate.toFixed(3)),
    bernoulliSdOfOneCandidate: Number(bernoulliSd.toFixed(3)),
    sdOfACandidateDifference: Number(diffSd.toFixed(3)),
    reading:
      'The premise of the question is a units error. A SEM in "points" belongs to a benchmark whose score is a share of many tasks; our score is one binary verdict on one task, so its noise is Bernoulli, not 0.8-1.4 points. At the pooled rate that is sqrt(p(1-p)) per candidate and sqrt(2) times that for a difference of two candidates -- both printed above. The consequence for minGain is that any threshold below that difference-SD is a coin flip dressed as a decision, which is what exp-gate-001 measured from the other end (0 of 208 gate decisions had a real incumbent to compare against).',
  },
}

console.log(JSON.stringify(out, null, 2))
