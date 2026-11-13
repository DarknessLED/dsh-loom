// The endpoint's own repeat spread, from runs already recorded.
//
// The A/B pairs of 2026-11-14 were judged against an MDE computed from four
// paired tasks measured once each. Later runs of the *same* configuration
// produced 0.75 on `mut-runtime-cost` where the pair had recorded 0.85 — so the
// design's resolution was set by worker-to-worker variance, not by the MDE
// formula. A dedicated repeat campaign could not answer this: the earlier
// campaign's promotions moved HEAD, so each of its rounds found the base already
// at the candidate's number and reported no-gain. The honest source is the runs
// that already exist: same chain, same tree, different worker draws.
//
// usage: node research/ab/noise.mjs --campaigns=ab-cand1b,ab-cand2b,ab-cand3b,loom-v2check
//        [--group=ab-cand1b,ab-cand2b] [--out=research/ab/noise.json]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=')
    return [k, v ?? 'true']
  }),
)
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean)
const campaigns = list(args.campaigns)
if (campaigns.length === 0) {
  console.error('usage: noise.mjs --campaigns=<a,b,...> [--group=<subset that shares a configuration>] [--out=<file>]')
  process.exit(2)
}
const out = args.out || join('research', 'ab', 'noise.json')
const ROOT = join(homedir(), '.dsh', 'loom', 'campaigns')

function readings(campaign) {
  const file = join(ROOT, campaign, 'views', 'state.json')
  if (!existsSync(file)) return []
  const state = JSON.parse(readFileSync(file, 'utf8'))
  const rows = []
  for (const round of state.rounds || []) {
    const attempts = (round.attempts || []).filter((a) => Number.isFinite(a?.metrics?.quality))
    if (attempts.length === 0) continue
    const best = attempts.slice().sort((a, b) => b.metrics.quality - a.metrics.quality)[0]
    rows.push({
      campaign,
      round: round.n,
      taskId: round.taskId,
      quality: best.metrics.quality,
      attempt: best.id,
      candidates: (round.attempts || []).length,
      chainVersion: state.chain?.activeVersion ?? null,
    })
  }
  return rows
}

const all = campaigns.flatMap(readings)
const byTask = new Map()
for (const r of all) {
  if (!r.taskId) continue
  if (!byTask.has(r.taskId)) byTask.set(r.taskId, [])
  byTask.get(r.taskId).push(r)
}

const tasks = []
for (const [taskId, rows] of byTask) {
  const values = rows.map((r) => r.quality)
  tasks.push({
    taskId,
    n: values.length,
    values,
    runs: rows.map((r) => `${r.campaign}/r${r.round}${r.candidates === 1 ? '(1c)' : ''}`),
    spread: values.length > 1 ? Math.max(...values) - Math.min(...values) : null,
  })
}
tasks.sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1))

const measured = tasks.filter((t) => t.spread !== null && t.n > 1)
const spreads = measured.map((t) => t.spread)
const spreadMax = spreads.length > 0 ? Math.max(...spreads) : null
const spreadMean = spreads.length > 0 ? spreads.reduce((s, x) => s + x, 0) / spreads.length : null
// Pooled within-task sd: each task's spread over 2 draws estimates sd * sqrt(2);
// tasks with more draws contribute their own sample sd.
const sds = []
for (const t of measured) {
  const vals = t.values
  const mean = vals.reduce((s, x) => s + x, 0) / vals.length
  const varSum = vals.reduce((s, x) => s + (x - mean) ** 2, 0)
  if (vals.length > 2) sds.push(Math.sqrt(varSum / (vals.length - 1)))
  else sds.push(t.spread / Math.SQRT2)
}
const sd = sds.length > 0 ? Math.sqrt(sds.reduce((s, x) => s + x * x, 0) / sds.length) : null

const report = {
  measuredAt: new Date().toISOString(),
  campaigns,
  tasks,
  pairedTasks: measured.length,
  spreadMax,
  spreadMean,
  sd,
  attributableDip: spreadMax,
  caveat: measured.length === 0
    ? 'no task was measured more than once: nothing here says how much a number moves on its own'
    : `same configuration, same tree, ${measured.length} task(s) measured more than once; the largest move is ${spreadMax.toFixed(3)}. A pair whose worst dip is at or below that cannot attribute the dip to the change. This is an upper bound from few draws, not a variance estimate.`,
}
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8')

for (const t of tasks) {
  const label = t.spread === null ? 'single measurement' : `spread ${t.spread.toFixed(3)}`
  console.log(`${t.taskId.padEnd(28)} n=${t.n}  ${t.values.map((v) => v.toFixed(2)).join(' / ')}  ${label}   [${t.runs.join(', ')}]`)
}
console.log('')
console.log(`measured ${measured.length} task(s), spread max ${spreadMax === null ? '?' : spreadMax.toFixed(3)}, mean ${spreadMean === null ? '?' : spreadMean.toFixed(3)}, pooled sd ${sd === null ? '?' : sd.toFixed(3)}`)
console.log(`use: decide.mjs --noise-spread=${spreadMax === null ? '?' : spreadMax.toFixed(3)}`)
console.log(`written to ${out}`)
