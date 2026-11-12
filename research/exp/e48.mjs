// Duplicate hunt. The graph grew by appending eight waves of agents, each of
// which wrote its own vocabulary for the same findings; the question is whether
// the corpus now contains the same claim more than once, which would inflate
// every count that reads it.
//
// Two signals, because either alone is misleading: token overlap on the title
// finds rephrasings, and shared source URL finds copies. Neither is a decision --
// this only ranks candidates for a human to merge.
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('research/kg/store.sqlite')
const rows = db.prepare("SELECT id, kind, topic, title, coalesce(body,'') body FROM node WHERE status='live'").all()
db.close()

const STOP = new Set(('the a an of to in on for and or is are was were be been it its this that these those '
  + 'with without from by as at into over under not no more less than then when where which who what how why '
  + 'can could may might must should would do does did has have had one two three per so if but also only most '
  + 'their our we us they them he she you your i').split(' '))
const toks = (s) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
const set = (s) => new Set(toks(s))

const pairs = []
for (let i = 0; i < rows.length; i += 1) {
  const a = rows[i]
  const ta = set(a.title + ' ' + a.body)
  const wa = new Set(toks(a.title))
  if (!wa.size) continue
  for (let j = i + 1; j < rows.length; j += 1) {
    const b = rows[j]
    const wb = new Set(toks(b.title))
    if (!wb.size) continue
    // title jaccard first: it is the cheap gate, and a pair that shares no title
    // words is not a duplicate however much prose they share.
    let inter = 0
    for (const w of wa) if (wb.has(w)) inter += 1
    const jac = inter / (wa.size + wb.size - inter)
    if (jac < 0.34) continue
    const tb = set(b.title + ' ' + b.body)
    let bi = 0
    for (const w of ta) if (tb.has(w)) bi += 1
    const bjac = bi / (ta.size + tb.size - bi)
    pairs.push({ a: a.id, b: b.id, ka: a.kind, kb: b.kind, ta: a.topic, tb: b.topic, jac: +jac.toFixed(3), bjac: +bjac.toFixed(3), at: a.title.slice(0, 62), bt: b.title.slice(0, 62) })
  }
}
pairs.sort((x, y) => (y.jac + y.bjac) - (x.jac + x.bjac))
console.log(`${rows.length} live nodes, ${pairs.length} candidate pairs at title-jaccard >= 0.34`)
for (const p of pairs.slice(0, 40)) {
  console.log(`\n${p.jac} title / ${p.bjac} body   ${p.a} [${p.ka}/${p.ta}]  <>  ${p.b} [${p.kb}/${p.tb}]`)
  console.log(`   A: ${p.at}`)
  console.log(`   B: ${p.bt}`)
}
