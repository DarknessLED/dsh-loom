// T2: what would the procedure inducer have found in campaigns that already ran?
//
// Read-only replay. It answers a cheaper question than a live A/B: is the
// induction rule too loose (procedures that are just "both attempts touched
// this file"), too tight (almost never two promotions on one subject), and how
// many tasks in a campaign would a procedure have reached?
//
// It cannot answer "did the procedure help": the old ledgers never recorded a
// showing or a control. That question needs T3/T4.
//
//   node scripts/knowledge-report.mjs
//   node scripts/knowledge-report.mjs --limit 30 --sample 10 --json
//
// Default home is %USERPROFILE%/.dsh/loom. Nothing is written.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

import { induceProcedures } from '../src/knowledge/procedure.js'

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const home = arg('home', join(homedir(), '.dsh', 'loom'))
const limit = Number(arg('limit', 0)) || Infinity
const sample = Number(arg('sample', 8)) || 8
const asJson = process.argv.includes('--json')

function readEvents(file) {
  const out = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // A torn last line is a crash, not a corpus problem.
    }
  }
  return out
}

function familyMap(events) {
  const map = new Map()
  for (const ev of events) {
    if (ev.type !== 'evalset.registered') continue
    for (const t of ev.data?.tasks ?? []) {
      if (t?.id) map.set(String(t.id), t.family ?? t.id)
    }
  }
  return map
}

function replay(dir) {
  const file = join(dir, 'events.jsonl')
  if (!existsSync(file)) return null
  const events = readEvents(file)
  if (!events.length) return null
  const families = familyMap(events)
  const roundTask = new Map()
  for (const ev of events) if (ev.type === 'round.started' && ev.data?.n != null) roundTask.set(ev.data.n, ev.data.taskId)
  const promoted = new Set()
  for (const ev of events) {
    if (ev.type === 'artifact.promoted' && ev.data?.attemptId) promoted.add(ev.data.attemptId)
  }

  const attempts = []
  for (const ev of events) {
    if (ev.type !== 'attempt.finished') continue
    const d = ev.data ?? {}
    if (!d.id) continue
    const taskId = roundTask.get(d2n(ev, events, d)) ?? d.taskId ?? null
    attempts.push({
      id: String(d.id),
      taskId: taskId ? String(taskId) : null,
      family: families.get(String(taskId)) ?? d.family ?? '*',
      verifierOk: d.verifierOk === true,
      promotable: promoted.has(d.id),
      score: Number(d.score) || 0,
      error: d.error ?? null,
      report: d.report ?? null,
    })
  }

  const procs = induceProcedures(attempts, {})
  const tasks = [...new Set(attempts.map((a) => a.taskId).filter(Boolean))]
  return {
    id: dir.split(/[\\/]/).pop(),
    attempts: attempts.length,
    promotions: promoted.size,
    tasks: tasks.length,
    procedures: procs,
    // What a procedure would have reached: tasks in the same family that the
    // campaign actually ran. An upper bound on showings, not a prediction.
    reach: (proc) =>
      attempts.filter((a) => a.family === proc.family).map((a) => a.taskId).filter(Boolean).length,
  }
}

// attempt.finished does not carry the round number in older ledgers; the round
// is the last round.started before it in the stream.
function d2n(ev, events, d) {
  if (d.round != null) return d.round
  const idx = events.indexOf(ev)
  for (let i = idx; i >= 0; i -= 1) {
    if (events[i].type === 'round.started' && events[i].data?.n != null) return events[i].data.n
  }
  return null
}

const root = join(home, 'campaigns')
const dirs = existsSync(root)
  ? readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(root, d.name))
      .slice(0, limit)
  : []

const reports = dirs.map(replay).filter(Boolean)
const withProcs = reports.filter((r) => r.procedures.length)
const all = withProcs.flatMap((r) => r.procedures.map((p) => ({ ...p, campaign: r.id, reach: r.reach(p) })))

if (asJson) {
  console.log(JSON.stringify({
    home,
    campaignsScanned: reports.length,
    campaignsWithProcedures: withProcs.length,
    procedures: all.length,
    byFamily: [...new Set(all.map((p) => p.family))].sort(),
    items: all.map((p) => ({
      campaign: p.campaign, id: p.id, family: p.family, subject: p.subject,
      support: p.support.length, steps: p.steps, notWhen: p.notWhen, reach: p.reach,
    })),
  }, null, 2))
} else {
  console.log(`# knowledge replay — ${reports.length} campaign(s) under ${home}`)
  console.log(`campaigns with >=1 inducible procedure: ${withProcs.length}`)
  console.log(`procedures induced: ${all.length}\n`)
  const byFamily = new Map()
  for (const p of all) byFamily.set(p.family, (byFamily.get(p.family) ?? 0) + 1)
  for (const [family, n] of [...byFamily].sort((a, b) => b[1] - a[1])) console.log(`  ${family}: ${n}`)
  console.log(`\nsample (${Math.min(sample, all.length)}):`)
  for (const p of all.slice(0, sample)) {
    console.log(`\n[${p.campaign}] ${p.id}  support=${p.support.length} reach=${p.reach}`)
    console.log(`  ${p.claim}`)
    for (const s of p.steps) console.log(`    ${s}`)
    if (p.notWhen.length) console.log(`  notWhen: ${p.notWhen.join(', ')}`)
  }
  const tooThin = all.filter((p) => p.steps.length < 2).length
  console.log(`\nwith fewer than two steps (too generic to try): ${tooThin}/${all.length}`)
}
