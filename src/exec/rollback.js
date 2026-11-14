import { existsSync, readdirSync, rmSync, rmdirSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

/**
 * The safe half of a rollback: `git checkout` restores tracked files but knows
 * nothing about files a patch *created*, so a dead round that added a module
 * leaves it behind and every later apply fails with `workspace-dirty`. These
 * two pure-ish helpers name the created files from the patch text and delete
 * exactly those, so a reverted patch takes its files with it.
 *
 * Nothing here invokes git: the patch text is the only input, which keeps the
 * decision unit-testable without a repository.
 */

const DEV_NULL = '/dev/null'

function unquotePath(raw) {
  const p = raw.trim()
  if (p.length < 2 || p[0] !== '"' || p[p.length - 1] !== '"') return p
  const inner = p.slice(1, -1)
  let out = ''
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = inner[i + 1]
    if (next === undefined) break
    i += 1
    const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', a: '\x07', '"': '"', '\\': '\\' }
    if (next in simple) {
      out += simple[next]
    } else if (next >= '0' && next <= '7') {
      let oct = next
      while (oct.length < 3 && inner[i + 1] >= '0' && inner[i + 1] <= '7') {
        i += 1
        oct += inner[i]
      }
      out += String.fromCharCode(parseInt(oct, 8))
    } else {
      out += next
    }
  }
  return out
}

/** Split a `diff --git a/A b/B` header into its two (unquoted) paths. */
function headerPaths(line) {
  const rest = line.slice('diff --git '.length)
  const parts = []
  let i = 0
  while (i < rest.length && parts.length < 2) {
    while (rest[i] === ' ') i += 1
    if (i >= rest.length) break
    if (rest[i] === '"') {
      let j = i + 1
      while (j < rest.length && rest[j] !== '"') {
        if (rest[j] === '\\') j += 1
        j += 1
      }
      parts.push(rest.slice(i, j + 1))
      i = j + 1
    } else {
      const j = rest.indexOf(' ', i)
      if (j === -1) {
        parts.push(rest.slice(i))
        break
      }
      parts.push(rest.slice(i, j))
      i = j
    }
  }
  return parts.map(unquotePath)
}

function stripSidePrefix(path) {
  return path.startsWith('a/') || path.startsWith('b/') ? path.slice(2) : path
}

/**
 * Paths (posix, workspace-relative) that this patch creates.
 *
 * Creation is read from the file header: `new file mode` (also present for a
 * new binary file) or an old side of `/dev/null`. A deletion (`deleted file
 * mode`, `+++ /dev/null`) and a rename are not creations. Only the header of
 * each `diff --git` section is inspected: hunk bodies can start with `--- ` or
 * `+++ ` when their content begins with `-- ` / `++ `, and mistaking those for
 * file markers would name a file that was never created.
 */
export function createdByPatch(patchText) {
  if (typeof patchText !== 'string' || patchText === '') return []
  const created = []
  let current = null
  let inHunks = false

  const flush = () => {
    if (current && current.created && current.path && !created.includes(current.path)) {
      created.push(current.path)
    }
    current = null
  }

  for (const line of patchText.split(/\r?\n/)) {
    if (line.startsWith('diff --git ')) {
      flush()
      const [a, b] = headerPaths(line)
      current = { created: false, path: stripSidePrefix(b ?? a ?? '') }
      inHunks = false
      continue
    }
    if (!current) continue
    if (inHunks) continue
    if (line.startsWith('@@ ')) {
      inHunks = true
      continue
    }
    if (line.startsWith('new file mode')) {
      current.created = true
      continue
    }
    if (line.startsWith('deleted file mode')) {
      current.created = false
      continue
    }
    if (line.startsWith('--- ')) {
      const old = unquotePath(line.slice(4))
      if (old === DEV_NULL) {
        current.created = true
      } else if (old !== '' && !old.startsWith('a/')) {
        current.path = stripSidePrefix(old)
      }
      continue
    }
    if (line.startsWith('+++ ')) {
      const next = unquotePath(line.slice(4))
      if (next === DEV_NULL) {
        // The patch deletes this path; it was not created.
        current.created = false
      } else if (next !== '') {
        current.path = stripSidePrefix(next)
      }
    }
  }
  flush()
  return created
}

/** Remove directories left empty by the sweep, stopping at (and never above) root. */
function pruneEmptyParents(root, start) {
  let dir = start
  for (;;) {
    const rel = relative(root, dir)
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return
    try {
      if (readdirSync(dir).length > 0) return
      rmdirSync(dir)
    } catch {
      return
    }
    dir = dirname(dir)
  }
}

/**
 * Delete exactly the files the patch created under `workspace` and return the
 * ones actually removed (in patch order). A file that is already gone is not an
 * error, a modified tracked file is left to the git checkout, and any other
 * untracked file is never touched. Paths escaping the workspace are ignored.
 */
export function sweepCreated(workspace, patchText) {
  const root = resolve(String(workspace ?? '.'))
  const removed = []
  for (const rel of createdByPatch(patchText)) {
    let target
    try {
      target = resolve(root, rel)
    } catch {
      continue
    }
    const relToRoot = relative(root, target)
    if (relToRoot === '' || relToRoot.startsWith('..') || isAbsolute(relToRoot)) continue
    if (!existsSync(target)) continue
    try {
      rmSync(target, { force: true })
    } catch {
      continue
    }
    removed.push(rel.split('\\').join('/'))
    pruneEmptyParents(root, dirname(target))
  }
  return removed
}
