// What a candidate is allowed to change.
//
// The gate's oldest rule is "a candidate may not edit the tests", and it exists
// for one reason: a patch that rewrites its own oracle can make any verifier
// pass. That reason is about the instrument, not about the directory. A task
// whose deliverable *is* test coverage -- "harden src/gate/select.js's specs until
// the mutants die" -- has no way to succeed under the blanket rule, and the
// blanket rule is also too weak for the tasks that do not involve tests at all.
//
// So a task may declare the paths it may edit:
//
//   verify: { cmd: '...', scope: { editable: ['tests/gate.test.mjs'] } }
//
// With a scope, the patch must stay inside it (and `oracleClean` still refuses
// the scripts the verifier runs). Without a scope the old rule applies unchanged,
// which is why every existing task keeps its exact verdict.
//
// Deliberately not a glob engine: a path matches an entry when it is the entry, a
// file below a directory entry (`tests/collab`), or shares a `*`-suffixed prefix
// (`tests/gate*`). Anything else is a violation, and a violation is refused, not
// repaired.

const norm = (p) =>
  String(p ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .trim()

/**
 * @param {unknown} raw the task's `verify.scope`
 * @returns {{editable: string[]}|null} null when no usable scope was declared
 */
export function parseScope(raw) {
  if (!raw || typeof raw !== 'object') return null
  const list = Array.isArray(raw.editable) ? raw.editable : null
  if (!list) return null
  const editable = [...new Set(list.map(norm).filter((p) => p !== '' && p !== '.'))]
  return editable.length ? { editable } : null
}

/** @returns {boolean} does `p` fall inside one of the scope's entries? */
export function inScope(p, scope) {
  if (!scope || !Array.isArray(scope.editable)) return false
  const path = norm(p)
  if (!path) return false
  return scope.editable.some((entry) => {
    if (path === entry) return true
    if (entry.endsWith('*')) return path.startsWith(entry.slice(0, -1))
    return path.startsWith(entry.endsWith('/') ? entry : entry + '/')
  })
}

/**
 * Paths named by a unified diff, including new and deleted files. Reads `diff
 * --git` lines rather than the hunks so a rename or a mode change is still seen.
 * @param {string} text
 * @returns {string[]}
 */
export function diffPaths(text) {
  if (typeof text !== 'string' || text === '') return []
  const out = new Set()
  for (const line of text.split('\n')) {
    if (!line.startsWith('diff --git ')) continue
    const rest = line.slice('diff --git '.length)
    const quoted = [...rest.matchAll(/"([ab])\/((?:\\.|[^"\\])*)"/g)].map((m) => m[2])
    const paths = quoted.length ? quoted : (rest.match(/^a\/(.+?) b\/(.+)$/) || []).slice(1)
    for (const p of paths) if (p) out.add(norm(p))
  }
  return [...out]
}

/**
 * Did the change set stay inside the declared scope?
 *
 * Both views are consulted because neither is complete: the patch file also
 * carries untracked files (`git add -N` before the diff) and the diff stat only
 * carries paths git already tracks. A path missing from both would be invisible,
 * so the answer is the union, and an unreadable patch is a violation.
 *
 * `owns` is the other half of the same declaration. A task whose deliverable is
 * a spec plus its pin must edit `tests/…` (the scope) and `scripts/test-all.mjs`
 * (the apparatus the verifier runs, `verify.owns`). Judging the second against
 * the first asked the author to write the same sentence twice, and the round
 * that did not was refused with `violations: ['scripts/test-all.mjs']` while the
 * oracle check had already released that exact path. An owned path is part of
 * the deliverable by declaration, so it is checked (it still counts) and not a
 * violation. Undeclared scripts stay violations, and a task with no scope keeps
 * the legacy answer untouched.
 *
 * @param {{patchText?: string|null, patchUnreadable?: boolean, filesChanged?: string[]|null, scope?: object|null, owns?: string[]}} input
 * @returns {{ok: boolean, violations: string[], checked: number}}
 */
export function scopeVerdict({
  patchText = null,
  patchUnreadable = false,
  filesChanged = null,
  scope = null,
  owns = [],
} = {}) {
  if (!scope) return { ok: true, violations: [], checked: 0 }
  if (patchUnreadable) return { ok: false, violations: ['<patch unreadable>'], checked: 0 }
  const paths = new Set(diffPaths(patchText))
  for (const p of Array.isArray(filesChanged) ? filesChanged : []) {
    const path = norm(p)
    if (path) paths.add(path)
  }
  const owned = new Set((Array.isArray(owns) ? owns : []).map(norm).filter(Boolean))
  const isOwned = (p) => owned.has(p) || [...owned].some((entry) => inScope(p, { editable: [entry] }))
  const violations = [...paths].filter((p) => !inScope(p, scope) && !isOwned(p)).sort()
  return { ok: violations.length === 0, violations, checked: paths.size }
}
