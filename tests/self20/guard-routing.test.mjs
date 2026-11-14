// Wave 20 / p3: the guard stops costing half a round.
//
// Every promotion runs `scripts/test-all.mjs`: 3m41s on a good day, 12 minutes
// on a bad one, against a round that takes about twelve. The research brief is
// blunt about what is safe: selection is only trustworthy when it over-approximates,
// so the plan routes on change class and falls back to the full suite whenever
// the diff touches what a selector cannot see.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guardPlan } from '../../scripts/guard-plan.mjs'

test('a source change runs everything', () => {
  const plan = guardPlan({ changed: ['src/runtime/round.js'], promotionsSinceFull: 0 })
  assert.equal(plan.mode, 'full')
})

test('a docs-only change runs nothing it cannot justify', () => {
  const plan = guardPlan({ changed: ['docs/contracts.md'], promotionsSinceFull: 0 })
  assert.equal(plan.mode, 'light')
  assert.ok(plan.suites.length >= 1, 'the docs pin still runs')
})

test('a test-only change runs just those specs, and the config pins', () => {
  const plan = guardPlan({ changed: ['tests/self20/gate-noise.test.mjs'], promotionsSinceFull: 0 })
  assert.equal(plan.mode, 'related')
  assert.ok(plan.suites.includes('tests/self20/gate-noise.test.mjs'))
})

test('a lockfile or build config is never narrowed', () => {
  assert.equal(guardPlan({ changed: ['package.json'], promotionsSinceFull: 0 }).mode, 'full')
  assert.equal(guardPlan({ changed: ['pnpm-lock.yaml'], promotionsSinceFull: 0 }).mode, 'full')
})

test('the full suite is owed at least once every N promotions', () => {
  assert.equal(guardPlan({ changed: ['tests/x.test.mjs'], promotionsSinceFull: 9, fullEvery: 10 }).mode, 'full')
  assert.equal(guardPlan({ changed: ['tests/x.test.mjs'], promotionsSinceFull: 1, fullEvery: 10 }).mode, 'related')
})

test('an empty diff is not an excuse to skip the guard', () => {
  assert.equal(guardPlan({ changed: [], promotionsSinceFull: 0 }).mode, 'full')
})
