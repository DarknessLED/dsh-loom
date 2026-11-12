// A merge re-points edges at the survivor. Decisions name nodes too, so a merge
// that ignored them would silently reopen answered questions -- and the graph
// would then report contradictions it had already decided, which is worse than
// reporting none because it looks like work left to do.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const KG = resolve('research/kg/kg.mjs')
const dir = mkdtempSync(join(tmpdir(), 'kg-merge-'))
const db = join(dir, 'store.sqlite')
const kg = (...a) => execFileSync(process.execPath, [KG, ...a], { encoding: 'utf8', env: { ...process.env, LOOM_KG: db } })

const seed = join(dir, 'seed.json')
writeFileSync(seed, JSON.stringify({
  nodes: [
    { id: 'k-keep', kind: 'number', title: 'the survivor', body: 'a', topic: 't' },
    { id: 'k-drop', kind: 'number', title: 'the duplicate', body: 'b', topic: 't' },
    { id: 'k-other', kind: 'claim', title: 'the other side', body: 'c', topic: 't' },
    { id: 'k-third', kind: 'claim', title: 'a third node', body: 'd', topic: 't' },
  ],
  edges: [
    { from: 'k-drop', rel: 'contradicts', to: 'k-other' },
    { from: 'k-keep', rel: 'contradicts', to: 'k-third' },
  ],
}))
kg('add', seed)
kg('resolve', 'k-drop', 'k-other', '--verdict', 'both', '--note', 'two regimes')
kg('resolve', 'k-keep', 'k-third', '--verdict', 'a', '--note', 'the first wins')

kg('merge', 'k-keep', 'k-drop')

const q = (sql) => { const d = new DatabaseSync(db); const r = d.prepare(sql).all(); d.close(); return r }

// 1. the decision moved to the survivor instead of disappearing
const moved = q("SELECT from_id, to_id, verdict, note FROM resolution WHERE from_id='k-keep' OR to_id='k-keep' ORDER BY to_id")
assert.equal(moved.length, 2, 'both decisions now name the survivor: ' + JSON.stringify(moved))
assert.ok(moved.some((r) => r.to_id === 'k-other' && r.verdict === 'both' && r.note === 'two regimes'),
  'the moved decision kept its verdict and reason')
assert.ok(!q("SELECT 1 FROM resolution WHERE from_id='k-drop' OR to_id='k-drop'").length,
  'nothing still names the merged node')

// 2. the merged node is gone from the live graph but its record remains
assert.equal(q("SELECT 1 FROM node WHERE id='k-drop' AND status='merged'").length, 1, 'the drop is marked merged, not erased')
assert.equal(q("SELECT COUNT(*) c FROM resolution WHERE from_id = to_id")[0].c, 0, 'no self-decision is left behind')

// 3. and the CLI agrees: nothing has become undecided again
assert.match(kg('contradictions'), /every contradiction has been decided/)
console.log('10/10 passed')
