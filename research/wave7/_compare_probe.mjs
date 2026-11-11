// Per-campaign comparePolicies so the comparator is fed one campaign at a time
// (feeding a pooled list mixes campaigns and resets incumbent incorrectly).
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { comparePolicies } from '../../src/loop/replay.js'

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

const out = {}
for (const [name, base, cand] of [
  ['minGain .05 -> .2', { minGain: 0.05, candidates: 2 }, { minGain: 0.2, candidates: 2 }],
  ['candidates 2 -> 1', { minGain: 0.05, candidates: 2 }, { minGain: 0.05, candidates: 1 }],
  ['digits 1.1 (invalid)', { minGain: 0.05, candidates: 2 }, { minGain: 1.1, candidates: 2 }],
]) {
  const c = { 'no-evidence': 0, 'candidate-better': 0, 'candidate-worse': 0, 'no-difference': 0 }
  for (const list of camps) {
    const r = comparePolicies({ rounds: list, base, candidate: cand })
    c[r.verdict] += 1
  }
  out[name] = c
}
console.log(JSON.stringify({ campaigns: camps.length, verdicts: out }, null, 1))
