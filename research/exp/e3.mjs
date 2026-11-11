// Experiment: replay our own ledger and ask how many promotions survive a
// noise-aware gate. Uses only recorded evidence; no models, no new runs.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const home = process.env.LOOM_HOME || path.join(os.homedir(), '.dsh', 'loom')
const root = path.join(home, 'campaigns')
if (!fs.existsSync(root)) { console.log(JSON.stringify({ error: 'no campaigns at ' + root })); process.exit(0) }

const rounds = []
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  let last = null
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'round.started') last = { campaign: c, round: e.data?.round ?? e.data?.n ?? null, taskId: e.data?.taskId ?? e.data?.task?.id ?? null }
    if (e.type === 'round.finished' && last) {
      rounds.push({ ...last, status: e.data?.status ?? null, score: typeof e.data?.score === 'number' ? e.data.score : null })
      last = null
    }
  }
}
const scored = rounds.filter((r) => typeof r.score === 'number' && Number.isFinite(r.score))
const promoted = scored.filter((r) => r.status === 'promoted')

// Per-task score series, in round order: the noise a task shows across rounds is
// the only variance estimate the ledger can offer without rerunning anything.
const byTask = new Map()
for (const r of scored) {
  const k = r.campaign + '/' + r.taskId
  if (!byTask.has(k)) byTask.set(k, [])
  byTask.get(k).push(r.score)
}
const multi = [...byTask.entries()].filter(([, v]) => v.length >= 3)
function sd(xs) {
  if (xs.length < 2) return null
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}
const sds = multi.map(([, v]) => sd(v)).filter((x) => x !== null)
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }

// A promotion is "decidable" if the margin over the previous score for the same
// task exceeds 2 * the observed pooled SD for that task's family of rounds.
const pooledSd = sds.length ? median(sds) : null
let decidable = 0
let marginal = 0
let undecidable = 0
const perTask = []
for (const [k, v] of byTask) {
  if (v.length < 2) continue
  const taskSd = sd(v) ?? pooledSd
  const best = Math.max(...v.slice(0, -1))
  const lastScore = v[v.length - 1]
  const margin = lastScore - best
  const thr = taskSd === null ? null : 2 * taskSd
  if (thr === null) marginal += 1
  else if (margin >= thr) decidable += 1
  else undecidable += 1
  perTask.push({ key: k, n: v.length, sd: taskSd === null ? null : +taskSd.toFixed(4), margin: +margin.toFixed(4), threshold: thr === null ? null : +thr.toFixed(4) })
}

console.log(JSON.stringify({
  rounds: rounds.length,
  scoredRounds: scored.length,
  promoted: promoted.length,
  promotionRate: scored.length ? +(promoted.length / scored.length).toFixed(3) : null,
  tasksWithSeries: byTask.size,
  tasksWithThreeOrMore: multi.length,
  pooledSdMedian: pooledSd === null ? null : +pooledSd.toFixed(4),
  gateReplay: { decidable, undecidable, insufficientData: marginal },
  decidableShare: decidable + undecidable ? +(decidable / (decidable + undecidable)).toFixed(3) : null,
  sample: perTask.slice(0, 8),
}, null, 2))
