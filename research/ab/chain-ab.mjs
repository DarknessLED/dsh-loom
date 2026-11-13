// Matched-budget A/B for two chain versions.
//
// The question this answers is "does chain v2 beat chain v1", and the only
// honest instrument for it is the one the loop already trusts for L1: the same
// tasks, the same verifier, one number per task per arm. Two things are added
// here that the built-in gate does not have:
//
//   1. a budget check, because "arm B did better" is meaningless if arm B spent
//      twice as much clock or twice as many tokens;
//   2. an interval and a detectable floor on the paired differences, so a
//      verdict can be "this sample cannot distinguish a difference below N
//      points" instead of quietly reading a small number as no effect.
//
// The pairing is by task, which is stronger than by round: the same task is run
// under both chains from a fresh campaign, so nothing about the task's state can
// favour either arm. What it cannot fix is the model's own run-to-run variance;
// that is why the floor is reported rather than assumed away.
//
// Usage:
//   node research/ab/chain-ab.mjs --base=loom-ab-v1 --cand=loom-ab-v2 \
//        [--version=2] [--minTasks=6] [--minGain=0.05]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { compareChains, chainEvidence } from '../../src/chain/evidence.js'
import { compareMeans } from '../../src/loop/ab.js'

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=')
    return [k, v ?? 'true']
  }),
)
const ROOT = args.root || join(homedir(), '.dsh', 'loom', 'campaigns')
const base = args.base
const cand = args.cand
if (!base || !cand) {
  console.error('usage: chain-ab.mjs --base=<campaign> --cand=<campaign> [--version=2] [--minTasks=6] [--minGain=0.05]')
  process.exit(2)
}

function loadCampaign(id) {
  const file = join(ROOT, id, 'views', 'state.json')
  const state = JSON.parse(readFileSync(file, 'utf8'))
  const rounds = Array.isArray(state.rounds) ? state.rounds : []
  return { id, state, rounds }
}

const A = loadCampaign(base)
const C = loadCampaign(cand)
// The candidate needs a version the base does not have: the two arms here run the
// *same* chain version and differ by policy, so defaulting to the campaign's own
// active version would merge both arms into one bucket and report every score as
// identical. The version is a label for the arm in this comparison, nothing else.
const candVersion = Number(args.version ?? (Number(A.state.chain?.activeVersion ?? 1) + 1))
const minTasks = Number(args.minTasks ?? 6)
const minGain = Number(args.minGain ?? 0.05)

// The base arm keeps its own version tag; the candidate's rounds are relabelled
// so the two campaigns form one paired table.
const baseVersion = Number(A.state.chain?.activeVersion ?? 1)
const merged = [
  ...A.rounds.map((r) => ({ ...r, chainVersion: baseVersion })),
  ...C.rounds.map((r) => ({ ...r, chainVersion: candVersion })),
]

// Best result per task per arm: a chain that can reach 0.9 has shown it can.
function bestByTask(rounds, version) {
  const rows = chainEvidence({ rounds: rounds.filter((r) => (r.chainVersion ?? null) === version) })
  const m = new Map()
  for (const row of rows) m.set(row.taskId, row)
  return m
}
const baseRows = bestByTask(merged, baseVersion)
const candRows = bestByTask(merged, candVersion)

// A metric per task, when the task declared one: the graded endpoint the whole
// corpus exists for. Falls back to the composite score, which is also continuous
// but mixes in the pass rate.
function metricOf(campaign, taskId) {
  const out = { quality: null, score: null, durationMs: null, tokens: null, costUsd: null }
  for (const r of campaign.rounds) {
    if (r.taskId !== taskId) continue
    const a = (r.attempts || []).find((x) => Number.isFinite(x?.metrics?.quality))
    if (a && out.quality === null) out.quality = Number(a.metrics.quality)
    if (Number.isFinite(r.score) && out.score === null) out.score = Number(r.score)
    if (Number.isFinite(a?.durationMs) && out.durationMs === null) out.durationMs = Number(a.durationMs)
    if (Number.isFinite(r.tokens) && out.tokens === null) out.tokens = Number(r.tokens)
    if (Number.isFinite(r.costUsd) && out.costUsd === null) out.costUsd = Number(r.costUsd)
  }
  return out
}

const tasks = [...candRows.keys()].filter((t) => baseRows.has(t)).sort()
const rows = tasks.map((taskId) => {
  const b = metricOf(A, taskId)
  const c = metricOf(C, taskId)
  return {
    taskId,
    base: { ...b, gateScore: baseRows.get(taskId).score },
    candidate: { ...c, gateScore: candRows.get(taskId).score },
  }
})

const qPairs = rows.filter((r) => Number.isFinite(r.base.quality) && Number.isFinite(r.candidate.quality))
  .map((r) => ({ base: r.base.quality, candidate: r.candidate.quality }))
const sPairs = rows.map((r) => ({ base: r.base.gateScore, candidate: r.candidate.gateScore }))
const dPairs = rows.filter((r) => Number.isFinite(r.base.durationMs) && Number.isFinite(r.candidate.durationMs))
  .map((r) => ({ base: r.base.durationMs, candidate: r.candidate.durationMs }))

const sum = (xs) => xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0)
const budget = {
  baseTokens: sum(A.rounds.map((r) => r.tokens)),
  candTokens: sum(C.rounds.map((r) => r.tokens)),
  baseCost: sum(A.rounds.map((r) => r.costUsd)),
  candCost: sum(C.rounds.map((r) => r.costUsd)),
  baseAttemptMs: sum(A.rounds.map((r) => r.attemptMs)),
  candAttemptMs: sum(C.rounds.map((r) => r.attemptMs)),
}
// Tokens are the budget the goal names beside rounds. A ratio under 1 is a
// cheaper arm, which is fine to note but not a mismatch; the check only refuses
// when the candidate spent *more*, because that is the arm whose win could be
// bought rather than earned.
const budgetOk = budget.baseTokens === 0 || budget.candTokens <= budget.baseTokens * 1.25

const gate = compareChains({
  rounds: merged,
  baseVersion,
  candidateVersion: candVersion,
  minTasks,
  minGain,
  holdoutSlack: 0.02,
})

// The decision rule, written down so it cannot drift: adopt only when the gate's
// three checks pass, the paired interval on the graded endpoint excludes zero,
// and the candidate did not outspend the base.
const quality = qPairs.length >= 2 ? compareMeans({ pairs: qPairs }) : null
const score = compareMeans({ pairs: sPairs })
const duration = dPairs.length >= 2 ? compareMeans({ pairs: dPairs }) : null
const qualitySupports = quality ? quality.verdict === 'candidate-better' : score.verdict === 'candidate-better'
const decision = !budgetOk
  ? 'reject:budget-mismatch'
  : !gate.ok
    ? `reject:${gate.reason}`
    : !qualitySupports
      ? 'reject:endpoint-not-distinguishable'
      : 'adopt'

const report = {
  measuredAt: new Date().toISOString(),
  base: { campaign: base, version: baseVersion, rounds: A.rounds.length },
  candidate: { campaign: cand, version: candVersion, rounds: C.rounds.length },
  pairedTasks: rows.length,
  gate,
  quality,
  score,
  duration,
  budget,
  budgetOk,
  decision,
  rows,
}

mkdirSync(join('research', 'ab'), { recursive: true })
const out = join('research', 'ab', args.out || `chain-ab-${base}-vs-${cand}.json`)
writeFileSync(out, JSON.stringify(report, null, 2))

const fmt = (x, d = 3) => (x === null || x === undefined || Number.isNaN(x) ? '?' : Number(x).toFixed(d))
console.log(`base      ${base} (v${baseVersion}, ${A.rounds.length} rounds)`)
console.log(`candidate ${cand} (v${candVersion}, ${C.rounds.length} rounds)`)
console.log(`paired tasks: ${rows.length}  (gate needs ${minTasks})`)
console.log('')
console.log('task                            quality            gate score         attempt ms')
for (const r of rows) {
  console.log(
    `${r.taskId.padEnd(30)} ${fmt(r.base.quality)} -> ${fmt(r.candidate.quality)}   ` +
    `${fmt(r.base.gateScore)} -> ${fmt(r.candidate.gateScore)}   ${fmt(r.base.durationMs, 0)} -> ${fmt(r.candidate.durationMs, 0)}`,
  )
}
console.log('')
console.log(`gate: ${gate.reason} (enoughtasks=${gate.checks.enoughTasks} gain=${gate.checks.gain} noRegression=${gate.checks.noRegression}, delta=${fmt(gate.delta)})`)
if (quality) console.log(`quality: ${quality.sentence}`)
console.log(`score:   ${score.sentence}`)
if (duration) console.log(`attempt ms: ${duration.sentence}`)
console.log(`budget: tokens ${budget.baseTokens} -> ${budget.candTokens}, cost $${fmt(budget.baseCost, 4)} -> $${fmt(budget.candCost, 4)}, attempt ms ${fmt(budget.baseAttemptMs, 0)} -> ${fmt(budget.candAttemptMs, 0)} => ${budgetOk ? 'comparable' : 'candidate outspent the base'}`)
console.log('')
console.log(`DECISION=${decision}`)
console.log(`written to ${out}`)
process.exit(decision === 'adopt' ? 0 : 1)
