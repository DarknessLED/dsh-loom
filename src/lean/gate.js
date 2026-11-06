/**
 * The mechanical Lean gate: source scan first, then a real compiler run, then
 * the axiom report. All three have to agree before a claim counts as proved.
 *
 * The whole point is that the gate is cheap to distrust: it never asks a model
 * whether a proof is valid, and it never accepts "it compiles" as the answer.
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanSource, parseAxiomReport, checkAxioms, buildCheckSource } from './scan.js'
import { defaultRun, leanBinDir, pathWithElan } from './probe.js'

/**
 * @param {{
 *   source: string,
 *   theorem?: string|null,
 *   imports?: string[],
 *   allowedImports?: string[],
 *   allowAxioms?: string[],
 *   dir?: string|null,
 *   compiler?: 'lake'|'lean',
 *   run?: Function,
 *   timeoutMs?: number,
 *   keep?: boolean,
 * }} input
 */
export async function checkLemma({
  source,
  theorem = null,
  imports = [],
  allowedImports = [],
  allowAxioms = [],
  dir = null,
  compiler = 'lake',
  run = defaultRun,
  timeoutMs = 120_000,
  keep = false,
} = {}) {
  const started = Date.now()
  const scan = scanSource(source, { allowedImports, allowAxioms })
  const out = {
    ok: false,
    stage: 'scan',
    violations: [...scan.violations],
    axioms: null,
    theorem,
    exitCode: null,
    stdout: '',
    stderr: '',
    durationMs: 0,
    file: null,
    dir: null,
  }
  if (!scan.ok) {
    out.durationMs = Date.now() - started
    return out
  }

  const workDir = dir || mkdtempSync(join(tmpdir(), 'loom-lean-'))
  const file = join(workDir, 'LoomClaim.lean')
  out.dir = workDir
  out.file = file
  try {
    writeFileSync(file, buildCheckSource({ source, theorem, imports }), 'utf8')
    out.stage = 'compile'
    const args = compiler === 'lake' ? ['env', 'lean', 'LoomClaim.lean'] : ['LoomClaim.lean']
    // A GUI-started host has no Lean on PATH: `lake env lean` would fail with a
    // bare "lean not found" that says nothing about the proof. Prefer the
    // toolchain binary — an elan shim costs ~34 s on Windows, which a verifier
    // running once per attempt cannot afford.
    const bin = leanBinDir()
    const exe = bin ? join(bin, process.platform === 'win32' ? `${compiler}.exe` : compiler) : compiler
    const res = run(exe, args, { cwd: workDir, timeoutMs, env: { ...process.env, PATH: pathWithElan() } })
    out.exitCode = res?.code ?? null
    out.stdout = String(res?.stdout ?? '')
    out.stderr = String(res?.stderr ?? '')
    if (!res?.ok) {
      out.violations.push({
        code: res?.error ? 'compiler-missing' : 'compile',
        detail: (res?.error || firstError(out.stderr) || 'the claim did not compile').slice(0, 1200),
      })
      out.stage = 'compile'
      return finish(out, started)
    }
    out.stage = 'axioms'
    if (!theorem) {
      out.ok = true
      return finish(out, started)
    }
    const axioms = parseAxiomReport(out.stdout, theorem)
    out.axioms = axioms
    const bad = checkAxioms(axioms, { allowAxioms })
    if (bad.length) out.violations.push(...bad)
    out.ok = bad.length === 0
    return finish(out, started)
  } catch (err) {
    out.violations.push({ code: 'internal', detail: String(err?.message ?? err) })
    return finish(out, started)
  } finally {
    if (!keep && !dir) {
      try {
        rmSync(workDir, { recursive: true, force: true })
      } catch {
        /* temp dirs are disposable */
      }
    }
  }
}

function finish(out, started) {
  out.durationMs = Date.now() - started
  out.ok = out.violations.length === 0 && out.ok !== false
  return out
}

function firstError(stderr) {
  const lines = String(stderr ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const err = lines.find((l) => /error/i.test(l))
  return err || lines.slice(0, 3).join(' | ')
}
