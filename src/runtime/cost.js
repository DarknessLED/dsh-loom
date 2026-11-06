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
  if (!sessionId || !ctx?.sessions?.get) return { usage: { ...ZERO }, usd: 0 }
  try {
    const session = svc(ctx, 'sessions').get(sessionId)
    const events = session?.snapshotEvents ? session.snapshotEvents() : []
    const usage = sumUsage(events)
    return { usage, usd: priceUsage(usage, pricing) }
  } catch {
    return { usage: { ...ZERO }, usd: 0 }
  }
}
