// What the verifier printed, as a number the gate can use.
//
// The mutation-kill harness reports a continuous reading -- `KILLRATE=0.3114`
// mean across 22 tasks -- but every round so far has read only the exit code, so
// a task that kills 31% of its mutants and one that kills none score the same.
// This module is the reading, not the decision: it turns the two `NAME=value`
// lines the harness prints into `{ killRate, mutants }` and hands the result to
// the attempt record. Promotion still belongs to src/gate/gate.js.
//
// The rule that matters is the one about absence: a metric that was not measured
// is `null`, never 0. "No KILLRATE line" and "KILLRATE=0.0000" are opposite
// facts, and a zero default would quietly turn every unmeasured attempt into a
// measured failure -- exactly the reading the gate must not act on.

/**
 * The lines this harness defines. Adding a metric is one entry: a stable line
 * name, the camelCase key the attempt record uses, and the acceptance rule.
 */
const METRICS = [
  {
    name: 'KILLRATE',
    key: 'killRate',
    // A rate, not a count: outside [0, 1] means the line is not a reading.
    accept: (n) => n >= 0 && n <= 1,
  },
  {
    name: 'MUTANTS',
    // The harness prints a count of mutants it tried; a fraction is not a count.
    key: 'mutants',
    accept: (n) => n >= 0 && Number.isInteger(n),
  },
]

/** A whole line, so a number quoted inside prose is not mistaken for a reading. */
const METRIC_LINE = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(\S+)\s*$/
/** Decimal only: `Number('0x10')` is 16, which would make a typo look measured. */
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

function valueOf(raw, accept) {
  if (typeof raw !== 'string' || !DECIMAL.test(raw)) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return accept(n) ? n : null
}

/**
 * Read the metric lines out of verifier stdout.
 *
 * Always returns both keys so a caller can tell "absent" from "not asked for";
 * a missing or malformed line leaves the value `null`. When the same line is
 * printed more than once the last valid reading wins: a later malformed duplicate
 * does not erase a number the harness already printed.
 *
 * @param {string} stdout
 * @returns {{ killRate: number | null, mutants: number | null }}
 */
export function parseMetrics(stdout) {
  const out = {}
  for (const { key } of METRICS) out[key] = null
  if (typeof stdout !== 'string' || stdout.length === 0) return out
  for (const line of stdout.split(/\r?\n/)) {
    const match = METRIC_LINE.exec(line)
    if (!match) continue
    const def = METRICS.find((m) => m.name === match[1])
    if (!def) continue
    const value = valueOf(match[2], def.accept)
    if (value !== null) out[def.key] = value
  }
  return out
}

/**
 * Attach the metrics to a verifier result, without inventing any.
 *
 * `metrics` carries only what was actually read (so an attempt that printed
 * nothing gets `{}`), and `status` is passed through so the caller keeps the
 * exit code it already had. Deciding what a metric is worth is the gate's job.
 *
 * @param {{ stdout?: string, status?: number } | null | undefined} result
 * @returns {{ metrics: Record<string, number>, status: number | null }}
 */
export function verifyMetrics(result) {
  const source = result && typeof result === 'object' ? result : {}
  const parsed = parseMetrics(source.stdout)
  const metrics = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== null) metrics[key] = value
  }
  const status = typeof source.status === 'number' && Number.isFinite(source.status) ? source.status : null
  return { metrics, status }
}
