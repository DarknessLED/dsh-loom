// Why does the explore slot never pass in 9 campaigns? Two candidates: the agent
// cannot do the task, or the task's verifier was already failing on the base tree
// (so no patch could ever earn it). The ledger records checks.baseFailed and
// checks.verifierOk separately, so this is answerable without a model.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rows = []
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'gate.evaluated') rows.push({ campaign: c, ...d })
    if (e.type === 'verifier.finished') rows.push({ campaign: c, verify: true, ...d })
  }
}

// gate.evaluated carries the decision inputs; count how often the base tree
// already failed the task's verifier (earned === false means base did not fail).
const gates = rows.filter((r) => !r.verify)
const stats = {
  gates: gates.length,
  baseFailedTrue: gates.filter((g) => (g.checks || {}).baseFailed === true).length,
  baseFailedFalse: gates.filter((g) => (g.checks || {}).baseFailed === false).length,
  baseFailedMissing: gates.filter((g) => !('baseFailed' in (g.checks || {}))).length,
  verifierOk: gates.filter((g) => (g.checks || {}).verifierOk === true).length,
  testsClean: gates.filter((g) => (g.checks || {}).testsClean === true).length,
  hasPatch: gates.filter((g) => (g.checks || {}).hasPatch === true).length,
  noop: gates.filter((g) => (g.checks || {}).noop === true).length,
  holdoutTrue: gates.filter((g) => (g.checks || {}).holdout === true).length,
  holdoutFalse: gates.filter((g) => (g.checks || {}).holdout === false).length,
  holdoutSkipped: gates.filter((g) => (g.checks || {}).holdout === 'skipped' || (g.checks || {}).holdout === undefined).length,
}

// Cross-tab: of the gates where the verifier passed, how many were unearned
// because the base tree already passed (baseFailed === false)?
const vp = gates.filter((g) => (g.checks || {}).verifierOk === true)
stats.verifierPassed = vp.length
stats.verifierPassedButBasePassed = vp.filter((g) => (g.checks || {}).baseFailed === false).length
stats.promoted = gates.filter((g) => g.promoted === true).length
stats.promotedWithoutVerifier = gates.filter((g) => g.promoted === true && (g.checks || {}).verifierOk !== true).length
stats.promotedWithoutPatch = gates.filter((g) => g.promoted === true && (g.checks || {}).hasPatch !== true).length

// Per-campaign failure profile for the always-zero campaigns.
const byCampaign = new Map()
for (const g of gates) {
  if (!byCampaign.has(g.campaign)) byCampaign.set(g.campaign, [])
  byCampaign.get(g.campaign).push(g.checks || {})
}
const zero = [...byCampaign.entries()]
  .filter(([, gs]) => gs.length >= 2 && gs.every((g) => g.verifierOk === false))
  .map(([c, gs]) => ({
    campaign: c,
    gates: gs.length,
    baseFailedTrue: gs.filter((g) => g.baseFailed === true).length,
    baseFailedFalse: gs.filter((g) => g.baseFailed === false).length,
    noPatch: gs.filter((g) => g.hasPatch === false).length,
    noop: gs.filter((g) => g.noop === true).length,
    exampleError: gs.map((g) => g.error).filter(Boolean).slice(0, 2),
  }))

console.log(JSON.stringify({ stats, alwaysZeroCampaigns: zero.length, zero }, null, 2))
