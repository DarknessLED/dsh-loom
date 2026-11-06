import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

function git(args, cwd, timeout = 60_000) {
  return run('git', ['-C', cwd, ...args], { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true })
}

/**
 * Capture the attempt's changes as a patch file. Returns its path and size.
 *
 * `git diff HEAD` silently skips untracked files, so a task whose whole point
 * is a new module used to score 1 in its worktree and then promote a patch that
 * did not contain the module at all. `add -N` (intent to add) makes the new
 * files show up as additions without staging their content.
 */
export async function makePatch({ dir, outFile, base = 'HEAD' }) {
  try {
    await git(['add', '-A', '-N'], dir)
  } catch {
    // An empty worktree or a git that dislikes -A is not a reason to lose the diff.
  }
  const { stdout } = await git(['diff', '--binary', base], dir)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, stdout)
  return { path: outFile, bytes: Buffer.byteLength(stdout), empty: stdout.trim() === '' }
}

/** Undo a patch still present in the workspace (a rejected review stage). */
export async function reversePatch({ repo, patchFile }) {
  try {
    await git(['apply', '--reverse', patchFile], repo)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: 'reverse-failed', detail: String(err?.stderr ?? err?.message ?? err) }
  }
}

export async function applyPatch({ repo, patchFile }) {
  // An empty patch is not a failure: some attempts correctly change nothing.
  try {
    if (readFileSync(patchFile, 'utf8').trim() === '') return { ok: true, reason: 'empty-patch' }
  } catch (err) {
    return { ok: false, reason: 'patch-missing', detail: String(err?.message ?? err) }
  }
  const { stdout: status } = await git(['status', '--porcelain'], repo)
  if (status.trim()) {
    // A human-review gate stages the winning patch in the workspace without
    // committing it, so the reviewer can see the change. Approving that
    // checkpoint asks to apply the same patch again; a tree that differs from
    // HEAD by exactly this patch makes that a no-op, not a dirty-workspace error.
    try {
      await git(['apply', '--reverse', '--check', patchFile], repo)
      return { ok: true, reason: 'already-applied' }
    } catch {
      return { ok: false, reason: 'workspace-dirty', detail: status.trim().split('\n').slice(0, 10) }
    }
  }
  try {
    await git(['apply', '--check', patchFile], repo)
  } catch (err) {
    return { ok: false, reason: 'check-failed', detail: String(err?.stderr ?? err?.message ?? err) }
  }
  try {
    await git(['apply', patchFile], repo)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: 'apply-failed', detail: String(err?.stderr ?? err?.message ?? err) }
  }
}
