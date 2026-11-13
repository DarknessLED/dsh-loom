// The endpoint's own repeat spread.
//
// The A/B pairs of 2026-11-14 were judged against an MDE computed from four
// paired tasks measured once each. A later L1 run of the *same* chain on the same
// tree produced 0.75 on `mut-runtime-cost` where the pair had recorded 0.85 — so
// the design's resolution was set by worker-to-worker variance, not by the MDE
// formula. This script measures that variance directly: one arm, one unchanged
// tree, every task measured twice.
//
// usage: node research/ab/noise.mjs [--campaign=loom-noise] [--out=research/ab/noise.json]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=')
    return [k, v ?? 'true']
  }),
)
const campaign = args.campaign || 'loom-noise'
const out = args.out || join('research', 'ab', 'noise.json')
const stateFile = join(homedir(), '.dsh', 'loom', 'campaigns', campaign, 'views', 'state.json')
if (!existsSync(stateFile)) {
  console.error(`no campaign state at ${stateFile}`)
  process.exit(2)
}
const state = JSON.parse(readFileSync(stateFile, 'utf8'))

// One measurement per finished round: the round's winning attempt's quality.
const byTask = new Map()
for (const round of state.rounds || []) {
  const taskId = round.taskId
  if (!taskId) continue
  const attempts = round.attempts || []
  const best = attempts
    .filter((a) => Number.isFinite(a?.metrics?.quality))
    .sort((a, b) => b.metrics.quality - a.metrics.quality)[0]
  if (!best) continue
  if (!byTask.has(taskId)) byTask.set(taskId, [])
  byTask.get(taskId).push({ round: round.n, quality: best.metrics.quality, attempt: best.id })
}

const tasks = []
for (const [taskId, rows] of byTask) {
  const values = rows.map((r) => r.quality)
  const max = Math.max(...values)
  const min = Math.min(...values)
  tasks.push({ taskId, n: values.length, values, spread: values.length > 1 ? max - min : null, rounds: rows.map((r) => r.round) })
}
tasks.sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1))

const measured = tasks.filter((t) => t.spread !== null)
const spreads = measured.map((t) => t.spread)
const spreadMax = spreads.length > 0 ? Math.max(...spreads) : null
const spreadMean = spreads.length > 0 ? spreads.reduce((s, x) => s + x, 0) / spreads.length : null
// Pooled within-task sd from the pairs: each task contributes its own (max-min)
// over 2 observations, so sd = spread / sqrt(2) per task, pooled by count.
const sd = spreads.length > 0
  ? Math.sqrt(spreads.reduce((s, x) => s + (x / Math.SQRT2) ** 2, 0) / spreads.length)
  : null

const report = {
  measuredAt: new Date().toISOString(),
  campaign,
  tasks,
  pairedTasks: measured.length,
  spreadMax,
  spreadMean,
  sd,
  // What this means for a four-task pair: the smallest dip it can attribute.
  attributableDip: spreadMax,
  note: measured.length === 0
    ? 'no task was measured twice: nothing here says how much a number moves on its own'
    : `the same chain on the same tree moved a task's quality by up to ${spreadMax.toFixed(3)} (mean ${spreadMean.toFixed(3)}); a pair whose worst dip is at or below that cannot attribute the dip to the change`,
}
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8')

for (const t of tasks) {
  const label = t.spread === null ? 'single measurement' : `spread ${t.spread.toFixed(3)}`
  console.log(`${t.taskId.padEnd(28)} n=${t.n}  ${t.values.map((v) => v.toFixed(2)).join(' / ')}  ${label}`)
}
console.log('')
console.log(`paired tasks ${measured.length}, spread max ${spreadMax === null ? '?' : spreadMax.toFixed(3)}, mean ${spreadMean === null ? '?' : spreadMean.toFixed(3)}, pooled sd ${sd === null ? '?' : sd.toFixed(3)}`)
console.log(`use: decide.mjs --noise-spread=${spreadMax === null ? '?' : spreadMax.toFixed(3)}`)
console.log(`written to ${out}`)
