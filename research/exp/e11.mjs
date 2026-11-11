// Two things the ledger can settle cheaply, neither requiring a model:
//  1. how much wall clock a round spends OUTSIDE the subagent (loop overhead)
//  2. how much of the ledger is written by a human vs the loop itself
// The event envelope is { seq, t, type, actor, data } -- time is `t`, ms epoch.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const root = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')

const rounds = []
const actors = {}
let events = 0
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const started = new Map()
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    events += 1
    actors[e.actor || 'none'] = (actors[e.actor || 'none'] || 0) + 1
    const d = e.data || {}
    if (e.type === 'round.started') started.set(d.n, e.t)
    if (e.type === 'round.finished') {
      const at = started.get(d.round ?? d.n)
      if (!Number.isFinite(at)) continue
      rounds.push({ campaign: c, n: d.round ?? d.n, wallMs: e.t - at, status: d.status })
    }
  }
}
const stat = (a) => {
  if (!a.length) return { n: 0 }
  const s = [...a].sort((x, y) => x - y)
  const sum = s.reduce((x, y) => x + y, 0)
  return { n: s.length, p10: s[Math.floor(s.length * 0.1)], median: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)], mean: Math.round(sum / s.length), totalHours: +(sum / 3600000).toFixed(2) }
}
const wall = rounds.map((r) => r.wallMs).filter((n) => Number.isFinite(n) && n > 1000)
console.log(JSON.stringify({ events, byActor: actors, roundsMeasured: wall.length, roundWallClock: stat(wall) }, null, 2))
