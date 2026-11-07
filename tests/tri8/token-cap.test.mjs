// Money is only half of what a round consumes. A campaign can sit comfortably
// inside its USD cap while burning through a token allowance that is the thing
// actually being metered by the provider — and the budget gate never looks.
//
// Required: `budget.tokens` is a first-class cap with the same shape as USD. If
// the campaign's own measured history says the next round would cross it, the
// round is not dispatched: it closes as `budget`, names which cap it hit, puts
// the projection on the record, and raises exactly one checkpoint. A campaign
// with no measured history must not invent a block.
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
  const dir = mkdtempSync(join(tmpdir(), 'loom-tokencap-'))
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

const measured = (n, tokens) => ({
  n,
  taskId: 't1',
  status: 'promoted',
  promoted: true,
  landed: true,
  promotedAttemptId: `r${n}a1`,
  score: 1,
  durationMs: 5000,
  tokens,
  costUsd: 0.01,
  attempts: [{ id: `r${n}a1`, score: 1 }],
})

function scenario({ tokensCap, history, usd = 10, spentUsd = 0 }) {
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'tokencap',
      status: 'running',
      workspace: dir,
      rounds: history.map((r) => ({ ...r })),
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: history.length, usd, spentUsd, ...(tokensCap == null ? {} : { tokens: tokensCap }) },
      evalset: {
        tasks: [
          {
            id: 't2',
            family: 'f',
            prompt: 'create solved.txt',
            verify: { cmd: 'node -e "process.exit(require(\'fs\').existsSync(\'solved.txt\') ? 0 : 1)"' },
          },
        ],
        holdout: [],
      },
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
  let dispatched = 0
  const dispatcher = {
    run: async (_brief, ctx = {}) => {
      dispatched += 1
      writeFileSync(join(ctx.cwd, 'solved.txt'), 'solved\n')
      return { sessionId: 's' + dispatched, text: '{}', stopReason: 'completed' }
    },
  }
  const round = async () => {
    await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
    return rt.events.find((e) => e.type === 'round.finished')?.data
  }
  return { dir, rt, view, round, dispatched: () => dispatched }
}

// 1. A measured history of 1,000 tokens a round against a 1,500 cap: the next
//    round cannot fit, so it is never started.
{
  const s = scenario({ tokensCap: 1500, history: [measured(1, 1000)] })
  const data = await s.round()
  assert.equal(s.dispatched(), 0, 'a round that cannot be afforded must not dispatch')
  assert.equal(data?.status, 'budget', 'the round is closed as a budget round')
  assert.equal(data?.reason, 'tokens', 'and names the cap it hit')
  assert.ok(Number(data?.estimatedTokens) >= 1000, 'the projection comes from the campaign history')
  assert.ok(Number(data?.projectedTokens) > 1500, 'and is what crossed the cap')
  const raised = s.rt.events.filter((e) => e.type === 'checkpoint.raised' && e.data?.kind === 'budget')
  assert.equal(raised.length, 1, 'the operator is asked once, not every tick')
  ok('a round that would cross the token cap is not started')
  rmSync(s.dir, { recursive: true, force: true })
}

// 2. A generous token cap changes nothing: the round runs.
{
  const s = scenario({ tokensCap: 100_000, history: [measured(1, 1000)] })
  const data = await s.round()
  assert.ok(s.dispatched() >= 1, 'there is room, so work is dispatched')
  assert.notEqual(data?.status, 'budget', 'and the round is not closed as unaffordable')
  ok('a token cap with room in it does not block the round')
  rmSync(s.dir, { recursive: true, force: true })
}

// 3. No measurement, no block: an unpriced tank is not an empty one.
{
  const s = scenario({ tokensCap: 1, history: [{ ...measured(1, 1000), tokens: null }] })
  const data = await s.round()
  assert.ok(s.dispatched() >= 1, 'without a measured cost the loop cannot claim the cap was crossed')
  assert.notEqual(data?.status, 'budget')
  ok('an unmeasured campaign is not blocked by a cap it cannot project')
  rmSync(s.dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
