// The archive has to be written down, not just computable.
//
// `descriptorOf` can file a version by its behaviour, and `proposeMutations` can
// mark a dominating kind `collapsed` — but neither matters until a real plateau
// round writes both onto the ledger. This spec drives three flat rounds through
// the real round code and checks what the card and the events actually carry: a
// `descriptor` on every proposal, a `kind` on the version record so the next
// card can see a rut forming, and a `collapsed` mark whose note names the count
// rather than merely asserting repetition.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { reduce } from '../../src/core/reduce.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// One campaign, several flat rounds, and a chain version history that already
// looks like a rut: the six most recent proposals were all `minimal-change`.
async function drive({ versionHistory = [] } = {}) {
  const dir = makeRepo()
  const spec = chainSpec({ candidates: 1 })
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec,
    tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }],
  })
  // Pretend those proposals were made: same shape the reducer writes.
  view.state.chain.versions = [
    { version: 1, spec, by: 'agent', at: Date.now(), status: 'active' },
    ...versionHistory,
  ]
  const dispatcher = fakeDispatcher([])
  for (let n = 1; n <= 3; n += 1) {
    view.state.rounds = runtime.events.filter((e) => e.type === 'round.started').map((e) => ({ n: e.data.n }))
    await runRound({ runtime, view, config: baseConfig(), dispatcher, log: () => {}, notify: () => {} })
  }
  const raised = runtime.events.filter((e) => e.type === 'checkpoint.raised' && e.data?.kind === 'plateau')
  const proposed = runtime.events.filter((e) => e.type === 'chain.proposed')
  const state = JSON.parse(JSON.stringify(view.state))
  rmSync(dir, { recursive: true, force: true })
  return { raised, proposed, state }
}

// 1. Every proposal is filed in a cell, and the cell describes behaviour.
const plain = await drive()
assert.equal(plain.raised.length, 1, 'three flat rounds raise one plateau card')
const firstCard = plain.raised[0].data.payload
for (const p of firstCard.proposals) {
  assert.ok(p.descriptor, `proposal ${p.version} carries the cell it came from`)
  assert.match(String(p.descriptor.key), /^(s\d-w\d-c\d|unmeasured)$/, `the cell is a readable key (${p.descriptor.key})`)
  assert.equal(typeof p.descriptor.rounds, 'number')
}
ok('every proposal carries the archive cell of the version it departs from')

// 2. The same cell reaches the event and the folded version record, so a reader
// of the ledger alone can reconstruct the archive.
assert.ok(plain.proposed.length >= 1)
for (const ev of plain.proposed) {
  assert.ok(ev.data.descriptor, 'the event carries the cell')
  assert.equal(typeof ev.data.kind, 'string', 'and the kind, so a rut can be counted from the ledger')
}
// Fold the recorded events through the real reducer: the point is that the
// projection keeps the cell, not that the event happened to carry it. A fixture
// that folds by hand would prove nothing about what a reader of the ledger sees.
const folded = reduce(
  plain.proposed.map((e, i) => ({ t: Date.now() + i, actor: 'system', type: e.type, data: e.data })),
  's53',
)
const candidates = folded.chain.versions.filter((v) => v.status === 'candidate')
assert.ok(candidates.length >= 1, 'the fold creates candidate versions')
for (const v of candidates) {
  assert.ok(v.descriptor, 'the folded version record carries the cell too')
  assert.equal(typeof v.kind, 'string', 'and the kind, so a rut can be counted from the fold')
}
assert.equal(
  candidates[0].descriptor.key,
  plain.proposed[0].data.descriptor.key,
  'the folded cell is the one the event carried, not an empty default',
)
ok('the cell and the kind survive the fold, so the archive is readable from the ledger alone')

// 3. A campaign whose proposal record is one kind repeated marks that kind
// `collapsed`, with a note that names the count. The proposals are still
// reported — a blocked hypothesis is information, not an omission.
const rut = Array.from({ length: 6 }, (_, i) => ({
  version: 2 + i,
  spec: chainSpec({ candidates: 1 }),
  by: 'system',
  at: Date.now(),
  status: 'candidate',
  kind: 'minimal-change',
}))
const stuck = await drive({ versionHistory: rut })
assert.equal(stuck.raised.length, 1, 'the rut still gets a card')
const card = stuck.raised[0].data.payload
const minimal = card.proposals.find((p) => p.kind === 'minimal-change')
assert.ok(minimal, 'the collapsed kind is still reported')
assert.equal(minimal.status, 'collapsed', 'a kind that dominates the record is marked')
assert.match(String(minimal.note || ''), /(6|last|share|%)/i, 'and the note names what the record shows')
ok('a rut in the proposal record marks the dominating kind instead of repeating it')

// 4. A balanced record marks nothing, so the guard cannot quietly turn into a
// quota that starves a kind that is working.
const mixed = [
  { version: 2, spec: chainSpec({ candidates: 1 }), by: 'system', at: Date.now(), status: 'candidate', kind: 'minimal-change' },
  { version: 3, spec: chainSpec({ candidates: 2 }), by: 'system', at: Date.now(), status: 'candidate', kind: 'candidates+1' },
  { version: 4, spec: chainSpec({ candidates: 1 }), by: 'system', at: Date.now(), status: 'candidate', kind: 'state-your-uncertainty' },
  { version: 5, spec: chainSpec({ candidates: 2 }), by: 'system', at: Date.now(), status: 'candidate', kind: 'candidates+1' },
]
const healthy = await drive({ versionHistory: mixed })
const healthyCard = healthy.raised[0].data.payload
for (const p of healthyCard.proposals) {
  assert.notEqual(p.status, 'collapsed', `${p.kind} is not collapsed on a balanced record`)
}
ok('a balanced proposal record collapses nothing')

console.log(`\n${pass}/${pass} passed`)
