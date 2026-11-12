// e65: which open questions actually block something?
//
// `kg gaps` sorts by confidence and prints 311 open questions. The digest's step five
// says to drive the next round of research from the gaps -- but a list of 311 sorted
// by confidence is not a queue, it is a pile: confidence was written by whichever
// agent asked, so it measures the asker's mood, not the graph's need.
//
// The graph already contains the ranking signal, and it is not confidence. A question
// that other nodes point at is load-bearing: something in the graph was built on the
// assumption that this has an answer. A question nothing points at is a note. So the
// measure is indegree among live non-question dependents, and the test is whether
// that ranking disagrees with confidence -- if it does not, we learned nothing and the
// confidence order was already right.
//
// Run: node research/exp/e65.mjs

import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

const db = new DatabaseSync(process.env.LOOM_KG || resolve('research/kg/store.sqlite'), { readOnly: true })

const open = db
  .prepare(
    `SELECT n.id, n.title, n.topic, n.confidence FROM node n
     WHERE n.kind='question' AND n.status='live'
       AND NOT EXISTS (SELECT 1 FROM gap_answer a WHERE a.gap_id = n.id)`
  )
  .all()

const answered = db
  .prepare(`SELECT COUNT(*) c FROM gap_answer a JOIN node n ON n.id = a.gap_id WHERE n.status='live'`)
  .get().c

// Dependents: who points at this question, and with what relation. A question that
// only questions point at is not load-bearing (one pile member referencing another);
// it has to be pointed at by a claim, number, analysis, failure or project -- a node
// that made an assertion the answer would confirm or break.
const dependents = db
  .prepare(
    `SELECT e.to_id AS q, e.from_id AS f, e.rel, n.kind FROM edge e
       JOIN node n ON n.id = e.from_id
      WHERE n.status='live' AND n.kind != 'question'`
  )
  .all()

const byQuestion = new Map()
for (const d of dependents) {
  if (!byQuestion.has(d.q)) byQuestion.set(d.q, [])
  byQuestion.get(d.q).push(d)
}

const rows = open.map((q) => {
  const deps = byQuestion.get(q.id) ?? []
  const kinds = {}
  for (const d of deps) kinds[d.kind] = (kinds[d.kind] ?? 0) + 1
  return {
    id: q.id,
    topic: q.topic,
    confidence: q.confidence ?? null,
    title: String(q.title).slice(0, 100),
    dependents: deps.length,
    kinds,
    // The kind-weighted version: a number or analysis resting on an unanswered
    // question is stronger evidence of need than a claim resting on it, because a
    // number was supposed to be computed.
    weight: deps.reduce((a, d) => a + ({ number: 3, analysis: 3, failure: 2, claim: 2, project: 1, source: 1 }[d.kind] ?? 1), 0),
  }
})

const loadBearing = rows.filter((r) => r.dependents > 0).sort((a, b) => b.weight - a.weight || b.dependents - a.dependents)

// Does the load ranking agree with the confidence ranking? Spearman over the
// questions that have a confidence at all, restricted to those that are load-bearing
// (a zero-dependence question is ranked last by load no matter its confidence, which
// would dominate the correlation with a fact about shape rather than need).
const both = rows.filter((r) => r.dependents > 0 && r.confidence != null)
const rank = (xs, key) => {
  const order = [...xs].sort((a, b) => b[key] - a[key])
  const m = new Map()
  order.forEach((x, i) => m.set(x.id, i + 1))
  return m
}
const rankOfLoad = rank(both, 'dependents')
const rankOfConf = rank(both, 'confidence')
let d2 = 0
for (const r of both) {
  const d = rankOfLoad.get(r.id) - rankOfConf.get(r.id)
  d2 += d * d
}
const n = both.length
const spearman = n > 1 ? Number((1 - (6 * d2) / (n * (n * n - 1))).toFixed(3)) : null

const out = {
  population: { liveQuestions: open.length + answered, answered, open: open.length },
  load: {
    withNonQuestionDependent: loadBearing.length,
    withNoDependent: rows.length - loadBearing.length,
    topWeight: loadBearing.length ? loadBearing[0].weight : null,
  },
  agreement: {
    // If this is high, confidence ordering already found the load-bearing questions
    // and the new ranking is decoration. If it is near zero, `kg gaps` has been
    // showing the pile in an order unrelated to what depends on it.
    spearmanLoadVsConfidence: spearman,
    n: both.length,
    reading:
      'Spearman between dependence rank and confidence rank over load-bearing questions. Negative means confidence sorts them backwards. Near zero means confidence carries no information about whether anything is waiting on the answer.',
  },
  top10: loadBearing.slice(0, 10).map((r) => ({ id: r.id, dependents: r.dependents, weight: r.weight, kinds: r.kinds, conf: r.confidence, title: r.title })),
  // The questions with the highest confidence and no dependents: the pile's head.
  confidentButUnreferenced: rows
    .filter((r) => r.dependents === 0 && r.confidence != null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((r) => ({ id: r.id, conf: r.confidence, title: r.title })),
}

console.log(JSON.stringify(out, null, 2))
db.close()
