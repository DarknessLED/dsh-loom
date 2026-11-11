// exp-score-001 said a task that has reached 1.0 can never promote again. Test it
// directly: for every no-gain rejection, was the task's best prior score already 1?
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const events = []
const taskOf = new Map()
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') taskOf.set(c + '|' + d.n, d.taskId)
    if (e.type === 'gate.evaluated') events.push({ campaign: c, seq: e.seq, ...d })
  }
}

// bestPriorScore as implemented in src/runtime/round.js: same task, landed rounds only.
const roundsByCampaign = new Map()
for (const g of events) {
  const task = taskOf.get(g.campaign + '|' + g.round) ?? null
  const r = Number(g.round)
  if (!Number.isFinite(r)) continue
  if (!roundsByCampaign.has(g.campaign)) roundsByCampaign.set(g.campaign, [])
  roundsByCampaign.get(g.campaign).push({ round: r, task, score: g.score, promoted: g.promoted, checks: g.checks })
}

function bestPrior(rounds, taskId, beforeRound) {
  let best = null
  for (const x of rounds) {
    if (x.round >= beforeRound) continue
    if (x.task !== taskId) continue
    if (!x.promoted) continue
    if (!Number.isFinite(x.score)) continue
    if (best === null || x.score > best) best = x.score
  }
  return best
}

const noGain = []
for (const [campaign, rounds] of roundsByCampaign) {
  for (const x of rounds) {
    const c = x.checks || {}
    if (c.verifierOk !== true) continue
    if (c.beatsIncumbent !== false) continue
    const best = bestPrior(rounds, x.task, x.round)
    noGain.push({ campaign, round: x.round, task: x.task, score: x.score, best: best, capped: best === 1 })
  }
}

const capped = noGain.filter((x) => x.capped).length
const noPrior = noGain.filter((x) => x.best === null).length

console.log(JSON.stringify({
  noGainRejections: noGain.length,
  bestPriorWasOne: capped,
  noPriorAtAll: noPrior,
  other: noGain.length - capped - noPrior,
  detail: noGain,
}, null, 2))
