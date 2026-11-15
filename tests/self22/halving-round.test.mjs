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
  // A screen is a paid model call: its price must reach the round's cost, or a
  // halving policy reads as cheaper than it is.
  const screenedCost = runtime.events
    .filter((e) => e.type === 'attempt.finished' && e.data?.screenedOut)
    .reduce((sum, e) => sum + (Number(e.data?.costUsd) || 0), 0)
  // A survivor paid for its screen too. If that bill stays out of the attempt
  // record, every round that kept a candidate understates what halving cost.
  const survivors = runtime.events
    .filter((e) => e.type === 'attempt.finished' && !e.data?.screenedOut && e.data?.screened)
    .map((e) => ({
      costUsd: Number(e.data.costUsd) || 0,
      screenUsd: Number(e.data.screened.costUsd) || 0,
      splitUsd: Number(e.data.attemptCostUsd ?? NaN),
      screenCostUsd: Number(e.data.screenCostUsd ?? NaN),
    }))
  const allAttemptCost = runtime.events
    .filter((e) => e.type === 'attempt.finished')
    .reduce((sum, e) => sum + (Number(e.data?.costUsd) || 0), 0)
  const finish = runtime.events.find((e) => e.type === 'round.finished')?.data
  const attemptSum = (finish?.attempts ?? []).reduce((sum, a) => sum + (Number(a?.costUsd) || 0), 0)
  rmSync(dir, { recursive: true, force: true })
  return { screens, full, screenedOut, screenedCost, survivors, allAttemptCost, finishCost: Number(finish?.costUsd) || 0, attemptSum }
}

const on = await roundWith(true)
assert.equal(on.screens, 4, 'every candidate gets the cheap screen')
assert.ok(on.full <= 2, `only the kept half gets a full attempt (got ${on.full})`)
assert.equal(on.screenedOut, 4 - on.full, 'dropped candidates are recorded as screened out')
assert.ok(on.screenedCost >= 0 && Number.isFinite(on.screenedCost), 'a screen carries a billable cost')
assert.ok(on.finishCost >= on.screenedCost - 1e-9, 'the round cost includes the screens it bought')
assert.ok(on.survivors.length > 0, 'a survivor keeps a record of the screen it passed')
for (const s of on.survivors) {
  assert.ok(s.costUsd >= s.screenUsd - 1e-12, `a survivor is billed for its screen too (${s.costUsd} vs ${s.screenUsd})`)
  assert.ok(Number.isFinite(s.splitUsd) && Number.isFinite(s.screenCostUsd), 'the split is recorded')
  assert.ok(Math.abs(s.splitUsd + s.screenCostUsd - s.costUsd) < 1e-9, 'split adds back to the candidate cost')
}
assert.ok(on.finishCost >= on.allAttemptCost - 1e-9, 'round cost carries every candidate, screened or not')
ok('halving on: screens all four, buys at most two full attempts, and pays for the screens')

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
