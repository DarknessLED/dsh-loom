// One reading per file, in parallel, with the same protocol a task uses.
// Sequential would be ~30 minutes; the modules are disjoint so the only shared
// resource is the CPU, and a mutant that survives is the only thing whose cost
// depends on that.
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const sample = Number(process.env.SAMPLE ?? 20)
const concurrency = Number(process.env.CONCURRENCY ?? 6)
const top = Number(process.env.TOP ?? 26)
const plan = JSON.parse(fs.readFileSync('research/mutants/plan-all.json', 'utf8')).slice(0, top)

function runOne(entry) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const child = spawn(process.execPath, ['research/mutants/task.mjs', `--module=${entry.file}`, `--sample=${sample}`, '--maxSpecs=2'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code) => {
      const m = /KILLRATE=([0-9.]+)/.exec(out)
      const counts = /tried=(\d+) killed=(\d+)/.exec(out)
      resolve({
        file: entry.file,
        slugs: entry.slug,
        mutants: entry.mutants,
        guard: entry.guard.length,
        exit: code,
        killRate: m ? Number(m[1]) : null,
        tried: counts ? Number(counts[1]) : null,
        killed: counts ? Number(counts[2]) : null,
        ms: Date.now() - t0,
        error: code === 0 ? null : err.trim().split('\n').slice(-2).join(' | '),
      })
    })
  })
}

const queue = plan.slice()
const rows = []
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (;;) {
      const entry = queue.shift()
      if (!entry) return
      const row = await runOne(entry)
      rows.push(row)
      console.log(`${row.file.padEnd(30)} ${row.killRate === null ? 'FAIL ' + (row.error || '') : row.killRate.toFixed(3)}  ${row.killed}/${row.tried}  ${(row.ms / 1000).toFixed(1)}s`)
    }
  }),
)

rows.sort((a, b) => (a.killRate ?? 9) - (b.killRate ?? 9))
fs.writeFileSync('research/mutants/baseline.json', JSON.stringify({ sample, concurrency, measuredAt: new Date().toISOString(), rows }, null, 1))
const ok = rows.filter((r) => r.killRate !== null)
console.log('---')
console.log('measured', ok.length, 'files | mean kill rate', (ok.reduce((n, r) => n + r.killRate, 0) / ok.length).toFixed(4))
console.log('with headroom (rate < 0.95):', ok.filter((r) => r.killRate < 0.95).length)
