import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const root = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rows = []
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const r = { campaign: c, rounds: 0, promoted: 0, checkpoints: 0, applied: 0, unlanded: 0 }
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.finished') { r.rounds += 1; if (d.status === 'promoted') r.promoted += 1 }
    if (e.type === 'checkpoint.raised') r.checkpoints += 1
    if (e.type === 'autopilot.applied') r.applied += 1
    if (e.type === 'round.unlanded') r.unlanded += 1
  }
  rows.push(r)
}
const gated = rows.filter((r) => r.checkpoints > 0 && r.rounds > 0)
const silent = rows.filter((r) => r.checkpoints === 0 && r.rounds > 0)
const s = (set, k) => set.reduce((a, r) => a + r[k], 0)
const pct = (n, d) => (d ? +((100 * n) / d).toFixed(2) : null)
console.log(JSON.stringify({
  all: { campaigns: rows.length, promotions: s(rows, 'promoted'), applied: s(rows, 'applied'), unlanded: s(rows, 'unlanded'), unlandedPerPromotionPct: pct(s(rows, 'unlanded'), s(rows, 'promoted')) },
  gated: { campaigns: gated.length, promotions: s(gated, 'promoted'), unlanded: s(gated, 'unlanded'), pct: pct(s(gated, 'unlanded'), s(gated, 'promoted')) },
  silent: { campaigns: silent.length, promotions: s(silent, 'promoted'), unlanded: s(silent, 'unlanded'), pct: pct(s(silent, 'unlanded'), s(silent, 'promoted')) },
  note: 'unlanded = an autopilot.applied whose patch was never confirmed by a commit; the promotion did not stick.',
}, null, 2))
