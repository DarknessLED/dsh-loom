import { randomUUID } from 'node:crypto'
import { svc } from '../core/services.js'

function textOf(output) {
  if (!Array.isArray(output)) return ''
  return output
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
}

/**
 * Model-side failures that a different model can plausibly survive. Everything
 * else — a dead child, a crash, a timeout — is not a model problem, and retrying
 * it on another model only doubles the bill.
 */
const MODEL_LIMIT = /context[ _-]?(length|window)|too long|maximum context|max[ _-]?tokens|token (limit|budget|quota)|quota|rate limit|overloaded|capacity/i

/** Why an attempt ended, in the vocabulary the round records. */
export function classifyResult(res) {
  if (!res) return 'died'
  if (res.timedOut === true) return 'timeout'
  if (res.stopReason === 'completed') return 'ok'
  if (res.stopReason === 'max-tokens') return 'tokens'
  const text = String(res.error ?? '')
  if (text && MODEL_LIMIT.test(text)) return /context|compaction/i.test(text) ? 'context' : 'tokens'
  return 'died'
}

/** The models an attempt may use, in order: explicit list, then config fallbacks. */
export function modelChain(models, model, config) {
  const explicit = Array.isArray(models) && models.length ? models : null
  if (explicit) return explicit.filter((m) => typeof m === 'string' && m.length > 0)
  const first = typeof model === 'string' && model ? model : config?.models?.worker
  const fallback = Array.isArray(config?.models?.fallback) ? config.models.fallback : []
  const chain = [first, ...fallback].filter((m) => typeof m === 'string' && m.length > 0)
  return chain.length ? chain : [null]
}

/**
 * Owns model-backed child sessions. One attempt = one fresh child agent
 * (`spawn` provider: own session, own prompt, zero parent context).
 *
 * Strategy: `ctx.subagents.startActivation({delivery:'caller'})` hands us the
 * SubagentResult promise directly, so a round never has to poll event streams.
 *
 * A child that dies on a *model limit* (context window, token budget, quota) is
 * retried on the next model in the chain; a child that dies any other way is
 * reported as-is. The caller always learns which models were spent and why.
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
    const sc = svc(this.ctx, 'sessionController')
    if (this.parentSessionId && sc?.resolveAgent) {
      try {
        const resolved = await sc.resolveAgent(this.parentSessionId)
        if (resolved?.agent) return resolved.agent
      } catch (err) {
        this.log('resolveAgent failed:', err?.message ?? err)
      }
    }
    const loop = svc(this.ctx, 'agentLoop')
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
   * Run one attempt, falling through the model chain on model-limit failures.
   *
   * @returns {Promise<{sessionId:string|null, text:string, structured:unknown,
   *   stopReason:string, timedOut:boolean, error:string|null,
   *   failureKind:'ok'|'timeout'|'context'|'tokens'|'died'|'exhausted',
   *   model:string|null, modelsTried:string[], modelSwitch:{from:string|null,to:string|null}|null}>}
   */
  async run(prompt, { cwd, timeoutMs = 20 * 60_000, label = 'attempt', model = null, models, onStart = null } = {}) {
    if (this.disposed) throw new Error('dispatcher disposed')
    const subagents = svc(this.ctx, 'subagents')
    if (!subagents?.startActivation) throw new Error('subagents.startActivation is unavailable in this host')

    const chain = modelChain(models, model, this.config)
    const tried = []
    let res = null
    // The retry budget is per attempt, not per dispatcher. It used to live on the
    // instance, so the first round of a campaign that hit a broken parent consumed
    // the only retry there would ever be: in loom-acc2 that turned a flaky minute
    // into eight consecutive rounds dying in 1-2 s with nothing to show. One retry
    // per run() still bounds the cost at two children.
    let infraRetried = false
    for (let i = 0; i < chain.length; i += 1) {
      const current = chain[i]
      res = await this.#one(prompt, { cwd, timeoutMs, label, model: current, onStart })
      // A child that dies silently is not a failed task, it is a broken parent:
      // after a host restart the cached agent can still be addressable while every
      // child it spawns errors immediately. Rebuild once and retry before charging
      // the round for an infrastructure bug.
      if (res?.infra && !infraRetried) {
        infraRetried = true
        this.log(`child died silently (${res.error}); rebuilding the parent and retrying once`)
        await this.rebuildParent()
        res = { ...(await this.#one(prompt, { cwd, timeoutMs, label, model: current, onStart })), infraRetry: true }
      }
      tried.push(current ?? 'default')
      const kind = classifyResult(res)
      const last = i === chain.length - 1
      if (kind === 'ok' || (kind !== 'context' && kind !== 'tokens') || last) {
        return {
          ...res,
          failureKind: kind === 'ok' ? 'ok' : last && (kind === 'context' || kind === 'tokens') ? 'exhausted' : kind,
          model: current,
          modelsTried: tried,
          modelSwitch: tried.length > 1 ? { from: tried[0], to: current } : null,
        }
      }
      this.log(`model ${current ?? 'default'} hit a limit (${kind}); trying ${chain[i + 1] ?? 'default'}`)
    }
    return {
      ...res,
      failureKind: 'exhausted',
      model: chain[chain.length - 1] ?? null,
      modelsTried: tried,
      modelSwitch: tried.length > 1 ? { from: tried[0], to: chain[chain.length - 1] } : null,
    }
  }

  /** Forgetting the parent forces the next dispatch to resolve or create a live one. */
  async rebuildParent() {
    const previous = this.owned
    this.owned = null
    this.parentSessionId = null
    if (previous) {
      try {
        await previous.dispose?.()
      } catch (err) {
        this.log('parent dispose failed:', err?.message ?? err)
      }
    }
  }

  /** One child session, one model, no retry. */
  async #one(prompt, { cwd, timeoutMs, label, model, onStart }) {
    const subagents = svc(this.ctx, 'subagents')
    const startedAt = Date.now()
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
    const elapsedMs = Date.now() - startedAt
    const stopReason = outcome?.stopReason ?? 'error'
    const diagnostic = outcome?.diagnostic ?? null
    // An error with nothing to say is not a verdict on the task, however long it
    // took: a turn that ended in error without a diagnostic is either a dead
    // parent (fast) or a model layer that broke mid-turn (slow - seen live as two
    // tool-call JSON objects glued together, and as a context-length 400). Say so
    // explicitly: a null diagnostic in the ledger is unreadable evidence.
    const silent = stopReason === 'error' && !diagnostic
    const infra = silent
    return {
      sessionId: childId,
      text: textOf(outcome?.output),
      structured: outcome?.structured ?? null,
      stopReason,
      timedOut: false,
      error: silent ? 'child session ended in error with no diagnostic (parent or provider unavailable)' : diagnostic,
      elapsedMs,
      infra,
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
