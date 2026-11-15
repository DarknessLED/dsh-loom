// Offline consolidation ("dream") for the knowledge tree.
//
// A campaign produces lessons one round at a time, from one worker's point of
// view. Read together later, that stream contains three different things:
//
//   * duplicates — the same mechanism discovered twice, in different words;
//   * contradictions — two active claims that pull opposite ways for the same
//     subject, which is a question, not a lesson;
//   * stale claims — expired by TTL, or "used enough and never paid".
//
// Consolidation is the pass that separates them. It never invents a claim: a
// merged lesson is the evidence of its parts, and a contradiction becomes a
// question for the next research round. Pure functions, deterministic.

import { isExpired } from './select.js'

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'that', 'this', 'is', 'are', 'was', 'were', 'be', 'by', 'as', 'at', 'it', 'its', 'from', 'than', 'then', 'so', 'not', 'no', 'into', 'when', 'which'])

const UP = /\b(raise[sd]?|increase[sd]?|improve[sd]?|gain[sd]?|help[sd]?|helps?|better|faster|reduces?|reduced)\b/i
const DOWN = /\b(lower[sd]?|decrease[sd]?|hurt[sd]?|harm[sd]?|worse|slower|degrades?|degraded|raises cost)\b/i

function toObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function finite(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function tokens(claim) {
  return new Set(
    String(claim ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const x of a) if (b.has(x)) shared++
  return shared / (a.size + b.size - shared)
}

function mergeGroup(group) {
  const sorted = [...group].sort((a, b) => {
    const ca = finite(a.confidence)
    const cb = finite(b.confidence)
    if (cb !== ca) return cb - ca
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const head = sorted[0]
  return {
    ...head,
    confidence: Math.round(sorted.reduce((s, l) => s + finite(l.confidence), 0) / sorted.length * 1e6) / 1e6,
    useCount: sorted.reduce((s, l) => s + finite(l.useCount), 0),
    gainSum: Math.round(sorted.reduce((s, l) => s + finite(l.gainSum), 0) * 1e6) / 1e6,
    harmCount: sorted.reduce((s, l) => s + finite(l.harmCount), 0),
    mergedFrom: sorted.map((l) => l.id).sort(),
  }
}

/**
 * Fold a lesson list.
 * @returns {{lessons: Array, merged: Array, retired: string[], questions: Array}}
 */
export function consolidate(lessons, options = {}) {
  const round = finite(toObject(options).round, 0)
  const threshold = finite(toObject(options).threshold, 0.8)
  const list = Array.isArray(lessons) ? lessons.filter((l) => l && typeof l.id === 'string') : []

  const retired = []
  const alive = []
  for (const lesson of list) {
    if (isExpired(lesson, { round })) retired.push(lesson.id)
    else if (lesson.status !== 'active') retired.push(lesson.id)
    else alive.push(lesson)
  }

  // Union-find over near-duplicate claims within the same family.
  const parent = new Map(alive.map((l) => [l.id, l.id]))
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)))
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  const tokenOf = new Map(alive.map((l) => [l.id, tokens(l.claim)]))
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]
      const b = alive[j]
      if ((a.family ?? '') !== (b.family ?? '')) continue
      if (jaccard(tokenOf.get(a.id), tokenOf.get(b.id)) >= threshold) union(a.id, b.id)
    }
  }

  const groups = new Map()
  for (const lesson of alive) {
    const root = find(lesson.id)
    const bucket = groups.get(root) || []
    bucket.push(lesson)
    groups.set(root, bucket)
  }

  const merged = []
  const kept = []
  for (const group of groups.values()) {
    const record = mergeGroup(group)
    kept.push(record)
    if (group.length > 1) merged.push({ id: record.id, mergedFrom: record.mergedFrom })
  }

  // Contradictions: same family + same subject, but opposite polarity.
  const questions = []
  const byScope = new Map()
  for (const lesson of kept) {
    const subject = String(lesson.subject ?? lesson.files?.[0] ?? '').trim()
    if (!subject) continue
    const key = `${lesson.family ?? ''}\u0000${subject}`
    const bucket = byScope.get(key) || []
    bucket.push(lesson)
    byScope.set(key, bucket)
  }
  for (const [key, bucket] of byScope) {
    const subject = key.split('\u0000')[1]
    const up = bucket.find((l) => UP.test(String(l.claim ?? '')))
    const down = bucket.find((l) => DOWN.test(String(l.claim ?? '')))
    if (up && down && up.id !== down.id) {
      const [a, b] = [up.id, down.id].sort()
      questions.push({
        kind: 'contradiction',
        a,
        b,
        subject,
        question: `two active lessons disagree about ${subject}: one says a mechanism raises the score, the other says it lowers it. Which is true here, and under what conditions?`,
      })
    }
  }

  kept.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  merged.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  retired.sort()
  questions.sort((a, b) => (a.question < b.question ? -1 : 1))
  return { lessons: kept, merged, retired, questions }
}
