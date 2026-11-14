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
 * The ordered chain one dispatch should walk, given how many real model failures
 * it follows.
 *
 * This is the ordering decision itself, extracted from the dispatcher so it can
 * be read and tested without a host. With nothing failed the worker model leads
 * and the configured fallbacks follow; once the worker has failed, the chain
 * leads with the fallback and keeps the failed model last -- still reachable, so
 * "provider down" never becomes "no model left to try", but never asked first
 * again on the strength of the same failure.
 *
 * `failures` counts *real* model failures (context window, token budget, quota,
 * a provider that refused), not attempts: callers with none pass 0 or omit it.
 * One failure walks one step deeper into the fallback list and stops on the last
 * fallback, the same one-step-per-failure rule `nextModel` implements, so the
 * ordering here and the rotation there cannot disagree about where the chain is.
 *
 * Only named refs live in this chain: when no worker is named the result is just
 * the fallbacks, and the caller keeps its own "let the host decide" sentinel
 * (a `null` head) rather than having one invented here.
 *
 * @param {{model?: string|null, fallback?: Array<string>, failures?: number}} spec
 * @returns {Array<string>} deduped refs; worker first before any failure,
 *   fallback first and the failed worker last after one
 */
export function modelChainFor(spec = {}) {
  const worker = normalize(spec?.model)
  const fallback = []
  const seen = new Set()
  for (const ref of listOf(spec?.fallback)) {
    const key = normalize(ref)
    // The worker is not a fallback for itself, and naming a ref twice does not
    // make it two places to try.
    if (!key || key === worker || seen.has(key)) continue
    seen.add(key)
    fallback.push(key)
  }

  const n = Number(spec?.failures)
  const failures = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0

  if (!worker) return fallback
  if (fallback.length === 0) return [worker]
  if (failures === 0) return [worker, ...fallback]

  // Step into the fallbacks, one per failure, stopping on the last one: past the
  // end a chain keeps trying its final fallback rather than wrapping back to the
  // model that just failed. The failed worker stays last, not dropped.
  const lead = Math.min(failures - 1, fallback.length - 1)
  return [...fallback.slice(lead), ...fallback.slice(0, lead), worker]
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
