// How long does a human actually take, and how often does the loop wait for one?
// Uses event timestamps (envelope field `t`, ms epoch) — not `at`.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const waits = []
const byKind = new Map()

for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  let open = null
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'checkpoint.raised') {
      open = { id: String(d.id), kind: String(d.kind ?? 'unknown'), t: Number(e.t) || 0, campaign: c }
    } else if (e.type === 'checkpoint.answered' && open) {
      const t = Number(e.t) || 0
      const waitMs = t - open.t
      if (waitMs >= 0) {
        waits.push({ ...open, waitMs, decision: String(d.decision ?? '') })
        const k = open.kind
        if (!byKind.has(k)) byKind.set(k, [])
        byKind.get(k).push(waitMs / 60000)
      }
      open = null
    }
  }
}

const q = (a, p) => (a.length ? a[Math.floor((a.length - 1) * p)] : null)
const all = waits.map((w) => w.waitMs / 60000).sort((a, b) => a - b)
const humanBusyMinutes = all.reduce((s, x) => s + Math.min(x, 2), 0) // cap at 2 min of genuine attention
const out = {
  checkpointsAnswered: waits.length,
  waitMinutes: {
    p10: +q(all, 0.1)?.toFixed(2),
    median: +q(all, 0.5)?.toFixed(2),
    p90: +q(all, 0.9)?.toFixed(2),
    max: +all[all.length - 1]?.toFixed(1),
    total: +all.reduce((s, x) => s + x, 0).toFixed(1),
  },
  underOneMinute: all.filter((x) => x < 1).length,
  overnightOrAbandoned: all.filter((x) => x > 60).length,
  byKind: {},
  assumedAttentionMinutes: +humanBusyMinutes.toFixed(1),
}
for (const [k, v] of [...byKind].sort()) {
  v.sort((a, b) => a - b)
  out.byKind[k] = { n: v.length, medianMin: +q(v, 0.5).toFixed(2), maxMin: +v[v.length - 1].toFixed(1) }
}
console.log(JSON.stringify(out, null, 2))
