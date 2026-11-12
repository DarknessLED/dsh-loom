import fs from 'node:fs'
import path from 'node:path'

// gap-w4-035: nobody has published a canary/SLO protocol for a self-modifying loop whose only
// metric is its own verifier; what external signal could abort a bad chain within an hour?
// Nobody published one, but we have one running. Measure the signals we actually have:
//   - which are synchronous (decide before the change lands) vs asynchronous (notice later)
//   - what wall-clock latency each takes to fire
//   - how much of the ledger each one covers

const DIR = 'C:/Users/Darkness/.dsh/loom/campaigns'

function eventsOf(id) {
  const f = path.join(DIR, id, 'events.jsonl')
  if (!fs.existsSync(f)) return []
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn */ }
  }
  return out
}

const campaigns = fs.readdirSync(DIR).filter(id => fs.existsSync(path.join(DIR, id, 'events.jsonl')))
const ev = []
for (const c of campaigns) for (const e of eventsOf(c)) ev.push({ campaign: c, ...e })

const of = t => ev.filter(e => e.type === t)

// 1. Promotions, and what checked them before they landed.
const applied = of('autopilot.applied')
const guardKinds = {}
for (const a of applied) {
  const g = a.data.guard
  const key = g == null ? 'none' : g === 'reused-verifier' ? 'reused-verifier (same command as the task verifier)' : /test-all/.test(g) ? 'scripts/test-all.mjs (independent of the task)' : g
  guardKinds[key] = (guardKinds[key] || 0) + 1
}

// 2. Synchronous guards blocked something: anomaly checkpoints raised because a guard failed.
const anomalies = of('checkpoint.raised').filter(e => e.data.kind === 'anomaly')
const anomalyKinds = {}
for (const a of anomalies) {
  const m = String(a.data.payload?.message ?? '')
  const key = /guard failed/.test(m) ? 'guard-failed-then-rolled-back'
    : /could not be applied/.test(m) ? 'patch-did-not-apply'
    : /dirty/.test(m) ? 'workspace-dirty'
    : /No valid patches/.test(m) ? 'empty-patch'
    : m.slice(0, 40) || 'other'
  anomalyKinds[key] = (anomalyKinds[key] || 0) + 1
}

// 3. Asynchronous signals: latency in rounds and in wall clock.
// plateau fires when `window` consecutive rounds promoted nothing.
const plates = of('checkpoint.raised').filter(e => e.data.kind === 'plateau')
const roundDur = of('round.finished').map(e => e.data.durationMs).filter(Number.isFinite).sort((a, b) => a - b)
const medRound = roundDur[Math.floor(roundDur.length / 2)]
const plateauWindow = plates.length ? (plates[0].data.payload?.window ?? null) : null
const plateauLatencyMs = plateauWindow ? plateauWindow * medRound : null

// 4. Does ANY campaign show a bad state persisting while rounds kept landing? Proxy: promotions
// that landed while a previous checkpoint of the same campaign was still unanswered.
const byCampaign = new Map()
for (const e of ev) {
  const b = byCampaign.get(e.campaign) ?? { raised: [], answered: new Map(), applied: [] }
  if (e.type === 'checkpoint.raised') b.raised.push({ id: e.data.id, kind: e.data.kind, t: e.t })
  if (e.type === 'checkpoint.answered') b.answered.set(e.data.id, e.t)
  if (e.type === 'autopilot.applied') b.applied.push(e.t)
  byCampaign.set(e.campaign, b)
}
let landedWhileOpen = 0
let campaignsWithOverlap = 0
for (const [, b] of byCampaign) {
  let hit = false
  for (const r of b.raised) {
    const closed = b.answered.get(r.id) ?? Infinity
    const n = b.applied.filter(t => t > r.t && t < closed).length
    if (n > 0) { landedWhileOpen += n; hit = true }
  }
  if (hit) campaignsWithOverlap++
}

// 5. Human path: how long a gate checkpoint sat before a person decided (already measured in e67,
// restated here because it is the only signal that exists on campaigns with autopilot off).
const gateRaised = of('checkpoint.raised').filter(e => e.data.kind === 'gate')
const answeredMap = new Map(of('checkpoint.answered').map(e => [e.data.id, { t: e.t, decision: e.data.answer?.decision }]))
const gateDwell = gateRaised.map(g => {
  const a = answeredMap.get(g.data.id)
  return a ? a.t - g.t : null
}).filter(v => typeof v === 'number').sort((a, b) => a - b)
const q = (arr, f) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(f * (arr.length - 1)))] : null

const out = {
  promotions: applied.length,
  guardKinds,
  synchronousAnomalies: { total: anomalies.length, kinds: anomalyKinds },
  asynchronous: {
    medianRoundMs: medRound,
    plateauWindow,
    plateauLatencyMs,
    plateauLatencyMin: plateauLatencyMs ? Math.round(plateauLatencyMs / 60000 * 10) / 10 : null,
    plateauCount: plates.length,
    stuckCount: of('checkpoint.raised').filter(e => e.data.kind === 'stuck').length,
    holdoutCount: of('checkpoint.raised').filter(e => e.data.kind === 'holdout').length,
  },
  promotionsLandedWhileACheckpointWasOpen: { promotions: landedWhileOpen, campaigns: campaignsWithOverlap },
  humanGateDwellMs: { n: gateDwell.length, median: q(gateDwell, 0.5), over1h: gateDwell.filter(v => v > 3600000).length, over24h: gateDwell.filter(v => v > 86400000).length },
}
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync('research/exp/e68.json', JSON.stringify(out, null, 2))
