// What a screening round has to write down for the schedule to be auditable.
//
// `halvingPlan` can describe a ladder and `fidelityCheck` can veto one, but
// neither changes anything until the round records what it actually did: which
// candidates the screen dropped, how much of the round's budget their shares
// were worth, and whether the proxy that dropped them still ranks like the
// verifier. Without those three on the round, the only thing anyone can say
// afterwards is "we screened sometimes", which is what `docs/l2-state.md` had to
// say for two days.
//
// The last assertion is the one that matters most: the schedule is named
// `prefilter`, not `halving`, because the dropped candidates' budget is *not*
// handed back to the survivors. Calling it halving would make the 0.73% spend
// figure look like a verdict on successive halving instead of on a prefilter.
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

async function runWith(halvingEnabled, extra = {}) {
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
    halving: { enabled: halvingEnabled, keepRatio: 0.5, screenTimeoutMs: 60_000, ...(extra.halving || {}) },
  })
  const calls = []
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher(calls), log: () => {}, notify: () => {} })
  const finish = runtime.events.find((e) => e.type === 'round.finished')?.data
  const dropped = runtime.events
    .filter((e) => e.type === 'attempt.finished' && e.data?.screenedOut)
    .map((e) => e.data)
  rmSync(dir, { recursive: true, force: true })
  return { finish, dropped, state: view.state }
}

const on = await runWith(true)
assert.ok(on.finish, 'the round finished')
// 1. Which candidates the screen dropped, and which it kept.
assert.ok(Array.isArray(on.finish.screened), 'the round says which candidates were screened')
assert.equal(on.finish.screened.length, 4, 'all four were screened')
assert.ok(Array.isArray(on.finish.kept), 'the round says which candidates the screen kept')
assert.equal(on.finish.kept.length, 2, 'half were kept')
assert.equal(on.finish.screened.filter((id) => on.finish.kept.includes(id)).length, 2)
ok('a screened round names what it screened and what it kept')

// 2. The dropped candidates carry their share of the ceiling, and say where it
// went. `reallocUsd: 0` is the honest record: it went nowhere.
assert.equal(on.dropped.length, 2, 'two candidates were dropped by the screen')
for (const rec of on.dropped) {
  assert.ok(Number.isFinite(rec.freedUsd) && rec.freedUsd > 0, `a dropped candidate frees its share (${rec.freedUsd})`)
  assert.equal(rec.reallocUsd, 0, 'and nothing was handed back to the survivors')
  assert.equal(rec.halvingKind, 'prefilter', 'the schedule is named for what it does')
}
ok('a dropped candidate says what its share was worth and that it went nowhere')

// 3. The round carries the plan it ran, priced the same way the module prices it.
assert.ok(on.finish.halving, 'the round carries a priced plan')
assert.equal(on.finish.halving.kind, 'prefilter')
assert.deepEqual(
  on.finish.halving.rungs.map((r) => r.keep),
  [4, 2, 1],
  'the ladder is the 4 → 2 → 1 the module describes',
)
assert.equal(on.finish.halving.returnedUsd, 0)
const samePlan = halvingPlan({ candidates: 4, eta: 2, maxUsd: on.finish.halving.maxUsd })
assert.deepEqual(on.finish.halving.rungs, samePlan.rungs, 'the round recorded the module output, it did not re-derive a second one')
ok('the round records the priced ladder it actually ran')

// 4. Whether the proxy has been agreeing with the verifier, on this campaign's
// own record — and a switch that can turn screening off by itself.
assert.ok(on.finish.fidelity && typeof on.finish.fidelity.halving === 'boolean', 'the round says whether the proxy still ranks')
assert.ok(String(on.finish.fidelity.reason || '').length > 0, 'and why')
ok('a round says whether the cheap stage still ranks like the expensive one')

// 5. Halving off is unchanged: no plan, no screening, nothing reallocated.
const off = await runWith(false)
assert.equal(off.finish.halving?.kind ?? 'none', 'none', 'a round that did not screen has no schedule')
assert.deepEqual(off.finish.screened ?? [], [], 'and it screened nothing')
assert.equal(off.dropped.length, 0)
ok('a round without screening records no schedule at all')

// 6. The veto is real: a campaign whose recent screening record shows the screen
// never keeping the promoted candidate stops paying for screens, even though the
// task still declares one and config still enables it.
{
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 2 }),
    tasks: [
      { id: 't1', family: 'f', prompt: 'make it pass', verify: { cmd: 'exit 0' }, screen: { cmd: 'exit 0' } },
    ],
  })
  // Five rounds in which the screen kept nothing that the verifier promoted.
  view.state.rounds = Array.from({ length: 5 }, (_, i) => ({
    n: i + 1,
    status: 'promoted',
    screened: ['r1a1', 'r1a2'],
    kept: ['r1a1'],
    promotedId: 'r1a2',
  }))
  const config = baseConfig({ halving: { enabled: true, keepRatio: 0.5, screenTimeoutMs: 60_000 } })
  const calls = []
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher(calls), log: () => {}, notify: () => {} })
  const screens = calls.filter((c) => String(c.brief).includes('Screening pass')).length
  const finish = runtime.events.find((e) => e.type === 'round.finished')?.data
  rmSync(dir, { recursive: true, force: true })
  assert.equal(screens, 0, 'a proxy that ranks the wrong way stops being paid for')
  assert.equal(finish.fidelity.halving, false, 'and the round says why')
  assert.match(finish.fidelity.reason, /(not a discount|rank)/i)
}
ok('the fidelity check can turn screening off on a campaign that has the record')

console.log(`\n${pass}/${pass} passed`)
