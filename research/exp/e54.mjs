// e54: how often does this repo's history contain a change set that is only
// whitespace / line endings?
//
// Motivation: after landing loom-oracle round 1 the workspace showed
//   ` M lib.mjs`, `git diff` = 23 changed lines, `git diff -w` = empty,
//   `git ls-files --eol lib.mjs` = `i/lf w/crlf`
// i.e. a whole-file diff whose only content was LF -> CRLF. The landing path
// (`applyPatch` -> guard -> `commitWorkspace` with `git add -A`) would commit
// that as a promotion. A whitespace-only landing is a no-op landing wearing the
// costume of work: it marks the round landed, spends a budget slot, and teaches
// the knowledge tree nothing.
//
// This script asks the cheap question first: does it actually happen in the
// repos we run the loop on? It audits every commit of a repo for "numstat
// non-empty, numstat with -w empty".
//
// Run: node research/exp/e54.mjs [repoDir...]

import { execFileSync } from 'node:child_process'

const repos = process.argv.slice(2)
if (repos.length === 0) repos.push('C:/Projects/RSI', 'C:/tmp/oracle-live', 'C:/tmp/graded-live')

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim()
  } catch {
    return null
  }
}

const out = []
for (const repo of repos) {
  const log = git(repo, ['log', '--format=%H'])
  if (log === null) {
    out.push({ repo, error: 'not a git repo' })
    continue
  }
  const shas = log.split('\n').filter(Boolean)
  let withFiles = 0
  const whitespaceOnly = []
  let status
  for (const sha of shas) {
    const full = git(repo, ['show', '--numstat', '--format=', sha])
    if (full === null) continue
    if (full === '') {
      // --format= leaves an empty line for a commit that touched no file.
      continue
    }
    withFiles += 1
    const ignored = git(repo, ['show', '-w', '--numstat', '--format=', sha])
    if (ignored === '') {
      const subject = git(repo, ['log', '-1', '--format=%s', sha]) || ''
      const eol = git(repo, ['ls-tree', '-r', '--name-only', sha]).split('\n').filter(Boolean).length
      whitespaceOnly.push({ sha: sha.slice(0, 10), subject: subject.slice(0, 70), trackedFiles: eol })
    }
  }
  out.push({
    repo,
    commits: shas.length,
    commitsThatTouchedFiles: withFiles,
    whitespaceOnlyCount: whitespaceOnly.length,
    whitespaceOnly: whitespaceOnly.slice(0, 20),
  })
}

const total = out.reduce((n, r) => n + (r.commitsThatTouchedFiles || 0), 0)
const bad = out.reduce((n, r) => n + (r.whitespaceOnlyCount || 0), 0)
console.log(JSON.stringify({ verdict: { commitsAudited: total, whitespaceOnlyCommits: bad }, repos: out }, null, 2))
