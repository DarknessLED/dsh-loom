import { existsSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { Ledger } from '../core/ledger.js'
import { reduce } from '../core/reduce.js'
import { campaignDir, ensureDir, nowId } from '../core/paths.js'
import { writeJsonAtomic } from '../core/atomic.js'
import { claimOwnership, heartbeat, holdsOwnership, ownerStatus } from '../core/lock.js'
import { runRound } from './round.js'
import { pickTask } from './selector.js'
import { flushDeferred, notifyCheckpoint } from './notify.js'
import { Watchdog } from './watchdog.js'
import { probeLean } from '../lean/probe.js'
import { sweepLeases } from './lease.js'
import { planRecovery, repairWorkspace } from './recovery.js'
import { readSwitch, writeSwitch } from './switch.js'
import { Dispatcher } from '../dispatch/session.js'
import { svc } from '../core/services.js'
import { validatePolicyOverride } from '../loop/policy.js'

const STATUSES = ['draft', 'planning', 'running', 'paused', 'converged', 'plateaued', 'done', 'stopped']

/**
 * Owns campaign storage and the materialized views. The scheduler/round engine
 * (M1) plugs into `tick()`.
 */
export class Runtime {
  constructor({ ctx, home, config, log = () => {}, lockFile = null }) {
    this.ctx = ctx
    this.home = home
    this.config = config
    this.log = log
    this.lockFile = lockFile
    this.instanceId = randomUUID().slice(0, 8)
    this.owner = lockFile === null
    this.cache = new Map()
    this.ticking = false
    this.inflight = new Set()
    this.dispatchers = new Map()
    this.stalls = new Map()
    this.disposed = false
    this.watchdog = new Watchdog({
      log,
      stallMs: config.session?.stallMs,
      seqOf: (sessionId) => {
        try {
          const session = svc(this.ctx, 'sessions')?.get?.(sessionId)
          if (!session) return null
          const seq = Number(session.seq)
          if (Number.isFinite(seq)) return seq
          const events = typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : null
          return Array.isArray(events) ? events.length : null
        } catch {
          return null
        }
      },
      onStall: (rec) => {
        // Keep the whole observation, not just the verdict: the round writes it
        // onto the attempt record so a later reader can tell a child that never
        // started from one that went quiet mid-work.
        this.stalls.set(rec.attemptId, rec)
        log(
          `attempt ${rec.attemptId} written off by watchdog (${rec.reason}, idle ${Math.round(rec.idleMs / 1000)}s, ` +
            `${rec.advanced ? `advanced to seq ${rec.lastSeq}` : 'never advanced'})`,
        )
      },
    })
  }

  /** Track a live attempt so the watchdog can write it off if it goes silent. */
  watchAttempt({ attemptId, sessionId, abort, deadline, campaign }) {
    this.watchdog.track({ attemptId, sessionId, abort, deadline, campaign })
  }

  /**
   * Stop the attempts a campaign currently has in flight. Used when a human
   * stops the campaign: leaving a child running after "stop" is the sort of
   * state that later looks like a phantom. The attempt still finishes through
   * its own path, so the ledger records what actually happened.
   */
  abortCampaign(campaignId) {
    return this.watchdog.abortCampaign(campaignId)
  }

  unwatchAttempt(attemptId) {
    this.watchdog.untrack(attemptId)
  }

  /** Why (if at all) the watchdog wrote this attempt off. */
  stallReason(attemptId) {
    const rec = this.stalls.get(attemptId) ?? null
    this.stalls.delete(attemptId)
    return rec?.reason ?? (typeof rec === 'string' ? rec : null)
  }

  /**
   * The watchdog's full observation for this attempt, if it wrote it off.
   *
   * `stallReason` answers "why did we stop it"; this answers "what did we see",
   * which is what a record has to carry to be useful after the process is gone.
   *
   * @returns {{reason: string, idleMs: number, lastSeq: number|null, advanced: boolean}|null}
   */
  stallEvidence(attemptId) {
    const rec = this.stalls.get(attemptId)
    if (!rec || typeof rec !== 'object') return null
    return {
      reason: rec.reason ?? null,
      idleMs: Math.max(0, Number(rec.idleMs) || 0),
      lastSeq: Number.isFinite(Number(rec.lastSeq)) ? Number(rec.lastSeq) : null,
      advanced: rec.advanced === true,
    }
  }

  /** Live attempts, for status output. Cheap: in-memory only. */
  liveAttempts(now = Date.now()) {
    return this.watchdog.list().map((e) => ({
      attemptId: e.attemptId,
      sessionId: e.sessionId,
      lastSeq: e.lastSeq,
      idleMs: now - e.lastAdvanceAt,
      deadlineInMs: e.deadline === null ? null : e.deadline - now,
    }))
  }

  listCampaigns() {
    const root = join(this.home, 'campaigns')
    if (!existsSync(root)) return []
    return readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  }

  campaignPath(id) {
    return campaignDir(this.home, id)
  }

  /** Load (or reload) one campaign from its event log. */
  open(id) {
    const dir = this.campaignPath(id)
    const file = join(dir, 'events.jsonl')
    if (!existsSync(file)) throw new Error(`campaign not found: ${id}`)
    const ledger = new Ledger(file)
    const state = reduce(ledger.all(), id)
    const view = { id, dir, ledger, state }
    this.cache.set(id, view)
    return view
  }

  get(id) {
    return this.cache.get(id) || this.open(id)
  }

  /** Persist the materialized view next to the log (rebuildable, never authoritative). */
  flush(view) {
    writeJsonAtomic(join(view.dir, 'views', 'state.json'), view.state)
  }

  /** Flush every open view; used when we are standing by and dispatch nothing. */
  flushAll() {
    for (const view of this.cache.values()) {
      try {
        this.flush(view)
      } catch (err) {
        this.log('flush failed:', err?.message ?? err)
      }
    }
  }

  create({ id, objective, workspace, budget, actor = 'human', initiator = null }) {
    const cid = id || `c-${nowId()}`
    const dir = this.campaignPath(cid)
    if (existsSync(join(dir, 'events.jsonl'))) throw new Error(`campaign exists: ${cid}`)
    ensureDir(dir)
    const ledger = new Ledger(join(dir, 'events.jsonl'))
    ledger.append(
      'campaign.created',
      { id: cid, objective, workspace: workspace || null, budget: budget || null, initiator },
      actor,
    )
    const view = this.open(cid)
    this.flush(view)
    return view
  }

  append(view, type, data, actor = 'system') {
    view.ledger.append(type, data, actor)
    const state = reduce(view.ledger.all(), view.id)
    view.state = state
    this.flush(view)
    return state
  }

  /**
   * Record this campaign's own policy override.
   *
   * Validation happens before the append: a rejected override must leave the
   * log byte-for-byte unchanged, otherwise a typo would look like an
   * experiment that ran. Exactly one `campaign.policy` event goes into *that*
   * campaign's log — a policy is the campaign's term, not a global switch — and
   * the accepted object is returned so the operator sees what was recorded.
   */
  setPolicy(id, policy, actor = 'human') {
    const v = this.get(id)
    const accepted = validatePolicyOverride(policy)
    this.append(v, 'campaign.policy', { policy: accepted }, actor)
    return { id: v.id, policy: accepted }
  }

  status(id) {
    const v = this.get(id)
    const s = v.state
    return {
      id: s.id,
      status: s.status,
      objective: s.objective,
      workspace: s.workspace,
      rounds: s.rounds.length,
      budget: s.budget,
      chainVersion: s.chain.activeVersion,
      incumbent: s.incumbent,
      lastRound: s.rounds.length ? s.rounds[s.rounds.length - 1] : null,
      openCheckpoints: s.checkpoints.filter((c) => c.status === 'open'),
      candidates: s.candidates.slice(-5),
      updatedAt: s.updatedAt,
    }
  }

  control(id, action, payload = {}, actor = 'human') {
    const v = this.get(id)
    const { state } = v
    switch (action) {
      case 'pause':
        if (!['running', 'planning'].includes(state.status)) throw new Error(`cannot pause from ${state.status}`)
        return this.append(v, 'campaign.status', { status: 'paused' }, actor)
      case 'resume':
        if (state.status !== 'paused') throw new Error(`cannot resume from ${state.status}`)
        return this.append(v, 'campaign.status', { status: 'running' }, actor)
      case 'stop':
        return this.append(v, 'campaign.status', { status: 'stopped', reason: payload.reason || null }, actor)
      case 'budget': {
        const next = {}
        if (payload.usd != null) next.usd = Number(payload.usd)
        if (payload.rounds != null) next.rounds = Number(payload.rounds)
        // Tokens are the cap the provider actually meters, so it must be
        // settable through the same door as dollars or it is not a cap.
        if (payload.tokens != null) next.tokens = Number(payload.tokens)
        if (!Object.keys(next).length) throw new Error('budget requires usd, tokens and/or rounds')
        for (const [k, n] of Object.entries(next)) {
          if (!Number.isFinite(n) || n < 0) throw new Error(`invalid budget.${k}`)
        }
        return this.append(v, 'budget.adjusted', next, actor)
      }
      case 'constraint':
        if (!payload.text) throw new Error('constraint requires text')
        return this.append(v, 'constraint.added', { text: payload.text }, actor)
      case 'note':
        if (!payload.text) throw new Error('note requires text')
        return this.append(v, 'note.added', { text: payload.text }, actor)
      case 'policy':
        return this.setPolicy(id, payload.policy, actor)
      case 'autopilot':
        if (typeof payload.enabled !== 'boolean') throw new Error('autopilot requires enabled: boolean')
        return this.append(
          v,
          'campaign.autopilot',
          { enabled: payload.enabled, guard: payload.guard == null ? null : String(payload.guard) },
          actor,
        )
      default:
        throw new Error(`unknown action: ${action}`)
    }
  }

  /** Compact status block for the system prompt (cheap; no model calls). */
  /** Lazy, memoized: the toolchain either exists or it does not, and asking
   *  costs two process spawns we do not want on every round. */
  leanProbe() {
    if (!this._leanProbe) {
      try {
        this._leanProbe = probeLean()
      } catch (err) {
        this._leanProbe = { available: false, lean: null, lake: null, versions: {}, install: null, error: String(err?.message ?? err) }
      }
    }
    return this._leanProbe
  }

  briefForPrompt(limit = 3) {
    // A campaign the human has to act on must never fall off the end of this
    // list, so rank by "needs attention" first and only then by recency.
    const all = []
    for (const id of this.listCampaigns()) {
      let v
      try {
        v = this.get(id)
      } catch {
        continue
      }
      const s = v.state
      const open = s.checkpoints.filter((c) => c.status === 'open').length
      const rank = open > 0 ? 0 : s.status === 'running' ? 1 : 2
      all.push({ s, open, rank, at: Number.isFinite(s.updatedAt) ? s.updatedAt : 0 })
    }
    if (!all.length) return ''
    all.sort((a, b) => a.rank - b.rank || b.at - a.at)
    const shown = all.slice(0, Math.max(1, limit))
    const rows = shown.map(
      ({ s, open }) =>
        `${s.id} [${s.status}] round ${s.rounds.length}/${s.budget.rounds} · $${s.budget.spentUsd.toFixed(2)}/$${s.budget.usd}` +
        `${s.incumbent?.score != null ? ` · best ${s.incumbent.score}` : ''}` +
        `${open ? ` · ${open} checkpoint(s) awaiting you` : ''} — ${String(s.objective).slice(0, 80)}`,
    )
    const hidden = all.length - shown.length
    if (hidden > 0) rows.push(`(+${hidden} more campaign(s) — see rsi_dashboard)`)
    const sw = this.switchState()
    const head = sw.enabled
      ? 'Active RSI campaigns (managed by dsh-loom; the loop runs in child sessions while you are idle):'
      : `RSI loop is OFF${sw.at ? ` (switched ${new Date(sw.at).toISOString().slice(0, 16).replace('T', ' ')} by ${sw.by})` : ''} — nothing is dispatched until rsi_control {action:"enable"}; campaign history is untouched.`
    return [head, ...rows.map((r) => `- ${r}`)].join('\n')
  }

  /**
   * Who is driving the loop. A second window keeps its tools but must not
   * dispatch rounds into the same campaign directories.
   */
  ownership() {
    if (!this.lockFile) return { owner: null, mine: true, alive: true, fresh: true }
    try {
      return ownerStatus(this.lockFile)
    } catch {
      return { owner: null, mine: this.owner, alive: false, fresh: false }
    }
  }

  /**
   * The master switch. It is deliberately *not* campaign state: turning the loop
   * off must leave every ledger byte-for-byte intact, so no seq moves and nothing
   * has to be re-read or re-summarised when it comes back on.
   */
  switchState() {
    return readSwitch(this.home, this.config.rsi?.enabled !== false)
  }

  enabled() {
    return this.switchState().enabled
  }

  setEnabled(enabled, { by = 'human', reason = null } = {}) {
    const record = writeSwitch(this.home, { enabled: enabled !== false, by, reason })
    this.log(`RSI loop ${record.enabled ? 'enabled' : 'disabled'} by ${record.by}${record.reason ? ` (${record.reason})` : ''}`)
    return record
  }

  /**
   * Take the loop over on demand. Only a dead or stale owner is taken over:
   * a live window with a fresh heartbeat keeps driving, so two windows do not
   * fight over the same campaign directories.
   */
  ensureOwner() {
    if (!this.lockFile) {
      this.owner = true
      return true
    }
    try {
      if (holdsOwnership(this.lockFile)) {
        this.owner = true
        heartbeat(this.lockFile)
        return true
      }
      const state = ownerStatus(this.lockFile)
      if (state.owner && state.alive && state.fresh) return false
      const claim = claimOwnership(this.home, { instance: this.instanceId })
      this.owner = true
      this.log(`loop taken over from pid ${claim.previous?.pid ?? 'none'}`)
      return true
    } catch (err) {
      this.log('cannot take ownership:', err?.message ?? err)
      return false
    }
  }

  /** Called by the plugin ticker. Drives at most `maxConcurrent` rounds overall. */
  tick() {
    if (this.ticking || this.disposed) return
    this.ticking = true
    try {
      // A stale or superseded claim means another window drives now: keep the
      // state files fresh, but dispatch nothing.
      if (this.lockFile) {
        if (holdsOwnership(this.lockFile)) {
          this.owner = true
          heartbeat(this.lockFile)
        } else {
          if (this.owner) this.log('another instance took the loop over; standing by')
          this.owner = false
          this.flushAll()
          return
        }
      }
      // The switch stops dispatch, not the plugin: views stay fresh and every
      // tool keeps working, but no campaign event is written while it is off.
      if (!this.enabled()) {
        this.flushAll()
        return
      }
      this.watchdog.check()
      const max = Math.max(1, Number(this.config.session?.maxConcurrent) || 1)
      for (const id of this.listCampaigns()) {
        const v = this.get(id)
        // Held checkpoints leave on the same clock as rounds, even while every
        // dispatch slot is busy or the campaign is paused.
        this.flushHeld(v)
        if (this.inflight.size >= max) continue
        if (v.state.status !== 'running') continue
        this.tickCampaign(v)
      }
    } finally {
      this.ticking = false
    }
  }

  /**
   * Boot-time reconciliation: a lease still marked `running` belongs to a host
   * that no longer exists, and any round it was driving will never finish.
   * Write both down as abandoned so the campaign does not stall forever.
   */
  recover() {
    const report = { abandonedAttempts: [], interruptedRounds: [], unlanded: [], workspaces: [] }
    for (const id of this.listCampaigns()) {
      let view
      try {
        view = this.get(id)
      } catch (err) {
        this.log(`recover: cannot open ${id}:`, err?.message ?? err)
        continue
      }
      let plan
      try {
        plan = planRecovery({ dir: view.dir, events: view.ledger.all(), state: view.state })
      } catch (err) {
        this.log(`recover: plan failed for ${id}:`, err?.message ?? err)
        continue
      }
      for (const lease of plan.staleLeases) {
        try {
          this.append(view, 'attempt.abandoned', { id: lease.attemptId, round: lease.round, reason: 'host-restart' }, 'system')
          report.abandonedAttempts.push(`${id}/${lease.attemptId}`)
        } catch (err) {
          this.log(`recover: cannot record abandoned attempt ${lease.attemptId}:`, err?.message ?? err)
        }
      }
      for (const round of plan.runningRounds) {
        try {
          this.append(
            view,
            'round.finished',
            { n: round.n, status: 'interrupted', score: round.score ?? null, reason: 'host-restart', promoted: false },
            'system',
          )
          report.interruptedRounds.push(`${id}/r${round.n}`)
        } catch (err) {
          this.log(`recover: cannot close round ${round.n}:`, err?.message ?? err)
        }
      }
      // A landing without a commit is a promise the ledger cannot keep: withdraw
      // it so the task is retried instead of looking solved forever.
      for (const entry of plan.unproven) {
        try {
          this.append(view, 'round.unlanded', { round: entry.round, reason: entry.reason }, 'system')
          report.unlanded.push(`${id}/r${entry.round}`)
        } catch (err) {
          this.log(`recover: cannot withdraw landing for round ${entry.round}:`, err?.message ?? err)
        }
      }
      // The tree may still hold the half-applied patch. Repair runs off the
      // event loop's critical path: tools must be usable the moment we boot.
      if (plan.unproven.length && view.state.workspace) {
        repairWorkspace({
          workspace: view.state.workspace,
          patches: plan.unproven.map((u) => u.patch).filter(Boolean),
          rounds: plan.unproven.map((u) => u.round),
          append: (type, data) => this.append(view, type, data, 'system'),
          log: this.log,
        })
          .then((action) => {
            if (action) report.workspaces.push(`${id}:${action}`)
          })
          .catch((err) => this.log(`recover: repair failed for ${id}:`, err?.message ?? err))
      }
      try {
        sweepLeases(view.dir)
      } catch {
        /* best effort */
      }
    }
    if (report.abandonedAttempts.length || report.interruptedRounds.length || report.unlanded.length) {
      this.log(
        `recover: ${report.abandonedAttempts.length} abandoned attempt(s), ${report.interruptedRounds.length} interrupted round(s), ${report.unlanded.length} withdrawn landing(s)`,
      )
    }
    return report
  }

  /** Deliver checkpoints held for quiet hours; repeatable and never throws. */
  flushHeld(view) {
    Promise.resolve(flushDeferred(this.ctx, { view, config: this.config, now: Date.now(), log: this.log })).catch((err) =>
      this.log(`deferred flush for ${view.id} failed:`, err?.message ?? err),
    )
  }

  /** True when the visible task pool is non-empty and every task is solved. */
  allTasksSolved(state) {
    const evalset = state?.evalset || {}
    const holdout = evalset.holdout || []
    const tasks = (evalset.tasks || []).filter((t) => t && !holdout.includes(t.id))
    if (!tasks.length) return false
    const rounds = state.rounds || []
    const picked = pickTask(tasks, rounds, { round: rounds.length + 1 })
    return picked.task === null && picked.allSolved === true
  }

  tickCampaign(view) {
    this.flush(view)
    if (this.disposed || this.inflight.has(view.id)) return
    // The campaign loop stops when every visible task already sits at 1.0.
    // This is the scheduler's decision: runRound itself runs whatever round it
    // is handed, so a direct caller (another scheduler, a test) is not refused.
    if (this.allTasksSolved(view.state)) {
      this.append(view, 'campaign.status', { status: 'done', reason: 'all-tasks-solved' }, 'system')
      return
    }
    this.inflight.add(view.id)
    const dispatcher = this.dispatcherFor(view)
    const notify = this.config.checkpoint?.notify === false
      ? null
      : (kind, payload) => notifyCheckpoint(this.ctx, { view, kind, payload, config: this.config, log: this.log })
    const done = runRound({ runtime: this, view, config: this.config, dispatcher, log: this.log, notify })
    done
      .catch((err) => this.log(`round for ${view.id} failed:`, err?.stack ?? err))
      .finally(() => this.inflight.delete(view.id))
  }

  /**
   * Run exactly one round, right now. Deliberately independent of the master
   * switch: the switch governs the *automatic* loop, while an operator asking
   * for one round is an explicit act — and the cheapest way to keep using child
   * sessions while the loop itself is off.
   */
  async runOnce(id) {
    const view = this.get(id)
    if (this.inflight.has(view.id)) throw new Error(`campaign ${view.id} already has a round in flight`)
    if (this.allTasksSolved(view.state)) {
      return { id: view.id, status: 'done', reason: 'all-tasks-solved', round: null }
    }
    const before = (view.state.rounds || []).length
    this.inflight.add(view.id)
    try {
      const dispatcher = this.dispatcherFor(view)
      const notify = this.config.checkpoint?.notify === false
        ? null
        : (kind, payload) => notifyCheckpoint(this.ctx, { view, kind, payload, config: this.config, log: this.log })
      const out = await runRound({ runtime: this, view, config: this.config, dispatcher, log: this.log, notify })
      const rounds = view.state.rounds || []
      const last = rounds[rounds.length - 1] || null
      return {
        id: view.id,
        status: out?.status ?? last?.status ?? 'unknown',
        round: out?.round ?? last?.n ?? null,
        score: last?.score ?? null,
        promoted: last?.promoted === true,
        newRounds: rounds.length - before,
      }
    } finally {
      this.inflight.delete(view.id)
    }
  }

  dispatcherFor(view) {
    const key = view.id
    let d = this.dispatchers.get(key)
    if (!d) {
      d = new Dispatcher({ ctx: this.ctx, config: { ...this.config, home: this.home }, log: this.log })
      if (view.state.initiator) d.bindTo(view.state.initiator)
      this.dispatchers.set(key, d)
    }
    return d
  }

  dispose() {
    this.disposed = true
    this.watchdog.clear()
    this.stalls.clear()
    this.cache.clear()
    for (const d of this.dispatchers.values()) {
      Promise.resolve(d.dispose()).catch(() => {})
    }
    this.dispatchers.clear()
  }
}

export { STATUSES }
