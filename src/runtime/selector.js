/**
 * Task selection for a campaign round.
 *
 * The loop must not burn rounds re-running tasks that are already perfect:
 * once a task scores 1.0 there is nothing left to gain from it, and spending a
 * round there costs real tokens while telling us nothing. So rounds rotate
 * over the tasks that still have headroom, and only fall back to the full list
 * when every task is solved (the campaign is then just holding its ground).
 */

/** Best verifier-passing score recorded for each task so far. */
export function bestScores(rounds) {
  const best = new Map()
  for (const round of Array.isArray(rounds) ? rounds : []) {
    for (const attempt of round?.attempts ?? []) {
      if (attempt?.screenedOut || attempt?.abandoned) continue
      if (attempt?.verifierOk !== true) continue
      if (!Number.isFinite(attempt?.score)) continue
      const taskId = round.taskId ?? attempt.taskId ?? null
      if (!taskId) continue
      if (!best.has(taskId) || attempt.score > best.get(taskId)) best.set(taskId, attempt.score)
    }
  }
  return best
}

/** True when this task has no measurable headroom left. */
export function isSolved(taskId, best) {
  const score = best?.get?.(taskId)
  return Number.isFinite(score) && score >= 1
}

/**
 * Pick the task for round `n`.
 * @returns {{task: object|null, poolSize: number, solvedCount: number}}
 */
export function pickTask(tasks, rounds, { round = 1 } = {}) {
  const list = Array.isArray(tasks) ? tasks.filter(Boolean) : []
  if (!list.length) return { task: null, poolSize: 0, solvedCount: 0 }
  const best = bestScores(rounds)
  const open = list.filter((task) => !isSolved(task.id, best))
  const pool = open.length ? open : list
  const index = ((Math.max(1, round) - 1) % pool.length + pool.length) % pool.length
  return { task: pool[index], poolSize: pool.length, solvedCount: list.length - open.length }
}
