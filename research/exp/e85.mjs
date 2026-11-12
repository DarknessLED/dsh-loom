// w8-attention-uncertainty-defers-question: does showing uncertainty make a
// supervisor defer more, or does any claim of competence do that?
//
// We cannot run a human study overnight, but we can measure the confound the
// question implies. Every checkpoint payload carries a message written by the loop.
// If the loop's own confidence language correlates with how long the decision took
// or which way it went, then "showing uncertainty" has an effect mediated by text --
// and we can at least check whether the text varies at all, because a constant
// cannot have an effect.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')
const readJsonl = (f) => {
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn */ }
  }
  return out
}

const raised = []
const answered = new Map()
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  for (const e of readJsonl(f)) {
    if (e.type === 'checkpoint.raised') raised.push({ campaign: c, id: e.data.id, kind: e.data.kind, msg: String(e.data.payload?.message ?? ''), t: e.t })
    if (e.type === 'checkpoint.answered') answered.set(`${c}|${e.data.id}`, { t: e.t, decision: e.data.answer?.decision })
  }
}

// Uncertainty lexicon vs competence lexicon. Both are crude; the point is whether
// the loop ever expresses either, not whether the classifier is good.
const HEDGE = /\b(may|might|unclear|unknown|not sure|cannot tell|could not|unsure|perhaps|possibly|seems|appears|we think|probably)\b/i
const CERTAIN = /\b(confirmed|verified|exactly|guaranteed|certain|definitely|always|proven|must)\b/i

let hedge = 0
let certain = 0
let neither = 0
const byBucket = { hedge: [], certain: [], neither: [] }
for (const r of raised) {
  const a = answered.get(`${r.campaign}|${r.id}`)
  if (!a) continue
  const lat = a.t - r.t
  if (!(lat >= 0)) continue
  const b = HEDGE.test(r.msg) ? 'hedge' : CERTAIN.test(r.msg) ? 'certain' : 'neither'
  if (b === 'hedge') hedge += 1
  else if (b === 'certain') certain += 1
  else neither += 1
  byBucket[b].push({ lat, decision: a.decision })
}

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null }
console.log(`checkpoints with a decision and a message: ${hedge + certain + neither}`)
console.log(`  hedge language: ${hedge}   competence language: ${certain}   neither: ${neither}`)
for (const [k, v] of Object.entries(byBucket)) {
  if (!v.length) continue
  const rej = v.filter((x) => x.decision === 'reject').length
  console.log(`  ${k.padEnd(8)} n=${v.length} median latency ${(med(v.map((x) => x.lat)) / 1000).toFixed(0)}s  reject rate ${(rej / v.length * 100).toFixed(0)}%`)
}

// The decisive fact for the question: if the loop never varies its language, no
// experiment on language can be run here at all.
const distinct = new Set(raised.map((r) => r.msg)).size
console.log(`\ndistinct checkpoint messages: ${distinct} of ${raised.length} raised`)
const samples = [...new Set(raised.map((r) => r.msg))].slice(0, 6)
for (const s of samples) console.log(`  "${s}"`)

// And: does the payload ever carry a numeric confidence?
let withConf = 0
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  for (const e of readJsonl(f)) {
    if (e.type !== 'checkpoint.raised') continue
    const p = e.data.payload ?? {}
    if (Object.hasOwn(p, 'confidence') || Object.hasOwn(p, 'uncertainty') || Object.hasOwn(p, 'score')) withConf += 1
  }
}
console.log(`\ncheckpoints carrying a numeric confidence/uncertainty/score: ${withConf} of ${raised.length}`)

fs.writeFileSync(path.join('research', 'exp', 'e85.json'), JSON.stringify({
  total: hedge + certain + neither, hedge, certain, neither,
  byBucket: Object.fromEntries(Object.entries(byBucket).map(([k, v]) => [k, { n: v.length, medianMs: med(v.map((x) => x.lat)), rejectRate: v.filter((x) => x.decision === 'reject').length / (v.length || 1) }])),
  distinctMessages: distinct, messages: [...new Set(raised.map((r) => r.msg))], withConf,
}, null, 2))
