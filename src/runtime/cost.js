import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as zlib from 'node:zlib'
import { svc } from '../core/services.js'

// Token accounting for a child session. DSH exposes no dollar figure, so we sum
// the per-call `usage` on assistant messages and price it with a config table.

const ZERO = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }

/**
 * Documented rates, USD per million tokens, used when the campaign config names
 * no pricing table. DSH exposes no dollar figure of its own, so without these a
 * round with real tokens was priced at exactly zero — "not priced" and "free"
 * were indistinguishable, and the budget preflight could never fire. Override
 * `config.models.pricing` to match the account's real prices; an explicit table
 * always wins.
 */
export const DEFAULT_PRICING = Object.freeze({
  inputPerMTok: 0.28,
  outputPerMTok: 0.42,
  cacheReadPerMTok: 0.028,
})

// A transcript is the last-resort source of spend. DSH tokens are roughly four
// characters each, so the text length is a usable upper-bound estimate and is
// always labelled `estimated` so nobody mistakes it for a meter reading.
const CHARS_PER_TOKEN = 4

export function sumUsage(events) {
  const total = { ...ZERO }
  for (const ev of events) {
    if (ev.type !== 'assistant/message') continue
    const u = ev.data?.usage
    if (!u) continue
    total.inputTokens += num(u.inputTokens)
    total.outputTokens += num(u.outputTokens)
    total.cacheReadTokens += num(u.cacheReadTokens)
    total.cacheWriteTokens += num(u.cacheWriteTokens)
  }
  return total
}

function num(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : 0
}

/**
 * The harness home that owns the on-disk session ledgers (`<dsh home>/sessions`).
 * `DSH_HOME` is the host's own override; otherwise the profile directory is the
 * same `~/.dsh` the harness writes to. Returns null when neither can be named,
 * which `usageFromSessionLedger` treats as "no ledger" rather than an error.
 */
function dshHome() {
  const explicit = process.env.DSH_HOME
  if (typeof explicit === 'string' && explicit !== '') return explicit
  const profile = process.env.USERPROFILE || process.env.HOME
  return typeof profile === 'string' && profile !== '' ? join(profile, '.dsh') : null
}

/** Read one session's ledger text, plain first, then the zstd archive. */
function readLedgerText(dir) {
  try {
    return readFileSync(join(dir, 'session.v4.jsonl'), 'utf8')
  } catch {
    /* no plain ledger: try the compressed archive */
  }
  try {
    const packed = readFileSync(join(dir, 'session.v4.jsonl.zstd'))
    const unzstd = zlib.zstdDecompressSync
    return typeof unzstd === 'function' ? unzstd(packed).toString('utf8') : null
  } catch {
    return null
  }
}

/** Find `<home>/sessions/<workspace>/<sessionId>/session.v4.jsonl(.zstd)` and read it. */
function readSessionLedger(home, sessionId) {
  if (typeof home !== 'string' || home === '') return null
  let workspaces
  try {
    workspaces = readdirSync(join(home, 'sessions'), { withFileTypes: true })
  } catch {
    return null
  }
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue
    const text = readLedgerText(join(home, 'sessions', workspace.name, sessionId))
    if (text !== null) return text
  }
  return null
}

/**
 * Pull the usage record off one ledger event. The host writes assistant turns as
 * `{type:'assistant', data:{message:{usage:{input_tokens,...}}}}` with snake_case
 * token names, so both shapes and both spellings are accepted here.
 */
function ledgerUsage(ev) {
  if (!ev || typeof ev.type !== 'string' || !ev.type.startsWith('assistant')) return null
  const u = ev.data?.message?.usage ?? ev.data?.usage ?? ev.usage
  if (!u || typeof u !== 'object') return null
  const pick = (camel, snake) => {
    const value = typeof u[camel] === 'number' ? u[camel] : u[snake]
    return num(value)
  }
  return {
    inputTokens: pick('inputTokens', 'input_tokens'),
    outputTokens: pick('outputTokens', 'output_tokens'),
    cacheReadTokens: pick('cacheReadTokens', 'cache_read_input_tokens'),
    cacheWriteTokens: pick('cacheWriteTokens', 'cache_write_input_tokens'),
  }
}

/**
 * Bill a child from its own on-disk ledger when no live meter answers.
 *
 * The transcript survives `sessions.get(childId)` returning nothing, but it
 * lives under the harness home, not the campaign directory, so the caller names
 * that home. Returns null when the directory, the ledger, or every usage block
 * is missing: a missing ledger is not evidence of zero tokens, and the caller
 * must keep the next source of truth in line instead of billing $0.
 *
 * @param {string} home harness home holding `sessions/`
 * @param {string} sessionId child session id
 * @returns {{inputTokens:number,outputTokens:number,cacheReadTokens:number,cacheWriteTokens:number}|null}
 */
export function usageFromSessionLedger(home, sessionId) {
  if (typeof sessionId !== 'string' || sessionId === '') return null
  const text = readSessionLedger(home, sessionId)
  if (text === null) return null
  const total = { ...ZERO }
  let found = false
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let ev
    try {
      ev = JSON.parse(trimmed)
    } catch {
      continue
    }
    const usage = ledgerUsage(ev)
    if (!usage) continue
    found = true
    total.inputTokens += usage.inputTokens
    total.outputTokens += usage.outputTokens
    total.cacheReadTokens += usage.cacheReadTokens
    total.cacheWriteTokens += usage.cacheWriteTokens
  }
  return found ? total : null
}

/** Concatenate the actual text parts of a message's `content` field. */
function textOf(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  let out = ''
  for (const part of content) {
    if (typeof part === 'string') out += part
    else if (part && part.type === 'text' && typeof part.text === 'string') out += part.text
  }
  return out
}

/**
 * Estimate tokens from the transcript when neither a `usage` block nor a token
 * meter exists. Assistant text is output; user text is the input we can see.
 * Counting only real text (never message count) keeps an empty transcript at
 * zero, which is what tests/self6/meter-usage.test.mjs pins.
 */
export function estimateUsage(events) {
  let inputChars = 0
  let outputChars = 0
  for (const ev of Array.isArray(events) ? events : []) {
    const kind = ev?.type
    if (kind !== 'assistant/message' && kind !== 'user/message') continue
    const text = textOf(ev.data?.message?.content)
    if (!text) continue
    if (kind === 'assistant/message') outputChars += text.length
    else inputChars += text.length
  }
  return {
    inputTokens: Math.ceil(inputChars / CHARS_PER_TOKEN),
    outputTokens: Math.ceil(outputChars / CHARS_PER_TOKEN),
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }
}

/** True when a usage record contains at least one non-zero token field. */
export function hasTokens(usage) {
  return Object.values(usage || {}).some((v) => v !== 0)
}

/** A zero result that also mirrors its tokens at the top level. */
function zeroResult() {
  const usage = { ...ZERO }
  return { ...usage, usage, usd: 0, estimated: false }
}

/**
 * Campaign-level spend: sum every recorded attempt's usage. The report cannot
 * trust `budget.spentUsd` alone, because older ledgers never folded a
 * budget.spent event and a crash can land the attempt record before the fold.
 * Attempts without usage (or with non-finite fields) contribute zero.
 */
export function campaignUsage(rounds) {
  const total = { usd: 0, inputTokens: 0, outputTokens: 0, estimated: false }
  for (const round of Array.isArray(rounds) ? rounds : []) {
    for (const attempt of Array.isArray(round?.attempts) ? round.attempts : []) {
      if (!attempt || typeof attempt !== 'object') continue
      const u = attempt.usage
      const hasUsage = u !== null && typeof u === 'object'
      if (hasUsage) {
        total.inputTokens += num(u.inputTokens)
        total.outputTokens += num(u.outputTokens)
      }
      // Newer records keep the priced figure inside `usage`; older ones keep
      // `costUsd` on the attempt itself. Prefer the usage figure when present.
      total.usd += hasUsage && u.costUsd !== undefined ? num(u.costUsd) : num(attempt.costUsd)
      if (attempt.usageEstimated === true || (hasUsage && u.estimated === true)) total.estimated = true
    }
  }
  return total
}

const PRICE_KEYS = ['inputPerMTok', 'outputPerMTok', 'cacheReadPerMTok', 'cacheWritePerMTok']

/** A rate is configured when the caller supplied a finite number for it. */
function isRate(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Resolve the table that prices a round, plus where it came from. A caller that
 * supplies at least one finite rate has configured pricing and wins; anything
 * else (absent table, `{}`, non-object) falls back to DEFAULT_PRICING. The
 * source is recorded as `round.finished.priceSource` so a report can say which
 * table its dollars came from instead of guessing.
 *
 * @returns {{table: object, source: 'default'|'configured'}}
 */
export function resolvePricing(pricing) {
  const configured = pricing !== null && typeof pricing === 'object' && PRICE_KEYS.some((k) => isRate(pricing[k]))
  return configured ? { table: pricing, source: 'configured' } : { table: DEFAULT_PRICING, source: 'default' }
}

/** True when a table fans out per relay/model instead of holding one rate set. */
function isSplitTable(table) {
  if (!table || typeof table !== 'object') return false
  if (table.byModel && typeof table.byModel === 'object') return true
  return table.default !== null && typeof table.default === 'object'
}

/**
 * Pick the rate set that prices one model's work, and name where it came from.
 *
 * A campaign can run the same model through several relays at very different
 * prices, so a table may fan out as `{default: {...}, byModel: {'<modelId>':
 * {...}}}`. Matching the model id identifies the relay that actually answered
 * instead of averaging every relay into one rate. A legacy flat table keeps the
 * old `configured` contract, and an absent (or empty) table means the documented
 * defaults.
 *
 * @returns {{table: object, source: string}} source is `model:<id>`,
 *   `configured`, or `default`; the caller records it so a report can say which
 *   rates produced its dollars.
 */
export function pricingFor(table, model) {
  if (!isSplitTable(table)) {
    return resolvePricing(table)
  }
  const byModel = table.byModel && typeof table.byModel === 'object' ? table.byModel : {}
  const matched = typeof model === 'string' && model ? byModel[model] : undefined
  if (matched && typeof matched === 'object') return { table: matched, source: `model:${model}` }
  const fallback = table.default
  if (fallback && typeof fallback === 'object' && PRICE_KEYS.some((k) => isRate(fallback[k]))) {
    return { table: fallback, source: 'default' }
  }
  return { table: DEFAULT_PRICING, source: 'default' }
}

/** Use an explicit rate when present, else the default for that leg. */
function rateOf(value, fallback) {
  return isRate(value) ? value : fallback
}

/**
 * Price a usage record with a per-million-token table (USD). Rates missing from
 * an explicit table fall back to the documented default for that leg, so a
 * partial override cannot silently make output free.
 */
export function priceUsage(usage, pricing) {
  const table = pricingFor(pricing).table
  const u = usage || ZERO
  const inP = rateOf(table.inputPerMTok, DEFAULT_PRICING.inputPerMTok)
  const outP = rateOf(table.outputPerMTok, DEFAULT_PRICING.outputPerMTok)
  const cacheP = rateOf(table.cacheReadPerMTok, inP)
  const usd =
    (num(u.inputTokens) / 1e6) * inP +
    (num(u.outputTokens) / 1e6) * outP +
    (num(u.cacheReadTokens) / 1e6) * cacheP
  return Math.round(usd * 1e6) / 1e6
}

/**
 * Price a round from its transcript, split by provenance: the brief we sent is
 * input, the agent's answer is output. `usageOfSession` already estimates from
 * the same character count, but a session that publishes no usage block leaves
 * that fallback unpriced — `tokensOf` then counts tokens while `costUsd` stays
 * at zero, which is the exact hole that made the budget guard unreachable.
 * An empty brief and answer stay free and are not labelled an estimate.
 */
export function fallbackSpend(brief, text, pricing) {
  const usage = {
    inputTokens: Math.ceil((brief?.length || 0) / CHARS_PER_TOKEN),
    outputTokens: Math.ceil((text?.length || 0) / CHARS_PER_TOKEN),
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }
  return { ...usage, usage, usd: priceUsage(usage, pricing), estimated: hasTokens(usage) }
}

/**
 * Ask the host's token meter for a session's usage. Child session logs carry
 * no `usage` on assistant messages (verified against real archives), so this
 * is the only source of a real measurement; it returns null when the service
 * is absent, does not expose `measure`, returns nothing usable, or throws.
 */
function measureViaMeter(ctx, sessionId) {
  try {
    const meter = svc(ctx, 'tokenMeter')
    if (!meter || typeof meter.measure !== 'function') return null
    const usage = normalizeMeterUsage(meter.measure(sessionId))
    // A zeroed measurement is not evidence of real spend; let the log win.
    return usage && hasTokens(usage) ? usage : null
  } catch {
    return null
  }
}

/**
 * Coerce a meter result into a token record. Host meters answer in several
 * shapes — `{usage: {...}}`, `{tokens: {...}}`, or the token fields flat on the
 * result — and an empty or non-finite answer means "no measurement", not
 * "spent nothing", so callers can keep the next source of truth in line.
 */
function normalizeMeterUsage(raw) {
  const u = raw && typeof raw === 'object'
    ? raw.usage && typeof raw.usage === 'object'
      ? raw.usage
      : raw.tokens && typeof raw.tokens === 'object'
        ? raw.tokens
        : raw
    : null
  if (!u || typeof u !== 'object') return null
  const usage = {
    inputTokens: num(u.inputTokens),
    outputTokens: num(u.outputTokens),
    cacheReadTokens: num(u.cacheReadTokens),
    cacheWriteTokens: num(u.cacheWriteTokens),
  }
  return hasTokens(usage) ? usage : null
}

/**
 * Ask the host's cost meter for a session's real token usage. Unlike
 * `tokenMeter`, `costMeter` is the ledger a DSH host actually installs, and it
 * keeps counting cache reads, so it is the only measurement that agrees with
 * the child session's own price. Returns null when the service is absent, does
 * not expose `getSessionCost`, reports nothing usable, or throws.
 */
function measureViaCostMeter(ctx, sessionId) {
  try {
    const meter = svc(ctx, 'costMeter')
    if (!meter || typeof meter.getSessionCost !== 'function') return null
    return normalizeMeterUsage(meter.getSessionCost(sessionId))
  } catch {
    return null
  }
}

/**
 * Read one session's token usage, preferring real measurements over guesses:
 * host cost meter, then host token meter, then a `usage` block in the log, then
 * a transcript estimate. Returns zeros when the session is unavailable.
 */
export function usageOfSession(ctx, sessionId, pricing, home = dshHome()) {
  // Never touch ctx.<service> directly: under cordis a fiber without the
  // inject declaration throws on property access, and this runs inside a
  // timer fiber where `sessions` is not declared.
  if (!sessionId) return zeroResult()
  const table = pricingFor(pricing).table
  // The cost meter bills what the child actually spent, cache reads included;
  // it wins over every guess below whenever it reports real tokens.
  const costed = measureViaCostMeter(ctx, sessionId)
  if (costed) return { ...costed, usage: costed, usd: priceUsage(costed, table), estimated: false }
  // The child's own ledger outlives the live session object, so it is the
  // surviving measurement when `sessions.get(childId)` is already gone. Null
  // means "nothing to read", never "spent zero", so the fallbacks stay in line.
  const fromLedger = usageFromSessionLedger(home, sessionId)
  if (fromLedger) {
    return { ...fromLedger, usage: fromLedger, usd: priceUsage(fromLedger, table), estimated: false }
  }
  let events = []
  let logged = { ...ZERO }
  try {
    const sessions = svc(ctx, 'sessions')
    const session = sessions?.get ? sessions.get(sessionId) : undefined
    events = session?.snapshotEvents ? session.snapshotEvents() : []
    logged = sumUsage(events)
  } catch {
    /* an unreadable session log degrades to no logged usage */
  }
  // The host measurement is authoritative whenever it reports real tokens.
  const measured = measureViaMeter(ctx, sessionId)
  if (measured) return { ...measured, usage: measured, usd: priceUsage(measured, table), estimated: false }
  // A real usage block in the log is also a measurement, not an estimate.
  if (hasTokens(logged)) return { ...logged, usage: logged, usd: priceUsage(logged, table), estimated: false }
  // No measurement at all: the transcripts still prove the session did work.
  const estimate = estimateUsage(events)
  const estimated = hasTokens(estimate)
  return { ...estimate, usage: estimate, usd: priceUsage(estimate, table), estimated }
}
