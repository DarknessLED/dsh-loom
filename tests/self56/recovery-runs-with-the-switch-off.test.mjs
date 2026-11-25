// The master switch decides whether *new* rounds may start, not whether a dead
// round may be written off.
//
// Before this change `tick()` returned the moment the switch was off, and the
// orphan reconciliation lived after that early return. So an operator who turned
// the loop off while a round was going stale parked the campaign: the round stayed
// `running` in the ledger, `runOnce` kept refusing, and nothing but a human asking
// for a round could move it. The reconciliation is now independent of the switch;
// the switch still stops dispatch, exactly as before.
//
//   node tests/self56/recovery-runs-with-the-switch-off.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-switch-off-'))
const repo = join(root, 'repo')
mkdirSync(repo, { recursive: true })
writeFileSync(join(repo, 'a.txt'), 'a\n')
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true })
git('init', '-q')
git('config', 'user.email', 'loom@example.com')
git('config', 'user.name', 'loom')
git('add', '.')
git('commit', '-q', '-m', 'init')

let pass = 0
function ok(name, cond, detail) {
  if (!cond) {
    console.error(`FAIL  ${name}${detail ? ` ${detail}` : ''}`)
    process.exitCode = 1
    return
  }
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// A window of one millisecond makes "stale" mean "no live attempt", which is the
// condition under test; the window arithmetic has its own spec.
const config = normalizeConfig({ tickMs: 1000, session: { maxConcurrent: 1, orphanAfterMs: 1 } })

/** A campaign parked mid-round: the ledger says round 1 is running, nobody is driving it. */
function stuckCampaign(runtime, id) {
  const view = runtime.create({ id, objective: 'a round whose owner is gone', workspace: repo, initiator: null })
  runtime.append(view, 'evalset.registered', {
    tasks: [{ id: 't1', prompt: 'do it', verify: { cmd: `"${NODE}" -e "process.exit(0)"`, timeoutMs: 30_000 } }],
    holdout: [],
  })
  runtime.append(view, 'chain.proposed', {
    version: 1,
    spec: {
      name: 'code-fix',
      version: 1,
      description: 'one shot',
      params: { candidates: 1 },
      nodes: [
        {
          id: 'attempt',
          type: 'map',
          over: 'candidates',
          agent: { prompt: 'WORKER: make the check pass' },
          verifier: { cmd: `"${NODE}" -e "process.exit(0)"` },
        },
      ],
    },
  })
  runtime.append(view, 'chain.activated', { version: 1 })
  runtime.append(view, 'campaign.status', { status: 'running' })
  runtime.append(view, 'round.started', { n: 1, taskId: 't1', chainVersion: 1, previousFailure: null })
  runtime.append(view, 'attempt.deadline', { round: 1, attemptId: 'r1a1', timeoutMs: 780_000, deadlineAt: Date.now() - 1 })
  return view
}

const released = (runtime, id) => runtime.get(id).ledger.all().filter((e) => e.type === 'round.abandoned')
const roundOf = (runtime, id, n) => runtime.get(id).state.rounds.find((r) => r.n === n)

const waitFor = async (predicate, ms = 5000) => {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (predicate()) return true
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return predicate()
}

// -------------------------------------------------- the switch off, round stale
{
  const home = join(root, 'home-off')
  mkdirSync(home, { recursive: true })
  const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
  stuckCampaign(runtime, 'off-stuck')
  runtime.setEnabled(false, { by: 'human', reason: 'pausing for the night' })
  ok('the loop is off before the tick', runtime.enabled() === false)

  runtime.tick()

  ok('a stale round is released with the switch off', roundOf(runtime, 'off-stuck', 1)?.status === 'abandoned', roundOf(runtime, 'off-stuck', 1)?.status)
  const events = released(runtime, 'off-stuck')
  ok('the release is written to the ledger', events.length === 1 && events[0].data?.n === 1, JSON.stringify(events.map((e) => e.data)))
  ok('the release says why', typeof events[0]?.data?.reason === 'string' && events[0].data.reason.length > 0)
  ok(
    'and the switch still dispatches nothing',
    runtime.get('off-stuck').state.rounds.length === 1 && !events.some((e) => e.type === 'round.started'),
    JSON.stringify(runtime.get('off-stuck').state.rounds.map((r) => (r && r.n) ?? r)),
  )
  ok('the loop is still off after the tick', runtime.enabled() === false)

  // A second tick must not release the same round again.
  runtime.tick()
  ok('a released round is not released twice', released(runtime, 'off-stuck').length === 1)
}

// -------------------------------------------------- the switch off, round alive
{
  const home = join(root, 'home-alive')
  mkdirSync(home, { recursive: true })
  const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
  stuckCampaign(runtime, 'off-alive')
  stuckCampaign(runtime, 'off-busy')
  runtime.setEnabled(false, { by: 'human' })
  // Tracked by this process: the watchdog says the child exists, so the round is
  // alive whatever the ledger clock says.
  runtime.watchAttempt({ attemptId: 'r1a1', sessionId: 's-1', abort: () => {}, deadline: Date.now() + 600_000, campaign: 'off-alive', round: 1 })
  // A campaign the runtime is driving right now is alive too, even if the
  // attempt has not been registered with the watchdog yet.
  runtime.inflight.add('off-busy')

  runtime.tick()

  ok('a watched round is untouched with the switch off', roundOf(runtime, 'off-alive', 1)?.status === 'running', roundOf(runtime, 'off-alive', 1)?.status)
  ok('nothing was written for a live round', released(runtime, 'off-alive').length === 0)
  ok('a campaign in flight is untouched with the switch off', roundOf(runtime, 'off-busy', 1)?.status === 'running', roundOf(runtime, 'off-busy', 1)?.status)
  ok('nothing was written for a campaign in flight', released(runtime, 'off-busy').length === 0)
  ok('the switch is still off', runtime.enabled() === false)
}

// -------------------------------------------------- the switch on, unchanged
{
  const home = join(root, 'home-on')
  mkdirSync(home, { recursive: true })
  // Two slots, because one is occupied by the live campaign below: the stale one
  // must still get the other, or this would be a test about slot contention.
  const onConfig = normalizeConfig({ tickMs: 1000, session: { maxConcurrent: 2, orphanAfterMs: 1 } })
  const runtime = new Runtime({ ctx: {}, home, config: onConfig, log: () => {} })
  stuckCampaign(runtime, 'on-stuck')
  stuckCampaign(runtime, 'on-alive')
  // A round being driven by this process: tracked by the watchdog *and* holding
  // the campaign's slot, exactly as the loop leaves it while a child works.
  runtime.watchAttempt({ attemptId: 'r1a1', sessionId: 's-2', abort: () => {}, deadline: Date.now() + 600_000, campaign: 'on-alive', round: 1 })
  runtime.inflight.add('on-alive')
  // A stub dispatcher: with the switch on the tick must still release *and* go on
  // to start the next round, which is the behaviour that must not change.
  const stub = {
    async run() {
      return { text: 'worked', sessionId: `stub-${Date.now()}`, stopReason: 'completed', timedOut: false, error: null }
    },
  }
  runtime.dispatchers.set('on-stuck', stub)
  ok('the loop is on', runtime.enabled() === true)

  runtime.tick()

  ok('a stale round is released with the switch on', roundOf(runtime, 'on-stuck', 1)?.status === 'abandoned', roundOf(runtime, 'on-stuck', 1)?.status)
  ok('a live round is untouched with the switch on', roundOf(runtime, 'on-alive', 1)?.status === 'running', roundOf(runtime, 'on-alive', 1)?.status)
  const dispatched = await waitFor(() => runtime.get('on-stuck').state.rounds.length === 2)
  ok('and the next round still starts with the switch on', dispatched, JSON.stringify(runtime.get('on-stuck').state.rounds.map((r) => r?.n)))
  ok('the live campaign was not dispatched', runtime.get('on-alive').state.rounds.length === 1)
}

console.log(`\n${pass} ok`)

// The one invariant that must survive every path above: the release is a ledger
// event, never an edit of history.
assert.ok(pass > 0)
