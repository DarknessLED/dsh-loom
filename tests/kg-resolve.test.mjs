// A contradiction list that can only grow is a list nobody reads. The point of
// recording a contradiction is to force a decision; the tool has to be able to
// take the decision and to show what is left, or the 174 pairs we have collected
// are a museum rather than a queue.
//
// Three rules this pins:
//   1. Resolving records the decision and keeps the evidence. The edge and both
//      nodes still exist -- a contradiction is not deleted by answering it.
//   2. A decision without a reason is refused. "both" with no note is not an
//      answer, it is the absence of one.
//   3. It is reversible. A wrong verdict must be reopenable, or the list becomes
//      a place decisions go to hide.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const KG = resolve('research/kg/kg.mjs')
const dir = mkdtempSync(join(tmpdir(), 'kg-resolve-'))
const dbPath = join(dir, 'store.sqlite')
let pass = 0
const ok = (n) => { pass += 1; console.log('ok ' + n) }

// A temporary graph, never the production one.
const kg = (...a) => execFileSync(process.execPath, [KG, ...a], {
  encoding: 'utf8', env: { ...process.env, LOOM_KG: dbPath },
})
const kgFails = (...a) => {
  try { kg(...a); return null } catch (e) { return String(e.stderr || e.message) }
}

const seed = join(dir, 'seed.json')
writeFileSync(seed, JSON.stringify({
  nodes: [
    { id: 'x-1', kind: 'number', title: 'first measurement', body: 'a', topic: 't' },
    { id: 'x-2', kind: 'number', title: 'second measurement', body: 'b', topic: 't' },
    { id: 'x-3', kind: 'claim', title: 'third', body: 'c', topic: 't' },
  ],
  edges: [{ from: 'x-1', rel: 'contradicts', to: 'x-2', note: 'different regimes' }],
}))
kg('add', seed)

// 1. the pair shows up as undecided
assert.match(kg('contradictions'), /x-1\s+vs\s+x-2/)
assert.match(kg('contradictions'), /1 contradiction/)
ok('an undecided pair is listed')

// 2. a verdict without a reason is refused
const refused = kgFails('resolve', 'x-1', 'x-2', '--verdict', 'both')
assert.ok(refused && /needs --note/.test(refused), 'expected a missing-note refusal, got: ' + refused)
ok('a verdict with no reason is refused')

// 3. an unknown verdict is refused
const badVerdict = kgFails('resolve', 'x-1', 'x-2', '--verdict', 'maybe', '--note', 'x')
assert.ok(badVerdict && /verdict must be one of/.test(badVerdict))
ok('an unknown verdict is refused')

// 4. a pair that is not recorded as a contradiction is refused
const noPair = kgFails('resolve', 'x-1', 'x-3', '--verdict', 'a', '--note', 'x')
assert.ok(noPair && /no contradiction recorded/.test(noPair))
ok('a pair with no recorded contradiction is refused')

// 5. resolving hides it from the default list but not from --resolved
kg('resolve', 'x-1', 'x-2', '--verdict', 'both', '--note', 'two regimes, both true')
const openNow = kg('contradictions')
assert.ok(!/x-1\s+vs\s+x-2/.test(openNow), 'resolved pair must leave the default list')
assert.match(openNow, /every contradiction has been decided/)
ok('a decided pair leaves the default list')

const withResolved = kg('contradictions', '--resolved')
assert.match(withResolved, /x-1\s+vs\s+x-2/)
assert.match(withResolved, /\[both\]/)
assert.match(withResolved, /two regimes, both true/)
assert.match(withResolved, /0 still undecided/)
ok('--resolved shows the verdict and the reason')

// 6. the evidence is kept: both nodes and the edge survive the decision
assert.match(kg('show', 'x-1'), /contradicts x-2/)
assert.match(kg('show', 'x-2'), /x-1 contradicts/)
ok('resolving keeps the edge and both nodes')

// 7. the pair can be given in either direction
kg('unresolve', 'x-2', 'x-1')
assert.match(kg('contradictions'), /x-1\s+vs\s+x-2/)
ok('a decision is reopenable, in either argument order')

// 8. and the decision is durable -- a fresh process sees it
kg('resolve', 'x-1', 'x-2', '--verdict', 'neither', '--note', 'refuted on both sides')
assert.match(kg('contradictions', '--resolved'), /\[neither\]/)
assert.doesNotMatch(kg('contradictions'), /x-1\s+vs\s+x-2/)
ok('the verdict survives a new process')

// 9. the store is a real SQLite file and the table is inspectable
const raw = kg('sql', 'SELECT verdict, note FROM resolution')
assert.match(raw, /neither/)
ok('the decision is queryable from the store')

console.log(`\n${pass}/9 passed`)
