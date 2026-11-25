// The release, wired into the runtime: a campaign whose round died can be run
// again, and a campaign whose round is still being watched still refuses.
//
// `Runtime.inflight` is memory; the ledger is the record. When the two disagree
// the ledger wins for what happened and memory wins for what is alive -- that is
// the whole fix. Before it, `runOnce` refused on the strength of a ledger entry
// nobody was driving, and `recover()` only looked at boot time, so a round that
// went stale while the host ran parked its campaign permanently.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-orphan-'))
const repo = join(root, 'repo')
const home = join(root, 'home')
mkdirSync(repo, { recursive: true })
mkdirSync(home, { recursive: true })
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

// A window of zero makes "stale" mean "no live attempt", which is the condition
// under test; the time-based part is covered by the pure spec.
const config = normalizeConfig({ tickMs: 1000, session: { maxConcurrent: 1, orphanAfterMs: 1 } })
const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
const view = runtime.create({ id: 'stuck', objective: 'a round whose owner is gone', workspace: repo, initiator: null })
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
    nodes: [{ id: 'attempt', type: 'map', over: 'candidates', agent: { prompt: 'WORKER: make the check pass' }, verifier: { cmd: `"${NODE}" -e "process.exit(0)"` } }],
  },
})
runtime.append(view, 'chain.activated', { version: 1 })
runtime.append(view, 'campaign.status', { status: 'running' })
runtime.append(view, 'round.started', { n: 1, taskId: 't1', chainVersion: 1, previousFailure: null })
runtime.append(view, 'attempt.deadline', { round: 1, attemptId: 'r1a1', timeoutMs: 780_000, deadlineAt: Date.now() - 1 })

const before = runtime.get('stuck')
ok('the round folds as running', before.state.rounds[0].status === 'running')

// A lease on disk is not evidence of life: this is exactly the state the stuck
// campaign was in (lease `state: "running"`, no live child).
const releasedNow = runtime.releaseOrphanedRounds(before, { now: Date.now() })
ok('a round with no live attempt is released', releasedNow.length === 1 && releasedNow[0] === 1, JSON.stringify(releasedNow))
const after = runtime.get('stuck')
ok('the round stops being running', after.state.rounds[0].status === 'abandoned')
ok('the release says why', typeof after.state.rounds[0].abandonedReason === 'string' && after.state.rounds[0].abandonedReason.length > 0, after.state.rounds[0].abandonedReason)
ok('the release is in the ledger, not just in memory', after.ledger.all().some((e) => e.type === 'round.abandoned' && e.data?.n === 1))

// Idempotence matters: a tick every few seconds must not write one event per
// tick forever.
const again = runtime.releaseOrphanedRounds(runtime.get('stuck'), { now: Date.now() })
ok('a released round is not released twice', again.length === 0, JSON.stringify(again))
ok(
  'exactly one release event',
  runtime.get('stuck').ledger.all().filter((e) => e.type === 'round.abandoned').length === 1,
)

// The refusal this whole change exists to remove.
const outcome = await runtime.runOnce('stuck')
ok('the campaign can run again', outcome?.newRounds === 1, JSON.stringify(outcome))
ok('and the new round is not the abandoned one', runtime.get('stuck').state.rounds.length === 2)

// The mistake the fix must not make: a round whose child is being watched is
// alive, whatever the ledger clock says.
{
  const live = new Runtime({ ctx: {}, home: join(root, 'home2'), config, log: () => {} })
  const v = live.create({ id: 'alive', objective: 'a round still being watched', workspace: repo, initiator: null })
  live.append(v, 'chain.proposed', {
    version: 1,
    spec: {
      name: 'code-fix',
      version: 1,
      description: 'one shot',
      params: { candidates: 1 },
      nodes: [{ id: 'attempt', type: 'map', over: 'candidates', agent: { prompt: 'WORKER: make the check pass' }, verifier: { cmd: `"${NODE}" -e "process.exit(0)"` } }],
    },
  })
  live.append(v, 'chain.activated', { version: 1 })
  live.append(v, 'campaign.status', { status: 'running' })
  live.append(v, 'round.started', { n: 1, taskId: 't1', chainVersion: 1, previousFailure: null })
  live.watchAttempt({ attemptId: 'r1a1', sessionId: 's-1', abort: () => {}, deadline: Date.now() + 600_000, campaign: 'alive', round: 1 })
  const kept = live.releaseOrphanedRounds(live.get('alive'), { now: Date.now() })
  ok('a live round is not released', kept.length === 0, JSON.stringify(kept))
  ok('and it is still running', live.get('alive').state.rounds[0].status === 'running')
  // `inflight` is the memory that says a round is being driven in *this*
  // process; tickCampaign fills it before dispatching, and the release must not
  // be a back door around it.
  live.inflight.add('alive')
  let refused = null
  try {
    await live.runOnce('alive')
  } catch (err) {
    refused = err.message
  }
  ok('runOnce still refuses a genuinely live round', /already has a round in flight/.test(String(refused)), String(refused))
}

console.log(`\n${pass} ok`)
