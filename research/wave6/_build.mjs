import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const dir = 'research/wave6'
const db = new DatabaseSync('research/kg/store.sqlite')
const live = new Set(db.prepare('SELECT id FROM node').all().map((r) => r.id))
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
const KINDS = new Set(['claim','concept','project','source','question','failure','number','analysis'])
const RELS = new Set(['supports','contradicts','refines','requires','supersedes','applies-to','derived-from','measures','fails-at','same-as'])
const nodes = []
const edges = []
const gaps = []
const seen = new Set()
const problems = []

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'))
  for (const n of j.nodes || []) {
    if (seen.has(n.id)) { problems.push('dup ' + n.id); continue }
    if (!KINDS.has(n.kind)) problems.push('bad kind ' + n.id + ' ' + n.kind)
    if (!n.title || n.title.length < 12) problems.push('short title ' + n.id)
    if (!n.body || n.body.length < 150) problems.push('thin body ' + n.id)
    if (!n.source) problems.push('no source ' + n.id)
    seen.add(n.id)
    nodes.push(n)
  }
  for (const e of j.edges || []) edges.push(e)
  for (const g of j.gaps || []) gaps.push(typeof g === 'string' ? g : { ...g, topic: 'gap' })
}

// An agent may name a relation we do not store; skipping the edge silently is
// how wave3 lost 32 of them, so record and repair instead.
const RELMAP = { challenges: 'contradicts', falsifies: 'contradicts', undermines: 'contradicts', refutes: 'contradicts',
  explains: 'supports', confirms: 'supports', validates: 'supports', enables: 'requires', needs: 'requires',
  extends: 'refines', improves: 'refines', replaces: 'supersedes', obsoletes: 'supersedes', applies: 'applies-to',
  derives: 'derived-from', derives_from: 'derived-from', measures_metric: 'measures', 'breaks-at': 'fails-at',
  equals: 'same-as' }
const mapped = []
for (const e of edges) {
  if (!RELS.has(e.rel) && RELMAP[e.rel]) {
    mapped.push(e.rel)
    e.note = (e.note ? e.note + '; ' : '') + 'relation mapped from ' + e.rel
    e.rel = RELMAP[e.rel]
  }
}

const known = new Set([...seen, ...live])
const bad = []
for (const e of edges) {
  if (!RELS.has(e.rel)) { bad.push('bad rel ' + e.from + ' -' + e.rel + '-> ' + e.to); continue }
  if (!known.has(e.from)) bad.push('edge from unknown ' + e.from)
  if (!known.has(e.to)) bad.push('edge to unknown ' + e.to)
  if (e.from === e.to) bad.push('self edge ' + e.from)
}
problems.push(...bad)

const gapNodes = gaps.map((g, i) => {
  const o = typeof g === 'string' ? { title: g, body: g } : g
  const title = String(o.title || o.body || '').slice(0, 110)
  return {
    id: o.id || 'gap-w6-' + String(i + 1).padStart(3, '0'),
    kind: 'question',
    title,
    body: String(o.body || title),
    source: o.source ?? null,
    confidence: 0.9,
    topic: 'gap',
    tags: ['wave6', 'unmeasured'],
  }
})

fs.writeFileSync(dir + '/_inbox.json', JSON.stringify({ nodes: nodes.concat(gapNodes), edges }))
console.log(JSON.stringify({ files: files.length, nodes: nodes.length, gaps: gapNodes.length, edges: edges.length, mapped, problems: problems.slice(0, 20), problemCount: problems.length }, null, 2))
