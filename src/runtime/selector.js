/**
 * Task selection for a campaign round.
 *
 * The loop must not burn rounds re-running tasks that are already perfect:
 * once a task scores 1.0 there is nothing left to gain from it, and spending a
 * round there costs real tokens while telling us nothing. So rounds rotate
 * over the tasks that still have headroom, and report `allSolved` when none
 * are left so the scheduler can finish the campaign instead of spinning.
 */

/** Best verifier-passing score recorded for each task so far. */
export function bestScores(rounds) {
  const best = new Map()
  for (const round of Array.isArray(rounds) ? rounds : []) {
    // A task only counts as solved when the work that solved it actually
    // reached the workspace — a 1.0 in a discarded worktree is not progress.
    if (round?.landed !== true) continue
    // A projected ledger entry may carry the attempt *count* instead of the
    // attempts themselves (a summary view, an older ledger), so read it only
    // when it is the list it claims to be rather than throwing mid-selection.
    for (const attempt of Array.isArray(round?.attempts) ? round.attempts : []) {
      if (attempt?.screenedOut || attempt?.abandoned) continue
      if (attempt?.verifierOk !== true) continue
      if (!Number.isFinite(attempt?.score)) continue
      if (round.promotedAttemptId && attempt.id !== round.promotedAttemptId) continue
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
 *
 * `allSolved` is the scheduler's signal to stop: when every task has landed at
 * 1.0 there is no useful work left, and handing one back would spend a round
 * re-proving a solved task.
 * @returns {{task: object|null, poolSize: number, solvedCount: number, allSolved: boolean}}
 */
export function pickTask(tasks, rounds, { round = 1 } = {}) {
  const list = Array.isArray(tasks) ? tasks.filter(Boolean) : []
  if (!list.length) return { task: null, poolSize: 0, solvedCount: 0, allSolved: false }
  const best = bestScores(rounds)
  const open = list.filter((task) => !isSolved(task.id, best))
  if (!open.length) return { task: null, poolSize: 0, solvedCount: list.length, allSolved: true }
  const index = ((Math.max(1, round) - 1) % open.length + open.length) % open.length
  return { task: open[index], poolSize: open.length, solvedCount: list.length - open.length, allSolved: false }
}
