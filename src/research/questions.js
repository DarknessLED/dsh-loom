// Questions outlive the conversation that raised them.
//
// A research pass produces two kinds of output: answers, and the questions it
// could not answer. The second kind is what gets lost. Next month the same gap
// is discovered again, at the same price, and nothing accumulates. This file is
// the smallest thing that fixes that: an append-only ledger of questions, each
// one required to name what would close it.
//
// Why each rule exists:
//
//   * `closedBy` is mandatory — "is the gate honest?" cannot be worked on;
//     "three independent flake-rate measurements, each over 100 runs" can;
//   * closing requires an answer — a question marked done without one is a
//     question that will be asked again;
//   * parking exists so that "no budget" is a state, not a deletion: a parked
//     question stays on the books and is not silently reopened;
//   * dedupe is by question text (case- and space-insensitive) so that asking
//     twice adds no second record.
//
// Storage: `<home>/research/questions.jsonl`, one event per line:
//   {kind:'opened'|'closed'|'parked', id, at, ...}
// State is derived by replaying the events, so the file is the record.

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'

const QUESTIONS_FILE = 'research/questions.jsonl'
const DAY_MS = 86_400_000

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function fileOf(home) {
  return join(String(home), QUESTIONS_FILE)
}

/**
 * Identity of a question: its words, not its punctuation.
 *
 * "Does the flake rate exceed 5%?" and "does the flake rate exceed 5%" are one
 * question; treating them as two is how a ledger fills with near-duplicates and
 * stops being read.
 */
function questionIdentity(text) {
  return clean(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function questionId(text) {
  return `q-${createHash('sha256').update(questionIdentity(text)).digest('hex').slice(0, 12)}`
}

/** Read events defensively: a torn line is skipped, never fatal. */
export function readQuestionEvents(home) {
  let text
  try {
    text = readFileSync(fileOf(home), 'utf8')
  } catch {
    return []
  }
  const out = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') out.push(parsed)
    } catch {
      /* torn line */
    }
  }
  return out
}

function append(home, record) {
  const file = fileOf(home)
  mkdirSync(dirname(file), { recursive: true })
  let prefix = ''
  try {
    const text = readFileSync(file, 'utf8')
    if (text.length > 0 && !text.endsWith('\n')) prefix = '\n'
  } catch {
    /* new file */
  }
  appendFileSync(file, `${prefix}${JSON.stringify(record)}\n`)
}

/** Replay events into the current state of every question. */
export function researchQuestions(home) {
  const byId = new Map()
  for (const ev of readQuestionEvents(home)) {
    if (!ev.id) continue
    if (ev.kind === 'opened') {
      byId.set(ev.id, {
        id: ev.id,
        question: clean(ev.question),
        closedBy: clean(ev.closedBy),
        scope: clean(ev.scope) || null,
        tags: Array.isArray(ev.tags) ? ev.tags.filter((t) => typeof t === 'string') : [],
        status: 'open',
        openedAt: Number(ev.at) || null,
      })
      continue
    }
    const existing = byId.get(ev.id)
    if (!existing) continue
    if (ev.kind === 'closed') {
      existing.status = 'closed'
      existing.answer = clean(ev.answer)
      existing.evidenceIds = Array.isArray(ev.evidenceIds) ? ev.evidenceIds.filter(Boolean) : []
      existing.closedAt = Number(ev.at) || null
      existing.closedByActor = clean(ev.by) || null
    } else if (ev.kind === 'parked') {
      existing.status = 'parked'
      existing.parkReason = clean(ev.reason) || null
      existing.parkedAt = Number(ev.at) || null
    } else if (ev.kind === 'read-outcome') {
      // What came of a read, recorded separately because the answer arrives
      // later than the spend: the leg buys before the worker writes, and a round
      // that dies in between still spent it. This must never bump `reads`.
      if (ev.used === true) existing.usedAtLeastOnce = true
      if (ev.promoted === true) existing.promotedAfterRead = true
      existing.lastOutcomeAt = Number(ev.at) || existing.lastOutcomeAt || null
    } else if (ev.kind === 'read') {
      // A read is not a verdict, so it does not change the status. It is a fact
      // about the reader: this campaign spent a round's allowance asking it.
      // Counting them is what turns the ledger from a loop into a queue -- on
      // 2026-11-26 seven campaigns had read the same oldest entry thirteen times.
      existing.reads = (Number(existing.reads) || 0) + 1
      existing.readBy = Array.isArray(existing.readBy) ? existing.readBy : []
      const who = clean(ev.campaign)
      if (who && !existing.readBy.includes(who)) existing.readBy.push(who)
      existing.lastReadAt = Number(ev.at) || existing.lastReadAt || null
      if (ev.used === true) existing.usedAtLeastOnce = true
      if (ev.promoted === true) existing.promotedAfterRead = true
    }
  }
  return [...byId.values()].sort((a, b) => (a.openedAt ?? 0) - (b.openedAt ?? 0))
}

/**
 * Open a question.
 *
 * @returns the question record, with `duplicate: true` when the text is already
 *          on the books (a duplicate append is not an error, it is a no-op).
 */
export function addQuestion(home, { question, closedBy, scope, tags } = {}) {
  const text = clean(question)
  if (!text) throw new Error('a question needs its text')
  const closing = clean(closedBy)
  if (!closing) throw new Error('a question must say what would close it (closedBy)')

  const id = questionId(text)
  const existing = researchQuestions(home).find((q) => q.id === id)
  if (existing) return { ...existing, duplicate: true }

  append(home, {
    kind: 'opened',
    id,
    question: text,
    closedBy: closing,
    scope: clean(scope) || null,
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string') : [],
    at: Date.now(),
  })
  return researchQuestions(home).find((q) => q.id === id)
}

/** Close a question, with the answer and what the answer rests on. */
export function closeQuestion(home, { id, answer, evidenceIds, by } = {}) {
  const key = clean(id)
  if (!key) throw new Error('closing needs a question id')
  const existing = researchQuestions(home).find((q) => q.id === key)
  if (!existing) throw new Error(`unknown question: ${key}`)
  const body = clean(answer)
  if (!body) throw new Error('a close needs an answer; closing without one is a lie')

  append(home, {
    kind: 'closed',
    id: key,
    answer: body,
    evidenceIds: Array.isArray(evidenceIds) ? evidenceIds.filter(Boolean) : [],
    by: clean(by) || 'human',
    at: Date.now(),
  })
  return researchQuestions(home).find((q) => q.id === key)
}

/** Park a question: still on the books, no longer open. */
export function parkQuestion(home, { id, reason } = {}) {
  const key = clean(id)
  if (!key) throw new Error('parking needs a question id')
  const existing = researchQuestions(home).find((q) => q.id === key)
  if (!existing) throw new Error(`unknown question: ${key}`)

  append(home, { kind: 'parked', id: key, reason: clean(reason) || null, at: Date.now() })
  return researchQuestions(home).find((q) => q.id === key)
}

/**
 * Record that a round read this question.
 *
 * Not a status change and not a verdict: the question is still open, and the
 * ledger still does not know the answer. What it knows is that somebody spent a
 * read on it, which is what lets the leg prefer the questions nobody has touched
 * instead of re-reading the oldest one in every campaign.
 *
 * An unknown id is refused rather than silently creating an entry: a read of a
 * question that is not on the books is a bug in the caller, and inventing a
 * record for it would hide the bug behind a plausible count.
 */
export function recordQuestionRead(home, { id, campaign, round, used, promoted, at, outcome = false } = {}) {
  const key = clean(id)
  if (!key) throw new Error('recording a read needs a question id')
  const existing = researchQuestions(home).find((q) => q.id === key)
  if (!existing) throw new Error(`unknown question: ${key}`)

  append(home, {
    kind: outcome ? 'read-outcome' : 'read',
    id: key,
    campaign: clean(campaign) || null,
    round: Number.isFinite(Number(round)) ? Number(round) : null,
    used: used === true ? true : used === false ? false : null,
    promoted: promoted === true,
    at: Number.isFinite(Number(at)) ? Number(at) : Date.now(),
  })
  return researchQuestions(home).find((q) => q.id === key)
}

/** Open questions, oldest first, each carrying its age in days. */
export function openQuestions(home, { now = Date.now() } = {}) {
  const at = Number.isFinite(now) ? now : Date.now()
  return researchQuestions(home)
    .filter((q) => q.status === 'open')
    .map((q) => ({
      ...q,
      ageDays: q.openedAt === null ? null : Math.floor((at - q.openedAt) / DAY_MS),
    }))
    .sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1))
}

/**
 * One line for the status panel: how many are open, and which one has waited
 * longest. Naming one keeps the line actionable instead of decorative.
 */
export function renderQuestionLine(open) {
  const list = Array.isArray(open) ? open : []
  if (!list.length) return 'no open question — nothing is waiting on an answer'
  const suffix = list.length === 1 ? '' : 's'
  const oldest = list.reduce((best, q) => {
    if (!best) return q
    return (q.ageDays ?? 0) > (best.ageDays ?? 0) ? q : best
  }, null)
  const age = Number.isFinite(oldest?.ageDays) ? `${oldest.ageDays}d` : 'unknown age'
  const scope = oldest?.scope ? `${oldest.scope} ` : ''
  const text = String(oldest?.question ?? '').slice(0, 120)
  return `${list.length} open question${suffix} — oldest ${age}: ${scope}${text}`
}
