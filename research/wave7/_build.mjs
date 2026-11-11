// Merge the wave7 topic files into one importable payload.
//
// Copied from the wave4 builder with the three edits every wave needs: the
// directory, the gap prefix, and the gap label. Two more are inherited from
// wave3/wave6, where a bad relation name silently dropped 32 edges: a whitelist
// for kinds and relations, and a mapping for the names agents invent anyway.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const KINDS = ['claim', 'concept', 'project', 'source', 'question', 'failure', 'number', 'analysis']
const RELS = ['supports', 'contradicts', 'refines', 'requires', 'supersedes', 'applies-to', 'derived-from', 'measures', 'fails-at', 'same-as']
const RELMAP = {
  challenges: 'contradicts', falsifies: 'contradicts', undermines: 'contradicts', disproves: 'contradicts',
  confirms: 'supports', corroborates: 'supports', evidences: 'supports', exemplifies: 'supports',
  explains: 'refines', extends: 'refines', generalises: 'refines', generalizes: 'refines', sharpens: 'refines',
  needs: 'requires', depends_on: 'requires', 'depends-on': 'requires', presupposes: 'requires',
  replaces: 'supersedes', obsoletes: 'supersedes',
  'applies_to': 'applies-to', 'applies to': 'applies-to', informs: 'applies-to',
  'derived_from': 'derived-from', 'derived from': 'derived-from', follows_from: 'derived-from',
  quantifies: 'measures', estimates: 'measures', gauges: 'measures',
  'fails_at': 'fails-at', breaks: 'fails-at', prevents: 'contradicts',
  equivalent_to: 'same-as', 'same_as': 'same-as', duplicates: 'same-as',
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== '_inbox.json')
const nodes = []
const edges = []
const gaps = []
const problems = []
const mapped = []

for (const f of files) {
  let doc
  try { doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) } catch (err) {
    problems.push(`${f}: ${err.message}`)
    continue
  }
  for (const n of doc.nodes || []) {
    if (!n?.id || !n?.title) { problems.push(`${f}: node without id/title`); continue }
    if (!KINDS.includes(n.kind)) { problems.push(`${f}: ${n.id} kind ${n.kind}`); continue }
    if (String(n.title).length < 12) problems.push(`${f}: ${n.id} short title`)
    if (String(n.body || '').length < 150) problems.push(`${f}: ${n.id} short body`)
    nodes.push({ topic: n.topic || path.basename(f, '.json'), ...n })
  }
  for (const e of doc.edges || []) {
    if (!e?.from || !e?.to || !e?.rel) { problems.push(`${f}: edge without from/to/rel`); continue }
    let rel = String(e.rel)
    if (!RELS.includes(rel)) {
      const mappedRel = RELMAP[rel.toLowerCase().replace(/\s+/g, '_')] ?? RELMAP[rel.toLowerCase()] ?? null
      if (!mappedRel) { problems.push(`${f}: ${e.from} -${rel}-> ${e.to} (no mapping)`); continue }
      mapped.push(`${rel} -> ${mappedRel}`)
      rel = mappedRel
    }
    edges.push({ from: e.from, rel, to: e.to, note: e.rel === rel ? e.note : `${e.note ? e.note + ' | ' : ''}relation mapped from ${e.rel}` })
  }
  const gs = doc.gaps || []
  for (const [i, g] of gs.entries()) {
    gaps.push(typeof g === 'string'
      ? { id: `gap-w7-${String(gaps.length + 1).padStart(3, '0')}`, kind: 'question', title: g.slice(0, 120), body: g, topic: 'gap' }
      : { ...g, topic: 'gap', id: g.id || `gap-w7-${String(gaps.length + 1).padStart(3, '0')}` })
  }
}

// Every edge endpoint must exist either in this batch or already in the graph.
const known = new Set(nodes.map((n) => n.id))
try {
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync('C:/Projects/RSI/research/kg/store.sqlite')
  for (const row of db.prepare('SELECT id FROM node').all()) known.add(row.id)
  db.close()
} catch { /* a missing graph only means every endpoint must be local */ }

const kept = edges.filter((e) => {
  const ok = known.has(e.from) && known.has(e.to)
  if (!ok) problems.push(`dangling edge ${e.from} -${e.rel}-> ${e.to}`)
  return ok
})

const payload = { nodes: [...nodes, ...gaps], edges: kept }
fs.writeFileSync(path.join(DIR, '_inbox.json'), JSON.stringify(payload, null, 1))
console.log(JSON.stringify({ files: files.length, nodes: nodes.length + gaps.length, gaps: gaps.length, edges: kept.length, mapped: [...new Set(mapped)], problems: problems.slice(0, 20), problemCount: problems.length }, null, 2))
