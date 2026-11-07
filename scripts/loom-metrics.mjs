#!/usr/bin/env node
/**
 * loom-metrics — the efficiency / quality / cost triangle, measured.
 *
 * Reads the append-only campaign logs and reports what the loop actually spent
 * and what it actually got, per campaign and in total:
 *
 *   efficiency  wall-clock seconds per round, and the parallel factor (attempt
 *               seconds summed / round wall-clock: ~1.0 means candidates ran
 *               serially, ~2.0 means two ran side by side)
 *   quality     promotion rate, no-gain rate, how much of the time the loop was
 *               spending on rounds that produced nothing
 *   cost        tokens and USD per round and per promotion, when the host can
 *               measure them (dsh does not log usage on child sessions, so this
 *               reads the estimate the loop records itself)
 *
 * Usage: node scripts/loom-metrics.mjs [--home <dir>] [--json]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const homeArg = args.includes('--home') ? args[args.indexOf('--home') + 1] : null
const asJson = args.includes('--json')
const home = homeArg || process.env.LOOM_HOME || join(homedir(), '.dsh', 'loom')
const root = join(home, 'campaigns')

function stamp(e) {
  const v = e.at ?? e.ts ?? e.time
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Date.parse(v) || 0
  return 0
}

function readEvents(file) {
  const out = []
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // torn tail line: the log is append-only, a half-written line is not an event
    }
  }
  return out
}

function summarise(id, events) {
  const rounds = []
  const live = new Map()
  let attempts = 0
  let verifierRuns = 0
  let attemptMs = 0
  let tokens = 0
  let usd = 0
  let timedRounds = 0
  let wallMs = 0
  let verifierMs = 0
  let roundAttemptMs = 0
  let measuredVerifierRuns = 0
  let roundTokens = 0
  let roundUsd = 0

  for (const e of events) {
    const d = e.data || {}
    const at = stamp(e)
    switch (e.type) {
      case 'attempt.started':
        live.set(d.id, at)
        break
      case 'attempt.finished': {
        attempts++
        const started = live.get(d.id) ?? at
        const ms = d.durationMs ?? Math.max(0, at - started)
        attemptMs += ms
        live.delete(d.id)
        tokens += Number(d.tokens) || 0
        usd += Number(d.costUsd) || 0
        break
      }
      case 'verifier.finished':
        // A reused verdict costs nothing and is not a second run.
        if (d.reused !== true) verifierRuns++
        break
      case 'round.started':
        rounds.push({ n: d.n, taskId: d.taskId, startedAt: at, status: 'running' })
        break
      case 'round.finished': {
        const r = rounds.find((x) => x.n === d.n) || { n: d.n, startedAt: at }
        r.status = d.status
        r.promoted = Boolean(d.promoted)
        r.score = d.score
        r.endedAt = at
        // The loop records its own wall time; older ledgers predate that and
        // fall back to the round.started → round.finished distance below.
        r.wallMs = Number(d.durationMs) || 0
        r.attemptMs = Number(d.attemptMs) || 0
        r.verifierMs = Number(d.verifierMs) || 0
        r.tokens = Number(d.tokens) || 0
        r.usd = Number(d.costUsd) || 0
        if (!rounds.includes(r)) rounds.push(r)
        break
      }
    }
  }

  for (const r of rounds) {
    const measured = Number(r.wallMs) || 0
    const end = r.endedAt ?? 0
    const wall = measured || (end && r.startedAt ? end - r.startedAt : 0)
    if (wall > 0) {
      wallMs += wall
      timedRounds++
    }
    // Only instrumented rounds (round.finished carrying durationMs) also carry
    // the verifier and attempt legs. Summing those across rounds that never
    // measured them would divide verifier seconds by wall time they never
    // reported, so the verifier would look like it stopped running when it is
    // simply unrecorded — hence the measured/rounds coverage on the report.
    if (!measured) continue
    verifierMs += Number(r.verifierMs) || 0
    roundAttemptMs += Number(r.attemptMs) || 0
    roundTokens += Number(r.tokens) || 0
    roundUsd += Number(r.usd) || 0
    measuredVerifierRuns += Number(r.verifierRuns) || 0
  }
  // The round's own sum is authoritative when it exists: it also counts attempts
  // that never reached `attempt.finished` (screened out, crashed bookkeeping).
  if (roundAttemptMs > 0) attemptMs = roundAttemptMs
  if (roundTokens > 0) tokens = roundTokens
  if (roundUsd > 0) usd = roundUsd

  const finished = rounds.filter((r) => r.status && r.status !== 'running')
  const promoted = finished.filter((r) => r.promoted).length
  const noGain = finished.filter((r) => r.status === 'no-gain').length
  return {
    id,
    rounds: finished.length,
    promoted,
    noGain,
    attempts,
    verifierRuns: measuredVerifierRuns || verifierRuns,
    wallMs,
    attemptMs,
    verifierMs,
    measuredAttemptMs: roundAttemptMs,
    tokens,
    usd,
    timedRounds,
    secondsPerRound: timedRounds ? wallMs / timedRounds / 1000 : null,
    parallelFactor: wallMs ? attemptMs / wallMs : null,
    promotionRate: finished.length ? promoted / finished.length : null,
    wastedShare: finished.length ? noGain / finished.length : null,
    usdPerPromotion: promoted ? usd / promoted : null,
  }
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toFixed(digits)
}

if (!existsSync(root)) {
  console.error(`no campaigns under ${root}`)
  process.exit(1)
}

const rows = []
for (const dir of readdirSync(root)) {
  const file = join(root, dir, 'events.jsonl')
  if (!existsSync(file)) continue
  rows.push(summarise(dir, readEvents(file)))
}
rows.sort((a, b) => b.rounds - a.rounds || b.attempts - a.attempts)

const total = rows.reduce(
  (a, r) => ({
    campaigns: a.campaigns + 1,
    rounds: a.rounds + r.rounds,
    promoted: a.promoted + r.promoted,
    noGain: a.noGain + r.noGain,
    attempts: a.attempts + r.attempts,
    verifierRuns: a.verifierRuns + r.verifierRuns,
    wallMs: a.wallMs + r.wallMs,
    attemptMs: a.attemptMs + r.attemptMs,
    measuredAttemptMs: a.measuredAttemptMs + r.measuredAttemptMs,
    verifierMs: a.verifierMs + r.verifierMs,
    tokens: a.tokens + r.tokens,
    usd: a.usd + r.usd,
    timedRounds: a.timedRounds + r.timedRounds,
  }),
  { campaigns: 0, rounds: 0, promoted: 0, noGain: 0, attempts: 0, verifierRuns: 0, wallMs: 0, attemptMs: 0, measuredAttemptMs: 0, verifierMs: 0, tokens: 0, usd: 0, timedRounds: 0 },
)

const headline = {
  campaigns: total.campaigns,
  rounds: total.rounds,
  promoted: total.promoted,
  attempts: total.attempts,
  attemptedPerRound: total.rounds ? total.attempts / total.rounds : null,
  promotionRate: total.rounds ? total.promoted / total.rounds : null,
  noGainRate: total.rounds ? total.noGain / total.rounds : null,
  secondsPerRound: total.timedRounds ? total.wallMs / total.timedRounds / 1000 : null,
  parallelFactor: total.wallMs ? total.measuredAttemptMs / total.wallMs : null,
  verifierShare: total.wallMs ? total.verifierMs / total.wallMs : null,
  verifierRunsPerRound: total.timedRounds ? total.verifierRuns / total.timedRounds : null,
  measuredOf: `${total.timedRounds}/${total.rounds}`,
  measuredRounds: total.timedRounds,
  tokens: total.tokens,
  usd: total.usd,
}

if (asJson) {
  console.log(JSON.stringify({ headline, campaigns: rows }, null, 2))
  process.exit(0)
}

const pad = (s, n) => String(s).padEnd(n)
console.log('campaign          rounds  prom  no-gain  att  sec/round  parallel  promo%')
for (const r of rows.slice(0, 15)) {
  console.log(
    pad(r.id, 17) +
      pad(r.rounds, 8) +
      pad(r.promoted, 6) +
      pad(r.noGain, 9) +
      pad(r.attempts, 5) +
      pad(fmt(r.secondsPerRound), 11) +
      pad(fmt(r.parallelFactor, 2), 10) +
      fmt(r.promotionRate === null ? null : r.promotionRate * 100, 0) + '%',
  )
}
console.log('')
console.log('TRIANGLE')
console.log(`  quality     promotion ${fmt(headline.promotionRate * 100, 0)}%   no-gain ${fmt(headline.noGainRate * 100, 0)}%   attempts/round ${fmt(headline.attemptedPerRound, 2)}`)
console.log(`  efficiency  ${fmt(headline.secondsPerRound)} s/round   parallel factor ${fmt(headline.parallelFactor, 2)}   verifier runs/round ${fmt(headline.verifierRunsPerRound, 2)} (measured ${headline.measuredOf})   verifier share of wall ${fmt(headline.verifierShare === null ? null : headline.verifierShare * 100, 0)}%`)
console.log(`  cost        ${headline.tokens} tokens   $${fmt(headline.usd, 4)}   (per measured round: ${fmt(headline.measuredRounds ? headline.tokens / headline.measuredRounds : null, 0)} tokens)`)
if (!headline.tokens) console.log('              no token accounting in these logs — the cost leg is unmeasured, not zero')
else if (!headline.usd) console.log('              tokens are counted but not priced here — $0.00 means unpriced, not free')
