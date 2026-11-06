import { svc } from '../core/services.js'

// Token accounting for a child session. DSH exposes no dollar figure, so we sum
// the per-call `usage` on assistant messages and price it with a config table.

const ZERO = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }

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
 * Campaign-level spend: sum every recorded attempt's usage. The report cannot
 * trust `budget.spentUsd` alone, because older ledgers never folded a
 * budget.spent event and a crash can land the attempt record before the fold.
 * Attempts without usage (or with non-finite fields) contribute zero.
 */
export function campaignUsage(rounds) {
  const total = { usd: 0, inputTokens: 0, outputTokens: 0 }
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
    }
  }
  return total
}

/** Price a usage record with a per-million-token table (USD). */
export function priceUsage(usage, pricing = {}) {
  const inP = num(pricing.inputPerMTok) || 0
  const outP = num(pricing.outputPerMTok) || 0
  const cacheP = num(pricing.cacheReadPerMTok) || inP
  const usd =
    (usage.inputTokens / 1e6) * inP +
    (usage.outputTokens / 1e6) * outP +
    (usage.cacheReadTokens / 1e6) * cacheP
  return Math.round(usd * 1e6) / 1e6
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
    return usage && Object.values(usage).some((v) => v !== 0) ? usage : null
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

/** Read one session's token usage. Returns zeros when the session is unavailable. */
export function usageOfSession(ctx, sessionId, pricing) {
  // Never touch ctx.<service> directly: under cordis a fiber without the
  // inject declaration throws on property access, and this runs inside a
  // timer fiber where `sessions` is not declared.
  if (!sessionId) return { usage: { ...ZERO }, usd: 0 }
  let logged = { ...ZERO }
  try {
    const sessions = svc(ctx, 'sessions')
    const session = sessions?.get ? sessions.get(sessionId) : undefined
    const events = session?.snapshotEvents ? session.snapshotEvents() : []
    logged = sumUsage(events)
  } catch {
    /* an unreadable session log degrades to no logged usage */
  }
  // The host measurement is authoritative whenever it reports real tokens;
  // otherwise keep the log's (usually zero) answer instead of inventing one.
  const usage = measureViaMeter(ctx, sessionId) ?? logged
  return { usage, usd: priceUsage(usage, pricing) }
}
