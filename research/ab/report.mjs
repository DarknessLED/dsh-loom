// Paired comparison of two gate policies on the rounds the loop has already run.
//
// Why replay instead of a live A/B: the decision a gate makes is a deterministic
// function of the recorded score and the task's own history. Replaying both
// policies over the same recorded rounds therefore gives both arms *identical
// candidates* -- there is no second budget to mismatch, which is the failure mode
// that made every earlier comparison unreadable (rounds are not exchangeable:
// a task is easier before anyone solved it, and the selector prefers unsolved
// tasks).
//
// What this *cannot* answer: anything about how a policy changes the *next*
// candidate. A policy that promotes earlier also changes what gets attempted
// next. So this measures the decision layer only, and the report says so.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { comparePolicies, mdePaired } from '../../src/loop/ab.js'

const root = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')

function readEvents(dir) {
  const file = path.join(dir, 'events.jsonl')
  if (!fs.existsSync(file)) return []
  const out = []
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // a torn last line is normal while a round is running
    }
  }
  return out
}

/** Rounds with the task id and the score the gate saw. */
export function collectRounds(events) {
  const byN = new Map()
  const ensure = (n) => {
    if (!byN.has(n)) byN.set(n, { n, taskId: null, score: null, verifierOk: null, recorded: null })
    return byN.get(n)
  }
  for (const e of events) {
    const d = e.data ?? {}
    if (e.type === 'round.started' && Number.isFinite(d.n)) {
      const r = ensure(d.n)
      if (d.taskId) r.taskId = d.taskId
    }
    if (e.type === 'attempt.finished' && Number.isFinite(d.round)) {
      const r = ensure(d.round)
      if (Number.isFinite(d.score)) {
        r.score = Math.max(r.score ?? -Infinity, d.score)
        r.verifierOk = d.verifierOk ?? r.verifierOk
      }
    }
    if (e.type === 'gate.evaluated' && Number.isFinite(d.round)) {
      const r = ensure(d.round)
      if (Number.isFinite(d.score)) r.score = d.score
      if (typeof d.promoted === 'boolean') r.recorded = d.promoted
      // The replay models the incumbent check only, so that is the field to line
      // it up against -- `promoted` also folds in verifierOk / hasPatch /
      // testsClean / noop / holdout and would make every refusal look like a
      // modelling error.
      if (d.checks && typeof d.checks.beatsIncumbent === 'boolean') r.beats = d.checks.beatsIncumbent
      if (d.incumbentScore === null || Number.isFinite(d.incumbentScore)) r.incumbent = d.incumbentScore
    }
  }
  return [...byN.values()].filter((r) => Number.isFinite(r.score)).sort((a, b) => a.n - b.n)
}

/** Best score the same task reached in an earlier round of this campaign. */
function bestPrior(rounds, index, taskId) {
  let best = null
  for (let i = 0; i < index; i += 1) {
    const r = rounds[i]
    if (r.taskId !== taskId) continue
    if (r.recorded !== true) continue
    if (!Number.isFinite(r.score)) continue
    if (best === null || r.score > best) best = r.score
  }
  return best
}

function decide(rounds, index, minGain) {
  const r = rounds[index]
  const prior = bestPrior(rounds, index, r.taskId)
  if (prior === null) return true
  return r.score - prior >= minGain - 1e-9
}

const campaigns = fs.existsSync(root) ? fs.readdirSync(root).filter((c) => fs.statSync(path.join(root, c)).isDirectory()) : []
const perCampaign = []
const pooled = []
for (const id of campaigns) {
  const rounds = collectRounds(readEvents(path.join(root, id)))
  if (rounds.length === 0) continue
  perCampaign.push({ id, rounds })
  for (let i = 0; i < rounds.length; i += 1) pooled.push({ id, i, rounds })
}

const show = (round) => round.rounds[round.i]
const decisions = (minGain) => (cell) => decide(cell.rounds, cell.i, minGain)

const A = 0.05 // the default the loop has been running under
// Three candidates, chosen because they are the ones a policy override can
// actually reach: 0.03 (what loom-mut needs to call +0.035 a gain), 0 (ties
// count as a gain), and -1 (no incumbent check at all).
const CANDIDATES = [
  { label: 'minGain-0.03', minGain: 0.03 },
  { label: 'minGain-0', minGain: 0 },
  { label: 'no-incumbent-check', minGain: -1 },
]
const compared = {}
for (const cand of CANDIDATES) {
  compared[cand.label] = comparePolicies({
    rounds: pooled,
    decideA: decisions(A),
    decideB: decisions(cand.minGain),
  })
}

// How the replay lines up with what the gate actually recorded is itself a check
// on the replay: if these disagree on the incumbent dimension, the replay is
// modelling a different gate.
let agree = 0
let recordedTrue = 0
let compared_ = 0
const disagreeDirection = { replayYesGateNo: 0, replayNoGateYes: 0 }
for (const cell of pooled) {
  const r = show(cell)
  if (typeof r.beats !== 'boolean') continue
  compared_ += 1
  const replayed = decide(cell.rounds, cell.i, A)
  if (replayed === r.beats) agree += 1
  else if (replayed) disagreeDirection.replayYesGateNo += 1
  else disagreeDirection.replayNoGateYes += 1
  if (r.recorded) recordedTrue += 1
}

const out = {
  generatedAt: new Date().toISOString(),
  source: 'replay of recorded rounds; both arms see identical candidates',
  rounds: pooled.length,
  campaigns: perCampaign.length,
  policies: { baseline: A, candidates: CANDIDATES },
  compared,
  // The replay models the incumbent check from recorded scores alone, and treats
  // "gate.evaluated said promoted" as a prior. The gate itself only credits a
  // round that actually landed (bestPriorScore requires landed === true), so a
  // promotion whose patch never applied counts as a prior here and not there.
  // That is the direction of nearly every disagreement: the replay is stricter
  // than the gate about what a task has already achieved.
  replayAgreement: { agree, recordedTrue, of: compared_, disagreeDirection },
  perCampaign: perCampaign
    .map((c) => {
      const cells = c.rounds.map((_, i) => ({ id: c.id, i, rounds: c.rounds }))
      const row = { id: c.id, n: c.rounds.length }
      for (const cand of CANDIDATES) {
        const cmp = comparePolicies({ rounds: cells, decideA: decisions(A), decideB: decisions(cand.minGain) })
        row[cand.label] = { onlyA: cmp.onlyA, onlyB: cmp.onlyB, verdict: cmp.verdict }
      }
      return row
    })
    .sort((x, y) => {
      const d = (r) => CANDIDATES.reduce((s, c) => s + r[c.label].onlyA + r[c.label].onlyB, 0)
      return d(y) - d(x)
    }),
  // What a live A/B with N rounds per arm could see. Printed so nobody runs one
  // and then reads a null as "no effect".
  livePlan: {
    note: 'a live pair is two rounds on the same task, one per policy; the pair is the unit',
    n5: mdePaired({ n: 5, discordance: 0.3 }),
    n10: mdePaired({ n: 10, discordance: 0.3 }),
    n30: mdePaired({ n: 30, discordance: 0.3 }),
  },
}

fs.writeFileSync(path.join(import.meta.dirname, 'report.json'), `${JSON.stringify(out, null, 2)}\n`)
console.log(`rounds=${pooled.length} campaigns=${perCampaign.length} replayAgreement=${agree}/${out.replayAgreement.of}`)
for (const cand of CANDIDATES) {
  const c = compared[cand.label]
  console.log(`\n[${cand.label}] ${c.sentence}`)
  console.log(`  verdict=${c.verdict} delta=${(c.delta * 100).toFixed(1)}pp mde=${(c.mde * 100).toFixed(1)}pp p=${c.p.toFixed(4)} onlyA=${c.onlyA} onlyB=${c.onlyB}`)
}
for (const row of out.perCampaign.slice(0, 6)) {
  const parts = CANDIDATES.map((c) => `${c.label}:${row[c.label].onlyA}/${row[c.label].onlyB}`).join(' ')
  if (CANDIDATES.every((c) => row[c.label].onlyA + row[c.label].onlyB === 0)) continue
  console.log(`  ${row.id} n=${row.n} ${parts}`)
}
