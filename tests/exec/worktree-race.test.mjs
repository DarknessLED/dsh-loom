// Two candidates of the same round create their worktrees at the same time.
// `createWorktree` used to run `git worktree prune` on every call; when a
// sibling's registration was mid-flight, prune deleted its .git/worktrees/<id>
// directory and the sibling died with
//   fatal: failed to read .git/worktrees/<id>/commondir: No error
// (seen live: loom-probe r1a2, 228ms, failureKind 'crash').
//
// The contract: creating worktrees concurrently must leave every one of them
// usable. A cheap, explicit check that a worktree is real is `git -C <dir>
// rev-parse --is-inside-work-tree` plus the branch it is on.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createWorktree, removeWorktree } from '../../src/exec/worktree.js'

let pass = 0
let fail = 0
const ok = (name) => {
  pass += 1
  console.log(`ok   ${name}`)
}
const bad = (name, detail) => {
  fail += 1
  console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}
const check = (name, fn) => {
  try {
    fn()
    ok(name)
  } catch (error) {
    bad(name, error?.message ?? String(error))
  }
}
const assert = {
  equal(actual, expected, what) {
    if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`)
  },
  ok(value, what) {
    if (!value) throw new Error(`${what}: expected truthy, got ${String(value)}`)
  },
  notEqual(actual, expected, what) {
    if (actual === expected) throw new Error(`${what}: expected not ${String(expected)}`)
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
  return { root, repo }
}

const insideWorkTree = (dir) => {
  try {
    return git(dir, 'rev-parse', '--is-inside-work-tree').trim() === 'true'
  } catch {
    return false
  }
}

const branchOf = (dir) => {
  try {
    return git(dir, 'rev-parse', '--abbrev-ref', 'HEAD').trim()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 1. Two worktrees at once, both must be real
// ---------------------------------------------------------------------------
{
  const { root, repo } = makeRepo('loom-wt-race')
  const dirs = [join(root, 'wt-a'), join(root, 'wt-b')]
  const branches = ['loom/race/r1a1', 'loom/race/r1a2']
  const results = await Promise.allSettled([
    createWorktree({ repo, dir: dirs[0], branch: branches[0] }),
    createWorktree({ repo, dir: dirs[1], branch: branches[1] }),
  ])
  const failures = results
    .filter((r) => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason))
  check('both concurrent worktrees are created', () => {
    assert.equal(failures.length, 0, `rejections (${failures.join(' | ')})`)
  })
  check('each worktree is a real git work tree', () => {
    for (const dir of dirs) assert.ok(insideWorkTree(dir), `${dir} inside work tree`)
  })
  check('each worktree is on the branch it asked for', () => {
    assert.equal(branchOf(dirs[0]), branches[0], 'first branch')
    assert.equal(branchOf(dirs[1]), branches[1], 'second branch')
  })
  check('both worktrees still see the tracked file', () => {
    for (const dir of dirs) assert.ok(existsSync(join(dir, 'keep.txt')), `${dir} has keep.txt`)
  })
  await Promise.all(dirs.map((dir) => removeWorktree({ repo, dir })))
  check('removing them leaves no registration behind', () => {
    const listed = git(repo, 'worktree', 'list', '--porcelain')
    assert.equal(listed.includes('wt-a'), false, 'wt-a still registered')
    assert.equal(listed.includes('wt-b'), false, 'wt-b still registered')
  })
  rmSync(root, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 2. Three at once (the loop may raise maxConcurrent later)
// ---------------------------------------------------------------------------
{
  const { root, repo } = makeRepo('loom-wt-race3')
  const dirs = [join(root, 'w1'), join(root, 'w2'), join(root, 'w3')]
  const results = await Promise.allSettled(
    dirs.map((dir, i) => createWorktree({ repo, dir, branch: `loom/race3/r1a${i + 1}` })),
  )
  check('three concurrent worktrees all survive', () => {
    const failures = results
      .filter((r) => r.status === 'rejected')
      .map((r) => String(r.reason?.message ?? r.reason))
    assert.equal(failures.length, 0, `rejections (${failures.join(' | ')})`)
    for (const dir of dirs) assert.ok(insideWorkTree(dir), `${dir} inside work tree`)
  })
  await Promise.all(dirs.map((dir) => removeWorktree({ repo, dir })))
  rmSync(root, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 3. Re-creating an existing worktree still works (the serial path)
// ---------------------------------------------------------------------------
{
  const { root, repo } = makeRepo('loom-wt-serial')
  const dir = join(root, 'wt')
  await createWorktree({ repo, dir, branch: 'loom/serial/r1a1' })
  await createWorktree({ repo, dir, branch: 'loom/serial/r1a1' })
  check('creating the same worktree twice is idempotent', () => {
    assert.ok(insideWorkTree(dir), 're-created worktree is real')
    assert.equal(branchOf(dir), 'loom/serial/r1a1', 'branch after re-create')
  })
  await removeWorktree({ repo, dir })
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
