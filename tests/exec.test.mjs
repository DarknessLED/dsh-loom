// Unit tests for src/exec/*: no test framework, no dependencies.
// Run: node tests/exec.test.mjs
import { spawnSync } from 'node:child_process'
import { appendFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { runVerifier } from '../src/exec/verifier.js'
import {
  createWorktree,
  diffStat,
  hasChanges,
  isGitRepo,
  removeWorktree,
} from '../src/exec/worktree.js'

const NODE = process.execPath
const MAX_TAIL = 64 * 1024

// ---------------------------------------------------------------------------
// tiny assertion harness
// ---------------------------------------------------------------------------
let passed = 0
let failed = 0
let total = 0

function fail(name, detail) {
  failed += 1
  console.log(`not ok ${total} - ${name}`)
  if (detail) console.log(`  ${String(detail).split('\n').join('\n  ')}`)
}

function ok(cond, name, detail) {
  total += 1
  if (cond) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, detail ?? 'expected a truthy value')
  }
}

function eq(actual, expected, name) {
  total += 1
  if (Object.is(actual, expected)) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function gte(actual, expected, name) {
  total += 1
  if (typeof actual === 'number' && actual >= expected) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected >= ${expected}, got ${JSON.stringify(actual)}`)
  }
}

function deepEq(actual, expected, name) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  total += 1
  if (a === b) {
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } else {
    fail(name, `expected ${b}, got ${a}`)
  }
}

async function throwsNot(promiseFactory, name) {
  total += 1
  try {
    await promiseFactory()
    passed += 1
    console.log(`ok ${total} - ${name}`)
  } catch (error) {
    fail(name, `threw: ${error?.stack ?? error}`)
  }
}

// ---------------------------------------------------------------------------
// git helpers
// ---------------------------------------------------------------------------
function git(cwd, ...args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed (${result.status}): ${result.stderr}`)
  }
  return result.stdout
}

async function exists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

/** Windows refuses to delete a directory that a just-killed process still holds
 *  as its cwd, so retry for a few seconds instead of leaving temp garbage. */
async function cleanup(target) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 })
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  console.log(`# warning: could not remove temp fixture at ${target}`)
  return false
}

// ---------------------------------------------------------------------------
// fixture: a throwaway git repository under os.tmpdir()
// ---------------------------------------------------------------------------
const root = await mkdtemp(join(tmpdir(), 'dsh-loom-exec-'))
const repoDir = join(root, 'repo')
const plainDir = join(root, 'plain')
const missingDir = join(root, 'missing')
const wtDir = join(root, 'worktrees', 'wt-1')
const branch = 'loom/test-1'

await mkdir(repoDir, { recursive: true })
await mkdir(plainDir, { recursive: true })
git(repoDir, 'init', '-b', 'main')
git(repoDir, 'config', 'user.email', 'loom-test@example.test')
git(repoDir, 'config', 'user.name', 'Loom Test')
git(repoDir, 'config', 'commit.gpgsign', 'false')
git(repoDir, 'config', 'core.autocrlf', 'false')
await writeFile(join(repoDir, 'a.txt'), 'line 1\n')
git(repoDir, 'add', '-A')
git(repoDir, 'commit', '-m', 'init')

let cleanExit = false
try {
  // -------------------------------------------------------------------------
  // worktree.js
  // -------------------------------------------------------------------------
  eq(await isGitRepo(repoDir), true, 'isGitRepo: true for a git repository')
  eq(await isGitRepo(plainDir), false, 'isGitRepo: false for a plain directory')
  eq(await isGitRepo(missingDir), false, 'isGitRepo: false for a missing path')

  await createWorktree({ repo: repoDir, dir: wtDir, branch })
  eq(await exists(wtDir), true, 'createWorktree: creates the worktree directory')
  eq(await isGitRepo(wtDir), true, 'createWorktree: worktree is a git repo')
  eq(
    (await readFile(join(wtDir, 'a.txt'), 'utf8')).replace(/\r\n/g, '\n'),
    'line 1\n',
    'createWorktree: base commit content present',
  )
  eq(git(wtDir, 'rev-parse', '--abbrev-ref', 'HEAD').trim(), branch, 'createWorktree: checked out on requested branch')

  eq(await hasChanges({ dir: wtDir }), false, 'hasChanges: false on a clean worktree')
  const cleanStat = await diffStat({ dir: wtDir })
  eq(cleanStat.files, 0, 'diffStat: files=0 on a clean worktree')
  eq(cleanStat.insertions, 0, 'diffStat: insertions=0 on a clean worktree')
  eq(cleanStat.deletions, 0, 'diffStat: deletions=0 on a clean worktree')
  eq(cleanStat.filesChanged.length, 0, 'diffStat: filesChanged empty on a clean worktree')

  await appendFile(join(wtDir, 'a.txt'), 'line 2\n')
  eq(await hasChanges({ dir: wtDir }), true, 'hasChanges: true after modifying a tracked file')
  const changedStat = await diffStat({ dir: wtDir })
  eq(changedStat.files, 1, 'diffStat: files=1 after one modified file')
  eq(changedStat.insertions, 1, 'diffStat: insertions=1 after appending one line')
  eq(changedStat.deletions, 0, 'diffStat: deletions=0 after appending one line')
  deepEq(changedStat.filesChanged, ['a.txt'], 'diffStat: filesChanged lists the modified path')

  await writeFile(join(wtDir, 'untracked.txt'), 'hello\n')
  eq(await hasChanges({ dir: wtDir }), true, 'hasChanges: true with an untracked file present')
  const untrackedStat = await diffStat({ dir: wtDir })
  eq(untrackedStat.files, 1, 'diffStat: ignores untracked files (tracked-only by contract)')

  // Recreating over an existing directory must work: existing dir is removed first.
  await throwsNot(
    () => createWorktree({ repo: repoDir, dir: wtDir, branch }),
    'createWorktree: succeeds when the target directory already exists',
  )
  eq(await hasChanges({ dir: wtDir }), false, 'createWorktree: recreated worktree is clean (stale changes dropped)')
  eq(await exists(join(wtDir, 'untracked.txt')), false, 'createWorktree: stale untracked file is gone')

  // removeWorktree is best effort and must never throw, even twice in a row.
  await removeWorktree({ repo: repoDir, dir: wtDir })
  eq(await exists(wtDir), false, 'removeWorktree: removes the directory')
  const list = git(repoDir, 'worktree', 'list', '--porcelain')
  eq(list.includes(wtDir.replace(/\\/g, '/')), false, 'removeWorktree: worktree registration pruned')
  await throwsNot(() => removeWorktree({ repo: repoDir, dir: wtDir }), 'removeWorktree: second call does not throw')
  await throwsNot(
    () => removeWorktree({ repo: join(root, 'not-a-repo'), dir: join(root, 'nope') }),
    'removeWorktree: nonexistent repo/dir does not throw',
  )
  await removeWorktree({ repo: repoDir, dir: repoDir })
  eq(await exists(join(repoDir, 'a.txt')), true, 'removeWorktree: never deletes the repo root it was handed')
  eq(await isGitRepo(repoDir), true, 'removeWorktree: repo root still a valid git repo')

  // Windows path with spaces must survive the argument-array (non-shell) path.
  const spaceDir = join(root, 'with space', 'wt 2')
  await createWorktree({ repo: repoDir, dir: spaceDir, branch: 'loom/test-2' })
  eq(await exists(join(spaceDir, 'a.txt')), true, 'createWorktree: works with spaces in the target path')
  await removeWorktree({ repo: repoDir, dir: spaceDir })
  eq(await exists(spaceDir), false, 'removeWorktree: works with spaces in the target path')

  // -------------------------------------------------------------------------
  // verifier.js
  // -------------------------------------------------------------------------
  const okRun = await runVerifier({ cmd: `"${NODE}" -e "process.exit(0)"` }, { cwd: root })
  eq(okRun.ok, true, 'runVerifier: exit 0 => ok=true')
  eq(okRun.exitCode, 0, 'runVerifier: exit 0 => exitCode=0')
  eq(okRun.timedOut, false, 'runVerifier: exit 0 => timedOut=false')
  eq(okRun.cwd, root, 'runVerifier: reports the resolved cwd')
  eq(okRun.command, `"${NODE}" -e "process.exit(0)"`, 'runVerifier: reports the command string')

  const spaceRun = await runVerifier(
    { cmd: `"${NODE}" -e "console.log('ok')"` },
    { cwd: join(root, 'with space') },
  )
  eq(spaceRun.ok, true, 'runVerifier: works with spaces in cwd')
  eq(spaceRun.stdout.includes('ok'), true, 'runVerifier: captures stdout')

  const badRun = await runVerifier({ cmd: `"${NODE}" -e "process.exit(3)"` }, { cwd: root })
  eq(badRun.ok, false, 'runVerifier: exit 3 => ok=false')
  eq(badRun.exitCode, 3, 'runVerifier: exit 3 => exitCode=3')

  const metricRun = await runVerifier(
    {
      cmd: `"${NODE}" -e "console.log('coverage: 87.5'); console.log('score: 42'); console.log('ratio 3/4')"`,
      metrics: {
        coverage: { pattern: 'coverage:\\s*([\\d.]+)' },
        score: { pattern: 'score:\\s*(\\d+)' },
        missing: { pattern: 'nope:\\s*(\\d+)' },
        numerator: { pattern: 'ratio (\\d+)/(\\d+)', group: 1 },
        denominator: { pattern: 'ratio (\\d+)/(\\d+)', group: 2 },
      },
    },
    { cwd: root },
  )
  eq(metricRun.metrics.coverage, 87.5, 'runVerifier: metrics parses a float via group 1')
  eq(metricRun.metrics.score, 42, 'runVerifier: metrics parses an integer via group 1')
  eq(Object.hasOwn(metricRun.metrics, 'missing'), false, 'runVerifier: metrics omits keys whose pattern does not match')
  eq(metricRun.metrics.numerator, 3, 'runVerifier: metrics honors an explicit group')
  eq(metricRun.metrics.denominator, 4, 'runVerifier: metrics honors an explicit trailing group')

  const stderrRun = await runVerifier(
    { cmd: `"${NODE}" -e "console.error('boom'); process.exit(1)"` },
    { cwd: root },
  )
  eq(stderrRun.stderr.includes('boom'), true, 'runVerifier: captures stderr')
  eq(stderrRun.ok, false, 'runVerifier: non-zero exit => ok=false')

  const bigRun = await runVerifier(
    { cmd: `"${NODE}" -e "process.stdout.write('x'.repeat(200000))"` },
    { cwd: root },
  )
  ok(
    bigRun.stdout.startsWith('...[truncated]'),
    'runVerifier: oversized stdout is marked as truncated',
    `first bytes: ${JSON.stringify(bigRun.stdout.slice(0, 40))}`,
  )
  ok(
    bigRun.stdout.length <= MAX_TAIL + '...[truncated]\n'.length,
    'runVerifier: stdout tail is capped at ~64KB',
    `length: ${bigRun.stdout.length}`,
  )
  eq(bigRun.stdout.endsWith('x'), true, 'runVerifier: truncation keeps the tail of stdout')

  const timeoutStart = Date.now()
  const timeoutRun = await runVerifier(
    { cmd: `"${NODE}" -e "setTimeout(()=>{},60000)"` },
    { cwd: root, timeoutMs: 800 },
  )
  const timeoutElapsed = Date.now() - timeoutStart
  eq(timeoutRun.timedOut, true, 'runVerifier: timeout sets timedOut=true')
  eq(timeoutRun.ok, false, 'runVerifier: timeout sets ok=false')
  ok(
    timeoutRun.exitCode === null || timeoutRun.exitCode !== 0,
    'runVerifier: timed-out process never reports exitCode=0',
    `exitCode=${JSON.stringify(timeoutRun.exitCode)}`,
  )
  ok(timeoutElapsed < 5000, 'runVerifier: timeout kills the process quickly', `elapsed=${timeoutElapsed}ms`)

  cleanExit = true
} finally {
  await cleanup(root)
}

console.log('')
console.log(`${passed}/${total} passed`)
process.exitCode = failed === 0 && cleanExit ? 0 : 1
