// Continuous scoring in live rounds.
//
// `scoreOf` has preferred a finite killRate since p6, but a round only saw the
// metrics a task's `verify.metrics` patterns produced — the harness's
// `KILLRATE=` line never reached an attempt unless the task declared a regex for
// it. This spec pins the wiring: the round reads the harness line itself, scores
// the attempt by it, and records which measurement the number came from.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from './fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

async function runOnce(verifyCmd) {
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 1 }),
    tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: verifyCmd } }],
  })
  const config = baseConfig()
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })
  const attempt = runtime.events.find((e) => e.type === 'attempt.finished')?.data
  const round = runtime.events.find((e) => e.type === 'round.finished')?.data
  rmSync(dir, { recursive: true, force: true })
  return { attempt, round }
}

const graded = await runOnce('echo KILLRATE=0.6')
assert.ok(graded.attempt, 'the attempt was recorded')
assert.equal(graded.attempt.metrics.killRate, 0.6, 'the harness line reached the attempt without a task pattern')
assert.equal(graded.attempt.score, 0.6, 'the attempt is scored by the kill rate, not the exit code')
assert.equal(graded.attempt.scoreSource, 'killRate')
assert.equal(graded.round.score, 0.6)
assert.equal(graded.round.scoreSource, 'killRate')
ok('a graded round scores the attempt continuously and says so')

const binary = await runOnce('exit 0')
assert.equal(binary.attempt.score, 1)
assert.equal(binary.attempt.scoreSource, 'binary')
assert.equal(binary.attempt.metrics.killRate ?? null, null, 'an absent reading is absent, not zero')
ok('an ungraded round keeps the old 1/0 score')

const failed = await runOnce('echo KILLRATE=0.9 && exit 1')
assert.equal(failed.attempt.verifierOk, false)
assert.equal(failed.attempt.score, 0, 'a failed verifier is not rescued by a metric it printed')
assert.equal(failed.attempt.scoreSource, 'binary')
ok('a failed verifier scores zero even when it printed a kill rate')

console.log(`\n${pass}/${pass} passed`)
