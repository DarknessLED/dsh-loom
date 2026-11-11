import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const dir = 'research/wave5'
const db = new DatabaseSync('research/kg/store.sqlite')
const live = new Set(db.prepare('SELECT id FROM node').all().map((r) => r.id))
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
const nodes = []
const edges = []
const gaps = []
const seen = new Set()
const problems = []

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'))
  for (const n of j.nodes || []) {
    if (seen.has(n.id)) { problems.push('dup ' + n.id); continue }
    if (!n.title || n.title.length < 12) problems.push('short title ' + n.id)
    if (!n.body || n.body.length < 150) problems.push('thin body ' + n.id)
    seen.add(n.id)
    nodes.push(n)
  }
  for (const e of j.edges || []) edges.push(e)
  // A gap may be a bare sentence; spreading a string yields character keys, so
  // keep the original value and normalise at construction time instead.
  for (const g of j.gaps || []) gaps.push(typeof g === 'string' ? g : { ...g, topic: 'gap' })
}

const known = new Set([...seen, ...live])
for (const e of edges) {
  if (!known.has(e.from)) problems.push('edge from unknown ' + e.from)
  if (!known.has(e.to)) problems.push('edge to unknown ' + e.to)
  if (e.from === e.to) problems.push('self edge ' + e.from)
}

// A gap may be a bare sentence or an object. Both are legitimate agent output;
// normalise here rather than rejecting one shape.
const gapNodes = gaps.map((g, i) => {
  const o = typeof g === 'string' ? { title: g, body: g } : g
  const title = String(o.title || o.body || '').slice(0, 110)
  return {
    id: o.id || 'gap-w5-' + String(i + 1).padStart(3, '0'),
    kind: 'question',
    title,
    body: String(o.body || title),
    source: o.source ?? null,
    confidence: 0.9,
    topic: 'gap',
    tags: ['wave5', 'unmeasured'],
  }
})

fs.writeFileSync(dir + '/_inbox.json', JSON.stringify({ nodes: nodes.concat(gapNodes), edges }))
console.log(JSON.stringify({ files: files.length, nodes: nodes.length, gaps: gapNodes.length, edges: edges.length, problems: problems.slice(0, 12) }, null, 2))
