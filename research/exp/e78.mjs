// The realistic re-rank: expand from the top hit only (no closure over 40 results),
// then measure top-10 hit rate against the FTS baseline. This is what a UI can do
// without knowing the answer in advance.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const KG = path.join('research', 'kg', 'kg.mjs')
const run = (args) => { try { return execFileSync(process.execPath, [KG, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }) } catch (e) { return String(e.stdout ?? '') } }
const sql = (q) => { const o = run(['sql', q]); const s = o.indexOf('['); if (s < 0) throw new Error('no json'); return JSON.parse(o.slice(s)) }

const answers = sql('SELECT gap_id, node_id FROM gap_answer').map((r) => [r.gap_id, r.node_id])
const titleOf = new Map(sql("SELECT id, title FROM node WHERE status='live'").map((r) => [r.id, r.title]))
const answerOf = new Map(answers)
const search = (q, limit = 40) => { const o = run(['search', '--json', q, '--limit', String(limit)]); const s = o.indexOf('['); if (s < 0) return []; try { return JSON.parse(o.slice(s)).map((r) => r.id) } catch { return [] } }

let base10 = 0, seed10 = 0, n = 0, expanded = 0, useful = 0
for (const [q, want] of answers) {
  const t = titleOf.get(q); if (!t) continue
  const hits = search(t); if (!hits.length) continue
  n += 1
  const top = hits[0]
  const a = answerOf.get(top)
  if (a) { expanded += 1; if (a === want) useful += 1 }
  const seeded = a && !hits.slice(0, 10).includes(a) ? [a, ...hits.slice(0, 9)] : hits.slice(0, 10)
  if (hits.indexOf(want) >= 0 && hits.indexOf(want) < 10) base10 += 1
  if (seeded.includes(want)) seed10 += 1
}
console.log(`n=${n}`)
console.log(`FTS top-10 contains the answer: ${base10} (${(base10 / n * 100).toFixed(1)}%)`)
console.log(`top-10 after one-hop expansion from the top hit: ${seed10} (${(seed10 / n * 100).toFixed(1)}%)`)
console.log(`cases where the top hit had a recorded answer: ${expanded}; of those the answer was the one asked for: ${useful}`)
console.log(`cost: one extra node lookup per query, no index change`)
fs.writeFileSync(path.join('research', 'exp', 'e78.json'), JSON.stringify({ n, base10, seed10, expanded, useful }, null, 2))
