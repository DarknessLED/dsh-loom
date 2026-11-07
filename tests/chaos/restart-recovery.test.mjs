// Adversary: the host is killed mid-round. The classic fake recovery is to mark
// the round "interrupted" and move on — while the workspace still carries a
// half-applied patch and the ledger claims a promotion that was never committed.
// Recovery has to be an accounting pass: close leases, reopen unproven landings,
// and put the tree back to the state the ledger actually proves.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { recoverCampaign } from '../../src/runtime/recovery.js'
import { reduce, emptyState } from '../../src/core/reduce.js'
import { pickTask } from '../../src/runtime/selector.js'
import { git, ok, done, repo, campaignDir, writeEvents, writeLease } from './fixture.mjs'

const TASK = { id: 't1', family: 'f', prompt: 'p', verify: { cmd: 'exit 0' } }

function eventsFor(rounds) {
  return [
    { seq: 1, type: 'campaign.created', data: { id: 'chaos', workspace: null } },
    ...rounds,
  ]
}

// 1. interrupted apply: uncommitted landing + dirty tree + live lease.
{
  const dir = repo('loom-chaos-restart-')
  const camp = campaignDir()
  // The patch really was applied: the tracked file changed and a new file appeared.
  writeFileSync(join(dir, 'keep.txt'), 'patched without a commit\n')
  writeFileSync(join(dir, 'half.txt'), 'left behind\n')
  git(dir, 'add', '-A', '-N')
  const patchPath = join(camp, 'artifacts', 'r1a1.patch')
  writeFileSync(patchPath, git(dir, 'diff', '--binary', 'HEAD'))
  git(dir, 'reset', '-q')
  const events = eventsFor([
    { seq: 2, type: 'round.started', data: { n: 1, taskId: 't1', chainVersion: 1 } },
    { seq: 3, type: 'autopilot.applied', data: { round: 1, patch: patchPath, committed: false, noop: false } },
    { seq: 4, type: 'gate.evaluated', data: { candidateId: 'r1a1', round: 1, promoted: true, score: 1, checks: {} } },
  ])
  writeEvents(camp, events)
  writeLease(camp, 'r1a1', { attemptId: 'r1a1', round: 1, state: 'running', sessionId: 's1', deadline: Date.now() + 600_000 })

  const state = reduce(events)
  const appended = []
  const report = await recoverCampaign({
    dir: camp,
    events,
    state,
    workspace: dir,
    append: (type, data) => appended.push({ type, data }),
    log: () => {},
  })

  assert.equal(report.interruptedRounds.length + report.abandonedAttempts.length > 0, true, 'the recovery reports what it closed')
  assert.equal(appended.some((e) => e.type === 'attempt.abandoned'), true, 'the lease is closed')
  assert.equal(appended.some((e) => e.type === 'round.unlanded'), true, 'the uncommitted landing is withdrawn')
  assert.equal(appended.some((e) => e.type === 'workspace.recovered'), true, 'the tree repair is recorded')

  const after = [...events, ...appended.map((e, i) => ({ seq: events.length + i + 1, t: 0, type: e.type, data: e.data }))]
  const state2 = reduce(after)
  assert.equal(state2.rounds[0].landed, false, 'a landing without a commit is not progress')
  const picked = pickTask([TASK], state2.rounds, { round: 2 })
  assert.equal(picked.task?.id, 't1', 'the task is retried instead of being considered solved')

  assert.equal(git(dir, 'status', '--porcelain').trim(), '', 'the half-applied patch is gone')
  assert.equal(readFileSync(join(dir, 'keep.txt'), 'utf8').trim(), 'keep', 'the tracked file is back to HEAD')
  assert.equal(existsSync(join(dir, 'half.txt')), false, 'the untracked leftover is gone')
  assert.equal(existsSync(join(camp, 'leases', 'r1a1.json')), true, 'the lease file survives for the audit trail')
  rmSync(dir, { recursive: true, force: true })
}

// 2. a committed landing and a no-op landing must survive recovery untouched.
{
  const dir = repo('loom-chaos-restart-ok-')
  const camp = campaignDir(dir)
  mkdirSync(camp, { recursive: true })
  const events = eventsFor([
    { seq: 2, type: 'round.started', data: { n: 1, taskId: 't1', chainVersion: 1 } },
    { seq: 3, type: 'autopilot.applied', data: { round: 1, patch: 'p1', committed: true, commit: 'abc123', noop: false } },
    { seq: 4, type: 'round.finished', data: { n: 1, status: 'promoted', promoted: true } },
    { seq: 5, type: 'round.started', data: { n: 2, taskId: 't2', chainVersion: 1 } },
    { seq: 6, type: 'autopilot.applied', data: { round: 2, patch: null, committed: false, noop: true } },
    { seq: 7, type: 'round.finished', data: { n: 2, status: 'promoted', promoted: true } },
  ])
  writeEvents(camp, events)
  const state = reduce(events)
  const appended = []
  await recoverCampaign({
    dir: camp,
    events,
    state,
    workspace: dir,
    append: (type, data) => appended.push({ type, data }),
    log: () => {},
  })
  assert.equal(appended.some((e) => e.type === 'round.unlanded'), false, 'committed and no-op landings are left alone')
  assert.equal(appended.some((e) => e.type === 'workspace.recovered'), false, 'a clean tree is not touched')
  ok('recovery does not withdraw proven landings')
  rmSync(dir, { recursive: true, force: true })
}

// 3. a user's dirty tree is preserved when nothing was interrupted.
{
  const dir = repo('loom-chaos-restart-user-')
  const camp = campaignDir(dir)
  writeFileSync(join(dir, 'keep.txt'), 'user work in progress\n')
  const events = eventsFor([{ seq: 2, type: 'round.started', data: { n: 1, taskId: 't1', chainVersion: 1 } }])
  writeEvents(camp, events)
  const state = reduce(events)
  const appended = []
  await recoverCampaign({
    dir: camp,
    events,
    state,
    workspace: dir,
    append: (type, data) => appended.push({ type, data }),
    log: () => {},
  })
  assert.equal(readFileSync(join(dir, 'keep.txt'), 'utf8').trim(), 'user work in progress', 'user edits are not destroyed')
  ok('recovery never discards work it cannot attribute to a patch')
  rmSync(dir, { recursive: true, force: true })
}

done()
