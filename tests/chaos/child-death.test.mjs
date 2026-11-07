// Adversary: the sub-agent process dies under us. Reality looks like a session
// that terminates with an error, a socket that closes, or a promise that never
// resolves. The loop must lose the attempt — never the round, never the ledger,
// never the lease.
import assert from 'node:assert/strict'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runRound } from '../../src/runtime/round.js'
import { baseConfig, baseState, campaignDir, fakeRuntime, ok, done, repo } from './fixture.mjs'

function setup() {
  const dir = repo('loom-chaos-death-')
  const camp = campaignDir(dir)
  const rt = fakeRuntime(camp, dir)
  const view = {
    dir: camp,
    state: baseState({
      workspace: dir,
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make it work', verify: { cmd: 'exit 0' } }], holdout: [] },
    }),
  }
  mkdirSync(view.dir, { recursive: true })
  return { dir, camp, rt, view }
}

// 1. The child reports an error result (stopReason 'error', no text).
{
  const { dir, camp, rt, view } = setup()
  const dispatcher = {
    run: async () => ({ sessionId: 'child-1', text: '', stopReason: 'error', error: 'child session died: connection closed' }),
  }
  const res = await runRound({ runtime: rt, view, config: baseConfig(), dispatcher, log: () => {}, notify: () => {} })

  const attempt = rt.events.find((e) => e.type === 'attempt.finished')
  assert.equal(attempt?.data?.error, 'child session died: connection closed', 'the failure text is kept verbatim')
  assert.equal(attempt?.data?.failureKind, 'died', 'a dead child is named as such')
  assert.notEqual(attempt?.data?.score, 1, 'a dead child does not score')
  const finished = rt.events.find((e) => e.type === 'round.finished')
  assert.equal(finished?.data?.promoted, false, 'nothing is promoted')
  assert.equal(finished?.data?.status, 'no-gain', 'the round finishes instead of hanging')
  assert.equal(rt.events.some((e) => e.type === 'artifact.promoted'), false, 'no artifact is promoted')
  assert.equal(res?.status ?? finished?.data?.status, 'no-gain')
  ok('a dead child costs one attempt, not the round')

  // the lease must not be left claiming a live holder
  const leaseFile = join(camp, 'leases', 'r1a1.json')
  if (existsSync(leaseFile)) {
    const lease = JSON.parse(readFileSync(leaseFile, 'utf8'))
    assert.notEqual(lease.state, 'running', 'the lease is closed after the child dies')
  }
  rmSync(dir, { recursive: true, force: true })
}

// 2. The dispatcher itself throws (the harness crashed below us).
{
  const { dir, rt, view } = setup()
  const dispatcher = {
    run: async () => {
      throw new Error('spawn failed: ENOENT')
    },
  }
  let threw = null
  try {
    await runRound({ runtime: rt, view, config: baseConfig(), dispatcher, log: () => {}, notify: () => {} })
  } catch (err) {
    threw = err
  }
  const finished = rt.events.find((e) => e.type === 'round.finished')
  assert.equal(threw, null, 'a throwing dispatcher does not escape runRound')
  assert.ok(finished, 'the round still closes')
  assert.equal(finished.data.promoted, false, 'and does not promote')
  ok('a throwing dispatcher still closes the round')
  rmSync(dir, { recursive: true, force: true })
}

done()
