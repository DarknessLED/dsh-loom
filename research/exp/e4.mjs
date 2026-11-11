// What is the actual scale of our score? A gate built for continuous deltas is
// nonsense if the score is binary.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const home = process.env.LOOM_HOME || path.join(os.homedir(), '.dsh', 'loom')
const root = path.join(home, 'campaigns')
const scores = []
const perTask = new Map()
const statuses = new Map()
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  let cur = null
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'round.started') cur = { c, taskId: e.data?.taskId ?? e.data?.task?.id ?? null }
    if (e.type === 'round.finished') {
      const s = e.data?.score
      statuses.set(e.data?.status, (statuses.get(e.data?.status) || 0) + 1)
      if (typeof s === 'number' && Number.isFinite(s)) {
        scores.push(s)
        if (cur) {
          const k = cur.c + '/' + cur.taskId
          if (!perTask.has(k)) perTask.set(k, [])
          perTask.get(k).push(s)
        }
      }
      cur = null
    }
  }
}
const uniq = [...new Set(scores)].sort((a, b) => a - b)
const hist = new Map()
for (const s of scores) hist.set(s, (hist.get(s) || 0) + 1)
const variableTasks = [...perTask.entries()].filter(([, v]) => new Set(v).size > 1)
console.log(JSON.stringify({
  scoredRounds: scores.length,
  distinctScores: uniq.length,
  scores: uniq.slice(0, 12),
  histogram: [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([s, n]) => s + ' x' + n),
  statuses: [...statuses.entries()].sort((a, b) => b[1] - a[1]),
  tasks: perTask.size,
  tasksWhoseScoreEverVaries: variableTasks.length,
  variableTaskShare: +(variableTasks.length / perTask.size).toFixed(3),
  variableExamples: variableTasks.slice(0, 6).map(([k, v]) => ({ k, v })),
}, null, 2))
