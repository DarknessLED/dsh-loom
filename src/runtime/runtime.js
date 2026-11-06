import { existsSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { Ledger } from '../core/ledger.js'
import { reduce } from '../core/reduce.js'
import { campaignDir, ensureDir, nowId } from '../core/paths.js'
import { writeJsonAtomic } from '../core/atomic.js'
import { claimOwnership, heartbeat, holdsOwnership, ownerStatus } from '../core/lock.js'
import { runRound } from './round.js'
import { notifyCheckpoint } from './notify.js'
import { Watchdog } from './watchdog.js'
import { probeLean } from '../lean/probe.js'
import { reconcileLeases, sweepLeases } from './lease.js'
import { Dispatcher } from '../dispatch/session.js'
import { svc } from '../core/services.js'

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
        this.stalls.set(rec.attemptId, rec.reason)
        log(`attempt ${rec.attemptId} written off by watchdog (${rec.reason}, idle ${Math.round(rec.idleMs / 1000)}s)`)
      },
    })
  }

  /** Track a live attempt so the watchdog can write it off if it goes silent. */
  watchAttempt({ attemptId, sessionId, abort, deadline }) {
    this.watchdog.track({ attemptId, sessionId, abort, deadline })
  }

  unwatchAttempt(attemptId) {
    this.watchdog.untrack(attemptId)
  }

  /** Why (if at all) the watchdog wrote this attempt off. */
  stallReason(attemptId) {
    const reason = this.stalls.get(attemptId) ?? null
    this.stalls.delete(attemptId)
    return reason
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
        if (!Object.keys(next).length) throw new Error('budget requires usd and/or rounds')
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
    const ids = this.listCampaigns().slice(0, limit)
    const rows = []
    for (const id of ids) {
      let v
      try {
        v = this.get(id)
      } catch {
        continue
      }
      const s = v.state
      const open = s.checkpoints.filter((c) => c.status === 'open').length
      rows.push(
        `${s.id} [${s.status}] round ${s.rounds.length}/${s.budget.rounds} · $${s.budget.spentUsd.toFixed(2)}/$${s.budget.usd}` +
          `${s.incumbent?.score != null ? ` · best ${s.incumbent.score}` : ''}` +
          `${open ? ` · ${open} checkpoint(s) awaiting you` : ''} — ${String(s.objective).slice(0, 80)}`,
      )
    }
    if (!rows.length) return ''
    return ['Active RSI campaigns (managed by dsh-loom; the loop runs in child sessions while you are idle):', ...rows.map((r) => `- ${r}`)].join('\n')
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
      this.watchdog.check()
      const max = Math.max(1, Number(this.config.session?.maxConcurrent) || 1)
      for (const id of this.listCampaigns()) {
        if (this.inflight.size >= max) break
        const v = this.get(id)
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
    const report = { abandonedAttempts: [], interruptedRounds: [] }
    for (const id of this.listCampaigns()) {
      let view
      try {
        view = this.get(id)
      } catch (err) {
        this.log(`recover: cannot open ${id}:`, err?.message ?? err)
        continue
      }
      let stale = []
      try {
        stale = reconcileLeases(view.dir)
      } catch (err) {
        this.log(`recover: lease scan failed for ${id}:`, err?.message ?? err)
      }
      for (const lease of stale) {
        try {
          this.append(view, 'attempt.abandoned', { id: lease.attemptId, round: lease.round, reason: 'host-restart' }, 'system')
          report.abandonedAttempts.push(`${id}/${lease.attemptId}`)
        } catch (err) {
          this.log(`recover: cannot record abandoned attempt ${lease.attemptId}:`, err?.message ?? err)
        }
      }
      const running = view.state.rounds.filter((r) => r.status === 'running')
      for (const round of running) {
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
      try {
        sweepLeases(view.dir)
      } catch {
        /* best effort */
      }
    }
    if (report.abandonedAttempts.length || report.interruptedRounds.length) {
      this.log(
        `recover: ${report.abandonedAttempts.length} abandoned attempt(s), ${report.interruptedRounds.length} interrupted round(s)`,
      )
    }
    return report
  }

  tickCampaign(view) {
    this.flush(view)
    if (this.disposed || this.inflight.has(view.id)) return
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
