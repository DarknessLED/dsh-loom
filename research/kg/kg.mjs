#!/usr/bin/env node
// kg — a local, queryable knowledge graph for the dsh-loom research programme.
//
// Why this exists: a tree of markdown notes is unreadable at 300 entries and
// unqueryable at 30. This is a SQLite file with a small CLI, so an agent can ask
// "what do we know about scheduling, and what contradicts it, two hops out" in
// one call.
//
// Storage: one SQLite file next to this script (override with LOOM_KG).
// Needs: node 22.5+ for node:sqlite. No npm dependencies, no server, no GPU.
//
// Node kinds
//   claim      something asserted, with evidence
//   concept    a named idea worth linking to
//   project    a system / product / repo
//   source     a paper, post, or doc we rely on
//   question   an open uncertainty; a gap is a question we could not answer
//   failure    a documented way things go wrong
//   number     a standalone measurement worth citing
//
// Edge relations
//   supports contradicts refines requires supersedes applies-to derived-from
//   measures fails-at same-as

import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const here = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.LOOM_KG || join(here, 'store.sqlite')

const KINDS = ['claim', 'concept', 'project', 'source', 'question', 'failure', 'number', 'analysis']
const RELS = ['supports', 'contradicts', 'refines', 'requires', 'supersedes', 'applies-to',
  'derived-from', 'measures', 'fails-at', 'same-as']

// How a contradiction came out. `both` is not a cop-out: most of these are two
// true measurements taken in different regimes, and naming the regime is the
// decision. `neither` keeps a pair we refuted on both sides.
const VERDICTS = ['both', 'a', 'b', 'neither', 'superseded']

const SCHEMA = `
CREATE TABLE IF NOT EXISTS node (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  source      TEXT,
  confidence  REAL,
  topic       TEXT,
  status      TEXT NOT NULL DEFAULT 'live',
  merged_into TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS node_kind ON node(kind);
CREATE INDEX IF NOT EXISTS node_status ON node(status);
CREATE INDEX IF NOT EXISTS node_topic ON node(topic);

CREATE TABLE IF NOT EXISTS edge (
  from_id    TEXT NOT NULL,
  rel        TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  note       TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (from_id, rel, to_id)
);
CREATE INDEX IF NOT EXISTS edge_to ON edge(to_id);
CREATE INDEX IF NOT EXISTS edge_rel ON edge(rel);

CREATE TABLE IF NOT EXISTS tag (
  node_id TEXT NOT NULL,
  tag     TEXT NOT NULL,
  PRIMARY KEY (node_id, tag)
);
CREATE INDEX IF NOT EXISTS tag_tag ON tag(tag);

-- unicode61 keeps a whole CJK run as a single token, so "调度" would only match
-- a document whose run is exactly that. The grams column holds character
-- bigrams of every CJK run, which makes substring search work without a
-- segmenter. English goes through porter stemming as usual.
CREATE VIRTUAL TABLE IF NOT EXISTS node_fts USING fts5(
  id UNINDEXED, title, body, source, tags, grams,
  tokenize = 'porter unicode61'
);

CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);

-- A contradiction is a decision we have not made. Resolving one must record the
-- decision rather than delete the evidence that produced it: the pair stays, the
-- edge stays, and this table says what we concluded and why. The CLI lists the
-- undecided ones by default and everything with --resolved.
CREATE TABLE IF NOT EXISTS resolution (
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  verdict    TEXT NOT NULL,
  note       TEXT,
  decided_at INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id)
);
`

function open({ create = true } = {}) {
  if (!existsSync(DB_PATH) && !create) {
    fail(`no graph at ${DB_PATH} — run \`kg init\` first`)
  }
  if (!existsSync(dirname(DB_PATH))) mkdirSync(dirname(DB_PATH), { recursive: true })
  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(SCHEMA)
  migrate(db)
  return db
}

// The FTS table's column set is not something ALTER TABLE can fix. Detect the
// old shape once and rebuild the index from the node table, which is the
// authority — that is the whole reason nodes are stored separately from FTS.
function migrate(db) {
  const cols = db.prepare('PRAGMA table_info(node_fts)').all().map((c) => c.name)
  if (cols.includes('grams')) return
  process.stderr.write('kg: rebuilding the full-text index (schema grew a grams column)\n')
  db.exec('DROP TABLE IF EXISTS node_fts')
  db.exec(`CREATE VIRTUAL TABLE node_fts USING fts5(
    id UNINDEXED, title, body, source, tags, grams,
    tokenize = 'porter unicode61'
  )`)
  for (const row of db.prepare('SELECT id FROM node').all()) reindex(db, row.id)
}

function fail(message) {
  process.stderr.write(`kg: ${message}\n`)
  process.exit(1)
}

const now = () => Date.now()

// ---------------------------------------------------------------- write paths

function tagsOf(db, id) {
  return db.prepare('SELECT tag FROM tag WHERE node_id = ? ORDER BY tag').all(id).map((r) => r.tag)
}

function reindex(db, id) {
  db.prepare('DELETE FROM node_fts WHERE id = ?').run(id)
  const n = db.prepare('SELECT * FROM node WHERE id = ?').get(id)
  if (!n) return
  const tags = tagsOf(db, id).join(' ')
  db.prepare('INSERT INTO node_fts (id, title, body, source, tags, grams) VALUES (?,?,?,?,?,?)')
    .run(id, n.title, n.body || '', n.source || '', tags, cjkGrams(`${n.title} ${n.body || ''} ${tags}`))
}

function coerceNode(raw, { topic = null } = {}) {
  const id = String(raw.id || '').trim().toLowerCase()
  if (!id) fail('every node needs an id')
  const kind = String(raw.kind || 'claim').trim().toLowerCase()
  if (!KINDS.includes(kind)) fail(`node ${id}: unknown kind "${kind}" (want one of ${KINDS.join(', ')})`)
  const title = String(raw.title || '').trim()
  if (!title) fail(`node ${id}: needs a title`)
  // null / undefined / "" mean "not stated" and must stay null — Number(null)
  // is 0, which would silently claim certainty-of-nothing on every node.
  const stated = raw.confidence
  const confidence = stated === null || stated === undefined || stated === '' ? NaN : Number(stated)
  return {
    id,
    kind,
    title: title.slice(0, 300),
    body: String(raw.body || '').trim(),
    source: raw.source ? String(raw.source).trim() : null,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : null,
    topic: raw.topic || topic,
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [],
    status: raw.status ? String(raw.status) : 'live',
  }
}

function upsertNode(db, node) {
  const t = now()
  const existing = db.prepare('SELECT id, created_at FROM node WHERE id = ?').get(node.id)
  if (existing) {
    db.prepare(`UPDATE node SET kind=?, title=?, body=?, source=?, confidence=?, topic=?,
                status=?, updated_at=? WHERE id=?`)
      .run(node.kind, node.title, node.body, node.source, node.confidence,
        node.topic ?? null, node.status, t, node.id)
  } else {
    db.prepare(`INSERT INTO node (id, kind, title, body, source, confidence, topic, status,
                merged_into, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NULL,?,?)`)
      .run(node.id, node.kind, node.title, node.body, node.source, node.confidence,
        node.topic ?? null, node.status, t, t)
  }
  for (const tag of node.tags) {
    db.prepare('INSERT OR IGNORE INTO tag (node_id, tag) VALUES (?, ?)').run(node.id, tag)
  }
  reindex(db, node.id)
  return { id: node.id, created: !existing }
}

function upsertEdge(db, edge) {
  const from = String(edge.from || '').toLowerCase().trim()
  const to = String(edge.to || '').toLowerCase().trim()
  const rel = String(edge.rel || '').toLowerCase().trim()
  if (!RELS.includes(rel)) fail(`unknown relation "${rel}" (want one of ${RELS.join(', ')})`)
  const has = (id) => db.prepare('SELECT 1 AS x FROM node WHERE id = ?').get(id)
  if (!has(from)) fail(`edge ${from} -${rel}-> ${to}: no node "${from}"`)
  if (!has(to)) fail(`edge ${from} -${rel}-> ${to}: no node "${to}"`)
  db.prepare('INSERT OR REPLACE INTO edge (from_id, rel, to_id, note, created_at) VALUES (?,?,?,?,?)')
    .run(from, rel, to, edge.note ?? null, now())
}

// ------------------------------------------------------------------- commands

function cmdInit() {
  const db = open()
  db.prepare('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)').run('created_at', String(now()))
  db.close()
  out(`graph ready at ${DB_PATH}`)
}

function cmdAdd(args) {
  const file = args.positionals[0] || fail('add needs a json file (or "-" for stdin)')
  const raw = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8')
  const payload = JSON.parse(raw)
  const db = open()
  const topic = args.values.topic || payload.topic || null
  let created = 0
  let updated = 0
  const seen = []
  for (const n of payload.nodes || []) {
    const r = upsertNode(db, coerceNode(n, { topic }))
    r.created ? created += 1 : updated += 1
    seen.push(r.id)
  }
  for (const g of payload.gaps || []) {
    const text = String(g).trim()
    if (!text) continue
    const id = args.values['gap-prefix'] ? `${args.values['gap-prefix']}-gap-${seen.length + 1}` : `gap-${hash(text)}`
    const r = upsertNode(db, coerceNode({ id, kind: 'question', title: text.slice(0, 200), body: text, tags: ['gap'], topic, confidence: 0.4 }))
    r.created ? created += 1 : updated += 1
    seen.push(r.id)
  }
  let edges = 0
  let dropped = 0
  for (const e of payload.edges || []) {
    try {
      upsertEdge(db, e)
      edges += 1
    } catch (err) {
      dropped += 1
      process.stderr.write(`  skipped edge ${e.from} -${e.rel}-> ${e.to}: ${err.message}\n`)
    }
  }
  db.close()
  out(`nodes +${created} ~${updated} · edges +${edges}` + (dropped ? ` (${dropped} skipped)` : ''))
}

const CJK_RUN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]+/g

// Character bigrams of every CJK run in the text. "调度开销很大" becomes
// "调度 度开 开销 销很 很大", so a two-character query hits it.
export function cjkGrams(text) {
  const grams = []
  for (const run of String(text || '').match(CJK_RUN) || []) {
    if (run.length === 1) { grams.push(run); continue }
    for (let i = 0; i < run.length - 1; i += 1) grams.push(run.slice(i, i + 2))
  }
  return grams.join(' ')
}

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function cmdLink(args) {
  const [from, rel, to] = args.positionals
  if (!from || !rel || !to) fail('usage: kg link <from> <rel> <to> [--note "..."]')
  const db = open()
  upsertEdge(db, { from, rel, to, note: args.values.note })
  db.close()
  out(`${from} -${rel}-> ${to}`)
}

function cmdShow(args) {
  const id = args.positionals[0] || fail('show needs a node id')
  const db = open()
  const n = db.prepare('SELECT * FROM node WHERE id = ?').get(id)
  if (!n) fail(`no node "${id}"`)
  if (args.values.json) {
    out(JSON.stringify({ ...n, tags: tagsOf(db, id), out: neighbors(db, id, 'out'), in: neighbors(db, id, 'in') }, null, 2))
    return
  }
  out(`\n${n.id}  [${n.kind}]  conf ${n.confidence ?? '-'}  ${n.status}${n.topic ? `  topic ${n.topic}` : ''}`)
  out(`${n.title}`)
  if (n.body) out(`\n${wrap(n.body, 96)}`)
  if (n.source) out(`\nsource: ${n.source}`)
  const tags = tagsOf(db, id)
  if (tags.length) out(`tags: ${tags.join(' ')}`)
  const outs = neighbors(db, id, 'out')
  const ins = neighbors(db, id, 'in')
  if (outs.length) {
    out('\n→ ' + outs.map((e) => `${e.rel} ${e.id}`).join('\n→ '))
  }
  if (ins.length) {
    out('\n← ' + ins.map((e) => `${e.id} ${e.rel}`).join('\n← '))
  }
  out('')
}

function neighbors(db, id, direction) {
  return direction === 'out'
    ? db.prepare('SELECT to_id AS id, rel, note FROM edge WHERE from_id = ? ORDER BY rel, to_id').all(id)
    : db.prepare('SELECT from_id AS id, rel, note FROM edge WHERE to_id = ? ORDER BY rel, from_id').all(id)
}

function cmdSearch(args) {
  const terms = args.positionals.join(' ').trim()
  if (!terms) fail('search needs a query')
  const db = open()
  const limit = Number(args.values.limit) || 12
  const kind = args.values.kind
  const sql = `
    SELECT n.id, n.kind, n.title, n.status, n.confidence,
           snippet(node_fts, 2, '«', '»', ' … ', 14) AS snip,
           bm25(node_fts, 6.0, 1.0, 0.4, 2.0, 0.8) AS rank
      FROM node_fts f JOIN node n ON n.id = f.id
     WHERE node_fts MATCH ?
       ${kind ? 'AND n.kind = ?' : ''}
     ORDER BY rank LIMIT ?`
  const params = kind ? [ftsQuery(terms), kind, limit] : [ftsQuery(terms), limit]
  const rows = db.prepare(sql).all(...params)
  if (args.values.json) { out(JSON.stringify(rows, null, 2)); return }
  if (!rows.length) { out('nothing matches'); return }
  for (const r of rows) {
    out(`\n${r.id}  [${r.kind}]  conf ${r.confidence ?? '-'}`)
    out(`  ${r.title}`)
    if (r.snip) out(`  ${r.snip.replace(/\s+/g, ' ').trim()}`)
  }
  out(`\n${rows.length} hit(s)`)
}

// Turn a plain-language query into something FTS5 accepts.
//   english word  -> "schedul"*   (prefix, so scheduling matches)
//   CJK run       -> "调度" AND "度开"   (every bigram must appear somewhere)
//   groups        -> OR'd together
// A one-character CJK query is passed through as-is.
export function ftsQuery(terms) {
  const text = String(terms || '')
  const groups = []
  const latin = text.split(/[^A-Za-z0-9_-]+/).filter((w) => w.length > 1)
  for (const w of latin) groups.push(`"${w.replace(/"/g, '""')}"*`)
  for (const run of text.match(CJK_RUN) || []) {
    const grams = cjkGrams(run).split(' ').filter(Boolean)
    if (!grams.length) continue
    groups.push(grams.map((g) => `"${g}"`).join(' AND '))
  }
  if (!groups.length) {
    const bare = text.trim()
    return bare ? `"${bare.replace(/"/g, '""')}"` : '""'
  }
  return groups.join(' OR ')
}

function cmdAround(args) {
  const id = args.positionals[0] || fail('around needs a node id')
  const depth = Math.min(Number(args.values.depth) || 2, 4)
  const db = open()
  const root = db.prepare('SELECT id, title, kind FROM node WHERE id = ?').get(id)
  if (!root) fail(`no node "${id}"`)
  const rows = db.prepare(`
    WITH RECURSIVE walk(id, depth) AS (
      SELECT ?, 0
      UNION
      SELECT CASE WHEN e.from_id = walk.id THEN e.to_id ELSE e.from_id END, walk.depth + 1
        FROM walk JOIN edge e ON e.from_id = walk.id OR e.to_id = walk.id
       WHERE walk.depth < ?
    )
    SELECT w.depth, n.id, n.kind, n.title FROM walk w JOIN node n ON n.id = w.id
     ORDER BY w.depth, n.kind, n.id`).all(id, depth)
  for (const r of rows) out(`${'  '.repeat(r.depth)}${r.id} [${r.kind}] ${r.title.slice(0, 90)}`)
  out(`\n${rows.length} node(s) within ${depth} hop(s)`)
}

function cmdTag(args) {
  const tag = args.positionals[0] || fail('tag needs a name')
  const db = open()
  const rows = db.prepare(`
    SELECT n.id, n.kind, n.title FROM tag t JOIN node n ON n.id = t.node_id
     WHERE t.tag = ? AND n.status = 'live' ORDER BY n.kind, n.id`).all(tag.toLowerCase())
  if (!rows.length) { out(`no node tagged "${tag}"`); return }
  for (const r of rows) out(`${r.id} [${r.kind}] ${r.title.slice(0, 96)}`)
  out(`\n${rows.length} node(s)`)
}

// Resolve one contradiction. The evidence stays -- the edge and both nodes keep
// existing -- and the decision is recorded beside it, so a later reader can see
// what we concluded without losing why the pair was recorded in the first place.
function cmdResolve(args) {
  const [a, b] = args.positionals
  const verdict = args.values.verdict
  const note = args.values.note
  if (!a || !b) fail('usage: kg resolve <a> <b> --verdict both|a|b|neither|superseded --note "..."')
  if (!VERDICTS.includes(verdict)) fail(`verdict must be one of ${VERDICTS.join(', ')}`)
  if (!note) fail('resolve needs --note: a decision without its reason is not a decision')
  const db = open()
  // Accept the pair in either direction: the edge is stored one way round and
  // nobody should have to look up which.
  const row = db.prepare(`SELECT from_id, to_id FROM edge
     WHERE rel='contradicts' AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))`).get(a, b, b, a)
  if (!row) fail(`no contradiction recorded between "${a}" and "${b}"`)
  db.prepare('INSERT OR REPLACE INTO resolution (from_id, to_id, verdict, note, decided_at) VALUES (?,?,?,?,?)')
    .run(row.from_id, row.to_id, verdict, note, now())
  db.close()
  out(`${row.from_id} vs ${row.to_id}: ${verdict}`)
}

function cmdUnresolve(args) {
  const [a, b] = args.positionals
  if (!a || !b) fail('usage: kg unresolve <a> <b>')
  const db = open()
  const row = db.prepare(`SELECT from_id, to_id FROM edge
     WHERE rel='contradicts' AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))`).get(a, b, b, a)
  if (!row) fail(`no contradiction recorded between "${a}" and "${b}"`)
  const del = db.prepare('DELETE FROM resolution WHERE from_id=? AND to_id=?').run(row.from_id, row.to_id)
  db.close()
  out(del.changes ? `reopened ${row.from_id} vs ${row.to_id}` : `was not resolved: ${row.from_id} vs ${row.to_id}`)
}

function cmdContradictions(args) {
  const db = open()
  const showResolved = Boolean(args.values.resolved)
  const rows = db.prepare(`
    SELECT e.from_id, e.note, e.to_id, a.title AS at, b.title AS bt,
           r.verdict, r.note AS rnote, r.decided_at
      FROM edge e
      JOIN node a ON a.id = e.from_id
      JOIN node b ON b.id = e.to_id
      LEFT JOIN resolution r ON r.from_id = e.from_id AND r.to_id = e.to_id
     WHERE e.rel = 'contradicts' AND (r.verdict IS NULL OR ? = 1)
     ORDER BY (r.verdict IS NOT NULL), e.from_id`).all(showResolved ? 1 : 0)
  if (!rows.length) { out(showResolved ? 'no recorded contradictions' : 'every contradiction has been decided'); return }
  let undecided = 0
  for (const r of rows) {
    const decided = r.verdict ? `  [${r.verdict}]` : ''
    out(`\n${r.from_id}  vs  ${r.to_id}${decided}`)
    out(`  A: ${r.at}`)
    out(`  B: ${r.bt}`)
    if (r.note) out(`  note: ${r.note}`)
    if (r.verdict) out(`  decided: ${r.rnote}`)
    if (!r.verdict) undecided += 1
  }
  out(showResolved
    ? `\n${rows.length} contradiction(s), ${undecided} still undecided`
    : `\n${undecided} contradiction(s) — each is a decision we have not made`)
}

function cmdGaps() {
  const db = open()
  const rows = db.prepare(`
    SELECT id, title, status, confidence FROM node
     WHERE kind = 'question' AND status = 'live' ORDER BY confidence, id`).all()
  if (!rows.length) { out('no open questions'); return }
  for (const r of rows) out(`${r.id}  conf ${r.confidence ?? '-'}  ${r.title.slice(0, 110)}`)
  out(`\n${rows.length} open question(s)`)
}

function cmdStats() {
  const db = open()
  const total = db.prepare("SELECT COUNT(*) AS n FROM node WHERE status = 'live'").get().n
  const byKind = db.prepare("SELECT kind, COUNT(*) AS n FROM node WHERE status='live' GROUP BY kind ORDER BY n DESC").all()
  const edges = db.prepare('SELECT COUNT(*) AS n FROM edge').get().n
  const byRel = db.prepare('SELECT rel, COUNT(*) AS n FROM edge GROUP BY rel ORDER BY n DESC').all()
  const topics = db.prepare("SELECT topic, COUNT(*) AS n FROM node WHERE status='live' AND topic IS NOT NULL GROUP BY topic ORDER BY n DESC").all()
  const orphan = db.prepare(`SELECT COUNT(*) AS n FROM node n WHERE n.status='live'
      AND NOT EXISTS (SELECT 1 FROM edge e WHERE e.from_id=n.id OR e.to_id=n.id)`).get().n
  const noSource = db.prepare(`SELECT COUNT(*) AS n FROM node
      WHERE status='live' AND kind IN ('claim','number','failure') AND (source IS NULL OR source='')`).get().n
  out(`${total} live nodes · ${edges} edges · ${orphan} orphan(s) · ${noSource} unsourced claim(s)`)
  out('')
  out('by kind:  ' + byKind.map((r) => `${r.kind} ${r.n}`).join(' · '))
  out('by rel:   ' + byRel.map((r) => `${r.rel} ${r.n}`).join(' · '))
  if (topics.length) out('by topic: ' + topics.map((r) => `${r.topic} ${r.n}`).join(' · '))
}

function cmdMerge(args) {
  const [keep, ...drops] = args.positionals
  if (!keep || !drops.length) fail('usage: kg merge <keep-id> <drop-id>...')
  const db = open()
  const keepNode = db.prepare('SELECT id FROM node WHERE id = ?').get(keep)
  if (!keepNode) fail(`no node "${keep}"`)
  for (const drop of drops) {
    const n = db.prepare('SELECT id FROM node WHERE id = ?').get(drop)
    if (!n) { process.stderr.write(`  no node "${drop}"\n`); continue }
    // re-point every edge at the survivor, dropping self-loops this creates
    db.prepare('UPDATE OR IGNORE edge SET from_id = ? WHERE from_id = ?').run(keep, drop)
    db.prepare('UPDATE OR IGNORE edge SET to_id = ? WHERE to_id = ?').run(keep, drop)
    db.prepare('DELETE FROM edge WHERE from_id = to_id').run()
    for (const t of tagsOf(db, drop)) {
      db.prepare('INSERT OR IGNORE INTO tag (node_id, tag) VALUES (?, ?)').run(keep, t)
    }
    db.prepare("UPDATE node SET status='merged', merged_into=?, updated_at=? WHERE id=?")
      .run(keep, now(), drop)
    db.prepare('DELETE FROM node_fts WHERE id = ?').run(drop)
  }
  reindex(db, keep)
  db.close()
  out(`merged ${drops.length} node(s) into ${keep}`)
}

// JSON is verbose and every node arrives with the same keys. The pack format is
// one record per block, pipe-separated, so a human can read it in a diff and an
// agent can write it by hand without getting the braces wrong:
//
//   #claim orch-001 | Scheduling beats brute force | conf 0.8 | tags scheduling cost | topic orch
//   body goes here, as many lines as you like
//
// Blank line ends the record, so a blank line *inside* a body is written as a
// line holding a single backslash and decoded on the way back in. Edges are
// their own records:
//
//   > orch-001 applies-to tri-004
//
// Two things this format must not lose, both learned the hard way. The topic is
// a field of its own, because a body is free text and may say anything. And a
// field may itself contain a pipe -- a title like `mean |GAE| of ...` or a source
// quoting `a || b` splits in the middle without escaping -- so a literal pipe is
// written as `\|` and only unescaped separators split. A blank line inside a
// body is written as a line holding a single backslash. Dropping any of the three
// turns a round-trip into silent data loss: the first exercise of this code lost
// 45 topics, truncated 6 bodies, and mangled 5 titles/sources.
const BLANK_LINE_MARK = '\\'

const escapeField = (text) => String(text ?? '').replace(/\|/g, '\\|')
const unescapeField = (text) => String(text ?? '').replace(/\\\|/g, '|')

// Split a header on unescaped pipes only.
function splitFields(header) {
  const fields = []
  let current = ''
  for (let i = 0; i < header.length; i += 1) {
    const ch = header[i]
    if (ch === '\\' && header[i + 1] === '|') { current += '\\|'; i += 1; continue }
    if (ch === '|') { fields.push(current); current = ''; continue }
    current += ch
  }
  fields.push(current)
  return fields.map((f) => f.trim())
}

function encodeBody(body) {
  return String(body || '')
    .split('\n')
    .map((line) => (line.trim() === '' ? BLANK_LINE_MARK : line))
    .join('\n')
}

function decodeBody(lines) {
  return lines.map((line) => (line === BLANK_LINE_MARK ? '' : line)).join('\n').trim()
}

function cmdPack(args) {
  const db = open()
  const topic = args.values.topic
  const where = topic ? 'AND topic = ?' : ''
  const nodes = db.prepare(`SELECT * FROM node WHERE status='live' ${where} ORDER BY topic, kind, id`)
    .all(...(topic ? [topic] : []))
  const parts = []
  for (const n of nodes) {
    const tags = tagsOf(db, n.id)
    const head = `#${n.kind} ${n.id} | ${escapeField(n.title)}` +
      (n.confidence !== null ? ` | conf ${n.confidence}` : '') +
      (tags.length ? ` | tags ${tags.join(' ')}` : '') +
      (n.topic ? ` | topic ${escapeField(n.topic)}` : '') +
      (n.source ? ` | src ${escapeField(n.source)}` : '')
    const body = encodeBody(n.body)
    parts.push([head, body].filter(Boolean).join('\n'))
  }
  const edges = db.prepare(`SELECT e.* FROM edge e JOIN node a ON a.id=e.from_id
      JOIN node b ON b.id=e.to_id ${topic ? 'WHERE a.topic = ?' : ''} ORDER BY e.from_id, e.rel`)
    .all(...(topic ? [topic] : []))
  for (const e of edges) parts.push(`> ${e.from_id} ${e.rel} ${e.to_id}${e.note ? ` | ${escapeField(e.note)}` : ''}`)
  // A decision is part of the graph, not commentary on it: a pack that dropped
  // these would round-trip 174 resolved contradictions back into 174 open ones,
  // silently. The timestamp is deliberately not carried -- when we concluded it is
  // bookkeeping; what we concluded and why is the record.
  const resolutions = db.prepare(`SELECT r.* FROM resolution r JOIN node a ON a.id = r.from_id
      JOIN node b ON b.id = r.to_id ${topic ? 'WHERE a.topic = ?' : ''} ORDER BY r.from_id, r.to_id`)
    .all(...(topic ? [topic] : []))
  for (const r of resolutions) parts.push(`! ${r.from_id} ${r.to_id} | ${r.verdict} | ${escapeField(r.note)}`)
  out(parts.join('\n\n'))
}

function cmdUnpack(args) {
  const file = args.positionals[0] || fail('unpack needs a file (or "-" for stdin)')
  const text = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8')
  const db = open()
  const topic = args.values.topic || null
  let nodes = 0
  let edges = 0
  let decisions = 0
  const blocks = text.split(/\n\s*\n/)
  for (const block of blocks) {
    // Keep every line: a blank line inside a body is already encoded as the
    // marker, so anything still blank here was whitespace around a record.
    const lines = block.split(/\r?\n/)
    if (!lines.length) continue
    const head = lines[0].trim()
    if (!head) continue
    if (head.startsWith('!')) {
      // `! <a> <b> | verdict | note`
      const body = head.replace(/^!\s*/, '')
      const bars = body.split(/(?<!\\)\|/)
      const ids = bars[0].trim().split(/\s+/)
      const verdict = (bars[1] || '').trim().toLowerCase()
      const note = unescapeField((bars[2] || '').trim())
      if (ids.length !== 2 || !VERDICTS.includes(verdict)) {
        process.stderr.write(`  bad resolution line: ${head}\n`)
        continue
      }
      const pair = db.prepare(`SELECT from_id, to_id FROM edge
         WHERE rel='contradicts' AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))`)
        .get(ids[0], ids[1], ids[1], ids[0])
      if (!pair) { process.stderr.write(`  no contradiction recorded between "${ids[0]}" and "${ids[1]}"\n`); continue }
      db.prepare('INSERT OR REPLACE INTO resolution (from_id, to_id, verdict, note, decided_at) VALUES (?,?,?,?,?)')
        .run(pair.from_id, pair.to_id, verdict, note || null, now())
      decisions += 1
      continue
    }
    if (head.startsWith('>')) {
      const m = head.match(/^>\s*(\S+)\s+(\S+)\s+(\S+)(?:\s*\|\s*(.*))?$/)
      if (!m) { process.stderr.write(`  bad edge line: ${head}\n`); continue }
      try { upsertEdge(db, { from: m[1], rel: m[2], to: m[3], note: unescapeField(m[4]) }); edges += 1 }
      catch (err) { process.stderr.write(`  ${err.message}\n`) }
      continue
    }
    const h = head.match(/^#(\w[\w-]*)\s+(\S+)\s*\|\s*(.+)$/)
    if (!h) { process.stderr.write(`  bad node line: ${head}\n`); continue }
    const kind = h[1].toLowerCase()
    const id = h[2].toLowerCase()
    // Fields are pipe-separated on unescaped pipes only; a literal pipe inside a
    // title or a source arrives as `\|`. "conf N", "tags ...", "topic ..." and
    // "src ..." are recognised as fields, anything else is title text in order.
    const titleParts = []
    let confidence = null
    let tags = []
    let source = null
    let nodeTopic = null
    for (const raw of splitFields(h[3])) {
      const c = raw.match(/^conf\s+([\d.]+)$/i)
      const t = raw.match(/^tags\s+(.+)$/i)
      const tp = raw.match(/^topic\s+(\S.*)$/i)
      const sr = raw.match(/^src\s+(\S.*)$/i)
      if (c) confidence = Number(c[1])
      else if (t) tags = t[1].split(/[\s,]+/).map(unescapeField).filter(Boolean)
      else if (tp) nodeTopic = unescapeField(tp[1].trim())
      else if (sr) source = unescapeField(sr[1].trim())
      else titleParts.push(raw)
    }
    const title = unescapeField(titleParts.join(' | '))
    const body = decodeBody(lines.slice(1))
    try {
      upsertNode(db, coerceNode({ id, kind, title, body, source, confidence, tags, topic: nodeTopic ?? topic }, { topic: nodeTopic ?? topic }))
      nodes += 1
    } catch (err) { process.stderr.write(`  ${err.message}\n`) }
  }
  db.close()
  out(`nodes +${nodes} · edges +${edges} · decisions +${decisions}`)
}

function cmdRecent(args) {
  const db = open()
  const n = Number(args.values.limit) || 20
  const rows = db.prepare(`SELECT id, kind, title, topic FROM node WHERE status='live'
      ORDER BY created_at DESC, id DESC LIMIT ?`).all(n)
  for (const r of rows) out(`${r.id} [${r.kind}]${r.topic ? ` ${r.topic}` : ''} ${r.title.slice(0, 96)}`)
}

function cmdSql(args) {
  const text = args.positionals.join(' ')
  if (!text) fail('sql needs a statement')
  const db = open()
  const stmt = db.prepare(text)
  const rows = text.trim().toLowerCase().startsWith('select') ? stmt.all() : (stmt.run(), [])
  out(JSON.stringify(rows, null, 2))
}

function wrap(text, width) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) { lines.push(line.trim()); line = w } else line += ' ' + w
  }
  if (line.trim()) lines.push(line.trim())
  return lines.join('\n')
}

function out(text) { process.stdout.write(text + '\n') }

// ---------------------------------------------------------------------- main

const USAGE = `kg — local knowledge graph for dsh-loom research

  kg init                       create the graph
  kg add <file.json|->          import {nodes, edges, gaps}
  kg pack [--topic t]           dump the graph in the compact pipe format
  kg unpack <file.pack|->       read that format back in
  kg search <terms>             full-text search   [--kind claim] [--limit 12] [--json]
  kg show <id>                  one node with its edges
  kg around <id> [--depth 2]    everything within N hops
  kg link <from> <rel> <to>     add an edge   [--note "..."]
  kg merge <keep> <drop>...     fold duplicates into the survivor
  kg tag <name>                 everything carrying a tag
  kg contradictions             pairs we have not resolved   [--resolved]
  kg resolve <a> <b> --verdict both|a|b|neither|superseded --note "..."
  kg unresolve <a> <b>          reopen a decision
  kg gaps                       open questions
  kg recent [--limit 20]        newest nodes
  kg stats                      shape of the graph
  kg sql "<select ...>"         escape hatch

  pack format, one block per node separated by a blank line:
    #claim orch-001 | title | conf 0.8 | tags scheduling cost | src https://...
    body, as many lines as you like
    > orch-001 applies-to tri-004        (edges are their own blocks)
    ! ana-010 exp-meter-002 | a | the 198x figure is a price-table artefact

  relations: ${RELS.join(' ')}
  kinds:     ${KINDS.join(' ')}
`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: 'boolean' },
    kind: { type: 'string' },
    limit: { type: 'string' },
    depth: { type: 'string' },
    note: { type: 'string' },
    topic: { type: 'string' },
    'gap-prefix': { type: 'string' },
    resolved: { type: 'boolean' },
    verdict: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
})

const args = { values, positionals }
const command = positionals[0]
const rest = { values, positionals: positionals.slice(1) }

if (!command || values.help) { out(USAGE); process.exit(0) }

const COMMANDS = {
  init: () => cmdInit(),
  add: () => cmdAdd(rest),
  search: () => cmdSearch(rest),
  find: () => cmdSearch(rest),
  show: () => cmdShow(rest),
  around: () => cmdAround(rest),
  link: () => cmdLink(rest),
  merge: () => cmdMerge(rest),
  tag: () => cmdTag(rest),
  contradictions: () => cmdContradictions(rest),
  resolve: () => cmdResolve(rest),
  unresolve: () => cmdUnresolve(rest),
  gaps: () => cmdGaps(),
  pack: () => cmdPack(rest),
  unpack: () => cmdUnpack(rest),
  recent: () => cmdRecent(rest),
  stats: () => cmdStats(),
  sql: () => cmdSql(rest),
}

const run = COMMANDS[command]
if (!run) fail(`unknown command "${command}"\n\n${USAGE}`)
run()
