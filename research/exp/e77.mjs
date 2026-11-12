// The e76 rerank hit@40 = 100% is suspicious. Test whether it is reachability
// rather than relevance: rebuild the boost set from only the FIRST seed hit instead
// of all 40, which removes the closure effect. If hit@40 stays at 100%, the metric
// is measuring reachability. If it drops to the FTS level, e76's 100% was circular.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const KG = path.join('research', 'kg', 'kg.mjs')
const run = (args) => {
  try { return execFileSync(process.execPath, [KG, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }) }
  catch (e) { return String(e.stdout ?? '') + String(e.stderr ?? '') }
}
const sql = (q) => {
  const out = run(['sql', q])
  const start = out.indexOf('[')
  if (start < 0) throw new Error(`kg sql returned no JSON: ${out.slice(0, 200)}`)
  return JSON.parse(out.slice(start))
}

const answers = sql('SELECT gap_id, node_id FROM gap_answer').map((r) => [r.gap_id, r.node_id])
const titleOf = new Map(sql("SELECT id, title FROM node WHERE status='live'").map((r) => [r.id, r.title]))
const answerOf = new Map(answers)

const search = (query, limit = 40) => {
  const out = run(['search', '--json', query, '--limit', String(limit)])
  const start = out.indexOf('[')
  if (start < 0) return []
  try { return JSON.parse(out.slice(start)).map((r) => r.id) } catch { return [] }
}

let seedTop10 = 0
let closureTop40 = 0
let seedTop40 = 0
let n = 0
let predictedOnly = 0
for (const [q, want] of answers) {
  const title = titleOf.get(q)
  if (!title) continue
  const hits = search(title)
  if (!hits.length) continue
  n += 1
  // closure: boost from every hit (what e76 did)
  const closure = new Set(hits)
  for (const h of hits) { const a = answerOf.get(h); if (a) closure.add(a) }
  // seed-only: boost from the top hit alone
  const seed = new Set([hits[0]])
  const a0 = answerOf.get(hits[0])
  if (a0) seed.add(a0)
  if (hits.indexOf(want) >= 0 && hits.indexOf(want) < 10) seedTop10 += 1
  if (hits.indexOf(want) >= 0 && hits.indexOf(want) < 40) seedTop40 += 1
  if (closure.has(want)) closureTop40 += 1
  if (!hits.includes(want) && !seed.has(want)) predictedOnly += 1
}

console.log(`answer cases with hits: ${n}`)
console.log(`FTS top-10 contains the answer: ${seedTop10} (${(seedTop10 / n * 100).toFixed(1)}%)`)
console.log(`FTS top-40 contains the answer: ${seedTop40} (${(seedTop40 / n * 100).toFixed(1)}%)`)
console.log(`e76 closure (any of 40 hits' answer) would include it: ${closureTop40} (${(closureTop40 / n * 100).toFixed(1)}%)`)
console.log(`  => closure counts ${closureTop40 - seedTop40} answers that FTS never returned, purely by reachability`)
console.log(`answer reachable from the TOP HIT alone (seed boost): ${[...answers].filter(([q, want]) => { const t = titleOf.get(q); if (!t) return false; const h = search(t); return h.length && (h[0] === want || answerOf.get(h[0]) === want) }).length}`)
console.log(`cases where the answer is neither an FTS hit nor the top hit's answer: ${predictedOnly}`)
fs.writeFileSync(path.join('research', 'exp', 'e77.json'), JSON.stringify({ n, seedTop10, seedTop40, closureTop40, predictedOnly }, null, 2))
