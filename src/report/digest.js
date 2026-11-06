/**
 * A campaign digest: the bounded catch-up a human needs in thirty seconds.
 *
 * rsi_status is a ledger dump (tokens, tails, checkpoints) and the dashboard is
 * one table row per campaign; neither answers "what changed since I last looked,
 * and what is waiting for me". This module is a pure projection of the same
 * materialized state. It deliberately reads only scalars — never stdout tails,
 * patch bodies or payload blobs — and it is line-budgeted so an overnight
 * campaign cannot flood the chat.
 *
 * Shape:
 *   header       "<id> [<status>] round <n> · <verdict> · <spend>"
 *   round lines  newest first, "<n> <taskId> <score|-> <status>"
 *   review lines "- <risk> <id>: <summary>" (ranked by reviewQueue, max 3)
 *   lesson line  "lessons: <n> active, <n> quarantined" (only when any exist)
 */

import { campaignUsage } from '../runtime/cost.js'
import { campaignQuality } from '../runtime/quality.js'
import { reviewQueue } from '../runtime/review.js'

/** Hard ceiling on the whole digest, header and sections included. */
export const DIGEST_MAX_LINES = 10

const MAX_LINE = 120
const MAX_REVIEWS = 3
const DEFAULT_ROUNDS = 5

/** Collapse every run of whitespace (including newlines) to a single space. */
function oneLine(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}

/** Hard cap measured on the same string the caller renders. */
function clip(text, max = MAX_LINE) {
  const line = oneLine(text)
  if (line.length <= max) return line
  return `${line.slice(0, max - 1).trimEnd()}…`
}

function roundsOf(state) {
  return Array.isArray(state?.rounds) ? state.rounds.filter((r) => r && typeof r === 'object') : []
}

/**
 * The score that decided a round. `round.score` is authoritative when present;
 * older ledgers only carry per-attempt scores, so the last real attempt value
 * is used instead. Unknown stays "-" rather than becoming NaN in the digest.
 */
function scoreOf(round) {
  if (Number.isFinite(round?.score)) return String(round.score)
  const attempts = Array.isArray(round?.attempts) ? round.attempts : []
  for (let i = attempts.length - 1; i >= 0; i -= 1) {
    if (Number.isFinite(attempts[i]?.score)) return String(attempts[i].score)
  }
  return '-'
}

function spendSummary(state) {
  const spend = campaignUsage(roundsOf(state))
  const cap = Number(state?.budget?.usd)
  if (Number.isFinite(cap)) return `spend $${spend.usd.toFixed(3)}/$${cap}`
  return `spend $${spend.usd.toFixed(3)}`
}

function headerLine(state) {
  const rounds = roundsOf(state)
  const last = rounds[rounds.length - 1]
  const verdict = oneLine(last?.status) || campaignQuality(state).verdict
  return clip(
    `${oneLine(state?.id) || 'campaign'} [${oneLine(state?.status) || 'unknown'}]` +
      ` round ${rounds.length} · ${verdict} · ${spendSummary(state)}`,
  )
}

function roundLine(round) {
  const n = Number.isFinite(round?.n) ? round.n : '?'
  const task = oneLine(round?.taskId) || '-'
  const status = oneLine(round?.status) || '-'
  return clip(`${n} ${task} ${scoreOf(round)} ${status}`)
}

/**
 * Review lines reuse reviewQueue so the digest and the status card rank the
 * same decisions the same way. A payload that would render as a JSON blob is
 * replaced with its kind: the digest is prose, never serialized data.
 */
function reviewLines(state) {
  return reviewQueue(state)
    .slice(0, MAX_REVIEWS)
    .map((item) => {
      const summary = oneLine(item.summary)
      const safe = /\{"|\[\{/.test(summary) ? `${item.kind} checkpoint` : summary
      return clip(`- ${item.risk || 'low'} ${item.id || '?'}: ${safe || item.kind}`)
    })
}

function lessonLine(state) {
  const lessons = Array.isArray(state?.lessons) ? state.lessons.filter(Boolean) : []
  if (!lessons.length) return null
  const active = lessons.filter((l) => l.status === 'active').length
  const quarantined = lessons.filter((l) => l.status === 'quarantined').length
  return clip(`lessons: ${active} active, ${quarantined} quarantined`)
}

/**
 * Render one bounded catch-up for a campaign.
 *
 * @param {object} state materialized campaign state (rounds, openCheckpoints, lessons)
 * @param {{rounds?: number}} [opts] how many recent rounds to print (default 5)
 * @returns {string} at most {@link DIGEST_MAX_LINES} non-blank lines, each <= 120 chars
 */
export function campaignDigest(state, opts = {}) {
  const requested = Number(opts?.rounds)
  const roundLimit = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : DEFAULT_ROUNDS

  const reviews = reviewLines(state)
  const lessons = lessonLine(state)
  const lines = [headerLine(state)]

  // Reserve room for the header, every review line and the lesson line first;
  // whatever is left is the round window. This is what keeps the total bounded
  // even when a campaign has more rounds than the caller asked for.
  const reserved = lines.length + reviews.length + (lessons ? 1 : 0)
  const room = Math.max(0, DIGEST_MAX_LINES - reserved)
  const take = Math.min(roundLimit, room)
  const rounds = take > 0 ? roundsOf(state).slice(-take).reverse() : []
  lines.push(...rounds.map(roundLine), ...reviews)
  if (lessons) lines.push(lessons)
  return lines.filter((line) => line.length > 0).join('\n')
}
