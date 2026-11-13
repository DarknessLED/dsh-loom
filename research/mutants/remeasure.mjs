// One reading per task, serialized, with the exact command the task will run.
//
// Serial on purpose: the instrument takes a repository-wide lock because a guard
// spec imports half the tree, so a parallel baseline measures a tree someone else
// is mutating. The first baseline did exactly that and reported 0.050 for a file
// that reads 0.000 when measured alone.
import fs from 'node:fs'
import { exec } from 'node:child_process'

const doc = JSON.parse(fs.readFileSync('research/mutants/tasks.json', 'utf8'))
const out = []
for (const task of doc.tasks) {
  const t0 = Date.now()
  const reading = await new Promise((resolve) => {
    exec(task.verify.cmd, { cwd: task.verify.cwd, timeout: task.verify.timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      const m = /KILLRATE=([0-9.]+)/.exec(stdout)
      resolve({ killRate: m ? Number(m[1]) : null, error: m ? null : String(err?.message ?? stderr).split('\n')[0] })
    })
  })
  out.push({ id: task.id, file: task.verify.cmd.match(/--module=([^\s]+)/)[1], ...reading, ms: Date.now() - t0 })
  console.log(`${task.id.padEnd(32)} ${reading.killRate === null ? 'FAIL ' + reading.error : reading.killRate.toFixed(4)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}
const ok = out.filter((r) => r.killRate !== null)
fs.writeFileSync('research/mutants/tasks-base.json', JSON.stringify({ measuredAt: new Date().toISOString(), rows: out }, null, 1))
console.log(`--- ${ok.length}/${out.length} readable, mean ${(ok.reduce((a, r) => a + r.killRate, 0) / ok.length).toFixed(4)}`)
