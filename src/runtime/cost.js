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

/** Read one session's token usage. Returns zeros when the session is unavailable. */
export function usageOfSession(ctx, sessionId, pricing) {
  // Never touch ctx.<service> directly: under cordis a fiber without the
  // inject declaration throws on property access, and this runs inside a
  // timer fiber where `sessions` is not declared.
  if (!sessionId) return { usage: { ...ZERO }, usd: 0 }
  try {
    const session = svc(ctx, 'sessions').get(sessionId)
    const events = session?.snapshotEvents ? session.snapshotEvents() : []
    const usage = sumUsage(events)
    return { usage, usd: priceUsage(usage, pricing) }
  } catch {
    return { usage: { ...ZERO }, usd: 0 }
  }
}
