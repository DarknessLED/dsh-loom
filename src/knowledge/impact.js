/**
 * Paired evidence for lessons — the only way a lesson earns the right to be
 * shown again.
 *
 * Design note: a round runs `candidates` attempts on the *same* task. Exactly
 * one of them (the exposed index, rotated by round — see
 * `src/runtime/exposure.js`) may receive at most `maxShown` lessons; the rest
 * stay clean as controls. That gives a genuine paired comparison inside a single
 * round: same task, same verifier, same round, different guidance. A lesson
 * whose treated attempt does worse than the control is a hazard, not a help, and
 * loses its slot. The control is therefore found by "saw no lessons", never by
 * attempt position.
 *
 * Nothing here reads files or clocks: pure functions over plain objects, so the
 * policy is testable without a host.
 */

/** Treat differences smaller than this as noise, not as evidence. */
export const NOISE = 0.01

/** FNV-1a — short, stable ids that do not need a crypto import. */
export function hashId(text) {
  let h = 0x811c9dc5
  const s = String(text ?? '')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

function lessonIds(attempt) {
  const v = attempt?.lessons
  if (!Array.isArray(v)) return []
  return v.filter((x) => typeof x === 'string' && x)
}

function scoreOf(attempt) {
  const s = Number(attempt?.score)
  return Number.isFinite(s) ? s : 0
}

/**
 * Compare every treated attempt against the control attempt of the same round.
 *
 * @param {{attempts: Array<{id?:string, score?:number, lessons?:string[]}>, round?: number}} input
 * @returns {Array<{lessonId: string, delta: number, outcome: 'gain'|'harm'|'neutral', round: number|null, controlId: string|null, treatedId: string|null}>}
 */
export function pairedImpacts({ attempts, round = null } = {}) {
  const list = Array.isArray(attempts) ? attempts.filter((a) => a && typeof a === 'object') : []
  const control = list.find((a) => !a.screenedOut && lessonIds(a).length === 0)
  if (!control) return []
  const base = scoreOf(control)
  const out = []
  for (const a of list) {
    const ids = lessonIds(a)
    if (!ids.length) continue
    const delta = Math.round((scoreOf(a) - base) * 1e6) / 1e6
    const outcome = delta > NOISE ? 'gain' : delta < -NOISE ? 'harm' : 'neutral'
    for (const lessonId of new Set(ids)) {
      out.push({
        lessonId,
        delta,
        outcome,
        round,
        controlId: control.id ?? null,
        treatedId: a.id ?? null,
      })
    }
  }
  return out
}

/**
 * Fold impacts into the lesson list. Returns a new array; inputs are untouched.
 * Unknown lesson ids are ignored (a lesson can be retired between rounds).
 */
export function applyImpacts(lessons, impacts, { round = null } = {}) {
  const list = Array.isArray(lessons) ? lessons : []
  const byId = new Map()
  for (const imp of Array.isArray(impacts) ? impacts : []) {
    if (!imp || typeof imp.lessonId !== 'string') continue
    const delta = Number(imp.delta)
    if (!Number.isFinite(delta)) continue
    const cur = byId.get(imp.lessonId) || { delta: 0, harm: 0 }
    cur.delta += delta
    if (imp.outcome === 'harm') cur.harm += 1
    byId.set(imp.lessonId, cur)
  }
  if (!byId.size) return list.map((l) => ({ ...l }))
  return list.map((l) => {
    if (!l || typeof l.id !== 'string') return l
    const hit = byId.get(l.id)
    if (!hit) return { ...l }
    const gainSum = Math.round(((Number(l.gainSum) || 0) + hit.delta) * 1e6) / 1e6
    return {
      ...l,
      useCount: (Number(l.useCount) || 0) + 1,
      gainSum,
      harmCount: (Number(l.harmCount) || 0) + hit.harm,
      lastUsedRound: round ?? l.lastUsedRound ?? null,
    }
  })
}

/**
 * A lesson that was shown enough times and never paid for itself is retired.
 * Two harms with no net gain is enough: a single bad round can be the task.
 */
export function shouldQuarantine(lesson, { minHarm = 2 } = {}) {
  if (!lesson || typeof lesson !== 'object') return false
  if (lesson.status !== 'active') return false
  const harm = Number(lesson.harmCount) || 0
  const gain = Number(lesson.gainSum) || 0
  const uses = Number(lesson.useCount) || 0
  if (harm >= minHarm && gain <= 0) return true
  if (uses >= 5 && gain <= 0) return true
  return false
}

/** Trim a claim into one declarative sentence, no newlines, bounded length. */
/**
 * Is this "claim" just an announcement that nothing was done?
 *
 * The knowledge tree only earns its keep if a claim states a mechanism the next
 * worker can use. "No edit was needed: the base commit already contains it" is a
 * fact about that one attempt, not about the code -- and once it is in the tree
 * it is selected for the next brief, which spends the reader's attention telling
 * it that there was nothing to do last time.
 *
 * Ten such claims reached the tree before the producer started refusing them
 * (the `checks.noop` guard), and they stay active until something retires them.
 * This predicate is the single place both the producer and the reader ask, so a
 * new phrasing gets handled once instead of in every consumer.
 *
 * It is deliberately narrow: it matches a *leading* announcement, not any
 * sentence containing "no". "No longer re-planning when the base is unchanged;
 * the plan is reused instead" is a real mechanism and must survive.
 */
const NO_WORK_PATTERNS = [
  /^nothing to do\b/i,
  /^no (?:edit|change|code|source|file|modification|work)(?:\s+\w+)?\s+(?:was|is|were)\s+(?:needed|required|necessary)\b/i,
  /^no (?:edit|change|code|source|file|modification|work)(?:\s+\w+)?\s+(?:was|is|were)\s+made\b/i,
  /^there (?:was|is) nothing (?:to do|to change|needed)\b/i,
  /^the (?:tree|workspace|repo|repository|worktree|branch|head|base) already\b/i,
]

export function isNoWorkClaim(text) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return false
  return NO_WORK_PATTERNS.some((re) => re.test(s))
}

export function normalizeClaim(text, max = 240) {
  const s = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return ''
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`
}

/**
 * Turn a promoted attempt into a lesson candidate.
 *
 * Only verified work becomes knowledge: the claim comes from the attempt's own
 * `why` (the mechanism), never from a plan or an excuse. Returns null when the
 * attempt gives us nothing declarative to say.
 */
export function deriveLesson({ attempt, task, round, kind = 'fact' } = {}) {
  const claim = normalizeClaim(attempt?.report?.why)
  if (!claim) return null
  // A verified attempt that reports it changed nothing has no mechanism to
  // teach. This is the producer-side guard; `checks.noop` catches the attempts
  // that produced no patch at all, and this catches the ones that reported
  // "nothing was needed" while still touching a file.
  if (isNoWorkClaim(claim)) return null
  const family = task?.family ?? task?.id ?? '*'
  const id = `lsn-${hashId(`${family}\u0000${claim}`)}`
  return {
    id,
    family,
    taskIds: task?.id ? [task.id] : [],
    tags: Array.isArray(task?.tags) ? task.tags.slice(0, 8) : [],
    kind,
    claim,
    evidence: `round ${round ?? '?'} attempt ${attempt?.id ?? '?'} verified (score ${attempt?.score ?? 0})`,
    confidence: 0.5,
    status: 'active',
    createdRound: round ?? 0,
    ttlRounds: 12,
    useCount: 0,
    gainSum: 0,
    harmCount: 0,
    lastUsedRound: null,
  }
}
