// GOAL CONDITION 1: can the score stop being binary without touching a test?
//
// The gate reads the verifier's EXIT CODE, so every task is pass/fail. But our
// spec files conventionally print "<pass>/<EXPECTED> passed" at the end, which is
// a level: a partial fix shows 3/8 where a complete one shows 8/8. The gate throws
// that away exactly the way it used to throw away QUALITY= (exp-diff-003).
//
// So the question this answers is not "can we invent a graded score" but "how many
// of our existing tasks already report one, and how much headroom is left in it".
// Headroom is what matters: a task already printing 8/8 at base grants one
// promotion and then nothing, which is the ceiling that made minGain fire 5 times
// in 208 gates.
import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'

const NODE = process.argv[0]
const HOME = process.env.USERPROFILE || process.env.HOME
const CAMPAIGNS = path.join(HOME, '.dsh', 'loom', 'campaigns')
const LIMIT = Number(process.env.LOOM_LIMIT || 0)

// --- collect tasks, newest campaign wins per id -------------------------------
const tasks = new Map()
for (const c of fs.readdirSync(CAMPAIGNS)) {
  const f = path.join(CAMPAIGNS, c, 'views', 'state.json')
  if (!fs.existsSync(f)) continue
  let s
  try { s = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { continue }
  const at = Date.parse(s.updatedAt || 0) || 0
  for (const t of s.evalset?.tasks || []) {
    if (!t?.id || !t?.verify?.cmd) continue
    const prev = tasks.get(t.id)
    if (!prev || at >= prev.at) tasks.set(t.id, { at, campaign: c, task: t })
  }
}

const all = [...tasks.values()]
const pick = LIMIT > 0 ? all.slice(0, LIMIT) : all
console.log(`unique tasks: ${all.length}${LIMIT ? `, running ${pick.length}` : ''}`)

// --- run each task's own oracle, read what it prints --------------------------
const LEVEL = /(\d+)\s*\/\s*(\d+)\s*(?:passed|tests?\s+passed)/i

function runOne(spec) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const child = exec(spec, { cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024, timeout: 90000 }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        exitCode: err ? (err.code ?? 1) : 0,
        out: String(stdout || '') + String(stderr || ''),
        ms: Date.now() - t0,
      })
    })
    child.on('error', () => resolve({ ok: false, exitCode: -1, out: '', ms: Date.now() - t0 }))
  })
}

const rows = []
let missingFile = 0
for (const { task, campaign } of pick) {
  const cmd = task.verify.cmd
  const own = cmd.split(/\s*&&\s*/)[0]
  if (/test-all\.mjs/.test(own)) {
    console.log(`  ---  ${String(task.id).padEnd(34)} skipped (its oracle is the whole suite; e92 measures that)`)
    rows.push({ id: task.id, campaign, declared: [], skipped: 'runs-the-suite', pass: null, total: null, headroom: null })
    continue
  }
  // does the task already declare a metric? (the graded channel exp-diff-006 used)
  const declared = task.verify.metrics ? Object.keys(task.verify.metrics) : []
  const r = await runOne(own)
  const m = r.out.match(LEVEL)
  let pass = null, total = null
  if (m) { pass = Number(m[1]); total = Number(m[2]) }
  if (!m && /Cannot find module|ENOENT/.test(r.out)) missingFile += 1
  rows.push({
    id: task.id, campaign, declared,
    exitOk: r.ok, exitCode: r.exitCode, ms: r.ms,
    pass, total,
    ratio: total ? pass / total : null,
    // headroom = assertions still failing on today's tree
    headroom: total ? total - pass : null,
  })
  const tag = declared.length ? `metric:${declared.join(',')}` : (total ? `${pass}/${total}` : 'no level')
  console.log(`  ${r.ok ? 'ok ' : 'RED'} ${String(task.id).padEnd(34)} ${String(tag).padEnd(22)} ${(r.ms / 1000).toFixed(1)}s`)
}

// --- summary ------------------------------------------------------------------
const withLevel = rows.filter((r) => r.total != null)
const withHeadroom = withLevel.filter((r) => r.headroom > 0)
const declaredAny = rows.filter((r) => r.declared.length)
const totals = {}
for (const r of withLevel) totals[r.total] = (totals[r.total] || 0) + 1

console.log('\n--- how many tasks already report a level ---')
console.log(`tasks run:                     ${rows.length}`)
console.log(`declare a metric in evalset:   ${declaredAny.length}`)
console.log(`print "<pass>/<total> passed":  ${withLevel.length}  (${((100 * withLevel.length) / rows.length).toFixed(1)}%)`)
console.log(`  of those, green today:       ${withLevel.filter((r) => r.headroom === 0).length}`)
console.log(`  of those, headroom > 0:      ${withHeadroom.length}   <- these are graded-ready NOW`)
console.log(`no level printed:              ${rows.length - withLevel.length}  (missing module/binary: ${missingFile})`)
console.log(`declared total sizes:          ${JSON.stringify(Object.entries(totals).sort((a, b) => b[0] - a[0]).map(([k, v]) => `${k}:${v}`).join(' '))}`)

if (withHeadroom.length) {
  console.log('\ngraded-ready tasks and the headroom they expose:')
  for (const r of withHeadroom.sort((a, b) => b.headroom - a.headroom)) {
    console.log(`  ${String(r.id).padEnd(34)} ${r.pass}/${r.total}  (${r.headroom} to win)`)
  }
}

// A level is only usable if the denominator is stable across runs; the tasks that
// print one are the candidate set for condition 1, not the whole corpus.
const out = {
  measuredAt: new Date().toISOString(),
  tasksRun: rows.length,
  declareMetric: declaredAny.length,
  printLevel: withLevel.length,
  greenToday: withLevel.filter((r) => r.headroom === 0).length,
  gradedReady: withHeadroom.length,
  denominatorHistogram: totals,
  rows,
}
fs.writeFileSync('research/exp/e91.json', JSON.stringify(out, null, 2) + '\n')
console.log('\nwrote research/exp/e91.json')
