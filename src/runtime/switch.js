// The loop's master switch lives outside the campaign directories on purpose.
//
// Turning the loop off is an operator decision, not a campaign event: if it were
// appended to `events.jsonl`, every toggle would punctuate the history, shift
// what "round 3" means to a reader, and force the view to be reasoned about
// again. So the switch is a single small file next to the ledgers, with its own
// append-only audit trail. Campaign ledgers are never touched by a toggle.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { appendJsonl, writeJsonAtomic } from '../core/atomic.js'
import { ensureDir } from '../core/paths.js'

export const SWITCH_FILE = 'switch.json'
export const SWITCH_LOG = 'switch.jsonl'

export function switchPath(home) {
  return join(home, SWITCH_FILE)
}

export function switchLogPath(home) {
  return join(home, SWITCH_LOG)
}

/**
 * Read the switch. A missing file means "never toggled" and answers with the
 * configured default; an unreadable one must not flip the loop either, so the
 * default wins and the caller can still see why (`by: 'config'`).
 */
export function readSwitch(home, fallback = true, now = Date.now()) {
  const file = switchPath(home)
  try {
    if (!existsSync(file)) return { enabled: fallback !== false, at: null, by: 'config', reason: 'default' }
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    if (!raw || typeof raw.enabled !== 'boolean') {
      return { enabled: fallback !== false, at: null, by: 'config', reason: 'unreadable' }
    }
    return {
      enabled: raw.enabled,
      at: Number.isFinite(raw.at) ? raw.at : null,
      by: typeof raw.by === 'string' ? raw.by : 'human',
      reason: typeof raw.reason === 'string' ? raw.reason : null,
      now,
    }
  } catch {
    return { enabled: fallback !== false, at: null, by: 'config', reason: 'unreadable' }
  }
}

/** Flip the switch and keep an audit line. Returns the state that was written. */
export function writeSwitch(home, { enabled, by = 'human', reason = null, now = Date.now() }) {
  ensureDir(home)
  const record = { enabled: enabled !== false, at: now, by, reason }
  writeJsonAtomic(switchPath(home), record)
  try {
    appendJsonl(switchLogPath(home), {
      type: record.enabled ? 'rsi.enabled' : 'rsi.disabled',
      at: record.at,
      by: record.by,
      reason: record.reason,
    })
  } catch {
    // The audit trail is a convenience: losing one line must not undo the flip.
  }
  return record
}

/** `on`/`off`/`toggle` → boolean | null. Accepts the words an operator types. */
export function parseSwitch(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (['on', 'enable', 'enabled', 'true', 'yes', '1', 'start'].includes(text)) return true
  if (['off', 'disable', 'disabled', 'false', 'no', '0', 'stop'].includes(text)) return false
  return null
}
