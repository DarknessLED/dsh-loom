// Follow-through on exp-human-001: did the 50 answered checkpoints buy anything?
// Compare later outcomes for campaigns that went through a human gate vs those
// that ran entirely on autopilot. Same ledger, no model.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const home = process.env.LOOM_HOME || path.join(os.homedir(), '.dsh', 'loom')
const root = path.join(home, 'campaigns')

const rows = []
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const r = { campaign: c, rounds: 0, promoted: 0, checkpoints: 0, autopilotApplied: 0, reverted: 0, laterFailure: 0, answerModes: {} }
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.finished') {
      r.rounds += 1
      if (d.status === 'promoted') r.promoted += 1
      if (d.status === 'holdout-failed' || d.status === 'no-gain' || d.status === 'interrupted') r.laterFailure += 1
    }
    if (e.type === 'checkpoint.raised') r.checkpoints += 1
    if (e.type === 'checkpoint.answered') { const m = d.decision || 'unknown'; r.answerModes[m] = (r.answerModes[m] || 0) + 1 }
    if (e.type === 'autopilot.applied') r.autopilotApplied += 1
    if (e.type === 'patch.reverted' || e.type === 'promotion.reverted') r.reverted += 1
  }
  rows.push(r)
}

const gated = rows.filter((r) => r.checkpoints > 0 && r.rounds > 0)
const silent = rows.filter((r) => r.checkpoints === 0 && r.rounds > 0)
const agg = (set, k) => set.reduce((a, r) => a + r[k], 0)
const rate = (set, k) => (agg(set, 'rounds') ? +(agg(set, k) / agg(set, 'rounds')).toFixed(4) : null)
const modes = {}
for (const r of rows) for (const [k, v] of Object.entries(r.answerModes)) modes[k] = (modes[k] || 0) + v

console.log(JSON.stringify({
  gatedCampaigns: gated.length, silentCampaigns: silent.length,
  gated: { rounds: agg(gated, 'rounds'), promoted: agg(gated, 'promoted'), promoteRate: rate(gated, 'promoted'), revertRate: rate(gated, 'reverted') },
  silent: { rounds: agg(silent, 'rounds'), promoted: agg(silent, 'promoted'), promoteRate: rate(silent, 'promoted'), revertRate: rate(silent, 'reverted') },
  revertedTotal: agg(rows, 'reverted'),
  answerModes: modes,
}, null, 2))
