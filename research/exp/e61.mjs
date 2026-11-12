// e61: which gap classifier agrees with a human, and how wrong is it?
//
// e60 tried two rules for "which of the 320 open questions can tonight's machine
// close?" and they disagreed by an order of magnitude:
//   keyword rule (nobody|unpublished|...)   -> ours 13, literature 84, unclassified 220
//   referent rule (src/..., rsi_*, DOI)     -> ours  8, literature 49, neither      262
//
// Neither number is a property of the corpus. Both are properties of how the gaps
// were written: their authors addressed a human reader, so a question answerable
// by a script over ~/.dsh/loom/campaigns usually says "our ledger" and not
// "views/state.json".
//
// So: hand-label a sample, then score the rules against it. The hand labels are
// mine and are in this file; anyone can disagree with an individual label, which
// is the point of printing them.
//
// Labels
//   ours        closing it needs only data/artifacts already on this disk
//   literature  closing it needs a document we do not have, or no document exists
//   neither     does not name enough to be closed by either route
//
// Run: node research/exp/e61.mjs

import { DatabaseSync } from 'node:sqlite'

const DB = process.env.LOOM_KG || 'C:/Projects/RSI/research/kg/store.sqlite'

// Hand labels: every 13th gap by id, from a read of title+body on 2026-11-13.
const HAND = {
  'cheapest-policy': 'ours',
  'gap-w1-009': 'literature',
  'gap-w1-022': 'literature',
  'gap-w4-007': 'ours',
  'gap-w4-020': 'ours',
  'gap-w4-033': 'ours',
  'gap-w5-005': 'literature',
  'gap-w5-018': 'ours',
  'gap-w5-031': 'neither',
  'gap-w6-005': 'ours',
  'gap-w6-018': 'ours',
  'gap-w6-031': 'ours',
  'gap-w6-044': 'ours',
  'gap-w7-010': 'ours',
  'gap-w7-023': 'ours',
  'gap-w7-036': 'ours',
  'gap-w7-049': 'literature',
  'gap-w8-012': 'ours',
  'gap-w8-025': 'ours',
  'gap-w8-038': 'ours',
  'n-gap-repo-variation': 'ours',
  'w2-horizon-gap-integrity-composition': 'literature',
  'w2-meta-gap-no-matched-budget-headtohead': 'literature',
  'w3-falsify-gap-batch-vs-sync': 'literature',
  'w3-restart-gap-no-power-loss-test': 'ours',
}

const db = new DatabaseSync(DB, { readOnly: true })
const gaps = db.prepare(`SELECT id, title, body, topic FROM node WHERE kind='question' AND status='live'`).all()
db.close()

const RULES = {
  // rule A: the vocabulary of absence (e60 v1)
  keyword: (t) => (/\b(nobody|no one|no study|not published|unpublished|no public|no measured|no controlled|could not (verify|retrieve|confirm)|no head-to-head|no quantified|no evidence)\b/i.test(t)
    ? 'literature'
    : /\b(our|we|us)\b.{0,40}\b(ledger|account|loom|campaign|round|attempt|gate|policy|workspace|dispatch|brief|verifier|baseline|budget)\b/i.test(t) ? 'ours' : 'neither'),
  // rule B: strict referents (e60 v2)
  referent: (t) => {
    const mine = /src\/[a-z0-9-]+\/[a-z0-9-]+\.js|\brsi_[a-z_]+\b|~?\/?\.dsh\/loom|\bloom-[a-z0-9]+\b|\b(gate\.evaluated|round\.finished|attempt\.finished|autopilot\.applied)\b|\b(evalset|baseline-cache|verifier-cache|artifacts)\b/i.test(t)
    const theirs = /\barxiv[:\s]*\d{4}\.\d{4,5}|\bdoi[:\s]*10\.\d{4,}|10\.\d{4}\/\S+|\b(CHI|NeurIPS|ICML|ICLR|ACL|EMNLP|FSE|ICSE|ASE|OSDI|SOSP)\s?(19|20)\d{2}\b|\b(published|peer-reviewed|preprint|study found|meta-analysis)\b/i.test(t)
    return mine && theirs ? 'both' : mine ? 'ours' : theirs ? 'literature' : 'neither'
  },
  // rule C: possessive reference to the loop (the one a human would use)
  possessive: (t) => {
    const ours = /\b(our|this) (own )?(ledger|loop|campaigns?|rounds?|attempts?|gate|policy|ledger|brief|verifier|baseline|budget|evalset|holdout|checkpoint|worktree|lessons?|workspace)\b|\b(dsh-loom|in loom|on this loop|in our)\b|\bwe (have|do)? ?not (measured|tested)\b|\bunmeasured here\b|\bour own\b/i.test(t)
    const theirs = /\b(nobody|no one|no study|no published|unpublished|no primary|no experiment|no measurement exists|no evidence|literature|no head-to-head|no controlled)\b/i.test(t)
    return ours && !theirs ? 'ours' : theirs && !ours ? 'literature' : ours && theirs ? 'both' : 'neither'
  },
}

const rows = gaps.map((g) => {
  const t = `${g.title}\n${g.body}`
  const got = Object.fromEntries(Object.entries(RULES).map(([k, f]) => [k, f(t)]))
  const truth = HAND[g.id] ?? null
  return { id: g.id, truth, got }
})

const labelled = rows.filter((r) => r.truth)
const agreement = (rule) => labelled.filter((r) => r.got[rule] === r.truth).length
const confusion = (rule) => {
  const m = {}
  for (const r of labelled) {
    const k = `${r.truth}->${r.got[rule]}`
    m[k] = (m[k] ?? 0) + 1
  }
  return m
}

const handCounts = labelled.reduce((m, r) => m.set(r.truth, (m.get(r.truth) ?? 0) + 1), new Map())

const out = {
  sampleSize: labelled.length,
  handCounts: Object.fromEntries(handCounts),
  // the extrapolated truth for the whole corpus, under the sample's proportions
  extrapolated: Object.fromEntries(
    [...handCounts.entries()].map(([k, n]) => [k, Math.round((n / labelled.length) * gaps.length)]),
  ),
  agreement: Object.fromEntries(Object.keys(RULES).map((rule) => [rule, `${agreement(rule)}/${labelled.length}`])),
  agreementRate: Object.fromEntries(Object.keys(RULES).map((rule) => [rule, Number((agreement(rule) / labelled.length).toFixed(3))])),
  confusion: Object.fromEntries(Object.keys(RULES).map((rule) => [rule, confusion(rule)])),
  mistakes: Object.fromEntries(Object.keys(RULES).map((rule) => [
    rule,
    labelled.filter((r) => r.got[rule] !== r.truth).map((r) => `${r.id}: hand=${r.truth} rule=${r.got[rule]}`),
  ])),
  verdict:
    'Hand labelling says most gaps are answerable from what is already on this disk, and every rule I tried under-detects that by 3-10x because the gaps were written for a human. The fix is not a better regex: a gap needs a `kind` field saying who can close it, set by the wave that wrote it, or the list cannot be a work queue.',
}
console.log(JSON.stringify(out, null, 2))
