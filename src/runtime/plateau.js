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
 * Rounds that measured something. An interrupted round (the plugin was
 * re-applied mid-flight, or the model layer broke) never ran an attempt, so it
 * carries no verdict about the task: counting it as "flat" lets a provider
 * outage masquerade as a plateau and sends a human to "adjust the objective or
 * stop the campaign" when the honest answer is "wait".
 */
function measured(round) {
  // A missing record is "no verdict", which is not progress: count it as flat
  // rather than dropping it, so three unreadable rounds still look flat.
  return round?.status !== 'interrupted'
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
  const list = (Array.isArray(rounds) ? rounds : []).filter(measured)
  const size = windowOf({ window })
  if (list.length < size) return false
  return list.slice(-size).every((round) => !(round && round.promoted === true))
}

/**
 * True only when the loop is flat and this exact flat window has not already
 * been raised.
 *
 * A campaign that stalls, is handed a variant, and stalls again is not the same
 * plateau: after the first card is answered the operator needs to hear about the
 * next window too, or L2 would propose exactly once in a campaign's lifetime and
 * then go silent while the budget burns. Re-asking is scoped to the window, so
 * the old "do not ask twice for the same three rounds" promise still holds.
 *
 * @param {{rounds?: Array<object>, checkpoints?: Array<object>} | undefined} state
 * @param {{window?: number}} [options]
 * @returns {boolean}
 */
export function oncePlateau(state, { window = 3 } = {}) {
  if (!state || typeof state !== 'object') return false
  if (!plateauReached(state.rounds, { window })) return false
  const checkpoints = Array.isArray(state.checkpoints) ? state.checkpoints : []
  const raised = checkpoints.filter((checkpoint) => checkpoint && checkpoint.kind === 'plateau')
  if (!raised.length) return true
  const size = windowOf({ window })
  const numbers = (Array.isArray(state.rounds) ? state.rounds : [])
    .filter(measured)
    .slice(-size)
    .map((round) => Number(round?.n))
  // Malformed round records cannot name a window: keep the old one-shot
  // behaviour rather than raising a card per round.
  if (numbers.length !== size || numbers.some((n) => !Number.isFinite(n))) return raised.length === 0
  const seen = raised[raised.length - 1]?.payload?.rounds
  // A checkpoint from an older plugin has no window recorded: it stays a
  // one-shot answer, because there is nothing to compare the new window to.
  if (!Array.isArray(seen)) return false
  const seenNumbers = seen.map(Number).filter(Number.isFinite)
  if (!seenNumbers.length) return false
  // Only when the current window has moved entirely past the raised one. A
  // sliding window overlaps its predecessor by design, and that overlap is not
  // new information.
  return Math.max(...seenNumbers) < Math.min(...numbers)
}
