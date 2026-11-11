// Replays the real ledger through the shipped replayRounds() so the JSON can cite
// measured knob sensitivity instead of a claim about it.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { replayRounds, comparePolicies } from '../../src/loop/replay.js'

const root = join(process.env.USERPROFILE || process.env.HOME, '.dsh', 'loom', 'campaigns')
const dirs = readdirSync(root).filter((d) => existsSync(join(root, d, 'events.jsonl')))

const all = []
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
  if (list.length) all.push(list)
}

function run(policy) {
  let promotions = 0, rounds = 0, finalScores = [], lastScores = []
  for (const list of all) {
    const r = replayRounds({ rounds: list, policy })
    promotions += r.metrics.promotions
    rounds += r.metrics.rounds
    finalScores.push(r.metrics.finalScore)
    lastScores.push(list[list.length - 1] && list[list.length - 1].attempts.length ? list[list.length - 1].attempts[0].score : 0)
  }
  const sum = finalScores.reduce((a, b) => a + b, 0)
  return { promotions, rounds, finalScoreSum: sum, finalScoreMean: sum / finalScores.length }
}

const grid = []
for (const minGain of [0, 0.05, 0.1, 0.2, 0.5, 0.9, 1.0, 1.1]) {
  for (const candidates of [1, 2]) {
    const r = run({ minGain, candidates })
    grid.push({ minGain, candidates, ...r })
  }
}
console.log(JSON.stringify({ campaigns: all.length, grid }, null, 1))

// head-to-head the shipped comparator would give for a plausible policy proposal
const pairs = []
for (const candidates of [1, 2]) {
  const c = comparePolicies({ rounds: all.flat(), base: { minGain: 0.05, candidates: 2 }, candidate: { minGain: 0.2, candidates } })
  pairs.push({ candidates, verdict: c.verdict, delta: c.delta, basePromotions: c.base.metrics.promotions, candPromotions: c.candidate.metrics.promotions, baseFinal: c.base.metrics.finalScore, candFinal: c.candidate.metrics.finalScore })
}
console.log(JSON.stringify({ compare: pairs }, null, 1))
