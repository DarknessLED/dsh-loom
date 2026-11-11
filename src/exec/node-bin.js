import { readdirSync, statSync } from 'node:fs'
import { basename, delimiter, dirname, join } from 'node:path'
import process from 'node:process'

/**
 * A verify command is written by the task, not by the harness: it may say
 * `node scripts/test.mjs` and trust PATH. The harness cannot.
 *
 * On this host the plugin runs inside `DeepSeek Harness.exe` (Electron), so
 * `process.execPath` names the application, not an interpreter. Prepending
 * `dirname(process.execPath)` to PATH — which is what the runner used to do —
 * therefore adds a directory with no `node.exe` in it, and every task whose
 * verifier says `node` fails with exit code 1 no matter what the workspace
 * contains. That is indistinguishable from a candidate that did not do the
 * work, so the loop spends whole rounds on a gate nobody can reach.
 *
 * So: find a directory that actually holds an interpreter, and put *that* in
 * front. Real node first (the DSH runtime ships one), then whatever PATH
 * already answers, then the usual install locations. Everything is injectable
 * so the search can be tested without depending on the machine it runs on.
 */

const NODE_EXE = process.platform === 'win32' ? 'node.exe' : 'node'

/** True when `dir` holds an executable interpreter. Never throws. */
export function hasNode(dir) {
  if (typeof dir !== 'string' || dir === '') return false
  try {
    return statSync(join(dir, NODE_EXE)).isFile()
  } catch {
    return false
  }
}

/**
 * `C:\Users\x\.dsh` — the plugin may be the only thing that knows the harness
 * brought its own runtime, because the app never puts it on PATH.
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
function dshHome(env) {
  const explicit = env.DSH_HOME
  if (typeof explicit === 'string' && explicit !== '') return explicit
  const profile = env.USERPROFILE || env.HOME
  return typeof profile === 'string' && profile !== '' ? join(profile, '.dsh') : null
}

/**
 * Interpreters the harness itself shipped, newest runtime first. A directory
 * whose `dependencies/node/bin` exists is preferred over one that merely
 * exists, because only the former answers `node`.
 * @param {string | null} home
 * @returns {string[]}
 */
function runtimeNodeDirs(home) {
  if (!home) return []
  const root = join(home, 'dsh-runtimes')
  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return []
  }
  const dirs = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const bin = join(root, entry.name, 'dependencies', 'node', 'bin')
    if (hasNode(bin)) dirs.push(bin)
  }
  return dirs.sort()
}

/**
 * Every directory that could answer `node`, best first, deduplicated.
 *
 * Order matters and is deliberate:
 *  1. `process.execPath`'s own directory, but only when execPath *is* node —
 *     the interpreter already running the harness wins over an unrelated
 *     install, and a task that assumed `node` gets exactly the version the
 *     harness uses.
 *  2. `DSH_NODE_BIN` — an explicit override for deployments that place the
 *     runtime somewhere unusual.
 *  3. PATH, in its own order: a project that puts its own interpreter first
 *     keeps it.
 *  4. The harness runtime under `~/.dsh/dsh-runtimes/*`.
 *  5. The conventional install locations, last, because they are a guess.
 *
 * @param {{execPath?: string, env?: Record<string, string | undefined>, platform?: string}} [options]
 * @returns {string[]}
 */
export function nodeBinDirs(options = {}) {
  const execPath = options.execPath ?? process.execPath
  const env = options.env ?? process.env
  const found = []
  const push = (dir) => {
    if (typeof dir === 'string' && dir !== '' && hasNode(dir) && !found.includes(dir)) found.push(dir)
  }

  const execName = basename(execPath || '').replace(/\.exe$/i, '').toLowerCase()
  if (execName === 'node') push(dirname(execPath))

  if (typeof env.DSH_NODE_BIN === 'string') push(env.DSH_NODE_BIN)

  const pathValue = typeof env.PATH === 'string' ? env.PATH : typeof env.Path === 'string' ? env.Path : ''
  for (const dir of pathValue.split(delimiter)) push(dir)

  for (const dir of runtimeNodeDirs(dshHome(env))) push(dir)

  if ((options.platform ?? process.platform) === 'win32') {
    const programFiles = env.ProgramFiles || 'C:\\Program Files'
    push(join(programFiles, 'nodejs'))
    push(join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs'))
    push(join(env.LOCALAPPDATA || '', 'Programs', 'nodejs'))
  } else {
    push('/usr/local/bin')
    push('/usr/bin')
  }

  return found
}


/**
 * True when a bare `node` already resolves on this PATH.
 *
 * Nothing to tell the worker when it does: a line explaining where the
 * interpreter lives would be noise in every brief on every machine where the
 * obvious command just works.
 * @param {string} [pathValue]
 * @param {{execPath?: string, env?: Record<string, string | undefined>, platform?: string}} [options]
 * @returns {boolean}
 */
export function nodeOnPath(pathValue = '', options = {}) {
  const dir = nodeBinDir(options)
  if (!dir) return false
  const parts = (typeof pathValue === 'string' ? pathValue : '').split(delimiter)
  return parts.includes(dir)
}
/**
 * Full path to an interpreter that can run a script, or null.
 *
 * `process.execPath` answers this on a normal Node host. Under Electron it
 * names the application, and launching it with a script argument starts a
 * second copy of the app instead of running the script -- so a task whose
 * acceptance command is a bare `.mjs` path would silently grade nothing.
 * When the running binary is not node, look for a real one instead.
 *
 * @param {{execPath?: string, env?: Record<string, string | undefined>, platform?: string}} [options]
 * @returns {string | null}
 */
export function nodeExecutable(options = {}) {
  const execPath = options.execPath ?? process.execPath
  const execName = basename(execPath || '').replace(/\.exe$/i, '').toLowerCase()
  if (execName === 'node') return execPath
  const dir = nodeBinDir(options)
  return dir ? join(dir, NODE_EXE) : null
}
/** The best interpreter directory, or null when the host has none. */
export function nodeBinDir(options = {}) {
  return nodeBinDirs(options)[0] ?? null
}

/**
 * A PATH value that answers `node`, keeping the caller's own search order.
 *
 * Returns the input untouched when no interpreter exists: a PATH that is
 * merely the same is better than one that pretends.
 *
 * @param {string} [basePath]
 * @param {{execPath?: string, env?: Record<string, string | undefined>, platform?: string}} [options]
 * @returns {string}
 */
export function withNodeOnPath(basePath = '', options = {}) {
  const dir = nodeBinDir(options)
  if (!dir) return basePath
  const base = typeof basePath === 'string' ? basePath : ''
  const parts = base.split(delimiter).filter((part) => part !== '')
  if (parts.includes(dir)) return base
  return [dir, ...parts].join(delimiter)
}
