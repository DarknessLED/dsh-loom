// Which rounds may be released because their host went away.
//
// A round is not "running" merely because the ledger says so. The ledger is
// append-only and a round only stops being `running` when something writes its
// `round.finished`; if the process that owned the attempt disappears, nothing
// ever will. `Runtime.inflight` is an in-memory Set that is rebuilt empty on
// boot, so after a restart the Set says "nothing is in flight", the ledger says
// "round 1 is running", and the two never reconcile: `rsi_run` answers "already
// has a round in flight" forever (campaign `inflight-recover`, 2026-11-25).
//
// The decision needs two facts, never one:
//   - is this process tracking a child for that round? (the only real evidence
//     of life -- a lease on disk still says `running` after a restart)
//   - has the round written anything recently? (a round that is still emitting
//     verifier output or candidate records is not stale)
// Only when both answers are "no" and the silence is longer than one attempt
// budget plus a grace may the round be released.

const DEFAULT_TIMEOUT_MS = 13 * 60_000
const DEFAULT_GRACE_MS = 5 * 60_000
const FLOOR_MS = 15 * 60_000

/**
 * How long a round may be silent, with no live attempt, before it is treated as
 * orphaned. Derived from the attempt budget on purpose: a round still inside its
 * own budget is by definition not orphaned, so a fixed small number would release
 * healthy rounds and a fixed large one would park a campaign for hours.
 *
 * @param {{attemptTimeoutMs?: number, orphanGraceMs?: number, orphanAfterMs?: number}} [config]
 */
export function orphanWindowMs(config = {}) {
  const explicit = Number(config?.orphanAfterMs)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  const budget = Number(config?.attemptTimeoutMs)
  const grace = Number(config?.orphanGraceMs)
  const explicitTimeout = Number.isFinite(budget) && budget > 0
  const explicitGrace = Number.isFinite(grace) && grace >= 0
  const timeout = explicitTimeout ? budget : DEFAULT_TIMEOUT_MS
  const slack = explicitGrace ? grace : DEFAULT_GRACE_MS
  // The floor guards the *guess*, not an operator's stated numbers: when the
  // ceiling and the grace are both given, the caller already said what it wants
  // and clamping would silently override it.
  if (explicitTimeout && explicitGrace) return timeout + slack
  return Math.max(FLOOR_MS, timeout + slack)
}

/**
 * The last event that belongs to one round.
 *
 * Most events name their round (`data.round`, or `data.n` on round.started /
 * round.finished). Some do not: `candidate.proposed` carries only an attempt id.
 * Those ids are minted as `r<round>a<index>` and every consumer in this codebase
 * already reads them that way, so the id is used as a fallback rather than
 * letting a round that is still emitting candidates look silent.
 */
function lastEventFor(events, roundNumber) {
  let last = null
  for (const ev of events ?? []) {
    const data = ev?.data
    if (!data) continue
    const id = typeof data.attemptId === 'string' ? data.attemptId : typeof data.id === 'string' ? data.id : null
    const byId = id === null ? null : /^r(\d+)a\d+$/.exec(id)
    const belongs =
      Number(data.round) === roundNumber ||
      // `round.started` / `round.finished` carry the number as `n`.
      Number(data.n) === roundNumber ||
      (byId !== null && Number(byId[1]) === roundNumber)
    if (!belongs) continue
    const at = Number(ev.t)
    if (Number.isFinite(at) && (last === null || at > last)) last = at
  }
  return last
}

/**
 * The rounds of one campaign that may be released, with the reason why.
 *
 * @param {object} input
 * @param {{rounds?: object[]}} input.state folded campaign state
 * @param {object[]} [input.events] the campaign's normalised ledger
 * @param {Set<number>|number[]} [input.liveRounds] rounds this process is watching
 * @param {number} [input.now]
 * @param {number} [input.afterMs] silence needed before release
 * @returns {{round: number, lastAt: number|null, idleMs: number, reason: string}[]}
 */
export function findOrphans({ state, events = [], liveRounds = new Set(), now = Date.now(), afterMs = FLOOR_MS } = {}) {
  const live = liveRounds instanceof Set ? liveRounds : new Set([...(liveRounds ?? [])].map(Number))
  const out = []
  for (const round of state?.rounds ?? []) {
    if (!round || round.status !== 'running') continue
    const n = Number(round.n)
    if (!Number.isFinite(n)) continue
    // A watched child decides it. This is the one mistake the release must not
    // make: a long turn is normal, and killing one repeatedly is how this loop
    // would burn its budget without learning anything.
    if (live.has(n)) continue
    const lastAt = lastEventFor(events, n) ?? (Number.isFinite(Number(round.at)) ? Number(round.at) : null)
    const since = lastAt ?? 0
    const idleMs = Math.max(0, now - since)
    if (idleMs < afterMs) continue
    out.push({
      round: n,
      lastAt: lastAt ?? null,
      idleMs,
      reason: `no live attempt and no event for ${Math.round(idleMs / 60_000)} minute(s) (round ${n} never closed)`,
    })
  }
  return out
}
