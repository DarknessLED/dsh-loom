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
 * Every path-shaped token in the command, whether or not it exists yet.
 *
 * `oracleScripts` filters by existence, which is right for "which file does this
 * command run" but blind to the one case the gate has to catch: a candidate that
 * *creates* the file the command runs. The path does not exist in the workspace,
 * so existence-based derivation returns nothing and every path rule passes. The
 * candidate then adds `check.mjs` and the command runs it.
 *
 * So the base question needs the unfiltered candidate set, and it resolves the
 * answer against the base commit rather than the working tree.
 *
 * @param {{cmd?: string, cwd?: string}|string|null} spec
 * @returns {string[]} path-shaped workspace-relative tokens, deduplicated
 */
export function oracleCandidates(spec) {
  const command = typeof spec === 'string' ? spec : typeof spec?.cmd === 'string' ? spec.cmd : ''
  if (command.trim() === '') return []
  const out = []
  const seen = new Set()
  const tokens = commandTokens(command)
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (!token || token.startsWith('#')) continue
    // Order matters: `-e` starts with a dash, so a generic dash-skip placed first
    // would leave the inline source to be read as a path. Measured on the
    // registered tasks (e72): 12 of 172 commands are `node -e "..."`, and every
    // one of them then looked like a command naming a missing file.
    if (TAKES_VALUE.has(token)) {
      i += 1
      continue
    }
    if (token.startsWith('-')) continue
    const base = token.split(/[\\/]/).pop() ?? ''
    if (INTERPRETER.test(base)) continue
    if (!/[\\/.]/.test(token)) continue
    const norm = token.replace(/\\/g, '/').replace(/^\.\//, '')
    // A drive-letter prefix means an absolute path outside the workspace, which a
    // workspace-relative patch cannot touch; leave those to `oracleScripts`.
    if (/^[a-z]:/i.test(norm)) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(norm)
  }
  return out
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

// A verifier is rarely one file. `node scripts/check.mjs` imports the rule it
// enforces, and a candidate that edits that module changes the verdict without
// touching the script the command names. `oracleScripts` sees only the command,
// so the closure is what makes "the verifier" mean the code the verifier runs.
//
// Only relative specifiers are followed: a package under `node_modules` is not
// something a task patch should be editing anyway, and following it would pin
// half of npm. Extensions are resolved in the order a bundler would try them.
const IMPORT_RE =
  /(?:^|[^\w$])(?:import|export)\s+(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]|(?:^|[^\w$])require\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:^|[^\w$])import\s*\(\s*['"]([^'"]+)['"]\s*\)/g

const SCRIPT_EXT = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '.cts']

function resolveSpecifier(spec, fromFile, root) {
  if (typeof spec !== 'string' || !spec) return null
  if (!spec.startsWith('.') && !isAbsolute(spec)) return null // bare package
  const base = isAbsolute(spec) ? spec : resolve(fromFile, '..', spec)
  const tries = [base, ...SCRIPT_EXT.map((ext) => `${base}${ext}`)]
  for (const ext of SCRIPT_EXT) tries.push(join(base, `index${ext}`))
  for (const candidate of tries) {
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        const rel = withinRoot(root, candidate)
        return rel || null
      }
    } catch {
      /* a broken path is simply not a dependency */
    }
  }
  return null
}

/**
 * The verifier's own code, transitively: the scripts the command names, any
 * relative import they reach, and every path the task explicitly pins.
 *
 * The closure is bounded (depth 8, 200 files) because a dependency cycle must
 * terminate and a malicious tree must not turn one gate check into a walk of the
 * whole repository.
 *
 * @param {{cmd?: string, cwd?: string, pin?: string[]}|string|null} spec
 * @param {{cwd: string}} opts workspace root
 * @returns {string[]} workspace-relative POSIX paths
 */
/**
 * The files the command names itself: its scripts and any `pin` entries.
 *
 * These are the apparatus by declaration. The import closure below is evidence
 * of what the apparatus reads, but it cannot be enforced wholesale: a verifier
 * that imports the code under test (the ordinary case for a graded fixture) would
 * make every real fix look like an edit to the instrument.
 */
export function oracleNamedPaths(spec, opts) {
  const root = typeof opts?.cwd === 'string' && opts.cwd.trim() !== '' ? resolve(opts.cwd) : null
  if (!root) return []
  const out = []
  const seen = new Set()
  const add = (rel) => {
    if (!rel || seen.has(rel)) return false
    seen.add(rel)
    out.push(rel)
    return true
  }
  for (const p of oracleScripts(spec, opts)) add(p)
  for (const p of Array.isArray(spec?.pin) ? spec.pin : []) {
    if (typeof p !== 'string' || !p.trim()) continue
    const abs = isAbsolute(p) ? resolve(p) : resolve(root, p)
    const rel = withinRoot(root, abs)
    if (rel) add(rel)
  }
  return out
}

/**
 * Which of the closure files the gate will actually refuse. A support module that
 * lives under `tests/` or `scripts/` is apparatus; a module next to the code under
 * test is probably the code under test.
 */
export function oracleEnforcedPaths(closure) {
  return (Array.isArray(closure) ? closure : []).filter(
    (rel) => rel.startsWith('tests/') || rel.startsWith('scripts/'),
  )
}

// Data a verifier reads is apparatus in exactly the sense the scripts are: the
// patch may not edit the thing that decides. A JSON fixture is the case that got
// missed, because `oracleScripts` only follows code and a patch that edits
// `fixtures/cases.json` changes the verdict without touching a line the apparatus
// set names. Derivation stays a pure function of the workspace: relative string
// literals in the named scripts that end in a data extension *and* resolve to a
// real file, so a filename mentioned in a log line is not pinned.
const DATA_EXT = ['\.json', '\.jsonl', '\.csv', '\.tsv', '\.yaml', '\.yml', '\.toml', '\.txt', '\.ndjson']

/** Relative string literals in a file that name an existing data file. */
function dataSpecifiers(text) {
  const out = []
  const re = /['"]((?:\.{1,2}\/)[^'"]*?(?:\.jsonl?|\.csv|\.tsv|\.ya?ml|\.toml|\.txt|\.ndjson))['"]/g
  for (const match of String(text ?? '').matchAll(re)) out.push(match[1])
  return out
}

/**
 * Data files the verifier's own scripts read.
 *
 * Only relative literals ending in a data extension are considered, and a
 * candidate that does not resolve to an existing file inside the workspace is
 * dropped: a log line that says "wrote cases.json" pins nothing.
 *
 * @param {{cmd?: string, cwd?: string, pin?: string[]}|string|null} spec
 * @param {{cwd: string}} opts workspace root
 * @returns {string[]} workspace-relative POSIX paths
 */
export function oracleDataPaths(spec, opts) {
  const root = typeof opts?.cwd === 'string' && opts.cwd.trim() !== '' ? resolve(opts.cwd) : null
  if (!root) return []
  const out = []
  const seen = new Set()
  const add = (rel) => {
    if (!rel || seen.has(rel)) return false
    seen.add(rel)
    out.push(rel)
    return true
  }
  const scripts = oracleNamedPaths(spec, opts)
  for (const rel of scripts) {
    if (!SCRIPT_EXT.some((ext) => rel.endsWith(ext))) continue
    let text
    try {
      text = readFileSync(resolve(root, rel), 'utf8')
    } catch {
      continue
    }
    for (const specish of dataSpecifiers(text)) {
      const abs = resolve(root, rel, '..', specish)
      let ok = false
      try {
        ok = existsSync(abs) && statSync(abs).isFile()
      } catch {
        ok = false
      }
      if (!ok) continue
      add(withinRoot(root, abs))
    }
  }
  return out
}

export function oraclePathsFor(spec, opts) {
  const root = typeof opts?.cwd === 'string' && opts.cwd.trim() !== '' ? resolve(opts.cwd) : null
  if (!root) return []
  const pinned = Array.isArray(spec?.pin) ? spec.pin : []
  const out = []
  const seen = new Set()
  const add = (rel) => {
    if (!rel || seen.has(rel)) return false
    seen.add(rel)
    out.push(rel)
    return true
  }
  for (const p of oracleScripts(spec, opts)) add(p)
  for (const p of pinned) {
    if (typeof p !== 'string' || !p.trim()) continue
    const abs = isAbsolute(p) ? resolve(p) : resolve(root, p)
    const rel = withinRoot(root, abs)
    if (rel) add(rel)
  }
  // A verifier that reads a fixture is only as honest as the fixture, so the
  // data its scripts open is part of the apparatus by the same argument as the
  // scripts themselves (see `oracleDataPaths`).
  for (const p of oracleDataPaths(spec, opts)) add(p)
  let frontier = out.slice()
  for (let depth = 0; depth < 8 && frontier.length > 0 && out.length < 200; depth += 1) {
    const next = []
    for (const rel of frontier) {
      let text
      try {
        text = readFileSync(resolve(root, rel), 'utf8')
      } catch {
        continue
      }
      IMPORT_RE.lastIndex = 0
      let m
      while ((m = IMPORT_RE.exec(text)) !== null) {
        const specifier = m[1] || m[2] || m[3]
        const dep = resolveSpecifier(specifier, resolve(root, rel), root)
        if (dep && add(dep)) next.push(dep)
      }
    }
    frontier = next
  }
  return out
}

export const _internal = { INTERPRETER, TAKES_VALUE, withinRoot, join, sep }
