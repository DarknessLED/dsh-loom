// The differential oracle needs a flake filter, and a flake filter needs a flake
// rate. Measure ours directly: run every task verifier three times against the
// same unchanged tree and count how often the verdict disagrees with itself.
// This is the measurement w8-measure found nobody has published.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { exec } from 'node:child_process'

const NODE = process.execPath
const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const tasks = new Map()
for (const c of fs.readdirSync(base)) {
  const sp = path.join(base, c, 'views', 'state.json')
  if (!fs.existsSync(sp)) continue
  let s; try { s = JSON.parse(fs.readFileSync(sp, 'utf8')) } catch { continue }
  const list = (s.evalset && Array.isArray(s.evalset.tasks) ? s.evalset.tasks : s.tasks) || []
  for (const t of list) {
    const cmd = String(t.verify?.cmd || '')
    if (!cmd || tasks.has(t.id)) continue
    // The verify command is "<task spec> && <guard suite>". The task's own oracle
    // is the part before the &&: the suite is the guard's check, it runs the same
    // 21 suites every time and would dominate the measurement. Cut on the first
    // unambiguous shell separator and keep what precedes it.
    const own = cmd.split(/\s*&&\s*/)[0].trim()
    tasks.set(t.id, { id: t.id, cmd: own, cwd: t.verify?.cwd || s.workspace })
  }
}

function runOnce(task) {
  const started = Date.now()
  return new Promise((resolve) => {
    // exec (not execFile) so cmd.exe sees the command as one string: execFile
    // re-quotes each argument and breaks the quoted interpreter path.
    exec(task.cmd, { cwd: task.cwd, timeout: 180000, windowsHide: true, maxBuffer: 8 << 20, env: { ...process.env, PATH: `${path.dirname(NODE)};${process.env.PATH}` } }, (err, stdout, stderr) => {
      const text = String(stdout || '') + String(stderr || '')
      const m = text.match(/(\d+)\/(\d+) passed/)
      resolve({ ok: err ? false : true, exitCode: err ? (typeof err.code === 'number' ? err.code : null) : 0, passed: m ? Number(m[1]) : null, total: m ? Number(m[2]) : null, ms: Date.now() - started })
    })
  })
}

const onlySingleSpec = process.argv.includes('--specs-only')
// A full sweep is 94 tasks x 3 runs and outlives the job runner, so allow a slice:
// a stable slice is enough to bound the flake rate, and the id list is recorded.
const LIMIT = Number(process.env.LOOM_FLAKE_LIMIT || 0)
const rows = []
let considered = 0
for (const t of tasks.values()) {
  if (onlySingleSpec && !/^(\S+\.exe|node)?\s*"?[^&|]*tests\/[^\s"&|]+\.test\.mjs"?\s*$/i.test(t.cmd.trim())) continue
  if (LIMIT && considered >= LIMIT) break
  considered += 1
  const runs = []
  for (let i = 0; i < 3; i += 1) runs.push(await runOnce(t))
  const verdicts = runs.map((r) => (r.ok ? 'P' : 'F')).join('')
  const passes = runs.map((r) => (r.passed === null ? '?' : `${r.passed}/${r.total}`))
  rows.push({ id: t.id, verdicts, passes, ms: runs.map((r) => r.ms), sameCounts: new Set(passes).size === 1 })
}

const unstable = rows.filter((r) => new Set(r.verdicts.split('')).size > 1)
const stableButDifferentCount = rows.filter((r) => !unstable.includes(r) && !r.sameCounts)
const totalMs = rows.reduce((a, r) => a + r.ms.reduce((x, y) => x + y, 0), 0)

console.log(JSON.stringify({
  tasksRun: rows.length,
  runsPerTask: 3,
  verdictUnstable: unstable.length,
  verdictUnstableIds: unstable.map((r) => ({ id: r.id, verdicts: r.verdicts })),
  stableVerdictButDifferentAssertionCount: stableButDifferentCount.length,
  assertionCountDriftIds: stableButDifferentCount.slice(0, 6).map((r) => ({ id: r.id, passes: r.passes })),
  totalWallSeconds: +(totalMs / 1000).toFixed(1),
  meanSecondsPerRun: +(totalMs / 1000 / (rows.length * 3)).toFixed(2),
  flakeRate: +(unstable.length / rows.length).toFixed(4),
}, null, 2))
