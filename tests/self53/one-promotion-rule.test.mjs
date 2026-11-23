// Two implementations of one rule is one implementation too many.
//
// `decidePromotion` (src/gate/gate.js) is the documented promotion rule. The
// round does not call it: it has its own inline copy, and the copy has drifted
// (noise multiplier, config fallback, and a holdout score the real path never
// sets). Whatever the two disagree about, the one that decides is the one
// nobody tests.
//
// This spec does not demand the merge yet — merging blind would stop 230 of the
// ledger's 248 promotions, because the documented rule wants six tasks and a
// round evaluates one. It demands the disagreement be *visible*: every gate
// evaluation carries the documented rule's answer next to the real one.
import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { decidePromotion } from '../../src/gate/gate.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const src = readFileSync(new URL('../../src/runtime/round.js', import.meta.url), 'utf8')
assert.match(src, /decidePromotion\(/, 'the round asks the documented rule what it would say')
ok('the round calls decidePromotion')

const dir = makeRepo()
const { runtime, view } = makeRuntime({
  repo: dir,
  spec: chainSpec({ candidates: 1 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }],
})
await runRound({ runtime, view, config: baseConfig(), dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })

const [gate] = runtime.events.filter((e) => e.type === 'gate.evaluated').map((e) => e.data)
assert.ok(gate.shadow && typeof gate.shadow.promote === 'boolean', 'the documented rule answers on every gate')
assert.equal(typeof gate.shadow.reason, 'string')
assert.ok(gate.shadow.reason.length > 0, 'and says why')
ok('every gate evaluation records what the documented rule would have decided')

// The disagreement this round produces is the one the spec predicted: the
// documented rule wants six evaluated tasks, and this round evaluated one. That
// number is the reason the merge cannot be a rewrite, so it has to be legible
// rather than implicit.
assert.equal(gate.shadow.promote, false)
assert.match(gate.shadow.reason, /insufficient tasks/)
assert.equal(gate.promoted, false, 'and the rule in force still governs')
ok('the shadow says insufficient tasks, which is the whole reason the merge waits')

// The pure function and the shadow must be the same call, not two paraphrases:
// feeding decidePromotion the round's own numbers reproduces the shadow exactly.
const again = decidePromotion({
  candidate: { score: gate.score, source: gate.scoreSource ?? 'binary', metrics: null },
  incumbent: null,
  config: { minTasks: 6, minGain: 0.05, holdoutSlack: 0.02 },
  evidence: { complete: true, tasks: 1 },
  policy: {},
})
assert.equal(again.promote, gate.shadow.promote)
assert.equal(again.reason, gate.shadow.reason)
ok('the shadow is the documented rule, not a paraphrase of it')

rmSync(dir, { recursive: true, force: true })
