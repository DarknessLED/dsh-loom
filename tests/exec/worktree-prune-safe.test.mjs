// A round's candidates create their worktrees at the same time, and
// `createWorktree` used to run `git worktree prune` on every call. Git's prune
// deletes any admin directory it cannot read a `gitdir` file from — which is
// exactly what a sibling's half-finished registration looks like. Live damage,
// loom-probe r1a2 (228ms, failureKind 'crash'):
//   fatal: failed to read .git/worktrees/r1a1/commondir: No error
//
// The contract pinned here:
//   1. a registration that is still being created (admin dir, no `gitdir` file)
//      survives another createWorktree — we never delete a directory we cannot
//      prove is stale;
//   2. a registration whose `gitdir` points at a path that no longer exists IS
//      removed, so the cleanup the prune was there for still happens;
//   3. two (and eight) concurrent creates all end up usable.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createWorktree, pruneStaleWorktrees, removeWorktree } from '../../src/exec/worktree.js'

let pass = 0
let fail = 0
const ok = (name) => {
  pass += 1
  console.log(`ok   ${name}`)
}
const check = (name, fn) => {
  try {
    fn()
    ok(name)
  } catch (error) {
    fail += 1
    console.log(`FAIL ${name} — ${error?.message ?? String(error)}`)
  }
}
const assert = {
  equal(actual, expected, what) {
    if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`)
  },
  ok(value, what) {
    if (!value) throw new Error(`${what}: expected truthy, got ${String(value)}`)
  },
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function makeRepo(prefix) {
  const root = mkdtempSync(join(tmpdir(), `${prefix}-`))
  const repo = join(root, 'repo')
  execFileSync('git', ['init', '-q', '-b', 'main', repo], { stdio: 'ignore' })
  git(repo, 'config', 'user.email', 'loom@local')
  git(repo, 'config', 'user.name', 'dsh-loom')
  git(repo, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(repo, 'keep.txt'), 'keep\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'base')
  const admin = join(repo, '.git', 'worktrees')
  return { root, repo, admin }
}

const insideWorkTree = (dir) => {
  try {
    return git(dir, 'rev-parse', '--is-inside-work-tree').trim() === 'true'
  } catch {
    return false
  }
}

const adminDirs = (admin) => (existsSync(admin) ? readdirSync(admin) : [])

// ---------------------------------------------------------------------------
// 1. A registration that is mid-create is never deleted
// ---------------------------------------------------------------------------
{
  const { root, repo, admin } = makeRepo('loom-wt-partial')
  mkdirSync(admin, { recursive: true })
  // A sibling created its admin dir but has not written `gitdir` yet.
  const partial = join(admin, 'pending-000000')
  mkdirSync(partial, { recursive: true })

  await createWorktree({ repo, dir: join(root, 'wt-a'), branch: 'loom/partial/r1a1' })

  check('a half-created registration survives another createWorktree', () => {
    assert.ok(existsSync(partial), `${partial} was deleted while it was still being created`)
  })
  check('the worktree that was created is real', () => {
    assert.ok(insideWorkTree(join(root, 'wt-a')), 'wt-a inside work tree')
  })
  await removeWorktree({ repo, dir: join(root, 'wt-a') })
  rmSync(root, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 2. A provably stale registration is still cleaned up
// ---------------------------------------------------------------------------
{
  const { root, repo, admin } = makeRepo('loom-wt-stale')
  mkdirSync(admin, { recursive: true })
  const gone = join(root, 'already-deleted')
  const stale = join(admin, 'stale-111111')
  mkdirSync(stale, { recursive: true })
  writeFileSync(join(stale, 'gitdir'), `${join(gone, '.git')}\n`)

  const removed = await pruneStaleWorktrees(repo)

  check('a registration whose worktree is gone is removed', () => {
    assert.equal(removed.includes('stale-111111'), true, `removed: ${JSON.stringify(removed)}`)
    assert.equal(existsSync(stale), false, 'stale admin dir still on disk')
  })
  const fresh = join(root, 'wt-b')
  await createWorktree({ repo, dir: fresh, branch: 'loom/stale/r1a1' })
  check('creating a worktree after the cleanup still works', () => {
    assert.ok(insideWorkTree(fresh), 'wt-b inside work tree')
  })
  await removeWorktree({ repo, dir: fresh })
  rmSync(root, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 3. Eight concurrent creates all end up usable
// ---------------------------------------------------------------------------
{
  const { root, repo } = makeRepo('loom-wt-many')
  const dirs = Array.from({ length: 8 }, (_, i) => join(root, `w${i}`))
  const results = await Promise.allSettled(
    dirs.map((dir, i) => createWorktree({ repo, dir, branch: `loom/many/r1a${i + 1}` })),
  )
  check('eight concurrent creates all survive', () => {
    const failures = results
      .filter((r) => r.status === 'rejected')
      .map((r) => String(r.reason?.message ?? r.reason).split('\n')[0])
    assert.equal(failures.length, 0, `rejections: ${failures.join(' | ')}`)
    for (const dir of dirs) assert.ok(insideWorkTree(dir), `${dir} inside work tree`)
  })
  check('no registration was lost', () => {
    const listed = git(repo, 'worktree', 'list', '--porcelain')
    // git records the path it resolved, not necessarily the string we passed:
    // a CI runner hands out the 8.3 name (`C:\Users\RUNNER~1\AppData\Local\Temp\…`)
    // and git writes the long one. Compare canonical paths, not substrings of
    // whichever spelling happened to reach us.
    const canonical = (p) => {
      let out = p
      try {
        out = realpathSync.native(p)
      } catch {
        // keep the path we were given
      }
      return out.replaceAll('\\', '/').toLowerCase()
    }
    const entries = listed
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => canonical(line.slice('worktree '.length).trim()))
    for (const dir of dirs) {
      const wanted = canonical(dir)
      assert.equal(
        entries.includes(wanted) || entries.some((e) => e.endsWith(wanted.split('/').pop())),
        true,
        `${dir} missing from worktree list`,
      )
    }
  })
  await Promise.all(dirs.map((dir) => removeWorktree({ repo, dir })))
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
