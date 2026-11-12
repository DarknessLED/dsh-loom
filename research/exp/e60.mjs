// e60: of the 320 "open questions", which ones could tonight's machine answer?
//
// The goal says "use gaps to drive the next round of research". A list sorted by
// confidence cannot do that, because the gaps are not the same kind of thing:
//
//   - "What is the carryover order of a promotion in our ledger" is answerable by
//     a script over ~/.dsh/loom/campaigns in minutes.
//   - "Nobody has published a per-task retry variance" needs a literature search
//     and may be unanswerable at all.
//   - "Would a stop-on-first-promotion rule lose anything" was already answered by
//     the wave that asked it (e59: 6 of 320).
//
// FIRST VERSION WAS A KEYWORD CLASSIFIER and it was mostly measuring its own
// vocabulary: `nobody|unpublished|could not verify` caught 84 as literature and
// left 220 unclassified, including questions that plainly say "has never been
// studied" and questions that plainly name `rsi_replay`. So this version
// classifies by REFERENT, which is checkable rather than idiomatic -- the same
// rule ana-010/ana-011 arrived at from the metering bug: a claim about the loop
// must name something the loop produces.
//
//   ours        -> names a concrete artifact of this repo/system
//   literature  -> names a paper identifier (arXiv/DOI/venue) or "published"
//   both        -> names either kind of thing twice
//   neither     -> names nothing checkable, so it cannot be a work item yet
//
// The "neither" bucket is the interesting one: a question with no referent is not
// researchable, it is a mood.
//
// Run: node research/exp/e60.mjs

import { DatabaseSync } from 'node:sqlite'

const DB = process.env.LOOM_KG || 'C:/Projects/RSI/research/kg/store.sqlite'

// Referents that only exist inside this project.
const OURS = [
  /src\/[a-z0-9-]+\/[a-z0-9-]+\.js/gi,      // a module path
  /\brsi_[a-z_]+\b/gi,                       // a tool name
  /~\/\.dsh\/loom|\/\.dsh\/loom/gi,          // the state directory
  /\b(loom-[a-z0-9]+)\b/gi,                  // a campaign id
  /\b(gate\.evaluated|round\.finished|attempt\.finished|autopilot\.applied|chain\.activated)\b/gi, // an event type
  /\b(evalset|baseline-cache|verifier-cache|views\/state\.json|artifacts)\b/gi,
]
// Referents that belong to someone else's record.
const THEIRS = [
  /\barxiv[:\s]*\d{4}\.\d{4,5}/gi,
  /\bdoi[:\s]*10\.\d{4,}/gi,
  /\b(10\.1145|10\.1109|10\.18653|10\.1038)\/\S+/g,
  /\b(CHI|NeurIPS|ICML|ICLR|ACL|EMNLP|FSE|ICSE|ASE|OSDI|SOSP)\s?(19|20)\d{2}\b/g,
  /\b(published|peer-reviewed|preprint|paper reports|study found|meta-analysis)\b/gi,
]

const db = new DatabaseSync(DB, { readOnly: true })
const gaps = db.prepare(`SELECT id, title, body, topic, created_at,
  (SELECT count(*) FROM edge e WHERE e.from_id = node.id OR e.to_id = node.id) AS deg
  FROM node WHERE kind='question' AND status='live'`).all()
db.close()

const hits = (res, text) => {
  const found = []
  for (const re of res) {
    re.lastIndex = 0
    for (const m of String(text).matchAll(re)) found.push(m[0])
  }
  return [...new Set(found)]
}

const rows = gaps.map((g) => {
  const text = `${g.title}\n${g.body}`
  const mine = hits(OURS, text)
  const theirs = hits(THEIRS, text)
  const cls = mine.length && theirs.length ? 'both' : mine.length ? 'ours' : theirs.length ? 'literature' : 'neither'
  return { ...g, cls, mine, theirs }
})

const by = (k) => rows.filter((r) => r.cls === k)
const short = (r) => ({ id: r.id, deg: r.deg, mine: r.mine.slice(0, 3), title: r.title.slice(0, 110) })

const out = {
  gaps: rows.length,
  byReferent: {
    ours: by('ours').length,
    literature: by('literature').length,
    both: by('both').length,
    neither: by('neither').length,
  },
  // A gap naming our own module/event/tool and carrying an edge or a non-empty
  // topic bucket is the only kind a nightly loop can actually close.
  workableTonight: by('ours')
    .filter((r) => r.mine.some((m) => /^src\/|^rsi_|loom|gate\.|round\.|attempt\./i.test(m)))
    .length,
  neitherByTopic: Object.fromEntries(
    [...by('neither').reduce((m, r) => m.set(r.topic, (m.get(r.topic) ?? 0) + 1), new Map())]
      .sort((a, b) => b[1] - a[1]).slice(0, 8),
  ),
  samples: {
    ours: by('ours').slice(0, 8).map(short),
    both: by('both').slice(0, 4).map(short),
    neither: by('neither').slice(0, 8).map(short),
  },
  verdict:
    'A gap list is a work queue only if its items differ in who can close them. Sorting by confidence puts a question naming `src/runtime/round.js` next to a question naming a DOI and calls them the same thing.',
}
console.log(JSON.stringify(out, null, 2))
