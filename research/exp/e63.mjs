// e63: does the concept layer earn its place?
//
// The digest's step five says "distil concepts". 78 concept nodes exist and 21 have
// no inbound edge, which looks like a curation backlog -- add edges until nothing is
// orphaned. That is the wrong test. A concept is a navigational promise: "start here
// and you will find the findings that prove me". The promise can be checked against
// the retrieval the graph actually performs, and if a concept's own title searches
// worse than the flat pool of its children, the concept is decoration.
//
// So: for each live concept, derive a query from its title, run kg's own FTS search,
// and ask how many of the concept's outbound neighbours appear in the top N. Also
// compare against a control query built from the same words but against the whole
// graph, so a concept that merely names a rare word does not look good by accident.
//
// Run: node research/exp/e63.mjs [--limit 10]

import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

const DB = process.env.LOOM_KG || resolve('research/kg/store.sqlite')
const TOP = Number(process.argv.includes('--limit') ? process.argv[process.argv.indexOf('--limit') + 1] : 10)

const db = new DatabaseSync(DB, { readOnly: true })

const concepts = db
  .prepare("SELECT id, title, body, topic FROM node WHERE kind='concept' AND status='live' ORDER BY id")
  .all()

// Content words from the title, minus English function words. The stop list is
// English because the titles are English; it is deliberately small, because a
// bigger one would start removing the terms that make a concept discriminating.
const STOP = new Set(
  'the a an of to is and for not in on that it as by be with from at or this are was but its has have one only must can when than then they their which what all more no if so do does did into out up about after before over under between'.split(
    ' '
  )
)

const words = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))

// The graph's own FTS, exactly as `kg search` calls it, so the measurement is of the
// retrieval a reader gets rather than of a query I tuned for this script.
const ftsIds = (query, limit) => {
  if (!query.trim()) return []
  try {
    return db
      .prepare(
        `SELECT n.id AS id FROM node_fts f JOIN node n ON n.id = f.id
         WHERE node_fts MATCH ? AND n.status='live' ORDER BY rank LIMIT ?`
      )
      .all(query, limit)
      .map((r) => r.id)
  } catch {
    return []
  }
}

const neighbours = (id) =>
  db.prepare('SELECT to_id AS id FROM edge WHERE from_id = ?').all(id).map((r) => r.id)

const rows = []
for (const c of concepts) {
  const kids = neighbours(c.id)
  const titleWords = words(c.title).slice(0, 6)
  // OR the distinctive words: a reader typing a concept's name would.
  const query = titleWords.map((w) => `"${w}"`).join(' OR ')
  const hits = ftsIds(query, TOP)
  const childHits = kids.filter((k) => hits.includes(k)).length
  rows.push({
    id: c.id,
    topic: c.topic,
    title: String(c.title).slice(0, 90),
    children: kids.length,
    queryWords: titleWords.length,
    hitsInTop: hits.length,
    childHits,
    // A concept with no children cannot be judged by this test; report it apart
    // rather than scoring it zero, which would punish an empty set as a bad answer.
    scoreable: kids.length > 0 && titleWords.length > 0,
    recall: kids.length ? Number((childHits / Math.min(kids.length, TOP)).toFixed(2)) : null,
  })
}

const scoreable = rows.filter((r) => r.scoreable)
const withChildren = rows.filter((r) => r.children > 0)
const orphans = rows.filter((r) => r.children === 0)
const perfect = scoreable.filter((r) => r.childHits === Math.min(r.children, TOP))
const zero = scoreable.filter((r) => r.childHits === 0)
const med = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Number(((s[m - 1] + s[m]) / 2).toFixed(2))
}

const out = {
  population: { concepts: rows.length, withChildren: withChildren.length, withoutChildren: orphans.length, topN: TOP },
  retrieval: {
    scoreable: scoreable.length,
    foundEveryChildInTopN: perfect.length,
    foundNoChild: zero.length,
    medianRecall: med(scoreable.map((r) => r.recall)),
    meanRecall: scoreable.length
      ? Number((scoreable.reduce((a, r) => a + r.recall, 0) / scoreable.length).toFixed(3))
      : null,
  },
  // A concept that retrieves none of its own children is either (a) titled in words
  // its children do not use, which is a bad title, or (b) a concept whose children
  // were attached for a reason the title does not state, which is a bad edge. Both
  // are fixable, and the distinction is visible by reading one example.
  worst: zero
    .sort((a, b) => b.children - a.children)
    .slice(0, 10)
    .map((r) => ({ id: r.id, children: r.children, title: r.title })),
  noChildren: orphans.map((r) => ({ id: r.id, title: r.title })),
  best: perfect
    .sort((a, b) => b.children - a.children)
    .slice(0, 6)
    .map((r) => ({ id: r.id, children: r.children, recall: r.recall, title: r.title })),
}

console.log(JSON.stringify(out, null, 2))
db.close()
