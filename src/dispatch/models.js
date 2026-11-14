/**
 * The ordered model chain an attempt walks, and where it is after N failures.
 *
 * `models.fallback` names a different provider on purpose: a same-provider
 * fallback inherits the same outage. But a list that is never consulted is not a
 * fallback, so the ordering and the rotation are decisions with a name instead
 * of an expression inline in the round.
 *
 * Ordering is configuration plus one signal: the worker model goes first, the
 * configured fallbacks follow in order, duplicates collapse, and a demoted ref
 * (one whose recent attempts all failed -- see `demoteChain`) moves to the end.
 * Demotion reorders the bet; it never removes a model from it, because dropping
 * the last ref would turn "provider down" into "no model to try".
 *
 * Pure and dependency-free: takes plain strings, returns a new array.
 */

/** The usable form of a ref: trimmed, or null when it names nothing. */
function normalize(ref) {
  if (typeof ref !== 'string') return null
  const trimmed = ref.trim()
  return trimmed ? trimmed : null
}

function listOf(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Assemble the chain for one attempt.
 *
 * @param {{model?: string, fallback?: Array<string>, demote?: Array<string>}} spec
 * @returns {Array<string>} deduped refs, worker model first, demoted refs last
 */
export function orderedModels(spec = {}) {
  const chain = []
  const seen = new Set()
  const add = (ref) => {
    const key = normalize(ref)
    if (!key || seen.has(key)) return
    seen.add(key)
    chain.push(key)
  }

  add(spec?.model)
  for (const ref of listOf(spec?.fallback)) add(ref)

  const demoted = new Set()
  for (const ref of listOf(spec?.demote)) {
    const key = normalize(ref)
    if (key) demoted.add(key)
  }
  if (demoted.size === 0) return chain

  const keep = []
  const dead = []
  for (const ref of chain) (demoted.has(ref) ? dead : keep).push(ref)
  // Every ref demoted means the configured order stands: reordering all of them
  // would express a preference that does not exist.
  return keep.length === 0 ? chain : [...keep, ...dead]
}

/**
 * Which model the attempt runs after `failures` real failures.
 *
 * Rotation is one step per failure and stops on the last ref: past the end the
 * chain keeps trying the last model rather than wrapping to the one that just
 * failed (a loop that retries the dead provider forever) or returning null while
 * work remains. An empty chain is the one case with nothing to try, so it alone
 * returns null.
 *
 * @param {{models?: Array<string>, failures?: number}} spec
 * @returns {string|null}
 */
export function nextModel(spec = {}) {
  const models = listOf(spec?.models)
  if (models.length === 0) return null
  const n = Number(spec?.failures)
  const failures = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  return models[Math.min(failures, models.length - 1)]
}
