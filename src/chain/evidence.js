/**
 * L1 — evidence for a chain version.
 *
 * A chain is a hypothesis about *how* to work ("two candidates, this prompt,
 * this report shape"). The only honest way to compare two chains is paired:
 * the same task, run under both, scored by the same verifier. This module turns
 * the event log into exactly that table and nothing more — it never looks at
 * how confident an agent sounded.
 */

const EPS = 1e-9

function round6(x) {
  const n = Number(x)
  return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : 0
}

/**
 * One row per (chainVersion, taskId): the best score that version reached on
 * that task. Multiple rounds on the same task collapse to the best, because a
 * chain that can reach 0.9 has demonstrated it.
 */
export function chainEvidence({ rounds } = {}) {
  const rows = new Map() // `${version}\0${taskId}` -> row
  for (const r of rounds || []) {
    const version = r?.chainVersion ?? null
    const taskId = r?.taskId ?? null
    if (version === null || taskId === null) continue
    for (const a of r.attempts || []) {
      if (a.screenedOut) continue
      const score = Number(a.score)
      if (!Number.isFinite(score)) continue
      const key = `${version}\0${taskId}`
      const cur = rows.get(key)
      if (!cur || score > cur.score) {
        rows.set(key, {
          chainVersion: version,
          taskId,
          score: round6(score),
          verifierOk: a.verifierOk !== false,
          round: r.n ?? null,
          attempt: a.id ?? null,
        })
      }
    }
  }
  return [...rows.values()]
}

/** Rows for one version, keyed by task, for pairing. */
export function byTask(rows, version) {
  const m = new Map()
  for (const row of rows || []) {
    if (row.chainVersion !== version) continue
    m.set(row.taskId, row)
  }
  return m
}

/**
 * Paired comparison of two chain versions.
 *
 * `ok` requires three independent things, and says why when it is false:
 * enough common tasks, a mean gain that clears `minGain`, and no single task
 * regressing by more than `holdoutSlack` (a chain that wins on average by
 * breaking one task is not an improvement).
 */
export function compareChains({ rounds, baseVersion, candidateVersion, minTasks = 6, minGain = 0.05, holdoutSlack = 0.02 } = {}) {
  const rows = chainEvidence({ rounds })
  const base = byTask(rows, baseVersion)
  const cand = byTask(rows, candidateVersion)
  const paired = []
  for (const [taskId, c] of cand) {
    const b = base.get(taskId)
    if (b) paired.push({ taskId, base: b.score, candidate: c.score, delta: round6(c.score - b.score) })
  }
  const n = paired.length
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
  const baseScore = round6(mean(paired.map((p) => p.base)))
  const candidateScore = round6(mean(paired.map((p) => p.candidate)))
  const delta = round6(candidateScore - baseScore)
  const worst = paired.reduce((w, p) => (w === null || p.delta < w.delta ? p : w), null)

  const checks = {
    enoughTasks: n >= Number(minTasks),
    gain: delta >= Number(minGain) - EPS,
    noRegression: !worst || worst.delta >= -Math.abs(Number(holdoutSlack)) - EPS,
  }
  const reason = !checks.enoughTasks
    ? 'not-enough-tasks'
    : !checks.gain
      ? 'gain-too-small'
      : !checks.noRegression
        ? 'regressed-a-task'
        : 'promote'

  return {
    ok: reason === 'promote',
    reason,
    checks,
    paired,
    pairedTasks: n,
    baseScore,
    candidateScore,
    delta,
    worst,
    baseVersion,
    candidateVersion,
  }
}

/** How many distinct tasks a version has been scored on. */
export function coverage(rounds) {
  const rows = chainEvidence({ rounds })
  const m = new Map()
  for (const r of rows) m.set(r.chainVersion, (m.get(r.chainVersion) || 0) + 1)
  return [...m.entries()].map(([version, tasks]) => ({ version, tasks })).sort((a, b) => a.version - b.version)
}
