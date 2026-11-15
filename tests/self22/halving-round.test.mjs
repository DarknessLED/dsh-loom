// Successive halving as a policy knob, at the round level.
//
// The halves module already exists and `policy.halving` already reaches
// `screenEnabled`, but the knob only matters if the round actually buys fewer
// full attempts when it is on and behaves exactly as before when it is off.
// This pins both, by counting what the dispatcher was asked to run.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from './fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

async function roundWith(halvingEnabled, policy = null) {
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 4 }),
    tasks: [
      {
        id: 't1',
        family: 'f',
        prompt: 'make it pass',
        verify: { cmd: 'exit 0' },
        screen: { cmd: 'exit 0' },
      },
    ],
  })
  if (policy) view.state.policy = policy
  const config = baseConfig({ halving: { enabled: halvingEnabled, keepRatio: 0.5, screenTimeoutMs: 60_000 } })
  const calls = []
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher(calls), log: () => {}, notify: () => {} })
  const screens = calls.filter((c) => String(c.brief).includes('Screening pass')).length
  const full = calls.filter((c) => String(c.brief).includes('WORKER: try to make it pass')).length
  const screenedOut = runtime.events.filter((e) => e.type === 'attempt.finished' && e.data?.screenedOut).length
  rmSync(dir, { recursive: true, force: true })
  return { screens, full, screenedOut }
}

const on = await roundWith(true)
assert.equal(on.screens, 4, 'every candidate gets the cheap screen')
assert.ok(on.full <= 2, `only the kept half gets a full attempt (got ${on.full})`)
assert.equal(on.screenedOut, 4 - on.full, 'dropped candidates are recorded as screened out')
ok('halving on: screens all four, buys at most two full attempts')

const off = await roundWith(false)
assert.equal(off.screens, 0, 'halving off must not screen')
assert.equal(off.full, 4, 'halving off buys the same four attempts as before')
assert.equal(off.screenedOut, 0)
ok('halving off: byte-for-byte the old dispatch plan')

const overridden = await roundWith(true, { halving: false })
assert.equal(overridden.screens, 0, 'the campaign policy is the knob, and it wins over config')
assert.equal(overridden.full, 4)
ok('a campaign policy override turns halving off even when config has it on')

console.log(`\n${pass}/${pass} passed`)
