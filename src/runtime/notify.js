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
//
// Attention is batched: when `checkpoint.batch` names a window (or is simply
// `true`), a delivery opens a digest window (`checkpoint.window`). Checkpoints
// raised inside it are recorded as `checkpoint.batched` and stay quiet. The
// first checkpoint after the window closes wakes the human once with a digest
// of everything still open, so three gates raised in five minutes cost one
// turn, not three.

const KIND_LABEL = {
  gate: 'a passing patch is waiting for review',
  budget: 'the campaign hit its spending cap',
  anomaly: 'the loop hit something it cannot fix alone',
  setup: 'the campaign is missing something it needs',
  plateau: 'the loop stopped making progress',
}

/** Window used when `checkpoint.batch` is the bare `true` from the defaults. */
const DEFAULT_BATCH_WINDOW_MS = 5 * 60_000

function budgetLine(s) {
  const used = s?.rounds?.length ?? 0
  const rounds = s?.budget?.rounds ?? '?'
  const spent = Number.isFinite(Number(s?.budget?.spentUsd)) ? Number(s.budget.spentUsd).toFixed(3) : '?'
  const cap = s?.budget?.usd ?? '?'
  return `campaign: ${s.id} · ${s.status} · round ${used}/${rounds} · spend $${spent}/$${cap}`
}

/**
 * Human-attention budget: how long to hold new checkpoints after one delivery.
 * `false`/missing disables batching; `true` uses the default window; an object
 * must carry a positive `windowMs`.
 */
function batchWindowMs(config) {
  const b = config?.checkpoint?.batch
  if (!b) return 0
  if (b === true) return DEFAULT_BATCH_WINDOW_MS
  const ms = Number(b?.windowMs)
  return Number.isFinite(ms) && ms > 0 ? ms : 0
}

function render(view, kind, payload) {
  const s = view.state
  const head = KIND_LABEL[kind] || kind
  const lines = [
    `🛠 RSI checkpoint [${payload?.id ?? payload?.checkpoint ?? '?'}] — ${head}`,
    '',
    budgetLine(s),
  ]
  if (payload?.message) lines.push('', payload.message)
  if (payload?.patch) lines.push('', `patch: ${payload.patch}`)
  if (payload?.attempt) lines.push(`attempt: ${payload.attempt} · score ${payload.score ?? '?'}`)
  if (payload?.detail) lines.push('', '```', String(payload.detail).slice(0, 1200), '```')
  lines.push('', kind === 'gate' ? 'Reply rsi_decide with apply | reject | hold.' : 'Use rsi_status / rsi_report / rsi_control to act.')
  return lines.join('\n')
}

/** One prompt that stands in for every checkpoint currently waiting. */
function renderDigest(view, entries) {
  const s = view.state
  const lines = [
    `🛠 RSI checkpoints — ${entries.length} waiting, one digest`,
    '',
    budgetLine(s),
  ]
  for (const entry of entries) {
    const head = KIND_LABEL[entry.kind] || entry.kind || 'checkpoint'
    lines.push('', `• [${entry.id ?? '?'}] ${head}`)
    if (entry.payload?.message) lines.push(`  ${entry.payload.message}`)
    if (entry.payload?.patch) lines.push(`  patch: ${entry.payload.patch}`)
    if (entry.payload?.attempt) lines.push(`  attempt: ${entry.payload.attempt} · score ${entry.payload.score ?? '?'}`)
    if (entry.payload?.detail) lines.push('  detail:', '  ```', String(entry.payload.detail).slice(0, 1200), '  ```')
  }
  lines.push('', 'Reply rsi_decide with apply | reject | hold.')
  return lines.join('\n')
}

/** Stable id for one notification; named payload ids win so retries stay idempotent. */
function notificationId(view, payload) {
  const named = payload?.id ?? payload?.checkpoint
  if (named != null && String(named) !== '') return `loom-cp-${named}`
  const seq = view.ledger && Number.isFinite(view.ledger.seq) ? view.ledger.seq + 1 : Date.now().toString(36)
  return `loom-cp-${seq}-${Date.now().toString(36)}`
}

function checkpointIdOf(payload) {
  const named = payload?.id ?? payload?.checkpoint
  return named != null && String(named) !== '' ? String(named) : null
}

function ledgerEvents(view) {
  return view?.ledger && typeof view.ledger.all === 'function' ? view.ledger.all() : []
}

function append(view, type, data) {
  if (view?.ledger && typeof view.ledger.append === 'function') view.ledger.append(type, data, 'system')
}

function notifiedIds(view) {
  const set = new Set()
  for (const ev of ledgerEvents(view)) {
    if (ev?.type === 'checkpoint.notified' && ev.data?.id) set.add(String(ev.data.id))
  }
  return set
}

/** The most recently opened digest window, if the log has one. */
function lastWindow(view) {
  let found = null
  for (const ev of ledgerEvents(view)) {
    if (ev?.type !== 'checkpoint.window') continue
    const until = Number(ev.data?.until)
    if (!Number.isFinite(until)) continue
    found = { openedAt: Number(ev.data?.openedAt) || 0, until }
  }
  return found
}

/** Checkpoints held since the last wake-up and not yet covered by a digest. */
function pendingBatched(view) {
  const notified = notifiedIds(view)
  const records = new Map()
  for (const ev of ledgerEvents(view)) {
    if (ev?.type !== 'checkpoint.batched' || !ev.data?.id) continue
    records.set(String(ev.data.id), ev.data)
  }
  return [...records.values()].filter((rec) => !notified.has(String(rec.id)))
}

/**
 * Everything a digest should mention: open campaign checkpoints, held records
 * that never reached the projection, and the checkpoint that triggered this
 * delivery. Deduped by checkpoint id, state order first.
 */
function digestEntries(view, current, extraRecords = [], includeOpen = true) {
  const out = []
  const seen = new Set()
  const add = (id, kind, payloadSource) => {
    const key = id != null && String(id) !== '' ? String(id) : null
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push({ id: key, kind: kind ?? 'gate', payload: payloadSource ?? {} })
  }
  if (includeOpen) {
    const checkpoints = Array.isArray(view?.state?.checkpoints) ? view.state.checkpoints : []
    for (const c of checkpoints) {
      if (c?.status === 'open') add(c.id, c.kind, c.payload)
    }
  }
  for (const rec of extraRecords) add(rec.checkpointId ?? rec.id, rec.kind, rec.payload)
  if (current) add(current.id ?? checkpointIdOf(current.payload), current.kind, current.payload)
  return out
}

/** Record that everything in `ids` reached the human on this wake-up. */
function markNotified(view, ids, extraRecords, at) {
  if (!ids.size) return
  const already = notifiedIds(view)
  for (const rec of extraRecords) {
    const notifyId = String(rec.id)
    if (already.has(notifyId)) continue
    const key = rec.checkpointId != null ? String(rec.checkpointId) : notifyId
    if (!ids.has(key)) continue
    append(view, 'checkpoint.notified', { id: rec.id, checkpointId: rec.checkpointId ?? null, at }, 'system')
    already.add(notifyId)
  }
  // A checkpoint deferred for quiet hours keeps its own notification id. If a
  // digest already carried it, cancel the duplicate flush.
  for (const ev of ledgerEvents(view)) {
    if (ev?.type !== 'checkpoint.deferred' || !ev.data?.id) continue
    const key = ev.data.checkpointId != null ? String(ev.data.checkpointId) : null
    if (!key || !ids.has(key) || already.has(String(ev.data.id))) continue
    append(view, 'checkpoint.notified', { id: ev.data.id, checkpointId: ev.data.checkpointId ?? null, at }, 'system')
    already.add(String(ev.data.id))
  }
}

/** Queue one rendered checkpoint on the campaign's initiator session. */
async function deliver(ctx, { view, sessionId, requestId, kind, payload, text, log }) {
  if (!sessionId) return { delivered: false, reason: 'no-initiator' }
  const sessionController = svc(ctx, 'sessionController')
  const prompt = sessionController?.prompt
  if (typeof prompt !== 'function') return { delivered: false, reason: 'no-session-controller' }
  try {
    await prompt.call(sessionController, {
      requestId,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: text ?? render(view, kind, payload) }],
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
      checkpointId: checkpointIdOf(payload),
      kind,
      payload: payload ?? {},
      sessionId: view.state.initiator ?? null,
      deferredUntil,
      at: now,
    }
    append(view, 'checkpoint.deferred', rec)
    log(`checkpoint ${rec.checkpointId ?? id} held: quiet hours until ${new Date(deferredUntil).toISOString()}`)
    return { delivered: false, reason: 'quiet-hours', deferredUntil }
  }

  const windowMs = batchWindowMs(config)
  if (!windowMs) {
    // No batching configured: every checkpoint wakes the human, as before.
    const requestId = notificationId(view, payload)
    const result = await deliver(ctx, {
      view,
      sessionId: view.state.initiator,
      requestId,
      kind,
      payload,
      log,
    })
    if (result.delivered) {
      append(view, 'checkpoint.notified', { id: requestId, checkpointId: checkpointIdOf(payload), at: now })
    }
    return result
  }

  const window = lastWindow(view)
  if (window && now < window.until) {
    // Inside the open window: remember it, do not wake the human again.
    const id = notificationId(view, payload)
    const rec = {
      id,
      checkpointId: checkpointIdOf(payload),
      kind,
      payload: payload ?? {},
      sessionId: view.state.initiator ?? null,
      at: now,
      windowUntil: window.until,
    }
    append(view, 'checkpoint.batched', rec)
    log(`checkpoint ${rec.checkpointId ?? id} batched: next digest at ${new Date(window.until).toISOString()}`)
    return { delivered: false, reason: 'batched', until: window.until }
  }

  // No window yet (first wake-up) or the window has closed (digest time).
  const pending = pendingBatched(view)
  const first = !window
  const currentId = checkpointIdOf(payload) ?? notificationId(view, payload)
  // The first wake-up is the checkpoint itself; every later one is a digest of
  // everything still open, including what was held inside the window.
  const entries = digestEntries(view, { id: currentId, kind, payload }, first ? [] : pending, !first)
  const usable = entries.length ? entries : [{ id: currentId, kind, payload: payload ?? {} }]

  const result = await deliver(ctx, {
    view,
    sessionId: view.state.initiator,
    requestId: first
      ? notificationId(view, payload)
      : `loom-cp-digest-${now.toString(36)}-${ledgerEvents(view).length + 1}`,
    kind,
    payload,
    text: first ? render(view, kind, payload) : renderDigest(view, usable),
    log,
  })
  if (!result.delivered) return result

  append(view, 'checkpoint.window', { openedAt: now, until: now + windowMs, count: usable.length }, 'system')
  const ids = new Set(usable.map((entry) => String(entry.id)))
  ids.add(String(currentId))
  markNotified(view, ids, pending, now)
  if (first) return result
  return { ...result, digest: true, checkpoints: usable.length }
}

/**
 * Deliver every held checkpoint whose quiet window has passed.
 *
 * The campaign log is the queue: `checkpoint.deferred` records what to send and
 * `checkpoint.notified` records what already went out, so calling this on every
 * tick is safe and each checkpoint leaves exactly once. Failed deliveries stay
 * held and are retried on a later tick. When batching is on and several
 * checkpoints came due together, they leave as one digest.
 *
 * @returns {Promise<{ delivered: Array<{ id: string, checkpointId: string | null }> }>}
 */
export async function flushDeferred(ctx, { view, config, now = Date.now(), log = () => {} }) {
  const delivered = []
  const held = new Map()
  const notified = notifiedIds(view)
  for (const ev of ledgerEvents(view)) {
    if (ev?.type === 'checkpoint.deferred' && ev.data?.id) held.set(String(ev.data.id), ev.data)
  }
  const due = []
  for (const [id, rec] of held) {
    if (notified.has(id)) continue
    if (!(typeof rec.deferredUntil === 'number' && rec.deferredUntil <= now)) continue
    due.push([id, rec])
  }
  if (due.length === 0) return { delivered }

  const windowMs = batchWindowMs(config)
  if (windowMs > 0 && due.length > 1) {
    const entries = digestEntries(view, null, due.map(([, rec]) => rec), false)
    const lead = due[0][1]
    const result = await deliver(ctx, {
      view,
      sessionId: lead.sessionId ?? view.state.initiator,
      requestId: `loom-cp-digest-${now.toString(36)}-${ledgerEvents(view).length + 1}`,
      kind: lead.kind,
      payload: lead.payload,
      text: renderDigest(view, entries),
      log,
    })
    if (!result.delivered) return { delivered }
    append(view, 'checkpoint.window', { openedAt: now, until: now + windowMs, count: entries.length }, 'system')
    for (const [id, rec] of due) {
      append(view, 'checkpoint.notified', { id, checkpointId: rec.checkpointId ?? null, at: now }, 'system')
      delivered.push({ id, checkpointId: rec.checkpointId ?? null })
    }
    return { delivered }
  }

  for (const [id, rec] of due) {
    const result = await deliver(ctx, {
      view,
      sessionId: rec.sessionId ?? view.state.initiator,
      requestId: id,
      kind: rec.kind,
      payload: rec.payload,
      log,
    })
    if (!result.delivered) continue
    append(view, 'checkpoint.notified', { id, checkpointId: rec.checkpointId ?? null, at: now }, 'system')
    notified.add(id)
    delivered.push({ id, checkpointId: rec.checkpointId ?? null })
  }
  if (windowMs > 0 && delivered.length > 0) {
    // Keep the door shut for the rest of the window: a checkpoint raised right
    // after the flusher wakes the human belongs in the next digest.
    append(view, 'checkpoint.window', { openedAt: now, until: now + windowMs, count: delivered.length }, 'system')
  }
  return { delivered }
}
