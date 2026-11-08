export const ACTIVE_STATUSES = new Set(['draft', 'planning', 'running', 'paused'])

export function emptyState(id = null) {
  return {
    id,
    createdAt: null,
    updatedAt: null,
    status: 'draft',
    objective: '',
    workspace: null,
    constraints: [],
    budget: { usd: 5, rounds: 12, spentUsd: 0, roundsUsed: 0, minutes: 240 },
    chain: { activeVersion: null, versions: [] },
    evalset: { tasks: [], holdout: [] },
    /**
     * Which holdout partition actually ran, and from which pool. A holdout
     * choice is only auditable if the ledger keeps the pool it was drawn from
     * (with an identity for that pool): `covered` is what ran, not what was
     * planned, and `picks` keeps the per-round answer.
     */
    holdout: { pool: [], covered: [], lastId: null, poolSha: null, picks: [] },
    rounds: [],
    /**
     * Plan nodes, one row per (round, id, attempt). A round is a bucket of
     * wall-clock, not an addressable unit of work: this is what lets a reader
     * attribute time to the node that spent it, and what makes a node that
     * never reported visible as `lost` instead of silently absent.
     */
    nodes: [],
    candidates: [],
    checkpoints: [],
    notes: [],
    /** Lesson records accumulate here (see src/knowledge/impact.js). */
    lessons: [],
    incumbent: null,
    seq: 0,
  }
}

const clone = (x) => JSON.parse(JSON.stringify(x))

/** Pure: fold the event log into a materialized state. */
export function reduce(events, id = null) {
  const s = emptyState(id)
  for (const ev of events) {
    s.seq = ev.seq
    s.updatedAt = ev.t
    apply(s, ev)
  }
  return s
}

function apply(s, ev) {
  const d = ev.data || {}
  switch (ev.type) {
    case 'campaign.created':
      s.id = d.id
      s.objective = d.objective || ''
      s.workspace = d.workspace || null
      s.createdAt = ev.t
      s.initiator = d.initiator || null
      if (d.budget) s.budget = { ...s.budget, ...d.budget }
      s.status = 'planning'
      break
    case 'campaign.status':
      s.status = d.status
      break
    case 'campaign.autopilot':
      // Hands-off promotion: the loop applies its own verified patches, optionally
      // behind a guard command that must still pass afterwards (else it rolls back).
      s.autopilot = {
        enabled: d.enabled === true,
        guard: typeof d.guard === 'string' && d.guard ? d.guard : null,
        at: ev.t,
      }
      break
    case 'objective.updated':
      s.objective = d.objective
      break
    case 'constraint.added':
      s.constraints.push({ text: d.text, by: ev.actor, at: ev.t, active: true })
      break
    case 'constraint.removed':
      for (const c of s.constraints) {
        if (c.text === d.text || c.id === d.id) c.active = false
      }
      break
    case 'budget.adjusted':
      s.budget = { ...s.budget, ...d }
      break
    case 'budget.spent':
      s.budget.spentUsd = round6(s.budget.spentUsd + (d.usd || 0))
      break
    case 'chain.proposed': {
      const v = { version: d.version, spec: d.spec, by: ev.actor, at: ev.t, status: 'candidate' }
      s.chain.versions = s.chain.versions.filter((x) => x.version !== d.version).concat(v)
      break
    }
    case 'chain.activated':
      s.chain.activeVersion = d.version
      for (const v of s.chain.versions) {
        if (v.version === d.version) v.status = 'active'
        else if (v.status === 'active') v.status = 'superseded'
      }
      break
    case 'evalset.registered':
      s.evalset.tasks = d.tasks
      s.evalset.holdout = d.holdout || []
      break
    case 'holdout.selected': {
      const h = s.holdout
      const round = Number.isFinite(Number(d.round)) ? Number(d.round) : null
      const id = d.id == null ? null : String(d.id)
      const poolSha = d.poolSha == null ? null : String(d.poolSha)
      if (Array.isArray(d.pool)) h.pool = d.pool.map(String)
      if (id) {
        h.lastId = id
        // What ran, not what was planned: the same partition twice is one entry.
        if (!h.covered.includes(id)) h.covered.push(id)
      }
      if (poolSha) h.poolSha = poolSha
      h.picks = h.picks.filter((p) => p.round !== round).concat({ round, id, poolSha })
      break
    }
    case 'round.started':
      s.rounds.push({ n: d.n, at: ev.t, attempts: [], status: 'running', score: null, taskId: d.taskId ?? null, chainVersion: d.chainVersion ?? null })
      s.budget.roundsUsed += 1
      break
    case 'round.finished': {
      const r = s.rounds.find((x) => x.n === d.n)
      // A missing flag (older ledgers) is not progress: plateau detection
      // treats "no evidence of promotion" as flat.
      if (r) {
        Object.assign(r, { status: d.status, score: d.score ?? r.score, at: r.at, endedAt: ev.t, promoted: d.promoted === true })
        // Triangle accounting travels with the round so a reader never has to
        // re-derive it from attempt timings that older ledgers do not carry.
        // `planMode`/`planTimedOut` travel too: `planMode: 'auto'` reads the
        // last two rounds' planTimedOut, so a projected state that dropped it
        // would make every round look like it had planned successfully.
        for (const key of ['durationMs', 'planMs', 'planTimedOut', 'planMode', 'holdout', 'holdoutMs', 'holdoutRuns', 'holdoutId', 'attemptCount', 'attemptMs', 'verifierRuns', 'verifierMs', 'tokens', 'costUsd', 'candidateMode', 'candidateModeSource', 'candidatesPlanned', 'skippedCandidates', 'abortedCandidates']) {
          if (d[key] !== undefined) r[key] = d[key]
        }
      }
      // A node still running when its round closes never reported. Marking it
      // `lost` is a fact about the log, not a verdict about the work: it must
      // never stay `running` forever and must never be folded into success.
      for (const node of s.nodes) {
        if (node.round === d.n && node.status === 'running') node.status = 'lost'
      }
      break
    }
    case 'node.started': {
      // The identity is written before the dispatch, so a crash between start
      // and finish leaves a name behind instead of only a missing round.
      const row = nodeRow(s.nodes, d)
      row.type = d.type ?? row.type ?? 'agent'
      row.role = d.role ?? row.role ?? null
      row.status = 'running'
      row.at = d.at ?? row.at ?? null
      if (d.base !== undefined) row.base = d.base
      break
    }
    case 'node.finished': {
      // A finished node without a start still folds: older ledgers and reused
      // plans only ever wrote this event, and their time must not vanish.
      const row = nodeRow(s.nodes, d)
      row.type = d.type ?? row.type ?? 'agent'
      row.role = d.role ?? row.role ?? null
      row.status = d.ok === false ? 'failed' : 'done'
      row.durationMs = Number.isFinite(Number(d.durationMs)) ? Number(d.durationMs) : null
      row.endedAt = d.at ?? ev.t ?? null
      if (d.reused === true) row.reused = true
      if (d.planBasis) row.planBasis = d.planBasis
      if (d.sessionId !== undefined) row.sessionId = d.sessionId
      break
    }
    case 'attempt.finished': {
      const r = s.rounds.find((x) => x.n === d.round)
      if (r) r.attempts.push(d)
      break
    }
    case 'attempt.abandoned': {
      const r = s.rounds.find((x) => x.n === d.round)
      if (r) {
        if (!Array.isArray(r.abandoned)) r.abandoned = []
        r.abandoned.push({ id: d.id, reason: d.reason ?? null, at: ev.t })
      }
      break
    }
    case 'candidate.proposed':
      s.candidates.push({ id: d.id, kind: d.kind, version: d.version, at: ev.t, status: 'proposed', score: null })
      break
    case 'gate.evaluated': {
      const c = s.candidates.find((x) => x.id === d.candidateId)
      if (c) Object.assign(c, { gate: d, status: d.promoted ? 'promoted' : 'rejected' })
      // Remember which attempt the gate chose: only that one can become reality,
      // and only once it actually landed (see autopilot.applied / checkpoint).
      const r = s.rounds.find((x) => x.n === d.round)
      if (r && d.promoted) r.promotedAttemptId = d.candidateId
      break
    }
    case 'autopilot.applied': {
      // The patch reached the workspace and the guard passed: this round is
      // real progress, and only rounds like this may mark a task as solved.
      const r = s.rounds.find((x) => x.n === d.round)
      if (r) r.landed = true
      if (!Array.isArray(s.autopilotLog)) s.autopilotLog = []
      s.autopilotLog.push({ round: d.round ?? null, patch: d.patch ?? null, at: ev.t })
      break
    }
    case 'round.unlanded': {
      // Recovery withdrew a landing it could not prove: the patch was said to be
      // applied but no commit exists, so the task must be retried. Writing a
      // new event (instead of editing history) keeps the log append-only.
      const r = s.rounds.find((x) => x.n === d.round)
      if (r) {
        r.landed = false
        r.unlanded = { reason: d.reason ?? null, at: ev.t }
      }
      break
    }
    case 'artifact.promoted':
      if (d.kind === 'chain') {
        // The chain and the attempt each keep their own incumbent; a chain
        // promotion must not erase the best score the workspace has reached.
        s.chain.score = d.score ?? null
        s.chain.promotedAt = ev.t
        s.chain.incumbentVersion = d.version
      } else if (d.kind === 'attempt') {
        s.incumbent = { round: d.round, score: d.score ?? null, patch: d.patch ?? null, branch: d.branch ?? null, at: ev.t }
      }
      break
    case 'checkpoint.raised':
      s.checkpoints.push({ id: d.id, kind: d.kind, at: ev.t, payload: d.payload, status: 'open' })
      break
    case 'checkpoint.answered': {
      const c = s.checkpoints.find((x) => x.id === d.id)
      if (c) Object.assign(c, { status: 'answered', answer: d.answer, by: ev.actor, answeredAt: ev.t })
      break
    }
    case 'checkpoint.held': {
      // A hold postpones without closing: status stays `open`, and the latest
      // deferral is folded onto the checkpoint so the queue can rank it as
      // postponed instead of as work waiting right now.
      const c = s.checkpoints.find((x) => x.id === (d.checkpoint ?? d.id))
      if (c && c.status === 'open') Object.assign(c, { held: { until: d.until ?? null, by: ev.actor ?? null, at: ev.t } })
      break
    }
    case 'note.added':
      s.notes.push({ text: d.text, by: ev.actor, at: ev.t })
      break
    case 'lesson.added': {
      const l = d.lesson || d
      if (!l || typeof l.id !== 'string') break
      const rec = {
        id: l.id,
        family: l.family ?? '*',
        taskIds: Array.isArray(l.taskIds) ? l.taskIds : [],
        tags: Array.isArray(l.tags) ? l.tags : [],
        kind: l.kind ?? 'fact',
        claim: l.claim ?? '',
        evidence: l.evidence ?? '',
        confidence: Number.isFinite(Number(l.confidence)) ? Number(l.confidence) : 0.5,
        status: l.status ?? 'active',
        createdRound: Number(l.createdRound) || 0,
        ttlRounds: Number.isFinite(Number(l.ttlRounds)) ? Number(l.ttlRounds) : 12,
        useCount: Number(l.useCount) || 0,
        gainSum: Number(l.gainSum) || 0,
        harmCount: Number(l.harmCount) || 0,
        lastUsedRound: l.lastUsedRound ?? null,
        at: ev.t,
      }
      s.lessons = s.lessons.filter((x) => x.id !== rec.id).concat(rec)
      break
    }
    case 'lesson.impact': {
      const l = s.lessons.find((x) => x.id === d.id)
      if (l) {
        l.useCount = (Number(l.useCount) || 0) + 1
        l.gainSum = round6((Number(l.gainSum) || 0) + (Number(d.delta) || 0))
        if (d.harm) l.harmCount = (Number(l.harmCount) || 0) + 1
        l.lastUsedRound = d.round ?? l.lastUsedRound ?? null
      }
      break
    }
    case 'lesson.quarantined': {
      const l = s.lessons.find((x) => x.id === d.id)
      if (l) {
        l.status = 'quarantined'
        l.quarantineReason = d.reason ?? null
        l.quarantinedAt = ev.t
      }
      break
    }
    case 'campaign.policy':
      // The campaign's own terms, as `policyFor` reads them: bare keys, merged
      // over whatever a promoted record already put here. A sibling campaign is
      // untouched because this only folds the event into its own ledger state.
      s.policy = { ...(s.policy || {}), ...(d.policy || {}) }
      break
    case 'policy.proposed':
      s.policy = {
        version: Number(d.version) || 1,
        policy: d.policy ?? {},
        evidence: d.evidence ?? null,
        status: 'proposed',
        proposedAt: ev.t,
      }
      break
    case 'policy.promoted':
      s.policy = {
        ...(s.policy || {}),
        version: Number(d.version) || Number(s.policy?.version) || 1,
        policy: d.policy ?? s.policy?.policy ?? {},
        status: 'promoted',
        promotedAt: ev.t,
        by: ev.actor ?? null,
      }
      break
    default:
      break
  }
}

export function round6(x) {
  return Math.round(x * 1e6) / 1e6
}

/**
 * Find or create the row for one node instance.
 *
 * An instance is `(round, id, attempt)`: a node may legitimately run more than
 * once in a round, and an id reused in a later round is a different instance.
 * Older records carry no `attempt`, so it defaults to the first one.
 */
function nodeRow(nodes, d) {
  const round = Number.isFinite(Number(d.round)) ? Number(d.round) : null
  const attempt = Number.isFinite(Number(d.attempt)) ? Number(d.attempt) : 1
  const id = d.id ?? d.nodeId ?? null
  let row = nodes.find((n) => n.id === id && n.round === round && (n.attempt ?? 1) === attempt)
  if (!row) {
    row = { id, type: 'agent', role: null, round, attempt, status: null, at: null, durationMs: null }
    nodes.push(row)
  }
  return row
}

export function snapshot(s) {
  return clone(s)
}
