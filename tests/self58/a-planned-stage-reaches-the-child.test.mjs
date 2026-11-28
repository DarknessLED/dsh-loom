// A planned stage reaches the child, and an unplanned round is untouched.
//
// The pill is not the feature: the feature is that an enabled switch changes what
// the child is dispatched with, and that a round it did not touch is
// byte-identical to the rounds already in the ledger. Both halves need an
// assertion, because either one alone can be satisfied by a switch that does
// nothing (off) or a switch that quietly changes every round (on).
//   node tests/self58/a-planned-stage-reaches-the-child.test.mjs
import assert from 'node:assert/strict'

import { rmSync } from 'node:fs'

import { baseConfig, chainSpec, fakeDispatcher, makeRepo, makeRuntime, REPORT } from '../self22/fixture.mjs'
import { runRound } from '../../src/runtime/round.js'
import { ok, done } from '../chaos/fixture.mjs'

const dispatch = (enabled) => ({
  session: {
    dispatch: {
      enabled,
      stages: {
        plan: { harness: 'planning', preset: null },
        implement: { harness: 'implementation', preset: 'loom-implementer' },
        verify: { harness: 'verification', preset: 'loom-verifier' },
      },
    },
  },
})

async function oneRound(config, task = {}) {
  const theTask = { id: 'plain', prompt: 'make it pass', verify: { cmd: 'exit 0' }, ...task }
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 1 }),
    tasks: [theTask],
    budget: { usd: 4, spentUsd: 0 },
  })
  const record = []
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher(record, () => REPORT), log: () => {}, notify: () => {} })
  const finished = runtime.events.find((e) => e.type === 'round.finished')?.data ?? null
  const attempt = runtime.events.filter((e) => e.type === 'attempt.finished').at(-1)?.data ?? null
  rmSync(dir, { recursive: true, force: true })
  return { record, finished, attempt }
}

// 1. Off: no preset on the dispatch and no stage on the record. This is the
//    round that already exists in the ledger, replayed.
{
  const { record, attempt } = await oneRound(baseConfig(), { id: 'plain' })
  assert.ok(record.length >= 1, 'a round was dispatched')
  assert.equal('preset' in record[0].opts, false, 'an unplanned round sends no preset')
  assert.equal('stage' in attempt, false, 'and writes no stage onto the attempt')
  ok('with the switch off, the dispatch and the record are what they were before')
}

// 2. On: the stage's preset is dispatched, and the record says which harness ran.
{
  const { record, attempt } = await oneRound({ ...baseConfig(), ...dispatch(true) }, { id: 'staged', stage: 'implement' })
  assert.equal(record[0].opts.preset, 'loom-implementer', 'the implementing stage\u2019s preset reaches the child')
  assert.equal(attempt.stage, 'implement', 'the attempt records the stage it ran in')
  assert.equal(attempt.harness, 'implementation', 'and the harness that stage named')
  ok('with the switch on, the stage and its harness reach both the child and the record')
}

// 3. A task that declares verification gets the verifying harness, and the preset
//    of a stage nobody configured is absent rather than guessed.
{
  const configured = dispatch(true)
  configured.session.dispatch.stages.verify = { harness: 'verification' }
  const { record, attempt } = await oneRound({ ...baseConfig(), ...configured }, { id: 'v', stage: 'verify' })
  assert.equal(attempt.stage, 'verify', 'the declared stage is the one recorded')
  assert.equal(attempt.harness, 'verification', 'with the harness the configuration gave it')
  assert.equal('preset' in record[0].opts, false, 'an unconfigured preset is not invented')
  ok('a stage without a configured preset dispatches no preset instead of a guessed one')
}

done()
