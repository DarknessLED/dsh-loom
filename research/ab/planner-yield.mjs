// Did the planner leg ever hand the round a plan it could use?
// `planUsable` is the round's own verdict on that; `node.finished.ok` is the
// planner's. Both are recorded, so this is a count, not an opinion.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ROOT = join(homedir(), '.dsh', 'loom', 'campaigns')
let runs = 0, ok = 0, aborted = 0, timedOut = 0, ms = 0
let rounds = 0, usable = 0, unusable = 0, unknown = 0
const perField = new Map()
for (const id of readdirSync(ROOT)) {
  const f = join(ROOT, id, 'events.jsonl')
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'node.finished' && (e.data?.role === 'planner' || e.data?.id === 'recon')) {
      runs++
      if (e.data.ok === true) ok++
      if (e.data.stopReason === 'aborted') aborted++
      if (e.data.timedOut === true) timedOut++
      ms += Number(e.data.durationMs) || 0
      const k = `${e.data.ok}/${e.data.stopReason}/${e.data.timedOut}`
      perField.set(k, (perField.get(k) ?? 0) + 1)
    }
    if (e.type === 'round.finished') {
      rounds++
      const u = e.data?.planUsable
      if (u === true) usable++
      else if (u === false) unusable++
      else unknown++
    }
  }
}
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '-')
console.log(`planner runs: ${runs}  ok=${ok} (${pct(ok, runs)})  aborted=${aborted} (${pct(aborted, runs)})  timedOut=${timedOut}  total=${Math.round(ms / 1000)} s  mean=${runs ? Math.round(ms / runs / 1000) : 0} s`)
console.log(`rounds: ${rounds}  planUsable=true ${usable} (${pct(usable, rounds)})  false ${unusable}  absent ${unknown}`)
console.log('planner outcome field combos (ok/stopReason/timedOut):')
for (const [k, v] of [...perField].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(28)} ${v}`)
