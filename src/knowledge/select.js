// Lesson selection policy for a campaign.
//
// A round may show a worker only a few prior `Lesson` records; showing too
// many (or showing them during exploration) suppresses exploration. This
// module is the policy: pure functions, no dependencies, no side effects.
//
// Lesson shape:
//   { id, family, taskIds, tags, kind, claim, evidence, confidence, status,
//     createdRound, ttlRounds, useCount, gainSum, harmCount, lastUsedRound }
//
// Ranking formula (also see scoreLesson):
//   score = confidence
//         + gainSum / (useCount + 1)
//         - 0.5 * harmCount
//         - 0.15 * max(0, round - createdRound) / 12
// The final score is forced finite (non-finite terms become 0, the result is
// clamped to +/-1e9) and rounded to 6 decimals so ranking is reproducible.

const DEFAULT_TTL = 12
const DEFAULT_LIMIT = 3
const DEFAULT_MAX = 200
const SCORE_CLAMP = 1e9

function toObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function finiteNumber(value, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function optionValue(options, key, fallback) {
  const source = toObject(options)
  return source[key] === undefined ? fallback : source[key]
}

// The shared shape requires a non-empty string id; entries without one are
// malformed and are skipped by the selectors below.
function lessonId(lesson) {
  if (lesson === null || typeof lesson !== 'object' || Array.isArray(lesson)) return null
  return typeof lesson.id === 'string' && lesson.id.length > 0 ? lesson.id : null
}

function copyLesson(lesson, round) {
  return {
    ...lesson,
    // Arrays are copied too so callers mutating a returned lesson cannot
    // reach back into the campaign store.
    taskIds: Array.isArray(lesson.taskIds) ? [...lesson.taskIds] : lesson.taskIds,
    tags: Array.isArray(lesson.tags) ? [...lesson.tags] : lesson.tags,
    score: scoreLesson(lesson, { round }),
  }
}

/**
 * true when the lesson's TTL has elapsed: round > createdRound + ttlRounds.
 * A missing ttlRounds means 12; a missing createdRound behaves as 0, so the
 * comparison stays well defined and never throws.
 */
export function isExpired(lesson, options) {
  const entry = toObject(lesson)
  const round = finiteNumber(optionValue(options, 'round', 0), 0)
  const createdRound = finiteNumber(entry.createdRound, 0)
  const ttlRounds = finiteNumber(entry.ttlRounds, DEFAULT_TTL)
  return round > createdRound + ttlRounds
}

/**
 * Why this lesson applies to this task, in priority order:
 * 'family' | 'task' | 'tag' | 'wildcard' | null.
 */
export function matchReason(lesson, task) {
  const entry = toObject(lesson)
  const target = toObject(task)
  const lessonTags = Array.isArray(entry.tags) ? entry.tags : []
  const taskTags = Array.isArray(target.tags) ? target.tags : []

  if (typeof entry.family === 'string' && entry.family === target.family) return 'family'

  const taskIds = Array.isArray(entry.taskIds) ? entry.taskIds : []
  if (target.id !== undefined && taskIds.includes(target.id)) return 'task'

  if (lessonTags.some((tag) => taskTags.includes(tag))) return 'tag'

  if (entry.family === '*') return 'wildcard'

  return null
}

/**
 * Deterministic relevance score; see the formula at the top of this file.
 * Non-finite inputs are ignored and the result is always a finite number
 * rounded to 6 decimals.
 */
export function scoreLesson(lesson, options) {
  const entry = toObject(lesson)
  const round = finiteNumber(optionValue(options, 'round', 0), 0)

  const confidence = finiteNumber(entry.confidence, 0)
  const gainSum = finiteNumber(entry.gainSum, 0)
  const useCount = Math.max(0, finiteNumber(entry.useCount, 0))
  const harmCount = Math.max(0, finiteNumber(entry.harmCount, 0))
  const createdRound = finiteNumber(entry.createdRound, 0)

  const denominator = useCount + 1
  const gainTerm = Number.isFinite(gainSum / denominator) ? gainSum / denominator : 0
  const staleness = (0.15 * Math.max(0, round - createdRound)) / 12

  let score = confidence + gainTerm - 0.5 * harmCount - staleness
  if (!Number.isFinite(score)) {
    score = Number.isNaN(score) ? 0 : Math.sign(score) * SCORE_CLAMP
  }
  score = Math.max(-SCORE_CLAMP, Math.min(SCORE_CLAMP, score))

  const rounded = Math.round(score * 1e6) / 1e6
  return rounded === 0 ? 0 : rounded
}

function compareRanked(left, right) {
  if (right.score !== left.score) return right.score - left.score
  const leftCreated = finiteNumber(left.createdRound, 0)
  const rightCreated = finiteNumber(right.createdRound, 0)
  if (rightCreated !== leftCreated) return rightCreated - leftCreated
  if (left.id < right.id) return -1
  if (left.id > right.id) return 1
  return 0
}

/**
 * Pick at most `limit` active lessons for this round/task/phase.
 * Exploration never receives prior guidance, so it always returns [].
 * Excluded: non-active, expired, holdout families, recipe lessons during
 * repair, and anything that does not match the task.
 */
export function selectLessons(lessons, options) {
  if (!Array.isArray(lessons)) return []

  const phase = optionValue(options, 'phase', undefined)
  if (phase === 'explore') return []

  const round = finiteNumber(optionValue(options, 'round', 0), 0)
  const task = toObject(optionValue(options, 'task', {}))
  const rawLimit = optionValue(options, 'limit', DEFAULT_LIMIT)
  const limit = Number.isFinite(Number(rawLimit))
    ? Math.max(0, Math.floor(Number(rawLimit)))
    : DEFAULT_LIMIT

  const rawExcluded = optionValue(options, 'excludeFamilies', [])
  const excludedFamilies = new Set(Array.isArray(rawExcluded) ? rawExcluded : [])

  const selected = []
  for (const lesson of lessons) {
    if (lessonId(lesson) === null) continue
    if (lesson.status !== 'active') continue
    if (isExpired(lesson, { round })) continue
    if (excludedFamilies.has(lesson.family)) continue
    if (phase === 'repair' && lesson.kind === 'recipe') continue
    if (matchReason(lesson, task) === null) continue
    selected.push(copyLesson(lesson, round))
  }

  selected.sort(compareRanked)
  return selected.slice(0, limit)
}

/**
 * Drop expired lessons and "used at least 5 times but never gained" ones,
 * then keep the newest `max` of the rest by createdRound (then id).
 * Returns original lesson objects, never mutates the input array, and skips
 * malformed entries. `retired` holds only the ids dropped by the retirement
 * rules above; entries falling outside `max` are simply not kept.
 */
export function pruneLessons(lessons, options) {
  if (!Array.isArray(lessons)) return { kept: [], retired: [] }

  const round = finiteNumber(optionValue(options, 'round', 0), 0)
  const rawMax = optionValue(options, 'max', DEFAULT_MAX)
  const max = Number.isFinite(Number(rawMax))
    ? Math.max(0, Math.floor(Number(rawMax)))
    : DEFAULT_MAX

  const surviving = []
  const retired = []

  for (const lesson of lessons) {
    const id = lessonId(lesson)
    if (id === null) continue
    const useCount = Math.max(0, finiteNumber(lesson.useCount, 0))
    const gainSum = finiteNumber(lesson.gainSum, 0)
    const neverUseful = useCount >= 5 && gainSum <= 0
    if (isExpired(lesson, { round }) || neverUseful) {
      retired.push(id)
      continue
    }
    surviving.push(lesson)
  }

  surviving.sort((left, right) => {
    const leftCreated = finiteNumber(left.createdRound, 0)
    const rightCreated = finiteNumber(right.createdRound, 0)
    if (rightCreated !== leftCreated) return rightCreated - leftCreated
    if (left.id < right.id) return -1
    if (left.id > right.id) return 1
    return 0
  })

  retired.sort()
  return { kept: surviving.slice(0, max), retired }
}
