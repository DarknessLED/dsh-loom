// A run the harness killed is not a verdict on the code.
//
// On this machine the Windows job runner sometimes takes a command out at the
// knees: stderr carries `SUBPROCESS_RUNNER_FAILED: Windows Job runner exited
// with exit code 1073807364` and the exit status is the runner's, not the
// program's. A seven-direction survey rerun was thrown away because the guard
// read that status as "the tests failed". The guard has to name a kill as a
// kill, spend its existing one-retry budget on it, and when retries run out say
// the code was never judged instead of reporting a failure the code never had.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  JOB_RUNNER_KILL_STATUS,
  guardReport,
  isKilledRun,
  retryPlan,
} from '../../scripts/guard-retry.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const runner = readFileSync(join(here, '..', '..', 'scripts', 'test-all.mjs'), 'utf8')

const KILL_LINE =
  'SUBPROCESS_RUNNER_FAILED: Windows Job runner exited with exit code 1073807364'
const REAL_FAILURE = 'not ok 1 - the assertion that actually broke\n# fail 1'

test('a genuine failure is reported as a failure and is not retried again', () => {
  const plan = guardReport([
    { file: 'a', firstStatus: 1, firstTail: REAL_FAILURE, retryStatus: 1, retryTail: REAL_FAILURE },
  ])
  assert.deepEqual(plan.failed, ['a'])
  assert.deepEqual(plan.retry, [])
  assert.deepEqual(plan.killed, [])
  assert.deepEqual(plan.recovered, [])
})

test('a failure whose retry the runner killed is still a failure, not a free retry', () => {
  const plan = guardReport([
    { file: 'b', firstStatus: 1, firstTail: REAL_FAILURE, retryStatus: JOB_RUNNER_KILL_STATUS, retryTail: KILL_LINE },
  ])
  assert.deepEqual(plan.failed, ['b'])
  assert.deepEqual(plan.retry, [])
  assert.deepEqual(plan.killed, [])
})

test('the runner exit code and its stderr line are both recognised as a kill', () => {
  assert.equal(isKilledRun({ status: JOB_RUNNER_KILL_STATUS, output: '' }), true, 'the exit code alone names the kill')
  assert.equal(isKilledRun({ status: 1, output: KILL_LINE }), true, 'and so does the runner line alone')
  assert.equal(isKilledRun({ status: 1, output: REAL_FAILURE }), false, 'a real failure is not a kill')
  assert.equal(isKilledRun({ status: 0, output: '' }), false, 'a pass is not a kill')
})

test('a killed run is named as killed and retried, not failed', () => {
  const plan = guardReport([
    { file: 'k', firstStatus: JOB_RUNNER_KILL_STATUS, firstTail: KILL_LINE, retryStatus: null },
  ])
  assert.deepEqual(plan.killedFirst, ['k'], 'the report names the kill as a kill')
  assert.deepEqual(plan.retry, ['k'], 'and spends the existing retry budget on it')
  assert.deepEqual(plan.failed, [], 'a killed run is never a failure')
  assert.deepEqual(plan.killed, [], 'nothing is exhausted yet')
  assert.match(runner, /guardReport\(/, 'the runner recognises the kill through the shared rule')
  assert.match(runner, /killed /, 'and prints the run as killed, not as failed')
})

test('a killed run that keeps getting killed says the code was never judged', () => {
  const plan = guardReport([
    {
      file: 'k',
      firstStatus: JOB_RUNNER_KILL_STATUS,
      firstTail: KILL_LINE,
      retryStatus: JOB_RUNNER_KILL_STATUS,
      retryTail: KILL_LINE,
    },
  ])
  assert.deepEqual(plan.killed, ['k'], 'the exhausted retries are reported as killed runs')
  assert.deepEqual(plan.failed, [], 'and not as a failure of the code')
  assert.deepEqual(plan.retry, [], 'with no retries left to spend')
  assert.match(runner, /never judged/, 'the report says the code was never judged')
  assert.match(runner, /KILLED /, 'and names the run as killed in the failure section')
})

test('a run that passes after one kill reports success, not a failure', () => {
  const plan = guardReport([
    { file: 'k', firstStatus: JOB_RUNNER_KILL_STATUS, firstTail: KILL_LINE, retryStatus: 0 },
  ])
  assert.deepEqual(plan.recovered, ['k'], 'a kill followed by a pass is a recovery')
  assert.deepEqual(plan.killedFirst, ['k'], 'the kill is still recorded')
  assert.deepEqual(plan.failed, [])
  assert.deepEqual(plan.killed, [])
  assert.match(runner, /killed-then-passed/, 'the guard reports the recovered run by name')
})

test('the old three-list retry view is unchanged', () => {
  assert.deepEqual(retryPlan([]), { retry: [], flaky: [], failed: [] })
  assert.deepEqual(retryPlan([{ file: 'c', firstStatus: 1, retryStatus: 0 }]).flaky, ['c'])
  assert.deepEqual(retryPlan([{ file: 'd', firstStatus: 1, retryStatus: 1 }]).failed, ['d'])
})
