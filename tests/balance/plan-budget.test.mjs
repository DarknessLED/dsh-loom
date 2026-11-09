// Seen live (loom-acc2, and in 18 earlier rounds): the planner is given a fixed
// 240 s deadline, it hits that deadline almost every round, and the round then
// proceeds without a plan. In the ledger that is `planTimedOut: true` plus
// `planMs ≈ 240000` — a 40% tax on a ~650 s round that bought nothing.
//
// The verdict research (research/plan-verdict-2026-11.md §5) says the honest
// lever is not "prove the planner useful" (that needs an interleaved A/B nobody
// has run) but "stop paying full price while it keeps returning nothing": a
// deadline that learns from the record it owns. So the next deadline is a
// function of the last few planner outcomes, not a constant.
//
// Contract:
//   planBudgetMs(rounds, opts) -> number
//     opts = { ceiling = 240000, floor = 60000, window = 3 }
//     - Only rounds that recorded a finite `planMs` are evidence. A round with no
//       planning measurement is silence, not a fast plan.
//     - Look at the last `window` such rounds. If all of them timed out, halve
//       the ceiling, and keep halving for each further consecutive full window of
//       timeouts, never below `floor`.
//     - One planner that finished inside its deadline resets the budget to the
//       ceiling: the planner earned the full time back.
//     - No evidence at all -> ceiling (never pay less than the default without
//       evidence, and never punish a fresh campaign).
//     - Never return a non-finite number, never return more than ceiling or less
//       than floor even when the caller passes nonsense.
//   The round records the budget it actually used as `planBudgetMs`.
import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const mod = await import('../../src/runtime/plan-budget.js').catch(() => null)
assert.ok(mod, 'src/runtime/plan-budget.js exists so the planner budget is assertable')
const { planBudgetMs } = mod

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const round = (over) => ({ n: 1, status: 'promoted', promoted: true, planMs: 240000, planTimedOut: true, ...over })

// 1. No evidence: pay the ceiling. A fresh campaign is not punished for silence.
assert.equal(planBudgetMs([]), 240000, 'with no history the planner gets the default ceiling')
assert.equal(
  planBudgetMs([round({ planMs: undefined, planTimedOut: false })]),
  240000,
  'a round that never recorded a plan is not evidence of a timeout',
)
ok('silence keeps the ceiling')

// 2. A planner that finishes inside its deadline resets the budget.
assert.equal(
  planBudgetMs([round({ planTimedOut: false, planMs: 90000 })]),
  240000,
  'one finished plan earns the full deadline back',
)
assert.equal(
  planBudgetMs([round(), round(), round({ planTimedOut: false, planMs: 120000 })]),
  240000,
  'a window that ends in a finished plan is not a streak',
)
ok('a finished plan resets the budget')

// 3. Three consecutive timeouts halve it; six halve it again; the floor holds.
const three = [round({ n: 1 }), round({ n: 2 }), round({ n: 3 })]
assert.equal(planBudgetMs(three), 120000, 'one full window of timeouts halves the deadline')
const six = [...three, round({ n: 4 }), round({ n: 5 }), round({ n: 6 })]
assert.equal(planBudgetMs(six), 60000, 'two windows halve it again')
const nine = [...six, round({ n: 7 }), round({ n: 8 }), round({ n: 9 })]
assert.equal(planBudgetMs(nine), 60000, 'the floor stops the halving')
ok('each full window of timeouts halves the deadline, down to the floor')

// 4. Only the tail of the record counts: an ancient timeout streak does not
//    outlive the planner that recovered from it.
assert.equal(
  planBudgetMs([...three, round({ n: 4, planTimedOut: false, planMs: 100000 }), round({ n: 5, planTimedOut: false, planMs: 80000 }), round({ n: 6, planTimedOut: false, planMs: 70000 })]),
  240000,
  'the last three rounds decide, not the whole history',
)
ok('the recent tail decides')

// 5. Partial windows do not halve: two timeouts are not enough.
assert.equal(planBudgetMs([round({ n: 1 }), round({ n: 2 })]), 240000, 'two timeouts are a partial window')
ok('a partial window is not a streak')

// 6. Nonsense in, a usable number out.
for (const bad of [null, undefined, 'x', [null, 3, 'x'], [round({ planMs: Number.NaN })], [round({ planMs: -5 })]]) {
  const got = planBudgetMs(bad)
  assert.ok(Number.isFinite(got), `planBudgetMs(${JSON.stringify(bad)}) is finite, got ${got}`)
  assert.ok(got >= 60000 && got <= 240000, `and inside [floor, ceiling], got ${got}`)
}
assert.equal(planBudgetMs(three, { ceiling: 100000, floor: 90000, window: 1 }), 90000, 'a caller-supplied floor wins over halving')
assert.equal(planBudgetMs([], { ceiling: 1000, floor: 5000 }), 5000, 'a floor above the ceiling is clamped, not returned raw')
ok('nonsense in, a usable number out')

// 7. The round really uses it: a campaign whose planner timed out twice gets a
//    smaller deadline, and the round says which budget it ran under.
const { runRound } = await import('../../src/runtime/round.js')
const { baseConfig, baseState, campaignDir, fakeRuntime, repo } = await import('../chaos/fixture.mjs')

const dir = repo('loom-plan-budget-')
const camp = campaignDir(dir)
mkdirSync(camp, { recursive: true })
const rt = fakeRuntime(camp, dir)
const history = [
  { n: 1, status: 'no-gain', promoted: false, planMs: 240000, planTimedOut: true, landed: false },
  { n: 2, status: 'no-gain', promoted: false, planMs: 240000, planTimedOut: true, landed: false },
  { n: 3, status: 'no-gain', promoted: false, planMs: 240000, planTimedOut: true, landed: false },
]
const view = {
  dir: camp,
  state: baseState({
    workspace: dir,
    rounds: history,
    // The planner only exists if the chain has a pre-map agent node with a
    // prompt: without one there is nothing to bound, and this round would be
    // measuring the fixture instead of the budget.
    chain: {
      activeVersion: 1,
      versions: [
        {
          version: 1,
          spec: {
            name: 't',
            version: 1,
            params: { candidates: 1 },
            nodes: [
              { id: 'recon', type: 'agent', role: 'planner', prompt: 'look around first' },
              { id: 'worker', type: 'agent', role: 'worker', prompt: 'do the work' },
            ],
          },
        },
      ],
    },
    evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make it work', verify: { cmd: 'exit 0' } }], holdout: [] },
  }),
}
const seen = []
const dispatcher = {
  run: async (_prompt, opts) => {
    seen.push(opts?.timeoutMs)
    return {
      sessionId: 'child-1',
      text: JSON.stringify({ changed: ['keep.txt'], why: 'ok', evidence: 'ok', openQuestions: [], confidence: 0.5, nextHint: null }),
      stopReason: 'completed',
      timedOut: false,
      error: null,
    }
  },
}
const config = baseConfig({ session: { attemptTimeoutMs: 600000, maxConcurrent: 1, planTimeoutMs: 240000 } })
writeFileSync(join(dir, 'keep.txt'), 'keep\n')
await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })

const finished = rt.events.find((e) => e.type === 'round.finished')
assert.ok(finished, 'the round closed')
assert.equal(finished.data.planBudgetMs, 120000, 'three timeouts bought the planner half the deadline')
assert.ok(seen.includes(120000), `the planner was actually dispatched with that deadline, saw ${JSON.stringify(seen)}`)
ok('the round dispatches the planner under the learned deadline')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
void tmpdir
