#!/usr/bin/env node
/**
 * pair-audit — re-derive the paired-evidence number from the ledger.
 *
 * docs/l2-state.md reports that 470 of 483 recorded rounds contributed zero
 * paired outcomes because the base side was never read on the same instrument.
 * That number came from a throwaway script nobody kept, so this is the
 * committed version: it reads the campaign event logs and rebuilds the same
 * comparison the gate makes at round time.
 *
 * A pair exists only when both sides were read on the same instrument:
 *
 *   base       gate.evaluated.checks.baseMetrics.killRate
 *   candidate  the winning attempt.finished's metrics.killRate
 *
 * The pairing itself is `pairAgainstBase` from src/gate/sequential.js and the
 * decision is that module's `commitDecision`, imported rather than copied: a
 * second implementation of the rule would drift, and the audit would then be
 * measuring itself instead of the gate. The output also carries the honest
 * denominator (how many rounds had a base reading at all, how many had a
 * measurable candidate) and says plainly when a campaign's ledger predates the
 * fields instead of counting their absence as a zero or a tie.
 *
 * Usage:
 *   node scripts/pair-audit.mjs [--home <loom home>] [--campaign <id>]
 *                               [--epsilon <n>] [--alpha <n>] [--lambda <n>]
 *                               [--json]
 *
 * Read-only: nothing under the loom home is created, written or touched.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { commitDecision, pairAgainstBase, DEFAULT_ALPHA, DEFAULT_LAMBDA } from '../src/gate/sequential.js'

const DEFAULT_HOME = join(homedir(), '.dsh', 'loom')

/** Parse the CLI. A flag with no value keeps its default instead of eating the next flag. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {
    home: null,
    campaign: null,
    json: false,
    epsilon: 0,
    alpha: DEFAULT_ALPHA,
    lambda: DEFAULT_LAMBDA,
  }
  const value = (i) => (argv[i + 1] !== undefined && !String(argv[i + 1]).startsWith('--') ? argv[i + 1] : null)
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') out.json = true
    else if (arg === '--home') { const v = value(i); if (v !== null) { out.home = v; i++ } }
    else if (arg === '--campaign') { const v = value(i); if (v !== null) { out.campaign = v; i++ } }
    else if (arg === '--epsilon') { const v = value(i); if (v !== null && Number.isFinite(Number(v))) { out.epsilon = Math.abs(Number(v)); i++ } }
    else if (arg === '--alpha') { const v = value(i); if (v !== null && Number.isFinite(Number(v)) && Number(v) > 0) { out.alpha = Number(v); i++ } }
    else if (arg === '--lambda') { const v = value(i); if (v !== null && Number.isFinite(Number(v)) && Number(v) > 0) { out.lambda = Number(v); i++ } }
  }
  out.home = out.home || process.env.LOOM_HOME || DEFAULT_HOME
  return out
}

/** JSONL, tolerant of a torn tail line: an append-only log can end mid-write. */
export function readEvents(file) {
  const events = []
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line))
    } catch {
      // A half-written final line is not an event. Skipping it is what keeps
      // one crash at the tail from hiding every round before it.
    }
  }
  return events
}

const num = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))

/** The winning attempt per round, so the candidate reading is the one the gate read. */
function candidateFor(gate, attempts) {
  const round = gate.round
  const byRound = attempts.filter((a) => a.round !== null && a.round !== undefined && String(a.round) === String(round))
  if (gate.candidateId !== undefined && gate.candidateId !== null) {
    const exact = byRound.find((a) => String(a.id) === String(gate.candidateId))
    if (exact) return exact
  }
  let best = null
  for (const a of byRound) {
    const score = num(a.score)
    if (best === null || (score !== null && (num(best.score) === null || score > num(best.score)))) best = a
  }
  return best
}

/**
 * Audit one campaign's events. Pure: takes the parsed events, returns the row.
 * The two readings are both `killRate`, because a kill rate compared against a
 * composite score is a direction decided by which unit a side happened to use.
 */
export function auditCampaign(id, events, { epsilon = 0, alpha = DEFAULT_ALPHA, lambda = DEFAULT_LAMBDA } = {}) {
  const gates = events.filter((e) => e && e.type === 'gate.evaluated').map((e) => e.data || {})
  const attempts = events
    .filter((e) => e && e.type === 'attempt.finished')
    .map((e) => e.data || {})
  const startedRounds = events
    .filter((e) => e && e.type === 'round.started' && e.data && e.data.n !== undefined)
    .map((e) => e.data.n)
  const rounds = new Set(startedRounds)
  for (const gate of gates) if (gate.round !== undefined) rounds.add(gate.round)

  const pairReasons = {}
  const sequence = []
  let won = 0
  let lost = 0
  let roundsWithPair = 0
  let roundsWithBase = 0
  let roundsWithCandidate = 0
  let roundsWithBaseField = 0
  let recordedDecision = null
  let recordedGates = 0

  for (const gate of gates) {
    const base = num(gate.checks?.baseMetrics?.killRate)
    if (gate.checks && gate.checks.baseMetrics !== undefined) roundsWithBaseField++
    const attempt = candidateFor(gate, attempts)
    const candidate = num(attempt?.metrics?.killRate)
    if (base !== null) roundsWithBase++
    if (candidate !== null) roundsWithCandidate++
    const pair = pairAgainstBase({ candidate, base, epsilon })
    if (pair.pair === 1 || pair.pair === 0) {
      roundsWithPair++
      sequence.push(pair.pair)
      if (pair.pair === 1) won++
      else lost++
    } else {
      pairReasons[pair.reason] = (pairReasons[pair.reason] || 0) + 1
    }
    if (typeof gate.decision === 'string' && gate.decision) {
      recordedDecision = gate.decision
      recordedGates++
    }
  }

  const rule = commitDecision({ discordant: sequence, alpha, lambda })
  // "Predates the fields" is a claim about the ledger's shape, not about the
  // outcome: a campaign can legitimately have zero pairs while writing both
  // fields, and calling that unmeasured would be the same lie in reverse.
  const unmeasured = gates.length > 0 && roundsWithBaseField === 0 && recordedGates === 0 && sequence.length === 0
  const note = !gates.length
    ? 'no gate.evaluated in this ledger; nothing to pair'
    : unmeasured
      ? 'ledger predates the paired fields: no baseMetrics, no decision'
      : roundsWithBaseField === 0
        ? 'no gate recorded baseMetrics; base side unread, not zero'
        : recordedGates === 0
          ? 'no gate recorded a decision; the rule cannot be compared with the ledger'
          : null

  return {
    id,
    status: unmeasured ? 'unmeasured' : 'measured',
    rounds: rounds.size,
    gates: gates.length,
    roundsWithPair,
    pairs: sequence.length,
    won,
    lost,
    roundsWithBase,
    roundsWithCandidate,
    // The sequence the rule was fed, kept so a reader can re-derive the answer.
    sequence,
    ruleDecision: rule.decision,
    ruleEValue: rule.eValue,
    rulePairs: rule.pairs,
    recordedDecision,
    // What the audit would have said differently. `null` when the ledger never
    // recorded a decision, which is not the same as agreeing with it.
    differs: recordedDecision === null ? null : recordedDecision !== rule.decision,
    pairReasons,
    note,
  }
}

/** Every campaign under `<home>/campaigns` that has an events file, sorted. */
export function auditHome(home, options = {}) {
  const root = join(home, 'campaigns')
  if (!existsSync(root)) {
    return { home, root, campaigns: [], missing: true }
  }
  const ids = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  const rows = []
  for (const id of ids) {
    if (options.campaign && String(options.campaign) !== String(id)) continue
    const file = join(root, id, 'events.jsonl')
    if (!existsSync(file)) continue
    rows.push(auditCampaign(id, readEvents(file), options))
  }
  return { home, root, campaigns: rows, missing: false }
}

/** The totals line and its denominator, shared by the text and JSON renderings. */
export function totalsOf(report) {
  const rows = report.campaigns
  const sum = (key) => rows.reduce((acc, r) => acc + r[key], 0)
  const reasons = {}
  for (const r of rows) for (const [k, v] of Object.entries(r.pairReasons)) reasons[k] = (reasons[k] || 0) + v
  const unmeasured = rows.filter((r) => r.status === 'unmeasured')
  return {
    campaigns: rows.length,
    rounds: sum('rounds'),
    roundsWithPair: sum('roundsWithPair'),
    pairs: sum('pairs'),
    won: sum('won'),
    lost: sum('lost'),
    roundsWithBase: sum('roundsWithBase'),
    roundsWithCandidate: sum('roundsWithCandidate'),
    unmeasured: unmeasured.map((r) => r.id),
    pairReasons: reasons,
  }
}

function pad(text, width) {
  const s = String(text ?? '')
  return s.length >= width ? s : s + ' '.repeat(width - s.length)
}

/** The per-campaign table plus two summary lines a reader can check by hand. */
export function render(report) {
  const t = totalsOf(report)
  const header = ['campaign', 'rounds', 'pairs', 'won', 'lost', 'rule', 'recorded', 'status']
  const body = report.campaigns.map((r) => [
    r.id,
    r.rounds,
    r.roundsWithPair,
    r.won,
    r.lost,
    r.ruleDecision,
    r.recordedDecision === null ? '(absent)' : r.recordedDecision,
    r.status,
  ])
  const widths = header.map((h, i) => Math.max(h.length, ...body.map((row) => String(row[i] ?? '').length)))
  const line = (row) => row.map((cell, i) => pad(cell, widths[i])).join('  ').trimEnd()
  const lines = [line(header), line(widths.map((w) => '-'.repeat(w))), ...body.map(line)]
  for (const r of report.campaigns) {
    if (r.note) lines.push(`  note ${r.id}: ${r.note}`)
  }
  const reasons = Object.entries(t.pairReasons)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(', ')
  lines.push('')
  lines.push(
    `totals: ${t.campaigns} campaign${t.campaigns === 1 ? '' : 's'}, ${t.rounds} rounds, ` +
      `${t.roundsWithPair} with a pair (${t.won} won, ${t.lost} lost)`,
  )
  lines.push(
    `denominator: ${t.roundsWithBase} of ${t.rounds} rounds had a base reading, ` +
      `${t.roundsWithCandidate} had a measurable candidate` +
      (reasons ? `; no pair possible in ${Object.values(t.pairReasons).reduce((a, b) => a + b, 0)} (${reasons})` : ''),
  )
  if (t.unmeasured.length) {
    lines.push(`unmeasured: ${t.unmeasured.length} campaign(s) predate the paired fields — ${t.unmeasured.join(', ')}`)
  }
  return `${lines.join('\n')}\n`
}

export function reportJson(report) {
  return { home: report.home, campaigns: report.campaigns, totals: totalsOf(report) }
}

function main() {
  const opts = parseArgs()
  const report = auditHome(opts.home, opts)
  if (report.missing) {
    const message = `no campaigns directory under ${opts.home}`
    if (opts.json) console.log(JSON.stringify({ error: message, home: opts.home }, null, 2))
    else console.error(message)
    process.exitCode = 1
    return
  }
  if (opts.campaign && report.campaigns.length === 0) {
    const message = `no campaign named ${opts.campaign} under ${report.root}`
    if (opts.json) console.log(JSON.stringify({ error: message, home: opts.home }, null, 2))
    else console.error(message)
    process.exitCode = 1
    return
  }
  if (opts.json) console.log(JSON.stringify(reportJson(report), null, 2))
  else process.stdout.write(render(report))
}

// Importable (the spec imports `auditHome`/`render`) and runnable. Comparing
// paths as URLs rather than by string suffix keeps a Windows backslash path and
// a second file also ending in `pair-audit.mjs` from both qualifying.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
