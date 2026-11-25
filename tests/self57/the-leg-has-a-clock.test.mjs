// Two knobs the config advertises and nothing reads.
//
// `src/core/config.js` declares
//
//   research: { timeoutMs: 90_000, maxRounds: 3, ... }
//
// with comments that promise behaviour: "The leg's own deadline. It is not
// allowed to eat the attempt's cap." and "How many rounds of the same campaign
// may buy a read before the mode stops it." Neither is read anywhere —
// `grep -rn "research?.timeoutMs\|research.timeoutMs" src/` is empty, and the
// leg runs before the attempt with no clock of its own. A config key that no
// code reads is worse than a missing one: it reads like a guarantee.
//
// The deadline matters concretely. The leg awaits `runResearch`, which awaits
// `web.search` and `web.fetch`; on 2026-11-26 one live leg took 17.8 s and
// recorded a fetch failure. A hung fetch would hold the round for as long as
// the transport allows, and the round's own `attempt.deadline` starts after it.
//
//   node tests/self57/the-leg-has-a-clock.test.mjs
import assert from 'node:assert/strict'

import { legBudget, withDeadline } from '../../src/runtime/research-leg.js'

let pass = 0
let fail = 0
async function ok(name, fn) {
  try {
    await fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const readRound = (n = 1) => ({ n, research: { mode: 'full', question: 'q', read: 1 } })

await ok('a campaign under its read budget buys', () => {
  const got = legBudget({ mode: 'auto', rounds: [], config: { maxRounds: 3 } })
  assert.deepEqual(got, { buy: true, reason: null })
})

await ok('mode off never buys, whatever the budget says', () => {
  const got = legBudget({ mode: 'off', rounds: [], config: { maxRounds: 3 } })
  assert.equal(got.buy, false)
  assert.match(got.reason, /mode is off/)
})

await ok('past maxRounds the leg stops buying and says why', () => {
  const got = legBudget({ mode: 'auto', rounds: [readRound(1), readRound(2), readRound(3)], config: { maxRounds: 3 } })
  assert.equal(got.buy, false)
  assert.match(got.reason, /3 rounds/)
})

await ok('a round that did not read is not a round spent', () => {
  // `maxRounds` is a cap on reads bought, not on rounds run: a campaign whose
  // leg was off for two rounds has not used its allowance.
  const got = legBudget({
    mode: 'auto',
    rounds: [{ n: 1, research: { mode: 'off' } }, { n: 2, research: { mode: 'off' } }, readRound(3)],
    config: { maxRounds: 2 },
  })
  assert.equal(got.buy, true)
})

await ok('a missing or non-finite maxRounds does not forbid reading', () => {
  // A bad config must not silently disable the leg -- that is the failure mode
  // that looks like "the loop chose not to read" and is really "the knobs are
  // wrong".
  for (const config of [undefined, {}, { maxRounds: null }, { maxRounds: 'three' }]) {
    assert.equal(legBudget({ mode: 'auto', rounds: [], config }).buy, true)
  }
})

await ok('withDeadline resolves what the work resolves', async () => {
  const got = await withDeadline(async () => 'done', 1000)
  assert.equal(got.ok, true)
  assert.equal(got.value, 'done')
})

await ok('a slow leg is cut off and reported, not thrown', async () => {
  const started = Date.now()
  const got = await withDeadline(() => new Promise((resolve) => setTimeout(() => resolve('late'), 5000)), 50)
  assert.equal(got.ok, false)
  assert.equal(got.timedOut, true)
  assert.match(got.reason, /deadline/i)
  assert.ok(Date.now() - started < 2000, 'the deadline must not wait for the work')
})

await ok('a leg that throws is reported as a failure, not a timeout', async () => {
  const got = await withDeadline(async () => {
    throw new Error('transport exploded')
  }, 1000)
  assert.equal(got.ok, false)
  assert.equal(got.timedOut, false)
  assert.match(got.reason, /transport exploded/)
})

await ok('no deadline means no wrapper', async () => {
  // A campaign may want the leg unbounded; then the code path must be the plain
  // await, so that a regression in the wrapper cannot affect it.
  const got = await withDeadline(async () => 'done', 0)
  assert.equal(got.ok, true)
  assert.equal(got.value, 'done')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
