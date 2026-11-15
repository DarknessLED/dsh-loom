// Cross-domain transfer.
//
// A lesson earned in one domain can still be useful in another, but only in two
// very different ways:
//
//   direct   — same family, same task, or a shared tag. The lesson is *advice*:
//              it may be shown to the worker as prior guidance.
//   analogy  — different domain, but the same difficulty shape (both are about
//              costly evaluation, noisy verifiers, proxy metrics, ...). The
//              lesson is *inspiration*: a hypothesis to test here, never an
//              instruction, because the evidence was earned somewhere else.
//
// Everything below is pure: no files, no clock, deterministic sorting.

function toObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function list(value) {
  return Array.isArray(value) ? value.filter((x) => typeof x === 'string' && x.length > 0) : []
}

function signatureOf(entity) {
  // `signature` is the older name for the same idea; `shape` is what an attempt
  // is classified into now. Reading both means a lesson written either way can
  // still be matched, without migrating the corpus.
  const e = toObject(entity)
  return new Set([...list(e.signature), ...list(e.shape)].map((s) => s.toLowerCase()))
}

function label(entity) {
  const e = toObject(entity)
  return typeof e.family === 'string' && e.family ? e.family : 'unknown'
}

/**
 * Why the lesson reaches the target, in priority order.
 * @returns {{route:'direct'|'analogy'|'none', score:number, reasons:string[], advice:boolean}}
 */
export function transferRoute(lesson, target) {
  const l = toObject(lesson)
  const t = toObject(target)
  const reasons = []
  let direct = false

  // An eval-set task that declares no family is filed under its own id, which
  // is exactly what the attempt record does (`task.family ?? task.id`). Both
  // sides must agree on that or a family lesson can never reach the worker.
  const targetFamily =
    typeof t.family === 'string' && t.family ? t.family : typeof t.id === 'string' ? t.id : undefined
  if (l.family === targetFamily && typeof l.family === 'string') {
    direct = true
    reasons.push(`same family: ${l.family}`)
  }
  const taskIds = list(l.taskIds)
  if (t.id !== undefined && taskIds.includes(t.id)) {
    direct = true
    reasons.push(`same task: ${t.id}`)
  }
  const sharedTags = list(l.tags).filter((tag) => list(t.tags).includes(tag))
  if (sharedTags.length) {
    direct = true
    reasons.push(`shared tag: ${sharedTags.join(', ')}`)
  }

  if (direct) {
    return { route: 'direct', score: 1, reasons, advice: true }
  }

  const ls = signatureOf(l)
  const ts = signatureOf(t)
  const shared = [...ls].filter((s) => ts.has(s))
  if (!shared.length) return { route: 'none', score: 0, reasons: [], advice: false }

  const union = new Set([...ls, ...ts])
  const score = Math.round((shared.length / union.size) * 1e6) / 1e6
  reasons.push(`different domain: ${label(l)} vs ${label(t)}`)
  reasons.push(`shared difficulty: ${shared.sort().join(', ')}`)
  return { route: 'analogy', score, reasons, advice: false }
}

/**
 * Lessons from other domains whose difficulty shape overlaps the target.
 * Sorted by score desc, then id, so two calls return the same list.
 */
export function findAnalogies(target, lessons, options = {}) {
  const limitRaw = Number(toObject(options).limit)
  const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? Math.floor(limitRaw) : 3
  if (!Array.isArray(lessons)) return []
  const out = []
  for (const lesson of lessons) {
    if (!lesson || typeof lesson.id !== 'string' || lesson.status !== 'active') continue
    const route = transferRoute(lesson, target)
    if (route.route !== 'analogy') continue
    out.push({
      id: lesson.id,
      from: label(lesson),
      claim: String(lesson.claim ?? ''),
      score: route.score,
      reasons: route.reasons,
    })
  }
  out.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return out.slice(0, limit)
}

/**
 * Did a transferred lesson pay for itself?
 *
 * The rule is mechanical on purpose: a forecast or an analogy that has been
 * shown twenty times and won less often than it lost is deleted, not defended.
 * Below twenty showings there is not enough evidence to say anything, and the
 * honest answer is "insufficient" rather than a coin flip.
 */
export const TRIAL_MIN = 20

export function trialVerdict(lesson) {
  const t = toObject(lesson).trials
  if (!t || typeof t !== 'object') return 'insufficient'
  const shown = Number(t.shown) || 0
  const wins = Number(t.wins) || 0
  const losses = Number(t.losses) || 0
  const ties = Number(t.ties) || 0
  if (shown < TRIAL_MIN) return 'insufficient'
  // A tie is a graded comparison that found no measurable effect, not a
  // missing observation. A trial that reached its twenty showings, was
  // compared every time, and never once helped does not pay for its slot.
  // With no comparison at all (no wins, losses or ties) the lesson was never
  // judged, so it stays pending rather than being retired on silence.
  if (wins + losses + ties === 0) return 'insufficient'
  return wins > losses ? 'keep' : 'drop'
}

