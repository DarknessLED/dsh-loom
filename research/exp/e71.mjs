import fs from 'node:fs'
import path from 'node:path'

// w8-review-q-unmeasured lists four holes and says loom could measure them "with one schema change
// plus a planted-defect arm". This tests the cheapest of the four: hole 3, "no study reports total
// human minutes as a function of batching interval, so the 23-minute interruption cost has never
// been converted into a queue design."
//
// We cannot measure human minutes -- the ledger never recorded reviewer time (w8-review). But the
// interruption COUNT as a function of batching interval is pure event arithmetic, and it is the
// quantity a queue design is about: how many times does the loop demand a human's attention?

const DIR = 'C:/Users/Darkness/.dsh/loom/campaigns'

function readJsonl(f) {
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
    if (e.type === 'checkpoint.raised') raised.push({ campaign: c, id: e.data.id, kind: e.data.kind, t: e.t })
    if (e.type === 'checkpoint.answered') answered.set(e.data.id, { t: e.t, decision: e.data.answer?.decision })
  }
}

// Anything that demands a human decision, by kind. setup/infrastructure are asks too.
const attention = raised.slice().sort((a, b) => a.t - b.t)
const gates = attention.filter((r) => r.kind === 'gate')

// Batching: collapse arrivals that fall inside the same window of width W. Windows are aligned to
// the first arrival, which is the best case for batching; a real scheduler would do worse.
function interruptions(arrivals, windowMs) {
  if (!arrivals.length) return { windows: 0, batches: [] }
  const batches = []
  let start = arrivals[0].t
  let cur = []
  for (const a of arrivals) {
    if (a.t - start >= windowMs) { batches.push(cur); cur = []; start = a.t }
    cur.push(a)
  }
  if (cur.length) batches.push(cur)
  return { windows: batches.length, batches }
}

const windows = {
  immediate: 1,          // every arrival is its own interruption (current behaviour)
  '15m': 15 * 60e3,
  '1h': 60 * 60e3,
  '4h': 4 * 60 * 60e3,
  '1d': 24 * 60 * 60e3,
}

const sweep = {}
for (const [label, w] of Object.entries(windows)) {
  const g = label === 'immediate' ? { windows: gates.length } : interruptions(gates, w)
  const all = label === 'immediate' ? { windows: attention.length } : interruptions(attention, w)
  sweep[label] = {
    gateInterruptions: g.windows,
    allInterruptions: all.windows,
    reductionVsImmediate: label === 'immediate' ? 0 : Number(((1 - g.windows / gates.length) * 100).toFixed(1)),
  }
}

// How clustered are arrivals already? If six land within four minutes the loop is already batching
// by accident, and the honest baseline is distinct bursts, not distinct arrivals.
const gapsSec = gates.slice(1).map((g, i) => (g.t - gates[i].t) / 1000)
const within60 = gapsSec.filter((s) => s < 60).length
const within600 = gapsSec.filter((s) => s < 600).length

// Dwell, restated because it sets the cost side: an interruption that waits 4 minutes is not the
// same as one that waits 2 days.
const dwell = gates.map((g) => {
  const a = answered.get(g.id)
  return a ? a.t - g.t : null
}).filter((v) => typeof v === 'number').sort((a, b) => a - b)
const q = (arr, f) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(f * (arr.length - 1)))] : null

// The number the queue design would need: per campaign, how many interruptions.
const perCampaign = {}
for (const g of gates) perCampaign[g.campaign] = (perCampaign[g.campaign] || 0) + 1
const counts = Object.values(perCampaign).sort((a, b) => a - b)

const out = {
  attentionAsksTotal: attention.length,
  gateAsks: gates.length,
  byKind: attention.reduce((m, a) => ((m[a.kind] = (m[a.kind] || 0) + 1), m), {}),
  batchingSweep: sweep,
  clustering: {
    interArrivalMedianSec: q(gapsSec, 0.5),
    fractionUnder60s: Number((within60 / gapsSec.length).toFixed(3)),
    fractionUnder600s: Number((within600 / gapsSec.length).toFixed(3)),
  },
  perCampaignGateAsks: { campaigns: counts.length, median: q(counts, 0.5), max: counts[counts.length - 1], maxCampaign: Object.entries(perCampaign).sort((a, b) => b[1] - a[1])[0] },
  dwell: { n: dwell.length, median: q(dwell, 0.5), over1h: dwell.filter((v) => v > 3600e3).length, over24h: dwell.filter((v) => v > 86400e3).length },
}
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync('research/exp/e71.json', JSON.stringify(out, null, 2))
