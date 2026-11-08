// Preflight doctor: the plain question "is this thing set up?".
//
// The expensive failures are not wrong code — they are wrong ideas about the
// environment: a workspace that is not a git repo (nothing to patch, nothing to
// roll back), a dirty tree (a promotion cannot be applied), an old Node (the
// plugin gets dropped), an unwritable home (no ledger, no leases) or a loop
// driven by another window (two writers, one campaign directory).
//
// Everything here is synchronous on purpose: the caller reads the report
// immediately, and a doctor that needs an event loop turn to say something is
// useless exactly when things are broken. It never throws — a check that blows
// up is reported as a failed check carrying the error text.

import { execFileSync } from 'node:child_process'
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Bounded like every other git call in the loop (contract §2). */
const GIT_TIMEOUT_MS = 20_000

/** The floor from package.json `engines.node` ("^22.19 || >=24"), kept loose. */
const MIN_NODE_MAJOR = 22

function errorText(error) {
  const message = error?.message ?? String(error)
  const stderr = String(error?.stderr ?? '').trim()
  return stderr && !message.includes(stderr) ? `${message}: ${stderr}` : message
}

/**
 * Run `git -C <workspace> <args...>` synchronously. Never throws: a git failure
 * (including "not a repository") is returned as `{ ok: false, detail }`.
 */
function runGit(workspace, args) {
  if (typeof workspace !== 'string' || workspace === '') {
    return { ok: false, stdout: '', detail: 'no workspace directory was given' }
  }
  try {
    const stdout = execFileSync('git', ['-C', workspace, ...args], {
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, stdout: String(stdout ?? ''), detail: '' }
  } catch (error) {
    const stderr = String(error?.stderr ?? '').trim()
    return {
      ok: false,
      stdout: String(error?.stdout ?? ''),
      detail: stderr || errorText(error),
    }
  }
}

/**
 * Turn one probe into a check. The probe returns `{ok, detail, fix?}`; a probe
 * that throws becomes a failed check whose detail is the error text. Every
 * failed check carries a concrete fix, never a restatement of the failure.
 */
function check(id, probe) {
  try {
    const result = probe() ?? {}
    const failed = result.ok === false
    return {
      id,
      ok: !failed,
      detail: String(result.detail ?? (failed ? 'check failed' : 'ok')),
      fix: failed ? String(result.fix ?? fallbackFix(id)) : null,
    }
  } catch (error) {
    return {
      id,
      ok: false,
      detail: errorText(error),
      fix: fallbackFix(id),
    }
  }
}

function fallbackFix(id) {
  switch (id) {
    case 'git-repo':
      return 'git init'
    case 'workspace-clean':
      return 'commit or stash the changes so a promotion can land'
    case 'node':
      return `install Node ${MIN_NODE_MAJOR}.19+ (or 24+) and rerun on it`
    case 'home-writable':
      return 'make the loom home directory writable (fix its permissions or point --home elsewhere)'
    case 'loop-owner':
      return 'stop the other window driving the loop, or start the loop in this one'
    default:
      return 'inspect the error above and fix the underlying cause'
  }
}

function checkGitRepo(workspace) {
  const result = runGit(workspace, ['rev-parse', '--is-inside-work-tree'])
  if (!result.ok) {
    return {
      ok: false,
      detail: `workspace is not a git work tree: ${result.detail || 'git rev-parse failed'}`,
      fix: 'git init',
    }
  }
  if (result.stdout.trim() !== 'true') {
    return {
      ok: false,
      detail: `git does not report the workspace as a work tree: ${result.stdout.trim() || '(no output)'}`,
      fix: 'git init',
    }
  }
  return { ok: true, detail: 'workspace is inside a git work tree' }
}

function checkWorkspaceClean(workspace) {
  const repo = runGit(workspace, ['rev-parse', '--is-inside-work-tree'])
  if (!repo.ok) {
    return {
      ok: false,
      detail: `cannot inspect the worktree: ${repo.detail || 'not a git repository'}`,
      fix: 'git init',
    }
  }
  if (repo.stdout.trim() !== 'true') {
    return {
      ok: false,
      detail: 'cannot inspect the worktree: not a git work tree',
      fix: 'git init',
    }
  }
  const status = runGit(workspace, ['status', '--porcelain'])
  if (!status.ok) {
    return {
      ok: false,
      detail: `git status failed: ${status.detail}`,
      fix: 'commit or stash the changes, then rerun',
    }
  }
  const lines = status.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  if (lines.length > 0) {
    const shown = lines.slice(0, 5).join(', ')
    const more = lines.length > 5 ? ` (+${lines.length - 5} more)` : ''
    return {
      ok: false,
      detail: `${lines.length} uncommitted path(s): ${shown}${more} — a promotion cannot be applied`,
      fix: 'commit or stash the changes: git add -A && git commit -m "wip" (or git stash -u)',
    }
  }
  return { ok: true, detail: 'git status --porcelain is empty' }
}

function checkNode() {
  const version = String(process.version ?? '')
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version)
  if (!match) {
    return { ok: false, detail: `cannot read the node version (${version || 'unknown'})`, fix: `install Node ${MIN_NODE_MAJOR}.19+ (or 24+)` }
  }
  const major = Number(match[1])
  const minor = Number(match[2])
  if (major < MIN_NODE_MAJOR) {
    return {
      ok: false,
      detail: `node ${version} is below the supported floor (${MIN_NODE_MAJOR}.19+ or 24+)`,
      fix: `install Node ${MIN_NODE_MAJOR}.19+ (or 24+) and rerun on it`,
    }
  }
  if (major === MIN_NODE_MAJOR && minor < 19) {
    return {
      ok: false,
      detail: `node ${version} is older than ${MIN_NODE_MAJOR}.19, which the plugin's engines range requires`,
      fix: `upgrade to Node ${MIN_NODE_MAJOR}.19+ or 24+`,
    }
  }
  return { ok: true, detail: `node ${version} satisfies the engines range` }
}

function checkHomeWritable(home, now) {
  if (typeof home !== 'string' || home === '') {
    return { ok: false, detail: 'no home directory was given', fix: 'pass the loom home directory' }
  }
  const probe = join(home, `.loom-doctor-${process.pid}-${Number(now) || Date.now()}.probe`)
  try {
    mkdirSync(home, { recursive: true })
    writeFileSync(probe, 'loom doctor probe\n')
  } catch (error) {
    return {
      ok: false,
      detail: `cannot write in ${home}: ${errorText(error)}`,
      fix: 'make the loom home directory writable (fix its permissions or point --home elsewhere)',
    }
  } finally {
    try {
      unlinkSync(probe)
    } catch {
      // The probe may not exist when the write itself failed; that is fine.
    }
  }
  return { ok: true, detail: `wrote and removed a probe file under ${home}` }
}

function checkLoopOwner(runtime) {
  if (!runtime || typeof runtime.ownership !== 'function') {
    return {
      ok: false,
      detail: 'runtime.ownership() is not available, so the loop cannot tell whether this window drives it',
      fix: 'run the doctor with a live Runtime, or start the loop in this window',
    }
  }
  const owner = runtime.ownership()
  if (!owner || owner.mine !== true) {
    const who = owner?.owner ? ` (owned by ${owner.owner})` : ''
    return {
      ok: false,
      detail: `this window does not own the loop${who}; a second window writing the same campaigns would corrupt rounds`,
      fix: 'stop the other window driving the loop, or start the loop in this one',
    }
  }
  return { ok: true, detail: 'this window owns the loop' }
}

/**
 * Check the preconditions the loop actually depends on.
 *
 * @param {{workspace?: string, home?: string, runtime?: {ownership?: () => {mine?: boolean, owner?: string|null}}, config?: object, now?: number}} [options]
 * @returns {{ok: boolean, checks: Array<{id: string, ok: boolean, detail: string, fix: string|null}>}}
 */
export function doctor({ workspace, home, runtime, config, now } = {}) {
  const stamp = Number.isFinite(Number(now)) ? Number(now) : Date.now()
  const checks = [
    check('git-repo', () => checkGitRepo(workspace)),
    check('workspace-clean', () => checkWorkspaceClean(workspace)),
    check('node', () => checkNode()),
    check('home-writable', () => checkHomeWritable(home, stamp)),
    check('loop-owner', () => checkLoopOwner(runtime)),
  ]
  return {
    ok: checks.every((entry) => entry.ok !== false),
    checks,
  }
}
