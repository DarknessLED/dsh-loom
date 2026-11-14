// The backlog a lifecycle fix cannot reach.
//
// `campaign.finished` closes the checkpoints a campaign leaves behind, but it
// only runs forward. Campaigns that ended before that event existed still carry
// `open` decisions nobody can act on, so the queue stays in the hundreds and
// every reader learns to ignore it. This module plans the one-time repair
// without touching anything a person is actually working through: a raised
// question is eligible only if it is still `open`, its campaign has really
// ended, and no hold keeps it alive.

/** Campaign statuses whose end makes their checkpoints unanswerable. */
const ENDED_STATUSES = new Set(['done', 'stopped', 'converged'])

/** A campaign entry may be a materialized view (`{id, state, ledger}`) or the state itself. */
function stateOf(entry) {
  return entry && typeof entry === 'object' && entry.state && typeof entry.state === 'object'
    ? entry.state
    : entry
}

/**
 * True only for a campaign that both reached an ending status and recorded the
 * end. A `stopped` campaign with no `ended` record is skipped on purpose: the
 * record is the evidence that a decision was taken, and a status alone is not.
 */
function hasEnded(state) {
  if (!state || !ENDED_STATUSES.has(state.status)) return false
  return state.ended != null && state.ended !== false
}

/** The hold timestamp a checkpoint carries, in ms; `null` when it has none. */
function heldUntilOf(checkpoint) {
  const raw = checkpoint?.heldUntil ?? checkpoint?.held?.until ?? null
  if (raw == null) return null
  const ms = typeof raw === 'number' ? raw : Date.parse(raw)
  return Number.isFinite(ms) ? ms : null
}

function campaignList(campaigns) {
  return Array.isArray(campaigns) ? campaigns : []
}

/**
 * Decide which open checkpoints the migration would close.
 *
 * `close` is the ids of open checkpoints owned by an ended campaign; `keep` is
 * every other open checkpoint. Checkpoints that are already answered, closed or
 * discarded are never listed: "not open" is not the same claim as "should be
 * closed", and rewriting a verdict would destroy the record of it.
 *
 * @param {Array<object>} campaigns
 * @param {number} [now] reference instant, for deterministic tests
 * @returns {{close: string[], keep: string[]}}
 */
export function planMigration(campaigns = [], now = Date.now()) {
  const close = []
  const keep = []
  const seen = new Set()
  for (const entry of campaignList(campaigns)) {
    const state = stateOf(entry)
    if (!state || !Array.isArray(state.checkpoints)) continue
    const ended = hasEnded(state)
    for (const checkpoint of state.checkpoints) {
      if (!checkpoint || checkpoint.status !== 'open' || typeof checkpoint.id !== 'string') continue
      // The same id can only be planned once even if two entries disagree
      // about it; the first verdict wins and the rest of the loop still runs.
      if (seen.has(checkpoint.id)) continue
      seen.add(checkpoint.id)
      const heldUntil = heldUntilOf(checkpoint)
      const held = heldUntil !== null && heldUntil > now
      if (ended && !held) close.push(checkpoint.id)
      else keep.push(checkpoint.id)
    }
  }
  return { close, keep }
}

/**
 * Apply the plan: one `checkpoint.closed` event per planned id, tagged
 * `campaign-ended`, and nothing else.
 *
 * The campaign's current checkpoint is marked closed in the supplied state too,
 * so running the migration twice without reloading the ledger is a no-op rather
 * than a second batch of events.
 *
 * @param {{append: Function, get?: Function}} runtime
 * @param {Array<object>} campaigns
 * @returns {{closed: string[]}}
 */
export function applyMigration(runtime, campaigns = []) {
  const plan = planMigration(campaigns)
  const wanted = new Set(plan.close)
  const targets = new Map()
  for (const entry of campaignList(campaigns)) {
    const state = stateOf(entry)
    if (!state || !Array.isArray(state.checkpoints)) continue
    for (const checkpoint of state.checkpoints) {
      if (!checkpoint || !wanted.has(checkpoint.id) || targets.has(checkpoint.id)) continue
      targets.set(checkpoint.id, { entry, state, checkpoint })
    }
  }

  const closed = []
  for (const id of plan.close) {
    const hit = targets.get(id)
    if (!hit) continue
    runtime.append(viewFor(runtime, hit.entry, hit.state), 'checkpoint.closed', {
      id,
      reason: 'campaign-ended',
    })
    hit.checkpoint.status = 'closed'
    hit.checkpoint.closedReason = 'campaign-ended'
    closed.push(id)
  }
  return { closed }
}

/**
 * `Runtime.append` needs the view (it owns the ledger), while callers may hand
 * us either the view or its state. Resolve the view lazily so the pure planning
 * path never depends on the runtime.
 */
function viewFor(runtime, entry, state) {
  if (entry && entry.state === state && entry.ledger) return entry
  if (typeof runtime?.get === 'function' && typeof state?.id === 'string') {
    try {
      return runtime.get(state.id)
    } catch {
      // A state without a matching on-disk campaign can still be migrated when
      // the caller supplied something appendable (the plan is state-only).
    }
  }
  return entry
}
