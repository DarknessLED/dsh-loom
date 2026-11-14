import { readdirSync, statSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import process from 'node:process'

/**
 * A verify command may shell out to `git` and trust PATH. The harness cannot.
 *
 * The plugin runs inside `DeepSeek Harness.exe`, whose PATH is whatever Windows
 * Explorer hands the app: it has no `C:\Program Files\Git\cmd` on it. A task
 * verifier or the autopilot guard that runs a test suite which itself calls
 * `git init` therefore dies with `spawnSync git ENOENT`, the guard reports a
 * failed promotion, and the round is rolled back for a reason the candidate
 * cannot see or fix.
 *
 * So the same treatment node got: find a directory that really answers `git`,
 * and put it in front. Everything is injectable so the search is testable
 * without depending on the machine.
 */

const GIT_EXE = process.platform === 'win32' ? 'git.exe' : 'git'

/** True when `dir` holds an executable `git`. Never throws. */
export function hasGit(dir) {
  if (typeof dir !== 'string' || dir === '') return false
  try {
    return statSync(join(dir, GIT_EXE)).isFile()
  } catch {
    return false
  }
}

/**
 * Directories worth probing for `git`, most specific first.
 * @param {{env?: Record<string, string | undefined>, platform?: string}} [options]
 * @returns {string[]}
 */
export function gitBinCandidates(options = {}) {
  const env = options.env ?? process.env
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin']
  const out = []
  const programFiles = env.ProgramFiles || env.PROGRAMFILES
  const programFilesX86 = env['ProgramFiles(x86)'] || env['PROGRAMFILES(X86)']
  const localAppData = env.LOCALAPPDATA
  if (programFiles) out.push(join(programFiles, 'Git', 'cmd'))
  if (programFilesX86) out.push(join(programFilesX86, 'Git', 'cmd'))
  if (localAppData) out.push(join(localAppData, 'Programs', 'Git', 'cmd'))
  if (programFiles) out.push(join(programFiles, 'Git', 'bin'))
  // This host does not install Git the usual way: it ships one inside the
  // ops shell (`~/.dsh/dsh-ops/shells/<id>/winuxcmd/usr/bin/git.exe`). That is
  // the only `git` the agent's own shell can see, so it has to be a candidate.
  for (const dir of bundledGitDirs(env)) out.push(dir)
  return out
}

/** Git binaries bundled under the DSH ops shells, if any. Never throws. */
function bundledGitDirs(env) {
  const home = env.USERPROFILE || env.HOME
  if (typeof home !== 'string' || home === '') return []
  const shells = join(home, '.dsh', 'dsh-ops', 'shells')
  let entries
  try {
    entries = readdirSync(shells, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      const root = join(shells, e.name)
      const direct = join(root, 'winuxcmd', 'usr', 'bin')
      const out = [direct]
      // The prepared shell keeps its tree under a content hash:
      // `<shell>/<sha>/winuxcmd/usr/bin/git.exe`.
      let children = []
      try {
        children = readdirSync(root, { withFileTypes: true })
      } catch {
        return out
      }
      for (const child of children) {
        if (!child.isDirectory()) continue
        out.push(join(root, child.name, 'winuxcmd', 'usr', 'bin'))
      }
      return out
    })
}

/** The first candidate directory that holds a `git`, or null. */
export function gitBinDir(options = {}) {
  for (const dir of gitBinCandidates(options)) {
    if (hasGit(dir)) return dir
  }
  return null
}

/** True when a bare `git` already resolves on this PATH. */
export function gitOnPath(pathValue = '', options = {}) {
  const dir = gitBinDir(options)
  if (!dir) return false
  const parts = (typeof pathValue === 'string' ? pathValue : '').split(delimiter)
  return parts.includes(dir)
}

/**
 * A PATH value that answers `git`, keeping the caller's own search order.
 * Returns the input untouched when no install can be found: a PATH that is
 * merely the same is better than one that pretends.
 *
 * @param {string} [basePath]
 * @param {{env?: Record<string, string | undefined>, platform?: string}} [options]
 * @returns {string}
 */
export function withGitOnPath(basePath = '', options = {}) {
  const dir = gitBinDir(options)
  if (!dir) return basePath
  const base = typeof basePath === 'string' ? basePath : ''
  const parts = base.split(delimiter).filter((part) => part !== '')
  if (parts.includes(dir)) return base
  return [dir, ...parts].join(delimiter)
}
