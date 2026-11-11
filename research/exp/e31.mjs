// The missing quantity: does the same slot vary between rounds? ana-012 claims the
// loop has no measurement of one configuration twice. Every round does run a1 in
// the same role, so a1's outcomes are repeated measurements of "the explore slot".
// This measures that dispersion, tests the two arms for independence, and replays
// "stop at the first promotion" against "run the full budget".
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const attempts = []
const rounds = []
const taskOf = new Map() // campaign|n -> taskId
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') taskOf.set(c + '|' + d.n, d.taskId)
    if (e.type === 'attempt.finished') attempts.push({ ...d, campaign: c })
    if (e.type === 'round.finished') rounds.push({ ...d, campaign: c, n: Number(d.n) })
  }
}

const armOf = (a) => (String(a.id || '').match(/a(\d+)$/) || [])[1] ?? '?'
const a1 = attempts.filter((a) => armOf(a) === '1')

// 1) Spread of the explore slot's pass rate, per campaign (and per task where known).
const perCampaign = new Map()
for (const a of a1) {
  if (!perCampaign.has(a.campaign)) perCampaign.set(a.campaign, [])
  perCampaign.get(a.campaign).push(Boolean(a.verifierOk))
}
const spread = [...perCampaign.entries()]
  .filter(([, xs]) => xs.length >= 3)
  .map(([c, xs]) => ({ campaign: c, n: xs.length, pass: xs.filter(Boolean).length, rate: +(xs.filter(Boolean).length / xs.length).toFixed(3) }))
  .sort((x, y) => y.n - x.n)

// 2) Two-arm independence: both arms of the same round share round difficulty.
const byRound = new Map()
for (const a of attempts) {
  const key = a.campaign + '|' + a.round
  if (!byRound.has(key)) byRound.set(key, {})
  byRound.get(key)[armOf(a)] = Boolean(a.verifierOk)
}
const pairs = [...byRound.values()].filter((x) => x['1'] !== undefined && x['2'] !== undefined)
const bothPass = pairs.filter((x) => x['1'] && x['2']).length
const bothFail = pairs.filter((x) => !x['1'] && !x['2']).length
const onePass = pairs.length - bothPass - bothFail
const onlyA1 = pairs.filter((x) => x['1'] && !x['2']).length
const onlyA2 = pairs.filter((x) => !x['1'] && x['2']).length
const p = a1.filter((a) => a.verifierOk).length / a1.length
const bothPassIfIndep = pairs.length * p * p
const bothFailIfIndep = pairs.length * (1 - p) * (1 - p)
const n11 = bothPass, n00 = bothFail, n10 = onlyA2, n01 = onlyA1
const phi = pairs.length
  ? (n11 * n00 - n10 * n01) / Math.sqrt((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00))
  : null

// 3) Stopping replay: first promotion ends the campaign versus spending the budget.
const byCampaign = new Map()
for (const r of rounds) {
  if (!byCampaign.has(r.campaign)) byCampaign.set(r.campaign, [])
  byCampaign.get(r.campaign).push(r)
}
let used = 0, stopCampaigns = 0, fullRounds = 0
for (const [, rs] of byCampaign) {
  rs.sort((a, b) => a.n - b.n)
  fullRounds += rs.length
  const first = rs.findIndex((x) => x.promoted || x.status === 'promoted')
  if (first >= 0) { stopCampaigns += 1; used += first + 1 }
}

console.log(JSON.stringify({
  attempts: attempts.length,
  rounds: rounds.length,
  exploreSlot: {
    pooledPassRate: +p.toFixed(4),
    campaignsWithThreePlusRounds: spread.length,
    campaignsAllPass: spread.filter((s) => s.rate === 1).length,
    campaignsNonePass: spread.filter((s) => s.rate === 0).length,
    spread,
  },
  twoArmIndependence: {
    pairs: pairs.length,
    observed: { bothPass, bothFail, onePass },
    ifIndependentAtPooledRate: { bothPass: +bothPassIfIndep.toFixed(1), bothFail: +bothFailIfIndep.toFixed(1) },
    phiCoefficient: phi === null ? null : +phi.toFixed(3),
    onlyA1, onlyA2,
    passGivenA1Pass: +((bothPass) / (bothPass + onlyA2)).toFixed(3),
    passGivenA1Fail: +((onlyA1) / (onlyA1 + bothFail)).toFixed(3),
  },
  stopAtFirstPromotion: {
    campaigns: byCampaign.size,
    campaignsWithPromotion: stopCampaigns,
    roundsToFirstPromotion: used,
    roundsSpent: fullRounds,
    savedShare: fullRounds ? +(1 - used / fullRounds).toFixed(3) : null,
  },
}, null, 2))
