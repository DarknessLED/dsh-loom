// e58: are the 320 open questions actually open?
//
// `kg gaps` lists every `kind='question'` node with status='live' forever --
// nothing can close a question, and the gap nodes were imported with
// confidence 0.4 and no edges at all (280 of the 320 have no edge in either
// direction). So "296 open questions" is a number about the import format, not
// about what we still do not know.
//
// This script asks the question that number cannot: for each gap, is there a
// node that arrived LATER (higher created_at) whose text shares the gap's
// distinctive terms? If yes, the gap is a candidate for "already answered by a
// later wave" and the list is stale. If no, the gap is genuinely open.
//
// The matching is deliberately dumb (IDF-weighted token overlap, not a judge):
// a dumb matcher that reports its threshold sensitivity is worth more here than
// a clever one, because the output is a claim about staleness.
//
// Run: node research/exp/e58.mjs [--min-score 0.35]

import { DatabaseSync } from 'node:sqlite'

const DB = process.env.LOOM_KG || 'C:/Projects/RSI/research/kg/store.sqlite'
const argOf = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : dflt
}

const STOP = new Set(`a an the and or but if then than that this these those of in on at to for from by with without
is are was were be been being not no nor so such as it its their there here we our you your they them he she
has have had do does did can could should would may might must will shall about into over under more most less
least very much many few some any all each every both either neither none one two three first second
question measurement measure measured report reported publish published nobody anyone someone study studies
data point points find found found here there what which who whom whose when where why how whether still yet
us we i my our also only just even well known unknown unmeasured unpublished unclear`)

const tokens = (s) => String(s || '')
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
  .split(' ')
  .filter((t) => t.length > 2 && !STOP.has(t))

const db = new DatabaseSync(DB, { readOnly: true })
const q = (sql, ...p) => db.prepare(sql).all(...p)

const gaps = q(`SELECT id, title, body, topic, created_at, confidence FROM node
                 WHERE kind='question' AND status='live' ORDER BY created_at, id`)
const pool = q(`SELECT id, kind, title, body, created_at FROM node
                 WHERE status='live' AND kind IN ('number','claim','failure','analysis','concept')`)

// document frequency over the candidate pool, so "verifier" (in 200 nodes)
// counts for less than "kappa" (in 3).
const df = new Map()
const tokOf = new Map()
for (const n of pool) {
  const set = new Set(tokens(`${n.title} ${n.body}`))
  tokOf.set(n.id, set)
  for (const t of set) df.set(t, (df.get(t) ?? 0) + 1)
}
const N = pool.length
const idf = (t) => Math.log((N + 1) / ((df.get(t) ?? 0) + 0.5))

// weight a gap's own tokens; a token that appears in no candidate can't help
// match anything, which is itself informative (the gap uses vocabulary the
// graph never uses again).
function score(gap, cand) {
  const gt = tokens(`${gap.title} ${gap.body}`)
  const uniq = [...new Set(gt)]
  if (!uniq.length) return { s: 0, shared: [] }
  const cs = tokOf.get(cand.id)
  let num = 0
  let den = 0
  const shared = []
  for (const t of uniq) {
    const w = idf(t)
    den += w
    if (cs.has(t)) { num += w; shared.push(t) }
  }
  return { s: den > 0 ? num / den : 0, shared }
}

const MIN = argOf('min-score', 0.35)
const rows = []
let answered = 0
let noLaterNode = 0
const kindsOfAnswer = new Map()

for (const gap of gaps) {
  const later = pool.filter((n) => n.created_at > gap.created_at)
  if (!later.length) noLaterNode += 1
  let best = null
  for (const cand of later) {
    const r = score(gap, cand)
    if (!best || r.s > best.s) best = { ...r, id: cand.id, kind: cand.kind, title: cand.title.slice(0, 90) }
  }
  if (best && best.s >= MIN) {
    answered += 1
    kindsOfAnswer.set(best.kind, (kindsOfAnswer.get(best.kind) ?? 0) + 1)
  }
  rows.push({
    gap: gap.id,
    conf: gap.confidence,
    top: best ? { id: best.id, kind: best.kind, score: Number(best.s.toFixed(3)), shared: best.shared.slice(0, 6) } : null,
    candidate: best && best.s >= MIN,
  })
}

db.close()

const thresholds = [0.25, 0.3, 0.35, 0.4, 0.5, 0.6]
const byThreshold = Object.fromEntries(
  thresholds.map((t) => [t, rows.filter((r) => r.top && r.top.score >= t).length]),
)

const out = {
  gaps: gaps.length,
  candidatePool: pool.length,
  gapsWithNoLaterNode: noLaterNode,
  gapsWithCandidateAnswer: answered,
  candidateRate: Number((answered / gaps.length).toFixed(3)),
  answerKinds: Object.fromEntries([...kindsOfAnswer.entries()].sort((a, b) => b[1] - a[1])),
  thresholdSensitivity: byThreshold,
  sampleStrongest: rows
    .filter((r) => r.top && r.top.score >= 0.5)
    .sort((a, b) => b.top.score - a.top.score)
    .slice(0, 12),
  verdict:
    'If candidateRate is high, "N open questions" is a statement about the import format (gaps arrive with no edges and a constant confidence 0.4) and not about what we do not know: a question node can never be closed, so the list only grows. The fix is a status transition plus the same `--note` requirement as contradiction resolution, not a better search.',
}
console.log(JSON.stringify(out, null, 2))
