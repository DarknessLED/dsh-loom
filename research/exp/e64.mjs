// e64: the graph's retrieval, measured against a ground truth it already contains.
//
// e63 asked whether searching a concept's title finds that concept's children. It
// does not, for 54 of 71 -- but that is the wrong test and the failure says so: a
// concept is an abstraction and its children are instances, so their titles share
// no vocabulary by construction (0 of 89 concept->child pairs share even three
// title words). Testing a concept by its children's words is like testing a chapter
// heading by searching for its subsections' first sentences.
//
// The question that has a ground truth is different: when the graph already knows
// that node B answers question Q, would a reader who only has Q find B? That is
// exactly the 11 gap_answer pairs plus the 174 resolved contradictions (A and B
// known to be about the same thing). It measures retrieval the way the digest
// measures everything else -- against a witness the system did not produce for the
// purpose of being measured.
//
// Run: node research/exp/e64.mjs [--limit 10]

import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

const DB = process.env.LOOM_KG || resolve('research/kg/store.sqlite')
const TOP = Number(process.argv.includes('--limit') ? process.argv[process.argv.indexOf('--limit') + 1] : 10)
const db = new DatabaseSync(DB, { readOnly: true })

const STOP = new Set(
  'the a an of to is and for not in on that it as by be with from at or this are was but its has have one only must can when than then they their which what all more no if so do does did into out up about after before over under between'.split(
    ' '
  )
)
const words = (text, max = 8) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, max)

// Same call `kg search` makes, so this measures the reader's experience.
const search = (query, limit) => {
  if (!query.trim()) return []
  const q = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `"${w}"`)
    .join(' OR ')
  try {
    return db
      .prepare(
        `SELECT n.id AS id FROM node_fts f JOIN node n ON n.id = f.id
         WHERE node_fts MATCH ? AND n.status='live' ORDER BY rank LIMIT ?`
      )
      .all(q, limit)
      .map((r) => r.id)
  } catch {
    return []
  }
}

const title = (id) => db.prepare('SELECT title FROM node WHERE id = ?').get(id)?.title ?? ''

// ---- ground truth 1: a recorded answer. Q is a question, A is the node that
// answers it. Would searching Q's own words surface A?
const answerPairs = db
  .prepare(
    `SELECT a.gap_id AS q, a.node_id AS a FROM gap_answer a
     JOIN node n ON n.id = a.gap_id WHERE n.status='live'`
  )
  .all()

const answerHits = answerPairs.map((p) => {
  const q = title(p.q)
  const ranked = search(words(q).join(' '), 40)
  const pos = ranked.indexOf(p.a)
  return { q: p.q, a: p.a, rank: pos < 0 ? null : pos + 1, inTop: pos >= 0 && pos < TOP, hits: ranked.length }
})

// ---- ground truth 2: a resolved contradiction. Two nodes known to be about one
// thing. Would searching A's title surface B? This is the symmetric version, and
// it covers 174 pairs instead of 11.
const contraPairs = db
  .prepare(
    `SELECT r.from_id AS a, r.to_id AS b FROM resolution r
     JOIN node x ON x.id = r.from_id JOIN node y ON y.id = r.to_id
     WHERE x.status='live' AND y.status='live'`
  )
  .all()

const contraHits = contraPairs.map((p) => {
  const ranked = search(words(title(p.a)).join(' '), 40)
  const pos = ranked.indexOf(p.b)
  return { a: p.a, b: p.b, rank: pos < 0 ? null : pos + 1, inTop: pos >= 0 && pos < TOP }
})

// ---- a control: searching a node's own title must find that node first, or the
// index is broken and every other number here is measuring the index, not the graph.
const sample = db.prepare("SELECT id, title FROM node WHERE status='live' AND kind IN ('claim','number','failure','analysis') ORDER BY random() LIMIT 40").all()
const selfHits = sample.map((n) => {
  const ranked = search(words(n.title).join(' '), 5)
  return { id: n.id, hit: ranked.includes(n.id), rank: ranked.indexOf(n.id) + 1 }
})

const rate = (xs, f) => (xs.length ? Number((xs.filter(f).length / xs.length).toFixed(3)) : null)
const med = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b)
  if (!s.length) return null
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Number(((s[m - 1] + s[m]) / 2).toFixed(1))
}

const out = {
  population: { topN: TOP, answerPairs: answerPairs.length, contradictionPairs: contraPairs.length, selfCheckNodes: sample.length },
  selfCheck: {
    foundItselfInTop5: rate(selfHits, (r) => r.hit),
    medianRank: med(selfHits.map((r) => r.rank)),
    reading:
      'If this is not near 1.0 the index is broken and nothing below is about the graph. It is the cheapest possible control and it costs 40 searches.',
  },
  answeredQuestions: {
    foundAnswerInTopN: rate(answerHits, (r) => r.inTop),
    medianRankOfAnswer: med(answerHits.map((r) => r.rank)),
    detail: answerHits.map((r) => ({ question: r.q, answer: r.a, rank: r.rank })),
    reading:
      'The strongest available test: these 11 pairs are decisions already made, so the answer is known correct. A reader with only the question text and kg search gets the answer in the top N some of the time.',
  },
  resolvedContradictions: {
    foundPartnerInTopN: rate(contraHits, (r) => r.inTop),
    medianRankOfPartner: med(contraHits.map((r) => r.rank)),
    foundAnywhereInTop40: rate(contraHits, (r) => r.rank != null),
    reading:
      'A contradiction pair is two nodes about one thing, so searching either title should surface the other. This is a lower bar than the answered-question test (the partner need only be about the same subject) and a much larger sample.',
  },
}

console.log(JSON.stringify(out, null, 2))
db.close()
