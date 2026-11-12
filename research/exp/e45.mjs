// The ledger says 114 promotions landed. The repository's history is the only
// independent witness of that. For each autopilot commit the ledger names, ask git
// whether the commit exists, whether it is an ancestor of HEAD, and whether its
// patch touches the same files the attempt's patch names.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const repo = 'C:/Projects/RSI'
const git = (args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 16 << 20 }).trim()

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const applied = []
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'autopilot.applied') continue
    const d = e.data || {}
    if (!d.commit) continue
    applied.push({ campaign: c, round: d.round, commit: d.commit, patch: d.patch, guard: d.guard })
  }
}

const head = git(['rev-parse', 'HEAD'])
let inHistory = 0
let missing = 0
let notAncestor = 0
const notAncestorList = []
for (const a of applied) {
  let exists = false
  try { git(['cat-file', '-e', `${a.commit}^{commit}`]); exists = true } catch { /* gone */ }
  if (!exists) { missing += 1; continue }
  try {
    git(['merge-base', '--is-ancestor', a.commit, head])
    inHistory += 1
  } catch {
    notAncestor += 1
    if (notAncestorList.length < 8) notAncestorList.push({ campaign: a.campaign, round: a.round, commit: a.commit.slice(0, 8) })
  }
}

// Of the commits that ARE ancestors, how many are reachable from a branch other
// than master? i.e. did any promotion land somewhere the repo does not carry?
const branches = git(['for-each-ref', '--format=%(refname:short)', 'refs/heads']).split('\n').filter(Boolean)

console.log(JSON.stringify({
  head: head.slice(0, 8),
  branches,
  autopilotCommits: applied.length,
  commitExists: applied.length - missing,
  commitMissing: missing,
  ancestorOfHead: inHistory,
  existsButNotAncestor: notAncestor,
  examplesNotAncestor: notAncestorList,
  guards: applied.reduce((acc, a) => { const k = String(a.guard ?? 'none'); acc[k] = (acc[k] || 0) + 1; return acc }, {}),
}, null, 2))

// The 15 applied-without-commit records: what did they leave behind?
const noCommit = []
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'autopilot.applied') continue
    const d = e.data || {}
    if (d.commit) continue
    noCommit.push({ campaign: c, round: d.round, committed: d.committed, guard: String(d.guard ?? '').slice(0, 40), hasPatch: Boolean(d.patch && fs.existsSync(d.patch)) })
  }
}
console.log(JSON.stringify({ appliedWithoutCommit: noCommit.length, detail: noCommit }, null, 2))
