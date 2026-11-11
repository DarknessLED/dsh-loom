// Eleven task ids were attempted in two or more campaigns. That is the closest
// thing to a repeat this loop owns: same specification, different campaign,
// different base tree, different sample. This decomposes their outcomes into a
// within-campaign (sampling) part and a between-campaign (base tree) part.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rows = []
const taskOf = new Map()
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') taskOf.set(c + '|' + d.n, d.taskId)
    if (e.type === 'attempt.finished') rows.push({ campaign: c, task: taskOf.get(c + '|' + d.round), ok: Boolean(d.verifierOk) })
  }
}

const byTask = new Map()
for (const r of rows) {
  if (!r.task) continue
  if (!byTask.has(r.task)) byTask.set(r.task, [])
  byTask.get(r.task).push(r)
}

// For each task, group by campaign and report the per-campaign pass rate.
const report = []
let pooledWithin = 0, pooledBetween = 0, tasksUsed = 0
for (const [task, xs] of byTask) {
  const camps = new Map()
  for (const x of xs) {
    if (!camps.has(x.campaign)) camps.set(x.campaign, [])
    camps.get(x.campaign).push(x.ok ? 1 : 0)
  }
  if (camps.size < 2) continue
  const rates = [...camps.entries()].map(([c, ys]) => ({ campaign: c, n: ys.length, k: ys.reduce((a, b) => a + b, 0), rate: +(ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(3) }))
  const p = xs.filter((x) => x.ok).length / xs.length
  // Between-campaign variance component (method of moments, equal-n approximation).
  const meanN = xs.length / camps.size
  const varOfRates = rates.reduce((a, r) => a + (r.rate - p) ** 2, 0) / Math.max(1, rates.length - 1)
  const withinVar = p * (1 - p) / meanN
  const tau2 = Math.max(0, varOfRates - withinVar)
  pooledWithin += withinVar
  pooledBetween += tau2
  tasksUsed += 1
  report.push({ task, attempts: xs.length, campaigns: camps.size, pooledRate: +p.toFixed(3), varOfCampaignRates: +varOfRates.toFixed(4), withinCampaignVar: +withinVar.toFixed(4), betweenCampaignVar: +tau2.toFixed(4), rates })
}
report.sort((a, b) => b.attempts - a.attempts)

// Are the repeated tasks the hard ones? Compare their rates to the ledger's.
const allRates = [...byTask.entries()].map(([t, xs]) => ({ t, n: xs.length, rate: xs.filter((x) => x.ok).length / xs.length }))
const repeatedTasks = new Set(report.map((r) => r.task))
const repeatedRates = allRates.filter((r) => repeatedTasks.has(r.t))
const onceRates = allRates.filter((r) => !repeatedTasks.has(r.t))

console.log(JSON.stringify({
  tasksUsed,
  meanWithinVariance: +(pooledWithin / tasksUsed).toFixed(4),
  meanBetweenVariance: +(pooledBetween / tasksUsed).toFixed(4),
  betweenShare: +(pooledBetween / (pooledWithin + pooledBetween)).toFixed(3),
  meanRateRepeatedTasks: +(repeatedRates.reduce((a, r) => a + r.rate, 0) / repeatedRates.length).toFixed(3),
  meanRateSingleCampaignTasks: +(onceRates.reduce((a, r) => a + r.rate, 0) / onceRates.length).toFixed(3),
  report,
}, null, 2))
