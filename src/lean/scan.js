/**
 * The cheap half of the Lean gate: everything that can be decided by reading
 * the source. A proof that compiles is not yet a proof of what we meant, but a
 * proof containing `sorry`, a fresh `axiom`, or `native_decide` proves nothing
 * at all — those are the four ways a Lean claim lies, so they are checked
 * before a compiler is even started.
 *
 * Pure: no I/O, no clock. The caller owns the compiler run.
 */

export const DEFAULT_AXIOMS = ['propext', 'Classical.choice', 'Quot.sound']

/** Strip comments and string literals so keyword scans cannot be fooled. */
export function stripComments(source) {
  const s = String(source ?? '')
  // Block comments nest in Lean; handle the common case plus -- line comments.
  let out = ''
  let depth = 0
  let i = 0
  while (i < s.length) {
    const two = s.slice(i, i + 2)
    if (depth === 0 && two === '/-') {
      depth = 1
      i += 2
      continue
    }
    if (depth > 0) {
      if (two === '/-') {
        depth += 1
        i += 2
        continue
      }
      if (two === '-/') {
        depth -= 1
        i += 2
        continue
      }
      i += 1
      continue
    }
    if (two === '--') {
      while (i < s.length && s[i] !== '\n') i += 1
      continue
    }
    out += s[i]
    i += 1
  }
  return out
}

/** Imports declared by a source string, in order. */
export function parseImports(source) {
  const src = stripComments(source)
  const found = []
  const re = /^[ \t]*import[ \t]+([A-Za-z0-9_.'«»]+)/gm
  let m
  while ((m = re.exec(src))) found.push(m[1])
  return found
}

/**
 * @param {string} source
 * @param {{allowedImports?: string[], allowAxioms?: string[]}} opts
 * @returns {{ok: boolean, violations: Array<{code: string, detail: string}>}}
 */
export function scanSource(source, { allowedImports = [], allowAxioms = [] } = {}) {
  const violations = []
  const raw = String(source ?? '')
  const src = stripComments(raw)

  if (!src.trim()) {
    violations.push({ code: 'empty', detail: 'the claim has no Lean source' })
  }
  if (/\b(sorry|admit)\b/.test(src)) {
    violations.push({ code: 'sorry', detail: 'source contains sorry/admit — that is not a proof' })
  }
  if (/^[ \t]*(axiom|constant|opaque)[ \t]/m.test(src)) {
    violations.push({ code: 'axiom-decl', detail: 'source declares a new axiom/constant/opaque' })
  }
  if (/\bnative_decide\b/.test(src)) {
    violations.push({ code: 'native-decide', detail: 'native_decide trusts the compiler without a proof' })
  }
  if (/\bimplemented_by\b/.test(src)) {
    violations.push({ code: 'implemented-by', detail: '@[implemented_by] swaps the verified term for unchecked code' })
  }
  if (/\bunsafe\b/.test(src)) {
    violations.push({ code: 'unsafe', detail: 'source uses unsafe code' })
  }

  const allowed = Array.isArray(allowedImports) ? allowedImports : []
  for (const imp of parseImports(raw)) {
    const ok = allowed.some((a) => imp === a || imp.startsWith(`${a}.`))
    if (!ok) violations.push({ code: 'import', detail: `import ${imp} is outside the allow-list` })
  }

  // Axioms named in the source itself (e.g. `Classical.choice`) are fine; the
  // real check happens against `#print axioms` after compilation.
  const extra = (Array.isArray(allowAxioms) ? allowAxioms : []).filter((x) => typeof x === 'string' && x)
  if (extra.some((a) => /^(sorryAx|Classical\.choiceOf)$/.test(a))) {
    violations.push({ code: 'allow-list', detail: 'sorryAx / choiceOf are never acceptable axioms' })
  }

  return { ok: violations.length === 0, violations }
}

/**
 * Parse the output of `#print axioms <name>`.
 * Lean prints either
 *   'loom_claim' does not depend on any axioms
 * or
 *   'loom_claim' depends on axioms: [propext, Classical.choice, Quot.sound]
 */
export function parseAxiomReport(stdout, theorem) {
  const text = String(stdout ?? '')
  if (new RegExp(`'${escapeRe(theorem)}' does not depend on any axioms`).test(text)) return []
  const re = new RegExp(`'${escapeRe(theorem)}' depends on axioms:\\s*\\[([^\\]]*)\\]`)
  const m = text.match(re)
  if (!m) return null
  return m[1]
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Axioms that are not in the allow-list (default allow-list excludes sorryAx). */
export function checkAxioms(axioms, { allowAxioms = DEFAULT_AXIOMS } = {}) {
  if (axioms === null) return [{ code: 'axioms-unknown', detail: 'the compiler did not report axioms for this theorem' }]
  const allowed = new Set([...DEFAULT_AXIOMS, ...(Array.isArray(allowAxioms) ? allowAxioms : [])])
  const bad = axioms.filter((a) => !allowed.has(a))
  if (!bad.length) return []
  return [{ code: 'axioms', detail: `unexpected axioms: ${bad.join(', ')}` }]
}

/** Compose the file that is handed to the compiler. */
export function buildCheckSource({ source, theorem, imports = [] }) {
  const head = (Array.isArray(imports) ? imports : []).map((i) => `import ${i}`).join('\n')
  const body = String(source ?? '').trimEnd()
  const check = theorem ? `\n#print axioms ${theorem}\n` : '\n'
  return `${head ? `${head}\n\n` : ''}${body}${check}`
}

function escapeRe(s) {
  return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
