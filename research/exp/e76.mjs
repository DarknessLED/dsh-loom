// gap-kg-001: should recorded answers and contradictions re-rank search results?
//
// e64 measured that answers reach top-10 only 27.3% of the time and contradiction
// partners 18.4%. The gap asks whether promoting the recorded relations would help,
// and what it costs when the record is wrong.
//
// This simulates the re-rank offline with the real FTS index: run the query, take
// the top N, boost any hit that is (a) a recorded answer to a question in the result
// set, or (b) a contradiction partner of a hit, then re-sort. Then measure hit@10
// before and after, and count how many results moved because of a relation that
// points at a *different* question than the one searched (the wrong-record cost).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const KG = path.join('research', 'kg', 'kg.mjs')
const run = (args) => {
  try { return execFileSync(process.execPath, [KG, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }) }
  catch (e) { return String(e.stdout ?? '') + String(e.stderr ?? '') }
}
// kg sql returns JSON. The first version of this helper assumed pipe-separated
// rows, matched nothing, and produced 'cases with a non-empty result set: 0' --
// a plausible-looking measurement of nothing. Assert the shape before trusting it.
const sql = (q) => {
  const out = run(['sql', q])
  const start = out.indexOf('[')
  if (start < 0) throw new Error(`kg sql returned no JSON for: ${q}\n${out.slice(0, 300)}`)
  const rows = JSON.parse(out.slice(start))
  if (!Array.isArray(rows)) throw new Error(`kg sql did not return an array for: ${q}`)
  return rows
}

const answers = sql('SELECT gap_id, node_id FROM gap_answer').map((r) => [r.gap_id, r.node_id])
const contrad = sql("SELECT from_id, to_id FROM edge WHERE rel='contradicts'").map((r) => [r.from_id, r.to_id])

if (!answers.length || !contrad.length) throw new Error(`empty join: ${answers.length} answers, ${contrad.length} contradictions`)

const titleOf = new Map()
for (const r of sql("SELECT id, title FROM node WHERE status='live'")) titleOf.set(r.id, r.title)

const partner = new Map()
const addPartner = (k, v) => { const cur = partner.get(k); if (cur) cur.push(v); else partner.set(k, [v]) }
for (const [a, b] of contrad) { addPartner(a, b); addPartner(b, a) }
const answerOf = new Map()
for (const [q, n] of answers) answerOf.set(q, n)

// Rank a node by the real index for a query, via kg search --json.
const search = (query, limit = 40) => {
  const out = run(['search', '--json', query, '--limit', String(limit)])
  const start = out.indexOf('[')
  if (start < 0) return []
  try { return JSON.parse(out.slice(start)).map((r) => r.id) } catch { return [] }
}

const CASES = [] // {query, want, label}
for (const [q, n] of answers) {
  const title = titleOf.get(q)
  if (!title) continue
  CASES.push({ query: title, want: n, label: `answer:${q}` })
}
// Contradiction pairs: searching A should surface B.
for (const [a, b] of contrad.slice(0, 40)) {
  const title = titleOf.get(a)
  if (!title) continue
  CASES.push({ query: title, want: b, label: `contradicts:${a}` })
}

const rerank = (hits) => {
  const score = new Map()
  hits.forEach((id, i) => score.set(id, hits.length - i))
  const boost = new Map()
  for (const id of hits) {
    const a = answerOf.get(id)
    if (a) boost.set(a, 2)
    for (const p of partner.get(id) ?? []) boost.set(p, 1)
    if (answerOf.has(id)) boost.set(id, 1) // a question that is answered is more concrete
  }
  const all = new Set([...hits, ...boost.keys()])
  return [...all]
    .map((id) => ({ id, s: (score.get(id) ?? 0) + (boost.get(id) ?? 0) * 3 }))
    .sort((x, y) => y.s - x.s)
    .map((x) => x.id)
}

let before = 0
let after = 0
let beforeTop40 = 0
let afterTop40 = 0
let moved = 0
let movedByWrongRecord = 0
const detail = []
for (const c of CASES) {
  const hits = search(c.query)
  if (!hits.length) continue
  const r = rerank(hits)
  const bIdx = hits.indexOf(c.want)
  const aIdx = r.indexOf(c.want)
  if (bIdx >= 0 && bIdx < 10) before += 1
  if (aIdx >= 0 && aIdx < 10) after += 1
  if (bIdx >= 0) beforeTop40 += 1
  if (aIdx >= 0) afterTop40 += 1
  const changed = r.slice(0, 10).filter((id, i) => hits[i] !== id).length
  moved += changed
  detail.push({ label: c.label, before: bIdx, after: aIdx, changed, n: hits.length })
  // wrong-record cost: a boosted id whose relation does not involve the searched node
  for (const id of r.slice(0, 10)) {
    if (hits.slice(0, 10).includes(id)) continue
    const isAnswerToHit = hits.some((h) => answerOf.get(h) === id)
    const isPartnerOfHit = hits.some((h) => (partner.get(h) ?? []).includes(id))
    if (!isAnswerToHit && !isPartnerOfHit) movedByWrongRecord += 1
  }
}

const n = detail.length
console.log(`cases with a non-empty result set: ${n} (answers ${answers.length}, contradiction pairs ${Math.min(40, contrad.length)})`)
console.log(`answer/partner in top-10: before ${before} (${(before / n * 100).toFixed(1)}%) -> after ${after} (${(after / n * 100).toFixed(1)}%)`)
console.log(`answer/partner in top-40: before ${beforeTop40} (${(beforeTop40 / n * 100).toFixed(1)}%) -> after ${afterTop40} (${(afterTop40 / n * 100).toFixed(1)}%)`)
console.log(`slots changed in top-10 across all cases: ${moved}`)
console.log(`of the promoted ids, ones whose relation does not involve any hit: ${movedByWrongRecord}`)
const movedCases = detail.filter((d) => d.changed > 0)
console.log(`cases where the top-10 changed at all: ${movedCases.length}`)
for (const d of movedCases.slice(0, 12)) console.log(`  ${d.label}: rank ${d.before} -> ${d.after} (${d.changed} slots, ${d.n} hits)`)

fs.writeFileSync(path.join('research', 'exp', 'e76.json'), JSON.stringify({ n, before, after, beforeTop40, afterTop40, moved, movedByWrongRecord, detail }, null, 2))
