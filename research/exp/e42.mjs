// The verifier is the ceiling on everything the loop can learn. Two verifiers can
// be compared without a model: run both against the same tree and see whether they
// agree on pass/fail and how much of the suite each actually exercises. Here:
// the tasks whose verifier names a single spec file - how many assertions do they
// run, and does the campaign's "verifierOk" mean the same thing across them?
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'

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
    const m = cmd.match(/tests\/[^\s"]+\.test\.mjs/)
    if (m && !tasks.has(t.id)) tasks.set(t.id, { id: t.id, cmd, cwd: t.verify?.cwd || s.workspace, spec: m[0] })
  }
}

async function run(spec) {
  const started = Date.now()
  return new Promise((resolve) => {
    execFile(NODE, [spec], { cwd: 'C:/Projects/RSI', timeout: 120000, windowsHide: true }, (err, stdout, stderr) => {
      const text = String(stdout || '') + String(stderr || '')
      const m = text.match(/(\d+)\/(\d+) passed/)
      resolve({
        ok: !err,
        exitCode: err ? (typeof err.code === 'number' ? err.code : null) : 0,
        passed: m ? Number(m[1]) : null,
        total: m ? Number(m[2]) : null,
        ms: Date.now() - started,
        lines: text.split('\n').filter(Boolean).length,
      })
    })
  })
}

const rows = []
for (const t of [...tasks.values()]) {
  const r = await run(t.spec)
  rows.push({ id: t.id, spec: t.spec, ...r })
}

const withCounts = rows.filter((r) => r.total !== null)
console.log(JSON.stringify({
  distinctSpecTasks: tasks.size,
  measured: rows.length,
  assertionCounts: withCounts.map((r) => r.total).sort((a, b) => a - b),
  totalAssertions: withCounts.reduce((a, r) => a + r.total, 0),
  passing: rows.filter((r) => r.ok).length,
  failing: rows.filter((r) => !r.ok).map((r) => r.id),
  meanMs: Math.round(rows.reduce((a, r) => a + r.ms, 0) / rows.length),
  histogram: withCounts.reduce((acc, r) => { acc[r.total] = (acc[r.total] || 0) + 1; return acc }, {}),
  smallest: [...withCounts].sort((a, b) => a.total - b.total).slice(0, 6),
  largest: [...withCounts].sort((a, b) => b.total - a.total).slice(0, 4),
  failingDetail: rows.filter((r) => !r.ok).map((r) => ({ id: r.id, passed: r.passed, total: r.total, code: r.exitCode })),
}, null, 2))
