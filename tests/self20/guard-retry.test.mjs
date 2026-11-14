// Wave 23: a guard that fails on a flake is a guard that lies.
//
// p5-wire round 3 was rolled back because `tests/tri9/early-abort.test.mjs` failed
// inside the full run and passed on its own: 201/202 with one flake costs a whole
// round. The research brief on test selection says the same thing from the other
// side — flakiness, not change detection, is the dominant risk.
//
// So the guard retries a failure exactly once, and only a suite that fails twice
// fails the build.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { retryPlan } from '../../scripts/guard-retry.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const runner = readFileSync(join(here, '..', '..', 'scripts', 'test-all.mjs'), 'utf8')

const pass = { file: 'a', firstStatus: 0, retryStatus: null }
const owed = { file: 'b', firstStatus: 1, retryStatus: null }
const flake = { file: 'c', firstStatus: 1, retryStatus: 0 }
const real = { file: 'd', firstStatus: 1, retryStatus: 1 }

test('a suite that passed is never retried', () => {
  assert.deepEqual(retryPlan([pass]).retry, [])
})

test('a failure with no retry yet is owed exactly one', () => {
  const plan = retryPlan([pass, owed])
  assert.deepEqual(plan.retry, ['b'])
  assert.deepEqual(plan.flaky, [])
  assert.deepEqual(plan.failed, [])
})

test('a suite that passes alone is flaky, not broken', () => {
  const plan = retryPlan([pass, flake, real])
  assert.deepEqual(plan.flaky, ['c'])
  assert.deepEqual(plan.failed, ['d'])
})

test('twice is a break', () => {
  assert.deepEqual(retryPlan([real]).failed, ['d'])
})

test('an empty run retries nothing', () => {
  assert.deepEqual(retryPlan([]), { retry: [], flaky: [], failed: [] })
})

test('the guard actually uses the plan', () => {
  assert.match(runner, /retryPlan\(/, 'the runner must classify through the same rule the tests pin')
  assert.match(runner, /const results = \[\]/, 'failures are collected, then classified, not counted on the spot')
  assert.match(runner, /flaky on retry/, 'the summary must name what it retried')
})
