// The gap bucket. Each wave's builder turned its `gaps` array into `gap-w<N>-NNN`
// question nodes, and the same wave's agents also wrote their own `question`-kind
// nodes. If those are the same questions the corpus carries each open question
// twice, and every "how many questions remain" count is inflated.
//
// Measured on TITLES, not bodies: a generated gap's body is the finding prose it
// came from, while an agent-written question's body argues why it matters, so body
// overlap is near zero even when the question is the same one. The title is the
// part that names the question.
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('research/kg/store.sqlite')
const all = db.prepare("SELECT id, kind, topic, title, coalesce(body,'') body FROM node WHERE status='live' AND kind='question'").all()
db.close()

const isGap = (id) => /^gap-w\d+-\d+$/.test(id)
const gapNodes = all.filter((n) => isGap(n.id))
const ownNodes = all.filter((n) => !isGap(n.id))

const STOP = new Set(('the a an of to in on for and or is are was were be been it its this that these those '
  + 'with without from by as at into over under not no more less than then when where which who what how why '
  + 'can could may might must should would do does did has have had one two three per so if but also only most '
  + 'their our we us they them he she you your i what whether does do is there any how has have').split(' '))
const toks = (s) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
const jac = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i += 1; return a.size + b.size - i ? i / (a.size + b.size - i) : 0 }

const pairs = []
for (const g of gapNodes) {
  const tg = new Set(toks(g.title))
  if (tg.size < 3) continue
  for (const o of ownNodes) {
    const to = new Set(toks(o.title))
    if (to.size < 3) continue
    const j = jac(tg, to)
    if (j >= 0.4) pairs.push({ gap: g.id, own: o.id, jac: +j.toFixed(2), gt: g.title.slice(0, 70), ot: o.title.slice(0, 70) })
  }
}
pairs.sort((a, b) => b.jac - a.jac)

// A gap is a duplicate only if some agent-written question asks the same thing;
// report the share of gaps for which such a partner exists at each threshold.
const thresh = [0.4, 0.5, 0.6, 0.75]
console.log(`question nodes: ${all.length} (${gapNodes.length} generated gaps, ${ownNodes.length} agent-written)`)
for (const t of thresh) {
  const hits = new Set(pairs.filter((p) => p.jac >= t).map((p) => p.gap))
  console.log(`  >=${t}: ${hits.size} of ${gapNodes.length} gaps have a near-title partner (${(100 * hits.size / gapNodes.length).toFixed(1)}%)`)
}
const byWave = {}
for (const p of pairs) { const w = p.gap.replace(/^gap-(w\d+)-\d+$/, '$1'); byWave[w] = (byWave[w] || 0) + 1 }
console.log('pairs by wave:', JSON.stringify(byWave))
console.log('\ntop pairs at >=0.4 title jaccard:')
for (const p of pairs.slice(0, 20)) console.log(`  ${p.jac}  ${p.gap} == ${p.own}\n     "${p.gt}"\n     "${p.ot}"`)
