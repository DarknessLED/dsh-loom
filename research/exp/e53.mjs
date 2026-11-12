// e53: does the landing path itself corrupt line endings?
//
// Motivation: after approving loom-oracle round 1 the workspace at
// C:/tmp/oracle-live read `QUALITY=1.000` and its `lib.mjs` was 23/23 lines
// "changed" — a whole-file diff whose only difference was CRLF vs LF
// (`git diff` non-empty, `git diff -w` empty, `git ls-files --eol` = `w/crlf`).
// That matters because a dirty workspace is what raises `workspace-dirty`
// anomalies and what the night committer is allowed to commit.
//
// The question this script answers: which step in {applyPatch, commitWorkspace}
// changes line endings, on a fixture where the blob is LF and the worktree is LF?
//
// Run: node research/exp/e53.mjs

import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { applyPatch } from '../../src/exec/patch.js'
import { commitWorkspace } from '../../src/exec/worktree.js'

const NODE = process.execPath
const out = { steps: [], verdict: null }

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
}

/** Same as git(), but byte-faithful: a patch ends in a newline and trimming it corrupts it. */
function gitRaw(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'latin1' })
}

function eol(path) {
  const b = readFileSync(path, 'latin1')
  const crlf = (b.match(/\r\n/g) || []).length
  const lf = (b.match(/\n/g) || []).length
  return { crlf, lf, bareLf: lf - crlf }
}

function record(step, dir) {
  const file = join(dir, 'lib.mjs')
  const e = eol(file)
  const status = git(dir, ['status', '--porcelain']) || ''
  const numstat = git(dir, ['diff', '--numstat']) || ''
  const numstatW = git(dir, ['diff', '-w', '--numstat']) || ''
  out.steps.push({
    step,
    ...e,
    dirty: status.split('\n').filter(Boolean),
    diffLines: numstat,
    diffLinesIgnoringWhitespace: numstatW,
  })
}

function build(dir) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'lib.mjs'), ['const broken = new Set([\'pad\'])', 'export const run = (n) => n', ''].join('\n'), 'latin1')
  writeFileSync(join(dir, 'package.json'), '{"name":"eol-probe","type":"module"}\n', 'latin1')
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'loom@local'])
  git(dir, ['config', 'user.name', 'dsh-loom'])
  git(dir, ['add', '-A'])
  git(dir, ['commit', '-q', '-m', 'base'])
  return git(dir, ['rev-parse', 'HEAD'])
}

function makeProbePatch(dir) {
  // Edit the working tree, then take the patch the same way round.js does.
  // The patch file lives OUTSIDE the repo: an untracked patch inside it makes
  // the workspace dirty and applyPatch then refuses with `workspace-dirty`
  // (learned the hard way in the first run of this script).
  writeFileSync(join(dir, 'lib.mjs'), ['const broken = new Set()', 'export const run = (n) => n', ''].join('\n'), 'latin1')
  git(dir, ['add', '-A', '-N', '--', '.', ':(exclude)node_modules'])
  const patch = gitRaw(dir, ['diff', '--binary', 'HEAD', '--', '.', ':(exclude)node_modules'])
  git(dir, ['checkout', '--', '.'])
  const file = join(root, 'probe.patch')
  writeFileSync(file, patch, 'latin1')
  return file
}

const root = mkdtempSync(join(tmpdir(), 'loom-eol-'))
try {
  const dir = join(root, 'repo')
  build(dir)
  record('after commit of base', dir)
  const patchFile = makeProbePatch(dir)
  record('after taking the patch and restoring', dir)

  const applied = await applyPatch({ repo: dir, patchFile })
  out.applied = applied
  record('after applyPatch', dir)

  const landed = await commitWorkspace(dir, 'probe: landing')
  out.landed = landed
  record('after commitWorkspace', dir)
  record('after commitWorkspace (re-measured)', dir)
} finally {
  rmSync(root, { recursive: true, force: true })
}

const before = out.steps[0]
const afterApply = out.steps.find((s) => s.step === 'after applyPatch')
const afterCommit = out.steps.find((s) => s.step === 'after commitWorkspace')
const corruptsOnApply = afterApply.crlf > 0
const corruptsOnCommit = afterCommit.crlf > 0
out.verdict = {
  baseCrlf: before.crlf,
  applyCrlf: afterApply.crlf,
  commitCrlf: afterCommit.crlf,
  corruptionStep: corruptsOnApply ? 'applyPatch' : corruptsOnCommit ? 'commitWorkspace' : 'neither',
}
console.log(JSON.stringify(out, null, 2))
