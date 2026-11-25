// Halving that keeps its savings is a screen; halving that keeps the same
// budget is a prefilter. This pins the difference and the knob that chooses it.
//
// `config.halving.returnToSurvivors` defaults to false, and false has to stay
// byte-identical to the prefilter this loop has always run: `returnedUsd` 0,
// `reallocUsd` 0, `kind: 'prefilter'`, the same ladder of rungs. When it is true
// a round that screens N candidates down to K reports the freed share as
// `returnedUsd`, prices the survivors' rung at the money they now hold, and
// records on every dropped attempt the share it handed on.
//
// Every arithmetic claim is checked at six decimals, and the degenerate cases —
// a zero ceiling and a single candidate — are here because they are exactly
// where a share becomes `0 / 0`.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { halvingPlan } from '../../src/runtime/halving.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}
const near = (a, b, msg) => assert.ok(Math.abs(Number(a) - Number(b)) < 1e-9, `${msg} (${a} vs ${b})`)

// 1. Flag off is the legacy prefilter, field for field. Four candidates on a
// 0.4 ceiling: each holds 0.1, the ladder is 4 → 2 → 1, nothing comes back.
const off = halvingPlan({ candidates: 4, eta: 2, maxUsd: 0.4 })
assert.equal(off.returnedUsd, 0, 'flag off returns nothing')
assert.equal(off.kind, 'prefilter', 'and says it is a prefilter')
assert.deepEqual(off.rungs.map((r) => r.keep), [4, 2, 1])
assert.deepEqual(off.rungs.map((r) => r.drop), [0, 2, 1])
assert.deepEqual(
  off.rungs.map((r) => [r.costUsd, r.freedUsd]),
  [
    [0.4, 0],
    [0.2, 0.2],
    [0.1, 0.1],
  ],
  'the ladder is priced exactly as it always was',
)
const explicitOff = halvingPlan({ candidates: 4, eta: 2, maxUsd: 0.4, returnToSurvivors: false })
assert.deepEqual(explicitOff.rungs, off.rungs, 'an explicit false is the default behaviour')
assert.equal(explicitOff.returnedUsd, 0)
ok('flag off is byte-identical to the prefilter we always ran')

// 2. Flag on: the two dropped candidates hand their 0.1 each to the survivors.
// returnedUsd is 0.2, each survivor's budget rises by 0.2 / 2 = 0.1 — from 0.1
// to 0.2 — and the survivors' rung costs the whole ceiling, not more.
const on = halvingPlan({ candidates: 4, eta: 2, maxUsd: 0.4, returnToSurvivors: true })
assert.equal(on.kind, 'halving', 'a plan that hands the freed shares back is successive halving')
assert.equal(on.candidates, 4)
assert.equal(on.survivors, 2)
near(on.returnedUsd, 0.2, 'the freed share of the two dropped candidates is returned')
near(on.perSurvivorUsd, 0.2, 'and each survivor holds its own share plus its half of the freed one')
near(on.perSurvivorUsd - 0.4 / 4, on.returnedUsd / on.survivors, 'the rise per survivor is exactly returnedUsd / K')
near(on.shareUsd, 0.1, 'the per-candidate share of the ceiling is recorded')
assert.equal(on.rungs[0].keep, 2, 'the first rung the round runs is the survivor rung')
near(on.rungs[0].costUsd, 0.4, 'the survivors spend the whole ceiling, and not a cent more')
near(on.rungs[0].costUsd - on.rungs[0].keep * on.shareUsd, on.returnedUsd, 'the rung rose by exactly what it was handed')
near(on.rungs[0].freedUsd, 0.2, 'and it records what it handed on')
assert.equal(on.rungs.at(-1).keep, 1, 'the ladder still ends at the ordinary gate')
assert.ok(
  on.rungs.every((r) => Number.isFinite(r.costUsd) && Number.isFinite(r.freedUsd)),
  'every price is a finite number',
)
ok('flag on returns the freed share to the survivors and prices it')

// 3. A zero ceiling has nothing to split. It must not produce NaN, a negative
// price, or an invented dollar of saving.
const free = halvingPlan({ candidates: 4, eta: 2, maxUsd: 0, returnToSurvivors: true })
assert.equal(free.returnedUsd, 0)
assert.equal(free.perSurvivorUsd, 0)
assert.equal(free.kind, 'none', 'with nothing to spend there is no schedule to name')
assert.ok(free.rungs.every((r) => Number.isFinite(r.costUsd) && r.costUsd >= 0))
assert.ok(free.rungs.every((r) => Number.isFinite(r.freedUsd) && r.freedUsd >= 0))
const junk = halvingPlan({ candidates: 4, eta: 2, maxUsd: Number.NaN, returnToSurvivors: true })
assert.equal(junk.returnedUsd, 0, 'a junk ceiling is an empty ceiling, not NaN')
assert.equal(junk.perSurvivorUsd, 0)
ok('a zero ceiling is priced at zero instead of NaN')

// 4. One candidate cannot be screened down: no rung to drop, nothing returned,
// and still a finite budget figure for the single attempt that will run.
const single = halvingPlan({ candidates: 1, eta: 2, maxUsd: 0.5, returnToSurvivors: true })
assert.equal(single.kind, 'none')
assert.equal(single.returnedUsd, 0, 'a lone candidate frees nothing')
near(single.perSurvivorUsd, 0.5, 'it simply holds the ceiling it already had')
assert.equal(single.rungs.length, 1)
ok('a single candidate divides by one and stays finite')

// 5. A real round, flag off: the prefilter record is unchanged — dropped
// candidates free their share and hand on nothing.
async function runWith(returnToSurvivors) {
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 4 }),
    tasks: [
      { id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 0' }, screen: { cmd: 'exit 0' } },
    ],
    budget: { usd: 4, spentUsd: 0 },
  })
  const config = baseConfig({
    halving: {
      enabled: true,
      keepRatio: 0.5,
      screenTimeoutMs: 60_000,
      ...(returnToSurvivors === null ? {} : { returnToSurvivors }),
    },
  })
  const calls = []
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher(calls), log: () => {}, notify: () => {} })
  const finish = runtime.events.find((e) => e.type === 'round.finished')?.data
  const dropped = runtime.events
    .filter((e) => e.type === 'attempt.finished' && e.data?.screenedOut)
    .map((e) => e.data)
  rmSync(dir, { recursive: true, force: true })
  return { finish, dropped }
}

const round0 = await runWith(null)
assert.ok(round0.finish, 'the round finished')
assert.equal(round0.dropped.length, 2, 'two candidates were dropped by the screen')
for (const rec of round0.dropped) {
  // Byte-identical to today: the prefilter read the freed figure off the first
  // rung's cost, which is the whole ceiling, and nobody checks it against a
  // per-candidate share.
  near(rec.freedUsd, round0.finish.halving.rungs[0].costUsd, 'the prefilter records the number it always did')
  assert.equal(rec.reallocUsd, 0, 'and with the flag off it hands on nothing')
  assert.equal(rec.halvingKind, 'prefilter')
}
assert.equal(round0.finish.halving.returnedUsd, 0)
assert.equal(round0.finish.halving.kind, 'prefilter')
ok('a round with the flag off keeps the money and records that')

// 6. The same round with the flag on: two survivors split the $2 the dropped
// candidates left behind, and every dropped record says what it handed on.
const round1 = await runWith(true)
assert.ok(round1.finish, 'the round finished')
assert.equal(round1.dropped.length, 2, 'two candidates were dropped by the screen')
near(round1.finish.halving.returnedUsd, 2, 'the round returns the freed $2')
near(round1.finish.halving.perSurvivorUsd, 2, 'and each survivor may now spend $2 instead of $1')
assert.equal(round1.finish.halving.kind, 'halving')
for (const rec of round1.dropped) {
  near(rec.freedUsd, 1, 'a dropped candidate still frees its $1 share')
  near(rec.reallocUsd, 1, 'and it records the $1 it handed to the survivors')
  assert.equal(rec.halvingKind, 'halving', 'the record is named for what it did')
}
// The money is conserved: what the survivors were handed is exactly what the
// dropped candidates stopped holding.
near(
  round1.dropped.reduce((sum, rec) => sum + rec.reallocUsd, 0),
  round1.finish.halving.returnedUsd,
  'the handed-on shares add up to the returned budget',
)
assert.ok(
  round1.finish.halving.rungs[0].costUsd <= round1.finish.halving.maxUsd + 1e-9,
  'the survivors never spend more than the ceiling the round had',
)
ok('a real round hands its dropped candidates\u2019 budget to the survivors')

console.log(`\n${pass}/${pass} passed`)
