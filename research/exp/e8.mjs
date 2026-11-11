// Measure the one number nobody publishes (gap-w1-006): how often does the loop
// actually ask a human, per promotion? Our own ledger can answer it.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const home = process.env.LOOM_HOME || path.join(os.homedir(), '.dsh', 'loom')
const root = path.join(home, 'campaigns')

const per = []
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const counts = { rounds: 0, promoted: 0, checkpoints: 0, answered: 0, kinds: {}, answeredKinds: {}, autopilot: 0 }
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.finished') { counts.rounds += 1; if (d.status === 'promoted') counts.promoted += 1 }
    if (e.type === 'checkpoint.raised') { counts.checkpoints += 1; const k = d.kind || 'unknown'; counts.kinds[k] = (counts.kinds[k] || 0) + 1 }
    if (e.type === 'checkpoint.answered' || e.type === 'checkpoint.decided') { counts.answered += 1; const k = d.kind || 'unknown'; counts.answeredKinds[k] = (counts.answeredKinds[k] || 0) + 1 }
    if (e.type === 'autopilot.applied') counts.autopilot += 1
  }
  per.push({ campaign: c, ...counts })
}

const sum = (k) => per.reduce((a, c) => a + c[k], 0)
const kinds = {}
for (const c of per) for (const [k, v] of Object.entries(c.kinds)) kinds[k] = (kinds[k] || 0) + v
const answeredKinds = {}
for (const c of per) for (const [k, v] of Object.entries(c.answeredKinds)) answeredKinds[k] = (answeredKinds[k] || 0) + v

const rounds = sum('rounds'), promoted = sum('promoted'), checkpoints = sum('checkpoints'), answered = sum('answered'), autopilot = sum('autopilot')

// How many campaigns needed zero human decisions at all?
const silent = per.filter((c) => c.checkpoints === 0 && c.rounds > 0)

console.log(JSON.stringify({
  campaigns: per.length,
  rounds, promoted, checkpoints, answered, autopilot,
  humanDecisionsPerPromotion: promoted ? +(checkpoints / promoted).toFixed(3) : null,
  humanDecisionsPerRound: rounds ? +(checkpoints / rounds).toFixed(3) : null,
  answerRate: checkpoints ? +(answered / checkpoints).toFixed(3) : null,
  campaignThatRanWithoutAnyHumanDecision: silent.length,
  silentShare: per.length ? +(silent.length / per.length).toFixed(3) : null,
  checkpointKinds: kinds,
  answeredKinds,
  busiest: per.sort((a, b) => b.checkpoints - a.checkpoints).slice(0, 6).map((c) => c.campaign + ' cp=' + c.checkpoints + ' prom=' + c.promoted + ' rounds=' + c.rounds),
}, null, 2))
