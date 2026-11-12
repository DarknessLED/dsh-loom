// e78 reported 95% -- but the query is the question's own title, so the top hit is
// usually the question itself, and a question's recorded answer is the answer by
// definition. That is reachability of a tautology, not retrieval quality.
//
// The honest version drops the query node from the hit list and asks whether the
// answer is reachable from what remains.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const KG = path.join('research', 'kg', 'kg.mjs')
const run = (a) => { try { return execFileSync(process.execPath, [KG, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }) } catch (e) { return String(e.stdout ?? '') } }
const sql = (q) => { const o = run(['sql', q]); const s = o.indexOf('['); if (s < 0) throw new Error('no json'); return JSON.parse(o.slice(s)) }
const answers = sql('SELECT gap_id, node_id FROM gap_answer').map((r) => [r.gap_id, r.node_id])
const titleOf = new Map(sql("SELECT id, title FROM node WHERE status='live'").map((r) => [r.id, r.title]))
const answerOf = new Map(answers)
const search = (q, limit = 40) => { const o = run(['search', '--json', q, '--limit', String(limit)]); const s = o.indexOf('['); if (s < 0) return []; try { return JSON.parse(o.slice(s)).map((r) => r.id) } catch { return [] } }

let n = 0, base10 = 0, exp10 = 0, topIsSelf = 0, topHadAnswer = 0, useful = 0
const rows = []
for (const [q, want] of answers) {
  const t = titleOf.get(q); if (!t) continue
  const raw = search(t); if (!raw.length) continue
  if (raw[0] === q) topIsSelf += 1
  const hits = raw.filter((id) => id !== q)          // never let the question answer itself
  if (!hits.length) continue
  n += 1
  const base = hits.indexOf(want) >= 0 && hits.indexOf(want) < 10
  if (base) base10 += 1
  const a = answerOf.get(hits[0])
  if (a) { topHadAnswer += 1; if (a === want) useful += 1 }
  const seeded = a && !hits.slice(0, 10).includes(a) ? [a, ...hits.slice(0, 9)] : hits.slice(0, 10)
  const after = seeded.includes(want)
  if (after) exp10 += 1
  rows.push({ q, want, base, after, topGivesAnswer: a ?? null, topGivesTheAnswer: a === want })
}
console.log(`answers: ${answers.length}; queries whose first hit was the question itself: ${topIsSelf}`)
console.log(`n (after dropping the query node): ${n}`)
console.log(`FTS top-10 contains the answer:        ${base10} (${(base10 / n * 100).toFixed(1)}%)`)
console.log(`top-10 after one-hop from the top hit: ${exp10} (${(exp10 / n * 100).toFixed(1)}%)`)
console.log(`  net gain: ${exp10 - base10}`)
console.log(`top hit's recorded answer === the answer wanted: ${useful} of ${topHadAnswer} cases where the top hit had one`)
fs.writeFileSync(path.join('research', 'exp', 'e79.json'), JSON.stringify({ n, base10, exp10, topIsSelf, topHadAnswer, useful, rows }, null, 2))
