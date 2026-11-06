// Round board: append-only JSONL notes shared by sibling attempts of one round.
// No dependencies, no I/O outside the given file's directory.
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const NOTE_KINDS = ['obstacle', 'finding', 'approach']
const KIND_SET = new Set(NOTE_KINDS)

const MAX_TEXT = 400
const DEFAULT_LIMIT = 10
const DEFAULT_MAX = 50
const DEFAULT_MAX_CHARS = 700
const ELLIPSIS = '…'

function isPositiveInt(n) {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

function assertFile(file) {
  if (typeof file !== 'string') throw new TypeError('file must be a string')
}

/** <campaignDir>/rounds/<roundN>/board.jsonl */
export function boardPath(campaignDir, roundN) {
  if (typeof campaignDir !== 'string') throw new TypeError('campaignDir must be a string')
  if (!isPositiveInt(roundN)) throw new TypeError('roundN must be a positive integer')
  return join(campaignDir, 'rounds', String(roundN), 'board.jsonl')
}

/** lowercase, collapse whitespace runs to one space, trim */
export function normalizeText(text) {
  if (typeof text !== 'string') return ''
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizeLimit(limit) {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_LIMIT
  if (limit <= 0) return 0
  return Math.floor(limit)
}

/** All structurally valid notes in file order; [] on any filesystem problem. */
function readAll(file) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const out = []
  for (const line of text.split('\n')) {
    const raw = line.trim()
    if (!raw) continue
    let note
    try {
      note = JSON.parse(raw)
    } catch {
      continue // torn/corrupt line
    }
    if (!note || typeof note !== 'object' || Array.isArray(note)) continue
    if (typeof note.kind !== 'string' || !KIND_SET.has(note.kind)) continue
    if (typeof note.text !== 'string') continue
    out.push({
      attempt: typeof note.attempt === 'string' ? note.attempt : '',
      kind: note.kind,
      text: note.text,
      t: typeof note.t === 'number' && Number.isFinite(note.t) ? note.t : 0,
    })
  }
  return out
}

function dedupeKey(note) {
  return `${note.kind}\u0000${normalizeText(note.text)}`
}

/** Collapse same-kind/same-normalized-text notes onto the newest occurrence. */
function dedupe(notes) {
  const counts = new Map()
  const lastAt = new Map()
  for (let i = 0; i < notes.length; i += 1) {
    const key = dedupeKey(notes[i])
    counts.set(key, (counts.get(key) ?? 0) + 1)
    lastAt.set(key, i)
  }
  const out = []
  for (let i = 0; i < notes.length; i += 1) {
    const key = dedupeKey(notes[i])
    if (lastAt.get(key) !== i) continue
    out.push({ ...notes[i], count: counts.get(key) })
  }
  return out
}

export function appendNote(file, note) {
  assertFile(file)
  if (!note || typeof note !== 'object' || Array.isArray(note)) return { ok: false, reason: 'empty' }

  const text = typeof note.text === 'string' ? note.text.trim() : ''
  if (!text) return { ok: false, reason: 'empty' }
  if (text.length > MAX_TEXT) return { ok: false, reason: 'too-long' }
  if (typeof note.kind !== 'string' || !KIND_SET.has(note.kind)) return { ok: false, reason: 'bad-kind' }

  const entry = {
    ...note,
    attempt: typeof note.attempt === 'string' ? note.attempt : '',
    kind: note.kind,
    text,
    t: Date.now(),
  }
  try {
    mkdirSync(dirname(file), { recursive: true })
    appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8')
  } catch {
    return { ok: false, reason: 'write-failed' }
  }
  return { ok: true, note: entry }
}

export function readNotes(file, opts = {}) {
  assertFile(file)
  const { kinds, excludeAttempt } = opts ?? {}
  const limit = normalizeLimit(opts?.limit)

  let notes = readAll(file)
  if (typeof excludeAttempt === 'string' && excludeAttempt) {
    notes = notes.filter((n) => n.attempt !== excludeAttempt)
  }
  if (Array.isArray(kinds) && kinds.length > 0) {
    const allowed = new Set(kinds.filter((k) => typeof k === 'string'))
    notes = notes.filter((n) => allowed.has(n.kind))
  }
  notes = dedupe(notes)
  if (limit > 0 && notes.length > limit) notes = notes.slice(-limit)
  return limit === 0 ? [] : notes
}

export function pruneNotes(file, opts = {}) {
  assertFile(file)
  const max = typeof opts?.max === 'number' && Number.isFinite(opts.max) && opts.max >= 0
    ? Math.floor(opts.max)
    : DEFAULT_MAX

  const notes = dedupe(readAll(file))
  const dropped = Math.max(0, notes.length - max)
  if (dropped === 0) return { kept: notes.length, dropped: 0 }

  const kept = notes.slice(-max)
  const body = kept.map((n) => `${JSON.stringify({ attempt: n.attempt, kind: n.kind, text: n.text, t: n.t })}\n`).join('')
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(tmp, body, 'utf8')
    renameSync(tmp, file)
  } catch {
    // Leave the original file untouched and report nothing as dropped.
    return { kept: notes.length, dropped: 0 }
  }
  return { kept: kept.length, dropped }
}

export function summarizeNotes(notes, opts = {}) {
  if (!Array.isArray(notes) || notes.length === 0) return ''
  const raw = opts?.maxChars
  const maxChars = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_MAX_CHARS
  if (maxChars <= 0) return ''

  const lines = notes
    .filter((n) => n && typeof n === 'object')
    .map((n) => `- [${n.kind}] ${String(n.text ?? '').replace(/\s+/g, ' ').trim()}`)
  if (lines.length === 0) return ''
  const full = lines.join('\n')
  if (full.length <= maxChars) return full
  return `${full.slice(0, maxChars - 1)}${ELLIPSIS}`
}
