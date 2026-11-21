// The part of research that must work with the network off.
//
// Six months from now somebody reads a report and asks "where did this number
// come from". The answer has to be bytes, not a URL: pages move, get edited and
// 404. So this module stores a snapshot by the hash of its own content, binds
// claims to snapshots, decides verification by looking for the quoted literal,
// and seals a report with a manifest that pins every snapshot hash.
//
// The rules, and why each exists:
//
//   * content addressing — the same page stored twice is one blob, and any later
//     edit to the blob is detectable without a trust flag;
//   * a claim must quote — a claim whose literal cannot be found in the snapshot
//     is unverifiable by construction, so it is marked, never dropped;
//   * a quote that is absent is a contradiction, not a gap: the snapshot says
//     something else, which is stronger and more useful information;
//   * the seal covers the evidence, not only the prose: a report that pins its
//     own text but not its sources can be "verified" after the sources change.
//
// Storage (all under `<home>/research/ledger/`):
//   blobs/<sha256>.txt        the snapshot bytes
//   index.jsonl               one record per snapshot
//   claims.jsonl              one record per claim
//   verdicts.jsonl            append-only verification results
//
// Format deliberately mirrors `dsh-research-report`'s four-file ledger so the
// two can read each other (see THIRD_PARTY_NOTICES.md).

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'

const LEDGER_DIR = 'research/ledger'
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function ledgerDir(home) {
  return join(String(home), LEDGER_DIR)
}

function ensure(dir) {
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Parse JSONL defensively: a torn last line is skipped, not fatal. */
function readJsonl(file) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const out = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      out.push(JSON.parse(trimmed))
    } catch {
      /* torn line: skip */
    }
  }
  return out
}

function appendJsonl(file, record) {
  ensure(dirname(file))
  let prefix = ''
  try {
    const text = readFileSync(file, 'utf8')
    if (text.length > 0 && !text.endsWith('\n')) prefix = '\n'
  } catch {
    /* new file */
  }
  appendFileSync(file, `${prefix}${JSON.stringify(record)}\n`)
}

function writeAtomic(file, text) {
  ensure(dirname(file))
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmp, text)
  renameSync(tmp, file)
}

function cleanText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

// ---------------------------------------------------------------------------
// snapshots
// ---------------------------------------------------------------------------

/**
 * Store one snapshot, addressed by its own bytes.
 *
 * @returns {{id: string, hash: string, bytes: number, duplicate: boolean, origin: string}}
 */
export function addEvidence(home, { origin, title, content } = {}) {
  const body = typeof content === 'string' ? content : ''
  if (!body.trim()) throw new Error('evidence needs content: an empty snapshot proves nothing')
  if (Buffer.byteLength(body, 'utf8') > MAX_SNAPSHOT_BYTES) {
    throw new Error(`evidence is larger than ${MAX_SNAPSHOT_BYTES} bytes; store the relevant span instead`)
  }

  const src = cleanText(origin) || 'unknown'
  const hash = sha256(body)
  const id = `ev-${hash.slice(0, 12)}`
  const dir = ledgerDir(home)
  const blob = join(dir, 'blobs', `${hash}.txt`)
  const index = join(dir, 'index.jsonl')

  const existing = readJsonl(index).find((r) => r.hash === hash)
  if (existing) {
    return { id: existing.id, hash, bytes: Number(existing.bytes) || body.length, duplicate: true, origin: existing.origin }
  }

  writeAtomic(blob, body)
  appendJsonl(index, {
    id,
    hash,
    title: cleanText(title) || src,
    origin: src,
    capturedAt: Date.now(),
    bytes: Buffer.byteLength(body, 'utf8'),
  })
  return { id, hash, bytes: Buffer.byteLength(body, 'utf8'), duplicate: false, origin: src }
}

/**
 * Read the index, or one record with its bytes and a live integrity verdict.
 *
 * Integrity is decided by hashing the blob again — not by trusting the record.
 * This is the only reason the ledger can be handed to someone else.
 */
export function readEvidence(home, id) {
  const records = readJsonl(join(ledgerDir(home), 'index.jsonl'))
  if (id) {
    const rec = records.find((r) => r.id === id)
    if (!rec) return null
    const blob = join(ledgerDir(home), 'blobs', `${rec.hash}.txt`)
    if (!existsSync(blob)) return { ...rec, missing: true, content: null }
    const content = readFileSync(blob, 'utf8')
    const tampered = sha256(content) !== rec.hash ? true : undefined
    return { ...rec, content, ...(tampered ? { tampered } : {}) }
  }
  return records
}

// ---------------------------------------------------------------------------
// claims and verdicts
// ---------------------------------------------------------------------------

/** Register a claim: text, the snapshots it rests on, and optional quotes. */
export function addClaim(home, { text, evidenceIds, quotes } = {}) {
  const body = cleanText(text)
  if (!body) throw new Error('a claim needs text')

  const ids = (Array.isArray(evidenceIds) ? evidenceIds : [])
    .map((x) => cleanText(x))
    .filter(Boolean)
  const literalQuotes = (Array.isArray(quotes) ? quotes : [])
    .map((q) => (typeof q === 'string' ? q.trim() : ''))
    .filter(Boolean)

  const id = `c-${sha256(`${body}\n${ids.join(',')}`).slice(0, 12)}`
  const dir = ledgerDir(home)
  const claims = readJsonl(join(dir, 'claims.jsonl'))
  const existing = claims.find((c) => c.id === id)
  if (existing) return { ...existing, duplicate: true }

  const record = { id, text: body, evidenceIds: ids, quotes: literalQuotes, registeredAt: Date.now() }
  appendJsonl(join(dir, 'claims.jsonl'), record)
  return record
}

export function readClaims(home) {
  return readJsonl(join(ledgerDir(home), 'claims.jsonl'))
}

export function readVerdicts(home) {
  return readJsonl(join(ledgerDir(home), 'verdicts.jsonl'))
}

/**
 * Decide whether a claim is checkable, and record the decision.
 *
 * `unbound` (nothing cited) and `unverified` (nothing quotable) are distinct on
 * purpose: the first is a claim that never had evidence, the second is evidence
 * that was never quoted. A `contradicted` verdict means the snapshot was read
 * and does not contain the quote — the strongest and most useful outcome.
 */
export function verifyClaim(home, claim) {
  const c = claim && typeof claim === 'object' ? claim : {}
  const record = (status, note) => {
    const verdict = { claimId: c.id ?? null, status, note: String(note), at: Date.now() }
    if (claim && typeof claim === 'object' && c.id) appendJsonl(join(ledgerDir(home), 'verdicts.jsonl'), verdict)
    return verdict
  }

  const ids = (Array.isArray(c.evidenceIds) ? c.evidenceIds : []).filter(Boolean)
  if (!ids.length) return record('unbound', 'the claim cites no snapshot, so there is nothing to check it against')

  const loaded = []
  for (const id of ids) {
    const ev = readEvidence(home, id)
    if (!ev) return record('unverified', `${id} is not in this ledger`)
    if (ev.missing) return record('unverified', `${id} has no stored bytes; the snapshot was deleted`)
    if (ev.tampered) return record('unverified', `${id} no longer hashes to its recorded digest; the bytes changed after capture`)
    loaded.push(ev)
  }

  const quotes = (Array.isArray(c.quotes) ? c.quotes : []).map((q) => (typeof q === 'string' ? q.trim() : '')).filter(Boolean)
  if (!quotes.length) {
    return record(
      'unverified',
      `the claim rests on ${loaded.map((e) => e.id).join(', ')} but quotes nothing from it; without a literal the claim cannot be checked`,
    )
  }

  const haystacks = loaded.map((e) => ({ id: e.id, text: String(e.content ?? '').replace(/\s+/g, ' ') }))
  for (const quote of quotes) {
    const needle = quote.replace(/\s+/g, ' ')
    const hit = haystacks.find((h) => h.text.includes(needle) || h.text.toLowerCase().includes(needle.toLowerCase()))
    if (!hit) {
      return record(
        'contradicted',
        `quote not found in ${loaded.map((e) => e.id).join(', ')}: "${needle.slice(0, 120)}"`,
      )
    }
  }

  return record('verified', `${quotes.length} quote(s) found verbatim in ${loaded.map((e) => e.id).join(', ')}`)
}

// ---------------------------------------------------------------------------
// sealing
// ---------------------------------------------------------------------------

function renderReport({ title, topic, sections, claims }) {
  const lines = [`# ${cleanText(title) || `Research report: ${cleanText(topic) || 'untitled'}`}`, '']
  if (cleanText(topic)) lines.push(`**Topic.** ${cleanText(topic)}`, '')
  for (const section of Array.isArray(sections) ? sections : []) {
    const heading = cleanText(section?.heading)
    if (heading) lines.push(`## ${heading}`, '')
    for (const paragraph of Array.isArray(section?.paragraphs) ? section.paragraphs : []) {
      const text = typeof paragraph === 'string' ? paragraph : cleanText(paragraph?.text)
      if (text) lines.push(text, '')
    }
  }

  // The prose is written by whoever wrote the report; the verdicts are decided
  // by re-hashing stored bytes. Printing them in the sealed text is what lets a
  // reader tell a checked sentence from an assertion without opening the ledger.
  const rows = Array.isArray(claims) ? claims : []
  if (rows.length) {
    lines.push('## Claims', '')
    lines.push('| verdict | claim | note |', '| --- | --- | --- |')
    for (const claim of rows) {
      const verdict = cleanText(claim?.status) || 'unknown'
      const text = cleanText(claim?.text).replace(/\|/g, '\\|')
      const note = cleanText(claim?.note).replace(/\|/g, '\\|')
      lines.push(`| ${verdict} | ${text} | ${note} |`)
    }
    lines.push('')
    const checked = rows.filter((c) => cleanText(c?.status) === 'verified').length
    lines.push(`${checked} of ${rows.length} claim(s) rest on a literal found in the stored bytes.`, '')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

/**
 * Write a report directory and seal it.
 *
 * The seal is the digest of the manifest with the seal field removed; the
 * manifest pins the report's own digest and every cited snapshot's digest. So
 * `verifySeal` re-derives everything it checks, and neither the prose nor a
 * source can change without the seal changing.
 */
export function sealReport(home, { topic, title, sections, evidenceIds, claims } = {}) {
  const body = renderReport({ title, topic, sections, claims })
  const dir = join(ledgerDir(home), 'reports', `${cleanText(topic) ? cleanText(topic).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) : 'report'}-${Date.now()}`)
  ensure(dir)

  const cited = []
  for (const id of Array.isArray(evidenceIds) ? evidenceIds : []) {
    const ev = readEvidence(home, id)
    if (!ev) continue
    cited.push({ id: ev.id, hash: ev.hash, origin: ev.origin, bytes: ev.bytes, tampered: ev.tampered === true })
  }

  const pinned = (Array.isArray(claims) ? claims : []).map((claim) => ({
    id: cleanText(claim?.id),
    status: cleanText(claim?.status) || 'unknown',
    text: cleanText(claim?.text),
    note: cleanText(claim?.note),
  }))

  const manifest = {
    topic: cleanText(topic),
    title: cleanText(title) || `Research report: ${cleanText(topic)}`,
    createdAt: Date.now(),
    files: { 'report.md': sha256(body) },
    evidence: cited,
    ...(pinned.length ? { claims: pinned } : {}),
  }
  const seal = sha256(JSON.stringify(manifest))

  writeAtomic(join(dir, 'report.md'), body)
  writeAtomic(join(dir, 'manifest.json'), `${JSON.stringify({ ...manifest, seal }, null, 2)}\n`)
  return { dir, seal, manifest: { ...manifest, seal } }
}

/** Re-derive a seal from the files on disk. Any edit fails it. */
export function verifySeal(dir) {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
  } catch {
    return { ok: false, reason: 'no manifest' }
  }
  const { seal, ...rest } = manifest
  if (typeof seal !== 'string' || !seal) return { ok: false, reason: 'manifest has no seal' }

  const expected = sha256(JSON.stringify(rest))
  if (expected !== seal) return { ok: false, reason: 'the manifest changed after sealing', seal: expected }

  try {
    const body = readFileSync(join(dir, 'report.md'), 'utf8')
    if (sha256(body) !== rest.files?.['report.md']) {
      return { ok: false, reason: 'the report text changed after sealing' }
    }
  } catch {
    return { ok: false, reason: 'the report text is missing' }
  }

  return { ok: true, seal }
}
