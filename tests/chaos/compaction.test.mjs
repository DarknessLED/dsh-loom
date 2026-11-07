// Adversary: the context window blows up mid-task (the host's compaction can
// fail too). A campaign should retry once with a smaller brief instead of
// burning the round — and if the retry also dies, it must say so.
import assert from 'node:assert/strict'
import { mkdirSync, rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { baseConfig, baseState, campaignDir, fakeRuntime, ok, done, REPORT, repo } from './fixture.mjs'

function setup() {
  const dir = repo('loom-chaos-compaction-')
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
  return { dir, rt, view }
}

const COMPACTION = 'compaction failed: prompt is too long for the context window'

// 1. first call overflows, retry with a smaller brief succeeds.
{
  const { dir, rt, view } = setup()
  const briefs = []
  const dispatcher = {
    run: async (brief) => {
      briefs.push(brief)
      if (briefs.length === 1) return { sessionId: 's1', text: '', stopReason: 'error', error: COMPACTION }
      return { sessionId: 's2', text: REPORT, stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config: baseConfig(), dispatcher, log: () => {}, notify: () => {} })

  assert.equal(briefs.length, 2, 'exactly one retry')
  assert.ok(briefs[1].length < briefs[0].length, 'the retry carries a smaller brief')
  const attempt = rt.events.find((e) => e.type === 'attempt.finished')
  assert.equal(attempt?.data?.retried, 'smaller-brief', 'the attempt records the retry')
  assert.equal(attempt?.data?.failureKind, 'ok', 'and ends healthy')
  ok('a compaction failure retries once with a smaller brief')
  rmSync(dir, { recursive: true, force: true })
}

// 2. the retry also overflows: the attempt fails as a context failure, the round
//    still closes, and the campaign does not promote anything.
{
  const { dir, rt, view } = setup()
  const dispatcher = {
    run: async () => ({ sessionId: 's1', text: '', stopReason: 'error', error: COMPACTION }),
  }
  await runRound({ runtime: rt, view, config: baseConfig(), dispatcher, log: () => {}, notify: () => {} })
  const attempt = rt.events.find((e) => e.type === 'attempt.finished')
  assert.equal(attempt?.data?.failureKind, 'context', 'named as a context failure')
  assert.equal(attempt?.data?.retried, 'smaller-brief')
  const finished = rt.events.find((e) => e.type === 'round.finished')
  assert.equal(finished?.data?.promoted, false)
  ok('a repeated compaction failure closes the round honestly')
  rmSync(dir, { recursive: true, force: true })
}

done()
