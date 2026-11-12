// w3-attention-gap-dashboard-open-rate: no published figure for how often a human
// opens a dashboard that is available to them.
//
// We have the closest available analogue: every checkpoint is a notification that
// requires a decision before the loop continues. Measuring its response latency
// distribution measures exactly "how often does the person act on an alert that is
// sitting there".
//
// Split by what the reader has to do: a batch of five in one minute (loom-graded2
// raised 6 gate checkpoints in 4 minutes) tells you something different from one
// alert an hour -- which is the whole question behind batching.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')
const readJsonl = (f) => {
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
    // e.t is already epoch milliseconds -- a number. Date.parse(number) is NaN, and
    // NaN latencies were filtered out below, so the first version of this file
    // reported "n=0" and NaN quartiles while claiming 60 of 60 answered.
    if (e.type === 'checkpoint.raised') raised.push({ campaign: c, id: e.data.id, kind: e.data.kind, t: e.t })
    if (e.type === 'checkpoint.answered') answered.set(`${c}|${e.data.id}`, { t: e.t, decision: e.data.answer?.decision, applied: e.data.answer?.applied })
  }
}

const rows = []
for (const r of raised) {
  const a = answered.get(`${r.campaign}|${r.id}`)
  const kind = r.kind === 'gate' ? 'gate' : 'other'
  rows.push({ ...r, kind, latencyMs: a ? a.t - r.t : null, decision: a?.decision ?? null })
}
const lat = rows.map((r) => r.latencyMs).filter((x) => x != null && x >= 0).sort((a, b) => a - b)
if (rows.length && !lat.length) throw new Error('60 checkpoints, 0 usable latencies: the timestamp field is not what the code thinks')
const q = (p) => lat[Math.floor((lat.length - 1) * p)]
const answeredAll = rows.filter((r) => r.latencyMs != null).length

const within = (ms) => lat.filter((x) => x <= ms).length
console.log(`checkpoints raised: ${rows.length}; answered: ${answeredAll} (${(answeredAll / rows.length * 100).toFixed(1)}%)`)
console.log(`\nlatency from raise to decision (n=${lat.length}):`)
console.log(`  min ${(q(0) / 1000).toFixed(0)}s  p25 ${(q(0.25) / 1000).toFixed(0)}s  median ${(q(0.5) / 1000).toFixed(0)}s  p75 ${(q(0.75) / 1000).toFixed(0)}s  p90 ${(q(0.9) / 1000).toFixed(0)}s  max ${(q(1) / 3600000).toFixed(1)}h`)
console.log(`\n"opens the dashboard" proxy -- acted within:`)
for (const [label, ms] of [['2 min', 120000], ['5 min', 300000], ['15 min', 900000], ['1 h', 3600000], ['4 h', 14400000], ['1 day', 86400000]]) {
  console.log(`  ${label.padEnd(7)} ${within(ms)}/${lat.length} = ${(within(ms) / lat.length * 100).toFixed(0)}%  (${lat.filter((x) => x > ms).length} still waiting)`)
}

// Batching effect: alerts that arrive while another is already open.
const sorted = [...rows].filter((r) => r.latencyMs != null).sort((a, b) => a.t - b.t)
let inBatch = 0
for (let i = 1; i < sorted.length; i += 1) if (sorted[i].t - sorted[i - 1].t < 60000) inBatch += 1
console.log(`\nalerts arriving within 60s of the previous one: ${inBatch} of ${sorted.length}`)

// The decision most often taken, by kind -- a dashboard nobody acts on shows up as
// pending, not as rejected.
const byKind = {}
for (const r of rows) {
  const k = r.kind
  byKind[k] ??= { n: 0, answered: 0 }
  byKind[k].n += 1
  if (r.latencyMs != null) byKind[k].answered += 1
}
console.log(`\nby kind:`, JSON.stringify(byKind))

// Gate only, and by kind -- e67 measured gate at 261s median while the all-kind
// median here is 1326s, so the kinds have to be reported separately or the two
// numbers will look like a contradiction to whoever reads both.
const byKindLat = {}
for (const r of rows) {
  if (r.latencyMs == null) continue
  byKindLat[r.kind] ??= []
  byKindLat[r.kind].push(r.latencyMs)
}
for (const [k, xs] of Object.entries(byKindLat)) {
  xs.sort((a, b) => a - b)
  console.log(`  ${k}: n=${xs.length} median ${(xs[Math.floor((xs.length - 1) / 2)] / 1000).toFixed(0)}s`)
}

fs.writeFileSync(path.join('research', 'exp', 'e84.json'), JSON.stringify({
  raised: rows.length, answered: answeredAll,
  latency: { min: q(0), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9), max: q(1) },
  within: Object.fromEntries([['2m', within(120000)], ['5m', within(300000)], ['15m', within(900000)], ['1h', within(3600000)], ['4h', within(14400000)], ['1d', within(86400000)]]),
  inBatch, byKind, byKindLat,
}, null, 2))
