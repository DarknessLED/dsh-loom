// The balance itself has to be selectable, or it is a constant somebody chose
// once. `MUTATION_REGISTRY` is the loop's menu of chain changes, and until now
// every entry changed the *worker* (how many candidates, how much guidance) and
// none changed the *loop's own habits*. A loop that can ask for a second
// candidate but can never ask to read first is a loop whose ReAct shape is
// fixed at install time.
//
// The fifth kind proposes `researchMode: 'auto'` on the chain's params. It is
// idempotent on purpose: a chain already in `auto` has nothing to propose, and a
// menu that keeps offering a change already made is noise in every plateau card.
//
//   node tests/self57/the-balance-is-in-the-menu.test.mjs
import assert from 'node:assert/strict'

import { MUTATION_KINDS, MUTATION_REGISTRY, mutateChain, proposeMutations } from '../../src/chain/mutate.js'
import { diffSpec } from '../../src/chain/spec-diff.js'
import { buildProposalCard } from '../../src/chain/evidence-card.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const KIND = 'research-on-stuck'

const spec = (over = {}) => ({
  version: 1,
  name: 'code-fix',
  params: { candidates: 1, ...over },
  nodes: [{ id: 'work', type: 'agent', prompt: 'fix it' }],
})

ok('the menu has a kind that changes the loop, not the worker', () => {
  assert.ok(MUTATION_KINDS.includes(KIND), `menu is ${MUTATION_KINDS.join(', ')}`)
  const entry = MUTATION_REGISTRY.find((e) => e.kind === KIND)
  assert.match(entry.since, /^\d{4}-\d{2}-\d{2}$/, 'a kind without a date is a guess')
  assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0, 'a kind without evidence names no campaign')
  assert.ok(typeof entry.note === 'string' && entry.note.length > 20, 'the note must say what it is for')
})

ok('it proposes auto from off', () => {
  const made = mutateChain(spec({ researchMode: 'off' }), { kind: KIND, version: 2 })
  assert.ok(made, 'the mutation must produce a spec')
  assert.equal(made.spec.params.researchMode, 'auto')
  assert.equal(made.spec.version, 2)
  assert.equal(made.spec.meta.kind, KIND)
})

ok('a chain that already reads on its own gets nothing proposed', () => {
  assert.equal(mutateChain(spec({ researchMode: 'auto' }), { kind: KIND, version: 2 }), null)
  // 'full' is a different mode, so it is still a change worth proposing: the
  // point of the kind is "let the loop decide", not "read more".
  const fromFull = mutateChain(spec({ researchMode: 'full' }), { kind: KIND, version: 2 })
  assert.equal(fromFull.spec.params.researchMode, 'auto')
})

ok('a spec with no mode at all is a chain that never reads', () => {
  // Absent is not 'auto': the policy default only applies when the loop is asked,
  // and a chain that predates the field states nothing about reading.
  const made = mutateChain(spec(), { kind: KIND, version: 2 })
  assert.ok(made)
  assert.equal(made.spec.params.researchMode, 'auto')
})

ok('the proposal is a diff a person can read', () => {
  const made = mutateChain(spec({ researchMode: 'off' }), { kind: KIND, version: 2 })
  const changes = diffSpec(spec({ researchMode: 'off' }), made.spec)
  const hit = changes.find((c) => c.path === 'spec.params.researchMode')
  assert.ok(hit, `diff paths were ${changes.map((c) => c.path).join(', ')}`)
  assert.equal(hit.from, 'off')
  assert.equal(hit.to, 'auto')
})

ok('the card shows the prediction, the risk and the diff for this kind', () => {
  const base = spec({ researchMode: 'off' })
  const proposals = proposeMutations(base, { fromVersion: 2, max: 5 })
  const mine = proposals.find((p) => p.kind === KIND)
  assert.ok(mine, 'proposeMutations dropped the kind')
  const card = buildProposalCard({
    active: { version: 1, spec: base },
    proposals: [mine],
    rounds: [{ n: 1, chainVersion: 1, score: 0.3, promoted: false, costUsd: 0.02 }],
    config: { checkpoint: { window: 3 } },
  })
  const item = card.items[0]
  assert.ok(Number.isFinite(item.prediction?.point), 'no prediction on the card')
  assert.ok(item.risk?.level, 'no risk level on the card')
  assert.ok(item.diff.length >= 1, 'no diff on the card')
  assert.ok(item.diffLines.some((line) => /researchMode/.test(line)), `diff lines: ${item.diffLines.join(' | ')}`)
})

ok('it does not drown the other kinds', () => {
  // The menu keeps its order and the new kind is last, so a fresh campaign still
  // gets the changes with a cost/benefit number behind them first.
  assert.equal(MUTATION_KINDS[MUTATION_KINDS.length - 1], KIND)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
