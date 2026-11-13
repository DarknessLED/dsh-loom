// What a person needs in front of them before saying yes.
//
// The loop asked a human 60 times and every card carried the same thing: a
// templated sentence, and sometimes a score. None of the four facts a reviewer
// actually needs was on any of them -- which task this is, what the diff does,
// what the verifier said, and what could break. A decision made without those is
// a rubber stamp, and a rubber stamp is measurable: the approval rate drifts up
// while nothing about the patches changes.
//
// This module builds those four blocks from what the round already measured. It
// is pure: no clock, no filesystem, no verifier. It cannot invent evidence, and
// when a block is missing it says so instead of leaving it blank -- an empty
// field reads as "fine".

const MAX_PATHS = 8

function num(value) {
  return Number.isFinite(value) ? value : null
}

function cleanText(value, limit = 240) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 1)}…`
}

/**
 * Risk is derived only from things the round already checked.
 *
 * Ordered by how much a reviewer would want to know first: a patch that reaches
 * the thing measuring it is not a risk to be weighed, it is a reason to refuse;
 * a large diff is only a burden, not a fault.
 */
export function assessRisk({ checks = {}, diff = {}, scope = null } = {}) {
  const reasons = []
  let level = 'low'
  const escalate = (next) => {
    if (next === 'high' || (next === 'medium' && level === 'low')) level = next
  }
  if (checks.hasPatch === false) {
    escalate('high')
    reasons.push('no patch on disk: there is nothing here to accept')
  }
  if (checks.testsClean === false) {
    escalate('high')
    reasons.push(
      checks.scope?.violations?.length
        ? `the patch edits a path outside the declared scope: ${checks.scope.violations.slice(0, 4).join(', ')}`
        : 'the patch edits a test file, and no edit scope was declared',
    )
  }
  if (checks.oracleClean === false) {
    escalate('high')
    reasons.push('the patch edits the file the verifier runs')
  }
  if (checks.oracleInBase === false) {
    escalate('high')
    reasons.push('the verifier did not exist in the base commit: a red base is not evidence of work')
  }
  if (checks.beatsIncumbent === false) {
    escalate('high')
    reasons.push('the score does not beat this task\'s best score')
  }
  if (checks.earnedByMetric === false && checks.baseFailed === false) {
    escalate('medium')
    reasons.push('the verdict rests on the base having failed, not on a metric moving')
  }
  const lines = (num(diff.insertions) ?? 0) + (num(diff.deletions) ?? 0)
  if (lines > 400) {
    escalate('medium')
    reasons.push(`large diff for one review: ${lines} changed lines`)
  }
  if (scope && checks.scope && num(checks.scope.checked) === 0) {
    escalate('medium')
    reasons.push('an edit scope was declared but no path was checked against it')
  }
  return { level, reasons }
}

/**
 * The four blocks a reviewer needs, or an explicit "missing" in their place.
 *
 * @param {object} input
 * @param {object} [input.task] the campaign task
 * @param {object} [input.attempt] the attempt that produced the patch
 * @param {number} [input.score]
 * @param {object} [input.checks] the gate's own checks
 * @param {number} [input.policyMinGain]
 * @returns {{task:object, diff:object, verifier:object, risk:object, missing:string[]}}
 */
export function cardEvidence({ task, attempt, score, checks = {}, policyMinGain = null } = {}) {
  const missing = []
  const diff = attempt?.diff && typeof attempt.diff === 'object' ? attempt.diff : null
  const paths = Array.isArray(diff?.filesChanged) ? diff.filesChanged.map((p) => String(p)) : []

  const taskBlock = {
    id: cleanText(task?.id, 80) || null,
    prompt: cleanText(task?.prompt, 200) || null,
    scope: Array.isArray(task?.verify?.scope?.editable) ? task.verify.scope.editable.map((p) => String(p)) : null,
  }
  if (!taskBlock.id) missing.push('task')
  if (!taskBlock.prompt) missing.push('task prompt')

  const diffBlock = {
    files: num(diff?.files) ?? paths.length,
    insertions: num(diff?.insertions) ?? 0,
    deletions: num(diff?.deletions) ?? 0,
    paths: paths.slice(0, MAX_PATHS),
    more: paths.length > MAX_PATHS ? paths.length - MAX_PATHS : 0,
    patchFile: typeof attempt?.patch === 'string' ? attempt.patch : null,
  }
  if (!attempt?.patch) missing.push('patch file')

  const earned = checks.earnedMetric && typeof checks.earnedMetric === 'object' ? checks.earnedMetric : null
  const verifierBlock = {
    ok: checks.verifierOk === true,
    exitCode: num(attempt?.exitCode),
    score: num(score),
    metric: earned ? { name: cleanText(earned.name, 40), from: num(earned.from), to: num(earned.to) } : null,
    earnedReason: cleanText(checks.earnedReason, 80) || null,
    baseFailed: checks.baseFailed === true ? true : checks.baseFailed === false ? false : null,
    minGain: num(policyMinGain),
  }
  if (typeof checks.verifierOk !== 'boolean') missing.push('verifier verdict')
  // Only a red base is a reason on its own. With no metric and a base that did
  // not fail, the card cannot say why this is a gain -- say that, rather than
  // leaving the reader to assume the score is the reason.
  if (!earned && verifierBlock.baseFailed !== true) missing.push('why the verdict is a gain')

  const risk = assessRisk({ checks, diff: diffBlock, scope: checks.scope ?? null })

  return { task: taskBlock, diff: diffBlock, verifier: verifierBlock, risk, missing }
}

/** One-line-per-block rendering, for a checkpoint message. */
export function renderEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') return []
  const lines = []
  const t = evidence.task ?? {}
  const d = evidence.diff ?? {}
  const v = evidence.verifier ?? {}
  const r = evidence.risk ?? {}
  lines.push(`task: ${t.id ?? '?'}${t.prompt ? ` — ${cleanText(t.prompt, 120)}` : ''}`)
  const pathList = (d.paths ?? []).slice(0, 4).join(', ')
  lines.push(
    `diff: ${d.files ?? 0} file(s) +${d.insertions ?? 0} -${d.deletions ?? 0}${pathList ? ` (${pathList}${d.more ? `, +${d.more} more` : ''})` : ''}`,
  )
  const metric = v.metric ? `, ${v.metric.name} ${v.metric.from ?? '?'}→${v.metric.to ?? '?'}` : ''
  lines.push(
    `verifier: ${v.ok ? 'passed' : 'failed'}${v.exitCode === null || v.exitCode === undefined ? '' : ` (exit ${v.exitCode})`}, score ${v.score ?? '?'}${metric}${v.earnedReason ? `, ${v.earnedReason}` : ''}`,
  )
  lines.push(`risk: ${r.level ?? '?'}${(r.reasons ?? []).length ? ` — ${r.reasons.join('; ')}` : ' — none of the checks found a reason to hesitate'}`)
  if ((evidence.missing ?? []).length) lines.push(`missing: ${evidence.missing.join(', ')}`)
  return lines
}
