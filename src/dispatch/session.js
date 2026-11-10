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
 * Model-side failures that a different model can plausibly survive: an exhausted
 * context window, a token budget, or a model that spent a slice of the attempt's
 * budget and answered nothing at all.
 *
 * A timeout used to sit on the other side of that line, because retrying it on
 * another model "only doubles the bill". That is true only while the retry has a
 * fresh budget to spend. The fallover below spends what is left of the attempt's
 * own deadline and never more, so a provider that stopped answering costs one
 * attempt's wall clock either way, and sometimes the second provider answers
 * inside it. A dead child and a crash stay where they are: those are not model
 * problems, and a second child only buys the same silence.
 */
const MODEL_LIMIT = /context[ _-]?(length|window)|too long|maximum context|max[ _-]?tokens|token (limit|budget|quota)|quota|rate limit|overloaded|capacity/i

/**
 * The least time a fallback model can be given and still be worth starting. Below
 * this the child would be cancelled before its first token in the normal case, so
 * the attempt reports its timeout instead of buying a second child that cannot
 * finish. Overridable per plugin (`session.minFalloverMs`) because the honest
 * value is a property of the provider's latency, not of the loop: 30 s is right
 * for a model that needs ~400 s of work, and far too long for a fast one.
 */
const DEFAULT_MIN_FALLOVER_MS = 30_000

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
 * Split one chain entry into the two fields the host actually takes.
 *
 * The host spawns a child with `agentOptions: {provider?, model?}` — two separate
 * fields. A chain entry is either a bare model name, which leaves the provider to
 * the host, or `provider/model`. The slash form is the only way to say "this
 * fallback lives on another provider", and it exists because a fallback that
 * stays on the same provider cannot escape a provider that is breaking mid-turn —
 * which is precisely the failure that cost loom-acc2 eight rounds.
 *
 * Only the FIRST segment is a provider: model ids may contain slashes themselves
 * (command-code's are `deepseek/deepseek-v4.1-flash`), so a ref with three parts
 * keeps the rest as the model.
 */
export function parseModelRef(ref) {
  if (typeof ref !== 'string' || !ref.trim()) return { provider: null, model: null }
  const text = ref.trim()
  const at = text.indexOf('/')
  if (at <= 0) {
    const bare = at === 0 ? text.slice(1) : text
    return { provider: null, model: bare || null }
  }
  const provider = text.slice(0, at)
  const model = text.slice(at + 1)
  if (!model) return { provider: null, model: null }
  return { provider, model }
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
    // One attempt, one wall clock. Handing every model in the chain a fresh
    // `timeoutMs` would make an attempt cost `chain.length * timeoutMs` and overrun
    // the deadline the round wrote on its lease — after which the round discards a
    // late but real answer as a timeout anyway (see round.js). Each model therefore
    // sees only what is left of the budget it was given.
    const startedAt = Date.now()
    const left = () => timeoutMs - (Date.now() - startedAt)
    // Held back from the first model so a timeout can still be answered by the next
    // one. Zero by default: on this project's own rounds a healthy attempt is
    // routinely longer than half the budget (p50 ~400 s of 600 s), so carving a
    // slice out of every attempt would cut real work to buy an insurance nobody
    // asked for. A campaign that runs on a provider it does not trust can set
    // `session.fallbackReserveMs` and get the fallover for free inside the same
    // wall clock.
    const reserve = Math.max(0, Number(this.config?.session?.fallbackReserveMs) || 0)
    const minFallover = Math.max(0, Number(this.config?.session?.minFalloverMs) || DEFAULT_MIN_FALLOVER_MS)
    // Never longer than the attempt's own budget: a reserve smaller than `minFallover`
    // cannot buy a usable slice, and stretching the first slice past `timeoutMs` would
    // break the one-attempt-one-clock rule this whole path exists to keep.
    const firstSlice =
      chain.length > 1 && reserve > 0
        ? Math.min(timeoutMs, Math.max(minFallover, timeoutMs - reserve))
        : timeoutMs
    // The retry budget is per attempt, not per dispatcher. It used to live on the
    // instance, so the first round of a campaign that hit a broken parent consumed
    // the only retry there would ever be: in loom-acc2 that turned a flaky minute
    // into eight consecutive rounds dying in 1-2 s with nothing to show. One retry
    // per run() still bounds the cost at two children.
    let infraRetried = false
    for (let i = 0; i < chain.length; i += 1) {
      const current = chain[i]
      const slice = i === 0 ? firstSlice : Math.max(1000, left())
      res = await this.#one(prompt, { cwd, timeoutMs: slice, label, model: current, onStart })
      // A child that dies silently is not a failed task, it is a broken parent:
      // after a host restart the cached agent can still be addressable while every
      // child it spawns errors immediately. Rebuild once and retry before charging
      // the round for an infrastructure bug.
      if (res?.infra && !infraRetried) {
        infraRetried = true
        this.log(`child died silently (${res.error}); rebuilding the parent and retrying once`)
        await this.rebuildParent()
        res = { ...(await this.#one(prompt, { cwd, timeoutMs: Math.max(1000, left()), label, model: current, onStart })), infraRetry: true }
      }
      tried.push(current ?? 'default')
      const kind = classifyResult(res)
      const last = i === chain.length - 1
      // An infrastructure death (the model layer broke mid-turn, so the child ended
      // in error with nothing to say) is the same problem from the loop's side as an
      // exhausted one: this model could not be used. A rebuilt parent does not fix a
      // broken provider, so fall over to the next model in the chain instead of
      // charging the round for a child that never got to work. A death *with* a
      // diagnosis stays where it is: the patch was already shown to be broken, and a
      // second provider would only double the bill for the same answer.
      //
      // A timeout belongs to the same class, with one condition: the model answered
      // nothing at all inside its slice. It is tried on the next model only while the
      // attempt still has a slice worth starting — below `minFallover` a child
      // would be cancelled before its first token, which is the "doubles the bill"
      // case the old rule was protecting against.
      const unusable = kind === 'context' || kind === 'tokens' || res?.infra === true || kind === 'timeout'
      const roomToFallOver = kind !== 'timeout' || left() >= minFallover
      if (kind === 'ok' || !unusable || last || !roomToFallOver) {
        // Only a budget/context exhaustion is reported as `exhausted` (one operator
        // checkpoint, see round.js). A silent provider death keeps its own kind and
        // its `infra` flag: the round is interrupted and retryable, not written off.
        const budget = kind === 'context' || kind === 'tokens'
        return {
          ...res,
          failureKind: kind === 'ok' ? 'ok' : last && budget ? 'exhausted' : kind,
          model: current,
          modelsTried: tried,
          modelSwitch: tried.length > 1 ? { from: tried[0], to: current } : null,
        }
      }
      this.log(
        `model ${current ?? 'default'} ${
          kind === 'timeout' ? `used its whole ${Math.round(slice)}ms slice without an answer` : `hit a limit (${kind})`
        }; trying ${chain[i + 1] ?? 'default'} with ${Math.max(0, Math.round(left()))}ms left`,
      )
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
    // `provider/model` is how a chain names a fallback that lives on another
    // provider; a bare name keeps the host default, exactly as before.
    const ref = parseModelRef(model)
    if (ref.provider) agentOptions.provider = ref.provider
    if (ref.model) agentOptions.model = ref.model
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
      return {
        sessionId: childId,
        text: '',
        structured: null,
        stopReason: 'aborted',
        timedOut: true,
        error: `attempt exceeded ${timeoutMs}ms`,
        elapsedMs: Date.now() - startedAt,
      }
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
    // The child usually *does* say why — it just says it in its own session log,
    // not on the result object. Adopting that message is the difference between
    // "parent or provider unavailable" (nothing an operator can act on) and
    // `Tool call "read": Unexpected non-whitespace character after JSON`, and it
    // is also what lets a context-length failure be classified as a model limit
    // so the fallback chain can fire.
    const recovered = silent ? this.#sessionDiagnosis(childId) : null
    const infra = silent
    return {
      sessionId: childId,
      text: textOf(outcome?.output),
      structured: outcome?.structured ?? null,
      stopReason,
      timedOut: false,
      error:
        diagnostic ??
        recovered ??
        (silent ? 'child session ended in error with no diagnostic (parent or provider unavailable)' : null),
      elapsedMs,
      infra,
      ...(recovered ? { diagnosisSource: 'session-log' } : {}),
    }
  }

  /**
   * The last error message the child recorded about itself. A child session that
   * has been told to stop, or that never started a turn, has nothing to say and
   * returns null — silence is reported as silence.
   */
  #sessionDiagnosis(childId) {
    try {
      const session = svc(this.ctx, 'sessions')?.get?.(childId)
      if (!session) return null
      const events = typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : null
      if (!Array.isArray(events)) return null
      for (let i = events.length - 1; i >= 0; i -= 1) {
        const event = events[i]
        const type = event?.type ?? event?.kind
        if (type !== 'turn/end') continue
        const message = event?.data?.reason?.error?.message ?? event?.reason?.error?.message
        if (typeof message === 'string' && message.trim()) return message.trim()
      }
      return null
    } catch (err) {
      this.log('could not read the child session diagnosis:', err?.message ?? err)
      return null
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
