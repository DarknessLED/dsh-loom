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
    abandoned: 0,
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
 * `abandoned` wins over `failureKind`. An attempt the round stopped on purpose --
 * a sibling already solved the task, or the host restarted -- arrives here with
 * `failureKind: 'died'`, because that is what an aborted child looks like from
 * the dispatcher. It is true about the child and false about the provider: we
 * stopped paying for an answer we already had. Filing it as a death made every
 * two-candidate campaign look like a provider that dies once per round, at
 * exactly the moment its sibling finished.
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
      if (attempt.abandoned === true) row.abandoned += 1
      else if (kind === 'ok') row.ok += 1
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

/**
 * The set of outcomes that mean "this ref did not deliver", as opposed to "this
 * attempt did not win". A ref can fail to deliver and still be worth keeping
 * first: what it must not do is keep failing while holding the front of the
 * queue.
 */
const NO_DELIVERY = new Set(['died', 'timeout', 'exhausted'])

/**
 * Move refs whose current streak is all failures to the back of the chain.
 *
 * The chain is assembled from configuration alone, so a provider that has died
 * its last three attempts still gets the first slice every round: the score the
 * loop just computed is never read. This is the smallest correction — the
 * demoted refs keep their own relative order, every other ref keeps its place,
 * and `after <= 0` disables the rule so a campaign that has not asked for this
 * behaves exactly as before.
 *
 * @param {Array<string|null>} chain configured refs, front first
 * @param {Array<object>} rounds folded rounds, each with an `attempts` array
 * @param {{after?: number}} [opts] streak length that counts as a pattern; 0 disables
 * @returns {{chain: Array<string|null>, demoted: string[]}}
 */
export function demoteChain(chain, rounds, opts = {}) {
  const list = Array.isArray(chain) ? chain.slice() : []
  const after = Number(opts?.after ?? 0)
  if (!Number.isFinite(after) || after <= 0 || list.length === 0) return { chain: list, demoted: [] }

  // Walk the ledger once, keeping the tail of each ref's outcomes. The tail is
  // all that matters: a ref that died three times and then finished has recovered.
  const streaks = new Map()
  const folded = Array.isArray(rounds) ? rounds : []
  for (const round of folded) {
    if (!round || typeof round !== 'object') continue
    const attempts = Array.isArray(round.attempts) ? round.attempts : []
    for (const attempt of attempts) {
      if (!attempt || typeof attempt !== 'object') continue
      const ref = typeof attempt.model === 'string' && attempt.model.trim() ? attempt.model.trim() : null
      if (!ref) continue
      // An attempt we stopped on purpose says nothing about the ref's health, so
      // it must not extend a losing streak. Otherwise the rule benches whichever
      // model is fast enough to win its round early.
      if (attempt.abandoned === true) continue
      const kind = attempt.failureKind ?? (attempt.verifierOk ? 'ok' : 'other')
      const streak = streaks.get(ref) ?? []
      streak.push(NO_DELIVERY.has(kind) ? 'fail' : 'ok')
      while (streak.length > Math.max(after, 1)) streak.shift()
      streaks.set(ref, streak)
    }
  }

  const dead = []
  const keep = []
  for (const ref of list) {
    const key = typeof ref === 'string' ? ref.trim() : null
    const streak = key ? streaks.get(key) : null
    const failed = Array.isArray(streak) && streak.length >= after && streak.every((x) => x === 'fail')
    if (key && failed) dead.push(key)
    else keep.push(ref)
  }
  // A chain where everything is dead keeps its configured order: demoting all the
  // refs would reorder the queue for no reason, and the round still has to try
  // something.
  if (keep.length === 0) return { chain: list, demoted: dead }
  return { chain: [...keep, ...dead], demoted: dead }
}
