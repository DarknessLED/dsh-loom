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
  const table = resolvePricing(pricing).table
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

/** Coerce a meter result (`usage`-wrapped or flat) into a token record. */
function normalizeMeterUsage(raw) {
  const u = raw && typeof raw === 'object' && raw.usage && typeof raw.usage === 'object' ? raw.usage : raw
  if (!u || typeof u !== 'object') return null
  return {
    inputTokens: num(u.inputTokens),
    outputTokens: num(u.outputTokens),
    cacheReadTokens: num(u.cacheReadTokens),
    cacheWriteTokens: num(u.cacheWriteTokens),
  }
}

/**
 * Read one session's token usage, preferring real measurements over guesses:
 * host meter, then a `usage` block in the log, then a transcript estimate.
 * Returns zeros when the session is unavailable.
 */
export function usageOfSession(ctx, sessionId, pricing) {
  // Never touch ctx.<service> directly: under cordis a fiber without the
  // inject declaration throws on property access, and this runs inside a
  // timer fiber where `sessions` is not declared.
  if (!sessionId) return zeroResult()
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
  if (measured) return { ...measured, usage: measured, usd: priceUsage(measured, pricing), estimated: false }
  // A real usage block in the log is also a measurement, not an estimate.
  if (hasTokens(logged)) return { ...logged, usage: logged, usd: priceUsage(logged, pricing), estimated: false }
  // No measurement at all: the transcripts still prove the session did work.
  const estimate = estimateUsage(events)
  const estimated = hasTokens(estimate)
  return { ...estimate, usage: estimate, usd: priceUsage(estimate, pricing), estimated }
}
