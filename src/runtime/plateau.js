/**
 * Plateau detection: notice when the loop has stopped making progress.
 *
 * `config.checkpoint.on` already lists "plateau" but nothing raised it, so a
 * campaign could burn its whole budget on flat rounds without telling anyone.
 * This module is the pure predicate behind that checkpoint — no clock, no
 * persistence, no host: the caller decides what to do with the answer.
 *
 * A round counts as promoted only when it carries `promoted === true`; a
 * missing flag (older records, interrupted rounds, errored rounds) counts as
 * flat, because an event without the flag cannot be evidence of progress.
 */

/**
 * Normalize the window option: a positive whole number of rounds to inspect.
 * Anything malformed falls back to the documented default so a bad config can
 * never make `slice(-0)` silently inspect the whole history.
 */
function windowOf(options) {
  const raw = Number(options?.window ?? 3)
  if (!Number.isFinite(raw)) return 3
  return Math.max(1, Math.floor(raw))
}

/**
 * True only when at least `window` rounds exist and none of the last `window`
 * rounds promoted anything.
 *
 * @param {Array<{promoted?: boolean}> | undefined} rounds
 * @param {{window?: number}} [options]
 * @returns {boolean}
 */
export function plateauReached(rounds, { window = 3 } = {}) {
  const list = Array.isArray(rounds) ? rounds : []
  const size = windowOf({ window })
  if (list.length < size) return false
  return list.slice(-size).every((round) => !(round && round.promoted === true))
}

/**
 * True only when the loop is flat and no plateau checkpoint is already
 * recorded — any status, because we ask once and then drop the request.
 *
 * @param {{rounds?: Array<object>, checkpoints?: Array<object>} | undefined} state
 * @param {{window?: number}} [options]
 * @returns {boolean}
 */
export function oncePlateau(state, { window = 3 } = {}) {
  if (!state || typeof state !== 'object') return false
  if (!plateauReached(state.rounds, { window })) return false
  const checkpoints = Array.isArray(state.checkpoints) ? state.checkpoints : []
  return !checkpoints.some((checkpoint) => checkpoint && checkpoint.kind === 'plateau')
}
