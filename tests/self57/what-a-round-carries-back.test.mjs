// The read leg's record stops at the event, so nothing downstream can read it.
//
// Measured 2026-11-26 on campaign `react-feedback` (three rounds, all `no-gain`):
// every `round.finished` carried
//
//   "research": { "mode": "full", "question": "…", "read": 2, "passages": 4, "used": false }
//
// and `rsi_status` showed three rounds with no `research` field at all, because
// `projectRound` copies a whitelist of keys and the leg's record is not on it.
//
// Two things read that field back off `state.rounds`, and both were therefore
// dead on arrival:
//
//   * `researchModeFor` — "a win whose notes nobody used is not evidence for
//     reading" can never fire when the round it inspects has no `used`;
//   * `legBudget` — the `maxRounds` allowance counts rounds that bought a read,
//     and projected rounds never bought one.
//
// This is the same failure as the screening record (`screened`/`kept`, which got
// the fix and a comment saying exactly this) and the holdout reading. The event
// is the ledger; the projected round is what the loop reads next round.
//
//   node tests/self57/what-a-round-carries-back.test.mjs
import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { researchModeFor } from '../../src/runtime/round.js'
import { legBudget } from '../../src/runtime/research-leg.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(HERE, '..', '..', 'src', 'runtime', 'round.js'), 'utf8')

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

ok('projectRound copies the research record onto the round', () => {
  // The assertion is on source, not behaviour, because `projectRound` is not
  // exported: the whitelist is the bug and the whitelist is text.
  assert.match(
    source,
    /round\.research \? \{ research: round\.research \}/,
    'projectRound must carry `research` the way it carries `screened`/`kept`',
  )
})

ok('the mode rule can see a win whose notes were never used', () => {
  // With the field projected, this is the branch the whole leg was built for.
  const got = researchModeFor([{ n: 1, status: 'promoted', promoted: true, research: { mode: 'full', used: false } }], {
    researchMode: 'auto',
  })
  assert.equal(got, 'off')
})

ok('a projected round that lost its research field looks like a round that never read', () => {
  // The state of the live ledger, pinned as the control. `readIt` is
  // `Boolean(r.research)`, so a missing field reads as "won without reading" and
  // the rule answers `off` -- switching the leg off for a reason that is not
  // true. That is worse than buying again: the campaign cannot tell how many
  // reads it paid for, and the panel's `reads` line counts zero.
  const got = researchModeFor([{ n: 1, status: 'promoted', promoted: true }], { researchMode: 'auto' })
  assert.equal(got, 'off')
})

ok('the allowance spends only what a projected round actually bought', () => {
  const spent = legBudget({
    mode: 'auto',
    rounds: [
      { n: 1, research: { mode: 'full', read: 2 } },
      { n: 2, research: { mode: 'off' } },
      { n: 3 },
    ],
    config: { maxRounds: 1 },
  })
  assert.equal(spent.buy, false)
  assert.match(spent.reason, /already bought 1/)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
