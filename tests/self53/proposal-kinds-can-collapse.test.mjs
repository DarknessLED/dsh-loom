// A menu that keeps offering the same kind is not a search.
//
// `MUTATION_KINDS` is four fixed strings, and `statusOf` blocks a kind only when
// the decision ledger already recorded it or when it contradicts the task's
// scope. Nothing notices that the last six proposals were all `minimal-change`
// and that the archive is therefore one idea repeated — the diversity collapse
// the evolutionary literature names and measures (2510.22954 §3, §5).
//
// Two changes, both additive:
//   - the kinds become a registry carrying when each was added and what evidence
//     justifies it, so "four kinds" is a claim with a date rather than a fact;
//   - `proposeMutations` reads the proposals already made and marks a kind
//     `collapsed` once it dominates the record. Marked, not dropped: a human
//     still sees the hypothesis and the reason it is not being offered again,
//     which is what `statusOf` already does for blocked kinds.
//
// And versions get filed by behaviour, not by structure: `spec-diff` says which
// fields changed, which cannot tell two chain versions apart when both edit a
// prompt and both score the same. `descriptorOf` reads the rounds instead.
import assert from 'node:assert/strict'
import { MUTATION_KINDS, MUTATION_REGISTRY, mutateChain, proposeMutations } from '../../src/chain/mutate.js'
import { descriptorOf } from '../../src/chain/descriptor.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const spec = {
  name: 's',
  version: 1,
  params: { candidates: 1 },
  nodes: [{ id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', prompt: 'WORKER: fix it' } }],
}

// 1. The registry is the source of truth, and the string list still works.
assert.ok(Array.isArray(MUTATION_REGISTRY), 'the kinds are a registry')
assert.equal(MUTATION_REGISTRY.length, MUTATION_KINDS.length)
for (const entry of MUTATION_REGISTRY) {
  assert.ok(typeof entry.kind === 'string' && entry.kind.length > 0, 'every entry names its kind')
  assert.match(String(entry.since || ''), /^\d{4}-\d{2}-\d{2}$/, `every entry carries the date it was added (${entry.kind})`)
  assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0, `every entry says what justifies it (${entry.kind})`)
}
assert.deepEqual(MUTATION_REGISTRY.map((e) => e.kind), MUTATION_KINDS, 'the exported list is derived from the registry, not parallel to it')
ok('every mutation kind carries a date and its evidence')

// 2. A dominating kind is marked collapsed, and the mark explains itself.
const stuck = Array.from({ length: 6 }, () => ({ kind: 'minimal-change', decision: 'proposed' }))
const collapsed = proposeMutations(spec, { fromVersion: 5, max: 4, history: stuck })
const minimal = collapsed.find((m) => m.kind === 'minimal-change')
assert.equal(minimal.status, 'collapsed', 'a kind that the record is full of is marked, not silently repeated')
assert.match(String(minimal.note || ''), /\b(6|share|collapsed)/i, 'and the note says what the record shows')
ok('a kind the record is full of is marked collapsed')

// 3. A balanced record collapses nothing: this is a guard against a rut, not a
// quota system.
const balanced = [
  { kind: 'minimal-change' },
  { kind: 'state-your-uncertainty' },
  { kind: 'minimal-change' },
  { kind: 'state-your-uncertainty' },
]
const fresh = proposeMutations(spec, { fromVersion: 5, max: 4, history: balanced })
for (const m of fresh) assert.notEqual(m.status, 'collapsed', `${m.kind} is not collapsed when the record is balanced`)
ok('a balanced history collapses nothing')

// 4. No history means no collapse: a first proposal on a fresh campaign has no
// record to be stuck in, and inventing one would block the first card.
const first = proposeMutations(spec, { fromVersion: 1, max: 3 })
for (const m of first) assert.equal(m.status === 'collapsed', false, 'a fresh campaign has nothing to collapse')
ok('a campaign with no proposal history collapses nothing')

// 5. Behaviour, not structure. Two rounds on the same chain version with the
// same fields changed but different outcomes have to land in different cells.
const low = descriptorOf({
  chainVersion: 2,
  rounds: [
    { n: 1, chainVersion: 2, score: 0.2, status: 'no-gain', costUsd: 0.02, promoted: false },
    { n: 2, chainVersion: 2, score: 0.3, status: 'no-gain', costUsd: 0.03, promoted: false },
  ],
})
const high = descriptorOf({
  chainVersion: 2,
  rounds: [
    { n: 1, chainVersion: 2, score: 0.8, status: 'promoted', costUsd: 0.02, promoted: true },
    { n: 2, chainVersion: 2, score: 0.9, status: 'promoted', costUsd: 0.03, promoted: true },
  ],
})
assert.notEqual(low.key, high.key, 'two versions that score differently are not filed in the same cell')
assert.ok(low.key.length > 0 && high.key.length > 0)
ok('a version is filed by what it did, not by which fields it edited')

// 6. The cell is a summary someone can read, and it is stable: same rounds in,
// same key out, regardless of array order.
const shuffled = descriptorOf({
  chainVersion: 2,
  rounds: [
    { n: 2, chainVersion: 2, score: 0.9, status: 'promoted', costUsd: 0.03, promoted: true },
    { n: 1, chainVersion: 2, score: 0.8, status: 'promoted', costUsd: 0.02, promoted: true },
  ],
})
assert.equal(shuffled.key, high.key, 'the key does not depend on the order the rounds arrived in')
assert.equal(shuffled.rounds, 2)
assert.ok(Math.abs(shuffled.meanScore - 0.85) < 1e-9)
assert.equal(shuffled.solved, 2)
ok('the cell is a readable summary and does not depend on arrival order')

// 7. Rounds on another chain version are not this version's behaviour.
const mixed = descriptorOf({
  chainVersion: 2,
  rounds: [
    { n: 1, chainVersion: 1, score: 0.1, status: 'no-gain', costUsd: 0.5, promoted: false },
    { n: 2, chainVersion: 2, score: 0.9, status: 'promoted', costUsd: 0.03, promoted: true },
  ],
})
assert.equal(mixed.rounds, 1, 'only rounds on this version describe this version')
ok('another version is not credited to this one')

// 8. No rounds at all is a real answer, not an error: a version that was adopted
// and never ran has no behaviour to file.
const none = descriptorOf({ chainVersion: 9, rounds: [] })
assert.equal(none.rounds, 0)
assert.equal(none.meanScore, null)
assert.match(none.key, /unmeasured/i)
ok('a version that never ran is filed as unmeasured')

console.log(`\n${pass}/${pass} passed`)
