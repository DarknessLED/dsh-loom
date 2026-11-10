// A worktree is a fresh checkout, and `node_modules/` is gitignored — so a
// verifier that runs inside one sees an empty dependency tree.
//
// This cost three whole rounds of loom-ui7. `tests/config/schema.test.mjs`
// dynamically imports `@deepseek-ai/schemastery` and degrades to `undefined`
// when the import fails (a deliberate choice: a missing schema library must not
// take the host entry down). Inside a worktree that degradation was always
// taken, so the suite read 133/134 on every candidate and every promotion died
// on the holdout — with a failure that had nothing to do with the patch under
// test. The loop was not wrong about the patches; it was measuring the wrong
// tree.
//
// Rule: a worktree gets the repo's dependency tree, and removing the worktree
// must not take the repo's own dependencies with it.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWorktree, removeWorktree } from '../../src/exec/worktree.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

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

const scratch = mkdtempSync(join(tmpdir(), 'loom-wt-deps-'))
const repo = join(scratch, 'repo')
const wt = join(scratch, 'wt')

try {
  mkdirSync(repo, { recursive: true })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.email', 't@example.com')
  git(repo, 'config', 'user.name', 't')
  git(repo, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(repo, 'keep.txt'), 'keep\n')
  writeFileSync(join(repo, '.gitignore'), 'node_modules/\n')
  // The repo has a dependency tree; git does not track it.
  const dep = join(repo, 'node_modules', 'schemastery')
  mkdirSync(dep, { recursive: true })
  writeFileSync(join(dep, 'package.json'), JSON.stringify({ name: 'schemastery', version: '1.0.0', main: 'index.js' }))
  writeFileSync(join(dep, 'index.js'), 'export const value = 42\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-qm', 'base')

  await createWorktree({ repo, dir: wt, branch: 'probe', baseRef: 'HEAD' })

  // 1. The whole point: the dependency is reachable from the worktree.
  ok('the worktree can see the repo dependency tree', existsSync(join(wt, 'node_modules', 'schemastery', 'package.json')))
  ok(
    'and it is the same dependency, not an empty placeholder',
    existsSync(join(wt, 'node_modules', 'schemastery', 'index.js')),
  )

  // 2. A checkout with no dependency tree keeps working unchanged.
  const bare = join(scratch, 'bare')
  mkdirSync(bare, { recursive: true })
  git(bare, 'init', '-q', '-b', 'main')
  git(bare, 'config', 'user.email', 't@example.com')
  git(bare, 'config', 'user.name', 't')
  writeFileSync(join(bare, 'keep.txt'), 'keep\n')
  git(bare, 'add', '-A')
  git(bare, 'commit', '-qm', 'base')
  const bareWt = join(scratch, 'bare-wt')
  let bareErr = null
  try {
    await createWorktree({ repo: bare, dir: bareWt, branch: 'probe', baseRef: 'HEAD' })
  } catch (err) {
    bareErr = err
  }
  ok('a repo without dependencies still makes a worktree', bareErr === null && existsSync(join(bareWt, 'keep.txt')))

  // 3. Removing the worktree leaves the repo's own tree intact — a link that is
  //    deleted the wrong way takes the target with it.
  await removeWorktree({ repo, dir: wt })
  ok('removing the worktree keeps the repo dependency tree', readFileSync(join(dep, 'index.js'), 'utf8').includes('42'))
  ok('and the worktree directory is gone', !existsSync(wt))
} finally {
  try {
    git(repo, 'worktree', 'prune')
  } catch {
    // best effort
  }
  rmSync(scratch, { recursive: true, force: true })
}

// 4. The pin that would have caught the original failure: the spec that broke
//    must degrade *only* when the library is genuinely absent, and the entry
//    must still name itself. Reading the source is enough — importing the entry
//    inside a dependency-less tree is exactly what must not happen by accident.
{
  const src = readFileSync(join(root, 'src', 'config-schema.js'), 'utf8')
  ok('the schema loader tolerates a missing library', /catch/.test(src) && /undefined/.test(src))
  ok('and it is loaded lazily, not at import time', /async function loadConfigSchema/.test(src))
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
