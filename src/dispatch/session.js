import { randomUUID } from 'node:crypto'

function textOf(output) {
  if (!Array.isArray(output)) return ''
  return output
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
}

/**
 * Owns model-backed child sessions. One attempt = one fresh child agent
 * (`spawn` provider: own session, own prompt, zero parent context).
 *
 * Strategy: `ctx.subagents.startActivation({delivery:'caller'})` hands us the
 * SubagentResult promise directly, so a round never has to poll event streams.
 */
export class Dispatcher {
  constructor({ ctx, config, log = () => {} }) {
    this.ctx = ctx
    this.config = config
    this.log = log
    this.parentSessionId = null
    this.owned = null
    this.cancels = new Map()
    this.disposed = false
  }

  /** Remember which session asked for the campaign, so attempts nest under it. */
  bindTo(sessionId) {
    if (sessionId) this.parentSessionId = String(sessionId)
  }

  async ensureParent() {
    if (this.owned) return this.owned.agent
    const sc = this.ctx.sessionController
    if (this.parentSessionId && sc?.resolveAgent) {
      try {
        const resolved = await sc.resolveAgent(this.parentSessionId)
        if (resolved?.agent) return resolved.agent
      } catch (err) {
        this.log('resolveAgent failed:', err?.message ?? err)
      }
    }
    const loop = this.ctx.agentLoop
    if (!loop?.createAgent) throw new Error('no sessionController.resolveAgent and no agentLoop.createAgent')
    const sessionId = randomUUID()
    const handle = await loop.createAgent(this.ctx, {
      sessionId,
      meta: { cwd: this.config?.home || process.cwd() },
    })
    this.owned = handle
    return handle.agent
  }

  /**
   * @returns {Promise<{sessionId:string|null, text:string, structured:unknown,
   *   stopReason:string, timedOut:boolean, error:string|null}>}
   */
  async run(prompt, { cwd, timeoutMs = 20 * 60_000, label = 'attempt', model = null, onStart = null } = {}) {
    if (this.disposed) throw new Error('dispatcher disposed')
    const subagents = this.ctx.subagents
    if (!subagents?.startActivation) throw new Error('subagents.startActivation is unavailable in this host')

    const parent = await this.ensureParent()
    const controller = new AbortController()
    const agentOptions = {}
    if (model) agentOptions.model = model
    const maxTokens = Number(this.config?.session?.maxTokens) || 0
    if (maxTokens > 0) agentOptions.maxTokens = maxTokens
    const agentPreset = this.config?.session?.preset || undefined

    let activation
    try {
      activation = await subagents.startActivation({
        provider: 'spawn',
        label,
        request: {
          cwd,
          prompt: [{ type: 'text', text: prompt }],
          parent,
          agentOptions: Object.keys(agentOptions).length ? agentOptions : undefined,
          agentPreset,
        },
        delivery: 'caller',
        signal: controller.signal,
      })
    } catch (err) {
      return { sessionId: null, text: '', structured: null, stopReason: 'error', timedOut: false, error: String(err?.message ?? err) }
    }

    const childId = activation.childId
    this.cancels.set(childId, () => {
      try {
        controller.abort()
      } catch {
        /* already aborted */
      }
      try {
        subagents.interrupt?.(childId, { kind: 'ancestor', agent: parent })
      } catch (err) {
        this.log('interrupt failed:', err?.message ?? err)
      }
    })

    // Supervisors need the session id and a way to stop it.
    if (onStart) {
      try {
        onStart({
          sessionId: childId,
          abort: () => this.cancels.get(childId)?.(),
          deadline: Date.now() + Math.max(1000, Number(timeoutMs) || 1200_000),
        })
      } catch (err) {
        this.log('onStart hook failed:', err?.message ?? err)
      }
    }

    let timer = null
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ __timeout: true }), Math.max(1000, Number(timeoutMs) || 1200_000))
      if (typeof timer.unref === 'function') timer.unref()
    })

    let outcome
    try {
      outcome = await Promise.race([activation.result, timeout])
    } catch (err) {
      outcome = { stopReason: 'error', output: [], diagnostic: String(err?.message ?? err) }
    } finally {
      if (timer) clearTimeout(timer)
    }

    const timedOut = Boolean(outcome && outcome.__timeout)
    if (timedOut) {
      this.cancels.get(childId)?.()
    }
    try {
      await activation.dispose?.()
    } catch (err) {
      this.log('activation dispose failed:', err?.message ?? err)
    }
    this.cancels.delete(childId)

    if (timedOut) {
      return { sessionId: childId, text: '', structured: null, stopReason: 'aborted', timedOut: true, error: `attempt exceeded ${timeoutMs}ms` }
    }
    return {
      sessionId: childId,
      text: textOf(outcome?.output),
      structured: outcome?.structured ?? null,
      stopReason: outcome?.stopReason ?? 'error',
      timedOut: false,
      error: outcome?.diagnostic ?? null,
    }
  }

  cancel(sessionId) {
    this.cancels.get(sessionId)?.()
  }

  async dispose() {
    this.disposed = true
    for (const cancel of this.cancels.values()) {
      try {
        cancel()
      } catch {
        /* best effort */
      }
    }
    this.cancels.clear()
    if (this.owned) {
      try {
        await this.owned.dispose()
      } catch (err) {
        this.log('owned agent dispose failed:', err?.message ?? err)
      }
      this.owned = null
    }
  }
}
