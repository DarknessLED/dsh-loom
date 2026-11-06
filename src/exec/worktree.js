import { spawn } from 'node:child_process'
import { rm, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

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
  // Clear stale registrations left behind by a crashed run (cheap, ignore errors).
  await runGit(repo, ['worktree', 'prune'])

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
 * Best-effort worktree removal. Never throws: falls back to `rm -rf` and always
 * prunes stale registrations afterwards.
 * @param {{repo: string, dir: string}} options
 * @returns {Promise<void>}
 */
export async function removeWorktree({ repo, dir } = {}) {
  try {
    if (typeof repo === 'string' && repo !== '' && typeof dir === 'string' && dir !== '') {
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
      await runGit(repo, ['worktree', 'prune'])
    }
  } catch {
    // best effort
  }
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
