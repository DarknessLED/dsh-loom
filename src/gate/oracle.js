import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

// Which files does the acceptance command actually run?
//
// The gate refuses a patch that edits `tests/`, because a candidate that can edit
// the tests can make any verifier pass. That rule names a directory, not the file
// the command runs, so it protects the convention and not the oracle. Measured on
// the graded fixture: a candidate that rewrote `check.mjs` -- the file the verify
// command names, the one that prints QUALITY -- promoted, because `check.mjs` is
// not under `tests/`. The task text asking the agent not to touch it is a request,
// not a check.
//
// So the gate needs the oracle as a set of paths, derived from the command itself,
// and it needs the patch's paths in the same vocabulary. Both are pure functions:
// deriving them from the command keeps the rule true for every task without asking
// authors to declare anything, and keeping them pure is what lets the decision be
// replayed against old patches.

// `node`, `node.exe`, `C:/.../node.exe`, `npx`, `python`, ... are how the command
// names its interpreter; the script is the next token. Matching on the basename
// means an absolute interpreter path is recognised too.
const INTERPRETER = /^(?:node|npx|pnpm|npm|yarn|bun|deno|tsx|ts-node|python|python3|py|bash|sh|zsh|cmd|pwsh|powershell|ruby|perl|php|java)(?:\.exe)?$/i

// Flags that consume the next token, so that token is not mistaken for a script.
// `-e/--eval` and `-c` take inline source, not a path; the source is skipped but
// every other positional token is still considered.
const TAKES_VALUE = new Set(['-e', '--eval', '-c', '--command', '-p', '--print', '-r', '--require', '--import', '-m', '--module', '--loader', '--experimental-loader'])

const QUOTED = /"((?:\\.|[^"\\])*)"|'([^']*)'|(\S+)/g

/** Split a command into shell-ish tokens, honouring single and double quotes. */
export function commandTokens(command) {
  const text = typeof command === 'string' ? command : ''
  const out = []
  let m
  QUOTED.lastIndex = 0
  while ((m = QUOTED.exec(text)) !== null) {
    // Operators are structure, not arguments: a `&&` between two commands would
    // otherwise be read as a path. Keeping them as tokens would only add noise,
    // because every path is resolved and existence-checked afterwards.
    out.push(m[1] ?? m[2] ?? m[3] ?? '')
  }
  return out
}

function withinRoot(root, candidate) {
  const rel = relative(root, candidate)
  if (rel === '') return null
  if (rel.startsWith('..')) return null
  if (isAbsolute(rel)) return null
  return rel.split(/[\\/]/).join('/')
}

/**
 * The workspace-relative files a verify spec spawns, in the order they appear.
 *
 * A token becomes an oracle path when it resolves, inside `cwd`, to something that
 * exists and is a file. Existence is the filter that makes this robust: a command
 * carries flags, inline source and bare words, and none of them exist as files.
 * `node -e "process.exit(0)"` therefore yields no oracle path, which is the honest
 * answer -- the command runs no file a patch could edit.
 *
 * @param {{cmd?: string, cwd?: string}|string|null} spec verify spec, or a bare command
 * @param {{cwd: string}} opts workspace root the command runs in
 * @returns {string[]} workspace-relative POSIX paths, deduplicated
 */
export function oracleScripts(spec, opts) {
  const root = typeof opts?.cwd === 'string' && opts.cwd.trim() !== '' ? resolve(opts.cwd) : null
  const command = typeof spec === 'string' ? spec : typeof spec?.cmd === 'string' ? spec.cmd : ''
  if (!root || command.trim() === '') return []
  const specCwd = typeof spec === 'object' && typeof spec?.cwd === 'string' && spec.cwd.trim() !== '' && opts?.ignoreSpecCwd !== true
    ? resolve(root, spec.cwd)
    : root
  const found = []
  const seen = new Set()
  const tokens = commandTokens(command)
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (!token || token.startsWith('#')) continue
    if (TAKES_VALUE.has(token)) {
      i += 1
      continue
    }
    if (token.startsWith('-')) continue
    const bare = token.replace(/^[a-z]:/i, (m) => m)
    // A token that is the interpreter is not a script. Test the basename so an
    // absolute path to node.exe is recognised as the interpreter it is.
    const base = bare.split(/[\\/]/).pop() ?? ''
    if (INTERPRETER.test(base)) continue
    // Only path-shaped tokens are candidates: no shell word (`&&`, `exit`) resolves
    // to a file inside the workspace anyway, but skipping them keeps the scan cheap.
    if (!/[\\/.]/.test(bare)) continue
    const abs = isAbsolute(bare) ? resolve(bare) : resolve(specCwd, bare)
    let ok = false
    try {
      ok = existsSync(abs) && statSync(abs).isFile()
    } catch {
      ok = false
    }
    if (!ok) continue
    const rel = withinRoot(root, abs)
    if (!rel || seen.has(rel)) continue
    seen.add(rel)
    found.push(rel)
  }
  return found
}

/**
 * Every path a patch touches, from its `diff --git` headers.
 *
 * Content lines can begin with `+++`/`---`, so those prefixes are not reliable
 * path markers; only the section header is. Returns `null` when the patch cannot
 * be read, which callers must treat as "cannot be shown safe".
 *
 * @param {string|null|undefined} patchPath
 * @returns {string[]|null} workspace-relative POSIX paths
 */
export function patchPaths(patchPath) {
  if (!patchPath) return []
  let text
  try {
    text = readFileSync(patchPath, 'utf8')
  } catch {
    return null
  }
  const paths = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('diff --git ')) continue
    const rest = line.slice('diff --git '.length)
    const quoted = [...rest.matchAll(/"([ab])\/((?:\\.|[^"\\])*)"/g)].map((m) => m[2])
    const plain = (rest.match(/^a\/(.+?) b\/(.+)$/) || []).slice(1)
    for (const p of quoted.length ? quoted : plain) {
      const norm = String(p).replace(/\\/g, '/').replace(/^\.\//, '')
      if (!paths.includes(norm)) paths.push(norm)
    }
  }
  return paths
}

/**
 * Does this patch edit one of the files the verifier runs?
 *
 * An empty oracle set means the question does not apply: a command with no script
 * (`node -e ...`, an inline shell test) has no file a candidate could rewrite, so
 * the gate says nothing rather than inventing a refusal.
 *
 * @param {string[]|null} changedPaths from `patchPaths`
 * @param {string[]} oraclePaths from `oracleScripts`
 * @returns {boolean}
 */
export function touchesOracle(changedPaths, oraclePaths) {
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) return false
  if (!Array.isArray(oraclePaths) || oraclePaths.length === 0) return false
  const oracle = new Set(oraclePaths.map((p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '')))
  return changedPaths.some((p) => oracle.has(String(p).replace(/\\/g, '/').replace(/^\.\//, '')))
}

/**
 * The gate's check, as one pure decision.
 *
 * Three readings, and the difference between them is the whole point:
 *   no oracle file       -> true. A command that runs no file (`node -e ...`) has
 *                           nothing a patch could rewrite; the rule does not apply.
 *   unreadable patch     -> false. `patchTouchesTests` already fails closed on this,
 *                           and a second check that answered "safe" would be a hole
 *                           in the same wall.
 *   otherwise            -> the patch's paths and `filesChanged` must both be
 *                           disjoint from the oracle set.
 *
 * @param {{patchFile?: string|null, oraclePaths?: string[], filesChanged?: string[]|null}} input
 * @returns {boolean}
 */
export function oracleClean(input) {
  const oraclePaths = Array.isArray(input?.oraclePaths) ? input.oraclePaths : []
  if (oraclePaths.length === 0) return true
  const filesChanged = Array.isArray(input?.filesChanged) ? input.filesChanged : []
  const fromPatch = patchPaths(input?.patchFile ?? null)
  if (fromPatch === null) return false
  if (touchesOracle(fromPatch, oraclePaths)) return false
  if (filesChanged.some((p) => touchesOracle([p], oraclePaths))) return false
  return true
}

export const _internal = { INTERPRETER, TAKES_VALUE, withinRoot, join, sep }
