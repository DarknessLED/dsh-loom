// The single-line fix test: if the base verdict also returned the base's metrics,
// would the gate be able to see the improvement the ledger actually measured?
// This is a dry replay, not a code change - it asks whether fixing one function
// would have changed any decision on the graded rounds.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const gates = []
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'gate.evaluated') gates.push({ campaign: c, ...e.data })
  }
}

// Replay each gate under the proposed rule: earned = baseFailed or the metric
// beat the base's metric. The base's metric is 0.5 for the graded task (measured
// live: check.mjs prints QUALITY=0.500 on the base tree, 2026-11-12).
const BASE_METRIC = { graded: 0.5 }
const flips = []
for (const g of gates) {
  const checks = g.checks || {}
  const baseFailed = checks.baseFailed
  const metric = Number(g.score)
  const primary = g.primary ?? 'quality'
  const baseValue = BASE_METRIC.graded
  // The old rule: earned unless the base was measured passing. The proposed rule
  // only *replaces* that verdict in the one case old rule refuses - base passed -
  // and even then keeps the patch if the task's own metric improved on the base.
  const earnedOld = baseFailed !== false
  const improved = Number.isFinite(metric) && metric > baseValue
  const earnedNew = baseFailed === false ? improved : earnedOld
  if (earnedOld !== earnedNew) {
    flips.push({ campaign: g.campaign, round: g.round, score: g.score, baseFailed, earnedOld, earnedNew, promoted: g.promoted })
  }
}

console.log(JSON.stringify({
  gates: gates.length,
  gatesWithBaseFailedFalse: gates.filter((g) => (g.checks || {}).baseFailed === false).length,
  decisionsChangedByProposedRule: flips.length,
  flips,
}, null, 2))
