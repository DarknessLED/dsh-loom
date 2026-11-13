// Measure the files the first baseline could not read, and merge rather than
// replace: baseline.json is the record of "what this corpus scores", so a second
// pass must add rows, never drop the ones already taken.
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const sample = Number(process.env.SAMPLE ?? 20)
const concurrency = Number(process.env.CONCURRENCY ?? 4)
const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node measure-extra.mjs <file>...'); process.exit(2) }

function runOne(file) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const child = spawn(process.execPath, ['research/mutants/task.mjs', `--module=${file}`, `--sample=${sample}`, '--maxSpecs=2'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code) => {
      const m = /KILLRATE=([0-9.]+)/.exec(out)
      const counts = /tried=(\d+) killed=(\d+)/.exec(out)
      const excluded = /EXCLUDED=(\d+)/.exec(err)
      resolve({
        file,
        killRate: m ? Number(m[1]) : null,
        tried: counts ? Number(counts[1]) : null,
        killed: counts ? Number(counts[2]) : null,
        excluded: excluded ? Number(excluded[1]) : 0,
        ms: Date.now() - t0,
        error: code === 0 ? null : err.trim().split('\n').slice(-2).join(' | '),
      })
    })
  })
}

const queue = files.slice()
const fresh = []
await Promise.all(Array.from({ length: concurrency }, async () => {
  for (;;) {
    const f = queue.shift()
    if (!f) return
    const row = await runOne(f)
    fresh.push(row)
    console.log(`${row.file.padEnd(28)} ${row.killRate === null ? 'FAIL ' + (row.error || '') : row.killRate.toFixed(3)}  ${row.killed}/${row.tried}  excluded=${row.excluded}  ${(row.ms / 1000).toFixed(1)}s`)
  }
}))

const path = 'research/mutants/baseline.json'
const doc = JSON.parse(fs.readFileSync(path, 'utf8'))
const merged = new Map(doc.rows.map((r) => [r.file, r]))
for (const row of fresh) {
  const prior = merged.get(row.file) ?? {}
  merged.set(row.file, { ...prior, ...row })
}
doc.rows = [...merged.values()]
doc.updatedAt = new Date().toISOString()
fs.writeFileSync(path, JSON.stringify(doc, null, 1))
const ok = doc.rows.filter((r) => r.killRate !== null)
console.log(`--- ${doc.rows.length} rows, ${ok.length} readable, mean ${(ok.reduce((a, r) => a + r.killRate, 0) / ok.length).toFixed(4)}`)
