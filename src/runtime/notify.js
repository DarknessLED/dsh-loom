import { svc } from '../core/services.js'

// Wake the human-facing session only when something needs a decision.
//
// The main agent is idle by design: rounds run inside child sessions. This
// module turns a checkpoint into one queued prompt on the initiator session,
// which starts exactly one turn for the human to see. Delivery is fire-and-
// forget (sessionController.prompt resolves on admission, not completion).

const KIND_LABEL = {
  gate: 'a passing patch is waiting for review',
  budget: 'the campaign hit its spending cap',
  anomaly: 'the loop hit something it cannot fix alone',
  setup: 'the campaign is missing something it needs',
  plateau: 'the loop stopped making progress',
}

/** Parse "HH:MM" into minutes past local midnight; null when malformed. */
function clockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

/** config.checkpoint.quietHours is { start, end } or the documented "HH:MM-HH:MM". */
function quietWindow(quietHours) {
  if (typeof quietHours === 'string') {
    const [start, end] = quietHours.split('-')
    return { start, end }
  }
  return quietHours && typeof quietHours === 'object' ? quietHours : null
}

/** True inside the half-open local window [start, end); overnight windows wrap. */
function inQuietHours(quietHours, now) {
  const window = quietWindow(quietHours)
  const start = clockMinutes(window?.start)
  const end = clockMinutes(window?.end)
  if (start === null || end === null || start === end) return false
  const at = new Date(now)
  const minute = at.getHours() * 60 + at.getMinutes()
  return start < end ? minute >= start && minute < end : minute >= start || minute < end
}

function render(view, kind, payload) {
  const s = view.state
  const head = KIND_LABEL[kind] || kind
  const lines = [
    `🛠 RSI checkpoint [${payload?.id ?? '?'}] — ${head}`,
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

/** Send one checkpoint to the session that started the campaign. */
export async function notifyCheckpoint(ctx, { view, kind, payload, config, now = Date.now(), log = () => {} }) {
  const quietHours = config?.checkpoint?.quietHours
  if (quietHours && inQuietHours(quietHours, now)) {
    // Human attention is the scarce resource: hold it for the window instead of waking them.
    log(`checkpoint ${payload?.id} held: quiet hours`)
    return { delivered: false, reason: 'quiet-hours' }
  }
  const sessionId = view.state.initiator
  if (!sessionId) return { delivered: false, reason: 'no-initiator' }
  const sessionController = svc(ctx, 'sessionController')
  const prompt = sessionController?.prompt
  if (typeof prompt !== 'function') return { delivered: false, reason: 'no-session-controller' }
  const requestId = `loom-cp-${payload?.id ?? Date.now().toString(36)}`
  try {
    await prompt.call(sessionController, {
      requestId,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: render(view, kind, payload) }],
    })
    log(`checkpoint ${payload?.id} queued on session ${sessionId}`)
    return { delivered: true }
  } catch (err) {
    // Never break the loop because the UI could not be woken.
    log('checkpoint delivery failed:', err?.message ?? err)
    return { delivered: false, error: String(err?.message ?? err) }
  }
}
