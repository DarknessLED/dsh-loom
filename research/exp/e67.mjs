import fs from 'node:fs'
import path from 'node:path'

// w3-attention-gap-card-vs-diff-decision-time asks for a study comparing an evidence-dense card
// against a raw diff on time-to-decision and false-accept rate. We cannot run that study here
// (one reviewer, who is also the loop's author, and no ground truth on our own diffs beyond the
// verifier the card is supposed to summarise). What we CAN measure is the precondition: does the
// card a human actually receives contain the evidence the decision needs? A format study on a card
// that holds no evidence measures reading speed on a pointer.

const DIR = 'C:/Users/Darkness/.dsh/loom/campaigns'

function eventsOf(id) {
  const f = path.join(DIR, id, 'events.jsonl')
  if (!fs.existsSync(f)) return []
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn tail */ }
  }
  return out
}

const campaigns = fs.readdirSync(DIR).filter(id => fs.existsSync(path.join(DIR, id, 'events.jsonl')))
const raised = []
const answered = new Map()
for (const c of campaigns) {
  for (const e of eventsOf(c)) {
    if (e.type === 'checkpoint.raised') raised.push({ campaign: c, t: e.t, ...e.data })
    if (e.type === 'checkpoint.answered') answered.set(e.data.id, { t: e.t, answer: e.data.answer })
  }
}

const gates = raised.filter(r => r.kind === 'gate')

// Per-card field inventory. `patch` is a PATH, not a diff: the word matched, the content did not.
// That distinction is the whole measurement, so it gets its own predicate.
const inventory = gates.map(r => {
  const p = r.payload || {}
  const a = answered.get(r.id)
  return {
    id: r.id,
    campaign: r.campaign,
    fields: Object.keys(p).sort(),
    bytes: JSON.stringify(p).length,
    score: p.score ?? null,
    hasTask: typeof p.taskId === 'string' || typeof p.objective === 'string',
    hasDiffText: typeof p.diff === 'string' || /\+\+\+ b\//.test(JSON.stringify(p)),
    hasDiffPath: typeof p.patch === 'string',
    hasVerifier: typeof p.verifier === 'object' || typeof p.verifierOk === 'boolean' || typeof p.checks === 'object',
    hasHoldout: /holdout/i.test(JSON.stringify(p)),
    hasThreshold: /minGain|incumbent/i.test(JSON.stringify(p)),
    hasRisk: /risk|impact|regress|break/i.test(JSON.stringify(p)),
    reviewCmd: typeof p.review === 'string' ? p.review.split(' ').slice(0, 4).join(' ') : null,
    decision: a?.answer?.decision ?? null,
    dwellMs: a ? a.t - r.t : null,
  }
})

const n = inventory.length
const count = f => inventory.filter(f).length
const dwells = inventory.map(r => r.dwellMs).filter(v => typeof v === 'number').sort((a, b) => a - b)
const q = (arr, f) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(f * (arr.length - 1)))] : null
const bytes = inventory.map(r => r.bytes).sort((a, b) => a - b)
const fieldSets = {}
for (const r of inventory) fieldSets[r.fields.join(',')] = (fieldSets[r.fields.join(',')] || 0) + 1

const out = {
  gateCheckpoints: n,
  cardsWithNoNodeField: count(r => !r.fields.includes('node')),
  bytes: { min: bytes[0], median: q(bytes, 0.5), max: bytes[bytes.length - 1] },
  evidence: {
    task: count(r => r.hasTask),
    diffText: count(r => r.hasDiffText),
    diffPathOnly: count(r => r.hasDiffPath && !r.hasDiffText),
    verifierVerdict: count(r => r.hasVerifier),
    holdout: count(r => r.hasHoldout),
    threshold: count(r => r.hasThreshold),
    risk: count(r => r.hasRisk),
  },
  cardsWithVerdictAndTask: count(r => r.hasVerifier && r.hasTask),
  fieldSets,
  reviewCommands: inventory.reduce((m, r) => ((m[r.reviewCmd ?? 'none'] = (m[r.reviewCmd ?? 'none'] || 0) + 1), m), {}),
  decisions: inventory.reduce((m, r) => ((m[r.decision ?? 'unanswered'] = (m[r.decision ?? 'unanswered'] || 0) + 1), m), {}),
  dwellMs: { n: dwells.length, min: q(dwells, 0), p25: q(dwells, 0.25), median: q(dwells, 0.5), p75: q(dwells, 0.75), max: q(dwells, 1) },
}
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync('research/exp/e67.json', JSON.stringify(out, null, 2))
