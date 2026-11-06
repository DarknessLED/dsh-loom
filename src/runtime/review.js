/**
 * Pending-decision queue: rank what needs a human by how much it can hurt.
 *
 * Checkpoints were listed in arrival order, so overnight a holdout regression
 * and an empty-patch anomaly could sit below three routine gate holds and the
 * human had to read every payload to find the dangerous one. This module is a
 * pure projection — no clock, no IO, no host: it turns the open checkpoints of
 * a campaign into a queue ordered by risk, then age, then id, with a one-line
 * summary and a verb-phrase recommendation that a status card can render.
 *
 * Risk is a property of the checkpoint kind, not of the payload: a holdout
 * regression means the code that travelled is unproven, and an anomaly means
 * the loop could not explain what it saw. Both outrank a routine gate hold or
 * a policy proposal; a plateau is a pacing hint, not a hazard.
 */

const RISK_BY_KIND = {
  holdout: 'high',
  anomaly: 'high',
  gate: 'normal',
  policy: 'normal',
  plateau: 'low',
}

const RANK = { high: 0, normal: 1, low: 2 }
const MAX_SUMMARY = 160
const FALLBACK_KIND = 'checkpoint'

const RECOMMENDATION = {
  gate: 'review the diff, then apply or reject the patch',
  holdout: 'inspect the holdout regression before promoting',
  anomaly: 'check the workspace, then retry or stop the round',
  policy: 'review the policy diff, then activate or reject it',
  plateau: 'adjust the objective or stop the campaign',
}
const FALLBACK_RECOMMENDATION = 'review the decision and respond'

function kindOf(checkpoint) {
  const kind = checkpoint?.kind
  return typeof kind === 'string' && kind ? kind : FALLBACK_KIND
}

function riskOf(kind) {
  return RISK_BY_KIND[kind] ?? 'low'
}

/** Collapse every run of whitespace (including newlines) to a single space. */
function oneLine(text) {
  return String(text).replace(/\s+/g, ' ').trim()
}

/** Hard cap, measured on the same string the caller renders. */
function clip(text, max = MAX_SUMMARY) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

/** Oldest first; a checkpoint with no usable timestamp sorts as oldest. */
function atOf(checkpoint) {
  const raw = checkpoint?.at ?? checkpoint?.raisedAt
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

/**
 * The human-readable part of the payload, chosen per kind so the summary says
 * what actually changed rather than dumping raw JSON at the reviewer.
 */
function detailOf(checkpoint) {
  const payload = checkpoint?.payload && typeof checkpoint.payload === 'object' ? checkpoint.payload : {}
  const parts = []
  const add = (value) => {
    if (value === undefined || value === null) return
    const text = String(value).trim()
    if (text) parts.push(text)
  }
  switch (kindOf(checkpoint)) {
    case 'gate':
      if (payload.round !== undefined && payload.round !== null) add(`round ${payload.round}`)
      if (payload.score !== undefined && payload.score !== null) add(`score ${payload.score}`)
      add(payload.patch)
      break
    case 'holdout':
      add(payload.task)
      add(payload.detail)
      break
    case 'anomaly':
      add(payload.message)
      break
    case 'policy':
      if (payload.policyVersion !== undefined && payload.policyVersion !== null) add(`policy v${payload.policyVersion}`)
      add(payload.message)
      break
    case 'plateau':
      if (payload.window !== undefined && payload.window !== null) add(`window ${payload.window}`)
      break
    default:
      add(payload.message)
      add(payload.detail)
      break
  }
  if (!parts.length) {
    const keys = Object.keys(payload)
    if (!keys.length) return 'no payload'
    try {
      parts.push(JSON.stringify(payload))
    } catch {
      parts.push(keys.join(', '))
    }
  }
  return parts.join(' · ')
}

function summaryOf(checkpoint) {
  const kind = kindOf(checkpoint)
  const text = oneLine(`${kind}: ${detailOf(checkpoint)}`)
  return clip(text) || clip(`checkpoint ${checkpoint?.id ?? '?'}`)
}

function recommendationOf(checkpoint) {
  return RECOMMENDATION[kindOf(checkpoint)] || FALLBACK_RECOMMENDATION
}

/** Open checkpoints from either the runtime status view or the reduced state. */
function openCheckpointsOf(state) {
  if (Array.isArray(state)) return state
  if (!state || typeof state !== 'object') return []
  if (Array.isArray(state.openCheckpoints)) return state.openCheckpoints
  if (Array.isArray(state.checkpoints)) {
    return state.checkpoints.filter((checkpoint) => checkpoint && checkpoint.status === 'open')
  }
  return []
}

/**
 * Rank the pending human decisions: risk desc, then raisedAt asc, then id.
 *
 * @param {{openCheckpoints?: Array<object>, checkpoints?: Array<object>} | Array<object>} state
 * @returns {Array<{id: string, kind: string, risk: 'high'|'normal'|'low', summary: string, recommendation: string}>}
 */
export function reviewQueue(state) {
  return openCheckpointsOf(state)
    .filter((checkpoint) => checkpoint && typeof checkpoint === 'object')
    .map((checkpoint) => ({
      id: checkpoint.id === undefined || checkpoint.id === null ? '' : String(checkpoint.id),
      kind: kindOf(checkpoint),
      risk: riskOf(kindOf(checkpoint)),
      summary: summaryOf(checkpoint),
      recommendation: recommendationOf(checkpoint),
      at: atOf(checkpoint),
    }))
    .sort((a, b) => {
      const byRisk = RANK[a.risk] - RANK[b.risk]
      if (byRisk !== 0) return byRisk
      if (a.at !== b.at) return a.at - b.at
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
    .map(({ id, kind, risk, summary, recommendation }) => ({ id, kind, risk, summary, recommendation }))
}
