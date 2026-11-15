// From repeated verified work to a procedure.
//
// The knowledge tree already knows how to *show* a procedure (select.js), how to
// count whether it paid for itself (trials) and how to retire it (trialVerdict).
// It had no producer: procedures only existed if a human wrote one into the
// ledger. This module is that producer, and it is deliberately conservative.
//
// A lesson says "this was true once". A procedure says "this was true in the
// same situation more than once, and here is the sequence of files that made it
// true". It is induced from `minSupport` independent promotions on the same
// subject -- never from a single success, and never from a failure. A failure on
// that subject is not discarded: it becomes a `notWhen` condition, because the
// one thing the transfer literature agrees on is that a lesson applied where it
// has already failed is worse than no lesson at all.

import { lessonFiles, shapeOf } from './impact.js'

const DEFAULT_MIN_SUPPORT = 2
const MAX_STEPS = 6

/** Stable id from the family and subject: same evidence, same name, any order. */
function hashId(input) {
  // FNV-1a, 32 bit, hex. Not a security boundary; a name that does not move
  // when the array order moves.
  let h = 0x811c9dc5
  const s = String(input)
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

function attemptId(attempt) {
  return typeof attempt?.id === 'string' && attempt.id ? attempt.id : null
}

function familyOf(attempt) {
  return typeof attempt?.family === 'string' && attempt.family ? attempt.family : '*'
}

function subjectOf(attempt) {
  const files = lessonFiles(attempt)
  return files[0] ?? familyOf(attempt)
}

function promoted(attempt) {
  if (!attempt || typeof attempt !== 'object') return false
  if (attempt.screenedOut || attempt.abandoned) return false
  return attempt.promotable === true || (attempt.verifierOk === true && Number(attempt.score) >= 1)
}

function shapeTokens(attempts) {
  const out = new Set()
  for (const a of attempts) for (const s of shapeOf(a)) out.add(s)
  return [...out].sort()
}

/** Failures on the same subject are conditions, not noise. */
function conditionsFrom(failures) {
  const tokens = new Set()
  const pitfalls = []
  for (const a of failures) {
    const shapes = shapeOf(a)
    for (const s of shapes) {
      if (s === 'solved' || s === 'unsolved') continue
      tokens.add(s)
    }
    const why = a?.error ? String(a.error).split('\n')[0].slice(0, 120) : null
    // Name the condition, not only the exception: a reader has to recognise
    // the situation, not the stack trace of the attempt that first hit it.
    const shape = shapes.find((s) => s !== 'solved' && s !== 'unsolved') ?? 'failure'
    pitfalls.push(why ? `an earlier attempt on this subject ended in ${shape}: ${why}` : `an earlier attempt on this subject ended in ${shape}`)
  }
  return { notWhen: [...tokens].sort(), pitfalls: [...new Set(pitfalls)].slice(0, 4) }
}

function stepsFrom(support, { files = false } = {}) {
  const counts = new Map()
  for (const a of support) {
    for (const file of lessonFiles(a)) counts.set(file, (counts.get(file) || 0) + 1)
  }
  const ordered = [...counts.entries()]
    .sort((x, y) => (y[1] !== x[1] ? y[1] - x[1] : x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
    .slice(0, MAX_STEPS)
    .map(([file]) => file)
  if (!ordered.length) return []
  if (files) return ordered
  return ordered.map((file, i) => `${i + 1}. change ${file}`)
}

/**
 * Induce procedures from a set of attempts.
 *
 * @param {Array<object>} attempts  attempts as recorded by a round (they carry
 *        `report.changed`, `verifierOk`, `promotable`, `score`, `error`)
 * @param {{existing?: Array<object>, minSupport?: number, round?: number, minSteps?: number, distinctTasks?: boolean, onReject?: Function}} [options]
 * @returns {Array<object>} new procedure lessons, deterministically ordered
 */
export function induceProcedures(attempts, options = {}) {
  const list = Array.isArray(attempts) ? attempts.filter((a) => a && typeof a === 'object') : []
  const minSupport = Number.isFinite(Number(options.minSupport))
    ? Math.max(2, Math.floor(Number(options.minSupport)))
    : DEFAULT_MIN_SUPPORT
  const existing = new Set(
    (Array.isArray(options.existing) ? options.existing : [])
      .map((l) => (typeof l?.id === 'string' ? l.id : null))
      .filter(Boolean),
  )
  const round = Number.isFinite(Number(options.round)) ? Number(options.round) : 0
  // Two rules added after the T2 replay, because the rule was loose in
  // structure: two rounds of the SAME task are a cached answer, and a
  // one-line "change this file" is not a procedure.
  const minSteps = Number.isFinite(Number(options.minSteps)) ? Math.max(1, Math.floor(Number(options.minSteps))) : 2
  const distinctTasks = options.distinctTasks !== false
  const onReject = typeof options.onReject === 'function' ? options.onReject : null

  const groups = new Map()
  for (const attempt of list) {
    const id = attemptId(attempt)
    if (!id) continue
    const key = `${familyOf(attempt)}\u0000${subjectOf(attempt)}`
    let group = groups.get(key)
    if (!group) {
      group = { family: familyOf(attempt), subject: subjectOf(attempt), wins: [], losses: [] }
      groups.set(key, group)
    }
    if (promoted(attempt)) {
      if (!group.wins.some((a) => a.id === id)) group.wins.push(attempt)
    } else {
      group.losses.push(attempt)
    }
  }

  const out = []
  for (const group of groups.values()) {
    if (group.wins.length < minSupport) continue
    if (!group.family || !group.subject) continue
    const id = `proc-${hashId(`${group.family}\u0000${group.subject}`)}`
    if (existing.has(id)) continue

    const support = group.wins.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    const taskIds = [...new Set(support.map((a) => a.taskId).filter((t) => typeof t === 'string' && t))]
    if (distinctTasks && taskIds.length < minSupport) {
      if (onReject) onReject('same-task', { family: group.family, subject: group.subject, ids: support.map((a) => a.id) })
      continue
    }
    const steps = stepsFrom(support)
    if (steps.length < minSteps) {
      if (onReject) onReject('too-few-steps', { family: group.family, subject: group.subject, ids: support.map((a) => a.id) })
      continue
    }
    const { notWhen, pitfalls } = conditionsFrom(group.losses)
    const when = `family ${group.family} and the change touches ${group.subject}`
    const otherFiles = stepsFrom(support, { files: true }).filter((f) => f !== group.subject)
    const claim =
      support.length === 1
        ? `1 verified promotion on ${taskIds.length || 1} task began at ${group.subject}.`
        : `${support.length} verified promotions on ${taskIds.length} task(s) began at ${group.subject}; together they also changed ${otherFiles.length} other file(s).`

    out.push({
      id,
      family: group.family,
      taskIds,
      tags: [],
      kind: 'procedure',
      title: `Working through ${group.subject}`,
      when,
      steps,
      pitfalls,
      notWhen,
      claim,
      evidence: `round ${round} induced from attempts ${support.map((a) => a.id).join(', ')}`,
      derivedFrom: support.map((a) => a.id),
      support: support.map((a) => a.id),
      files: lessonFiles(support[0]).slice(0, 8),
      subject: group.subject,
      shape: shapeTokens(support),
      confidence: Math.min(0.9, 0.5 + 0.1 * support.length),
      status: 'active',
      createdRound: round,
      ttlRounds: 24,
      useCount: 0,
      gainSum: 0,
      harmCount: 0,
      lastUsedRound: null,
      trials: { shown: 0, wins: 0, losses: 0 },
    })
  }

  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return out
}
