// When a stall card is raised, the card has to say which kind of stall it is.
// "Burn" was only reachable if the operator set checkpoint.burnUsd by hand, so
// the default shape of the product never fired it: a campaign could spend its
// whole budget on flat rounds and still be told "nothing promoted". The default
// belongs in the config table, and the choice belongs in a function a spec can
// call instead of an inline ternary.

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { normalizeConfig } from '../../src/core/config.js'
import { stallTrigger } from '../../src/runtime/stall.js'

const config = normalizeConfig({})

test('the burn trigger has a default, so it fires without hand-tuning', () => {
  assert.equal(config.checkpoint.burnUsd, 0.12)
})

test('the trigger names the constraint that fired first', () => {
  const burnUsd = config.checkpoint.burnUsd
  assert.equal(stallTrigger({ progress: 0, spendUsd: 0.13, burnUsd }), 'burn')
  assert.equal(stallTrigger({ progress: 0.6, spendUsd: 0.13, burnUsd }), 'burn', 'burn outranks near-miss')
  assert.equal(stallTrigger({ progress: 0, spendUsd: 0.05, burnUsd }), 'flat')
  assert.equal(stallTrigger({ progress: 0.6, spendUsd: 0.05, burnUsd }), 'near-miss')
  assert.equal(stallTrigger({ progress: 0, spendUsd: 1, burnUsd: 0 }), 'flat', 'burnUsd 0 disables the trigger')
  assert.equal(stallTrigger({ progress: 0, spendUsd: 1 }), 'flat', 'no threshold, no burn')
})

test('the round wires the trigger through the shared function', () => {
  const src = readFileSync(new URL('../../src/runtime/round.js', import.meta.url), 'utf8')
  assert.match(src, /stallTrigger/)
})
