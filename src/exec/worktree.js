import { spawn } from 'node:child_process'
import { readdir, readFile, lstat, rm, stat, symlink } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'

/** Every git invocation is bounded (contract §2). */
const GIT_TIMEOUT_MS = 60_000
/** Grace after killing a git process before resolving with partial output. */
const KILL_GRACE_MS = 3000

class GitError extends Error {
  constructor(message, { args, cwd, code, signal, stderr, timedOut } = {}) {
    const detail = (stderr ?? '').trim()
    super(detail ? `${message}: ${detail}` : message)
    this.name = 'GitError'
    this.args = args ?? []
    this.cwd = cwd ?? null
    this.code = code ?? null
    this.signal = signal ?? null
    this.stderr = stderr ?? ''
    this.timedOut = Boolean(timedOut)
  }
}

/**
 * Kill the git process (and any children) before resolving. taskkill must
 * complete before child.kill(), otherwise the parent dies first and the tree
 * lookup fails, orphaning the real git process.
 */
function terminateTree(child) {
  const pid = child.pid
  let finished = false
  const killChild = () => {
    if (finished) return
    finished = true
    try {
      child.kill('SIGKILL')
    } catch {
      // already gone
    }
  }
  if (process.platform !== 'win32' || typeof pid !== 'number') {
    killChild()
    return
  }
  try {
    const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    killer.on('close', killChild)
    killer.on('error', killChild)
    const guard = setTimeout(killChild, 10_000)
    if (typeof guard.unref === 'function') guard.unref()
  } catch {
    killChild()
  }
}

/**
 * Run `git -C <cwd> <args...>` with an argument array (no shell quoting issues).
 * Resolves with { code, stdout, stderr, timedOut }; a spawn failure is reported
 * as code:null plus the message in stderr instead of rejecting.
 */
async function runGit(cwd, args, { timeoutMs = GIT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn('git', ['-C', cwd, ...args], {
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      resolve({
        code: null,
        stdout: '',
        stderr: `spawn error: ${error?.message ?? String(error)}`,
        timedOut: false,
      })
      return
    }

    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    let killTimer = null
    let graceTimer = null

    const settle = (code, signal) => {
      if (settled) return
      settled = true
      if (killTimer) clearTimeout(killTimer)
      if (graceTimer) clearTimeout(graceTimer)
      resolve({
        code: typeof code === 'number' ? code : null,
        signal: signal ?? null,
        stdout,
        stderr,
        timedOut,
      })
    }

    killTimer = setTimeout(() => {
      timedOut = true
      terminateTree(child)
      graceTimer = setTimeout(() => settle(null, null), KILL_GRACE_MS)
      if (typeof graceTimer.unref === 'function') graceTimer.unref()
    }, timeoutMs)
    if (typeof killTimer.unref === 'function') killTimer.unref()

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.stdout?.on('error', () => {})
    child.stderr?.on('error', () => {})

    child.on('error', (error) => {
      stderr += `spawn error: ${error?.message ?? String(error)}\n`
      settle(null, null)
    })
    child.on('close', (code, signal) => settle(code, signal))
  })
}

/**
 * The dependency directory git never tracks but a verifier still needs.
 *
 * A worktree is a checkout of tracked files only, so `node_modules/` — ignored by
 * every repo that has one — does not exist inside it. A verifier that runs there
 * then measures a tree with no dependencies: an import of a dev dependency fails,
 * and any spec that degrades gracefully on a missing library (as ours deliberately
 * does) reports a failure that has nothing to do with the patch under test. That
 * is worse than a crash, because it looks like evidence.
 */
const DEPENDENCY_DIR = 'node_modules'

/**
 * Share the repository's dependency tree with a fresh worktree.
 *
 * A link rather than a copy: the tree can be hundreds of megabytes, and a
 * candidate's patch never changes a dependency. Returns 'linked' when a link was
 * made, 'present' when the worktree already has its own tree, and null when
 * there is nothing to share (a repo with no dependencies keeps working unchanged).
 *
 * @param {string} repo
 * @param {string} dir
 * @returns {Promise<'linked'|'present'|null>}
 */
async function linkDependencies(repo, dir) {
  if (typeof repo !== 'string' || repo === '' || typeof dir !== 'string' || dir === '') return null
  const source = join(repo, DEPENDENCY_DIR)
  const target = join(dir, DEPENDENCY_DIR)
  if (!(await pathExists(source))) return null
  // Never write through a tree that is already there: a worktree created from a
  // base that happens to track node_modules owns its own copy.
  if (await pathExists(target)) return 'present'
  try {
    await symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
    return 'linked'
  } catch {
    // A host that forbids links degrades to the old behaviour rather than
    // failing the round: a missing dependency tree is a broken measurement, but
    // refusing to make a worktree at all would stop the loop dead.
    return null
  }
}

/**
 * Drop the dependency link before the worktree directory goes away.
 *
 * `rm -r` on a link removes the link itself, but unlinking first states the
 * intent: nothing here may ever delete the repository's own dependency tree.
 *
 * @param {string} dir
 */
async function unlinkDependencies(dir) {
  if (typeof dir !== 'string' || dir === '') return
  const target = join(dir, DEPENDENCY_DIR)
  try {
    const info = await lstat(target)
    if (info.isSymbolicLink()) await rm(target, { force: true })
  } catch {
    // nothing to unlink
  }
}

async function pathExists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

/**
 * True when deleting `dir` could destroy the repository itself: the same path,
 * or an ancestor of the repo (e.g. the caller passed the repo root by mistake).
 */
function isUnsafeRemovalTarget(repo, dir) {
  const repoPath = resolve(repo)
  const dirPath = resolve(dir)
  if (repoPath === dirPath) return true
  const rel = relative(dirPath, repoPath)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * True when `dir` is inside a git work tree.
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
export async function isGitRepo(dir) {
  if (typeof dir !== 'string' || dir === '') return false
  const result = await runGit(dir, ['rev-parse', '--is-inside-work-tree'])
  return result.code === 0 && result.stdout.trim() === 'true'
}

/**
 * Delete the admin directories of worktrees whose checkout is provably gone.
 *
 * `git worktree prune` cannot be used here. Prune removes any admin directory it
 * fails to read a `gitdir` file from — and a sibling creating its worktree at the
 * same moment has exactly that shape for a few milliseconds. Running prune inside
 * createWorktree therefore killed concurrent candidates (live: loom-probe r1a2,
 * `fatal: failed to read .git/worktrees/r1a1/commondir: No error`).
 *
 * Here a directory is only removed when we can prove it is stale: it has a
 * `gitdir` file and the path that file points at no longer exists. A registration
 * that is still being written cannot be proven stale, so it is left alone.
 *
 * Never throws. Returns the ids it removed.
 * @param {string} repo
 * @returns {Promise<string[]>}
 */
export async function pruneStaleWorktrees(repo) {
  const removed = []
  if (typeof repo !== 'string' || repo === '') return removed
  const admin = join(repo, '.git', 'worktrees')
  let entries = []
  try {
    entries = await readdir(admin, { withFileTypes: true })
  } catch {
    return removed
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dir = join(admin, entry.name)
    let target = ''
    try {
      target = String(await readFile(join(dir, 'gitdir'), 'utf8')).trim()
    } catch {
      // No gitdir yet: the registration is still being created. Leave it alone.
      continue
    }
    if (target === '') continue
    const checkout = target.endsWith('.git') ? target.slice(0, -'.git'.length) : target
    if (await pathExists(checkout)) continue
    try {
      await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 })
      removed.push(entry.name)
    } catch {
      // best effort
    }
  }
  return removed
}

/**
 * Create (or recreate) a linked worktree. If `dir` already exists it is removed
 * first with removeWorktree(), which never throws.
 * @param {{repo: string, dir: string, branch: string, baseRef?: string}} options
 * @returns {Promise<void>}
 */
export async function createWorktree({ repo, dir, branch, baseRef = 'HEAD' } = {}) {
  if (typeof repo !== 'string' || repo === '') {
    throw new TypeError('createWorktree: repo must be a non-empty string')
  }
  if (typeof dir !== 'string' || dir === '') {
    throw new TypeError('createWorktree: dir must be a non-empty string')
  }
  if (typeof branch !== 'string' || branch === '') {
    throw new TypeError('createWorktree: branch must be a non-empty string')
  }
  const base = typeof baseRef === 'string' && baseRef !== '' ? baseRef : 'HEAD'

  if (await pathExists(dir)) {
    await removeWorktree({ repo, dir })
  }
  // Clear registrations left behind by a crashed run. This must never touch a
  // registration that a sibling candidate is still creating, so it is a
  // prove-then-delete sweep rather than `git worktree prune`.
  await pruneStaleWorktrees(repo)

  const args = ['worktree', 'add', '-B', branch, dir, base]
  const result = await runGit(repo, args)
  if (result.code !== 0) {
    throw new GitError('git worktree add failed', {
      args,
      cwd: repo,
      code: result.code,
      stderr: result.stderr,
      timedOut: result.timedOut,
    })
  }
  // Tracked files only means no dependency tree; a verifier needs one to be
  // measuring the same repo the promotion will land in.
  await linkDependencies(repo, dir)
}

/**
 * Undo uncommitted changes in a workspace (used when an applied promotion fails
 * its guard). Best effort: never throws.
 * @param {string} repo
 */
export async function rollbackWorkspace(repo) {
  await runGit(repo, ['checkout', '--', '.']).catch(() => null)
  await runGit(repo, ['clean', '-fd']).catch(() => null)
}

/**
 * Undo changes to *tracked* files only. This is the safe half of a rollback: it
 * cannot delete anything a person created, which is what recovery needs when the
 * patch that dirtied the tree is only known from a file.
 */
export async function restoreTrackedFiles(repo) {
  const res = await runGit(repo, ['checkout', '--', '.'])
  return { ok: res.code === 0, detail: (res.stderr || '').trim() || null }
}

/**
 * The commit a fresh worktree is started from. Captured before the attempt runs
 * so the patch can be taken against it even when the agent commits on its own
 * branch — `git diff HEAD` would otherwise return an empty patch.
 * @param {string} repo
 * @returns {Promise<string|null>}
 */
export async function headCommit(repo) {
  const result = await runGit(repo, ['rev-parse', 'HEAD'])
  if (result.code !== 0) return null
  const sha = String(result.stdout || '').trim()
  return sha || null
}

/**
 * Commit everything the workspace currently holds, so the next worktree starts
 * from a tree that includes the promotion we just applied.
 *
 * Without this, round N+1 branches off a base that predates round N's patch
 * while the workspace still carries the uncommitted change — the two then
 * conflict on apply ("patch does not apply") and the promotion is lost.
 *
 * Never throws. `committed:false` means there was nothing to commit.
 * @param {string} repo
 * @param {string} message
 * @returns {Promise<{ok: boolean, committed: boolean, sha: string|null, detail?: string}>}
 */
export async function commitWorkspace(repo, message) {
  try {
    const staged = await runGit(repo, ['add', '-A'])
    if (staged.code !== 0) return { ok: false, committed: false, sha: null, detail: staged.stderr }
    const status = await runGit(repo, ['status', '--porcelain'])
    if (status.code !== 0) return { ok: false, committed: false, sha: null, detail: status.stderr }
    if (String(status.stdout || '').trim() === '') return { ok: true, committed: false, sha: null }
    const committed = await runGit(repo, ['commit', '-m', String(message || 'loom: promotion')])
    if (committed.code !== 0) {
      return { ok: false, committed: false, sha: null, detail: committed.stderr || committed.stdout }
    }
    const sha = await headCommit(repo)
    return { ok: true, committed: true, sha }
  } catch (err) {
    return { ok: false, committed: false, sha: null, detail: String(err?.message ?? err) }
  }
}

/**
 * Best-effort worktree removal. Never throws: falls back to `rm -rf` and always
 * prunes stale registrations afterwards.
 * @param {{repo: string, dir: string}} options
 * @returns {Promise<void>}
 */
export async function removeWorktree({ repo, dir } = {}) {
  try {
    if (typeof repo === 'string' && repo !== '' && typeof dir === 'string' && dir !== '') {
      await unlinkDependencies(dir)
      await runGit(repo, ['worktree', 'remove', '--force', dir])
    }
  } catch {
    // best effort
  }
  try {
    if (typeof dir === 'string' && dir !== '') {
      const unsafe =
        typeof repo === 'string' && repo !== '' && isUnsafeRemovalTarget(repo, dir)
      if (!unsafe) {
        await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      }
    }
  } catch {
    // best effort
  }
  try {
    if (typeof repo === 'string' && repo !== '') {
      // Same reason as createWorktree: prune cannot tell a stale registration
      // from a sibling's half-written one, so only proven-stale ones go.
      await pruneStaleWorktrees(repo)
    }
  } catch {
    // best effort
  }
}

/**
 * Paths that changed between two commits.
 *
 * Used to decide whether a cached plan still describes the tree it is about to
 * be applied to: an empty intersection with the files the plan names means the
 * plan's subject did not move. Returns null when git cannot answer — the caller
 * must treat "unknown" as "re-plan", never as "unchanged".
 *
 * @param {string} repo
 * @param {string|null} from
 * @param {string|null} to
 * @returns {Promise<string[]|null>}
 */
export async function changedFiles(repo, from, to) {
  if (typeof repo !== 'string' || repo === '') return null
  if (typeof from !== 'string' || from === '') return null
  if (typeof to !== 'string' || to === '') return null
  const result = await runGit(repo, ['diff', '--name-only', `${from}..${to}`])
  if (result.code !== 0) return null
  return String(result.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/**
 * The repository's tracked files, used to bound which words in a prose plan are
 * paths. An unreadable list is an empty list: the caller then cannot identify
 * the plan's subject and will plan again.
 * @param {string} repo
 * @returns {Promise<string[]>}
 */
export async function trackedFiles(repo) {
  if (typeof repo !== 'string' || repo === '') return []
  const result = await runGit(repo, ['ls-files'])
  if (result.code !== 0) return []
  return String(result.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/**
 * Aggregate `git diff --numstat HEAD` (tracked changes only).
 * @param {{dir: string}} options
 * @returns {Promise<{files: number, insertions: number, deletions: number, filesChanged: string[]}>}
 */
export async function diffStat({ dir } = {}) {
  if (typeof dir !== 'string' || dir === '') {
    throw new TypeError('diffStat: dir must be a non-empty string')
  }
  const result = await runGit(dir, ['diff', '--numstat', 'HEAD'])
  if (result.code !== 0) {
    throw new GitError('git diff --numstat HEAD failed', {
      args: ['diff', '--numstat', 'HEAD'],
      cwd: dir,
      code: result.code,
      stderr: result.stderr,
      timedOut: result.timedOut,
    })
  }

  let insertions = 0
  let deletions = 0
  const filesChanged = []
  for (const line of result.stdout.split('\n')) {
    if (line.trim() === '') continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const [added, removed, ...rest] = parts
    const path = rest.join('\t')
    if (path === '') continue
    filesChanged.push(path)
    // Binary files report "-" instead of a number.
    if (added !== '-') insertions += Number(added) || 0
    if (removed !== '-') deletions += Number(removed) || 0
  }

  return {
    files: filesChanged.length,
    insertions,
    deletions,
    filesChanged,
  }
}

/**
 * True when `git status --porcelain` reports anything (tracked or untracked).
 * @param {{dir: string}} options
 * @returns {Promise<boolean>}
 */
export async function hasChanges({ dir } = {}) {
  if (typeof dir !== 'string' || dir === '') {
    throw new TypeError('hasChanges: dir must be a non-empty string')
  }
  const result = await runGit(dir, ['status', '--porcelain'])
  if (result.code !== 0) {
    throw new GitError('git status --porcelain failed', {
      args: ['status', '--porcelain'],
      cwd: dir,
      code: result.code,
      stderr: result.stderr,
      timedOut: result.timedOut,
    })
  }
  return result.stdout.trim() !== ''
}
