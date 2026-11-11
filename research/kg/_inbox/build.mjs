import fs from 'node:fs'
const raw = JSON.parse(fs.readFileSync('research/wave1.json', 'utf8'))
const nodes = []
const seen = new Set()
for (const n of raw.nodes) {
  if (!n.id || !n.title || seen.has(n.id)) continue
  seen.add(n.id)
  const m = /^([a-z]+)-/.exec(n.id)
  nodes.push({
    id: n.id,
    kind: n.kind ?? 'claim',
    title: String(n.title).slice(0, 300),
    body: String(n.body ?? ''),
    source: n.source ?? null,
    confidence: typeof n.confidence === 'number' ? n.confidence : null,
    topic: n.topic ?? (m ? m[1] : 'misc'),
    tags: Array.isArray(n.tags) ? n.tags : [],
  })
}
const edges = raw.edges.filter((e) => e.from && e.to && e.rel && seen.has(e.from) && seen.has(e.to))
const gaps = (raw.gaps || []).map((g, i) => ({
  id: `gap-w1-${String(i + 1).padStart(3, '0')}`,
  kind: 'question',
  title: String(g).slice(0, 180).replace(/\s+/g, ' '),
  body: String(g),
  topic: 'gap',
}))
fs.writeFileSync('research/kg/_inbox/wave1.json', JSON.stringify({ nodes: [...nodes, ...gaps], edges }))
console.log('nodes', nodes.length, 'gaps', gaps.length, 'edges', edges.length)
