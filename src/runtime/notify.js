import { svc } from '../core/services.js'
import { deferUntil } from './deferred.js'

// Wake the human-facing session only when something needs a decision.
//
// The main agent is idle by design: rounds run inside child sessions. This
// module turns a checkpoint into one queued prompt on the initiator session,
// which starts exactly one turn for the human to see. Delivery is fire-and-
// forget (sessionController.prompt resolves on admission, not completion).
//
// A checkpoint raised inside the configured quiet hours is neither delivered
// nor dropped: it is written to the campaign log as `checkpoint.deferred`, and
// `flushDeferred` (driven from the runtime tick) delivers it once the window
// closes, recording `checkpoint.notified` so it can never be sent twice.

const KIND_LABEL = {
  gate: 'a passing patch is waiting for review',
  budget: 'the campaign hit its spending cap',
  anomaly: 'the loop hit something it cannot fix alone',
  setup: 'the campaign is missing something it needs',
  plateau: 'the loop stopped making progress',
}

function render(view, kind, payload) {
  const s = view.state
  const head = KIND_LABEL[kind] || kind
  const lines = [
    `🛠 RSI checkpoint [${payload?.id ?? payload?.checkpoint ?? '?'}] — ${head}`,
    '',
    `campaign: ${s.id} · ${s.status} · round ${s.rounds.length}/${s.budget.rounds} · spend $${s.budget.spentUsd.toFixed(3)}/$${s.budget.usd}`,
  ]
  if (payload?.message) lines.push('', payload.message)
  if (payload?.patch) lines.push('', `patch: ${payload.patch}`)
  if (payload?.attempt) lines.push(`attempt: ${payload.attempt} · score ${payload.score ?? '?'}`)
  if (payload?.detail) lines.push('', '```', String(payload.detail).slice(0, 1200), '```')
  lines.push('', kind === 'gate' ? 'Reply rsi_decide with apply | reject | hold.' : 'Use rsi_status / rsi_report / rsi_control to act.')
  return lines.join('\n')
}

/** Stable id for one notification; named payload ids win so retries stay idempotent. */
function notificationId(view, payload) {
  const named = payload?.id ?? payload?.checkpoint
  if (named != null && String(named) !== '') return `loom-cp-${named}`
  const seq = view.ledger && Number.isFinite(view.ledger.seq) ? view.ledger.seq + 1 : Date.now().toString(36)
  return `loom-cp-${seq}-${Date.now().toString(36)}`
}

/** Queue one rendered checkpoint on the campaign's initiator session. */
async function deliver(ctx, { view, sessionId, requestId, kind, payload, log }) {
  if (!sessionId) return { delivered: false, reason: 'no-initiator' }
  const sessionController = svc(ctx, 'sessionController')
  const prompt = sessionController?.prompt
  if (typeof prompt !== 'function') return { delivered: false, reason: 'no-session-controller' }
  try {
    await prompt.call(sessionController, {
      requestId,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: render(view, kind, payload) }],
    })
    log(`checkpoint ${payload?.id ?? payload?.checkpoint ?? requestId} queued on session ${sessionId}`)
    return { delivered: true }
  } catch (err) {
    // Never break the loop because the UI could not be woken.
    log('checkpoint delivery failed:', err?.message ?? err)
    return { delivered: false, error: String(err?.message ?? err) }
  }
}

/** Send one checkpoint to the session that started the campaign. */
export async function notifyCheckpoint(ctx, { view, kind, payload, config, now = Date.now(), log = () => {} }) {
  const quietHours = config?.checkpoint?.quietHours
  const deferredUntil = quietHours ? deferUntil(quietHours, now) : null
  if (deferredUntil !== null) {
    // Human attention is the scarce resource: hold it for the window instead of
    // waking them, and remember it durably so a restart cannot lose it.
    const id = notificationId(view, payload)
    const rec = {
      id,
      checkpointId: payload?.id ?? payload?.checkpoint ?? null,
      kind,
      payload: payload ?? {},
      sessionId: view.state.initiator ?? null,
      deferredUntil,
      at: now,
    }
    if (view.ledger && typeof view.ledger.append === 'function') {
      view.ledger.append('checkpoint.deferred', rec, 'system')
    }
    log(`checkpoint ${rec.checkpointId ?? id} held: quiet hours until ${new Date(deferredUntil).toISOString()}`)
    return { delivered: false, reason: 'quiet-hours', deferredUntil }
  }
  return deliver(ctx, {
    view,
    sessionId: view.state.initiator,
    requestId: notificationId(view, payload),
    kind,
    payload,
    log,
  })
}

/**
 * Deliver every held checkpoint whose quiet window has passed.
 *
 * The campaign log is the queue: `checkpoint.deferred` records what to send and
 * `checkpoint.notified` records what already went out, so calling this on every
 * tick is safe and each checkpoint leaves exactly once. Failed deliveries stay
 * held and are retried on a later tick.
 *
 * @returns {Promise<{ delivered: Array<{ id: string, checkpointId: string | null }> }>}
 */
export async function flushDeferred(ctx, { view, config, now = Date.now(), log = () => {} }) {
  const delivered = []
  const events = view.ledger && typeof view.ledger.all === 'function' ? view.ledger.all() : []
  const held = new Map()
  const notified = new Set()
  for (const ev of events) {
    if (ev?.type === 'checkpoint.deferred' && ev.data?.id) held.set(ev.data.id, ev.data)
    else if (ev?.type === 'checkpoint.notified' && ev.data?.id) notified.add(ev.data.id)
  }
  for (const [id, rec] of held) {
    if (notified.has(id)) continue
    if (!(typeof rec.deferredUntil === 'number' && rec.deferredUntil <= now)) continue
    const result = await deliver(ctx, {
      view,
      sessionId: rec.sessionId ?? view.state.initiator,
      requestId: id,
      kind: rec.kind,
      payload: rec.payload,
      log,
    })
    if (!result.delivered) continue
    if (view.ledger && typeof view.ledger.append === 'function') {
      view.ledger.append('checkpoint.notified', { id, checkpointId: rec.checkpointId ?? null, at: now }, 'system')
    }
    notified.add(id)
    delivered.push({ id, checkpointId: rec.checkpointId ?? null })
  }
  return { delivered }
}
