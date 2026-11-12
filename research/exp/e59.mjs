// e59: how many "open questions" were answered by the very wave that asked them?
//
// e58 found 29/320 gaps whose distinctive terms reappear in a *later* node. This
// script tests the tighter case, found while spot-checking gap-w7-030: the
// question's own body contains the measurement that answers it ("It would skip
// 108 of 211 rounds and 42.8% of round time"), because wave agents used the
// `gaps` array as a "what remains" section and several wrote the number they had
// just produced into the question.
//
// First version of this script bucketed nodes by created_at and looked only at
// siblings in the same ±batch. That is wrong in both directions:
//   - false negatives: gap-w7-030 and n-post-promotion-spend share 42.8% but were
//     written by two different `kg add` calls minutes apart;
//   - false positives: gap-w7-019 and n-loom-power share "25.2%" by coincidence
//     (it is the promotion rate, quoted in a dozen nodes).
//
// The real signal is *distinctiveness*, not timing. A decimal percentage that
// occurs in only two nodes in the whole graph, one of them a question and one a
// measurement, is a quote. A percentage that occurs in a dozen nodes is
// vocabulary. So: compute document frequency per percentage string over all live
// nodes, keep df <= 2, and require the partner to be a non-question.
//
// SECOND FAILURE, and the reason for EXCLUDE below: this script's own write-up
// (exp-gap-002, which quotes 42.8% / 49.3% / 26.6% / 42.46% / 24.5% / 40.4% to
// report them) raised each of those strings' document frequency to 3 and dropped
// `answeredAtBirth` from 6 to 0 on the next run. A measurement that publishes its
// result into the corpus it measures changes the statistic it measured. The
// exclusions are declared here rather than derived, because the only robust
// alternative -- snapshotting the graph before every measurement -- is not what
// this graph is for.
//
// Run: node research/exp/e59.mjs

import { DatabaseSync } from 'node:sqlite'

const DB = process.env.LOOM_KG || 'C:/Projects/RSI/research/kg/store.sqlite'

// Nodes that *report* on gaps rather than being evidence about them. Excluded
// from the frequency count so the instrument does not measure itself.
const EXCLUDE = /^(exp-gap-|ana-023$)/

const db = new DatabaseSync(DB, { readOnly: true })
const all = db.prepare(`SELECT id, kind, body, confidence FROM node WHERE status='live'`).all()
db.close()

const PCT = /\b\d{1,3}\.\d{1,2}\s?%/g
const pctsOf = (s) => new Set((String(s || '').match(PCT) || []).map((m) => m.replace(/\s+/g, '')))

// df per percentage string, over every live node.
const df = new Map()
const byPct = new Map()
let excluded = 0
for (const n of all) {
  if (EXCLUDE.test(n.id)) { excluded += 1; continue }
  for (const p of pctsOf(n.body)) {
    df.set(p, (df.get(p) ?? 0) + 1)
    if (!byPct.has(p)) byPct.set(p, [])
    byPct.get(p).push(n)
  }
}

const gaps = all.filter((n) => n.kind === 'question')
const rows = []
for (const g of gaps) {
  const own = [...pctsOf(g.body)]
  if (!own.length) continue
  // a distinctive percentage: appears in this gap and in at most one other node
  const distinctive = own.filter((p) => (df.get(p) ?? 0) <= 2)
  const shared = distinctive.filter((p) => byPct.get(p).some((n) => n.id !== g.id && n.kind !== 'question'))
  // "colloquial" percentages: quoted everywhere, so a match proves nothing
  const colloquial = own.filter((p) => (df.get(p) ?? 0) > 2)
  rows.push({
    gap: g.id,
    distinctive,
    colloquial,
    answeredBy: shared.map((p) => ({
      pct: p,
      node: byPct.get(p).find((n) => n.id !== g.id && n.kind !== 'question').id,
    })),
  })
}

const answered = rows.filter((r) => r.answeredBy.length > 0)
const verdicts = {
  gaps: gaps.length,
  gapsCarryingAnyPercentage: rows.length,
  gapsCarryingADistinctivePercentage: rows.filter((r) => r.distinctive.length > 0).length,
  answeredAtBirth: answered.length,
  rate: rows.length ? Number((answered.length / rows.length).toFixed(3)) : 0,
  rateAmongAllGaps: Number((answered.length / gaps.length).toFixed(3)),
  excludedSelfReportingNodes: excluded,
  answered,
}
console.log(JSON.stringify(verdicts, null, 2))
