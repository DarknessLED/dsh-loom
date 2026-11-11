// How many distinguishable settings does the minGain knob actually have, and how
// many replay decisions hinge on a *tie* (delta exactly 0)?
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { replayRounds } from '../../src/loop/replay.js'

const root = join(process.env.USERPROFILE || process.env.HOME, '.dsh', 'loom', 'campaigns')
const dirs = readdirSync(root).filter((d) => existsSync(join(root, d, 'events.jsonl')))
const camps = []
for (const d of dirs) {
  const rounds = new Map()
  for (const line of readFileSync(join(root, d, 'events.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'attempt.finished') continue
    const x = e.data || {}
    const n = Number(x.round)
    if (!Number.isFinite(n)) continue
    if (!rounds.has(n)) rounds.set(n, { n, attempts: [] })
    rounds.get(n).attempts.push({ id: x.id, score: x.score, verifierOk: x.verifierOk })
  }
  const list = [...rounds.values()].sort((a, b) => a.n - b.n)
  if (list.length) camps.push(list)
}

const settings = [0, 0.001, 0.05, 0.1, 0.25, 0.5, 0.75, 0.999, 1]
const rows = []
const sig = new Set()
for (const minGain of settings) {
  let promotions = 0
  let tiePromotions = 0
  let nonZeroDeltas = 0
  const deltas = []
  for (const list of camps) {
    const r = replayRounds({ rounds: list, policy: { minGain, candidates: 2 } })
    promotions += r.metrics.promotions
    for (const d of r.decisions) {
      if (d.delta === null) continue
      deltas.push(d.delta)
      if (d.promote && d.delta === 0) tiePromotions += 1
      if (d.delta !== 0) nonZeroDeltas += 1
    }
  }
  rows.push({ minGain, promotions, tiePromotions, nonZeroDeltas })
  sig.add(promotions)
}
const deltaHist = {}
for (const list of camps) {
  const r = replayRounds({ rounds: list, policy: { minGain: 0, candidates: 2 } })
  for (const d of r.decisions) if (d.delta !== null) deltaHist[d.delta] = (deltaHist[d.delta] || 0) + 1
}
console.log(JSON.stringify({
  campaigns: camps.length,
  settingsTested: settings.length,
  distinctOutcomes: sig.size,
  rows,
  deltaHistogram: Object.fromEntries(Object.entries(deltaHist).sort((a, b) => Number(a[0]) - Number(b[0]))),
}, null, 1))
