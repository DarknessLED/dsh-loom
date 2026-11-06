// Quiet-hours deferral.
//
// A checkpoint that arrives inside the configured quiet window must not be
// delivered (and must not be dropped either): the caller holds it until the
// window closes. This module only computes that instant.

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
    const parts = quietHours.split('-')
    if (parts.length !== 2) return null
    return { start: parts[0].trim(), end: parts[1].trim() }
  }
  return quietHours && typeof quietHours === 'object' ? quietHours : null
}

/**
 * Epoch ms of the next quiet-window end when `now` is inside the window,
 * otherwise null. The window is half-open [start, end) in local time and may
 * wrap midnight; malformed values and a zero-length window never hold.
 *
 * @param {{ start: string, end: string } | string | null} quietHours
 * @param {number} now epoch ms
 * @returns {number | null}
 */
export function deferUntil(quietHours, now) {
  const window = quietWindow(quietHours)
  const start = clockMinutes(window?.start)
  const end = clockMinutes(window?.end)
  if (start === null || end === null || start === end) return null
  if (!Number.isFinite(now)) return null

  const at = new Date(now)
  const minute = at.getHours() * 60 + at.getMinutes()
  const inside = start < end ? minute >= start && minute < end : minute >= start || minute < end
  if (!inside) return null

  // Inside an overnight window after its start (`minute >= start`) the end is
  // on the following day; before its start it is later the same morning.
  const overnight = start > end && minute >= start
  const endAt = new Date(
    at.getFullYear(),
    at.getMonth(),
    at.getDate() + (overnight ? 1 : 0),
    Math.floor(end / 60),
    end % 60,
    0,
    0,
  )
  return endAt.getTime()
}
