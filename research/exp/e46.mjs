// The only question that matters for an RSI claim: did the loop get better at
// anything over time? Two independent signals are available without a benchmark:
// (1) the suite size the loop's own guard runs, and (2) the per-attempt cost and
// duration trend across the ledger's real ordering.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const repo = 'C:/Projects/RSI'
const git = (args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20 }).trim()

// (1) How many test files and assertions existed at each week of the project?
// Use the committed tree rather than the working copy.
const commits = git(['log', '--reverse', '--format=%H %ct', '--since=2026-11-06']).split('\n').filter(Boolean)
const sample = []
for (let i = 0; i < commits.length; i += Math.max(1, Math.floor(commits.length / 30))) {
  const [sha, ct] = commits[i].split(' ')
  let files = 0
  try {
    const ls = git(['ls-tree', '-r', '--name-only', sha, 'tests'])
    files = ls.split('\n').filter((f) => f.endsWith('.test.mjs')).length
  } catch { continue }
  let loc = 0
  try { loc = git(['show', `${sha}:package.json`]).length } catch { /* not there */ }
  sample.push({ sha: sha.slice(0, 8), when: new Date(Number(ct) * 1000).toISOString().slice(0, 16), testFiles: files })
}

// (2) The ledger's own trend: attempts by campaign start order, promoted rate and
// duration, first third versus last third.
const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const camps = []
for (const c of fs.readdirSync(base)) {
  const sp = path.join(base, c, 'views', 'state.json')
  if (!fs.existsSync(sp)) continue
  let s; try { s = JSON.parse(fs.readFileSync(sp, 'utf8')) } catch { continue }
  const attempts = []
  for (const line of fs.readFileSync(path.join(base, c, 'events.jsonl'), 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'attempt.finished') attempts.push(e.data)
    if (e.type === 'gate.evaluated') attempts.length && (attempts[attempts.length - 1].promoted = e.data.promoted)
  }
  camps.push({ id: c, createdAt: s.createdAt || '', attempts: attempts.length, promoted: attempts.filter((a) => a.promoted).length, ms: attempts.reduce((x, a) => x + (Number(a.durationMs) || 0), 0) })
}
camps.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
const third = Math.floor(camps.length / 3)
const seg = (arr) => ({
  campaigns: arr.length,
  attempts: arr.reduce((x, c) => x + c.attempts, 0),
  promoted: arr.reduce((x, c) => x + c.promoted, 0),
  promotionRate: +(arr.reduce((x, c) => x + c.promoted, 0) / Math.max(1, arr.reduce((x, c) => x + c.attempts, 0))).toFixed(3),
  meanAttemptSeconds: +(arr.reduce((x, c) => x + c.ms, 0) / Math.max(1, arr.reduce((x, c) => x + c.attempts, 0)) / 1000).toFixed(0),
})

console.log(JSON.stringify({
  testFilesOverTime: sample.filter((s, i) => i % 4 === 0),
  firstTestFileCount: sample[0]?.testFiles ?? null,
  lastTestFileCount: sample[sample.length - 1]?.testFiles ?? null,
  ledgerFirstThird: seg(camps.slice(0, third)),
  ledgerLastThird: seg(camps.slice(-third)),
}, null, 2))
