// The failure tax: what fraction of a round's work is thrown away, and what
// kinds of failure are there. Every attempt bills tokens; only the promoted one
// produces a patch that lands. This is the denominator for "cost per promotion".
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const root = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')

const byStatus = {}
const byVerify = {}
let attempts = 0, promotedRounds = 0, rounds = 0
const perRoundAttempts = []
const roundAttempts = new Map()
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'attempt.finished') {
      attempts += 1
      const s = d.stopReason || d.status || (d.error ? 'error' : 'ok')
      byStatus[s] = (byStatus[s] || 0) + 1
      const v = d.verifierOk === true ? 'pass' : d.verifierOk === false ? 'fail' : 'unknown'
      byVerify[v] = (byVerify[v] || 0) + 1
      const key = c + '#' + d.round
      roundAttempts.set(key, (roundAttempts.get(key) || 0) + 1)
    }
    if (e.type === 'round.finished') { rounds += 1; if (d.status === 'promoted') promotedRounds += 1 }
  }
}
for (const v of roundAttempts.values()) perRoundAttempts.push(v)
const mean = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : null)
const hist = {}
for (const v of perRoundAttempts) hist[v] = (hist[v] || 0) + 1
console.log(JSON.stringify({
  attempts, rounds, promotedRounds,
  attemptsPerRound: mean(perRoundAttempts),
  attemptsPerRoundHistogram: hist,
  attemptsPerPromotion: promotedRounds ? +(attempts / promotedRounds).toFixed(3) : null,
  byStopReason: byStatus,
  byVerifyResult: byVerify,
  note: 'Every attempt in a round is billed; only the promoted one lands. attempts/promotion is the mechanical multiplier between token spend and landed improvement.',
}, null, 2))
