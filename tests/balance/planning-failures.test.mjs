// The planner is invisible in the worst case: it can run, cost 12–240 seconds,
// and hand the workers nothing at all — and the triangle still looks like it
// planned. Measured over this repo's 117 instrumented rounds:
//
//   usable plan (or reused)      47
//   hit the deadline             24
//   failed without timing out    46   <-- 39% of rounds, and nothing reports it
//
// `planning.timedOut` covers only the second bucket, so a reader concludes that
// 93 rounds "planned fine" when 46 of them paid for a planner and got no
// findings. This spec requires the third bucket to be a number.
//
// Required:
//   - `round.finished.planUsable` — `true` when the round's pre-map nodes
//     produced at least one finding the workers received, `false` when the round
//     paid for planning and got nothing, `null` when there was no planner.
//   - `campaignTriangle(rounds).planning.failed` — rounds with a finite `planMs`
//     that did not time out and whose `planUsable === false`. A legacy round that
//     never recorded the field is not counted (silence is not a failure).
//   - `campaignTriangle(rounds).planning.usable` — rounds whose findings reached
//     the workers.
import assert from 'node:assert/strict'
import { mkdirSync, rmSync } from 'node:fs'

import { campaignTriangle } from '../../src/runtime/triangle.js'
import { runRound } from '../../src/runtime/round.js'
import { baseConfig, baseState, campaignDir, fakeRuntime, repo } from '../chaos/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const round = (over) => ({
  n: 1,
  status: 'promoted',
  promoted: true,
  durationMs: 600000,
  planMs: 120000,
  planTimedOut: false,
  attemptMs: 400000,
  verifierMs: 5000,
  tokens: 2000,
  costUsd: 0.001,
  ...over,
})

// ---------------------------------------------------------------------------
// 1. The triangle counts a planner that failed without timing out
// ---------------------------------------------------------------------------
{
  const rounds = [
    round({ n: 1, planUsable: true }),
    round({ n: 2, planUsable: true, planMs: 30000 }),
    round({ n: 3, planUsable: false, planMs: 15000 }),
    round({ n: 4, planTimedOut: true, planUsable: false, planMs: 240500 }),
    // Legacy: no planUsable field at all. Not evidence either way.
    round({ n: 5, planUsable: undefined }),
  ]
  const t = campaignTriangle(rounds)
  assert.ok(t.planning, 'the triangle reports a planning block')
  assert.equal(t.planning.rounds, 5, 'all five rounds measured a planMs')
  assert.equal(t.planning.timedOut, 1, 'one hit the deadline')
  assert.equal(t.planning.usable, 2, 'two rounds put a plan in the workers hands')
  assert.equal(
    t.planning.failed,
    1,
    'one round paid for a planner and got nothing back — it must be counted, not assumed fine',
  )
  assert.equal(
    Math.round(t.planning.failedRate * 1000) / 1000,
    0.333,
    'the failure rate is over rounds that recorded a verdict (the timed-out one is a separate bucket)',
  )
}
ok('a planner that fails without timing out is counted as a failed plan')

// ---------------------------------------------------------------------------
// 2. Missing evidence is unknown, not failure
// ---------------------------------------------------------------------------
{
  const t = campaignTriangle([
    round({ n: 1, planUsable: undefined, planMs: 0 }),
    round({ n: 2, planUsable: undefined, planMs: 90000 }),
  ])
  assert.equal(t.planning.usable, 0, 'nothing is claimed usable without evidence')
  assert.equal(t.planning.failed, 0, 'a ledger that never recorded planUsable is unknown, not failed')
  assert.equal(t.planning.failedRate, null, 'and a rate with no decision base is null, not 0%')
}
ok('missing evidence is unknown, not a failure')

{
  const t = campaignTriangle([])
  assert.equal(t.planning.failed, 0, 'an empty campaign failed nothing')
  assert.equal(t.planning.usable, 0, 'and planned nothing')
}
ok('an empty campaign is tolerated')

// ---------------------------------------------------------------------------
// 3. A round records whether its planner handed anything to the workers
// ---------------------------------------------------------------------------
function scenario(reply, { withPlanner = true } = {}) {
  const dir = repo('loom-planusable-')
  const camp = campaignDir(dir)
  mkdirSync(camp, { recursive: true })
  const rt = fakeRuntime(camp, dir)
  // `preMapAgentNodes` walks nodes until it meets a `map` node, so the map node
  // is what separates "planning" from "working". Without it every agent in the
  // chain counts as a planner, and the no-planner scenario would still plan.
  const nodes = [
    { id: 'work', type: 'map' },
    { id: 'worker', type: 'agent', role: 'worker', prompt: 'do the work' },
  ]
  if (withPlanner) nodes.unshift({ id: 'recon', type: 'agent', role: 'planner', prompt: 'look around first' })
  const view = {
    dir: camp,
    state: baseState({
      workspace: dir,
      rounds: [],
      autopilot: { enabled: false, guard: null },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make it work', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 1, minGain: 0 }, nodes } }],
      },
    }),
  }
  const calls = []
  const dispatcher = {
    run: async (_prompt, opts = {}) => {
      calls.push({ label: String(opts?.label || ''), timeoutMs: opts?.timeoutMs })
      if (String(opts?.label || '').includes(':plan:')) return reply
      return { sessionId: 'w', text: '', stopReason: 'completed', timedOut: false, error: null }
    },
  }
  const config = baseConfig({ session: { attemptTimeoutMs: 600000, maxConcurrent: 1, planTimeoutMs: 240000 } })
  return { dir, camp, rt, view, dispatcher, calls, config }
}

const roundFinished = (rt) => rt.events.find((e) => e.type === 'round.finished')

{
  const s = scenario({ sessionId: 'p', text: '', stopReason: 'error', error: 'child session died', timedOut: false })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {} })
  const finished = roundFinished(s.rt)
  assert.ok(finished, 'the round finished')
  assert.equal(
    finished.data.planUsable,
    false,
    'a planner that returned an error handed the workers nothing, and the round must say so',
  )
  assert.equal(finished.data.planTimedOut, false, 'it did not time out — this is the silent bucket')
  assert.ok(finished.data.planMs > 0, 'and it still cost real time')
  rmSync(s.dir, { recursive: true, force: true })
}
ok('a failed planner is recorded as planUsable false')

{
  const s = scenario({ sessionId: 'p', text: 'touch keep.txt and nothing else', stopReason: 'completed', timedOut: false })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {} })
  const finished = roundFinished(s.rt)
  assert.equal(finished.data.planUsable, true, 'a usable plan reached the workers')
  rmSync(s.dir, { recursive: true, force: true })
}
ok('a usable plan is recorded as planUsable true')

{
  const s = scenario({ sessionId: 'p', text: '', stopReason: 'aborted', timedOut: true })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {} })
  const finished = roundFinished(s.rt)
  assert.equal(finished.data.planTimedOut, true, 'the deadline was hit')
  assert.equal(finished.data.planUsable, false, 'and nothing came back')
  rmSync(s.dir, { recursive: true, force: true })
}
ok('a timed-out planner is both timed out and unusable')

{
  // No planner in the chain at all: null, because the campaign never bought one.
  const s = scenario({ sessionId: 'p', text: 'ignored', stopReason: 'completed' }, { withPlanner: false })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {} })
  const finished = roundFinished(s.rt)
  assert.equal(finished.data.planUsable, null, 'a chain with no planner reports null, not false')
  rmSync(s.dir, { recursive: true, force: true })
}
ok('a chain without a planner reports null')

console.log(`\n${pass}/${pass} passed`)
