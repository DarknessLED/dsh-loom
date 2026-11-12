// The pack format is the only way this graph leaves SQLite: a human diffs it, an
// agent writes it by hand, and a second machine reads it back. So "does a
// round-trip lose anything" is not a formatting question, it is the question of
// whether the graph is portable at all.
//
// It lost things three ways before this test existed, all of them silent:
//   1. topic was not a field, so 45 nodes came back with topic = null (and every
//      `kg pack --topic X` afterwards saw them as gone);
//   2. a blank line inside a body ended the record, truncating 6 bodies at the
//      first paragraph break;
//   3. a title or source containing `|` split into fields, mangling 5 rows and
//      truncating one source at the first `||` in a code quote.
//
// The fixture therefore contains exactly those three shapes, and the assertion is
// byte-equality of every field after a pack -> unpack into an empty database.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const kg = join(root, 'research', 'kg', 'kg.mjs')

let pass = 0
let fail = 0
function ok(cond, name, detail) {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${pass + fail} - ${name}`)
  if (!cond && detail) console.log(`      ${detail}`)
}

const dir = mkdtempSync(join(tmpdir(), 'kg-rt-'))
const run = (args, db) =>
  spawnSync(process.execPath, [kg, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, LOOM_KG: db },
  })

try {
  const a = join(dir, 'a.sqlite')
  const b = join(dir, 'b.sqlite')
  const payloadFile = join(dir, 'seed.json')
  const packFile = join(dir, 'graph.pack')

  // A body with a paragraph break, a title with pipes, and a source that quotes a
  // shell operator. Between them these are the three failure modes.
  writeFileSync(payloadFile, JSON.stringify({
    nodes: [
      {
        id: 'rt-plain', kind: 'claim', topic: 'ver',
        title: 'A plain node',
        body: 'One line, no tricks.',
        confidence: 0.8,
      },
      {
        id: 'rt-blank', kind: 'analysis', topic: 'ver',
        title: 'A body with a paragraph break',
        body: 'First paragraph.\n\nSecond paragraph, after a blank line.\n\nThird.',
      },
      {
        id: 'rt-pipes', kind: 'number', topic: 'ver',
        title: 'Priority replay: mean |GAE| of the last trajectory is a difficulty signal',
        body: 'Body is fine.',
        source: "round.js:1461 gateOk = (ver.ok && lean && outcomeKind==='ok') || salvaged; also a || b",
        confidence: 0.93,
      },
      {
        id: 'rt-untopiced', kind: 'claim',
        title: 'A node with no topic at all',
        body: 'No topic set, and that must stay "no topic", not become the pack default.',
      },
    ],
    edges: [
      { from: 'rt-blank', rel: 'supports', to: 'rt-plain', note: 'a note with a | pipe in it' },
      { from: 'rt-pipes', rel: 'requires', to: 'rt-blank' },
    ],
  }), 'utf8')

  const add = run(['add', payloadFile], a)
  ok(add.status === 0, 'the fixture imports', add.stderr)

  const packed = run(['pack'], a)
  ok(packed.status === 0, 'pack runs', packed.stderr)
  writeFileSync(packFile, packed.stdout, 'utf8')
  const heads = packed.stdout.split('\n').filter((l) => l.startsWith('#'))
  ok(heads.length === 4, `pack writes one record per node (got ${heads.length})`)
  ok(heads.some((h) => h.includes('| topic ver')), 'the topic is a field, not a body line')

  const unpacked = run(['unpack', packFile], b)
  ok(unpacked.status === 0, 'unpack runs', unpacked.stderr)

  const read = (file) => {
    const db = new DatabaseSync(file)
    const rows = db.prepare(
      "SELECT id, kind, title, coalesce(body,'') body, coalesce(source,'') source, coalesce(topic,'') topic FROM node WHERE status='live' ORDER BY id",
    ).all()
    const tags = {}
    for (const r of rows) {
      tags[r.id] = db.prepare('SELECT tag FROM tag WHERE node_id=? ORDER BY tag').all(r.id).map((t) => t.tag).join(',')
    }
    const edges = db.prepare('SELECT from_id, rel, to_id, coalesce(note,\'\') note FROM edge ORDER BY from_id, rel, to_id').all()
    db.close()
    return { rows, tags, edges }
  }

  const before = read(a)
  const after = read(b)

  ok(before.rows.length === 4, `four nodes in the source (got ${before.rows.length})`)
  ok(after.rows.length === before.rows.length, `four nodes after the round-trip (got ${after.rows.length})`)

  const byId = new Map(after.rows.map((r) => [r.id, r]))
  for (const r of before.rows) {
    const got = byId.get(r.id)
    ok(Boolean(got), `node ${r.id} survives`)
    if (!got) continue
    for (const field of ['kind', 'title', 'body', 'source', 'topic']) {
      ok(got[field] === r[field], `${r.id}.${field} survives byte for byte`,
        got[field] === r[field] ? '' : `want ${JSON.stringify(r[field])}\n      got  ${JSON.stringify(got[field])}`)
    }
    ok(after.tags[r.id] === before.tags[r.id], `${r.id} keeps its tags`,
      `want ${before.tags[r.id]} got ${after.tags[r.id]}`)
  }

  ok(after.rows.find((r) => r.id === 'rt-untopiced')?.topic === '', 'a node with no topic does not inherit one')
  ok(after.rows.find((r) => r.id === 'rt-blank')?.body.includes('Third.'), 'the paragraph after the blank line is still there')
  ok(after.rows.find((r) => r.id === 'rt-pipes')?.source.endsWith('also a || b'), 'a source quoting || survives whole')

  ok(after.edges.length === before.edges.length, `both edges survive (got ${after.edges.length})`)
  ok(after.edges.some((e) => e.note === 'a note with a | pipe in it'), 'an edge note with a pipe survives')

  // Packing the unpacked graph must reproduce the same text: idempotent, so a
  // two-machine exchange does not drift with every hop.
  const repacked = run(['pack'], b)
  ok(repacked.stdout === packed.stdout, 'pack -> unpack -> pack is byte-identical')
} finally {
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
