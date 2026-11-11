// Do we already have repeated measurements of the same task? If a taskId appears
// in more than one campaign, those are independent shots at the same specification
// on different base trees - which is the closest thing to a repeat we own.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rounds = []
const taskOf = new Map()
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') taskOf.set(c + '|' + d.n, d.taskId)
    if (e.type === 'attempt.finished') {
      const task = taskOf.get(c + '|' + d.round)
      rounds.push({ campaign: c, round: d.round, task, ok: Boolean(d.verifierOk), id: d.id, score: d.score })
    }
  }
}
const byTask = new Map()
for (const r of rounds) {
  if (!r.task) continue
  if (!byTask.has(r.task)) byTask.set(r.task, [])
  byTask.get(r.task).push(r)
}
const repeated = [...byTask.entries()]
  .filter(([, xs]) => xs.length >= 3)
  .map(([task, xs]) => ({
    task,
    attempts: xs.length,
    campaigns: [...new Set(xs.map((x) => x.campaign))].length,
    pass: xs.filter((x) => x.ok).length,
    rate: +(xs.filter((x) => x.ok).length / xs.length).toFixed(3),
  }))
  .sort((a, b) => b.attempts - a.attempts)

// The strongest form: the same task attempted in 2+ different campaigns.
const crossCampaign = repeated.filter((r) => r.campaigns >= 2)

// Per-task spread across campaigns, as a between-campaign variance estimate.
console.log(JSON.stringify({
  attemptsWithTask: rounds.filter((r) => r.task).length,
  distinctTasks: byTask.size,
  tasksWithThreePlusAttempts: repeated.length,
  tasksTriedInTwoPlusCampaigns: crossCampaign.length,
  repeated: repeated.slice(0, 14),
  crossCampaign,
}, null, 2))
