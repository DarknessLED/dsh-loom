import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

function git(args, cwd, timeout = 60_000) {
  return run('git', ['-C', cwd, ...args], { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true })
}

/** Capture the attempt's tracked changes as a patch file. Returns its path and size. */
export async function makePatch({ dir, outFile }) {
  const { stdout } = await git(['diff', '--binary', 'HEAD'], dir)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, stdout)
  return { path: outFile, bytes: Buffer.byteLength(stdout), empty: stdout.trim() === '' }
}

/** Apply a patch to a clean workspace. Never leaves the tree half-applied if --check fails. */
export async function applyPatch({ repo, patchFile }) {
  const { stdout: status } = await git(['status', '--porcelain'], repo)
  if (status.trim()) return { ok: false, reason: 'workspace-dirty', detail: status.trim().split('\n').slice(0, 10) }
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
