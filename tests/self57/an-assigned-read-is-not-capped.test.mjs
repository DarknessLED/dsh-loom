// A cap that cancels an assigned read is a trial that silently stops testing.
//
// `legBudget` refuses to buy a read after `research.maxRounds` rounds have
// already bought one. That is the right rule for `auto` and `full`: they read
// because a rule said so, and the cap is the brake. Under `trial` the arm was
// decided by lot before the round ran, so the cap does not save money -- it
// turns an assigned read into an unassigned one and dilutes the comparison
// toward "no difference" without recording that it did.
//
// `trial8-live` round 8 was assigned to read and recorded
// `{"mode":"full","skipped":"budget-spent"}`. Eight rounds, one treatment
// silently withheld, and the round still counted in the reading arm.

import test from 'node:test'
import assert from 'node:assert/strict'

import { legBudget } from '../../src/runtime/research-leg.js'

const ok = (name) => console.log(`ok ${name}`)

const bought = (n) => Array.from({ length: n }, (_, i) => ({ n: i + 1, research: { mode: 'full', read: 2 } }))

test('the cap still stops auto and full from buying forever', () => {
  const rounds = bought(3)
  const cap = { maxRounds: 3 }
  for (const mode of ['auto', 'full']) {
    const out = legBudget({ mode, rounds, config: cap })
    assert.equal(out.buy, false, `${mode} must still respect the cap`)
    assert.match(String(out.reason), /maxRounds/, `${mode} must say why it stopped`)
  }
  ok('the cap still stops auto and full from buying forever')
})

test('an assigned read is not cancelled by the cap', () => {
  const rounds = bought(3)
  const out = legBudget({ mode: 'trial', rounds, config: { maxRounds: 3, trial: true } })
  assert.equal(out.buy, true, 'a round assigned to read must read, or the comparison is diluted without a record')
  ok('an assigned read is not cancelled by the cap')
})

test('off is still off whatever the config says', () => {
  const out = legBudget({ mode: 'off', rounds: bought(9), config: { maxRounds: 1, trial: true } })
  assert.equal(out.buy, false)
  ok('off is still off whatever the config says')
})
