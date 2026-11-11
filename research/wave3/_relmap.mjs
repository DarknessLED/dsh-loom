// The wave3 agents invented relation names the store does not know. Map each to
// the closest declared relation instead of dropping the edge, and report the map
// so the vocabulary stays visible rather than silent.
import fs from 'node:fs'
const MAP = {
  challenges: 'contradicts', falsifies: 'contradicts', threatens: 'contradicts',
  confounds: 'contradicts', warns: 'contradicts', undermines: 'contradicts',
  reinforces: 'supports', grounds: 'supports',
  'depends-on': 'requires', constrains: 'requires',
  explains: 'refines', decomposes: 'refines', operationalises: 'applies-to',
  quantifies: 'measures', caused: 'derived-from', relates: 'same-as',
}
const j = JSON.parse(fs.readFileSync('research/wave3/_inbox.json', 'utf8'))
const used = {}
const fixed = j.edges.map((e) => {
  const to = MAP[e.rel]
  if (!to) return e
  used[e.rel] = (used[e.rel] || 0) + 1
  return { ...e, rel: to, note: (e.note ? e.note + ' ' : '') + '(relation mapped from "' + e.rel + '")' }
})
j.edges = fixed
fs.writeFileSync('research/wave3/_inbox2.json', JSON.stringify(j))
console.log(JSON.stringify({ mapped: used, edges: j.edges.length }, null, 1))
