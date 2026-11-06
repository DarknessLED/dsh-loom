/**
 * Task-level Lean gate: an optional second mechanical door on a campaign task.
 *
 * A test says "the code does what the test says". A Lean claim says "this
 * algorithmic statement is true". Algorithmic campaigns need both, because
 * neither can substitute for the other: Lean cannot see runtime cost, and a
 * benchmark cannot see a wrong invariant that happens not to be exercised.
 */
import { readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { checkLemma } from './gate.js'

/** Refuse to read outside the worktree, even if the spec says so. */
export function safeJoin(root, rel) {
  const abs = resolve(root, String(rel ?? ''))
  const base = resolve(root)
  return abs === base || abs.startsWith(base + sep) ? abs : null
}

export function leanSpecOf(task) {
  const spec = task?.lean
  if (!spec || typeof spec !== 'object') return null
  if (typeof spec.source === 'string' && spec.source.trim()) return spec
  if (typeof spec.file === 'string' && spec.file.trim()) return spec
  return null
}

/**
 * @returns {null | {ok: boolean, skipped?: string, violations: Array, axioms: any, theorem: any, durationMs: number, file: string|null}}
 */
export async function runTaskLeanGate({ task, config, worktree, run = undefined } = {}) {
  const spec = leanSpecOf(task)
  if (!spec) return null
  if (config?.lean && config.lean.enabled === false) {
    return { ok: true, skipped: 'lean gate disabled by config', violations: [], axioms: null, theorem: null, durationMs: 0, file: null }
  }
  let source = typeof spec.source === 'string' ? spec.source : null
  if (!source) {
    const file = safeJoin(worktree, spec.file)
    if (!file) {
      return {
        ok: false,
        violations: [{ code: 'unsafe-path', detail: `lean.file escapes the worktree: ${spec.file}` }],
        axioms: null,
        theorem: spec.theorem ?? null,
        durationMs: 0,
        file: null,
      }
    }
    try {
      source = readFileSync(file, 'utf8')
    } catch (err) {
      return {
        ok: false,
        violations: [{ code: 'missing-file', detail: `cannot read ${spec.file}: ${String(err?.message ?? err)}` }],
        axioms: null,
        theorem: spec.theorem ?? null,
        durationMs: 0,
        file,
      }
    }
  }
  const leanCfg = config?.lean || {}
  return checkLemma({
    source,
    theorem: spec.theorem ?? null,
    imports: Array.isArray(spec.imports) ? spec.imports : [],
    allowedImports: Array.isArray(spec.allowedImports) ? spec.allowedImports : leanCfg.allowedImports || [],
    allowAxioms: Array.isArray(spec.allowAxioms) ? spec.allowAxioms : leanCfg.allowAxioms || [],
    compiler: spec.compiler || leanCfg.compiler || 'lake',
    timeoutMs: leanCfg.timeoutMs ?? 120_000,
    dir: worktree,
    ...(run ? { run } : {}),
  })
}
