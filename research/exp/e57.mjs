// e57: are the "duplicate" node pairs actually duplicates, and what does merging
// them destroy?
//
// e48/e49 found 6 node pairs at title-jaccard >= 0.34 that describe the same paper.
// The obvious next step (kg merge) is the wrong one, and this script measures why:
// a pair discovered by two independent research waves is *corroboration*, and the
// wave count is the only evidence we have that a paper is load-bearing for our
// problems rather than a lucky citation. Merging keeps one node, so the count
// goes from 2 to 1 and the surviving node's `kind` and `conf` are whichever one
// happened to be merged into.
//
// Run: node research/exp/e57.mjs

import { DatabaseSync } from 'node:sqlite'

const DB = process.env.LOOM_KG || 'C:/Projects/RSI/research/kg/store.sqlite'

// The pairs found by title similarity, plus the ones already carrying same-as.
//
// These ids were copied from `kg show` output, not typed from the titles. A first
// run of this script had `w6-selfmod-holdout-unsound` (real id:
// `w6-selfmod-heldout-unsound`) and reported `{error:'missing node'}` -- the same
// transcription failure as exp-resolve-002, and it failed loudly rather than
// silently because the lookup returned nothing. Keep the miss in the record: the
// guard that caught it is "a missing id is an error, not an empty row".
const PAIRS = [
  ['w3-attention-interruption-speed-not-quality', 'w8-attention-interruption-buys-speed'],
  ['w2-human-interruption-cost', 'w8-attention-interruption-buys-speed'],
  ['w2-human-interruption-cost', 'w3-attention-interruption-speed-not-quality'],
  ['w4-selfedit-dgm-node114-deleted-the-markers', 'w6-selfmod-marker-delete'],
  ['w3-holdout-tests-clean-scope', 'w6-selfmod-tests-clean-scope'],
  ['w3-holdout-evilgenie-impossiblebench', 'w6-selfmod-heldout-unsound'],
  ['w3-holdout-decay-bound', 'w6-selfmod-holdout-optimism'],
]

const db = new DatabaseSync(DB, { readOnly: true })
const nodeOf = (id) => db.prepare('SELECT id, kind, confidence AS conf, topic, title, length(body) AS bodyLen FROM node WHERE id = ?').get(id)
const relBetween = (a, b) =>
  db.prepare("SELECT rel, note FROM edge WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)").all(a, b, b, a)
const citedBy = (id) => db.prepare("SELECT count(*) AS n FROM edge WHERE to_id = ?").get(id).n

const rows = []
for (const [a, b] of PAIRS) {
  const na = nodeOf(a)
  const nb = nodeOf(b)
  if (!na || !nb) {
    rows.push({ a, b, error: 'missing node' })
    continue
  }
  rows.push({
    a: { id: a, kind: na.kind, conf: na.conf, topic: na.topic, bodyLen: na.bodyLen, inEdges: citedBy(a) },
    b: { id: b, kind: nb.kind, conf: nb.conf, topic: nb.topic, bodyLen: nb.bodyLen, inEdges: citedBy(b) },
    sameKind: na.kind === nb.kind,
    sameTopic: na.topic === nb.topic,
    confDelta: typeof na.conf === 'number' && typeof nb.conf === 'number' ? Math.abs(na.conf - nb.conf) : null,
    alreadyLinked: relBetween(a, b),
  })
}
db.close()

const pairs = rows.filter((r) => !r.error)
const out = {
  pairs: pairs.length,
  alreadyLinked: pairs.filter((r) => r.alreadyLinked.length > 0).length,
  differInKind: pairs.filter((r) => !r.sameKind).length,
  differInTopic: pairs.filter((r) => !r.sameTopic).length,
  differInConfidence: pairs.filter((r) => r.confDelta !== null && r.confDelta > 0.001).length,
  rows,
}
out.verdict = {
  whatMergeWouldCollapse: [
    'the wave count (2 independent waves -> 1 node)',
    ...(out.differInKind > 0 ? [`${out.differInKind} kind distinctions (number vs claim vs failure)`] : []),
    ...(out.differInConfidence > 0 ? [`${out.differInConfidence} confidence values`] : []),
    ...(out.differInTopic > 0 ? [`${out.differInTopic} topic memberships`] : []),
  ],
}
console.log(JSON.stringify(out, null, 2))
