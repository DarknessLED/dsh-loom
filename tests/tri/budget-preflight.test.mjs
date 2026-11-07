// A round that cannot be afforded must not be started. Today the loop only
// looks at money already spent, so a campaign sitting at 90% of its cap happily
// dispatches another round and blows straight through the budget. This pins the
// preflight: estimate the round from the campaign's own measured history, and if
// spend + estimate would cross the cap, close the round as `budget` with the
// projection on the record and ask the operator once — without dispatching.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-preflight-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function fakeRuntime(dir) {
  const events = []
  return {
    home: join(dir, 'home'),
    events,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
  }
}

// One finished round whose measured cost is the only evidence of what a round
// costs in this campaign.
const history = [
  {
    n: 1,
    taskId: 't1',
    status: 'promoted',
    promoted: true,
    score: 1,
    durationMs: 5000,
    tokens: 400,
    costUsd: 0.5,
    attempts: [],
  },
]

function scenario({ usdCap, spentUsd }) {
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'preflight',
      status: 'running',
      workspace: dir,
      rounds: history.map((r) => ({ ...r })),
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 1, usd: usdCap, spentUsd },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 2 }, nodes: [] } }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  const config = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: { halving: false },
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: ['budget'] },
  }
  let calls = 0
  const dispatcher = {
    run: async () => {
      calls += 1
      return { sessionId: 's1', text: '{"changed":[],"why":"nothing","evidence":[],"openQuestions":[],"confidence":0.5,"nextHint":""}', stopReason: 'completed' }
    },
  }
  return { dir, rt, view, config, dispatcher, calls: () => calls }
}

// 1. 90% spent, one round costs 0.5, cap 1: 0.9 + 0.5 > 1 -> refuse before dispatching.
{
  const s = scenario({ usdCap: 1, spentUsd: 0.9 })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {}, notify: () => {} })
  const round = s.rt.events.find((e) => e.type === 'round.finished')
  const checkpoint = s.rt.events.find((e) => e.type === 'checkpoint.raised')
  assert.equal(s.calls(), 0, 'an unaffordable round dispatches nothing')
  assert.equal(s.rt.events.filter((e) => e.type === 'attempt.finished').length, 0, 'no attempt is recorded for a round that never ran')
  assert.equal(round?.data?.status, 'budget', 'the round closes as a budget stop, not as no-gain')
  assert.equal(round?.data?.promoted, false)
  assert.equal(round?.data?.estimatedUsd, 0.5, 'the estimate comes from this campaign\u2019s measured rounds')
  assert.ok(round?.data?.projectedUsd >= 1.4 - 1e-9, 'the projection is recorded so the operator can see why')
  assert.equal(checkpoint?.data?.kind, 'budget', 'the operator is asked once')
  ok('a round that cannot be afforded is not started')
  rmSync(s.dir, { recursive: true, force: true })
}

// 2. The same campaign with headroom still dispatches: the guard must not become
//    a blanket refusal the first time it sees a number.
{
  const s = scenario({ usdCap: 5, spentUsd: 0.9 })
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {}, notify: () => {} })
  const round = s.rt.events.find((e) => e.type === 'round.finished')
  assert.equal(s.calls(), 2, 'an affordable round still runs its candidates')
  assert.notEqual(round?.data?.status, 'budget', 'the round is not stopped by the preflight')
  ok('an affordable round is unaffected by the preflight')
  rmSync(s.dir, { recursive: true, force: true })
}

// 3. With no measured history the estimate is zero: an empty ledger must not
//    manufacture a cost that blocks the first round.
{
  const s = scenario({ usdCap: 1, spentUsd: 0.95 })
  s.view.state.rounds = []
  await runRound({ runtime: s.rt, view: s.view, config: s.config, dispatcher: s.dispatcher, log: () => {}, notify: () => {} })
  assert.equal(s.calls(), 2, 'no history means no estimate, and no refusal')
  ok('an unmeasured campaign is not blocked by an invented estimate')
  rmSync(s.dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
