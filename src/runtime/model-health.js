/**
 * Which model refs actually finish work, per campaign.
 *
 * A fallback chain is a bet, and until now nothing kept the score. The attempt
 * record already carries the three facts a chain decision needs -- which ref ran,
 * how it ended, and how long it took -- but they were only ever readable one
 * attempt at a time, so choosing a chain was folklore.
 *
 * The shape is deliberately the same for every ref, including `unknown`:
 * attempts with no model are a row, not a discard, because a table whose rows do
 * not add up to the campaign is a table that lies.
 *
 * Pure: takes a `rounds` array, returns a plain object keyed by model ref.
 */

const UNKNOWN = 'unknown'

// `Number(null)` is 0 and `Number("")` is 0, and a zero-duration attempt is a real
// thing. So absence has to be rejected before the coercion, or "never measured"
// silently becomes "measured instantly" -- the exact confusion this table exists
// to prevent.
function num(x) {
  if (x === null || x === undefined || x === '') return null
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

/** Nearest-rank percentile over a sorted array; null when the set is empty. */
function percentile(sorted, p) {
  if (!Array.isArray(sorted) || sorted.length === 0) return null
  const rank = Math.ceil((p / 100) * sorted.length)
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1))
  return sorted[idx]
}

function emptyRow() {
  return {
    attempts: 0,
    ok: 0,
    verified: 0,
    timeouts: 0,
    died: 0,
    exhausted: 0,
    context: 0,
    crash: 0,
    other: 0,
    promoted: 0,
    measured: 0,
    totalMs: 0,
    p50Ms: null,
    p90Ms: null,
  }
}

/**
 * Fold a campaign's attempts into one row per model ref.
 *
 * `failureKind` decides the bucket: `ok`, `timeout`, `died`, `exhausted`,
 * `context`, `crash`, anything else is `other`. An attempt with no `model` is
 * filed under `unknown`. `promoted` counts the attempts a round actually
 * promoted, which is a different question from "the verifier passed".
 *
 * @param {Array<object>} rounds folded rounds, each with an `attempts` array
 * @returns {Record<string, object>} one row per model ref
 */
export function modelHealth(rounds) {
  const list = Array.isArray(rounds) ? rounds : []
  const byRef = new Map()

  for (const round of list) {
    if (!round || typeof round !== 'object') continue
    const attempts = Array.isArray(round.attempts) ? round.attempts : []
    const promotedId = round.promotedAttemptId ?? null
    for (const attempt of attempts) {
      if (!attempt || typeof attempt !== 'object') continue
      const ref = typeof attempt.model === 'string' && attempt.model.trim() ? attempt.model.trim() : UNKNOWN
      if (!byRef.has(ref)) byRef.set(ref, { row: emptyRow(), durations: [] })
      const entry = byRef.get(ref)
      const row = entry.row
      row.attempts += 1
      const kind = attempt.failureKind ?? (attempt.verifierOk ? 'ok' : 'other')
      if (kind === 'ok') row.ok += 1
      else if (kind === 'timeout') row.timeouts += 1
      else if (kind === 'died') row.died += 1
      else if (kind === 'exhausted') row.exhausted += 1
      else if (kind === 'context') row.context += 1
      else if (kind === 'crash') row.crash += 1
      else row.other += 1
      if (attempt.verifierOk === true) row.verified += 1
      if (promotedId && attempt.id === promotedId) row.promoted += 1
      const ms = num(attempt.durationMs)
      if (ms !== null) {
        row.measured += 1
        row.totalMs += Math.max(0, ms)
        entry.durations.push(Math.max(0, ms))
      }
    }
  }

  const out = {}
  for (const [ref, entry] of byRef) {
    const sorted = entry.durations.slice().sort((a, b) => a - b)
    out[ref] = {
      ...entry.row,
      p50Ms: percentile(sorted, 50),
      p90Ms: percentile(sorted, 90),
    }
  }
  return out
}
