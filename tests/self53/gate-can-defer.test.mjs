// The gate has to be able to say "not yet".
//
// Today `gate.evaluated` carries a single boolean: `promoted`. A candidate that
// lost by a hair's breadth and a candidate that lost by a mile produce the same
// event, so "we became more careful" and "we became broken" look identical in
// the ledger. PACE's answer is three states, and the middle one has to exist
// before any threshold can be tuned honestly.
//
// This spec pins the shadow wiring: every evaluated gate reports what the paired
// e-process would have said, while `promoted` still follows the rule that is in
// force. Shadow first, because switching the rule and the ledger in the same
// commit would leave nobody able to tell which of the two changed the outcome.
import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { DEFAULT_CONFIG } from '../../src/core/config.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// α and λ are configuration, not constants: PACE tuned 0.05 / 0.5 on GSM8K, and
// our scores are not those scores.
assert.equal(DEFAULT_CONFIG.gate.alpha, 0.05)
assert.equal(DEFAULT_CONFIG.gate.efoldLambda, 0.5)
ok('alpha and lambda are install settings with PACE defaults')

const src = readFileSync(new URL('../../src/runtime/round.js', import.meta.url), 'utf8')
assert.match(src, /commitDecision\(/, 'the round asks the sequential gate')
assert.match(src, /pairedHistory\(/, 'and builds its discordant pairs from the round history')
ok('the round is wired to the paired test')

const dir = makeRepo()
const spec = chainSpec({ candidates: 1 })
const { runtime, view } = makeRuntime({
  repo: dir,
  spec,
  tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 1' } }],
})
await runRound({ runtime, view, config: baseConfig(), dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })

const evaluated = runtime.events.filter((e) => e.type === 'gate.evaluated')
assert.equal(evaluated.length, 1)
const event = evaluated[0].data
assert.ok(['commit', 'defer', 'reject'].includes(event.decision), 'the gate names which of the three it is')
assert.equal(typeof event.promoted, 'boolean', 'and keeps the boolean for existing readers')
assert.ok(Number.isFinite(event.eValue))
assert.equal(event.alpha, 0.05)
assert.equal(event.lambda, 0.5)
assert.ok(event.sequential && typeof event.sequential.decision === 'string', 'the shadow reading is kept whole')
ok('every evaluated gate reports the three-state decision next to the boolean')

// The first round on a task has no incumbent to be paired against, so the
// sequential gate cannot have decided anything. That is `defer`, and a `defer`
// must not by itself flip the promotion either way: the old rule still governs
// until the shadow table has been read.
assert.equal(event.decision, 'defer')
assert.equal(event.sequential.reason, 'no discordant pairs')
ok('a round with no pairs defers instead of pretending to decide')

rmSync(dir, { recursive: true, force: true })
