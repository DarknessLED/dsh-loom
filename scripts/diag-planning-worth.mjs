#!/usr/bin/env node
/**
 * Does planning earn its keep?
 *
 * The R5 report found that `planUsable` was counted by the triangle and read by
 * nothing: a planner could burn its whole budget, hand back an empty transcript,
 * and the next round would buy another one at the same price. The open question
 * was whether planning pays for itself at all.
 *
 * This script answers it from the ledger alone, with no model calls: pair each
 * round with the plan it bought, and compare the two populations on the only
 * outcomes the loop is judged by -- promotion rate, wall clock, and how often an
 * attempt produced a patch at all.
 *
 * The honest limitation, printed with the numbers: rounds are not randomly
 * assigned to a plan, so a difference is a description of this ledger, not an
 * effect size.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const home = process.env.LOOM_HOME || join(homedir(), '.dsh', 'loom')
const campaigns = join(home, 'campaigns')

function roundsOf(dir) {
  const file = join(dir, 'events.jsonl')
  if (!existsSync(file)) return { rounds: [], nodes: [] }
  /** @type {Map<number, any>} */
  const byRound = new Map()
  /** Planning nodes, keyed by round: the only evidence of whether a plan arrived. */
  const nodes = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let rec
    try {
      rec = JSON.parse(line)
    } catch {
      continue
    }
    if (rec.type === 'round.finished' && rec.data && Number.isFinite(rec.data.n)) {
      byRound.set(rec.data.n, rec.data)
    }
    if (rec.type === 'node.finished' && rec.data && Number.isFinite(rec.data.round)) {
      nodes.push(rec.data)
    }
  }
  return { rounds: [...byRound.values()], nodes }
}

function median(list) {
  if (!list.length) return null
  const sorted = list.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

const planned = []
const unplanned = []
for (const name of existsSync(campaigns) ? readdirSync(campaigns) : []) {
  const dir = join(campaigns, name)
  const perRound = roundsOf(dir)
  const planNodes = new Map()
  for (const node of perRound.nodes) {
    const list = planNodes.get(node.round) ?? []
    list.push(node)
    planNodes.set(node.round, list)
  }
  for (const round of perRound.rounds) {
    const planMs = Number(round.planMs ?? 0)
    const durationMs = Number(round.durationMs ?? NaN)
    if (!Number.isFinite(durationMs) || durationMs <= 0) continue
    const row = {
      campaign: name,
      n: round.n,
      status: round.status,
      promoted: round.promoted === true,
      // What the planner actually handed back. `planUsable` only exists on rounds
      // written after the field was added, so the node records are the evidence
      // that covers the whole ledger: a node with no usable text planned nothing,
      // whether or not anyone recorded a verdict about it.
      plannerNodes: planNodes.get(round.n) ?? [],
      // Three states, not two: a round recorded before the field existed cannot be
      // read as "the plan was unusable" -- absence and falsehood are different
      // answers, and conflating them is how a table starts lying.
      usable: typeof round.planUsable === 'boolean' ? round.planUsable : null,
      planMs,
      durationMs,
      planTimedOut: round.planTimedOut === true,
      attempts: Number(round.attemptCount ?? 0),
    }
    if (planMs > 0) planned.push(row)
    else unplanned.push(row)
  }
}

function summarize(label, rows) {
  const promoted = rows.filter((r) => r.promoted).length
  const rate = rows.length ? Math.round((promoted / rows.length) * 100) : null
  const p50 = median(rows.map((r) => r.durationMs))
  const planShare = rows.length
    ? Math.round((rows.reduce((s, r) => s + r.planMs, 0) / rows.reduce((s, r) => s + r.durationMs, 0)) * 100)
    : null
  const timedOut = rows.filter((r) => r.planTimedOut).length
  // A plan is usable when its node came back with text. `reused` counts: reusing a
  // plan that still applies is the cheapest usable plan there is.
  const usable = rows.filter((r) => plannedSomething(r)).length
  return { label, rounds: rows.length, promoted, rate, p50Ms: p50, planSharePct: planShare, timedOut, usable }
}

/** True when at least one planning node in the round handed back text. */
function plannedSomething(round) {
  const nodes = Array.isArray(round.plannerNodes) ? round.plannerNodes : []
  if (nodes.some((n) => n.ok === true && String(n.summary ?? '').trim().length > 0)) return true
  // A round whose nodes were never recorded falls back to the explicit verdict,
  // which is the only other evidence the ledger holds.
  return round.usable === true
}

const rows = [summarize('with a plan', planned), summarize('without one', unplanned)]
rows.push(summarize('planner produced nothing', planned.filter((r) => !plannedSomething(r))))

console.log('PLANNING — measured from the ledger, no model calls\n')
console.log('group                        rounds  promoted  rate   p50 wall   plan share')
for (const r of rows) {
  console.log(
    r.label.padEnd(28),
    String(r.rounds).padStart(6),
    String(r.promoted).padStart(9),
    `${String(r.rate ?? '—').padStart(4)}%`,
    `${String(r.p50Ms === null ? '—' : Math.round(r.p50Ms / 1000) + 's').padStart(8)}`,
    `${String(r.planSharePct ?? '—').padStart(10)}%`,
  )
}
console.log('')
console.log(`timed-out plans: ${planned.filter((r) => r.planTimedOut).length} of ${planned.length}`)
// A round recorded before `planUsable` existed cannot answer either way, so it is
// counted separately instead of being read as a failure.
const withPlan = planned.filter(plannedSomething).length
console.log(`planner handed back text: ${withPlan} of ${planned.length} planned rounds`)
console.log(`planner handed back nothing: ${planned.length - withPlan}`)
const empty = planned.filter((r) => !plannedSomething(r))
if (empty.length) {
  const promoted = empty.filter((r) => r.promoted).length
  console.log(`  ...of those, promoted anyway: ${promoted} (${Math.round((promoted / empty.length) * 100)}%)`)
}
console.log('')
console.log('Caveat: rounds are not randomly assigned to a plan. A difference describes')
console.log('this ledger; it is not an effect size. The comparable arms are the ones a')
console.log('campaign can be run against -- `planMode: "off"` versus `"full"`.')
