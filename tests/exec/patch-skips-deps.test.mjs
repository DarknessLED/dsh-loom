// A worktree now carries a link to the repo's dependency tree, which means
// `git add -A` has one more thing it could capture. A repo that does not ignore
// `node_modules` would then promote a patch containing the whole dependency tree
// of the machine it ran on: unbounded in size, unapplicable anywhere else, and
// impossible to review. The exclusion has to survive even when the ignore file
// does not mention it.
//
// Rule: a patch never carries the dependency tree, and an ordinary change in the
// same worktree is still captured.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorktree, removeWorktree } from '../../src/exec/worktree.js'
import { makePatch } from '../../src/exec/patch.js'

let pass = 0
let fail = 0
function ok(name, cond, detail) {
  if (cond) {
    pass += 1
    console.log('ok   ' + name)
  } else {
    fail += 1
    console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + detail))
  }
}

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const scratch = mkdtempSync(join(tmpdir(), 'loom-patch-deps-'))
const repo = join(scratch, 'repo')
const wt = join(scratch, 'wt')

try {
  mkdirSync(repo, { recursive: true })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.email', 't@example.com')
  git(repo, 'config', 'user.name', 't')
  git(repo, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(repo, 'keep.txt'), 'keep\n')
  // Deliberately NOT ignored: this is the case a gitignore cannot save us from.
  mkdirSync(join(repo, 'node_modules', 'pkg'), { recursive: true })
  writeFileSync(join(repo, 'node_modules', 'pkg', 'index.js'), 'export const x = 1\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-qm', 'base')

  await createWorktree({ repo, dir: wt, branch: 'probe', baseRef: 'HEAD' })

  // The dependency tree is reachable, and yet must not enter the patch.
  writeFileSync(join(wt, 'keep.txt'), 'keep changed\n')
  writeFileSync(join(wt, 'new.txt'), 'new\n')
  const out = join(scratch, 'a.patch')
  const res = await makePatch({ dir: wt, outFile: out })
  const text = readFileSync(out, 'utf8')

  ok('the patch carries the real change', text.includes('keep changed') && text.includes('new.txt'), `bytes ${res.bytes}`)
  ok('the patch does not carry the dependency tree', !text.includes('node_modules'), text.slice(0, 400))
  ok('and it is not empty', res.empty === false)

  // The exclusion must not swallow a file that merely lives near the name.
  writeFileSync(join(wt, 'node_modules_notes.md'), 'notes\n')
  const out2 = join(scratch, 'b.patch')
  await makePatch({ dir: wt, outFile: out2 })
  const text2 = readFileSync(out2, 'utf8')
  ok('a file whose name starts with the same letters is still captured', text2.includes('node_modules_notes.md'))
} finally {
  await removeWorktree({ repo, dir: wt }).catch(() => null)
  try {
    git(repo, 'worktree', 'prune')
  } catch {
    // best effort
  }
  rmSync(scratch, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
