// Watchdog: decides whether a running attempt is still alive, without ever
// trusting a process id. Liveness is measured on the child session's event
// watermark (`seq`): a healthy agent appends events every step, a dead or
// wedged one stops appending. Two ways out: the lease deadline, or `stallMs`
// with no new events.

const DEFAULTS = {
  stallMs: 5 * 60_000,
  graceMs: 60_000,
  maxChecksPerTick: 64,
}

export class Watchdog {
  /**
   * @param {object} opts
   * @param {(sessionId: string) => number | null} opts.seqOf  current event watermark of a session
   * @param {(record: {attemptId: string, reason: string, idleMs: number, lastSeq: number|null}) => void} [opts.onStall]
   */
  constructor({ seqOf, onStall = null, log = () => {}, stallMs, graceMs } = {}) {
    if (typeof seqOf !== 'function') throw new TypeError('Watchdog requires seqOf')
    this.seqOf = seqOf
    this.onStall = onStall
    this.log = log
    this.stallMs = Number(stallMs) > 0 ? Number(stallMs) : DEFAULTS.stallMs
    this.graceMs = Number(graceMs) >= 0 ? Number(graceMs) : DEFAULTS.graceMs
    this.tracked = new Map()
  }

  track({ attemptId, sessionId, abort = null, deadline = null, campaign = null }) {
    if (!attemptId) throw new TypeError('track requires attemptId')
    const now = Date.now()
    this.tracked.set(String(attemptId), {
      attemptId: String(attemptId),
      sessionId: sessionId ? String(sessionId) : null,
      campaign: campaign ? String(campaign) : null,
      abort: typeof abort === 'function' ? abort : null,
      deadline: Number(deadline) > 0 ? Number(deadline) : null,
      startedAt: now,
      lastSeq: null,
      lastAdvanceAt: now,
      checks: 0,
    })
  }

  /** Called when an attempt finishes normally, so it is not mistaken for a stall. */
  untrack(attemptId) {
    this.tracked.delete(String(attemptId))
  }

  /**
   * Ask one attempt to stop early (a human pressed stop, or the campaign was
   * closed). The abort is best-effort by contract: the attempt still finishes
   * through its own path and records what happened, so this never fabricates a
   * result. Returns true only when a tracked attempt was actually asked.
   */
  abort(attemptId) {
    const entry = this.tracked.get(String(attemptId))
    if (!entry) return false
    if (entry.aborted) return false
    entry.aborted = true
    try {
      entry.abort?.()
    } catch (err) {
      this.log(`watchdog: abort of ${attemptId} threw: ${err?.message ?? err}`)
    }
    entry.abortRequestedAt = Date.now()
    return true
  }

  /** Abort every tracked attempt belonging to one campaign; returns how many. */
  abortCampaign(campaignId) {
    if (!campaignId) return 0
    let n = 0
    for (const entry of [...this.tracked.values()]) {
      if (entry.campaign !== String(campaignId)) continue
      if (this.abort(entry.attemptId)) n += 1
    }
    return n
  }

  size() {
    return this.tracked.size
  }

  list() {
    return [...this.tracked.values()].map((e) => ({ ...e, abort: undefined }))
  }

  /**
   * One pass over every tracked attempt. Returns the attempts written off.
   * Never throws: a watchdog that throws would take the host down.
   */
  check(now = Date.now()) {
    const writtenOff = []
    let budget = DEFAULTS.maxChecksPerTick
    for (const entry of this.tracked.values()) {
      if (budget-- <= 0) break
      try {
        const stalled = this.checkOne(entry, now)
        if (stalled) {
          this.tracked.delete(entry.attemptId)
          writtenOff.push(stalled)
        }
      } catch (err) {
        this.log('watchdog check failed:', err?.message ?? err)
      }
    }
    for (const rec of writtenOff) {
      try {
        this.onStall?.(rec)
      } catch (err) {
        this.log('watchdog onStall failed:', err?.message ?? err)
      }
    }
    return writtenOff
  }

  checkOne(entry, now) {
    const seq = this.seqOf(entry.sessionId)
    if (Number.isFinite(seq)) {
      if (entry.lastSeq === null || seq > entry.lastSeq) {
        entry.lastSeq = seq
        entry.lastAdvanceAt = now
      }
    }

    const idleMs = now - entry.lastAdvanceAt
    const overDeadline = entry.deadline !== null && now > entry.deadline
    // Before the child session shows up we allow a grace window, otherwise
    // every spawn looks dead for the first seconds.
    const inGrace = entry.lastSeq === null && now - entry.startedAt < this.graceMs
    const stalled = !inGrace && idleMs > this.stallMs

    if (!overDeadline && !stalled) return null

    const reason = overDeadline ? 'deadline' : 'stalled'
    try {
      entry.abort?.()
    } catch (err) {
      this.log('watchdog abort failed:', err?.message ?? err)
    }
    // `advanced` is the fact every later decision needs: a child that never
    // reported a step is a start-up failure, while a child that went quiet after
    // forty steps is a stall mid-work. Both land here as "written off", and the
    // record has to be able to tell them apart without replaying the session.
    return {
      attemptId: entry.attemptId,
      reason,
      idleMs,
      lastSeq: entry.lastSeq,
      advanced: entry.lastSeq !== null,
      sessionId: entry.sessionId,
    }
  }

  clear() {
    this.tracked.clear()
  }
}
